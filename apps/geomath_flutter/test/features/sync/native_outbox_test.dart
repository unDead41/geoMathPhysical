import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/public_backend_configuration.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';
import 'package:geomath_flutter/core/records/local_formative_records.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/runtime/clock.dart';
import 'package:geomath_flutter/core/runtime/random_source.dart';
import 'package:geomath_flutter/core/session/actor_binding.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/core/session/session_store.dart';
import 'package:geomath_flutter/core/storage/app_database.dart';
import 'package:geomath_flutter/core/storage/formative_schema.dart';
import 'package:geomath_flutter/core/storage/sqlite_app_database.dart';
import 'package:geomath_flutter/features/auth/data/cloud_gateway.dart';
import 'package:geomath_flutter/features/auth/data/auth_transport.dart';
import 'package:geomath_flutter/features/auth/data/native_auth_repository.dart';
import 'package:geomath_flutter/features/sync/sync_feature.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

const ownerA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ownerB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();
  late Directory directory;
  late SqliteAppDatabase db;
  late SessionController sessions;
  late SqliteFormativeOutbox outbox;
  late LocalFormativeRecords shared;
  late SyncFormativeRecordWriter writer;
  late _Clock clock;
  late _Gateway gateway;
  final controllers = <FormativeSyncController>[];

  Future<SqliteAppDatabase> open() async => (await SqliteAppDatabase.open(
    path: '${directory.path}/records.sqlite',
    factory: databaseFactoryFfi,
    migrations: [SyncReceiptSchema.migration],
  )).valueOrNull!;

  void records({FormativeOutboxAppender? appender}) {
    outbox = SqliteFormativeOutbox(
      database: db,
      sessions: sessions,
      clock: clock,
    );
    shared = LocalFormativeRecords(
      database: db,
      sessions: sessions,
      clock: clock,
      outbox: appender ?? outbox,
    );
    writer = SyncFormativeRecordWriter(
      delegate: shared,
      sessions: sessions,
      outbox: outbox,
    );
  }

  FormativeSyncController controller({AppLifecycleController? lifecycle}) {
    final value = FormativeSyncController(
      outbox: outbox,
      gateway: gateway,
      sessions: sessions,
      writer: writer,
      clock: clock,
      random: _Random(),
      autoStart: false,
      lifecycle: lifecycle,
    );
    controllers.add(value);
    return value;
  }

  Future<void> save(String id) async {
    expect(
      (await writer.saveCompletedSolo(
        actor: sessions.current,
        record: _solo(id),
      )).isSuccess,
      isTrue,
    );
  }

  Future<NativeAuthRepository> signIn(_AuthWire wire) async {
    sessions.logout();
    final auth = NativeAuthRepository(
      sessions: sessions,
      store: _ProtectedStore(),
      configuration: const PublicBackendConfiguration(
        url: 'https://example.supabase.co',
        publishableKey: 'sb_publishable_abcdefghijklmnopqrstuvwxyz',
      ),
      transport: wire,
    );
    addTearDown(auth.dispose);
    expect(
      (await auth.login(
        identifier: 'fixture',
        password: 'fixture-password',
      )).isSuccess,
      isTrue,
    );
    expect(sessions.current.userId, ownerA);
    return auth;
  }

  Future<List<Map<String, Object?>>> pending() => db.query(
    'SELECT * FROM ${FormativeSchema.outbox} ORDER BY created_at_ms, event_id',
  );

  setUp(() async {
    directory = await Directory.systemTemp.createTemp('geomath-native-sync-');
    db = await open();
    sessions = SessionController.guest(
      guestId: 'installation',
      sessionId: 'guest-launch',
    );
    sessions.bindUser(userId: ownerA, sessionId: 'session-a');
    clock = _Clock();
    records();
    gateway = _Gateway(sessions);
  });
  tearDown(() async {
    for (final value in controllers) {
      value.dispose();
    }
    controllers.clear();
    writer.dispose();
    await db.close();
    await sessions.dispose();
    await directory.delete(recursive: true);
  });

  test('signed-in shared writer atomically persists one result/event across disk reopen', () async {
    final actor = sessions.current;
    final record = _solo('one');
    final saved = await writer.saveCompletedSolo(actor: actor, record: record);
    expect(saved.valueOrNull?.state, FormativeSaveState.pending);
    expect(saved.valueOrNull?.durable, isTrue);
    await writer.saveCompletedSolo(actor: actor, record: record);
    expect(await pending(), hasLength(1));
    final conflict = await writer.saveCompletedSolo(
      actor: actor,
      record: CompletedSoloRecord.fromJson({
        ...record.toJson(),
        'score': 9,
        'mistakes': 1,
      }).valueOrNull!,
    );
    expect(conflict.failureOrNull?.code, FailureCode.conflict);
    writer.dispose();
    await db.close();
    db = await open();
    records();
    expect((await shared.readCompletedSolo(actor)).valueOrNull, [record]);
    expect((await outbox.read(actor)).valueOrNull?.pending, 1);
    expect(
      jsonDecode((await pending()).single['payload']! as String),
      record.toJson(),
    );
  });

  test('real SQLite abort rolls back record and event; explicit retry recovers the retained DTO', () async {
    await db.transaction(
      (tx) => tx.execute(
        'CREATE TRIGGER deny_queue BEFORE INSERT ON formative_outbox '
        "BEGIN SELECT RAISE(ABORT, 'fixture denied'); END",
      ),
    );
    final actor = sessions.current;
    final failed = await writer.saveCompletedSolo(
      actor: actor,
      record: _solo('failed'),
    );
    expect(failed.failureOrNull?.code, FailureCode.storage);
    expect(failed.valueOrNull, isNull);
    expect(await pending(), isEmpty);
    expect(
      await db.query('SELECT * FROM ${FormativeSchema.completedSolo}'),
      isEmpty,
    );
    expect(writer.unsaved(actor), 1);
    await db.transaction((tx) => tx.execute('DROP TRIGGER deny_queue'));
    await writer.retryUnsaved(actor);
    expect(writer.unsaved(actor), 0);
    expect(
      (await shared.readCompletedSolo(actor)).valueOrNull!.single.attemptId,
      'failed',
    );
    expect(await pending(), hasLength(1));
  });

  test('append failure after actual insert rolls both tables back', () async {
    final actual = outbox;
    writer.dispose();
    records(
      appender: _AfterAppend(actual, () => const Failed(storageOutboxFailure)),
    );
    final result = await writer.saveReflection(
      actor: sessions.current,
      reflection: _reflection(),
    );
    expect(result.failureOrNull?.code, FailureCode.storage);
    expect(await pending(), isEmpty);
    expect(
      await db.query('SELECT * FROM ${FormativeSchema.reflections}'),
      isEmpty,
    );
  });

  test('acknowledged attempts retain original receipts beyond 50 quizzes and a new session/reopen', () async {
    final actor = sessions.current, record = _solo('original');
    final original = (await writer.saveCompletedSolo(
      actor: actor,
      record: record,
    )).valueOrNull!;
    for (var i = 0; i < 52; i++) {
      clock.advance(const Duration(seconds: 1));
      await save('later:$i');
    }
    final sync = controller();
    for (var i = 0; i < 3; i++) {
      await sync.wake();
      clock.advance(const Duration(seconds: 2));
    }
    expect(await pending(), isEmpty);
    final before = await db.query(
      'SELECT * FROM ${FormativeSchema.completedSolo} ORDER BY attempt_id',
    );
    expect(before, hasLength(50));
    expect(before.any((r) => r['attempt_id'] == record.attemptId), isFalse);
    sync.dispose();
    writer.dispose();
    await db.close();
    db = await open();
    records();
    sessions.bindUser(userId: ownerA, sessionId: 'new-launch');
    clock.advance(const Duration(days: 1));
    final renewed = sessions.current;
    final replay = await writer.saveCompletedSolo(
      actor: renewed,
      record: record,
    );
    expect(replay.valueOrNull?.persistedAt, original.persistedAt);
    expect(replay.valueOrNull?.actor, renewed);
    expect(replay.valueOrNull?.state, FormativeSaveState.pending);
    expect(await pending(), isEmpty);
    expect(
      await db.query(
        'SELECT * FROM ${FormativeSchema.completedSolo} ORDER BY attempt_id',
      ),
      before,
    );
    await controller().wake();
    final changed = CompletedSoloRecord.fromJson({
      ...record.toJson(),
      'score': 9,
      'mistakes': 1,
    }).valueOrNull!;
    expect(
      (await writer.saveCompletedSolo(
        actor: renewed,
        record: changed,
      )).failureOrNull?.code,
      FailureCode.conflict,
    );
    expect(
      (await outbox.readSoloReceipt(
        actor: actor,
        record: record,
      )).failureOrNull?.code,
      FailureCode.stale,
    );
    sessions.bindUser(userId: ownerB, sessionId: 'account-b');
    expect(
      (await outbox.readSoloReceipt(
        actor: sessions.current,
        record: record,
      )).valueOrNull,
      isNull,
    );
    expect(await pending(), isEmpty);
  });

  test('sync migration upgrades existing owner views and pruned pending attempts without importing guests', () async {
    final path = '${directory.path}/legacy.sqlite';
    var legacy = (await SqliteAppDatabase.open(
      path: path,
      factory: databaseFactoryFfi,
    )).valueOrNull!;
    await legacy.transaction((tx) async {
      for (final partition in [sessions.current.partition, 'guest:legacy']) {
        await tx.rawInsert(
          'INSERT INTO ${FormativeSchema.completedSolo} '
          '(partition, attempt_id, mode, payload, created_at_ms) VALUES (?,?,?,?,?)',
          [
            partition,
            'retained',
            'quiz',
            jsonEncode(_solo('retained').toJson()),
            1000,
          ],
        );
      }
      await tx.rawInsert(
        'INSERT INTO ${FormativeSchema.outbox} '
        '(partition, owner_id, event_id, kind, content_version, payload, created_at_ms) VALUES (?,?,?,?,?,?,?)',
        [
          sessions.current.partition,
          ownerA,
          'legacy-event',
          'solo',
          1,
          jsonEncode(_solo('pruned').toJson()),
          2000,
        ],
      );
    });
    await legacy.close();
    legacy = (await SqliteAppDatabase.open(
      path: path,
      factory: databaseFactoryFfi,
      migrations: [SyncReceiptSchema.migration],
    )).valueOrNull!;
    final legacyOutbox = SqliteFormativeOutbox(
      database: legacy,
      sessions: sessions,
    );
    final legacyWriter = SyncFormativeRecordWriter(
      delegate: LocalFormativeRecords(
        database: legacy,
        sessions: sessions,
        outbox: legacyOutbox,
      ),
      sessions: sessions,
      outbox: legacyOutbox,
    );
    try {
      final receipts = await legacy.query(
        'SELECT * FROM ${SyncReceiptSchema.soloReceipts} ORDER BY persisted_at_ms',
      );
      expect(receipts, hasLength(2));
      expect(
        receipts.every((r) => r['partition'] == sessions.current.partition),
        isTrue,
      );
      expect(
        (await legacyWriter.saveCompletedSolo(
          actor: sessions.current,
          record: _solo('pruned'),
        )).valueOrNull?.persistedAt.millisecondsSinceEpoch,
        2000,
      );
      expect(
        await legacy.query('SELECT * FROM ${FormativeSchema.outbox}'),
        hasLength(1),
      );
      expect(
        await legacy.query(
          'SELECT * FROM ${FormativeSchema.completedSolo} WHERE attempt_id = ?',
          ['pruned'],
        ),
        isEmpty,
      );
    } finally {
      legacyWriter.dispose();
      await legacy.close();
    }
  });

  test(
    'receipt write failure rolls back both shared record and queue insert',
    () async {
      await db.transaction(
        (tx) => tx.execute(
          'CREATE TRIGGER deny_receipt BEFORE INSERT ON sync_solo_receipts '
          "BEGIN SELECT RAISE(ABORT, 'fixture denied'); END",
        ),
      );
      final result = await writer.saveCompletedSolo(
        actor: sessions.current,
        record: _solo('not-durable'),
      );
      expect(result.failureOrNull?.code, FailureCode.storage);
      expect(await pending(), isEmpty);
      expect(
        await db.query('SELECT * FROM ${FormativeSchema.completedSolo}'),
        isEmpty,
      );
      expect(
        await db.query('SELECT * FROM ${SyncReceiptSchema.soloReceipts}'),
        isEmpty,
      );
      expect(writer.unsaved(sessions.current), 1);
    },
  );

  test(
    'concurrent writers share one immutable finalization receipt and event',
    () async {
      final second = SyncFormativeRecordWriter(
        delegate: shared,
        sessions: sessions,
        outbox: outbox,
      );
      try {
        final actor = sessions.current, record = _solo('concurrent');
        final results = await Future.wait([
          writer.saveCompletedSolo(actor: actor, record: record),
          second.saveCompletedSolo(actor: actor, record: record),
        ]);
        expect(results.every((r) => r.isSuccess), isTrue);
        expect(
          results[0].valueOrNull?.persistedAt,
          results[1].valueOrNull?.persistedAt,
        );
        expect(await pending(), hasLength(1));
        expect(
          await db.query('SELECT * FROM ${SyncReceiptSchema.soloReceipts}'),
          hasLength(1),
        );
      } finally {
        second.dispose();
      }
    },
  );

  test('a receipt appearing after precheck rolls back a pruned aggregate reinsertion', () async {
    final entered = Completer<void>(), release = Completer<void>();
    final delayed = SyncFormativeRecordWriter(
      delegate: _BeforeSolo(shared, () async {
        entered.complete();
        await release.future;
      }),
      sessions: sessions,
      outbox: outbox,
    );
    try {
      final actor = sessions.current, record = _solo('racing-old');
      final flight = delayed.saveCompletedSolo(actor: actor, record: record);
      await entered.future;
      final first = (await writer.saveCompletedSolo(
        actor: actor,
        record: record,
      )).valueOrNull!;
      for (var i = 0; i < 51; i++) {
        clock.advance(const Duration(seconds: 1));
        await save('pruner:$i');
      }
      final before = await db.query(
        'SELECT * FROM ${FormativeSchema.completedSolo} ORDER BY attempt_id',
      );
      expect(before.any((r) => r['attempt_id'] == record.attemptId), isFalse);
      final queued = await pending();
      release.complete();
      expect((await flight).valueOrNull?.persistedAt, first.persistedAt);
      expect(
        await db.query(
          'SELECT * FROM ${FormativeSchema.completedSolo} ORDER BY attempt_id',
        ),
        before,
      );
      expect(await pending(), queued);
      expect(
        await db.query('SELECT * FROM ${SyncReceiptSchema.soloReceipts}'),
        hasLength(52),
      );
    } finally {
      delayed.dispose();
    }
  });

  test('2000-owner capacity preserves existing rows and rejects the entire new record transaction', () async {
    final actor = sessions.current;
    await db.transaction((tx) async {
      for (var i = 0; i < FormativeSchema.maxPendingPerOwner; i++) {
        await tx.rawInsert(
          'INSERT INTO ${FormativeSchema.outbox} '
          '(partition, owner_id, event_id, kind, content_version, payload, created_at_ms) VALUES (?,?,?,?,?,?,?)',
          [
            actor.partition,
            actor.userId,
            'existing:$i',
            'solo',
            1,
            jsonEncode(_solo('seed:$i').toJson()),
            i,
          ],
        );
      }
    });
    final failed = await writer.saveCompletedSolo(
      actor: actor,
      record: _solo('overflow'),
    );
    expect(failed.failureOrNull?.code, FailureCode.storage);
    expect((await pending()).length, 2000);
    expect(
      await db.query('SELECT * FROM ${FormativeSchema.completedSolo}'),
      isEmpty,
    );
    expect(writer.unsaved(actor), 1);
    expect(
      await db.query('SELECT * FROM ${SyncReceiptSchema.soloReceipts}'),
      isEmpty,
    );
  });

  test(
    'outbox IDs are immutable and exact duplicate append is idempotent',
    () async {
      final actor = sessions.current;
      final event = FormativeEvent(
        id: 'fixed',
        kind: FormativeEventKind.module,
        payload: _reflection().toJson(),
      );
      Future<Result<void>> append(FormativeEvent value) => db.transaction(
        (tx) => outbox.append(transaction: tx, actor: actor, event: value),
      );
      expect((await append(event)).isSuccess, isTrue);
      expect((await append(event)).isSuccess, isTrue);
      final changed = FormativeEvent(
        id: 'fixed',
        kind: FormativeEventKind.module,
        payload: _reflection(prediction: 'Different').toJson(),
      );
      expect((await append(changed)).failureOrNull?.code, FailureCode.conflict);
      expect(await pending(), hasLength(1));
      expect(
        jsonDecode(
          (await pending()).single['payload']! as String,
        )['prediction'],
        'Six faces',
      );
    },
  );

  test(
    'guest, account A and B have separate records and no guest queue transfer',
    () async {
      await save('a');
      sessions.logout();
      final guest = sessions.current;
      await save('guest');
      expect(await pending(), hasLength(1));
      sessions.bindUser(userId: ownerB, sessionId: 'session-b');
      await save('b');
      expect((await outbox.read(sessions.current)).valueOrNull?.pending, 1);
      expect(
        (await shared.readCompletedSolo(sessions.current))
            .valueOrNull!
            .single
            .attemptId,
        'b',
      );
      sessions.logout();
      expect(sessions.current.partition, guest.partition);
      expect(
        (await shared.readCompletedSolo(sessions.current))
            .valueOrNull!
            .single
            .attemptId,
        'guest',
      );
      expect((await pending()).map((r) => r['owner_id']).toSet(), {
        ownerA,
        ownerB,
      });
    },
  );

  test(
    'full binding change during append rolls back the writer transaction',
    () async {
      final actual = outbox;
      writer.dispose();
      records(
        appender: _AfterAppend(actual, () {
          sessions.changeScope('new-module');
          return const Success(null);
        }),
      );
      final result = await writer.saveCompletedSolo(
        actor: sessions.current,
        record: _solo('stale'),
      );
      expect(result.failureOrNull?.code, FailureCode.stale);
      expect(await pending(), isEmpty);
      expect(
        await db.query('SELECT * FROM ${FormativeSchema.completedSolo}'),
        isEmpty,
      );
    },
  );

  test('a new epoch save waits for an old identical intent then commits for the current actor', () async {
    final entered = Completer<void>(), release = Completer<void>();
    var writes = 0;
    final delayed = SyncFormativeRecordWriter(
      delegate: _BeforeSolo(shared, () async {
        if (writes++ == 0) {
          entered.complete();
          await release.future;
        }
      }),
      sessions: sessions,
      outbox: outbox,
    );
    try {
      final oldActor = sessions.current, record = _solo('new-epoch');
      final oldSave = delayed.saveCompletedSolo(
        actor: oldActor,
        record: record,
      );
      await entered.future;
      sessions.changeScope('new-solo-screen');
      final actor = sessions.current;
      final currentSave = delayed.saveCompletedSolo(
        actor: actor,
        record: record,
      );
      release.complete();
      expect((await oldSave).failureOrNull?.code, FailureCode.stale);
      final saved = await currentSave;
      expect(saved.valueOrNull?.actor, actor);
      expect(saved.valueOrNull?.durable, isTrue);
      expect(writes, 2);
      expect(await pending(), hasLength(1));
      expect(
        await db.query('SELECT * FROM ${SyncReceiptSchema.soloReceipts}'),
        hasLength(1),
      );
    } finally {
      delayed.dispose();
    }
  });

  test(
    'normalizer rejects secrets/unknown kinds and malformed business fields',
    () {
      expect(
        () => FormativeEvent(
          id: 'x',
          kind: FormativeEventKind.solo,
          payload: {..._solo('x').toJson(), 'access_token': 'fixture-secret'},
        ),
        throwsArgumentError,
      );
      expect(
        CompletedSoloRecord.fromJson({..._solo('x').toJson(), 'mode': 'duel'})
            .isSuccess,
        isFalse,
      );
      expect(
        CompletedSoloRecord.fromJson({..._solo('x').toJson(), 'score': 100})
            .isSuccess,
        isFalse,
      );
    },
  );

  for (final bad in <String, Object?>{
    'missing': null,
    'empty': <String>[],
    'duplicate': 'duplicate',
    'foreign': <String>['not-in-batch'],
    'wrong-type': 'not-an-array',
  }.entries) {
    test(
      '${bad.key} acknowledgement retains every event and uses bounded backoff',
      () async {
        await save('one');
        await save('two');
        gateway.reply = (_, args, _) async {
          final ids = _ids(args);
          return Success(
            CloudReply(
              data: {
                if (bad.key != 'missing')
                  'accepted': bad.value == 'duplicate'
                      ? [ids.first, ids.first]
                      : bad.value,
                'records': <Object?>[],
              },
            ),
          );
        };
        final sync = controller();
        await sync.wake();
        expect(await pending(), hasLength(2));
        expect(sync.state.status, FormativeSyncStatus.pending);
        expect(sync.state.nextRetry, isNotNull);
      },
    );
  }

  test('partial acknowledgement deletes only accepted IDs and permanent rejection stops the rest', () async {
    await save('one');
    await save('two');
    gateway.reply = (_, args, _) async {
      final ids = _ids(args);
      return Success(
        CloudReply(
          data: {
            'accepted': [ids.first],
            'rejected': [
              {'id': ids.last, 'code': 'id_conflict'},
            ],
            'records': <Object?>[],
          },
        ),
      );
    };
    final sync = controller();
    await sync.wake();
    expect(await pending(), hasLength(1));
    expect(sync.state.pending, 1);
    expect(sync.state.status, FormativeSyncStatus.blocked);
    await save('new');
    await sync.wake();
    await sync.wake(userInitiated: true);
    expect(gateway.calls, hasLength(1));
    expect(sync.state.status, FormativeSyncStatus.blocked);
  });

  test(
    'invalid rejection IDs reject the whole acknowledgement before deletion',
    () async {
      await save('one');
      gateway.reply = (_, args, _) async => Success(
        CloudReply(
          data: {
            'accepted': _ids(args),
            'rejected': [
              {'id': 'foreign', 'code': 'invalid_event'},
            ],
            'records': <Object?>[],
          },
        ),
      );
      await controller().wake();
      expect(await pending(), hasLength(1));
    },
  );

  test('an explicitly null rejection list invalidates accepted IDs', () async {
    await save('one');
    gateway.reply = (_, args, _) async => Success(
      CloudReply(
        data: {
          'accepted': _ids(args),
          'rejected': null,
          'records': <Object?>[],
        },
      ),
    );
    await controller().wake();
    expect(await pending(), hasLength(1));
  });

  test(
    'batch max20, exact retry IDs, and partial success delay are preserved',
    () async {
      for (var i = 0; i < 23; i++) {
        await save('attempt:$i');
      }
      final sync = controller();
      await sync.wake();
      expect(_ids(gateway.calls.first.parameters), hasLength(20));
      expect(await pending(), hasLength(3));
      await sync.wake(userInitiated: true);
      expect(gateway.calls, hasLength(1));
      clock.advance(const Duration(seconds: 2));
      await sync.wake();
      expect(_ids(gateway.calls.last.parameters), hasLength(3));
      expect(await pending(), isEmpty);
      expect(sync.state.status, FormativeSyncStatus.synced);
      expect(
        (await shared.readCompletedSolo(sessions.current)).valueOrNull,
        hasLength(23),
      );
    },
  );

  test('Retry-After survives manual wakes and finite retry budget stays stopped on new records', () async {
    await save('one');
    gateway.reply = (_, _, _) async => const Failed(
      AppFailure(
        code: FailureCode.retryAfter,
        message: 'fixture limited',
        retryAfter: Duration(minutes: 10),
      ),
    );
    final sync = controller();
    await sync.wake();
    expect(
      sync.state.nextRetry!.difference(clock.now()),
      const Duration(minutes: 10),
    );
    await sync.wake(userInitiated: true);
    expect(gateway.calls, hasLength(1));
    for (var i = 0; i < 4; i++) {
      clock.advance(const Duration(minutes: 10));
      await sync.wake();
    }
    expect(gateway.calls, hasLength(5));
    expect(sync.state.status, FormativeSyncStatus.stopped);
    await save('two');
    clock.advance(const Duration(minutes: 10));
    await sync.wake();
    expect(gateway.calls, hasLength(5));
    expect(sync.state.status, FormativeSyncStatus.stopped);
    await sync.wake(userInitiated: true);
    expect(gateway.calls, hasLength(6));
    expect(
      _ids(gateway.calls.first.parameters).first,
      _ids(gateway.calls[4].parameters).first,
    );
  });

  test('native Auth HTTP503 preserves pending and foreground retries the same event after Retry-After', () async {
    final wire = _AuthWire(outages: 1);
    final auth = await signIn(wire);
    await save('outage-recovery');
    final original = await pending();
    final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
    final sync = FormativeSyncController(
      outbox: outbox,
      gateway: auth,
      sessions: sessions,
      writer: writer,
      lifecycle: lifecycle,
      clock: clock,
      random: _Random(),
    );
    controllers.add(sync);
    try {
      await sync.wake();
      expect(sync.state.status, FormativeSyncStatus.pending);
      expect(sync.state.attempts, 1);
      expect(
        sync.state.nextRetry!.difference(clock.now()),
        const Duration(seconds: 3),
      );
      expect(await pending(), original);
      await sync.wake(userInitiated: true);
      expect(wire.pushes, hasLength(1));
      lifecycle.setPhase(AppLifecyclePhase.background);
      clock.advance(const Duration(seconds: 3));
      lifecycle.setPhase(AppLifecyclePhase.foreground);
      await sync.wake();
      expect(sync.state.status, FormativeSyncStatus.synced);
      expect(await pending(), isEmpty);
      expect(wire.pushes, hasLength(2));
      expect(wire.pushes.last.body, wire.pushes.first.body);
      expect((await shared.readCompletedSolo(sessions.current)).valueOrNull, [
        _solo('outage-recovery'),
      ]);
    } finally {
      sync.dispose();
      lifecycle.dispose();
    }
  });

  test('native Auth HTTP503 exhausts a finite retry budget and explicit recovery replays the original event', () async {
    final wire = _AuthWire(outages: 5);
    final auth = await signIn(wire);
    await save('bounded-outage');
    final original = await pending();
    final sync = FormativeSyncController(
      outbox: outbox,
      gateway: auth,
      sessions: sessions,
      writer: writer,
      clock: clock,
      random: _Random(),
      autoStart: false,
    );
    controllers.add(sync);
    for (var attempt = 1; attempt <= 5; attempt++) {
      await sync.wake();
      expect(wire.pushes, hasLength(attempt));
      expect(sync.state.attempts, attempt);
      expect(
        sync.state.status,
        attempt == 5
            ? FormativeSyncStatus.stopped
            : FormativeSyncStatus.pending,
      );
      expect(await pending(), original);
      clock.advance(sync.state.nextRetry!.difference(clock.now()));
    }
    await sync.wake();
    expect(wire.pushes, hasLength(5));
    await sync.wake(userInitiated: true);
    expect(sync.state.status, FormativeSyncStatus.synced);
    expect(await pending(), isEmpty);
    expect(wire.pushes, hasLength(6));
    expect(
      wire.pushes.map((request) => request.body),
      everyElement(equals(wire.pushes.first.body)),
    );
  });

  for (final example in <String, FormativeSyncStatus>{
    'session-expired': FormativeSyncStatus.needsAuth,
    'PGRST202': FormativeSyncStatus.unavailable,
    'invalid_event': FormativeSyncStatus.blocked,
  }.entries) {
    test(
      '${example.key} retains pending and stops automatic retry across enqueue',
      () async {
        await save('one');
        gateway.reply = (_, _, _) async => Success(
          CloudReply(
            data: {
              'error': {'code': example.key},
            },
          ),
        );
        final sync = controller();
        await sync.wake();
        expect(sync.state.status, example.value);
        await save('two');
        clock.advance(const Duration(days: 1));
        await sync.wake();
        expect(gateway.calls, hasLength(1));
        expect(await pending(), hasLength(2));
        expect(sync.state.status, example.value);
      },
    );
  }

  test(
    'an HTTP5xx remains transient even with a permanent-looking code',
    () async {
      await save('one');
      gateway.reply = (_, _, _) async => Success(
        CloudReply(
          statusCode: 503,
          data: {
            'error': {'code': 'id_conflict'},
          },
        ),
      );
      final sync = controller();
      await sync.wake();
      expect(sync.state.status, FormativeSyncStatus.pending);
    },
  );

  test(
    'acknowledgement SQLite failure retains immutable events for replay',
    () async {
      await save('one');
      await db.transaction(
        (tx) => tx.execute(
          'CREATE TRIGGER deny_ack BEFORE DELETE ON formative_outbox '
          "BEGIN SELECT RAISE(ABORT, 'fixture denied'); END",
        ),
      );
      final sync = controller();
      await sync.wake();
      expect(sync.state.status, FormativeSyncStatus.storageFailed);
      expect(await pending(), hasLength(1));
      await db.transaction((tx) => tx.execute('DROP TRIGGER deny_ack'));
      await sync.wake(userInitiated: true);
      expect(await pending(), isEmpty);
      expect(
        _ids(gateway.calls.first.parameters),
        _ids(gateway.calls.last.parameters),
      );
    },
  );

  for (final change in ['account', 'session', 'scope', 'logout-return']) {
    test(
      '$change during send ignores stale ack and preserves owner queue',
      () async {
        await save('one');
        final entered = Completer<void>(),
            release = Completer<Result<CloudReply>>();
        gateway.reply = (_, _, _) {
          entered.complete();
          return release.future;
        };
        final sync = controller(), actor = sessions.current;
        final flight = sync.wake();
        await entered.future;
        switch (change) {
          case 'account':
            sessions.bindUser(userId: ownerB, sessionId: 'session-b');
          case 'session':
            sessions.bindUser(userId: ownerA, sessionId: 'replacement');
          case 'scope':
            sessions.changeScope('another-screen');
          case 'logout-return':
            sessions.logout();
            sessions.bindUser(userId: ownerA, sessionId: 'session-a');
        }
        release.complete(
          Success(
            CloudReply(
              data: {
                'accepted': _ids(gateway.calls.single.parameters),
                'records': <Object?>[],
              },
            ),
          ),
        );
        await flight;
        expect(await pending(), hasLength(1));
        expect(sync.state.actor, sessions.current);
        expect(sync.state.actor, isNot(actor));
      },
    );
  }

  test(
    'dispose during send prevents acknowledgement and all later emissions',
    () async {
      await save('one');
      final entered = Completer<void>(),
          release = Completer<Result<CloudReply>>();
      gateway.reply = (_, _, _) {
        entered.complete();
        return release.future;
      };
      final sync = controller();
      var emissions = 0;
      sync.addListener(() => emissions++);
      final flight = sync.wake();
      await entered.future;
      sync.dispose();
      final stoppedAt = emissions;
      release.complete(
        Success(
          CloudReply(
            data: {
              'accepted': _ids(gateway.calls.single.parameters),
              'records': <Object?>[],
            },
          ),
        ),
      );
      await flight;
      await sync.wake(userInitiated: true);
      expect(await pending(), hasLength(1));
      expect(emissions, stoppedAt);
      expect(gateway.calls, hasLength(1));
    },
  );

  test('background invalidates a flight and foreground replays the same durable IDs', () async {
    await save('one');
    final entered = Completer<void>(),
        release = Completer<Result<CloudReply>>();
    gateway.reply = (_, _, _) {
      entered.complete();
      return release.future;
    };
    final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
    final sync = controller(lifecycle: lifecycle), flight = sync.wake();
    await entered.future;
    lifecycle.setPhase(AppLifecyclePhase.background);
    release.complete(
      Success(
        CloudReply(
          data: {
            'accepted': _ids(gateway.calls.single.parameters),
            'records': <Object?>[],
          },
        ),
      ),
    );
    await flight;
    expect(await pending(), hasLength(1));
    gateway.reply = _Gateway.accept;
    lifecycle.setPhase(AppLifecyclePhase.foreground);
    await sync.wake();
    expect(await pending(), isEmpty);
    expect(
      _ids(gateway.calls.first.parameters),
      _ids(gateway.calls.last.parameters),
    );
    sync.dispose();
    lifecycle.dispose();
  });

  test('returned reflections reconcile monotonically into the shared reader without an echo event', () async {
    final completed = _reflection(completed: true);
    await writer.saveReflection(actor: sessions.current, reflection: completed);
    gateway.reply = (_, args, _) async => Success(
      CloudReply(
        data: {
          'accepted': _ids(args),
          'records': [_reflection().toJson()],
        },
      ),
    );
    await controller().wake();
    expect(
      (await shared.watchReflections(sessions.current).first).valueOrNull,
      [completed],
    );
    expect(await pending(), isEmpty);
  });

  test(
    'wakes coalesce and a new durable save during send remains scheduled',
    () async {
      await save('first');
      final entered = Completer<void>(),
          release = Completer<Result<CloudReply>>();
      gateway.reply = (_, _, _) {
        entered.complete();
        return release.future;
      };
      final sync = FormativeSyncController(
        outbox: outbox,
        gateway: gateway,
        sessions: sessions,
        writer: writer,
        clock: clock,
        random: _Random(),
      );
      controllers.add(sync);
      await entered.future;
      final first = sync.wake(), second = sync.wake();
      expect(identical(first, second), isTrue);
      await save('while-sending');
      release.complete(
        Success(
          CloudReply(
            data: {
              'accepted': _ids(gateway.calls.single.parameters),
              'records': <Object?>[],
            },
          ),
        ),
      );
      await first;
      await second;
      expect(gateway.calls, hasLength(1));
      expect(await pending(), hasLength(1));
      expect(sync.state.nextRetry, isNotNull);
      gateway.reply = _Gateway.accept;
      clock.advance(const Duration(seconds: 2));
      await sync.wake();
      expect(await pending(), isEmpty);
      expect(gateway.calls, hasLength(2));
    },
  );

  test(
    'an access denial invalidates an older successful push response',
    () async {
      await save('one');
      final entered = Completer<void>(),
          release = Completer<Result<CloudReply>>();
      gateway.reply = (_, args, _) {
        if (args['action'] == 'push') {
          entered.complete();
          return release.future;
        }
        return Future.value(
          Success(
            CloudReply(
              data: {
                'error': {'code': 'session-expired'},
              },
            ),
          ),
        );
      };
      final sync = controller(), flight = sync.wake();
      await entered.future;
      expect(
        (await sync.readHistory()).failureOrNull?.code,
        FailureCode.unauthorized,
      );
      release.complete(
        Success(
          CloudReply(
            data: {
              'accepted': _ids(gateway.calls.first.parameters),
              'records': <Object?>[],
            },
          ),
        ),
      );
      await flight;
      expect(await pending(), hasLength(1));
      expect(sync.state.status, FormativeSyncStatus.needsAuth);
    },
  );

  test(
    'a permanent push rejection invalidates an older history success',
    () async {
      await save('one');
      final entered = Completer<void>(),
          release = Completer<Result<CloudReply>>();
      gateway.reply = (_, args, _) {
        if (args['action'] == 'history') {
          entered.complete();
          return release.future;
        }
        return Future.value(
          Success(
            CloudReply(
              data: {
                'error': {'code': 'id_conflict'},
              },
            ),
          ),
        );
      };
      final sync = controller(), history = sync.readHistory();
      await entered.future;
      await sync.wake();
      release.complete(
        Success(
          CloudReply(data: {'attempts': <Object?>[], 'records': <Object?>[]}),
        ),
      );
      expect((await history).failureOrNull?.code, FailureCode.stale);
      expect(sync.state.status, FormativeSyncStatus.blocked);
      expect(await pending(), hasLength(1));
    },
  );

  test(
    'cached history rechecks full binding before returning and after disposal',
    () async {
      gateway.reply = (_, _, _) async => Success(
        CloudReply(data: {'attempts': <Object?>[], 'records': <Object?>[]}),
      );
      final sync = controller();
      expect((await sync.readHistory()).isSuccess, isTrue);
      final cached = sync.readHistory();
      sessions.changeScope('history-left');
      expect((await cached).failureOrNull?.code, FailureCode.stale);
      sync.dispose();
      expect((await sync.readHistory()).failureOrNull?.code, FailureCode.stale);
      expect(gateway.calls, hasLength(1));
    },
  );

  for (final status in [200, 429]) {
    test(
      'history refresh honors Retry-After from HTTP$status before another request',
      () async {
        gateway.reply = (_, _, _) async => Success(
          CloudReply(
            data: {'attempts': <Object?>[], 'records': <Object?>[]},
            statusCode: status,
            retryAfter: const Duration(minutes: 10),
          ),
        );
        final sync = controller();
        expect((await sync.readHistory()).isSuccess, status == 200);
        clock.advance(const Duration(minutes: 1));
        final deferred = await sync.readHistory(refresh: true);
        expect(deferred.failureOrNull?.code, FailureCode.retryAfter);
        expect(deferred.failureOrNull?.retryAfter, const Duration(minutes: 9));
        expect(gateway.calls, hasLength(1));
        clock.advance(const Duration(minutes: 9));
        gateway.reply = (_, _, _) async => Success(
          CloudReply(data: {'attempts': <Object?>[], 'records': <Object?>[]}),
        );
        expect((await sync.readHistory(refresh: true)).isSuccess, isTrue);
        expect(gateway.calls, hasLength(2));
      },
    );
  }

  test('history refresh honors Retry-After from pending delivery', () async {
    await save('throttled');
    gateway.reply = (_, _, _) async => Success(
      CloudReply(
        data: const {},
        statusCode: 429,
        retryAfter: const Duration(minutes: 10),
      ),
    );
    final sync = controller();
    await sync.wake();
    final deferred = await sync.readHistory(refresh: true);
    expect(deferred.failureOrNull?.code, FailureCode.retryAfter);
    expect(deferred.failureOrNull?.retryAfter, const Duration(minutes: 10));
    expect(gateway.calls, hasLength(1));
    expect(await pending(), hasLength(1));
    expect(sync.state.status, FormativeSyncStatus.pending);
  });

  test(
    'history cooldown result rechecks the binding before delivery',
    () async {
      gateway.reply = (_, _, _) async => Success(
        CloudReply(
          data: const {},
          statusCode: 429,
          retryAfter: const Duration(minutes: 10),
        ),
      );
      final sync = controller();
      await sync.readHistory();
      final deferred = sync.readHistory(refresh: true);
      sessions.changeScope('history-left');
      expect((await deferred).failureOrNull?.code, FailureCode.stale);
      expect(gateway.calls, hasLength(1));
    },
  );

  test('history coalesces, has a short binding cache, and denial clears cached success', () async {
    gateway.reply = (_, _, _) async => Success(
      CloudReply(
        data: {
          'attempts': [
            {
              'payload': _solo('remote').toJson(),
              'source': 'offline-self-study',
              'verified': false,
              'received_at': '2026-11-05T12:00:00Z',
            },
          ],
          'records': <Object?>[],
        },
      ),
    );
    final sync = controller();
    final first = sync.readHistory(), second = sync.readHistory();
    expect(identical(first, second), isTrue);
    expect((await first).valueOrNull!.attempts.single.attemptId, 'remote');
    await second;
    await sync.readHistory();
    expect(gateway.calls, hasLength(1));
    gateway.reply = (_, _, _) async => Success(
      CloudReply(
        data: {
          'error': {'code': 'session-expired'},
        },
      ),
    );
    expect(
      (await sync.readHistory(refresh: true)).failureOrNull?.code,
      FailureCode.unauthorized,
    );
    await sync.readHistory();
    expect(gateway.calls, hasLength(3));
    expect(sync.state.status, FormativeSyncStatus.needsAuth);
  });
}

ModuleReflection _reflection({
  String prediction = 'Six faces',
  bool completed = false,
}) => ModuleReflection.create(
  activity: ModuleActivity.net,
  stage: completed ? ReflectionStage.explanation : ReflectionStage.prediction,
  prediction: prediction,
  result: completed ? 'No overlap' : '',
  explanation: completed ? 'Edges meet' : '',
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
  'elapsed_ms': 1000,
}).valueOrNull!;

List<String> _ids(Map<String, Object?> parameters) =>
    (((parameters['payload']! as Map)['events']! as List).map(
      (e) => (e as Map)['id']! as String,
    )).toList();

/// Explicit transport fixture; production always uses the Auth gateway.
final class _Gateway implements CloudGateway {
  _Gateway(this.sessions);
  @override
  final AuthSession sessions;
  @override
  bool configured = true;
  final calls = <_Call>[];
  Future<Result<CloudReply>> Function(
    String,
    Map<String, Object?>,
    ActorBinding,
  )
  reply = accept;
  static Future<Result<CloudReply>> accept(
    String name,
    Map<String, Object?> args,
    ActorBinding actor,
  ) async => Success(
    CloudReply(data: {'accepted': _ids(args), 'records': <Object?>[]}),
  );
  @override
  Future<Result<CloudReply>> rpc({
    required String name,
    required Map<String, Object?> parameters,
    required ActorBinding actor,
  }) {
    calls.add(_Call(name, parameters, actor));
    return reply(name, parameters, actor);
  }
}

final class _Call {
  _Call(this.name, this.parameters, this.actor);
  final String name;
  final Map<String, Object?> parameters;
  final ActorBinding actor;
}

final class _Clock implements Clock {
  DateTime value = DateTime.utc(2026, 11, 5, 12);
  void advance(Duration delay) => value = value.add(delay);
  @override
  DateTime now() => value;
  @override
  int monotonicMilliseconds() => value.millisecondsSinceEpoch;
}

final class _Random implements RandomSource {
  @override
  double nextDouble() => 0;
  @override
  int nextInt(int maximum) => 0;
}

final class _AfterAppend implements FormativeOutboxAppender {
  _AfterAppend(this.actual, this.after);
  final FormativeOutboxAppender actual;
  final Result<void> Function() after;
  @override
  Future<Result<void>> append({
    required AppTransaction transaction,
    required ActorBinding actor,
    required FormativeEvent event,
  }) async {
    final result = await actual.append(
      transaction: transaction,
      actor: actor,
      event: event,
    );
    return result.isSuccess ? after() : result;
  }
}

final class _BeforeSolo implements FormativeRecordWriter {
  _BeforeSolo(this.delegate, this.before);
  final FormativeRecordWriter delegate;
  final Future<void> Function() before;
  @override
  Future<Result<DurableRecordReceipt>> saveCompletedSolo({
    required ActorBinding actor,
    required CompletedSoloRecord record,
  }) async {
    await before();
    return delegate.saveCompletedSolo(actor: actor, record: record);
  }

  @override
  Future<Result<DurableRecordReceipt>> saveReflection({
    required ActorBinding actor,
    required ModuleReflection reflection,
  }) => delegate.saveReflection(actor: actor, reflection: reflection);
}

/// Scripted Auth HTTP seam only. The real native credential owner, RPC adapter,
/// SQLite outbox, and sync controller participate; no hosted request is made.
final class _AuthWire implements AuthTransport {
  _AuthWire({required this.outages});
  int outages;
  final pushes = <AuthRequest>[];

  @override
  Future<AuthResponse> send(AuthRequest request) async {
    switch (request.uri.path) {
      case '/functions/v1/geodecoder-auth':
        final claims = base64Url
            .encode(
              utf8.encode(
                jsonEncode({
                  'sub': ownerA,
                  'session_id': 'fixture-auth-session',
                  'exp': 2200000000,
                }),
              ),
            )
            .replaceAll('=', '');
        return AuthResponse(200, {
          'session': {
            'access_token': 'fixture.$claims.signature',
            'refresh_token': 'fixture-refresh',
            'user': {'id': ownerA},
          },
        });
      case '/auth/v1/user':
        return const AuthResponse(200, {
          'id': ownerA,
          'email': 'fixture@example.com',
          'app_metadata': {
            'providers': ['email'],
          },
        });
      case '/rest/v1/rpc/geo_offline_sync':
        expect(request.body!['action'], 'push');
        pushes.add(request);
        if (outages > 0) {
          outages--;
          return const AuthResponse(503, {
            'message': 'Scripted service outage',
          }, retryAfter: '3');
        }
        return AuthResponse(200, {
          'accepted': _ids(request.body!),
          'records': <Object?>[],
        });
      default:
        throw StateError('Unexpected scripted Auth path.');
    }
  }

  @override
  void close() {}
}

final class _ProtectedStore implements SessionStore {
  String? value;
  @override
  Future<Result<String?>> read() async => Success(value);
  @override
  Future<Result<void>> write(String serializedSession) async {
    value = serializedSession;
    return const Success(null);
  }

  @override
  Future<Result<void>> clear() async {
    value = null;
    return const Success(null);
  }
}
