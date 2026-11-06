import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/runtime/clock.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/core/storage/app_database.dart';
import 'package:geomath_flutter/core/storage/sqlite_app_database.dart';
import 'package:geomath_flutter/features/learning/persistence/learning_checkpoint_repository.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'checkpoint_fixture.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();
  test(
    'resume labels follow the active workshop rather than the explore model',
    () {
      final calculation = learningCheckpointFixture();
      ((calculation['calculation'] as Map)['draft'] as Map)['shape'] = 'cone';
      expect(LearningCheckpointSchema.isValid(calculation), isTrue);
      final resume = LearningResumeCheckpoint(
        slot: 'calculation:cube:default',
        payload: calculation,
        updatedAt: DateTime.utc(2026),
      );
      expect(resume.shapeId, 'cone');
      final projection = learningCheckpointFixture()
        ..['section'] = 'projection';
      final state = (projection['projection'] as Map)['state'] as Map;
      state['shape'] = 'cuboid';
      state['dimensions'] = {'p': 4, 'l': 3, 't': 2};
      expect(LearningCheckpointSchema.isValid(projection), isTrue);
      expect(
        LearningResumeCheckpoint(
          slot: 'projection:cube:default',
          payload: projection,
          updatedAt: DateTime.utc(2026),
        ).shapeId,
        'cuboid',
      );
    },
  );
  late Directory directory;
  late SqliteAppDatabase database;
  late SessionController sessions;
  late LearningCheckpointRepository repository;

  Future<SqliteAppDatabase> open() async {
    final result = await SqliteAppDatabase.open(
      path: '${directory.path}/learning.sqlite',
      factory: databaseFactoryFfi,
      migrations: [LearningCheckpointRepository.migration],
    );
    expect(result.isSuccess, isTrue, reason: result.failureOrNull?.message);
    return result.valueOrNull!;
  }

  setUp(() async {
    directory = await Directory.systemTemp.createTemp('geomath-checkpoint-');
    database = await open();
    sessions = SessionController.guest(
      guestId: 'stable-guest',
      sessionId: 'first',
    );
    repository = LearningCheckpointRepository(
      database: database,
      sessions: sessions,
      clock: _Clock(),
    );
  });
  tearDown(() async {
    await database.close();
    await sessions.dispose();
    await directory.delete(recursive: true);
  });

  test(
    'latest resume reads the newest valid draft in the current owner and scope',
    () async {
      final actor = sessions.current;
      expect((await repository.readLatest(actor)).valueOrNull, isNull);
      final first = learningCheckpointFixture()..['section'] = 'explore';
      final second = learningCheckpointFixture();
      expect(
        (await repository.save(actor, 'explore:cube:default', first)).isSuccess,
        isTrue,
      );
      expect(
        (await repository.save(
          actor,
          'calculation:cube:default',
          second,
        )).isSuccess,
        isTrue,
      );
      await database.transaction(
        (tx) => tx.rawUpdate(
          'UPDATE learning_checkpoints SET updated_at_ms = updated_at_ms + 1000 WHERE slot = ?',
          ['calculation:cube:default'],
        ),
      );
      final latest = (await repository.readLatest(actor)).valueOrNull!;
      expect(latest.section, 'calculation');
      expect(latest.shapeId, 'cube');
      expect(latest.payload, second);
      expect(latest.mode, isNull);
      sessions.changeScope('another');
      expect(
        (await repository.readLatest(sessions.current)).valueOrNull,
        isNull,
      );
      expect(
        (await repository.readLatest(actor)).failureOrNull?.code,
        FailureCode.stale,
      );
      sessions.bindUser(userId: 'owner-A', sessionId: 'a');
      expect(
        (await repository.readLatest(sessions.current)).valueOrNull,
        isNull,
      );
    },
  );

  test(
    'latest resume reports corrupt data without replacing the saved draft',
    () async {
      final actor = sessions.current;
      await repository.save(
        actor,
        'calculation:cube:default',
        learningCheckpointFixture(),
      );
      await database.transaction(
        (tx) => tx.rawUpdate(
          'UPDATE learning_checkpoints SET payload = ? WHERE slot = ?',
          ['{broken', 'calculation:cube:default'],
        ),
      );
      expect(
        (await repository.readLatest(actor)).failureOrNull?.code,
        FailureCode.invalid,
      );
      final rows = await database.query(
        'SELECT payload FROM learning_checkpoints',
      );
      expect(rows.single['payload'], '{broken');
    },
  );

  test('real SQLite checkpoint, raw draft and Undo survive reopen with a fresh session', () async {
    final previous = sessions.current;
    final payload = learningCheckpointFixture();
    final saving = repository.save(previous, 'module', payload);
    ((payload['calculation'] as Map)['draft'] as Map)['piMode'] = 'full';
    expect((await saving).isSuccess, isTrue);
    final rows = await database.query(
      'SELECT * FROM ${LearningCheckpointRepository.table}',
    );
    expect(rows.single['partition'], previous.partition);
    expect(rows.single['updated_at_ms'], _Clock.time.millisecondsSinceEpoch);
    expect(rows.single.keys, isNot(contains('sessionId')));
    await database.close();
    await sessions.dispose();
    database = await open();
    sessions = SessionController.guest(
      guestId: 'stable-guest',
      sessionId: 'reopen',
    );
    repository = LearningCheckpointRepository(
      database: database,
      sessions: sessions,
    );
    final restored = await repository.read(sessions.current, 'module');
    expect(restored.valueOrNull, learningCheckpointFixture());
    expect(
      (await repository.read(previous, 'module')).failureOrNull?.code,
      FailureCode.stale,
    );
    final tables = await database.query(
      "SELECT name FROM sqlite_master WHERE type='table'",
    );
    expect(
      tables
          .where((r) => r['name'].toString().startsWith('learning_'))
          .map((r) => r['name']),
      [LearningCheckpointRepository.table],
    );
  });

  test('guest, A, B and scope checkpoints remain independent without migration duplication', () async {
    final guest = sessions.current;
    expect(
      (await repository.save(
        guest,
        'module',
        learningCheckpointFixture(),
      )).isSuccess,
      isTrue,
    );
    sessions.bindUser(userId: 'owner-A', sessionId: 'a');
    final actorA = sessions.current;
    expect((await repository.read(actorA, 'module')).valueOrNull, isNull);
    final a = learningCheckpointFixture()..['section'] = 'projection';
    expect((await repository.save(actorA, 'module', a)).isSuccess, isTrue);
    sessions.bindUser(userId: 'owner-B', sessionId: 'b');
    expect(
      (await repository.read(sessions.current, 'module')).valueOrNull,
      isNull,
    );
    expect(
      (await repository.save(actorA, 'module', a)).failureOrNull?.code,
      FailureCode.stale,
    );
    sessions.bindUser(userId: 'owner-A', sessionId: 'a-new');
    expect((await repository.read(sessions.current, 'module')).valueOrNull, a);
    sessions.changeScope('another-room');
    expect(
      (await repository.read(sessions.current, 'module')).valueOrNull,
      isNull,
    );
    sessions.logout();
    expect(
      (await repository.read(sessions.current, 'module')).valueOrNull,
      learningCheckpointFixture(),
    );
    final migrations = await database.query(
      'SELECT * FROM foundation_migrations WHERE namespace = ?',
      ['learning_checkpoints'],
    );
    expect(migrations.length, 1);
  });

  test('a failure after INSERT rolls back replacement and keeps the previous draft on disk', () async {
    final actor = sessions.current;
    final original = learningCheckpointFixture();
    await repository.save(actor, 'module', original);
    final fault = _DatabaseHook(
      database,
      afterInsert: () => throw StateError('disk full'),
    );
    final failing = LearningCheckpointRepository(
      database: fault,
      sessions: sessions,
    );
    final next = learningCheckpointFixture()..['section'] = 'projection';
    expect(
      (await failing.save(actor, 'module', next)).failureOrNull?.code,
      FailureCode.storage,
    );
    await database.close();
    database = await open();
    repository = LearningCheckpointRepository(
      database: database,
      sessions: sessions,
    );
    expect((await repository.read(actor, 'module')).valueOrNull, original);
  });

  test(
    'actor change while SQLite inserts rolls back and has no durable success',
    () async {
      final old = sessions.current;
      final hook = _DatabaseHook(
        database,
        afterInsert: () {
          sessions.bindUser(userId: 'owner-B', sessionId: 'b');
        },
      );
      final guarded = LearningCheckpointRepository(
        database: hook,
        sessions: sessions,
      );
      expect(
        (await guarded.save(
          old,
          'module',
          learningCheckpointFixture(),
        )).failureOrNull?.code,
        FailureCode.stale,
      );
      expect(
        await database.query(
          'SELECT * FROM ${LearningCheckpointRepository.table}',
        ),
        isEmpty,
      );
    },
  );

  test('late read is discarded after an actor change', () async {
    final old = sessions.current;
    await repository.save(old, 'module', learningCheckpointFixture());
    final hook = _DatabaseHook(
      database,
      afterQuery: () {
        sessions.bindUser(userId: 'owner-B', sessionId: 'b');
      },
    );
    final guarded = LearningCheckpointRepository(
      database: hook,
      sessions: sessions,
    );
    final result = await guarded.read(old, 'module');
    expect(result.failureOrNull?.code, FailureCode.stale);
    expect(result.valueOrNull, isNull);
  });

  test('corrupt and incompatible persisted payloads fail explicitly and are preserved', () async {
    final actor = sessions.current;
    await repository.save(actor, 'module', learningCheckpointFixture());
    await database.transaction(
      (tx) => tx.rawUpdate(
        'UPDATE ${LearningCheckpointRepository.table} SET payload = ?',
        ['{"broken":true}'],
      ),
    );
    expect(
      (await repository.read(actor, 'module')).failureOrNull?.code,
      FailureCode.invalid,
    );
    await database.transaction(
      (tx) => tx.rawUpdate(
        'UPDATE ${LearningCheckpointRepository.table} SET source_commit = ?',
        ['old-source'],
      ),
    );
    expect(
      (await repository.read(actor, 'module')).failureOrNull?.code,
      FailureCode.stale,
    );
    expect(
      (await database.query(
        'SELECT * FROM ${LearningCheckpointRepository.table}',
      )).length,
      1,
    );
  });

  test(
    'closed storage yields EX11 failure, never a success or silent eviction',
    () async {
      await database.close();
      expect(
        (await repository.save(
          sessions.current,
          'module',
          learningCheckpointFixture(),
        )).failureOrNull?.code,
        FailureCode.storage,
      );
      expect(
        (await repository.read(sessions.current, 'module')).failureOrNull?.code,
        FailureCode.storage,
      );
    },
  );

  test('bounded schema rejects invalid coordinates, history, credentials and stale content before SQL', () async {
    final malformed = <Map<String, Object?>>[
      learningCheckpointFixture()..['sourceCommit'] = 'old-source',
      learningCheckpointFixture()..['moduleVersion'] = '0.0.0',
      learningCheckpointFixture()..['owner'] = 'owner-A',
      learningCheckpointFixture()..['schemaVersion'] = 2,
    ];
    final nonfinite = learningCheckpointFixture();
    ((nonfinite['projection'] as Map)['state'] as Map)['cursor'] = [
      double.nan,
      1,
    ];
    malformed.add(nonfinite);
    final badLine = learningCheckpointFixture();
    final line =
        ((((badLine['projection'] as Map)['state'] as Map)['drawings']
                        as Map)['front']
                    as List)
                .first
            as Map;
    line['b'] = [1, 1];
    malformed.add(badLine);
    final history = learningCheckpointFixture();
    (((history['projection'] as Map)['state'] as Map)['history']
        as Map)['front'] = List.generate(
      31,
      (_) => [],
    );
    malformed.add(history);
    final tooLong = learningCheckpointFixture();
    (((tooLong['calculation'] as Map)['draft'] as Map)['answers']
            as Map)['formula'] =
        '1' * 481;
    malformed.add(tooLong);
    for (final payload in malformed) {
      expect(
        (await repository.save(
          sessions.current,
          'module',
          payload,
        )).failureOrNull?.code,
        FailureCode.invalid,
      );
    }
    expect(
      (await repository.save(
        sessions.current,
        '../bad-slot',
        learningCheckpointFixture(),
      )).failureOrNull?.code,
      FailureCode.invalid,
    );
    expect(
      await database.query(
        'SELECT * FROM ${LearningCheckpointRepository.table}',
      ),
      isEmpty,
    );
  });

  test('complete bounded projection Undo is retained, not silently trimmed to a message envelope', () async {
    final payload = learningCheckpointFixture();
    final state = (payload['projection'] as Map)['state'] as Map;
    for (final view in ['front', 'side', 'plan']) {
      (state['history'] as Map)[view] = List.generate(
        30,
        (_) => List.generate(
          200,
          (_) => {
            'kind': 'line',
            'a': [1, 1],
            'b': [3, 1],
            'type': 'visible',
          },
        ),
      );
    }
    final bytes = utf8.encode(jsonEncode(payload)).length;
    expect(bytes, greaterThan(65536));
    expect(bytes, lessThanOrEqualTo(LearningCheckpointRepository.maximumBytes));
    expect(
      (await repository.save(sessions.current, 'module', payload)).isSuccess,
      isTrue,
    );
    expect(
      (await repository.read(sessions.current, 'module')).valueOrNull,
      payload,
    );
  });

  test('an oversized valid-shaped draft is rejected without replacing the last durable draft', () async {
    final actor = sessions.current;
    final original = learningCheckpointFixture();
    await repository.save(actor, 'module', original);
    final payload = learningCheckpointFixture();
    final state = (payload['projection'] as Map)['state'] as Map;
    for (final view in ['front', 'side', 'plan']) {
      (state['history'] as Map)[view] = List.generate(
        30,
        (_) => List.generate(
          200,
          (_) => {
            'kind': 'line',
            'a': [11.123456789012345, 12.123456789012345],
            'b': [31.123456789012345, 14.123456789012345],
            'type': 'visible',
          },
        ),
      );
    }
    expect(
      utf8.encode(jsonEncode(payload)).length,
      greaterThan(LearningCheckpointRepository.maximumBytes),
    );
    expect(
      (await repository.save(actor, 'module', payload)).failureOrNull?.code,
      FailureCode.invalid,
    );
    expect((await repository.read(actor, 'module')).valueOrNull, original);
  });
}

class _Clock implements Clock {
  static final time = DateTime.utc(2026, 11, 5, 12);
  @override
  DateTime now() => time;
  @override
  int monotonicMilliseconds() => 0;
}

class _DatabaseHook implements AppDatabase {
  _DatabaseHook(this.database, {this.afterInsert, this.afterQuery});
  final AppDatabase database;
  final FutureOr<void> Function()? afterInsert;
  final FutureOr<void> Function()? afterQuery;
  @override
  Stream<void> get changes => database.changes;
  @override
  Future<void> close() => database.close();
  @override
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> arguments = const [],
  ]) => database.query(sql, arguments);
  @override
  Future<T> transaction<T>(Future<T> Function(AppTransaction) action) =>
      database.transaction((tx) => action(_TransactionHook(tx, this)));
}

class _TransactionHook implements AppTransaction {
  _TransactionHook(this.transaction, this.hook);
  final AppTransaction transaction;
  final _DatabaseHook hook;
  @override
  Future<void> execute(String sql, [List<Object?> arguments = const []]) =>
      transaction.execute(sql, arguments);
  @override
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> arguments = const [],
  ]) async {
    final rows = await transaction.query(sql, arguments);
    await hook.afterQuery?.call();
    return rows;
  }

  @override
  Future<int> rawInsert(
    String sql, [
    List<Object?> arguments = const [],
  ]) async {
    final result = await transaction.rawInsert(sql, arguments);
    await hook.afterInsert?.call();
    return result;
  }

  @override
  Future<int> rawDelete(String sql, [List<Object?> arguments = const []]) =>
      transaction.rawDelete(sql, arguments);
  @override
  Future<int> rawUpdate(String sql, [List<Object?> arguments = const []]) =>
      transaction.rawUpdate(sql, arguments);
}
