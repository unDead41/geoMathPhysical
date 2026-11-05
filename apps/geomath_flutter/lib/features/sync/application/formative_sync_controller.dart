import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../../core/lifecycle/app_lifecycle.dart';
import '../../../core/network/network_policy.dart';
import '../../../core/records/formative_record.dart';
import '../../../core/records/formative_records.dart';
import '../../../core/result.dart';
import '../../../core/runtime/clock.dart';
import '../../../core/runtime/random_source.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';
import '../../auth/data/cloud_gateway.dart';
import '../data/sqlite_formative_outbox.dart';
import '../data/sync_formative_record_writer.dart';

enum FormativeSyncStatus {
  local,
  pending,
  syncing,
  synced,
  needsAuth,
  unavailable,
  blocked,
  storageFailed,
  stopped,
}

final class FormativeSyncState {
  FormativeSyncState({
    required this.actor,
    required this.status,
    this.pending = 0,
    this.unsaved = 0,
    this.attempts = 0,
    this.nextRetry,
    Iterable<QueuedFormativeEvent> events = const [],
  }) : events = List.unmodifiable(events);
  final ActorBinding actor;
  final FormativeSyncStatus status;
  final int pending;
  final int unsaved;
  final int attempts;
  final DateTime? nextRetry;
  final List<QueuedFormativeEvent> events;
}

final class SelfStudyHistory {
  SelfStudyHistory(Iterable<CompletedSoloRecord> attempts)
    : attempts = List.unmodifiable(attempts);
  final List<CompletedSoloRecord> attempts;
}

/// One scheduler/flight per current binding. It sends formative events only.
final class FormativeSyncController extends ChangeNotifier {
  FormativeSyncController({
    required this.outbox,
    required this.gateway,
    required this.sessions,
    this.writer,
    this.lifecycle,
    this.clock = const SystemClock(),
    RandomSource? random,
    NetworkPolicy? policy,
    this.autoStart = true,
    this.online = _online,
    this.historyTtl = const Duration(seconds: 1),
  }) : random = random ?? DefaultRandomSource(),
       policy =
           policy ??
           NetworkPolicy(
             sessions: sessions,
             clock: clock,
             random: random,
             baseRetry: const Duration(seconds: 2),
             maxRetry: const Duration(minutes: 5),
           ),
       _state = FormativeSyncState(
         actor: sessions.current,
         status: sessions.current.isGuest
             ? FormativeSyncStatus.local
             : FormativeSyncStatus.pending,
       ) {
    _sessionSubscription = sessions.bindings.listen(_bindingChanged);
    _databaseSubscription = outbox.database.changes.listen(
      (_) {
        _clearHistory();
        _wakeAgain = true;
        if (autoStart) unawaited(wake());
      },
      onError: (Object _, StackTrace _) {
        if (!_disposed) _setStatus(FormativeSyncStatus.storageFailed);
      },
    );
    writer?.addListener(_writerChanged);
    lifecycle?.addListener(_lifecycleChanged);
    if (autoStart) unawaited(wake());
  }

  static bool _online() =>
      true; // A successful response/ack, never this hint, proves delivery.
  final SqliteFormativeOutbox outbox;
  final CloudGateway gateway;
  final AuthSession sessions;
  final SyncFormativeRecordWriter? writer;
  final AppLifecycleController? lifecycle;
  final Clock clock;
  final RandomSource random;
  final NetworkPolicy policy;
  final bool autoStart;
  final bool Function() online;
  final Duration historyTtl;
  late final StreamSubscription<ActorBinding> _sessionSubscription;
  late final StreamSubscription<void> _databaseSubscription;
  FormativeSyncState _state;
  FormativeSyncState get state => _state;
  Timer? _timer;
  _SyncFlight? _flight;
  bool _disposed = false;
  bool _wakeAgain = false;
  int _generation = 0;
  int _attempts = 0;
  DateTime? _notBefore;
  SelfStudyHistory? _history;
  DateTime? _historyExpiry;
  ActorBinding? _historyActor;
  Future<Result<SelfStudyHistory>>? _historyFlight;
  ActorBinding? _historyFlightActor;
  int? _historyFlightGeneration;

  bool get _foreground => lifecycle?.isForeground ?? true;
  bool _current(ActorBinding actor, int generation) =>
      !_disposed &&
      _generation == generation &&
      sessions.isCurrent(actor) &&
      _foreground;
  bool get _halted => const {
    FormativeSyncStatus.needsAuth,
    FormativeSyncStatus.unavailable,
    FormativeSyncStatus.blocked,
    FormativeSyncStatus.storageFailed,
    FormativeSyncStatus.stopped,
  }.contains(_state.status);

  void _bindingChanged(ActorBinding actor) {
    if (_disposed) return;
    _generation++;
    _timer?.cancel();
    _attempts = 0;
    _notBefore = null;
    _clearHistory();
    _state = FormativeSyncState(
      actor: actor,
      status: actor.isGuest
          ? FormativeSyncStatus.local
          : FormativeSyncStatus.pending,
      unsaved: writer?.unsaved(actor) ?? 0,
    );
    notifyListeners();
    if (autoStart) unawaited(wake());
  }

  void _writerChanged() {
    if (_disposed) return;
    if (writer!.hasStorageFailure(sessions.current) &&
        !const {
          FormativeSyncStatus.blocked,
          FormativeSyncStatus.needsAuth,
          FormativeSyncStatus.unavailable,
        }.contains(_state.status)) {
      _setStatus(FormativeSyncStatus.storageFailed);
    }
    _wakeAgain = true;
    if (autoStart) unawaited(wake());
  }

  void _lifecycleChanged() {
    if (_disposed) return;
    _generation++;
    _timer?.cancel();
    _clearHistory();
    if (!_foreground) {
      if (_state.status == FormativeSyncStatus.syncing) {
        _setStatus(FormativeSyncStatus.pending);
      }
      return;
    }
    if (autoStart) unawaited(wake());
  }

  void _setStatus(
    FormativeSyncStatus status, {
    OutboxSnapshot? snapshot,
    DateTime? nextRetry,
  }) {
    if (_disposed) return;
    final actor = sessions.current;
    _state = FormativeSyncState(
      actor: actor,
      status: status,
      pending:
          snapshot?.pending ?? (_state.actor == actor ? _state.pending : 0),
      events:
          snapshot?.events ??
          (_state.actor == actor ? _state.events : const []),
      unsaved: writer?.unsaved(actor) ?? 0,
      attempts: _attempts,
      nextRetry: nextRetry,
    );
    notifyListeners();
  }

  Future<void> wake({bool userInitiated = false}) {
    if (_disposed || !_foreground) return Future.value();
    final actor = sessions.current;
    final previous = _flight;
    if (previous != null &&
        previous.actor == actor &&
        previous.generation == _generation) {
      return previous.future;
    }
    final flight = _SyncFlight(actor, _generation);
    _wakeAgain = false;
    _flight = flight;
    flight.future = _run(flight, userInitiated: userInitiated).whenComplete(() {
      if (identical(_flight, flight)) {
        _flight = null;
        if (_wakeAgain && autoStart && !_disposed) unawaited(wake());
      }
    });
    return flight.future;
  }

  Future<void> start() => wake();

  Future<void> _run(_SyncFlight flight, {required bool userInitiated}) async {
    final actor = flight.actor, generation = flight.generation;
    bool current() => _current(actor, generation);
    await writer?.settle();
    if (!current()) return;
    if (userInitiated && _state.status != FormativeSyncStatus.blocked) {
      if (_state.status == FormativeSyncStatus.stopped) _attempts = 0;
      await writer?.retryUnsaved(actor, rebind: true);
      if (!current()) return;
    }
    final read = await outbox.read(actor);
    if (!current()) return;
    if (read case Failed<OutboxSnapshot>(:final failure)) {
      _failure(failure);
      return;
    }
    final snapshot = read.valueOrNull!;
    if (actor.isGuest) {
      _setStatus(
        writer?.hasStorageFailure(actor) == true
            ? FormativeSyncStatus.storageFailed
            : FormativeSyncStatus.local,
        snapshot: snapshot,
      );
      return;
    }
    if (_halted &&
        (!userInitiated || _state.status == FormativeSyncStatus.blocked)) {
      _setStatus(
        _state.status,
        snapshot: snapshot,
        nextRetry: _state.nextRetry,
      );
      return;
    }
    if (!gateway.configured) {
      _setStatus(FormativeSyncStatus.unavailable, snapshot: snapshot);
      return;
    }
    if (snapshot.events.isEmpty) {
      _setStatus(
        (writer?.unsaved(actor) ?? 0) > 0
            ? FormativeSyncStatus.storageFailed
            : FormativeSyncStatus.synced,
        snapshot: snapshot,
      );
      return;
    }
    final deadline = _notBefore;
    if (!online() || deadline != null && clock.now().isBefore(deadline)) {
      _setStatus(
        FormativeSyncStatus.pending,
        snapshot: snapshot,
        nextRetry: deadline,
      );
      if (online()) _schedule(deadline);
      return;
    }
    _setStatus(FormativeSyncStatus.syncing, snapshot: snapshot);
    final events = snapshot.events
        .map((row) => row.event.toWireJson())
        .toList();
    if (utf8.encode(jsonEncode({'events': events})).length > 131072) {
      _failure(
        const AppFailure(
          code: FailureCode.invalid,
          message: 'Pending batch is too large.',
        ),
      );
      return;
    }
    Result<CloudReply> response;
    try {
      response = await gateway.rpc(
        name: 'geo_offline_sync',
        parameters: {
          'action': 'push',
          'payload': {'events': events},
        },
        actor: actor,
      );
    } catch (_) {
      response = const Failed(
        AppFailure(
          code: FailureCode.network,
          message: 'Delivery could not be confirmed.',
        ),
      );
    }
    if (!current()) return;
    if (response case Failed<CloudReply>(:final failure)) {
      _failure(failure);
      return;
    }
    final reply = response.valueOrNull!;
    _serverDelay(reply.retryAfter);
    final error = failureForReply(reply);
    if (error != null) {
      _failure(error);
      return;
    }
    final ack = _parseAcknowledgement(reply.data, snapshot.events);
    if (ack == null) {
      _failure(invalidAcknowledgementFailure);
      return;
    }
    if (ack.accepted.isEmpty) {
      _failure(
        ack.rejected.isNotEmpty
            ? _codeFailure(ack.rejected.first, 400, reply.retryAfter)
            : invalidAcknowledgementFailure,
      );
      return;
    }
    final result = await outbox.acknowledge(
      actor: actor,
      batch: snapshot.events,
      accepted: ack.accepted,
      reflections: ack.reflections,
      active: current,
    );
    if (!current()) return;
    if (result.failureOrNull case final failure?) {
      _failure(failure);
      return;
    }
    _clearHistory();
    final remaining = await outbox.read(actor);
    if (!current()) return;
    if (remaining.failureOrNull case final failure?) {
      _failure(failure);
      return;
    }
    final after = remaining.valueOrNull!;
    _attempts = 0;
    if (ack.rejected.isNotEmpty) {
      _setStatus(FormativeSyncStatus.pending, snapshot: after);
      _failure(_codeFailure(ack.rejected.first, 400, reply.retryAfter));
      return;
    }
    if ((writer?.unsaved(actor) ?? 0) > 0) {
      _setStatus(FormativeSyncStatus.storageFailed, snapshot: after);
      return;
    }
    if (after.pending == 0) {
      _setStatus(FormativeSyncStatus.synced, snapshot: after);
      return;
    }
    final delay = Duration(
      milliseconds: 1000 + (random.nextDouble().clamp(0.0, 1.0) * 999).floor(),
    );
    final soon = clock.now().add(delay);
    if (_notBefore == null || soon.isAfter(_notBefore!)) _notBefore = soon;
    _setStatus(
      FormativeSyncStatus.pending,
      snapshot: after,
      nextRetry: _notBefore,
    );
    _schedule(_notBefore);
  }

  void _serverDelay(Duration? delay) {
    if (delay == null || delay.isNegative) return;
    final until = clock.now().add(delay);
    if (_notBefore == null || until.isAfter(_notBefore!)) _notBefore = until;
  }

  void _failure(AppFailure failure) {
    if (_disposed) return;
    _clearHistory();
    _timer?.cancel();
    _serverDelay(failure.retryAfter);
    if (failure.code == FailureCode.network ||
        failure.code == FailureCode.retryAfter) {
      _attempts++;
      final delay = _attempts >= policy.maxAttempts
          ? null
          : policy.retryDelay(_attempts - 1, failure);
      if (delay == null) {
        _setStatus(FormativeSyncStatus.stopped, nextRetry: _notBefore);
        return;
      }
      final until = clock.now().add(delay);
      if (_notBefore == null || until.isAfter(_notBefore!)) _notBefore = until;
      _setStatus(FormativeSyncStatus.pending, nextRetry: _notBefore);
      _schedule(_notBefore);
      return;
    }
    // A permanent denial also invalidates other in-flight push/history work.
    // A later success from before that denial cannot repopulate cache or UI.
    _generation++;
    _setStatus(switch (failure.code) {
      FailureCode.unauthorized ||
      FailureCode.stale => FormativeSyncStatus.needsAuth,
      FailureCode.unavailable => FormativeSyncStatus.unavailable,
      FailureCode.storage => FormativeSyncStatus.storageFailed,
      FailureCode.cancelled => FormativeSyncStatus.stopped,
      _ => FormativeSyncStatus.blocked,
    });
  }

  void _schedule(DateTime? deadline) {
    _timer?.cancel();
    if (!autoStart ||
        _disposed ||
        !_foreground ||
        deadline == null ||
        _halted) {
      return;
    }
    final delay = deadline.difference(clock.now());
    _timer = Timer(
      delay.isNegative ? Duration.zero : delay,
      () => unawaited(wake()),
    );
  }

  Future<Result<SelfStudyHistory>> readHistory({bool refresh = false}) {
    final actor = sessions.current, generation = _generation;
    if (!_current(actor, generation) || actor.isGuest) {
      return Future.value(const Failed(staleOutboxFailure));
    }
    if (!refresh &&
        _historyActor == actor &&
        _history != null &&
        _historyExpiry != null &&
        clock.now().isBefore(_historyExpiry!)) {
      return _boundHistoryResult(actor, generation, Success(_history!));
    }
    if (_historyFlightActor == actor &&
        _historyFlightGeneration == generation &&
        _historyFlight != null) {
      return _historyFlight!;
    }
    final delay = _notBefore?.difference(clock.now());
    if (delay != null && delay > Duration.zero) {
      return _boundHistoryResult(
        actor,
        generation,
        Failed(
          AppFailure(
            code: FailureCode.retryAfter,
            message: 'Cloud history can be refreshed after the retry delay.',
            retryAfter: delay,
          ),
        ),
      );
    }
    _historyFlightActor = actor;
    _historyFlightGeneration = generation;
    final flight = _loadHistory(actor, generation);
    _historyFlight = flight;
    unawaited(
      flight.whenComplete(() {
        if (identical(_historyFlight, flight)) {
          _historyFlight = null;
          _historyFlightActor = null;
        }
      }),
    );
    return flight;
  }

  Future<Result<SelfStudyHistory>> _loadHistory(
    ActorBinding actor,
    int generation,
  ) async {
    try {
      final response = await gateway.rpc(
        name: 'geo_offline_sync',
        parameters: const {'action': 'history', 'payload': <String, Object?>{}},
        actor: actor,
      );
      if (!_current(actor, generation)) return const Failed(staleOutboxFailure);
      if (response.failureOrNull case final failure?) {
        _failure(failure);
        return Failed(failure);
      }
      final reply = response.valueOrNull!;
      _serverDelay(reply.retryAfter);
      if (failureForReply(reply) case final failure?) {
        _failure(failure);
        return Failed(failure);
      }
      final raw = reply.data['attempts'];
      if (raw is! List || raw.length > 50) {
        return const Failed(invalidAcknowledgementFailure);
      }
      final values = <CompletedSoloRecord>[];
      final ids = <String>{};
      for (final row in raw) {
        if (row is! Map ||
            row['source'] != 'offline-self-study' ||
            row['verified'] != false ||
            row['payload'] is! Map ||
            row['received_at'] is! String ||
            DateTime.tryParse(row['received_at']! as String) == null) {
          return const Failed(invalidAcknowledgementFailure);
        }
        final payload = Map<String, Object?>.from(row['payload']! as Map);
        FormativeEvent(
          id: 'history',
          kind: FormativeEventKind.solo,
          payload: payload,
        );
        final value = CompletedSoloRecord.fromJson(payload).valueOrNull!;
        if (!ids.add(value.attemptId)) {
          return const Failed(invalidAcknowledgementFailure);
        }
        values.add(value);
      }
      if (!_current(actor, generation)) return const Failed(staleOutboxFailure);
      _history = SelfStudyHistory(values);
      _historyActor = actor;
      _historyExpiry = clock.now().add(historyTtl);
      return Success(_history!);
    } catch (_) {
      return _current(actor, generation)
          ? const Failed(invalidAcknowledgementFailure)
          : const Failed(staleOutboxFailure);
    }
  }

  Future<Result<SelfStudyHistory>> _boundHistoryResult(
    ActorBinding actor,
    int generation,
    Result<SelfStudyHistory> result,
  ) async {
    await Future<void>.value();
    return _current(actor, generation)
        ? result
        : const Failed(staleOutboxFailure);
  }

  void _clearHistory() {
    _history = null;
    _historyActor = null;
    _historyExpiry = null;
  }

  @override
  void dispose() {
    if (_disposed) return;
    _disposed = true;
    _generation++;
    _timer?.cancel();
    _clearHistory();
    unawaited(_sessionSubscription.cancel());
    unawaited(_databaseSubscription.cancel());
    writer?.removeListener(_writerChanged);
    lifecycle?.removeListener(_lifecycleChanged);
    super.dispose();
  }
}

final class _SyncFlight {
  _SyncFlight(this.actor, this.generation);
  final ActorBinding actor;
  final int generation;
  late Future<void> future;
}

final class _Acknowledgement {
  const _Acknowledgement(this.accepted, this.rejected, this.reflections);
  final List<String> accepted;
  final List<String> rejected;
  final List<ModuleReflection> reflections;
}

_Acknowledgement? _parseAcknowledgement(
  Map<String, Object?> data,
  List<QueuedFormativeEvent> batch,
) {
  try {
    final rawAccepted = data['accepted'],
        rawRejected = data.containsKey('rejected')
            ? data['rejected']
            : const [],
        rawRecords = data['records'];
    if (rawAccepted is! List ||
        rawRejected is! List ||
        rawRecords is! List ||
        rawRecords.length > 4) {
      return null;
    }
    final ids = batch.map((row) => row.event.id).toSet();
    final seen = <String>{}, accepted = <String>[], rejected = <String>[];
    for (final id in rawAccepted) {
      if (id is! String || !ids.contains(id) || !seen.add(id)) return null;
      accepted.add(id);
    }
    for (final row in rawRejected) {
      if (row is! Map ||
          row.keys.any((k) => k != 'id' && k != 'code') ||
          row['id'] is! String ||
          !ids.contains(row['id']) ||
          !seen.add(row['id']! as String) ||
          row['code'] is! String ||
          !RegExp(r'^[A-Za-z0-9_-]{1,80}$').hasMatch(row['code']! as String)) {
        return null;
      }
      rejected.add(row['code']! as String);
    }
    final reflections = <ModuleReflection>[], activities = <ModuleActivity>{};
    for (final raw in rawRecords) {
      if (raw is! Map) return null;
      final record = ModuleReflection.fromJson(Map<String, Object?>.from(raw))
          .valueOrNull;
      if (record == null || !activities.add(record.activity)) return null;
      reflections.add(record);
    }
    return _Acknowledgement(accepted, rejected, reflections);
  } catch (_) {
    return null;
  }
}

AppFailure? failureForReply(CloudReply reply) {
  if (reply.errorCode == null &&
      reply.statusCode >= 200 &&
      reply.statusCode < 300) {
    return null;
  }
  return _codeFailure(
    reply.errorCode ?? 'request_failed',
    reply.statusCode,
    reply.retryAfter,
  );
}

AppFailure _codeFailure(String code, int status, Duration? retryAfter) {
  final type = status >= 500
      ? FailureCode.network
      : status == 429
      ? FailureCode.retryAfter
      : status == 401 ||
            const {
              'session-expired',
              'session-changed',
              'unauthenticated',
              'session_required',
              'PGRST301',
              'PGRST303',
            }.contains(code)
      ? FailureCode.unauthorized
      : const {'PGRST202', '42883', 'service-unavailable'}.contains(code)
      ? FailureCode.unavailable
      : code == 'id_conflict'
      ? FailureCode.conflict
      : FailureCode.invalid;
  return AppFailure(
    code: type,
    message: 'Formative delivery needs attention. Local records were kept.',
    retryAfter: retryAfter,
  );
}
