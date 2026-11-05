import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../core/records/formative_record.dart';
import '../../../core/records/formative_records.dart';
import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';
import 'sqlite_formative_outbox.dart';

/// Keeps failed canonical saves for this process; only the shared writer commits.
/// A failed receipt never claims durability. Guest intents never become uploads.
final class SyncFormativeRecordWriter extends ChangeNotifier
    implements FormativeRecordWriter {
  SyncFormativeRecordWriter({
    required this.delegate,
    required this.sessions,
    required this.outbox,
  });
  final FormativeRecordWriter delegate;
  final AuthSession sessions;
  final SqliteFormativeOutbox outbox;
  final Map<String, _SaveIntent> _intents = {};
  bool _disposed = false;

  int unsaved(ActorBinding actor) => _intents.values
      .where((entry) => entry.actor.partition == actor.partition)
      .length;
  bool hasStorageFailure(ActorBinding actor) => _intents.values.any(
    (entry) => entry.actor.partition == actor.partition && entry.failed,
  );

  @override
  Future<Result<DurableRecordReceipt>> saveReflection({
    required ActorBinding actor,
    required ModuleReflection reflection,
  }) => _save(
    _SaveIntent(
      actor,
      'module:${reflection.activity.name}',
      reflection: reflection,
    ),
  );

  @override
  Future<Result<DurableRecordReceipt>> saveCompletedSolo({
    required ActorBinding actor,
    required CompletedSoloRecord record,
  }) => _save(_SaveIntent(actor, 'solo:${record.attemptId}', solo: record));

  Future<Result<DurableRecordReceipt>> _save(_SaveIntent intent) {
    if (_disposed || !sessions.isCurrent(intent.actor)) {
      return Future.value(const Failed(staleOutboxFailure));
    }
    final key = '${intent.actor.partition}/${intent.key}';
    final previous = _intents[key];
    if (previous?.flight != null) {
      if (previous!.actor == intent.actor &&
          previous.reflection == intent.reflection &&
          previous.solo == intent.solo) {
        return previous.flight!;
      }
      // A new epoch must perform its own save after old work settles, including
      // identical content. Its caller cannot reuse the old binding's receipt.
      return previous.flight!.then((_) => _save(intent));
    }
    if (previous?.reflection != null && intent.reflection != null) {
      intent.reflection = previous!.reflection!.merge(intent.reflection!);
    }
    if (previous?.solo != null && previous!.solo != intent.solo) {
      return Future.value(
        const Failed(
          AppFailure(
            code: FailureCode.conflict,
            message: 'This attempt has a different unsaved result.',
          ),
        ),
      );
    }
    _intents[key] = intent;
    final flight = _commit(intent, key);
    intent.flight = flight;
    return flight;
  }

  Future<Result<DurableRecordReceipt>> _commit(
    _SaveIntent intent,
    String key,
  ) async {
    Result<DurableRecordReceipt> result;
    try {
      result = intent.reflection != null
          ? await delegate.saveReflection(
              actor: intent.actor,
              reflection: intent.reflection!,
            )
          : await _saveSolo(intent.actor, intent.solo!);
    } catch (_) {
      result = const Failed(storageOutboxFailure);
    }
    intent.flight = null;
    if (_disposed) return const Failed(staleOutboxFailure);
    if (result.isSuccess || result.failureOrNull?.code != FailureCode.storage) {
      if (identical(_intents[key], intent)) _intents.remove(key);
    } else {
      intent.failed = true;
    }
    notifyListeners();
    return sessions.isCurrent(intent.actor)
        ? result
        : const Failed(staleOutboxFailure);
  }

  Future<Result<DurableRecordReceipt>> _saveSolo(
    ActorBinding actor,
    CompletedSoloRecord record,
  ) async {
    if (actor.isGuest) {
      return delegate.saveCompletedSolo(actor: actor, record: record);
    }
    final previous = await outbox.readSoloReceipt(actor: actor, record: record);
    if (_disposed || !sessions.isCurrent(actor)) {
      return const Failed(staleOutboxFailure);
    }
    if (previous.failureOrNull case final failure?) return Failed(failure);
    if (previous.valueOrNull case final receipt?) return Success(receipt);
    final saved = await delegate.saveCompletedSolo(
      actor: actor,
      record: record,
    );
    if (_disposed || !sessions.isCurrent(actor)) {
      return const Failed(staleOutboxFailure);
    }
    if (!saved.isSuccess && saved.failureOrNull?.code != FailureCode.conflict) {
      return saved;
    }
    // Another writer may have finalized after the precheck. Its appender forces
    // our aggregate/event transaction to roll back, then this read recovers only
    // a matching durable receipt. Never await the parent DB inside that callback.
    final committed = await outbox.readSoloReceipt(
      actor: actor,
      record: record,
    );
    if (_disposed || !sessions.isCurrent(actor)) {
      return const Failed(staleOutboxFailure);
    }
    if (committed.failureOrNull case final failure?) return Failed(failure);
    if (committed.valueOrNull case final receipt?) return Success(receipt);
    return const Failed(storageOutboxFailure);
  }

  Future<void> settle() async {
    await Future.wait(
      _intents.values
          .map((e) => e.flight)
          .whereType<Future<Result<DurableRecordReceipt>>>(),
    );
  }

  /// Rebinding old in-memory work requires an explicit retry by the same owner.
  Future<void> retryUnsaved(ActorBinding actor, {bool rebind = false}) async {
    await settle();
    if (_disposed || !sessions.isCurrent(actor)) return;
    for (final entry in List<_SaveIntent>.of(_intents.values)) {
      if (!entry.failed ||
          entry.actor.partition != actor.partition ||
          (!rebind && entry.actor != actor)) {
        continue;
      }
      await _save(
        _SaveIntent(
          actor,
          entry.key,
          reflection: entry.reflection,
          solo: entry.solo,
        ),
      );
      if (_disposed || !sessions.isCurrent(actor)) return;
    }
  }

  @override
  void dispose() {
    if (_disposed) return;
    _disposed = true;
    _intents.clear();
    super.dispose();
  }
}

final class _SaveIntent {
  _SaveIntent(this.actor, this.key, {this.reflection, this.solo});
  final ActorBinding actor;
  final String key;
  ModuleReflection? reflection;
  final CompletedSoloRecord? solo;
  bool failed = false;
  Future<Result<DurableRecordReceipt>>? flight;
}
