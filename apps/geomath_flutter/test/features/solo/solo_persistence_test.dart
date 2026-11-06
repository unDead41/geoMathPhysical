import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';
import 'package:geomath_flutter/core/records/local_formative_records.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/runtime/clock.dart';
import 'package:geomath_flutter/core/runtime/random_source.dart';
import 'package:geomath_flutter/core/session/actor_binding.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/core/storage/app_database.dart';
import 'package:geomath_flutter/core/storage/formative_schema.dart';
import 'package:geomath_flutter/core/storage/sqlite_app_database.dart';
import 'package:geomath_flutter/features/solo/solo_feature.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

class TestClock implements Clock {
  int milliseconds = 0;
  @override
  int monotonicMilliseconds() => milliseconds;
  @override
  DateTime now() =>
      DateTime.utc(2026, 11, 5).add(Duration(milliseconds: milliseconds));
}

class TestOutbox implements FormativeOutboxAppender {
  bool fail = false;
  @override
  Future<Result<void>> append({
    required AppTransaction transaction,
    required ActorBinding actor,
    required FormativeEvent event,
  }) async {
    await transaction.rawInsert(
      'INSERT INTO ${FormativeSchema.outbox} (partition, event_id, owner_id, kind, content_version, payload, created_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        actor.partition,
        event.id,
        actor.userId,
        event.kind.name,
        1,
        jsonEncode(event.payload),
        1,
      ],
    );
    return fail
        ? const Failed(
            AppFailure(
              code: FailureCode.storage,
              message: 'Injected transaction failure',
            ),
          )
        : const Success<void>(null);
  }
}

class DeniedDatabase implements AppDatabase {
  DeniedDatabase(this.delegate);
  final AppDatabase delegate;
  @override
  Future<T> transaction<T>(Future<T> Function(AppTransaction) action) =>
      Future.error(StateError('Storage denied'));
  @override
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> arguments = const [],
  ]) => delegate.query(sql, arguments);
  @override
  Stream<void> get changes => delegate.changes;
  @override
  Future<void> close() => Future.value();
}

class DelayedSoloWriter implements FormativeRecordWriter {
  DelayedSoloWriter(this.delegate);
  final FormativeRecordWriter delegate;
  final entered = Completer<void>(), release = Completer<void>();
  int calls = 0;
  @override
  Future<Result<DurableRecordReceipt>> saveCompletedSolo({
    required ActorBinding actor,
    required CompletedSoloRecord record,
  }) async {
    if (++calls == 1) {
      entered.complete();
      await release.future;
    }
    return delegate.saveCompletedSolo(actor: actor, record: record);
  }

  @override
  Future<Result<DurableRecordReceipt>> saveReflection({
    required ActorBinding actor,
    required ModuleReflection reflection,
  }) => delegate.saveReflection(actor: actor, reflection: reflection);
}

SoloBank bank() => SoloBank.fromExport(
  jsonDecode(File('assets/contracts/bank15.json').readAsStringSync())
      as Map<String, dynamic>,
);
SoloGame finished({
  SoloMode mode = SoloMode.quiz,
  int wrong = 0,
  int elapsed = 500,
}) {
  final game = SoloGame(
    bank: bank(),
    player: const {
      'name': 'Persistence QA',
      'category': 'Tetamu',
      'className': '',
    },
    random: DefaultRandomSource(Random(41)),
    mode: mode,
    questionIds: mode == SoloMode.review ? ['K1', 'C1'] : null,
  );
  var now = 0;
  while (game.status != SoloStatus.finished) {
    now += elapsed;
    if (game.index < wrong) {
      game.skip(now);
    } else {
      game.scan('solid', game.question.shape.name, 'r1', now);
      game.scan('net', game.question.shape.name, 'r2', now);
    }
    now += 1800;
    game.reviewing ? game.continueReview(now) : game.update(now);
  }
  return game;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();
  late Directory directory;
  late String path;
  late SqliteAppDatabase db;
  late SessionController sessions;
  late TestClock clock;
  late TestOutbox outbox;
  late LocalFormativeRecords writer;
  late SoloRepository repository;
  Future<SqliteAppDatabase> open() async => (await SqliteAppDatabase.open(
    path: path,
    factory: databaseFactoryFfi,
    migrations: soloMigrations(),
  )).valueOrNull!;
  void connect() {
    writer = LocalFormativeRecords(
      database: db,
      sessions: sessions,
      clock: clock,
      outbox: outbox,
    );
    repository = SoloRepository(
      database: db,
      sessions: sessions,
      writer: writer,
      clock: clock,
    );
  }

  setUp(() async {
    directory = await Directory.systemTemp.createTemp('geomath-solo-');
    path = '${directory.path}/solo.sqlite';
    db = await open();
    sessions = SessionController.guest(
      guestId: 'device-a',
      sessionId: 'launch-a',
    );
    clock = TestClock();
    outbox = TestOutbox();
    connect();
  });
  tearDown(() async {
    await db.close();
    await sessions.dispose();
    await directory.delete(recursive: true);
  });
  test('Home slot presence is owner-bound and does not validate or replace a saved attempt', () async {
    final actor = sessions.current;
    expect((await repository.hasLocalSlot(actor)).valueOrNull, isFalse);
    await db.transaction(
      (tx) => tx.rawInsert(
        'INSERT INTO solo_checkpoints (partition, payload) VALUES (?, ?)',
        [actor.partition, '{recovery-required'],
      ),
    );
    expect((await repository.hasLocalSlot(actor)).valueOrNull, isTrue);
    expect(
      (await repository.read(actor, bank())).failureOrNull?.code,
      FailureCode.invalid,
    );
    expect(
      (await db.query('SELECT payload FROM solo_checkpoints'))
          .single['payload'],
      '{recovery-required',
    );
    sessions.bindUser(userId: 'owner-home', sessionId: 'owner-session');
    expect(
      (await repository.hasLocalSlot(sessions.current)).valueOrNull,
      isFalse,
    );
    expect(
      (await repository.hasLocalSlot(actor)).failureOrNull?.code,
      FailureCode.stale,
    );
  });
  test('real SQLite retains selected R1/R2 and never overwrites a slot without confirmation', () async {
    final actor = sessions.current,
        g = SoloGame(
          bank: bank(),
          player: const {
            'name': 'Saved QA',
            'category': 'Tetamu',
            'className': '',
          },
          random: DefaultRandomSource(Random(1)),
        );
    var slot = SoloSlot(
      id: 'attempt-a',
      partition: actor.partition,
      game: g.checkpoint(100).cast<String, dynamic>(),
      selected: g.solidOrder[0],
    );
    expect((await repository.save(actor, slot, create: true)).isSuccess, true);
    expect(
      (await repository.save(actor, slot, create: true)).failureOrNull?.code,
      FailureCode.conflict,
    );
    await db.close();
    db = await open();
    connect();
    expect(
      (await repository.read(actor, bank())).valueOrNull?.selected,
      g.solidOrder[0],
    );
    g.scan('solid', g.question.shape.name, 'r1', 200);
    slot = SoloSlot(
      id: 'attempt-a',
      partition: actor.partition,
      game: g.checkpoint(250).cast<String, dynamic>(),
      selected: g.netOrder[2],
    );
    expect((await repository.save(actor, slot)).isSuccess, true);
    await db.close();
    db = await open();
    connect();
    final restored = (await repository.read(actor, bank())).valueOrNull!;
    expect(restored.selected, g.netOrder[2]);
    expect(restored.game['state']['stage'], 'net');
  });
  test('owner/guest isolation, corrupt/schema/bank mismatch and stale writes have distinct failures', () async {
    final actor = sessions.current, g = finished();
    final slot = SoloSlot(
      id: 'attempt-a',
      partition: actor.partition,
      game: g.checkpoint(99999).cast<String, dynamic>(),
    );
    await repository.save(actor, slot);
    sessions.bindUser(
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      sessionId: 'a',
    );
    expect(
      (await repository.read(sessions.current, bank())).valueOrNull,
      isNull,
    );
    expect(
      (await repository.save(actor, slot)).failureOrNull?.code,
      FailureCode.stale,
    );
    sessions.logout();
    final guest = sessions.current;
    expect(guest.partition, actor.partition);
    for (final payload in [
      '{broken',
      jsonEncode({...slot.toJson(), 'schema': 0}),
      jsonEncode({
        ...slot.toJson(),
        'game': {...slot.game, 'bank': 'old'},
      }),
    ]) {
      await db.transaction(
        (tx) => tx.rawInsert(
          'INSERT OR REPLACE INTO solo_checkpoints VALUES (?, ?)',
          [guest.partition, payload],
        ),
      );
      expect(
        (await repository.read(guest, bank())).failureOrNull?.code,
        FailureCode.invalid,
      );
    }
  });
  test('duplicate completed finalization creates one shared record/event and preserves original analysis', () async {
    sessions.bindUser(
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      sessionId: 'a',
    );
    final actor = sessions.current, g = finished(wrong: 2);
    final a = await repository.finalize(actor, g, 'immutable-a', 1000);
    final b = await repository.finalize(actor, g, 'immutable-a', 1000);
    expect(a.isSuccess, true);
    expect(b.isSuccess, true);
    expect((await writer.readCompletedSolo(actor)).valueOrNull!.length, 1);
    expect(
      (await db.query('SELECT * FROM ${FormativeSchema.outbox}')).length,
      1,
    );
    expect(
      (await db.query('SELECT * FROM solo_analysis WHERE finalized=1')).length,
      1,
    );
    expect(
      (await repository.finalize(
        actor,
        finished(),
        'immutable-a',
        1000,
      )).failureOrNull?.code,
      FailureCode.conflict,
    );
    expect(
      (await repository.leaderboard(actor, bank())).valueOrNull!.single.score,
      8,
    );
    await repository.finalize(
      actor,
      finished(mode: SoloMode.review),
      'review-a',
      2000,
    );
    await repository.finalize(
      actor,
      finished(mode: SoloMode.practice),
      'practice-a',
      3000,
    );
    expect(
      (await repository.leaderboard(actor, bank())).valueOrNull!.length,
      1,
    );
    expect(
      (await repository.leaderboard(actor, bank())).valueOrNull!.single.score,
      8,
    );
  });
  test('shared writer failure rolls back aggregate and outbox; analysis remains unfinalized until retry', () async {
    sessions.bindUser(
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      sessionId: 'a',
    );
    final actor = sessions.current, g = finished();
    outbox.fail = true;
    expect(
      (await repository.finalize(actor, g, 'retry-a', 1000)).isSuccess,
      false,
    );
    expect(
      await db.query('SELECT * FROM ${FormativeSchema.completedSolo}'),
      isEmpty,
    );
    expect(await db.query('SELECT * FROM ${FormativeSchema.outbox}'), isEmpty);
    expect((await repository.leaderboard(actor, bank())).valueOrNull, isEmpty);
    outbox.fail = false;
    expect(
      (await repository.finalize(actor, g, 'retry-a', 1000)).isSuccess,
      true,
    );
    expect(
      (await repository.leaderboard(actor, bank())).valueOrNull!.single.score,
      10,
    );
  });
  test('leaderboard keeps best50; finalizing a pruned result never creates another record/event', () async {
    sessions.bindUser(
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      sessionId: 'a',
    );
    final actor = sessions.current;
    final best = finished(), low = finished(wrong: 5);
    await repository.finalize(actor, best, 'best-old', 1);
    for (var i = 0; i < 52; i++) {
      await repository.finalize(actor, low, 'low-$i', i + 2);
    }
    final board = (await repository.leaderboard(actor, bank())).valueOrNull!;
    expect(board.length, 50);
    expect(board.first.id, 'best-old');
    expect((await writer.readCompletedSolo(actor)).valueOrNull!.length, 50);
    final originalEvents = await db.query(
      'SELECT * FROM ${FormativeSchema.outbox}',
    );
    expect(originalEvents.length, 53);
    expect(
      (await writer.readCompletedSolo(actor)).valueOrNull!
          .any((record) => record.attemptId == 'best-old'),
      false,
    );
    await db.close();
    db = await open();
    connect();
    final repeated = await repository.finalize(actor, best, 'best-old', 1);
    expect(repeated.valueOrNull?.durable, true);
    expect(repeated.valueOrNull?.state, FormativeSaveState.pending);
    expect(
      await db.query('SELECT * FROM ${FormativeSchema.outbox}'),
      originalEvents,
    );
    expect(
      (await writer.readCompletedSolo(actor)).valueOrNull!
          .any((record) => record.attemptId == 'best-old'),
      false,
    );
    sessions.bindUser(
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      sessionId: 'b',
    );
    expect(
      (await repository.leaderboard(sessions.current, bank())).valueOrNull,
      isEmpty,
    );
  });
  test('a pending finalization from the previous actor cannot suppress the new actor result', () async {
    final guest = sessions.current;
    final guestGame = finished(), ownerGame = finished(wrong: 2);
    await repository.save(
      guest,
      SoloSlot(
        id: 'switch-guest',
        partition: guest.partition,
        game: guestGame.checkpoint(99999).cast<String, dynamic>(),
        completedAt: 1000,
      ),
    );
    sessions.bindUser(
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      sessionId: 'owner',
    );
    await repository.save(
      sessions.current,
      SoloSlot(
        id: 'switch-owner',
        partition: sessions.current.partition,
        game: ownerGame.checkpoint(99999).cast<String, dynamic>(),
        completedAt: 2000,
      ),
    );
    sessions.logout();
    final delayed = DelayedSoloWriter(writer);
    final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
    final c = SoloController(
      repository: SoloRepository(
        database: db,
        sessions: sessions,
        writer: delayed,
        clock: clock,
      ),
      sessions: sessions,
      clock: clock,
      random: DefaultRandomSource(Random(81)),
      lifecycle: lifecycle,
      loadBank: () async => bank(),
    );
    await c.initialize();
    final guestResume = c.resumeSaved();
    await delayed.entered.future;
    sessions.bindUser(
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      sessionId: 'owner-new-session',
    );
    await c.initialize();
    expect(c.savedSlot?.id, 'switch-owner');
    final ownerResume = c.resumeSaved();
    delayed.release.complete();
    expect(await guestResume, false);
    expect(await ownerResume, true);
    expect(delayed.calls, 2);
    expect(c.attemptId, 'switch-owner');
    expect(c.receipt?.actor, sessions.current);
    expect(c.receipt?.recordId, 'switch-owner');
    expect(c.failure, isNull);
    expect(
      (await writer.readCompletedSolo(sessions.current))
          .valueOrNull!
          .single
          .attemptId,
      'switch-owner',
    );
    c.dispose();
    lifecycle.dispose();
  });
  test('controller lifecycle pauses, resume is explicit, and failure blocks leaving', () async {
    final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
    final c = SoloController(
      repository: repository,
      sessions: sessions,
      clock: clock,
      random: DefaultRandomSource(Random(1)),
      lifecycle: lifecycle,
      loadBank: () async => bank(),
    );
    await c.initialize();
    expect(await c.start(name: 'Controller QA'), true);
    clock.milliseconds = 500;
    lifecycle.setPhase(AppLifecyclePhase.background);
    clock.milliseconds = 50000;
    expect(c.game!.time(c.now), 500);
    lifecycle.setPhase(AppLifecyclePhase.foreground);
    expect(c.game!.paused, true);
    c.resume();
    clock.milliseconds = 50100;
    expect(c.game!.time(c.now), 600);
    expect(await c.checkpoint(), true);
    c.dispose();
    lifecycle.dispose();
    final denied = SoloRepository(
      database: DeniedDatabase(db),
      sessions: sessions,
      writer: writer,
      clock: clock,
    );
    final phase = AppLifecycleController(observeWidgetsBinding: false);
    final r = SoloController(
      repository: denied,
      sessions: sessions,
      clock: clock,
      random: DefaultRandomSource(Random(3)),
      lifecycle: phase,
      loadBank: () async => bank(),
    );
    await r.initialize();
    expect(await r.resumeSaved(), true);
    expect(r.saved, true);
    final leaving = r.leave();
    expect(r.saved, false);
    expect(await leaving, false);
    expect(r.saved, false);
    expect(r.game, isNotNull);
    expect(r.failure?.code, FailureCode.storage);
    r.dispose();
    phase.dispose();
  });
  test('actor switch during active game clears selected state and never adopts old attempt', () async {
    final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
    final c = SoloController(
      repository: repository,
      sessions: sessions,
      clock: clock,
      random: DefaultRandomSource(Random(4)),
      lifecycle: lifecycle,
      loadBank: () async => bank(),
    );
    await c.initialize();
    await c.start(name: 'Actor QA');
    c.choose(c.game!.solidOrder.first);
    await c.checkpoint();
    final id = c.attemptId;
    sessions.bindUser(
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      sessionId: 'new',
    );
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(c.game, isNull);
    expect(c.selected, isNull);
    expect(c.attemptId, isNot(id));
    expect(c.savedSlot, isNull);
    c.dispose();
    lifecycle.dispose();
  });
  test('initialize coalesces one actor load and is idempotent for a live R2 engine', () async {
    final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
    final content = Completer<SoloBank>();
    var loads = 0;
    final c = SoloController(
      repository: repository,
      sessions: sessions,
      clock: clock,
      random: DefaultRandomSource(Random(71)),
      lifecycle: lifecycle,
      loadBank: () {
        loads++;
        return content.future;
      },
    );
    final first = c.initialize(), second = c.initialize();
    expect(identical(first, second), true);
    expect(
      c.loading,
      false,
      reason: 'Notification is deferred beyond the caller frame.',
    );
    await Future<void>.delayed(Duration.zero);
    expect(c.loading, true);
    expect(loads, 1);
    content.complete(bank());
    await Future.wait([first, second]);
    expect(c.loading, false);
    expect(await c.start(name: 'Reentry QA'), true);
    final game = c.game!, canonicalBank = c.bank, id = c.attemptId;
    c.choose(game.question.shape);
    c.scan('r1');
    c.choose(game.question.shape);
    c.hint();
    await c.checkpoint();
    final slot = c.savedSlot, order = game.netOrder;
    var notifications = 0;
    c.addListener(() => notifications++);
    await Future.wait([c.initialize(), c.initialize()]);
    expect(notifications, 0);
    expect(loads, 1);
    expect(identical(c.game, game), true);
    expect(identical(c.bank, canonicalBank), true);
    expect(identical(c.savedSlot, slot), true);
    expect(c.attemptId, id);
    expect(c.selected, game.question.shape);
    expect(game.stage, GeometryCardKind.net);
    expect(game.netOrder, order);
    expect(game.hints, 1);
    c.dispose();
    lifecycle.dispose();
  });
}
