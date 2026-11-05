import 'dart:async';
import 'dart:convert';

import '../result.dart';
import '../runtime/clock.dart';
import '../runtime/random_source.dart';
import '../session/actor_binding.dart';
import '../session/auth_session.dart';
import '../storage/app_database.dart';
import '../storage/formative_schema.dart';
import 'formative_record.dart';
import 'formative_records.dart';

/// The shared local record owner. Guest saves never create upload events.
/// Signed-in saves need a queue adapter, supplied later by the cloud feature.
final class LocalFormativeRecords
    implements FormativeRecordWriter, FormativeRecordReader {
  LocalFormativeRecords({
    required this._database,
    required this._sessions,
    this._clock = const SystemClock(),
    RandomSource? random,
    this._outbox,
  }) : _random = random ?? SecureRandomSource();

  final AppDatabase _database;
  final AuthSession _sessions;
  final Clock _clock;
  final RandomSource _random;
  final FormativeOutboxAppender? _outbox;

  @override
  Future<Result<DurableRecordReceipt>> saveReflection({
    required ActorBinding actor,
    required ModuleReflection reflection,
  }) async {
    try {
      _ensureWritable(actor);
      await _database.transaction((transaction) async {
        _ensureCurrent(actor);
        final rows = await transaction.query(
          'SELECT payload FROM ${FormativeSchema.reflections} WHERE partition = ? AND activity = ?',
          [actor.partition, reflection.activity.name],
        );
        _ensureCurrent(actor);
        final previous = rows.isEmpty
            ? null
            : _decodeReflection(rows.single['payload']);
        final merged = previous?.merge(reflection) ?? reflection;
        if (previous == merged) return;
        await transaction.rawInsert(
          'INSERT OR REPLACE INTO ${FormativeSchema.reflections} '
          '(partition, activity, payload, updated_at_ms) VALUES (?, ?, ?, ?)',
          [
            actor.partition,
            merged.activity.name,
            jsonEncode(merged.toJson()),
            _clock.now().millisecondsSinceEpoch,
          ],
        );
        _ensureCurrent(actor);
        await _append(
          transaction,
          actor,
          FormativeEvent(
            id: 'module:${randomIdentifier(_random)}',
            kind: FormativeEventKind.module,
            payload: merged.toJson(),
          ),
        );
        _ensureCurrent(actor);
      });
      _ensureCurrent(actor);
      return Success(_receipt(actor, reflection.activity.name));
    } on _RecordFailure catch (error) {
      return Failed(error.failure);
    } catch (_) {
      return const Failed(_storageFailure);
    }
  }

  @override
  Future<Result<DurableRecordReceipt>> saveCompletedSolo({
    required ActorBinding actor,
    required CompletedSoloRecord record,
  }) async {
    try {
      _ensureWritable(actor);
      await _database.transaction((transaction) async {
        _ensureCurrent(actor);
        final rows = await transaction.query(
          'SELECT payload FROM ${FormativeSchema.completedSolo} WHERE partition = ? AND attempt_id = ?',
          [actor.partition, record.attemptId],
        );
        _ensureCurrent(actor);
        if (rows.isNotEmpty) {
          if (_decodeSolo(rows.single['payload']) != record) {
            throw const _RecordFailure(
              AppFailure(
                code: FailureCode.conflict,
                message:
                    'This attempt already has a different completed result.',
              ),
            );
          }
          return;
        }
        await transaction.rawInsert(
          'INSERT INTO ${FormativeSchema.completedSolo} '
          '(partition, attempt_id, mode, payload, created_at_ms) VALUES (?, ?, ?, ?, ?)',
          [
            actor.partition,
            record.attemptId,
            record.mode.name,
            jsonEncode(record.toJson()),
            _clock.now().millisecondsSinceEpoch,
          ],
        );
        _ensureCurrent(actor);
        await _append(
          transaction,
          actor,
          FormativeEvent(
            id: 'solo:${randomIdentifier(_random)}',
            kind: FormativeEventKind.solo,
            payload: record.toJson(),
          ),
        );
        _ensureCurrent(actor);
        if (record.mode == SoloMode.quiz) {
          await transaction.rawDelete(
            'DELETE FROM ${FormativeSchema.completedSolo} WHERE partition = ? AND mode = ? '
            'AND attempt_id IN (SELECT attempt_id FROM ${FormativeSchema.completedSolo} '
            'WHERE partition = ? AND mode = ? ORDER BY created_at_ms DESC, attempt_id DESC LIMIT -1 OFFSET ?)',
            [
              actor.partition,
              SoloMode.quiz.name,
              actor.partition,
              SoloMode.quiz.name,
              FormativeSchema.maxLocalQuizScores,
            ],
          );
          _ensureCurrent(actor);
        }
      });
      _ensureCurrent(actor);
      return Success(_receipt(actor, record.attemptId));
    } on _RecordFailure catch (error) {
      return Failed(error.failure);
    } catch (_) {
      return const Failed(_storageFailure);
    }
  }

  Future<void> _append(
    AppTransaction transaction,
    ActorBinding actor,
    FormativeEvent event,
  ) async {
    if (actor.isGuest) return;
    final appended = await _outbox!.append(
      transaction: transaction,
      actor: actor,
      event: event,
    );
    if (appended case Failed<void>(:final failure)) {
      throw _RecordFailure(failure);
    }
  }

  DurableRecordReceipt _receipt(ActorBinding actor, String recordId) =>
      DurableRecordReceipt(
        actor: actor,
        recordId: recordId,
        persistedAt: _clock.now(),
        state: actor.isGuest
            ? FormativeSaveState.local
            : FormativeSaveState.pending,
      );

  void _ensureWritable(ActorBinding actor) {
    _ensureCurrent(actor);
    if (!actor.isGuest && _outbox == null) {
      throw const _RecordFailure(
        AppFailure(
          code: FailureCode.unavailable,
          message: 'Signed-in formative queue is not installed.',
        ),
      );
    }
  }

  void _ensureCurrent(ActorBinding actor) {
    if (!_sessions.isCurrent(actor)) throw const _RecordFailure(_staleFailure);
  }

  @override
  Stream<Result<List<ModuleReflection>>> watchReflections(
    ActorBinding actor,
  ) async* {
    final changes = StreamController<bool>();
    final databaseSubscription = _database.changes.listen(
      (_) => changes.add(false),
      onError: (Object _, StackTrace _) => changes.add(true),
    );
    final sessionSubscription = _sessions.bindings.listen(
      (_) => changes.add(false),
      onDone: () => changes.add(false),
    );
    changes.add(false);
    try {
      await for (final readFailed in changes.stream) {
        if (!_sessions.isCurrent(actor)) {
          yield const Failed(_staleFailure);
          return;
        }
        if (readFailed) {
          yield const Failed(_storageFailure);
          continue;
        }
        try {
          final rows = await _database.query(
            'SELECT activity, payload FROM ${FormativeSchema.reflections} WHERE partition = ?',
            [actor.partition],
          );
          _ensureCurrent(actor);
          final values =
              rows.map((row) {
                  final value = _decodeReflection(row['payload']);
                  if (value.activity.name != row['activity']) {
                    throw const _RecordFailure(_storageFailure);
                  }
                  return value;
                }).toList()
                ..sort((a, b) => a.activity.index.compareTo(b.activity.index));
          yield Success(List.unmodifiable(values));
        } on _RecordFailure catch (error) {
          yield Failed(error.failure);
          if (error.failure.code == FailureCode.stale) return;
        } catch (_) {
          yield const Failed(_storageFailure);
        }
      }
    } finally {
      await databaseSubscription.cancel();
      await sessionSubscription.cancel();
      await changes.close();
    }
  }

  @override
  Future<Result<List<CompletedSoloRecord>>> readCompletedSolo(
    ActorBinding actor,
  ) async {
    try {
      _ensureCurrent(actor);
      final rows = await _database.query(
        'SELECT attempt_id, mode, payload FROM ${FormativeSchema.completedSolo} '
        'WHERE partition = ? ORDER BY created_at_ms DESC, attempt_id DESC',
        [actor.partition],
      );
      _ensureCurrent(actor);
      final values = rows.map((row) {
        final value = _decodeSolo(row['payload']);
        if (value.attemptId != row['attempt_id'] ||
            value.mode.name != row['mode']) {
          throw const _RecordFailure(_storageFailure);
        }
        return value;
      }).toList();
      return Success(List.unmodifiable(values));
    } on _RecordFailure catch (error) {
      return Failed(error.failure);
    } catch (_) {
      return const Failed(_storageFailure);
    }
  }

  static ModuleReflection _decodeReflection(Object? value) {
    final result = ModuleReflection.fromJson(_decodeObject(value));
    return switch (result) {
      Success<ModuleReflection>(:final value) => value,
      Failed<ModuleReflection>() => throw const _RecordFailure(_storageFailure),
    };
  }

  static CompletedSoloRecord _decodeSolo(Object? value) {
    final result = CompletedSoloRecord.fromJson(_decodeObject(value));
    return switch (result) {
      Success<CompletedSoloRecord>(:final value) => value,
      Failed<CompletedSoloRecord>() => throw const _RecordFailure(
        _storageFailure,
      ),
    };
  }

  static Map<String, Object?> _decodeObject(Object? value) {
    if (value is! String) throw const _RecordFailure(_storageFailure);
    final decoded = jsonDecode(value);
    if (decoded is! Map<String, dynamic>) {
      throw const _RecordFailure(_storageFailure);
    }
    return decoded;
  }

  static const _staleFailure = AppFailure(
    code: FailureCode.stale,
    message: 'This operation belongs to a previous session or scope.',
  );
  static const _storageFailure = AppFailure(
    code: FailureCode.storage,
    message: 'Formative records could not be read or durably saved.',
  );
}

final class _RecordFailure implements Exception {
  const _RecordFailure(this.failure);

  final AppFailure failure;
}
