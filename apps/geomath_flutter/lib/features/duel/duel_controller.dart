import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';

import '../../core/geometry/geometry_card_provider.dart';
import '../../core/lifecycle/app_lifecycle.dart';
import '../../core/navigation/app_navigation.dart';
import '../../core/result.dart';
import '../../core/runtime/clock.dart';
import '../../core/runtime/random_source.dart';
import '../../core/session/actor_binding.dart';
import '../../core/session/auth_session.dart';
import 'duel_projection.dart';
import 'duel_protected_store.dart';
import 'duel_transport.dart';

final class _DuelFault implements Exception {
  const _DuelFault(this.code, [this.retryAfter, this.handled = false]);
  final String code;
  final Duration? retryAfter;
  final bool handled;
}

/// Credential is deliberately private and never part of a UI snapshot.
final class _Capability {
  const _Capability(this.partition, this.token, this.roomId, this.pendingJson);
  final String partition, token;
  final String? roomId, pendingJson;
  _Capability withPending(String? pending) =>
      _Capability(partition, token, roomId, pending);
  _Capability withRoom(String room) =>
      _Capability(partition, token, room, pendingJson);
  String serialize() => jsonEncode({
    'schema': 2,
    'partition': partition,
    'token': token,
    'roomId': roomId,
    'pending': pendingJson,
  });
  factory _Capability.restore(String serialized, String partition) {
    if (serialized.length > 16384) throw const _DuelFault('invalid_session');
    final map = jsonDecode(serialized);
    if (map is! Map<String, dynamic> ||
        map.length != 5 ||
        map.keys.any(
          (key) => !{
            'schema',
            'partition',
            'token',
            'roomId',
            'pending',
          }.contains(key),
        ) ||
        map['schema'] != 2 ||
        map['partition'] != partition ||
        map['token'] is! String ||
        !RegExp(r'^[a-f0-9]{64}$').hasMatch(map['token'] as String) ||
        (map['roomId'] != null &&
            (map['roomId'] is! String ||
                !validDuelRoomId(map['roomId'] as String))) ||
        (map['pending'] != null && map['pending'] is! String)) {
      throw const _DuelFault('invalid_session');
    }
    final result = _Capability(
      partition,
      map['token'] as String,
      map['roomId'] as String?,
      map['pending'] as String?,
    );
    if (result.pendingJson case final pending?) {
      _validateCommand(jsonDecode(pending), result);
    }
    return result;
  }
}

void _validateCommand(Object? value, _Capability capability) {
  if (value is! Map<String, dynamic> ||
      value['protocol'] != 2 ||
      value['token'] != capability.token) {
    throw const _DuelFault('invalid_session');
  }
  final action = value['action'];
  final fields = <String>{'protocol', 'action', 'token'};
  if (action == 'create' || action == 'join') {
    fields.add('name');
    try {
      if (value['name'] is! String ||
          _normalizedName(value['name'] as String) != value['name']) {
        throw const _DuelFault('invalid_session');
      }
    } catch (_) {
      throw const _DuelFault('invalid_session');
    }
    if (action == 'join') {
      fields.add('code');
      if (value['code'] is! String ||
          !RegExp(r'^\d{6}$').hasMatch(value['code'] as String)) {
        throw const _DuelFault('invalid_session');
      }
    }
  } else {
    if (!{
          'state',
          'ready',
          'leave',
          'hint',
          'skip',
          'scan',
          'advance',
        }.contains(action) ||
        value['roomId'] != capability.roomId ||
        capability.roomId == null) {
      throw const _DuelFault('invalid_session');
    }
    fields.add('roomId');
    if (action != 'state') {
      fields.add('seq');
      if (value['seq'] is! int ||
          (value['seq'] as int) < 1 ||
          (value['seq'] as int) > 2147483647) {
        throw const _DuelFault('invalid_session');
      }
    }
    if ({'hint', 'skip', 'scan', 'advance'}.contains(action)) {
      fields.add('questionIndex');
      if (value['questionIndex'] is! int ||
          (value['questionIndex'] as int) < 0 ||
          (value['questionIndex'] as int) > 9) {
        throw const _DuelFault('invalid_session');
      }
    }
    if (action == 'scan') {
      fields.addAll({'kind', 'shape', 'target'});
      if (!{'solid', 'net'}.contains(value['kind']) ||
          !{'r1', 'r2'}.contains(value['target']) ||
          !GeometryShape.values.any((s) => s.name == value['shape'])) {
        throw const _DuelFault('invalid_session');
      }
    }
  }
  if (value.keys.toSet().difference(fields).isNotEmpty ||
      value.length != fields.length) {
    throw const _DuelFault('invalid_session');
  }
}

String _normalizedName(String value) {
  if (RegExp(r'[\x00-\x1f\x7f]').hasMatch(value)) {
    throw const _DuelFault('invalid_name');
  }
  final name = value.trim().replaceAll(RegExp(r'\s+'), ' ');
  if (name.length < 2 || name.length > 60) {
    throw const _DuelFault('invalid_name');
  }
  return name;
}

/// One owner of protocol, polling, pending writes and review advancement.
/// No local score evaluator, business database or formative outbox is used.
final class DuelController extends ChangeNotifier {
  DuelController({
    required this.sessions,
    required this.lifecycle,
    required this.store,
    required this._transport,
    this.clock = const SystemClock(),
    RandomSource? random,
    this.timersEnabled = true,
    Future<void> Function(Duration)? sleep,
  }) : _random = random ?? SecureRandomSource(),
       _sleep = sleep ?? Future<void>.delayed,
       _actor = sessions.current {
    _actorSubscription = sessions.bindings.listen(_onActor);
    lifecycle.addListener(_onLifecycle);
  }

  final AuthSession sessions;
  final AppLifecycleController lifecycle;
  final DuelProtectedStore store;
  final Clock clock;
  final bool timersEnabled;
  final RandomSource _random;
  final Future<void> Function(Duration) _sleep;
  final DuelTransport? _transport;
  late final StreamSubscription<ActorBinding> _actorSubscription;
  ActorBinding _actor;
  _Capability? _capability;
  DuelSnapshot? _snapshot;
  Future<void> _storageTail = Future<void>.value();
  Future<Result<void>>? _initializing, _refreshFlight, _resumeFlight;
  Timer? _pollTimer, _reviewTimer;
  int _epoch = 0, _pollEpoch = 0, _serial = 0, _acceptedSerial = 0;
  int _sessionGeneration = 0;
  int _receivedAt = 0, _lastClock = 0, _pollFailures = 0, _reviewAttempts = 0;
  DateTime? _retryAt;
  bool _initialized = false, _busy = false, _polling = false, _disposed = false;
  bool _connected = false, _protocolStopped = false;
  bool _storedInvalid = false;
  AppFailure? _failure;
  String? _errorCode;
  final Map<int, Future<BackDecision> Function()> _backHandlers = {};

  DuelSnapshot? get snapshot => _snapshot;
  ActorBinding get actor => _actor;

  /// Non-secret identity boundary for dialogs and route callbacks.
  int get sessionGeneration => _sessionGeneration;
  AppFailure? get failure => _failure;
  String? get errorCode => _errorCode;
  bool get configured => _transport != null;
  bool get initialized => _initialized;
  bool get busy => _busy;
  bool get connected => _connected && !_cooling && !_protocolStopped;
  bool get hasSession => _capability != null || _storedInvalid;
  bool get pending => _capability?.pendingJson != null;
  bool get polling => _polling;
  bool get protocolStopped => _protocolStopped;
  bool get canForgetSession =>
      hasSession &&
      (_protocolStopped ||
          !configured ||
          _snapshot?.room.terminal == true ||
          {
            'invalid_token',
            'room_expired',
            'room_unavailable',
          }.contains(_errorCode) ||
          (_snapshot == null && !pending));
  bool get _cooling => _retryAt != null && clock.now().isBefore(_retryAt!);
  Duration get retryRemaining =>
      !_cooling ? Duration.zero : _retryAt!.difference(clock.now());
  bool get needsForfeitConfirmation =>
      hasSession &&
      (_snapshot == null ||
          (!_snapshot!.room.terminal && _snapshot!.me.finishedAt == null));
  int get serverMilliseconds {
    final snapshot = _snapshot;
    if (snapshot == null) return 0;
    final int value =
        snapshot.serverNow +
        math.max<int>(0, clock.monotonicMilliseconds() - _receivedAt);
    _lastClock = math.max<int>(_lastClock, value);
    return _lastClock;
  }

  int get reviewRemaining =>
      math.max(0, (_snapshot?.nextReadyAt ?? 0) - serverMilliseconds);
  bool get canContinue =>
      connected &&
      !busy &&
      !pending &&
      lifecycle.isForeground &&
      _snapshot?.reviewPending == true &&
      reviewRemaining == 0;
  bool get canAnswer =>
      connected &&
      !busy &&
      !pending &&
      lifecycle.isForeground &&
      _snapshot?.room.status == DuelRoomStatus.playing &&
      _snapshot?.currentQuestion != null &&
      _snapshot?.reviewPending == false;

  void registerBackHandler(
    int instance,
    Future<BackDecision> Function() handler,
  ) => _backHandlers[instance] = handler;
  void removeBackHandler(int instance) => _backHandlers.remove(instance);
  Future<BackDecision> requestBack(int instance) async =>
      await _backHandlers[instance]?.call() ??
      (hasSession ? BackDecision.stay : BackDecision.allow);

  bool _current(int epoch, ActorBinding actor) =>
      !_disposed &&
      _epoch == epoch &&
      actor == _actor &&
      sessions.isCurrent(actor);
  void _guard(int epoch, ActorBinding actor) {
    if (!_current(epoch, actor)) throw const _DuelFault('stale_request');
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  Future<Result<void>> initialize() {
    if (_disposed) return Future.value(_failed('stale_request'));
    if (_initialized) return Future.value(const Success(null));
    if (_initializing case final flight?) return flight;
    final epoch = _epoch, actor = _actor;
    late final Future<Result<void>> flight;
    flight =
        (() async {
          try {
            await _storageTail;
            _guard(epoch, actor);
            final result = await store.read(actor.partition);
            _guard(epoch, actor);
            if (result case Failed<String?>()) {
              throw const _DuelFault('storage');
            }
            final serialized = (result as Success<String?>).value;
            try {
              _capability = serialized == null
                  ? null
                  : _Capability.restore(serialized, actor.partition);
              if (_capability != null) _sessionGeneration++;
            } on FormatException {
              throw const _DuelFault('invalid_session');
            }
            _initialized = true;
            if (!configured) _record(const _DuelFault('unavailable'), epoch);
            _notify();
            return const Success<void>(null);
          } catch (error) {
            final fault = _fault(error);
            if (_current(epoch, actor) && fault.code == 'invalid_session') {
              _storedInvalid = true;
            }
            _record(fault, epoch);
            return _failed(fault.code, fault.retryAfter);
          }
        })().whenComplete(() {
          if (identical(_initializing, flight)) _initializing = null;
        });
    return _initializing = flight;
  }

  Future<void> _persist(
    _Capability value,
    int epoch,
    ActorBinding actor,
  ) async {
    _guard(epoch, actor);
    final operation = _storageTail.then((_) async {
      _guard(epoch, actor);
      return store.write(actor.partition, value.serialize());
    });
    _storageTail = operation.then<void>((_) {}, onError: (Object _) {});
    final result = await operation;
    _guard(epoch, actor);
    if (!result.isSuccess) throw const _DuelFault('storage');
  }

  Future<Result<void>> _mutate(
    Future<void> Function(int, ActorBinding) operation,
  ) async {
    if (_busy) return _failed('busy');
    final epoch = _epoch, actor = _actor;
    _busy = true;
    _notify();
    try {
      final loaded = await initialize();
      _guard(epoch, actor);
      if (!loaded.isSuccess) throw _DuelFault(_errorCode ?? 'storage');
      if (!configured) throw const _DuelFault('unavailable');
      if (_protocolStopped) {
        throw _DuelFault(_errorCode ?? 'client_update_required');
      }
      if (!lifecycle.isForeground) throw const _DuelFault('background');
      if (_cooling) throw _DuelFault('rate_limited', retryRemaining);
      await operation(epoch, actor);
      _guard(epoch, actor);
      return const Success(null);
    } catch (error) {
      final fault = _fault(error);
      if (!fault.handled) _record(fault, epoch);
      return _failed(fault.code, fault.retryAfter);
    } finally {
      if (_current(epoch, actor)) {
        _busy = false;
        _scheduleReview();
        _notify();
      }
    }
  }

  Future<Result<void>> create(String name) => _enter(name, null);
  Future<Result<void>> join(String name, String code) => _enter(name, code);
  Future<Result<void>> _enter(String rawName, String? code) =>
      _mutate((epoch, actor) async {
        final name = _normalizedName(rawName);
        if (code != null && !RegExp(r'^\d{6}$').hasMatch(code)) {
          throw const _DuelFault('invalid_pin');
        }
        if (hasSession) {
          throw _DuelFault(pending ? 'pending_action' : 'active_room');
        }
        final capability = _Capability(
          actor.partition,
          randomIdentifier(SecureRandomSource(), bytes: 32),
          null,
          null,
        );
        final command = {
          'protocol': 2,
          'action': code == null ? 'create' : 'join',
          'token': capability.token,
          'name': name,
          'code': ?code,
        };
        _sessionGeneration++;
        _capability = capability.withPending(jsonEncode(command));
        await _replay(epoch, actor);
        startPolling();
      });

  Future<Result<void>> ready() => _act('ready');
  Future<Result<void>> hint() => _act('hint');
  Future<Result<void>> skip() => _act('skip');
  Future<Result<void>> scan(
    GeometryShape shape, {
    required GeometryCardKind kind,
  }) => _act(
    'scan',
    fields: {
      'kind': kind.name,
      'shape': shape.name,
      'target': kind == GeometryCardKind.solid ? 'r1' : 'r2',
    },
  );
  Future<Result<void>> advance({bool automatic = false}) =>
      _act('advance', automatic: automatic);

  Future<Result<void>> _act(
    String action, {
    Map<String, Object?> fields = const {},
    bool automatic = false,
  }) => _mutate((epoch, actor) async {
    if (!connected) throw const _DuelFault('not_connected');
    if (pending) throw const _DuelFault('pending_action');
    final snapshot = _snapshot, capability = _capability;
    if (snapshot == null || capability?.roomId == null) {
      throw const _DuelFault('not_connected');
    }
    if (action == 'ready') {
      if (snapshot.room.status != DuelRoomStatus.waiting || snapshot.me.ready) {
        throw const _DuelFault('not_ready');
      }
    } else if (action == 'advance') {
      if (!snapshot.reviewPending ||
          reviewRemaining > 0 ||
          (automatic && snapshot.review?.outcome != DuelOutcome.correct)) {
        throw const _DuelFault('not_ready');
      }
    } else {
      if (snapshot.currentQuestion == null ||
          snapshot.reviewPending ||
          snapshot.room.status != DuelRoomStatus.playing) {
        throw const _DuelFault('not_ready');
      }
      if (action == 'hint' && snapshot.hintUsed) return;
      if (action == 'scan' && fields['kind'] != snapshot.me.stage.name) {
        throw const _DuelFault('stage_mismatch');
      }
    }
    if (automatic) _reviewAttempts++;
    await _queueAndReplay(
      action,
      fields,
      epoch,
      actor,
      questionIndex: {'hint', 'skip', 'scan', 'advance'}.contains(action)
          ? snapshot.questionIndex
          : null,
    );
  });

  Future<void> _queueAndReplay(
    String action,
    Map<String, Object?> fields,
    int epoch,
    ActorBinding actor, {
    int? questionIndex,
  }) async {
    final capability = _capability!;
    final command = <String, Object?>{
      'protocol': 2,
      'action': action,
      'roomId': capability.roomId,
      'token': capability.token,
      'seq': _snapshot!.seq + 1,
      'questionIndex': ?questionIndex,
      ...fields,
    };
    _capability = capability.withPending(jsonEncode(command));
    await _replay(epoch, actor);
  }

  Future<void> _replay(int epoch, ActorBinding actor) async {
    final capability = _capability!;
    final pendingJson = capability.pendingJson!;
    _validateCommand(jsonDecode(pendingJson), capability);
    // A denied/partial secure write never permits a request to start.
    await _persist(capability, epoch, actor);
    final command = Map<String, Object?>.unmodifiable(
      jsonDecode(pendingJson) as Map<String, dynamic>,
    );
    try {
      DuelSnapshot? response;
      for (var attempt = 0; attempt < 2; attempt++) {
        try {
          response = await _request(command, epoch, actor);
          break;
        } on _DuelFault catch (fault) {
          if (!{'network_error', 'server_error'}.contains(fault.code) ||
              fault.retryAfter != null ||
              attempt == 1) {
            rethrow;
          }
          await _sleep(
            Duration(milliseconds: (150 + 150 * _random.nextDouble()).round()),
          );
          _guard(epoch, actor);
        }
      }
      _guard(epoch, actor);
      final expectedSeq = command['seq'];
      if (response == null ||
          (expectedSeq is int && response.seq < expectedSeq)) {
        throw const _DuelFault('invalid_response');
      }
      final acknowledged = capability
          .withRoom(response.room.id)
          .withPending(null);
      // Keep the original pending command if clearing the protected copy fails.
      _capability = capability.withRoom(response.room.id);
      await _persist(acknowledged, epoch, actor);
      _capability = acknowledged;
    } on _DuelFault catch (fault) {
      if ({
        'invalid_request',
        'invalid_name',
        'invalid_pin',
        'not_ready',
        'not_started',
        'question_mismatch',
        'stage_mismatch',
        'sequence_conflict',
        'sequence_mismatch',
        'room_full',
      }.contains(fault.code)) {
        final cleared = _capability!.withPending(null);
        await _persist(cleared, epoch, actor);
        _capability = cleared;
      }
      rethrow;
    }
  }

  Future<Result<void>> resume() {
    if (_resumeFlight case final flight?) return flight;
    _reviewAttempts = 0;
    late final Future<Result<void>> flight;
    flight =
        (() async {
          final loaded = await initialize();
          if (!loaded.isSuccess) return loaded;
          if (!lifecycle.isForeground) return _failed('background');
          if (pending) return _mutate((epoch, actor) => _replay(epoch, actor));
          return refresh();
        })().whenComplete(() {
          if (identical(_resumeFlight, flight)) _resumeFlight = null;
          startPolling();
        });
    return _resumeFlight = flight;
  }

  Future<Result<void>> refresh() {
    if (_refreshFlight case final flight?) return flight;
    if (_disposed) return Future.value(_failed('stale_request'));
    if (_busy) return Future.value(_failed('busy'));
    if (!configured) return Future.value(_failed('unavailable'));
    if (_protocolStopped) {
      return Future.value(_failed(_errorCode ?? 'client_update_required'));
    }
    final capability = _capability;
    if (capability?.roomId == null) return Future.value(const Success(null));
    final epoch = _epoch,
        actor = _actor,
        pendingAtStart = capability!.pendingJson;
    late final Future<Result<void>> flight;
    flight =
        (() async {
          try {
            final response = await _request(
              {
                'protocol': 2,
                'action': 'state',
                'roomId': capability.roomId,
                'token': capability.token,
              },
              epoch,
              actor,
            );
            _guard(epoch, actor);
            if (pendingAtStart != null &&
                _capability?.pendingJson == pendingAtStart) {
              final command =
                  jsonDecode(pendingAtStart) as Map<String, dynamic>;
              if (command['seq'] is int &&
                  (command['seq'] as int) <= response.seq) {
                final cleared = _capability!.withPending(null);
                await _persist(cleared, epoch, actor);
                _capability = cleared;
              }
            }
            _scheduleReview();
            _notify();
            return const Success<void>(null);
          } catch (error) {
            final fault = _fault(error);
            if (!fault.handled) _record(fault, epoch);
            return _failed(fault.code, fault.retryAfter);
          }
        })().whenComplete(() {
          if (identical(_refreshFlight, flight)) _refreshFlight = null;
        });
    return _refreshFlight = flight;
  }

  Future<DuelSnapshot> _request(
    Map<String, Object?> command,
    int epoch,
    ActorBinding actor,
  ) async {
    _guard(epoch, actor);
    if (_cooling) throw _DuelFault('rate_limited', retryRemaining);
    final serial = ++_serial, requestedRoom = command['roomId'];
    final requestedToken = command['token'];
    bool currentRequest() =>
        _current(epoch, actor) &&
        _capability?.token == requestedToken &&
        (requestedRoom == null || _capability?.roomId == requestedRoom);
    try {
      final response = await _transport!.post(command);
      if (!currentRequest()) {
        throw const _DuelFault('stale_request');
      }
      Object? decoded;
      try {
        decoded = jsonDecode(response.body);
      } catch (_) {
        // A proxy's HTTP error may have an empty or HTML body. Its status and
        // Retry-After still apply; only successful projections require JSON.
      }
      final body = decoded is Map<String, dynamic> ? decoded : null;
      final error = body?['error'];
      if (response.status == 400 &&
          error == 'invalid_request' &&
          response.header('x-geodecoder-duel-protocol') != '2') {
        throw const _DuelFault('backend_update_required');
      }
      if (response.status < 200 ||
          response.status >= 300 ||
          body?['ok'] == false) {
        final code = response.status == 429
            ? 'rate_limited'
            : {
                'backend_update_required',
                'client_update_required',
              }.contains(error)
            ? error! as String
            : response.status >= 500
            ? 'server_error'
            : _knownErrors.contains(error)
            ? error! as String
            : 'server_error';
        final retry = _parseRetryAfter(response.header('retry-after'));
        throw _DuelFault(
          code,
          code == 'rate_limited'
              ? Duration(
                  milliseconds: math.max(1000, retry?.inMilliseconds ?? 1000),
                )
              : retry,
        );
      }
      final snapshot = DuelSnapshot.parse(body);
      if (requestedRoom != null && requestedRoom != snapshot.room.id ||
          _capability?.roomId != null &&
              _capability!.roomId != snapshot.room.id ||
          _snapshot != null && _snapshot!.me.id != snapshot.me.id) {
        throw const _DuelFault('invalid_response');
      }
      final previous = _snapshot;
      if (previous != null &&
          (snapshot.seq < previous.seq ||
              snapshot.serverNow < previous.serverNow)) {
        return previous;
      }
      _snapshot = snapshot;
      _receivedAt = clock.monotonicMilliseconds();
      _acceptedSerial = math.max(serial, _acceptedSerial);
      if (previous?.seq != snapshot.seq) _reviewAttempts = 0;
      if (!_cooling) {
        _connected = true;
        _failure = null;
        _errorCode = null;
        _pollFailures = 0;
      }
      if (snapshot.room.terminal) stopPolling();
      _notify();
      return snapshot;
    } catch (error) {
      final current = currentRequest();
      final fault = current ? _fault(error) : const _DuelFault('stale_request');
      // Rate limits apply to the shared capability even when a newer action
      // was accepted before an older poll completed. Retain the newer snapshot.
      if (current &&
          (serial >= _acceptedSerial || fault.code == 'rate_limited')) {
        _record(fault, epoch);
      }
      throw _DuelFault(fault.code, fault.retryAfter, true);
    }
  }

  Future<Result<void>> leave({
    required bool confirmed,
    int? expectedGeneration,
  }) {
    if (!confirmed) return Future.value(_failed('cancelled'));
    final generation = expectedGeneration ?? _sessionGeneration;
    if (generation != _sessionGeneration) {
      return Future.value(_failed('stale_request'));
    }
    if (canForgetSession) {
      return forgetSession(confirmed: true, expectedGeneration: generation);
    }
    return _mutate((epoch, actor) async {
      if (generation != _sessionGeneration) {
        throw const _DuelFault('stale_request');
      }
      if (pending) await _replay(epoch, actor);
      _guard(epoch, actor);
      final snapshot = _snapshot;
      if (_capability?.roomId != null &&
          snapshot != null &&
          !snapshot.room.terminal &&
          !{
            'invalid_token',
            'room_expired',
            'room_unavailable',
          }.contains(_errorCode)) {
        await _queueAndReplay('leave', const {}, epoch, actor);
      }
      final operation = _storageTail.then((_) => store.clear(actor.partition));
      _storageTail = operation.then<void>((_) {}, onError: (Object _) {});
      final result = await operation;
      _guard(epoch, actor);
      if (!result.isSuccess) throw const _DuelFault('storage');
      stopPolling();
      _transport?.cancelPending();
      _reviewTimer?.cancel();
      _capability = null;
      _sessionGeneration++;
      _refreshFlight = null;
      _resumeFlight = null;
      _snapshot = null;
      _storedInvalid = false;
      _initialized = true;
      _connected = false;
      _lastClock = 0;
      _errorCode = null;
      _failure = null;
    });
  }

  /// Explicit local recovery only; this never claims a server-side forfeit.
  Future<Result<void>> forgetSession({
    required bool confirmed,
    int? expectedGeneration,
  }) async {
    if (!confirmed) return _failed('cancelled');
    if (expectedGeneration != null &&
        expectedGeneration != _sessionGeneration) {
      return _failed('stale_request');
    }
    if (!canForgetSession || _busy) return _failed('active_room');
    final epoch = _epoch, actor = _actor;
    _busy = true;
    _notify();
    try {
      final operation = _storageTail.then((_) {
        _guard(epoch, actor);
        return store.clear(actor.partition);
      });
      _storageTail = operation.then<void>((_) {}, onError: (Object _) {});
      final result = await operation;
      _guard(epoch, actor);
      if (!result.isSuccess) throw const _DuelFault('storage');
      stopPolling();
      _transport?.cancelPending();
      _reviewTimer?.cancel();
      _capability = null;
      _sessionGeneration++;
      _refreshFlight = null;
      _resumeFlight = null;
      _snapshot = null;
      _connected = false;
      _protocolStopped = false;
      _storedInvalid = false;
      _initialized = true;
      _retryAt = null;
      _lastClock = 0;
      _failure = null;
      _errorCode = null;
      return const Success(null);
    } catch (error) {
      final fault = _fault(error);
      if (!fault.handled) _record(fault, epoch);
      return _failed(fault.code, fault.retryAfter);
    } finally {
      if (_current(epoch, actor)) {
        _busy = false;
        _notify();
      }
    }
  }

  void startPolling() {
    if (_disposed ||
        _polling ||
        !timersEnabled ||
        !hasSession ||
        !configured ||
        _protocolStopped ||
        {
          'invalid_token',
          'room_expired',
          'room_unavailable',
          'storage',
        }.contains(_errorCode) ||
        _snapshot?.room.terminal == true ||
        !lifecycle.isForeground) {
      return;
    }
    _polling = true;
    final epoch = ++_pollEpoch;
    _schedulePoll(
      epoch,
      Duration(milliseconds: 1500 + (500 * _random.nextDouble()).round()),
    );
  }

  void _schedulePoll(int epoch, Duration delay) {
    _pollTimer?.cancel();
    _pollTimer = Timer(delay, () async {
      if (_disposed || !_polling || epoch != _pollEpoch) return;
      if (!_busy && !_cooling && lifecycle.isForeground) await refresh();
      if (_disposed || !_polling || epoch != _pollEpoch) return;
      final base = _pollFailures > 0
          ? math.min(30000, 5000 * math.pow(2, math.min(4, _pollFailures - 1)))
          : _snapshot?.room.status == DuelRoomStatus.countdown
          ? 1000
          : _snapshot?.room.status == DuelRoomStatus.playing
          ? 4000
          : 5000;
      final delayMs = math.max(
        (base * (1 + _random.nextDouble() * .25)).round(),
        retryRemaining.inMilliseconds,
      );
      _schedulePoll(epoch, Duration(milliseconds: math.min(60000, delayMs)));
    });
  }

  void stopPolling() {
    _polling = false;
    _pollEpoch++;
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  void _scheduleReview() {
    _reviewTimer?.cancel();
    _reviewTimer = null;
    if (!timersEnabled ||
        !connected ||
        _busy ||
        pending ||
        !lifecycle.isForeground ||
        _snapshot?.review?.outcome != DuelOutcome.correct ||
        _reviewAttempts >= 3) {
      return;
    }
    final epoch = _epoch, seq = _snapshot!.seq;
    _reviewTimer = Timer(
      Duration(
        milliseconds: math.max(
          reviewRemaining,
          _errorCode == 'not_ready' ? 250 : 0,
        ),
      ),
      () {
        if (!_disposed &&
            epoch == _epoch &&
            _snapshot?.seq == seq &&
            canContinue) {
          unawaited(advance(automatic: true));
        }
      },
    );
  }

  void _onLifecycle() {
    if (_disposed) return;
    if (!lifecycle.isForeground) {
      stopPolling();
      _reviewTimer?.cancel();
    } else {
      unawaited(resume());
    }
    _notify();
  }

  void _onActor(ActorBinding actor) {
    if (_disposed || actor == _actor) return;
    _epoch++;
    _sessionGeneration++;
    _actor = actor;
    stopPolling();
    _reviewTimer?.cancel();
    _transport?.cancelPending();
    _capability = null;
    _snapshot = null;
    _storedInvalid = false;
    _connected = false;
    _busy = false;
    _initialized = false;
    _initializing = null;
    _refreshFlight = null;
    _resumeFlight = null;
    _errorCode = null;
    _failure = null;
    _retryAt = null;
    _protocolStopped = false;
    _receivedAt = 0;
    _lastClock = 0;
    _acceptedSerial = 0;
    _pollFailures = 0;
    _notify();
    unawaited(resume());
  }

  Duration? _parseRetryAfter(String? value) {
    if (value == null) return null;
    final seconds = double.tryParse(value);
    if (seconds != null && seconds.isFinite) {
      return Duration(milliseconds: math.max(0, (seconds * 1000).ceil()));
    }
    try {
      return Duration(
        milliseconds: math.max(
          0,
          HttpDate.parse(value).difference(clock.now()).inMilliseconds,
        ),
      );
    } catch (_) {
      return null;
    }
  }

  _DuelFault _fault(Object error) => switch (error) {
    _DuelFault() => error,
    DuelProjectionException(:final code) => _DuelFault(code),
    FormatException() => const _DuelFault('invalid_response'),
    _ => const _DuelFault('network_error'),
  };
  void _record(_DuelFault fault, int epoch) {
    if (_disposed || epoch != _epoch || fault.code == 'stale_request') return;
    _connected = false;
    _errorCode = fault.code;
    _failure = _failed(fault.code, fault.retryAfter).failure;
    if ({
      'network_error',
      'server_error',
      'rate_limited',
    }.contains(fault.code)) {
      _pollFailures++;
    }
    if (fault.retryAfter case final delay?) {
      final retryAt = clock.now().add(delay);
      if (_retryAt == null || retryAt.isAfter(_retryAt!)) _retryAt = retryAt;
    }
    if ({
      'backend_update_required',
      'client_update_required',
      'invalid_response',
      'invalid_session',
    }.contains(fault.code)) {
      _protocolStopped = true;
    }
    if (_protocolStopped ||
        {
          'invalid_token',
          'room_expired',
          'room_unavailable',
          'storage',
        }.contains(fault.code)) {
      stopPolling();
      _reviewTimer?.cancel();
    }
    _notify();
  }

  Failed<void> _failed(String code, [Duration? retry]) => Failed(
    AppFailure(
      code: switch (code) {
        'unavailable' ||
        'backend_update_required' ||
        'client_update_required' => FailureCode.unavailable,
        'storage' => FailureCode.storage,
        'stale_request' => FailureCode.stale,
        'rate_limited' => FailureCode.retryAfter,
        'invalid_token' => FailureCode.unauthorized,
        'cancelled' || 'background' => FailureCode.cancelled,
        'network_error' || 'server_error' => FailureCode.network,
        'busy' ||
        'pending_action' ||
        'active_room' ||
        'sequence_conflict' ||
        'sequence_mismatch' => FailureCode.conflict,
        _ => FailureCode.invalid,
      },
      message: 'Duel action could not be completed ($code).',
      retryAfter: retry,
    ),
  );

  @override
  void dispose() {
    if (_disposed) return;
    _disposed = true;
    _epoch++;
    stopPolling();
    _reviewTimer?.cancel();
    lifecycle.removeListener(_onLifecycle);
    unawaited(_actorSubscription.cancel());
    _transport?.close();
    _backHandlers.clear();
    _capability = null;
    _snapshot = null;
    super.dispose();
  }
}

const _knownErrors = {
  'invalid_request',
  'invalid_token',
  'room_unavailable',
  'room_full',
  'room_expired',
  'not_started',
  'not_ready',
  'question_mismatch',
  'stage_mismatch',
  'sequence_mismatch',
  'sequence_conflict',
  'rate_limited',
  'client_update_required',
  'backend_update_required',
  'server_error',
};
