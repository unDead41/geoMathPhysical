import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/production_features.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/runtime/random_source.dart';
import 'package:geomath_flutter/core/storage/formative_schema.dart';
import 'package:geomath_flutter/app/cloud_game_features.dart';
import 'package:geomath_flutter/features/learning/persistence/learning_reflection_controller.dart';
import 'package:geomath_flutter/features/solo/solo_feature.dart';
import 'package:geomath_flutter/features/sync/sync_feature.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../features/cloud_game/support/cloud_game_test_support.dart';

ModuleReflection _reflection(ModuleActivity activity) =>
    ModuleReflection.create(
      activity: activity,
      stage: ReflectionStage.explanation,
      prediction: 'Prediction',
      result: 'Observed result',
      explanation: 'Compared the observed result with the prediction',
      completed: true,
    ).valueOrNull!;

SoloGame _finishedQuiz() {
  final game = SoloGame(
    bank: SoloBank.fromExport(
      jsonDecode(File('assets/contracts/bank15.json').readAsStringSync())
          as Map<String, dynamic>,
    ),
    player: const {
      'name': 'Integrated QA',
      'category': 'Tetamu',
      'className': '',
    },
    random: DefaultRandomSource(Random(41)),
  );
  var now = 0;
  while (game.status != SoloStatus.finished) {
    now += 100;
    game.scan('solid', game.question.shape.name, 'r1', now);
    game.scan('net', game.question.shape.name, 'r2', now);
    now += 900;
    game.update(now);
  }
  return game;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();

  test(
    'learning and Solo borrow one transaction writer and one sync owner',
    () async {
      final app = await bootstrapCloudGameForTest(
        features: productionFeatures(),
      );
      addTearDown(app.dispose);
      final services = app.composition.services;
      final writer = services.get(FoundationServices.recordsWriter);
      final reflection = services.get(learningReflectionControllerKey);
      final solo = services.get(SoloServices.repository);
      expect(writer, same(services.get(SyncServices.writer)));
      expect(reflection.writer, same(writer));
      expect(solo.writer, same(writer));
      expect(
        reflection.reader,
        same(services.get(FoundationServices.recordsReader)),
      );
      expect(
        services.get(FoundationExtensions.formativeOutbox),
        same(services.get(SyncServices.outbox)),
      );
      final startup = services.get(CloudGamePreviewServices.startup);
      final ready = startup.ready;
      expect(startup.ready, same(ready));
      expect((await ready).isSuccess, isTrue);
      expect(
        services.get(SyncServices.controller),
        same(services.get(SyncServices.controller)),
      );
      final namespaces = app.composition.migrations.contributions.map(
        (m) => m.id,
      );
      expect(
        namespaces.where((id) => id == 'learning_checkpoints:1'),
        hasLength(1),
      );
      expect(namespaces.where((id) => id == 'solo:1'), hasLength(1));
      expect(namespaces.where((id) => id == 'sync:1'), hasLength(1));
      final tables = await app.database.query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%reflection%'",
      );
      expect(tables.map((row) => row['name']), [FormativeSchema.reflections]);
    },
  );

  test('learning reflection and finalized Solo share rollback, retry and durable outbox', () async {
    final directory = await Directory.systemTemp.createTemp(
      'geomath-integrated-records-',
    );
    addTearDown(() => directory.delete(recursive: true));
    final path = '${directory.path}/records.sqlite';
    final guestStore = TestGuestStore();
    var app = await bootstrapCloudGameForTest(
      features: productionFeatures(),
      databasePath: path,
      guestStore: guestStore,
    );
    addTearDown(() => app.dispose());
    app.sessions.bindUser(
      userId: cloudGameOwnerA,
      sessionId: 'integrated-owner-a',
    );
    final actor = app.sessions.current;
    final services = app.composition.services;
    final reflection = services.get(learningReflectionControllerKey);
    final writer = services.get(SyncServices.writer);
    final earned = _reflection(ModuleActivity.volume);
    await app.database.transaction(
      (tx) => tx.execute(
        'CREATE TRIGGER integration_reject_outbox BEFORE INSERT ON ${FormativeSchema.outbox} '
        "BEGIN SELECT RAISE(ABORT, 'Injected outbox failure'); END",
      ),
    );
    expect(
      (await reflection.save(earned)).failureOrNull?.code,
      FailureCode.storage,
    );
    expect(reflection.lastReceipt, isNull);
    expect(reflection.failedReflections, [earned]);
    expect(writer.unsaved(actor), 1);
    expect(
      await app.database.query('SELECT * FROM ${FormativeSchema.reflections}'),
      isEmpty,
    );
    expect(
      await app.database.query('SELECT * FROM ${FormativeSchema.outbox}'),
      isEmpty,
    );

    final game = _finishedQuiz();
    const attempt = 'integration:solo:atomic';
    const completedAt = 1793836800000;
    final solo = services.get(SoloServices.repository);
    expect(
      (await solo.finalize(
        actor,
        game,
        attempt,
        completedAt,
      )).failureOrNull?.code,
      FailureCode.storage,
    );
    expect(
      await app.database.query(
        'SELECT * FROM ${FormativeSchema.completedSolo}',
      ),
      isEmpty,
    );
    expect(
      await app.database.query('SELECT * FROM sync_solo_receipts'),
      isEmpty,
    );
    expect(
      (await app.database.query('SELECT finalized FROM solo_analysis'))
          .single['finalized'],
      0,
    );
    expect((await solo.leaderboard(actor, game.bank)).valueOrNull, isEmpty);

    await app.database.transaction(
      (tx) => tx.execute('DROP TRIGGER integration_reject_outbox'),
    );
    await reflection.retryFailed();
    expect(reflection.lastReceipt?.durable, isTrue);
    expect(reflection.lastReceipt?.state, FormativeSaveState.pending);
    final saved = await solo.finalize(actor, game, attempt, completedAt);
    expect(saved.valueOrNull?.durable, isTrue);
    expect(
      (await solo.finalize(actor, game, attempt, completedAt)).isSuccess,
      isTrue,
    );
    expect(writer.unsaved(actor), 0);
    final queued = await app.database.query(
      'SELECT kind, owner_id FROM ${FormativeSchema.outbox} ORDER BY kind',
    );
    expect(queued, [
      {'kind': 'module', 'owner_id': cloudGameOwnerA},
      {'kind': 'solo', 'owner_id': cloudGameOwnerA},
    ]);
    expect(
      await app.database.query('SELECT * FROM sync_solo_receipts'),
      hasLength(1),
    );
    await app.dispose();

    app = await bootstrapCloudGameForTest(
      features: productionFeatures(),
      databasePath: path,
      guestStore: guestStore,
    );
    expect(app.sessions.current.isGuest, isTrue);
    expect(
      (await app.composition.services
              .get(FoundationServices.recordsReader)
              .readCompletedSolo(app.sessions.current))
          .valueOrNull,
      isEmpty,
    );
    app.sessions.bindUser(
      userId: cloudGameOwnerA,
      sessionId: 'integration-owner-reopened',
    );
    final reopened = app.sessions.current;
    final reader = app.composition.services.get(
      FoundationServices.recordsReader,
    );
    expect((await reader.watchReflections(reopened).first).valueOrNull, [
      earned,
    ]);
    expect((await reader.readCompletedSolo(reopened)).valueOrNull, [
      game.completedRecord(attempt),
    ]);
    expect(
      (await app.composition.services
              .get(SoloServices.repository)
              .finalize(reopened, game, attempt, completedAt))
          .isSuccess,
      isTrue,
    );
    expect(
      await app.database.query('SELECT * FROM ${FormativeSchema.outbox}'),
      hasLength(2),
    );
    expect(
      await app.database.query('SELECT * FROM sync_solo_receipts'),
      hasLength(1),
    );
  });

  test('guest learning and Solo never enter account outbox or leak on A to B switch', () async {
    final app = await bootstrapCloudGameForTest(features: productionFeatures());
    addTearDown(app.dispose);
    final services = app.composition.services;
    final reflection = services.get(learningReflectionControllerKey);
    final solo = services.get(SoloServices.repository);
    final reader = services.get(FoundationServices.recordsReader);
    final guest = app.sessions.current;
    final guestReflection = _reflection(ModuleActivity.net);
    final game = _finishedQuiz();
    expect(
      (await reflection.save(guestReflection)).valueOrNull?.state,
      FormativeSaveState.local,
    );
    expect(
      (await solo.finalize(
        guest,
        game,
        'integration:guest',
        1793836800000,
      )).valueOrNull?.state,
      FormativeSaveState.local,
    );
    expect(
      await app.database.query('SELECT * FROM ${FormativeSchema.outbox}'),
      isEmpty,
    );

    app.sessions.bindUser(userId: cloudGameOwnerA, sessionId: 'integration-a');
    final actorA = app.sessions.current;
    expect(reflection.records, isEmpty);
    expect((await reader.readCompletedSolo(actorA)).valueOrNull, isEmpty);
    final accountReflection = _reflection(ModuleActivity.area);
    expect(
      (await reflection.save(accountReflection)).valueOrNull?.state,
      FormativeSaveState.pending,
    );
    expect(
      (await solo.finalize(
        actorA,
        game,
        'integration:a',
        1793836800000,
      )).isSuccess,
      isTrue,
    );
    app.sessions.bindUser(userId: cloudGameOwnerB, sessionId: 'integration-b');
    final actorB = app.sessions.current;
    expect(reflection.records, isEmpty);
    expect(reflection.lastReceipt, isNull);
    expect((await reader.readCompletedSolo(actorB)).valueOrNull, isEmpty);
    expect(
      (await reflection.save(
        accountReflection,
        actor: actorA,
      )).failureOrNull?.code,
      FailureCode.stale,
    );
    expect(
      (await solo.finalize(
        actorA,
        game,
        'integration:late-a',
        1793836800000,
      )).failureOrNull?.code,
      FailureCode.stale,
    );
    expect(
      (await services.get(SyncServices.outbox).read(actorB))
          .valueOrNull
          ?.pending,
      0,
    );
    final ownerRows = await app.database.query(
      'SELECT DISTINCT owner_id FROM ${FormativeSchema.outbox}',
    );
    expect(ownerRows, [
      {'owner_id': cloudGameOwnerA},
    ]);
    app.sessions.logout();
    expect(app.sessions.current.partition, guest.partition);
    expect(
      (await reader.watchReflections(app.sessions.current).first).valueOrNull,
      [guestReflection],
    );
    expect((await reader.readCompletedSolo(app.sessions.current)).valueOrNull, [
      game.completedRecord('integration:guest'),
    ]);
    expect(
      await app.database.query('SELECT * FROM ${FormativeSchema.outbox}'),
      hasLength(2),
    );
  });
}
