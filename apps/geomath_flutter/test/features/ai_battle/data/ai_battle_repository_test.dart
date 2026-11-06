import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/actor_binding.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/core/storage/app_database.dart';
import 'package:geomath_flutter/core/storage/formative_schema.dart';
import 'package:geomath_flutter/core/storage/sqlite_app_database.dart';
import 'package:geomath_flutter/features/ai_battle/data/ai_battle_repository.dart';
import 'package:geomath_flutter/features/solo/data/solo_repository.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// All transaction hooks wrap actual SQLite, including rollback on a failure
/// after the actual INSERT/UPDATE/DELETE has already run.
final class _HookDatabase implements AppDatabase {
  _HookDatabase(
    this.delegate, {
    this.beforeTransaction,
    this.afterCommit,
    this.afterQuery,
    this.afterWrite,
  });
  final AppDatabase delegate;
  final Future<void> Function()? beforeTransaction, afterCommit, afterQuery;
  final Future<void> Function(String operation)? afterWrite;

  @override
  Stream<void> get changes => delegate.changes;

  @override
  Future<T> transaction<T>(Future<T> Function(AppTransaction) action) async {
    await beforeTransaction?.call();
    final value = await delegate.transaction(
      (transaction) => action(_HookTransaction(transaction, afterWrite)),
    );
    await afterCommit?.call();
    return value;
  }

  @override
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> arguments = const [],
  ]) async {
    final rows = await delegate.query(sql, arguments);
    await afterQuery?.call();
    return rows;
  }

  @override
  Future<void> close() async {}
}

final class _HookTransaction implements AppTransaction {
  _HookTransaction(this.delegate, this.afterWrite);
  final AppTransaction delegate;
  final Future<void> Function(String)? afterWrite;

  @override
  Future<void> execute(String sql, [List<Object?> arguments = const []]) =>
      delegate.execute(sql, arguments);

  @override
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> arguments = const [],
  ]) => delegate.query(sql, arguments);

  @override
  Future<int> rawInsert(
    String sql, [
    List<Object?> arguments = const [],
  ]) async {
    final value = await delegate.rawInsert(sql, arguments);
    await afterWrite?.call('insert');
    return value;
  }

  @override
  Future<int> rawUpdate(
    String sql, [
    List<Object?> arguments = const [],
  ]) async {
    final value = await delegate.rawUpdate(sql, arguments);
    await afterWrite?.call('update');
    return value;
  }

  @override
  Future<int> rawDelete(
    String sql, [
    List<Object?> arguments = const [],
  ]) async {
    final value = await delegate.rawDelete(sql, arguments);
    await afterWrite?.call('delete');
    return value;
  }
}

final class _Gate {
  final entered = Completer<void>();
  final release = Completer<void>();
  Future<void> wait() async {
    if (!entered.isCompleted) entered.complete();
    await release.future;
  }

  void open() {
    if (!release.isCompleted) release.complete();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();
  late Directory directory;
  late String path;
  late SqliteAppDatabase database;
  late SessionController sessions;
  late AiBattleRepository repository;

  Future<SqliteAppDatabase> open() async {
    final result = await SqliteAppDatabase.open(
      path: path,
      factory: databaseFactoryFfi,
      migrations: [...soloMigrations(), ...aiBattleMigrations()],
    );
    expect(result.isSuccess, isTrue);
    return result.valueOrNull!;
  }

  AiBattleRepository connect([AppDatabase? adapter]) =>
      AiBattleRepository(database: adapter ?? database, sessions: sessions);

  AiBattleSlot slot(
    ActorBinding actor, {
    String id = 'ai:match-1',
    Map<String, dynamic>? game,
  }) => AiBattleSlot(
    id: id,
    partition: actor.partition,
    // Repository deliberately does not guess the AI domain's schema. This
    // opaque paused checkpoint verifies exact fractional draw/time retention.
    game:
        game ??
        {
          'ruleset': 'storage-fixture-only',
          'paused': true,
          'remaining': 4123,
          'stage': 'net',
          'plan': {
            'accuracy': .825,
            'draws': [.125, .625],
          },
        },
  );

  Future<String?> payload(String partition) async {
    final rows = await database.query(
      'SELECT payload FROM ai_battle_slots WHERE partition = ?',
      [partition],
    );
    return rows.isEmpty ? null : rows.single['payload'] as String;
  }

  setUp(() async {
    directory = await Directory.systemTemp.createTemp('geomath-ai-storage-');
    path = '${directory.path}/battle.sqlite';
    database = await open();
    sessions = SessionController.guest(
      guestId: 'storage-device',
      sessionId: 'first-launch',
    );
    repository = connect();
  });

  tearDown(() async {
    await repository.drain();
    await database.close();
    await sessions.dispose();
    await directory.delete(recursive: true);
  });

  test(
    'real SQLite reopen retains the same opaque paused plan and stage',
    () async {
      final actor = sessions.current;
      final expected = slot(actor);
      expect((await repository.read(actor)).valueOrNull, isNull);
      expect(
        (await repository.save(actor, expected, create: true)).isSuccess,
        isTrue,
      );
      await database.close();
      database = await open();
      repository = connect();
      final result = await repository.read(actor);
      expect(result.isSuccess, isTrue);
      final restored = result.valueOrNull!;
      expect(restored.id, expected.id);
      expect(restored.partition, actor.partition);
      expect(restored.game, expected.game);
      expect((restored.game['plan'] as Map)['draws'], [.125, .625]);
      expect(
        await database.query(
          "SELECT version FROM foundation_migrations WHERE namespace = 'ai_battle'",
        ),
        [
          {'version': 1},
        ],
      );
    },
  );

  test(
    'checkpoints never touch quiz scores, completed history or outbox',
    () async {
      final actor = sessions.current;
      expect(
        (await repository.save(actor, slot(actor), create: true)).isSuccess,
        isTrue,
      );
      for (var question = 0; question < 10; question++) {
        expect(
          (await repository.save(
            actor,
            slot(
              actor,
              game: {'question': question, 'finished': question == 9},
            ),
          )).isSuccess,
          isTrue,
        );
      }
      for (final table in [
        'solo_checkpoints',
        'solo_analysis',
        FormativeSchema.completedSolo,
        FormativeSchema.outbox,
        FormativeSchema.reflections,
      ]) {
        expect(await database.query('SELECT * FROM $table'), isEmpty);
      }
      expect(
        await database.query('SELECT * FROM ai_battle_slots'),
        hasLength(1),
      );
    },
  );

  test('create, update, replace and queued deletion cannot overwrite another attempt', () async {
    final actor = sessions.current;
    final original = slot(actor);
    expect(
      (await repository.save(actor, original)).failureOrNull,
      AiBattleRepository.conflict,
    );
    expect(
      (await repository.save(actor, original, create: true)).isSuccess,
      isTrue,
    );
    final before = await payload(actor.partition);
    expect(
      (await repository.save(
        actor,
        slot(actor, id: 'ai:new'),
        create: true,
      )).failureOrNull,
      AiBattleRepository.conflict,
    );
    expect(await payload(actor.partition), before);
    final replacement = repository.save(
      actor,
      slot(actor, id: 'ai:new'),
      create: true,
      replaceConfirmed: true,
    );
    final obsoleteCheckpoint = repository.save(actor, original);
    expect((await replacement).isSuccess, isTrue);
    expect(
      (await obsoleteCheckpoint).failureOrNull,
      AiBattleRepository.conflict,
    );
    expect((await repository.read(actor)).valueOrNull?.id, 'ai:new');
    final deletion = repository.delete(actor);
    final obsoleteAfterDelete = repository.save(
      actor,
      slot(actor, id: 'ai:new'),
    );
    expect((await deletion).isSuccess, isTrue);
    expect(
      (await obsoleteAfterDelete).failureOrNull,
      AiBattleRepository.conflict,
    );
    expect((await repository.read(actor)).valueOrNull, isNull);
  });

  test('guest and account slots remain isolated across session epochs and deletion', () async {
    final guest = sessions.current;
    await repository.save(guest, slot(guest), create: true);
    sessions.bindUser(userId: 'owner-a', sessionId: 'login-a');
    final owner = sessions.current;
    expect((await repository.read(owner)).valueOrNull, isNull);
    await repository.save(owner, slot(owner, id: 'ai:owner'), create: true);
    expect(
      (await repository.save(guest, slot(guest))).failureOrNull?.code,
      FailureCode.stale,
    );
    expect(
      (await repository.delete(guest)).failureOrNull?.code,
      FailureCode.stale,
    );
    expect(
      (await repository.save(owner, slot(guest))).failureOrNull?.code,
      FailureCode.stale,
    );
    sessions.bindUser(userId: 'owner-a', sessionId: 'new-session');
    final newer = sessions.current;
    expect(
      (await repository.read(owner)).failureOrNull?.code,
      FailureCode.stale,
    );
    expect((await repository.read(newer)).valueOrNull?.id, 'ai:owner');
    expect((await repository.delete(newer)).isSuccess, isTrue);
    sessions.logout();
    expect(
      (await repository.read(sessions.current)).valueOrNull?.id,
      'ai:match-1',
    );
  });

  test(
    'corrupt and foreign envelopes survive until explicit replacement',
    () async {
      final actor = sessions.current;
      final original = slot(actor);
      final invalidPayloads = [
        '{broken',
        'null',
        '[]',
        jsonEncode({...original.toJson(), 'schema': 1.0}),
        jsonEncode({...original.toJson(), 'partition': 'owner:other'}),
        jsonEncode({...original.toJson(), 'id': '../other'}),
        jsonEncode({...original.toJson(), 'game': []}),
        jsonEncode({...original.toJson(), 'unknown': true}),
      ];
      for (final broken in invalidPayloads) {
        await database.transaction(
          (transaction) => transaction.rawInsert(
            'INSERT OR REPLACE INTO ai_battle_slots (partition, payload) VALUES (?, ?)',
            [actor.partition, broken],
          ),
        );
        expect(
          (await repository.read(actor)).failureOrNull,
          AiBattleRepository.invalid,
        );
        expect(
          (await repository.save(actor, original)).failureOrNull,
          AiBattleRepository.invalid,
        );
        expect(
          (await repository.save(actor, original, create: true)).failureOrNull,
          AiBattleRepository.conflict,
        );
        expect(await payload(actor.partition), broken);
        expect(
          (await repository.save(
            actor,
            original,
            create: true,
            replaceConfirmed: true,
          )).isSuccess,
          isTrue,
        );
        expect((await repository.read(actor)).valueOrNull?.game, original.game);
      }
    },
  );

  test('non-JSON, cyclic, too-deep and oversized UTF8 values cannot replace a valid slot', () async {
    final actor = sessions.current;
    await repository.save(actor, slot(actor), create: true);
    final before = await payload(actor.partition);
    final cycle = <String, dynamic>{};
    cycle['self'] = cycle;
    Map<String, dynamic> deep = {'leaf': true};
    for (var index = 0; index < 50; index++) {
      deep = {'nested': deep};
    }
    for (final invalidGame in <Map<String, dynamic>>[
      {'value': double.nan},
      {'value': double.infinity},
      {'value': DateTime.utc(2026)},
      {
        'value': {1: 'not-a-text-key'},
      },
      {'value': '🌐' * 70000},
      {'value': List.filled(13000, 0)},
      cycle,
      deep,
    ]) {
      expect(
        (await repository.save(
          actor,
          slot(actor, game: invalidGame),
        )).failureOrNull,
        AiBattleRepository.invalid,
      );
      expect(await payload(actor.partition), before);
    }
    expect(
      (await repository.save(actor, slot(actor, id: 'bad id'))).failureOrNull,
      AiBattleRepository.invalid,
    );
    expect(await payload(actor.partition), before);
    await expectLater(
      database.transaction(
        (tx) => tx.rawInsert(
          'INSERT OR REPLACE INTO ai_battle_slots (partition, payload) VALUES (?, ?)',
          [actor.partition, 'x' * (AiBattleRepository.maxPayloadBytes + 1)],
        ),
      ),
      throwsA(isA<DatabaseException>()),
    );
    expect(await payload(actor.partition), before);
  });

  test(
    'queued checkpoint captures caller data before any pending SQLite commit',
    () async {
      final actor = sessions.current;
      final gate = _Gate();
      var first = true;
      repository = connect(
        _HookDatabase(
          database,
          beforeTransaction: () async {
            if (first) {
              first = false;
              await gate.wait();
            }
          },
        ),
      );
      final initial = repository.save(actor, slot(actor), create: true);
      await gate.entered.future;
      final live = <String, dynamic>{
        'plan': {
          'draws': [.25, .75],
        },
        'stage': 'net',
      };
      final queued = repository.save(actor, slot(actor, game: live));
      (live['plan'] as Map)['draws'] = [1.0, 1.0];
      live['stage'] = 'finished';
      gate.open();
      expect((await initial).isSuccess, isTrue);
      expect((await queued).isSuccess, isTrue);
      expect((await repository.read(actor)).valueOrNull?.game, {
        'plan': {
          'draws': [.25, .75],
        },
        'stage': 'net',
      });
    },
  );

  test('actor change inside the actual transaction rolls back a written checkpoint', () async {
    final actor = sessions.current;
    final gate = _Gate();
    repository = connect(
      _HookDatabase(database, afterWrite: (_) => gate.wait()),
    );
    final pending = repository.save(actor, slot(actor), create: true);
    await gate.entered.future;
    final queued = repository.save(actor, slot(actor, game: {'stale': true}));
    sessions.bindUser(userId: 'owner-b', sessionId: 'new');
    gate.open();
    expect((await pending).failureOrNull?.code, FailureCode.stale);
    expect((await queued).failureOrNull?.code, FailureCode.stale);
    expect(await payload(actor.partition), isNull);
    expect(await payload(sessions.current.partition), isNull);
    expect(
      (await repository.save(
        sessions.current,
        slot(sessions.current),
        create: true,
      )).isSuccess,
      isTrue,
    );
  });

  test(
    'actor change before transaction entry rejects without writing',
    () async {
      final actor = sessions.current;
      final gate = _Gate();
      repository = connect(
        _HookDatabase(database, beforeTransaction: gate.wait),
      );
      final pending = repository.save(actor, slot(actor), create: true);
      await gate.entered.future;
      sessions.changeScope('another-page');
      gate.open();
      expect((await pending).failureOrNull?.code, FailureCode.stale);
      expect(await database.query('SELECT * FROM ai_battle_slots'), isEmpty);
    },
  );

  test(
    'a late read and post-commit acknowledgement never adopt another actor',
    () async {
      final actor = sessions.current;
      await repository.save(actor, slot(actor), create: true);
      final readGate = _Gate();
      repository = connect(_HookDatabase(database, afterQuery: readGate.wait));
      final read = repository.read(actor);
      await readGate.entered.future;
      sessions.bindUser(userId: 'owner-c', sessionId: 'login-c');
      readGate.open();
      expect((await read).failureOrNull?.code, FailureCode.stale);
      final owner = sessions.current;
      final commitGate = _Gate();
      repository = connect(
        _HookDatabase(database, afterCommit: commitGate.wait),
      );
      final save = repository.save(owner, slot(owner), create: true);
      await commitGate.entered.future;
      sessions.bindUser(userId: 'owner-d', sessionId: 'login-d');
      commitGate.open();
      expect((await save).failureOrNull?.code, FailureCode.stale);
      // The old owner's acknowledged-late commit may exist, but never in D's
      // partition and never represented as D's successful save.
      expect(await payload(owner.partition), isNotNull);
      expect(await payload(sessions.current.partition), isNull);
      repository = connect();
      expect((await repository.read(sessions.current)).valueOrNull, isNull);
    },
  );

  test('failure after actual update rolls back and the serial queue remains usable', () async {
    final actor = sessions.current;
    await repository.save(actor, slot(actor), create: true);
    final before = await payload(actor.partition);
    var denied = true;
    repository = connect(
      _HookDatabase(
        database,
        afterWrite: (_) async {
          if (denied) throw StateError('Injected SQLite commit-path failure.');
        },
      ),
    );
    expect(
      (await repository.save(
        actor,
        slot(actor, game: {'changed': true}),
      )).failureOrNull,
      AiBattleRepository.storage,
    );
    await repository.drain();
    expect(await payload(actor.partition), before);
    denied = false;
    expect(
      (await repository.save(
        actor,
        slot(actor, game: {'changed': true}),
      )).isSuccess,
      isTrue,
    );
    expect((await repository.read(actor)).valueOrNull?.game, {'changed': true});
  });

  test('stale deletion rolls back and a closed database reports a recoverable failure', () async {
    final actor = sessions.current;
    await repository.save(actor, slot(actor), create: true);
    final before = await payload(actor.partition);
    final gate = _Gate();
    repository = connect(
      _HookDatabase(
        database,
        afterWrite: (operation) async {
          if (operation == 'delete') await gate.wait();
        },
      ),
    );
    final deletion = repository.delete(actor);
    await gate.entered.future;
    sessions.bindUser(userId: 'owner-z', sessionId: 'new');
    gate.open();
    expect((await deletion).failureOrNull?.code, FailureCode.stale);
    expect(await payload(actor.partition), before);
    repository = connect();
    await database.close();
    expect(
      (await repository.read(sessions.current)).failureOrNull?.message,
      'ai_battle.loadFailed',
    );
    expect(
      (await repository.save(
        sessions.current,
        slot(sessions.current),
        create: true,
      )).failureOrNull,
      AiBattleRepository.storage,
    );
    await repository.drain();
  });
}
