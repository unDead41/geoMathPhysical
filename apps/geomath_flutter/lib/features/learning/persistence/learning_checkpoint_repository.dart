import 'dart:convert';

import '../../../core/result.dart';
import '../../../core/runtime/clock.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';
import '../../../core/storage/app_database.dart';
import '../../../core/storage/migration.dart';
import 'learning_checkpoint_schema.dart';

export 'learning_checkpoint_schema.dart' show LearningCheckpointSchema;

/// A validated, actor-scoped local draft that can be resumed from Home.
final class LearningResumeCheckpoint {
  const LearningResumeCheckpoint({
    required this.slot,
    required this.payload,
    required this.updatedAt,
  });

  final String slot;
  final Map<String, Object?> payload;
  final DateTime updatedAt;

  String get section => payload['section']! as String;
  String get shapeId {
    final specialized = switch (section) {
      'calculation' => (payload['calculation'] as Map?)?['draft'],
      'projection' => (payload['projection'] as Map?)?['state'],
      'notes' || 'calculator' => payload['notes'],
      _ => null,
    };
    final shape = specialized is Map ? specialized['shape'] : null;
    return shape is String && LearningCheckpointSchema.models.contains(shape)
        ? shape
        : (payload['explore']! as Map)['shape']! as String;
  }

  String? get mode {
    final parts = slot.split(':');
    return parts.length == 3 &&
            parts.first == section &&
            parts.last != 'default'
        ? parts.last
        : null;
  }
}

/// Local editing checkpoints, intentionally separate from formative records.
/// The native binding determines partition/scope; none is accepted from JSON.
final class LearningCheckpointRepository {
  LearningCheckpointRepository({
    required this.database,
    required this.sessions,
    this.clock = const SystemClock(),
  });

  final AppDatabase database;
  final AuthSession sessions;
  final Clock clock;

  static const table = 'learning_checkpoints';
  static const maximumBytes = LearningCheckpointSchema.maximumBytes;
  static final _slot = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$');
  static final migration = MigrationContribution(
    namespace: 'learning_checkpoints',
    version: 1,
    description: 'Actor-partitioned local canonical learning checkpoints',
    migrate: (transaction) => transaction.execute('''
      CREATE TABLE $table (
        partition TEXT NOT NULL,
        scope TEXT NOT NULL,
        slot TEXT NOT NULL,
        schema_version INTEGER NOT NULL CHECK(schema_version = 1),
        source_commit TEXT NOT NULL,
        module_version TEXT NOT NULL,
        payload TEXT NOT NULL CHECK(length(CAST(payload AS BLOB)) <= $maximumBytes),
        updated_at_ms INTEGER NOT NULL,
        PRIMARY KEY(partition, scope, slot)
      )
    '''),
  );

  /// Reads without emitting database changes or promoting a draft to a record.
  /// A corrupt newest draft remains visible as a recovery failure, never zero
  /// progress or an older draft silently presented as the latest one.
  Future<Result<LearningResumeCheckpoint?>> readLatest(
    ActorBinding actor,
  ) async {
    try {
      _ensureCurrent(actor);
      final rows = await database.query(
        'SELECT slot, schema_version, source_commit, module_version, payload, updated_at_ms '
        'FROM $table WHERE partition = ? AND scope = ? '
        'ORDER BY updated_at_ms DESC, slot ASC LIMIT 1',
        [actor.partition, actor.scope],
      );
      _ensureCurrent(actor);
      if (rows.isEmpty) return const Success(null);
      final row = rows.single;
      final slot = row['slot'];
      final timestamp = row['updated_at_ms'];
      if (slot is! String ||
          !_slot.hasMatch(slot) ||
          timestamp is! int ||
          timestamp < 0) {
        return const Failed(_invalidFailure);
      }
      final payload = _decodeRow(row);
      return Success(
        LearningResumeCheckpoint(
          slot: slot,
          payload: payload,
          updatedAt: DateTime.fromMillisecondsSinceEpoch(
            timestamp,
            isUtc: true,
          ),
        ),
      );
    } on _CheckpointFailure catch (error) {
      return Failed(error.failure);
    } on FormatException {
      return const Failed(_invalidFailure);
    } catch (_) {
      return const Failed(_storageFailure);
    }
  }

  static Map<String, Object?> _decodeRow(Map<String, Object?> row) {
    if (row['schema_version'] != LearningCheckpointSchema.version ||
        row['source_commit'] != LearningCheckpointSchema.sourceCommit ||
        row['module_version'] != LearningCheckpointSchema.moduleVersion) {
      throw const _CheckpointFailure(_incompatibleFailure);
    }
    final encoded = row['payload'];
    if (encoded is! String ||
        !LearningCheckpointSchema.permitsEncoded(encoded)) {
      throw const _CheckpointFailure(_invalidFailure);
    }
    final decoded = jsonDecode(encoded);
    if (decoded is! Map<String, Object?> ||
        !LearningCheckpointSchema.isValid(decoded)) {
      throw const _CheckpointFailure(_invalidFailure);
    }
    return Map<String, Object?>.unmodifiable(decoded);
  }

  Future<Result<Map<String, Object?>?>> read(
    ActorBinding actor,
    String slot,
  ) async {
    try {
      _ensureCurrent(actor);
      _ensureSlot(slot);
      final value = await database.transaction((transaction) async {
        _ensureCurrent(actor);
        final rows = await transaction.query(
          'SELECT schema_version, source_commit, module_version, payload '
          'FROM $table WHERE partition = ? AND scope = ? AND slot = ?',
          [actor.partition, actor.scope, slot],
        );
        _ensureCurrent(actor);
        if (rows.isEmpty) {
          return null;
        }
        if (rows.length != 1) {
          throw const _CheckpointFailure(_storageFailure);
        }
        final decoded = _decodeRow(rows.single);
        _ensureCurrent(actor);
        return decoded;
      });
      _ensureCurrent(actor);
      return Success(value);
    } on _CheckpointFailure catch (error) {
      return Failed(error.failure);
    } on FormatException {
      return const Failed(_invalidFailure);
    } catch (_) {
      return const Failed(_storageFailure);
    }
  }

  Future<Result<void>> save(
    ActorBinding actor,
    String slot,
    Map<String, Object?> payload,
  ) async {
    try {
      _ensureCurrent(actor);
      _ensureSlot(slot);
      // Validate and serialize synchronously, before the first yield. Later
      // caller edits cannot change what this transaction intends to save.
      if (!LearningCheckpointSchema.isValid(payload)) {
        throw const _CheckpointFailure(_invalidFailure);
      }
      final encoded = jsonEncode(payload);
      final timestamp = clock.now().toUtc().millisecondsSinceEpoch;
      await database.transaction((transaction) async {
        _ensureCurrent(actor);
        await transaction.rawInsert(
          'INSERT OR REPLACE INTO $table '
          '(partition, scope, slot, schema_version, source_commit, module_version, '
          'payload, updated_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            actor.partition,
            actor.scope,
            slot,
            LearningCheckpointSchema.version,
            LearningCheckpointSchema.sourceCommit,
            LearningCheckpointSchema.moduleVersion,
            encoded,
            timestamp,
          ],
        );
        // Throwing here rolls back the insert if identity changed while SQLite
        // was running. A successful future still gets the post-commit guard.
        _ensureCurrent(actor);
      });
      _ensureCurrent(actor);
      return const Success(null);
    } on _CheckpointFailure catch (error) {
      return Failed(error.failure);
    } catch (_) {
      return const Failed(_storageFailure);
    }
  }

  void _ensureCurrent(ActorBinding actor) {
    if (!sessions.isCurrent(actor)) {
      throw const _CheckpointFailure(_staleFailure);
    }
  }

  static void _ensureSlot(String slot) {
    if (!_slot.hasMatch(slot)) {
      throw const _CheckpointFailure(_invalidFailure);
    }
  }

  static const _storageFailure = AppFailure(
    code: FailureCode.storage,
    message:
        'This activity draft could not be read or durably saved. Please retry.',
  );
  static const _staleFailure = AppFailure(
    code: FailureCode.stale,
    message: 'This activity draft belongs to a previous session or scope.',
  );
  static const _incompatibleFailure = AppFailure(
    code: FailureCode.stale,
    message: 'This activity draft uses another content version and cannot be restored.',
  );
  static const _invalidFailure = AppFailure(
    code: FailureCode.invalid,
    message:
        'This activity draft is invalid or too large and cannot be restored.',
  );
}

final class _CheckpointFailure implements Exception {
  const _CheckpointFailure(this.failure);
  final AppFailure failure;
}
