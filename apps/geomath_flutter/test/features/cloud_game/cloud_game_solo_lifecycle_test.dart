import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/navigation/app_navigation.dart';
import 'package:geomath_flutter/core/storage/formative_schema.dart';
import 'package:geomath_flutter/dev/cloud_game_features.dart';
import 'package:geomath_flutter/features/solo/solo_feature.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'support/cloud_game_test_support.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();

  test('combined solo restores staged input and remaining feedback through a database reopen', () async {
    final directory = await Directory.systemTemp.createTemp(
      'geomath-cloud-solo-',
    );
    addTearDown(() => directory.delete(recursive: true));
    final path = '${directory.path}/solo.sqlite';
    final guestStore = TestGuestStore();
    final clock = ControlledCloudGameClock();
    var app = await bootstrapCloudGameForTest(
      databasePath: path,
      guestStore: guestStore,
      clock: clock,
    );
    addTearDown(() => app.dispose());
    expect(
      (await app.composition.services
              .get(CloudGamePreviewServices.startup)
              .ready)
          .isSuccess,
      isTrue,
    );
    var controller = app.composition.services.get(SoloServices.controller);
    await controller.initialize();
    expect(await controller.start(name: 'QA offline guest'), isTrue);
    final attempt = controller.attemptId;
    final guestPartition = app.sessions.current.partition;
    final correct = controller.game!.question.shape;
    controller.choose(correct);
    controller.scan('r2');
    expect(controller.game!.stage, GeometryCardKind.solid);
    expect(controller.game!.attemptedSolid, isNull);
    expect(controller.game!.score, 0);
    controller.scan('r1');
    expect(controller.game!.stage, GeometryCardKind.net);
    controller.choose(GeometryShape.cone);
    expect(await controller.checkpoint(), isTrue);

    clock.advance(const Duration(milliseconds: 250));
    app.lifecycle.setPhase(AppLifecyclePhase.background);
    final elapsed = controller.game!.time(controller.now);
    clock.advance(const Duration(hours: 1));
    controller.tick();
    expect(controller.game!.time(controller.now), elapsed);
    expect(controller.game!.paused, isTrue);
    expect(await controller.checkpoint(), isTrue);
    await app.dispose();

    clock.milliseconds = 0; // A new process has a new monotonic clock origin.
    app = await bootstrapCloudGameForTest(
      databasePath: path,
      guestStore: guestStore,
      clock: clock,
    );
    await app.composition.services.get(CloudGamePreviewServices.startup).ready;
    controller = app.composition.services.get(SoloServices.controller);
    await controller.initialize();
    expect(await controller.resumeSaved(), isTrue);
    expect(app.sessions.current.partition, guestPartition);
    expect(controller.attemptId, attempt);
    expect(controller.game!.stage, GeometryCardKind.net);
    expect(controller.selected, GeometryShape.cone);
    expect(controller.game!.time(controller.now), elapsed);

    controller.choose(correct);
    controller.scan('r2');
    expect(controller.game!.score, 1);
    expect(controller.game!.status, SoloStatus.feedback);
    clock.advance(const Duration(milliseconds: 400));
    app.lifecycle.setPhase(AppLifecyclePhase.background);
    expect(await controller.checkpoint(), isTrue);
    expect(controller.savedSlot!.game['feedback_remaining'], 500);
    await app.dispose();

    clock.milliseconds = 0;
    app = await bootstrapCloudGameForTest(
      databasePath: path,
      guestStore: guestStore,
      clock: clock,
    );
    await app.composition.services.get(CloudGamePreviewServices.startup).ready;
    controller = app.composition.services.get(SoloServices.controller);
    await controller.initialize();
    expect(await controller.resumeSaved(), isTrue);
    expect(controller.game!.score, 1);
    expect(controller.game!.status, SoloStatus.feedback);
    clock.advance(const Duration(milliseconds: 499));
    controller.tick();
    expect(controller.game!.status, SoloStatus.feedback);
    clock.advance(const Duration(milliseconds: 1));
    controller.tick();
    expect(controller.game!.index, 1);
    final wrong = GeometryShape.values.firstWhere(
      (shape) => shape != controller.game!.question.shape,
    );
    controller.choose(wrong);
    controller.scan('r1');
    expect(controller.game!.status, SoloStatus.review);
    clock.advance(const Duration(milliseconds: 1200));
    controller.tick();
    controller.continueReview();
    expect(controller.game!.index, 1);
    clock.advance(const Duration(milliseconds: 599));
    controller.continueReview();
    expect(controller.game!.index, 1);
    clock.advance(const Duration(milliseconds: 1));
    controller.continueReview();
    expect(controller.game!.index, 2);
    expect(await controller.checkpoint(), isTrue);
    expect(
      await app.database.query('SELECT * FROM ${FormativeSchema.outbox}'),
      isEmpty,
    );
    expect(
      await app.database.query(
        'SELECT * FROM ${FormativeSchema.completedSolo}',
      ),
      isEmpty,
    );
  });

  test('all native back origins preserve an active solo when its checkpoint write fails', () async {
    final app = await bootstrapCloudGameForTest();
    addTearDown(app.dispose);
    await app.composition.services.get(CloudGamePreviewServices.startup).ready;
    final controller = app.composition.services.get(SoloServices.controller);
    await controller.initialize();
    expect(await controller.start(name: 'QA guarded guest'), isTrue);
    final navigation = AppNavigationController(
      routes: app.composition.routes,
      initialRoute: 'cloud-game-play',
    );
    addTearDown(navigation.dispose);
    navigation.push('solo-game');
    await app.database.transaction(
      (transaction) => transaction.execute(
        'CREATE TRIGGER qa_reject_solo_checkpoint BEFORE INSERT ON solo_checkpoints '
        "BEGIN SELECT RAISE(ABORT, 'QA injected checkpoint failure'); END",
      ),
    );
    final system = navigation.requestBack(BackOrigin.system);
    final gesture = navigation.requestBack(BackOrigin.gesture);
    final appBar = navigation.requestBack(BackOrigin.appBar);
    expect(identical(system, gesture), isTrue);
    expect(identical(system, appBar), isTrue);
    expect(await system, BackOutcome.blocked);
    expect(navigation.current.route.name, 'solo-game');
    expect(controller.game, isNotNull);
    expect(controller.saved, isFalse);
    await app.database.transaction(
      (transaction) =>
          transaction.execute('DROP TRIGGER qa_reject_solo_checkpoint'),
    );
    expect(await navigation.requestBack(BackOrigin.appBar), BackOutcome.popped);
    expect(controller.game, isNull);
    expect(controller.savedSlot, isNotNull);
  });
}
