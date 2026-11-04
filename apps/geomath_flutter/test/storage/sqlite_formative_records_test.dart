import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';
import 'package:geomath_flutter/core/records/local_formative_records.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/actor_binding.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/core/storage/app_database.dart';
import 'package:geomath_flutter/core/storage/formative_schema.dart';
import 'package:geomath_flutter/core/storage/migration.dart';
import 'package:geomath_flutter/core/storage/sqlite_app_database.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

const ownerA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ownerB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();

  late Directory directory;
  late String databasePath;
  late SqliteAppDatabase database;
  late SessionController sessions;
  late LocalFormativeRecords records;

  Future<SqliteAppDatabase> open({
    Iterable<MigrationContribution> migrations = const [],
  }) async {
    final result = await SqliteAppDatabase.open(
      path: databasePath,
      factory: databaseFactoryFfi,
      migrations: migrations,
    );
    expect(result.isSuccess, isTrue, reason: result.failureOrNull?.message);
    return result.valueOrNull!;
  }

  setUp(() async {
    directory = await Directory.systemTemp.createTemp('geomath-sqlite-');
    databasePath = '${directory.path}/records.sqlite';
    database = await open();
    sessions = SessionController.guest(
      guestId: 'stable-guest',
      sessionId: 'launch-1',
    );
    records = LocalFormativeRecords(database: database, sessions: sessions);
  });

  tearDown(() async {
    await database.close();
    await sessions.dispose();
    await directory.delete(recursive: true);
  });

  test(
    'real SQLite saves guest records, reopens, and never enqueues guest upload',
    () async {
      final actor = sessions.current;
      final reflection = _reflection(
        ReflectionStage.explanation,
        completed: true,
      );
      final receipt = await records.saveReflection(
        actor: actor,
        reflection: reflection,
      );
      expect(receipt.valueOrNull?.durable, isTrue);
      expect(receipt.valueOrNull?.actor, actor);
      expect(receipt.valueOrNull?.state, FormativeSaveState.local);
      final solo = _solo('solo:1');
      expect(
        (await records.saveCompletedSolo(actor: actor, record: solo)).isSuccess,
        isTrue,
      );
      expect(
        await database.query('SELECT * FROM ${FormativeSchema.outbox}'),
        isEmpty,
      );

      await database.close();
      database = await open();
      records = LocalFormativeRecords(database: database, sessions: sessions);
      expect((await records.watchReflections(actor).first).valueOrNull, [
        reflection,
      ]);
      expect((await records.readCompletedSolo(actor)).valueOrNull, [solo]);
      expect(
        await database.query('SELECT * FROM ${FormativeSchema.outbox}'),
        isEmpty,
      );
    },
  );

  test('record and outbox commit atomically and survive reopen', () async {
    sessions.bindUser(userId: ownerA, sessionId: 'session-a');
    records = LocalFormativeRecords(
      database: database,
      sessions: sessions,
      outbox: _Outbox(),
    );
    final actor = sessions.current;
    final result = await records.saveReflection(
      actor: actor,
      reflection: _reflection(ReflectionStage.check),
    );
    expect(result.valueOrNull?.state, FormativeSaveState.pending);
    await database.close();
    database = await open();
    final saved = await database.query(
      'SELECT partition, payload FROM ${FormativeSchema.reflections}',
    );
    final pending = await database.query(
      'SELECT * FROM ${FormativeSchema.outbox}',
    );
    expect(saved.single['partition'], actor.partition);
    expect(pending.single['partition'], actor.partition);
    expect(pending.single['owner_id'], ownerA);
    expect(
      jsonDecode(pending.single['payload']! as String),
      jsonDecode(saved.single['payload']! as String),
    );
  });

  test('queue failure after insertion rolls back record and event, without a receipt', () async {
    sessions.bindUser(userId: ownerA, sessionId: 'session-a');
    records = LocalFormativeRecords(
      database: database,
      sessions: sessions,
      outbox: _Outbox(
        afterInsert: () => const Failed(
          AppFailure(code: FailureCode.storage, message: 'write denied'),
        ),
      ),
    );
    final result = await records.saveReflection(
      actor: sessions.current,
      reflection: _reflection(ReflectionStage.check),
    );
    expect(result.failureOrNull?.code, FailureCode.storage);
    expect(result.valueOrNull, isNull);
    await database.close();
    database = await open();
    expect(
      await database.query('SELECT * FROM ${FormativeSchema.reflections}'),
      isEmpty,
    );
    expect(
      await database.query('SELECT * FROM ${FormativeSchema.outbox}'),
      isEmpty,
    );
  });

  test(
    'actor switch during transaction rolls back the stale write and queue',
    () async {
      sessions.bindUser(userId: ownerA, sessionId: 'session-a');
      final actorA = sessions.current;
      records = LocalFormativeRecords(
        database: database,
        sessions: sessions,
        outbox: _Outbox(
          afterInsert: () {
            sessions.bindUser(userId: ownerB, sessionId: 'session-b');
            return const Success(null);
          },
        ),
      );
      final result = await records.saveCompletedSolo(
        actor: actorA,
        record: _solo('stale:1'),
      );
      expect(result.failureOrNull?.code, FailureCode.stale);
      expect(result.valueOrNull, isNull);
      expect(
        await database.query('SELECT * FROM ${FormativeSchema.completedSolo}'),
        isEmpty,
      );
      expect(
        await database.query('SELECT * FROM ${FormativeSchema.outbox}'),
        isEmpty,
      );
    },
  );

  test(
    'missing signed-in queue cannot claim a durable or synced save',
    () async {
      sessions.bindUser(userId: ownerA, sessionId: 'session-a');
      final reflection = await records.saveReflection(
        actor: sessions.current,
        reflection: _reflection(ReflectionStage.prediction),
      );
      final solo = await records.saveCompletedSolo(
        actor: sessions.current,
        record: _solo('missing:1'),
      );
      for (final result in [reflection, solo]) {
        expect(result.failureOrNull?.code, FailureCode.unavailable);
        expect(result.valueOrNull, isNull);
      }
      expect(
        await database.query('SELECT * FROM ${FormativeSchema.reflections}'),
        isEmpty,
      );
      expect(
        await database.query('SELECT * FROM ${FormativeSchema.completedSolo}'),
        isEmpty,
      );
    },
  );

  test(
    'guest and A/B remain isolated, including stale reads and writes',
    () async {
      final guest = sessions.current;
      await records.saveCompletedSolo(actor: guest, record: _solo('guest:1'));
      sessions.bindUser(userId: ownerA, sessionId: 'session-a');
      records = LocalFormativeRecords(
        database: database,
        sessions: sessions,
        outbox: _Outbox(),
      );
      final actorA = sessions.current;
      await records.saveCompletedSolo(
        actor: actorA,
        record: _solo('account-a:1'),
      );
      sessions.bindUser(userId: ownerB, sessionId: 'session-b');
      expect(
        (await records.readCompletedSolo(sessions.current)).valueOrNull,
        isEmpty,
      );
      expect(
        (await records.readCompletedSolo(actorA)).failureOrNull?.code,
        FailureCode.stale,
      );
      expect(
        (await records.saveCompletedSolo(
          actor: actorA,
          record: _solo('late:1'),
        )).failureOrNull?.code,
        FailureCode.stale,
      );
      sessions.logout();
      expect(sessions.current.partition, guest.partition);
      expect(
        (await records.readCompletedSolo(sessions.current))
            .valueOrNull
            ?.single
            .attemptId,
        'guest:1',
      );
      expect(
        (await database.query('SELECT owner_id FROM ${FormativeSchema.outbox}'))
            .map((row) => row['owner_id']),
        [ownerA],
      );
    },
  );

  test(
    'watcher invalidates on scope change without leaking another owner',
    () async {
      final actor = sessions.current;
      final events = <Result<List<ModuleReflection>>>[];
      final ready = Completer<void>();
      final stale = Completer<void>();
      final subscription = records.watchReflections(actor).listen((event) {
        events.add(event);
        if (event.isSuccess && !ready.isCompleted) ready.complete();
        if (event.failureOrNull?.code == FailureCode.stale &&
            !stale.isCompleted) {
          stale.complete();
        }
      });
      addTearDown(subscription.cancel);
      await ready.future;
      sessions.changeScope('module:next');
      await stale.future;
      expect(events.last.failureOrNull?.code, FailureCode.stale);
    },
  );

  test(
    'durable receipt waits for actual SQLite commit acknowledgment',
    () async {
      final held = _HeldCommitDatabase(database);
      records = LocalFormativeRecords(database: held, sessions: sessions);
      var completed = false;
      final save = records.saveCompletedSolo(
        actor: sessions.current,
        record: _solo('held:1'),
      )..then((_) => completed = true);
      await held.beforeCommit.future;
      expect(completed, isFalse);
      held.release.complete();
      expect((await save).valueOrNull?.durable, isTrue);
      expect(
        (await records.readCompletedSolo(sessions.current))
            .valueOrNull
            ?.single
            .attemptId,
        'held:1',
      );
    },
  );

  test('closed SQLite write fails without a durable receipt', () async {
    await database.close();
    final result = await records.saveCompletedSolo(
      actor: sessions.current,
      record: _solo('failed:1'),
    );
    expect(result.failureOrNull?.code, FailureCode.storage);
    expect(result.valueOrNull, isNull);
  });

  test(
    'completed attempt is immutable; reflection stage never regresses',
    () async {
      final actor = sessions.current;
      final completed = _reflection(
        ReflectionStage.explanation,
        completed: true,
      );
      await records.saveReflection(actor: actor, reflection: completed);
      await records.saveReflection(
        actor: actor,
        reflection: _reflection(ReflectionStage.prediction),
      );
      expect((await records.watchReflections(actor).first).valueOrNull, [
        completed,
      ]);
      final solo = _solo('attempt:1');
      await records.saveCompletedSolo(actor: actor, record: solo);
      expect(
        (await records.saveCompletedSolo(actor: actor, record: solo)).isSuccess,
        isTrue,
      );
      final different = CompletedSoloRecord.fromJson({
        ...solo.toJson(),
        'score': 9,
        'mistakes': 1,
      }).valueOrNull!;
      expect(
        (await records.saveCompletedSolo(
          actor: actor,
          record: different,
        )).failureOrNull?.code,
        FailureCode.conflict,
      );
      expect((await records.readCompletedSolo(actor)).valueOrNull, [solo]);
    },
  );

  test(
    'quiz history is bounded at fifty without pruning practice records',
    () async {
      final actor = sessions.current;
      final practice = CompletedSoloRecord.fromJson({
        ..._solo('practice:1').toJson(),
        'mode': 'practice',
        'total': 15,
        'score': 15,
      }).valueOrNull!;
      await records.saveCompletedSolo(actor: actor, record: practice);
      for (var index = 0; index < 52; index++) {
        expect(
          (await records.saveCompletedSolo(
            actor: actor,
            record: _solo('quiz:$index'),
          )).isSuccess,
          isTrue,
        );
      }
      final rows = (await records.readCompletedSolo(actor)).valueOrNull!;
      expect(rows.where((row) => row.mode == SoloMode.quiz), hasLength(50));
      expect(rows.where((row) => row.mode == SoloMode.practice), [practice]);
    },
  );

  test('migration contributions are unique, durable, ordered and rollback failures', () async {
    await database.close();
    final first = MigrationContribution(
      namespace: 'learning',
      version: 1,
      description: 'learning fixture v1',
      migrate: (tx) =>
          tx.execute('CREATE TABLE learning_fixture (id INTEGER PRIMARY KEY)'),
    );
    final second = MigrationContribution(
      namespace: 'learning',
      version: 2,
      description: 'learning fixture v2',
      migrate: (tx) =>
          tx.execute('ALTER TABLE learning_fixture ADD COLUMN label TEXT'),
    );
    expect(() => MigrationRegistry([first, first]), throwsArgumentError);
    expect(() => MigrationRegistry([second]), throwsArgumentError);
    final collision = await SqliteAppDatabase.open(
      path: databasePath,
      factory: databaseFactoryFfi,
      migrations: [FormativeSchema.migration],
    );
    expect(collision.failureOrNull?.code, FailureCode.invalid);
    database = await open(migrations: [first]);
    await database.transaction(
      (tx) => tx.rawInsert('INSERT INTO learning_fixture(id) VALUES (7)'),
    );
    await database.close();
    database = await open(migrations: [second, first]);
    expect(
      (await database.query('SELECT id, label FROM learning_fixture')).single,
      {'id': 7, 'label': null},
    );
    await database.close();
    final broken = MigrationContribution(
      namespace: 'learning',
      version: 3,
      description: 'deliberately fail transaction',
      migrate: (tx) async {
        await tx.execute('CREATE TABLE must_not_survive (id INTEGER)');
        throw StateError('migration interrupted');
      },
    );
    final failed = await SqliteAppDatabase.open(
      path: databasePath,
      factory: databaseFactoryFfi,
      migrations: [first, second, broken],
    );
    expect(failed.failureOrNull?.code, FailureCode.storage);
    database = await open(migrations: [first, second]);
    expect(
      await database.query(
        "SELECT name FROM sqlite_master WHERE name = 'must_not_survive'",
      ),
      isEmpty,
    );
    expect(
      (await database.query(
        "SELECT version FROM foundation_migrations WHERE namespace = 'learning' ORDER BY version",
      )).map((row) => row['version']),
      [1, 2],
    );
  });

  test('transaction handle expires when callback completes', () async {
    late AppTransaction expired;
    await database.transaction((transaction) async => expired = transaction);
    expect(
      () => expired.execute('CREATE TABLE forbidden_late_write (id INTEGER)'),
      throwsStateError,
    );
  });
}

ModuleReflection _reflection(ReflectionStage stage, {bool completed = false}) =>
    ModuleReflection.create(
      activity: ModuleActivity.net,
      stage: stage,
      prediction: 'prediction',
      result: stage.index >= 1 ? 'result' : '',
      explanation: stage == ReflectionStage.explanation ? 'explanation' : '',
      completed: completed,
    ).valueOrNull!;

CompletedSoloRecord _solo(String id) => CompletedSoloRecord.fromJson({
  'attempt_id': id,
  'mode': 'quiz',
  'ruleset': 'single-attempt-v1',
  'score': 10,
  'total': 10,
  'mistakes': 0,
  'hints': 0,
  'skipped': 0,
  'elapsed_ms': 100,
}).valueOrNull!;

/// Local test adapter, not a hosted sync implementation. It writes into the
/// caller's transaction, then optionally exercises failure/account switch paths.
final class _Outbox implements FormativeOutboxAppender {
  _Outbox({this.afterInsert});

  final Result<void> Function()? afterInsert;

  @override
  Future<Result<void>> append({
    required AppTransaction transaction,
    required ActorBinding actor,
    required FormativeEvent event,
  }) async {
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
        0,
      ],
    );
    return afterInsert?.call() ?? const Success(null);
  }
}

final class _HeldCommitDatabase implements AppDatabase {
  _HeldCommitDatabase(this.database);

  final AppDatabase database;
  final beforeCommit = Completer<void>();
  final release = Completer<void>();

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
      database.transaction((tx) async {
        final result = await action(tx);
        beforeCommit.complete();
        await release.future;
        return result;
      });
}
