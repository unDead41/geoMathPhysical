import 'dart:convert';

import '../../../core/records/formative_record.dart';
import '../../../core/records/formative_records.dart';
import '../../../core/result.dart';
import '../../../core/runtime/clock.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';
import '../../../core/storage/app_database.dart';
import '../../../core/storage/formative_schema.dart';
import 'sync_receipt_schema.dart';

final class QueuedFormativeEvent {
  const QueuedFormativeEvent(this.event, this.encodedPayload, this.createdAt);
  final FormativeEvent event;
  final String encodedPayload;
  final DateTime createdAt;
}

final class OutboxSnapshot {
  OutboxSnapshot(this.pending, Iterable<QueuedFormativeEvent> events)
    : events = List.unmodifiable(events);
  final int pending;
  final List<QueuedFormativeEvent> events;
}

/// Uses foundation's table and the writer's transaction. This hook never sends.
final class SqliteFormativeOutbox implements FormativeOutboxAppender {
  SqliteFormativeOutbox({
    required this.database,
    required this.sessions,
    this.clock = const SystemClock(),
  });

  final AppDatabase database;
  final AuthSession sessions;
  final Clock clock;

  static final _uuid = RegExp(
    r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
  );

  void _check(ActorBinding actor, [bool Function()? active]) {
    if (!sessions.isCurrent(actor) || active?.call() == false) {
      throw const _OutboxFailure(staleOutboxFailure);
    }
    if (actor.isGuest ||
        !_uuid.hasMatch(actor.userId!) ||
        actor.partition != 'owner:${actor.userId}') {
      throw const _OutboxFailure(
        AppFailure(
          code: FailureCode.invalid,
          message: 'Only the signed-in owner can queue formative records.',
        ),
      );
    }
  }

  @override
  Future<Result<void>> append({
    required AppTransaction transaction,
    required ActorBinding actor,
    required FormativeEvent event,
  }) async {
    try {
      _check(actor);
      if (utf8.encode(jsonEncode(event.toWireJson())).length > 8192) {
        return const Failed(
          AppFailure(
            code: FailureCode.invalid,
            message: 'Record is too large.',
          ),
        );
      }
      final existing = await transaction.query(
        'SELECT * FROM ${FormativeSchema.outbox} WHERE partition = ? AND event_id = ?',
        [actor.partition, event.id],
      );
      _check(actor);
      if (existing.isNotEmpty) {
        final previous = _decode(existing.single, actor);
        if (jsonEncode(previous.event.toWireJson()) !=
            jsonEncode(event.toWireJson())) {
          return const Failed(
            AppFailure(
              code: FailureCode.conflict,
              message: 'This record ID already contains different content.',
            ),
          );
        }
        return const Success(null);
      }
      if (event.kind == FormativeEventKind.solo) {
        final receipts = await transaction.query(
          'SELECT * FROM ${SyncReceiptSchema.soloReceipts} '
          'WHERE partition = ? AND attempt_id = ?',
          [actor.partition, event.payload['attempt_id']],
        );
        _check(actor);
        if (receipts.isNotEmpty) {
          _decodeSoloReceipt(receipts.single, actor, event.payload);
          // The shared writer may have reinserted a pruned aggregate row. Fail
          // its transaction; the wrapper verifies the original receipt later.
          return const Failed(_soloAlreadyFinalized);
        }
      }
      final count = await transaction.query(
        'SELECT COUNT(*) AS n FROM ${FormativeSchema.outbox} WHERE partition = ?',
        [actor.partition],
      );
      _check(actor);
      if ((count.single['n']! as int) >= FormativeSchema.maxPendingPerOwner) {
        return const Failed(
          AppFailure(
            code: FailureCode.storage,
            message: 'Pending storage is full. Existing records were kept.',
          ),
        );
      }
      await transaction.rawInsert(
        'INSERT INTO ${FormativeSchema.outbox} '
        '(partition, owner_id, event_id, kind, content_version, payload, created_at_ms) '
        'VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          actor.partition,
          actor.userId,
          event.id,
          event.kind.name,
          event.contentVersion,
          jsonEncode(event.payload),
          clock.now().millisecondsSinceEpoch,
        ],
      );
      _check(actor);
      if (event.kind == FormativeEventKind.solo) {
        await transaction.rawInsert(
          'INSERT INTO ${SyncReceiptSchema.soloReceipts} '
          '(partition, owner_id, attempt_id, content_version, payload, event_id, persisted_at_ms) '
          'VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            actor.partition,
            actor.userId,
            event.payload['attempt_id'],
            event.contentVersion,
            jsonEncode(event.payload),
            event.id,
            clock.now().millisecondsSinceEpoch,
          ],
        );
        _check(actor);
      }
      return const Success(null);
    } on _OutboxFailure catch (error) {
      return Failed(error.failure);
    } catch (_) {
      return const Failed(storageOutboxFailure);
    }
  }

  /// Receipt data is returned only to the currently bound same-owner caller.
  /// The original commit time survives acknowledgement, retention and reopen.
  Future<Result<DurableRecordReceipt?>> readSoloReceipt({
    required ActorBinding actor,
    required CompletedSoloRecord record,
  }) async {
    try {
      _check(actor);
      final rows = await database.query(
        'SELECT * FROM ${SyncReceiptSchema.soloReceipts} '
        'WHERE partition = ? AND attempt_id = ?',
        [actor.partition, record.attemptId],
      );
      _check(actor);
      return Success(
        rows.isEmpty
            ? null
            : _decodeSoloReceipt(rows.single, actor, record.toJson()),
      );
    } on _OutboxFailure catch (error) {
      return Failed(error.failure);
    } catch (_) {
      return const Failed(storageOutboxFailure);
    }
  }

  static DurableRecordReceipt _decodeSoloReceipt(
    Map<String, Object?> row,
    ActorBinding actor,
    Map<String, Object?> expected,
  ) {
    if (row['partition'] != actor.partition ||
        row['owner_id'] != actor.userId ||
        row['content_version'] != FormativeSchema.contentVersion ||
        row['attempt_id'] != expected['attempt_id'] ||
        row['payload'] is! String ||
        row['persisted_at_ms'] is! int) {
      throw const _OutboxFailure(storageOutboxFailure);
    }
    final payload = jsonDecode(row['payload']! as String);
    if (payload is! Map<String, dynamic>) {
      throw const _OutboxFailure(storageOutboxFailure);
    }
    final canonical = FormativeEvent(
      id: 'receipt-check',
      kind: FormativeEventKind.solo,
      payload: payload,
    ).payload;
    if (jsonEncode(canonical) != jsonEncode(expected)) {
      throw const _OutboxFailure(
        AppFailure(
          code: FailureCode.conflict,
          message: 'This attempt already has a different completed result.',
        ),
      );
    }
    return DurableRecordReceipt(
      actor: actor,
      recordId: row['attempt_id']! as String,
      persistedAt: DateTime.fromMillisecondsSinceEpoch(
        row['persisted_at_ms']! as int,
        isUtc: true,
      ),
      state: FormativeSaveState.pending,
    );
  }

  Future<Result<OutboxSnapshot>> read(ActorBinding actor) async {
    if (actor.isGuest && sessions.isCurrent(actor)) {
      return Success(OutboxSnapshot(0, const []));
    }
    try {
      _check(actor);
      final count = await database.query(
        'SELECT COUNT(*) AS n FROM ${FormativeSchema.outbox} WHERE partition = ?',
        [actor.partition],
      );
      _check(actor);
      final rows = await database.query(
        'SELECT * FROM ${FormativeSchema.outbox} WHERE partition = ? '
        'ORDER BY created_at_ms, event_id LIMIT ?',
        [actor.partition, FormativeSchema.maxBatchSize],
      );
      _check(actor);
      final pending = count.single['n']! as int;
      if (pending > FormativeSchema.maxPendingPerOwner) {
        return const Failed(storageOutboxFailure);
      }
      return Success(
        OutboxSnapshot(
          pending < rows.length ? rows.length : pending,
          rows.map((r) => _decode(r, actor)),
        ),
      );
    } on _OutboxFailure catch (error) {
      return Failed(error.failure);
    } catch (_) {
      return const Failed(storageOutboxFailure);
    }
  }

  /// The body predicate protects the sent snapshot as well as its owner and ID.
  Future<Result<void>> acknowledge({
    required ActorBinding actor,
    required List<QueuedFormativeEvent> batch,
    required List<String> accepted,
    List<ModuleReflection> reflections = const [],
    bool Function()? active,
  }) async {
    final byId = {for (final row in batch) row.event.id: row};
    if (batch.length > FormativeSchema.maxBatchSize ||
        byId.length != batch.length ||
        accepted.toSet().length != accepted.length ||
        accepted.any((id) => !byId.containsKey(id))) {
      return const Failed(invalidAcknowledgementFailure);
    }
    try {
      _check(actor, active);
      if (accepted.isEmpty) return const Success(null);
      await database.transaction((tx) async {
        _check(actor, active);
        for (final id in accepted) {
          final expected = byId[id]!;
          final rows = await tx.query(
            'SELECT * FROM ${FormativeSchema.outbox} WHERE partition = ? AND event_id = ?',
            [actor.partition, id],
          );
          _check(actor, active);
          if (rows.isEmpty) {
            continue; // Another valid flight already acknowledged it.
          }
          final actual = _decode(rows.single, actor);
          if (jsonEncode(actual.event.toWireJson()) !=
              jsonEncode(expected.event.toWireJson())) {
            throw const _OutboxFailure(storageOutboxFailure);
          }
          await tx.rawDelete(
            'DELETE FROM ${FormativeSchema.outbox} WHERE partition = ? AND owner_id = ? '
            'AND event_id = ? AND kind = ? AND content_version = ? AND payload = ?',
            [
              actor.partition,
              actor.userId,
              id,
              expected.event.kind.name,
              expected.event.contentVersion,
              actual.encodedPayload,
            ],
          );
          _check(actor, active);
        }
        for (final remote in reflections) {
          final rows = await tx.query(
            'SELECT payload FROM ${FormativeSchema.reflections} WHERE partition = ? AND activity = ?',
            [actor.partition, remote.activity.name],
          );
          _check(actor, active);
          ModuleReflection merged = remote;
          if (rows.isNotEmpty) {
            final payload = jsonDecode(rows.single['payload']! as String);
            if (payload is! Map<String, dynamic>) {
              throw const _OutboxFailure(storageOutboxFailure);
            }
            final previous = ModuleReflection.fromJson(payload).valueOrNull;
            if (previous == null) {
              throw const _OutboxFailure(storageOutboxFailure);
            }
            // Unsynced local content wins ties; completed/higher stages survive.
            merged = remote.merge(previous);
          }
          await tx.rawInsert(
            'INSERT OR REPLACE INTO ${FormativeSchema.reflections} '
            '(partition, activity, payload, updated_at_ms) VALUES (?, ?, ?, ?)',
            [
              actor.partition,
              merged.activity.name,
              jsonEncode(merged.toJson()),
              clock.now().millisecondsSinceEpoch,
            ],
          );
          _check(actor, active);
        }
      });
      _check(actor, active);
      return const Success(null);
    } on _OutboxFailure catch (error) {
      return Failed(error.failure);
    } catch (_) {
      return const Failed(storageOutboxFailure);
    }
  }

  static QueuedFormativeEvent _decode(
    Map<String, Object?> row,
    ActorBinding actor,
  ) {
    if (row['partition'] != actor.partition ||
        row['owner_id'] != actor.userId ||
        row['content_version'] != FormativeSchema.contentVersion ||
        row['payload'] is! String ||
        row['event_id'] is! String ||
        row['created_at_ms'] is! int) {
      throw const _OutboxFailure(storageOutboxFailure);
    }
    final raw = jsonDecode(row['payload']! as String);
    if (raw is! Map<String, dynamic>) {
      throw const _OutboxFailure(storageOutboxFailure);
    }
    final kind = switch (row['kind']) {
      'module' => FormativeEventKind.module,
      'solo' => FormativeEventKind.solo,
      _ => throw const _OutboxFailure(storageOutboxFailure),
    };
    final event = FormativeEvent(
      id: row['event_id']! as String,
      kind: kind,
      payload: raw,
    );
    return QueuedFormativeEvent(
      event,
      row['payload']! as String,
      DateTime.fromMillisecondsSinceEpoch(
        row['created_at_ms']! as int,
        isUtc: true,
      ),
    );
  }
}

const staleOutboxFailure = AppFailure(
  code: FailureCode.stale,
  message: 'This record belongs to a previous session or scope.',
);
const storageOutboxFailure = AppFailure(
  code: FailureCode.storage,
  message: 'Pending records could not be read or saved on this device.',
);
const invalidAcknowledgementFailure = AppFailure(
  code: FailureCode.network,
  message: 'Delivery was not acknowledged. Records remain pending.',
);
const _soloAlreadyFinalized = AppFailure(
  code: FailureCode.conflict,
  message: 'The original durable attempt receipt already exists.',
);

final class _OutboxFailure implements Exception {
  const _OutboxFailure(this.failure);
  final AppFailure failure;
}
