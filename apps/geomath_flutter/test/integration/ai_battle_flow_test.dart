import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/production_features.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/runtime/random_source.dart';
import 'package:geomath_flutter/core/storage/formative_schema.dart';
import 'package:geomath_flutter/features/ai_battle/ai_battle_feature.dart';
import 'package:geomath_flutter/features/duel/presentation/game_card_carousel.dart';
import 'package:geomath_flutter/features/solo/solo_feature.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../features/cloud_game/support/cloud_game_test_support.dart';

// Local host integration of the real production composition, controller,
// canonical bank and SQLite. Only installation preferences, clock and RNG are
// controlled. This is not a hosted-service or Android-device acceptance test.
final class _FixedAiRandom implements RandomSource {
  int draws = 0;

  @override
  double nextDouble() {
    draws++;
    return .25;
  }

  @override
  int nextInt(int maximum) => maximum ~/ 4;
}

final class _MatchFixture {
  _MatchFixture(this.app, this.controller, this.random);

  final AppDependencies app;
  final AiBattleController controller;
  final _FixedAiRandom random;

  Future<void> close() async {
    controller.dispose();
    await app.dispose();
  }
}

Future<_MatchFixture> _open({
  required ControlledCloudGameClock clock,
  String databasePath = inMemoryDatabasePath,
  TestGuestStore? guestStore,
  String? owner,
}) async {
  final app = await bootstrapCloudGameForTest(
    features: productionFeatures(),
    databasePath: databasePath,
    guestStore: guestStore,
    clock: clock,
  );
  if (owner != null) {
    app.sessions.bindUser(userId: owner, sessionId: 'fixture-$owner');
  }
  final random = _FixedAiRandom();
  final controller = AiBattleController(
    repository: app.composition.services.get(AiBattleServices.repository),
    sessions: app.sessions,
    clock: clock,
    lifecycle: app.lifecycle,
    playerRandom: DefaultRandomSource(Random(731)),
    aiRandom: random,
  );
  await controller.initialize();
  return _MatchFixture(app, controller, random);
}

Map<String, Object?> _plan(AiOpponentPlan plan) => {
  'accuracy': plan.accuracy,
  'answerDelayMs': plan.answerDelayMs,
  'solidDelayMs': plan.solidDelayMs,
  'solid': plan.solid.name,
  'net': plan.net?.name,
  'correct': plan.correct,
};

Future<void> _assertUnranked(AppDependencies app, SoloBank bank) async {
  final actor = app.sessions.current;
  final solo = app.composition.services.get(SoloServices.repository);
  expect((await solo.leaderboard(actor, bank)).valueOrNull, isEmpty);
  for (final table in [
    FormativeSchema.completedSolo,
    FormativeSchema.outbox,
    'solo_analysis',
    'sync_solo_receipts',
  ]) {
    expect(
      await app.database.query('SELECT * FROM $table'),
      isEmpty,
      reason: 'AI matches must not create official/ranked records in $table',
    );
  }
}

Future<void> _waitForBoth(
  AiBattleController controller,
  ControlledCloudGameClock clock,
) async {
  for (var second = 0; second < 25; second++) {
    final game = controller.game!;
    if (game.questionSettled && game.canContinue(controller.now)) return;
    clock.advance(const Duration(seconds: 1));
    controller.tick();
  }
  fail('A bounded AI question did not settle with its review gate.');
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();
  // A cached asset Future must not retain another test's async zone.
  setUp(rootBundle.clear);

  for (final difficulty in AiDifficulty.values) {
    test(
      '${difficulty.name}: full real ten-question match adapts only future plans and never enters rankings/outbox',
      () async {
        final clock = ControlledCloudGameClock();
        final fixture = await _open(
          clock: clock,
          // Signed-in AI still must not create a formative upload.
          owner: difficulty == AiDifficulty.hard ? cloudGameOwnerA : null,
        );
        addTearDown(fixture.close);
        final c = fixture.controller;
        expect(
          await c.start(name: 'Adaptive QA', difficulty: difficulty),
          isTrue,
        );
        final game = c.game!;
        final ids = game.player.round.map((question) => question.id).toList();
        expect(ids, hasLength(10));
        expect(ids.toSet(), hasLength(10));
        for (final shape in GeometryShape.values) {
          expect(
            game.player.round.where((question) => question.shape == shape),
            hasLength(2),
          );
        }

        final (
          accuracyStart,
          accuracyCap,
          startMin,
          startMax,
          capMin,
          capMax,
        ) = switch (difficulty) {
          AiDifficulty.easy => (.40, .65, 10000, 16000, 7000, 11000),
          AiDifficulty.medium => (.60, .82, 7000, 11000, 4000, 7000),
          AiDifficulty.hard => (.78, .96, 4500, 7500, 1800, 4000),
        };
        var previousAccuracy = accuracyStart;
        for (var question = 0; question < 10; question++) {
          expect(c.game, same(game));
          expect(game.index, question);
          expect(game.difficulty, difficulty);
          expect(game.player.score, question);
          final pressure = min(question, 8) / 8;
          final expectedAccuracy =
              accuracyStart + (accuracyCap - accuracyStart) * pressure;
          final expectedMin = startMin + (capMin - startMin) * pressure;
          final expectedMax = startMax + (capMax - startMax) * pressure;
          final committed = _plan(game.currentPlan);
          expect(game.currentPlan.accuracy, closeTo(expectedAccuracy, 1e-9));
          expect(
            game.currentPlan.accuracy,
            greaterThanOrEqualTo(previousAccuracy),
          );
          expect(game.currentPlan.accuracy, lessThanOrEqualTo(accuracyCap));
          expect(
            game.currentPlan.answerDelayMs,
            inInclusiveRange(expectedMin.floor(), expectedMax.ceil()),
          );
          previousAccuracy = game.currentPlan.accuracy;

          // Neither an incorrect reader nor the hint can increase pressure.
          c.choose(game.player.question.shape);
          expect(c.scan('r2')['type'], 'stage');
          expect(game.player.stage, GeometryCardKind.solid);
          if (question == 0) c.hint();
          expect(_plan(game.currentPlan), committed);
          expect(game.player.score, question);
          clock.advance(const Duration(milliseconds: 100));
          c.choose(game.player.question.shape);
          c.scan('r1');
          expect(game.player.stage, GeometryCardKind.net);
          expect(game.player.score, question);
          expect(_plan(game.currentPlan), committed);
          expect(await c.checkpoint(), isTrue);

          clock.advance(const Duration(milliseconds: 100));
          c.choose(game.player.question.shape);
          c.scan('r2');
          expect(game.player.score, question + 1);
          expect(game.player.answers, hasLength(question + 1));
          // A completed human answer cannot reroll this question's AI plan.
          expect(_plan(game.currentPlan), committed);
          c.scan('r2');
          expect(game.player.score, question + 1);
          expect(game.player.answers, hasLength(question + 1));
          expect(c.continueQuestion(), isFalse);
          await _waitForBoth(c, clock);
          expect(game.aiAnswers, hasLength(question + 1));
          expect(game.aiAnswers.last.id, game.player.question.id);
          expect(game.aiAnswers.last.outcome, 'correct');
          expect(game.aiAnswers.last.solid, game.player.question.shape);
          expect(game.aiAnswers.last.net, game.player.question.shape);
          expect(game.aiAnswers.last.elapsed, game.currentPlan.answerDelayMs);
          expect(c.continueQuestion(), isTrue);
          expect(await c.checkpoint(), isTrue);
        }
        expect(game.status, AiBattleStatus.finished);
        expect(game.player.score, 10);
        expect(game.aiScore, 10);
        expect(game.winner, AiBattleWinner.player);
        expect(game.currentPlan.accuracy, closeTo(accuracyCap, 1e-9));
        expect(game.aiAnswers.map((answer) => answer.id), ids);
        final actor = fixture.app.sessions.current;
        expect(
          (await fixture.app.database.query(
            'SELECT partition FROM ai_battle_slots',
          )).map((row) => row['partition']),
          [actor.partition],
        );
        await _assertUnranked(fixture.app, c.bank!);
      },
    );
  }

  for (final aiStage in [AiOpponentStage.solid, AiOpponentStage.net]) {
    test(
      'native SQLite process reopen in player R2 / AI ${aiStage.name} retains exact plan and remaining active time',
      () async {
        final directory = await Directory.systemTemp.createTemp('geomath-ai-');
        addTearDown(() => directory.delete(recursive: true));
        final path = '${directory.path}/ai.sqlite';
        final guest = TestGuestStore(value: 'ai-reopen-installation');
        final clock = ControlledCloudGameClock();
        var fixture = await _open(
          clock: clock,
          databasePath: path,
          guestStore: guest,
        );
        addTearDown(() => fixture.close());
        var c = fixture.controller;
        expect(
          await c.start(name: 'Reopen QA', difficulty: AiDifficulty.medium),
          isTrue,
        );
        final original = c.game!;
        final committed = _plan(original.currentPlan);
        final id = c.attemptId;
        c.choose(original.player.question.shape);
        clock.advance(const Duration(milliseconds: 100));
        c.scan('r1');
        expect(original.player.stage, GeometryCardKind.net);
        final elapsedBeforePause = aiStage == AiOpponentStage.solid
            ? 500
            : original.currentPlan.solidDelayMs + 1;
        clock.milliseconds = elapsedBeforePause;
        c.tick();
        expect(original.aiStage, aiStage);
        expect(original.aiAnswers, isEmpty);
        fixture.app.lifecycle.setPhase(AppLifecyclePhase.background);
        expect(original.paused, isTrue);
        expect(await c.checkpoint(), isTrue);
        final remaining =
            original.currentPlan.answerDelayMs - elapsedBeforePause;
        clock.advance(const Duration(hours: 3));
        c.tick();
        expect(original.aiAnswers, isEmpty);
        expect(_plan(original.currentPlan), committed);
        await fixture.close();

        fixture = await _open(
          clock: clock,
          databasePath: path,
          guestStore: guest,
        );
        c = fixture.controller;
        expect(c.game, isNull);
        expect(c.savedSlot?.id, id);
        expect(fixture.random.draws, 0);
        expect(await c.resumeSaved(), isTrue);
        final restored = c.game!;
        expect(c.attemptId, id);
        expect(restored.player.stage, GeometryCardKind.net);
        expect(restored.player.score, 0);
        expect(restored.aiStage, aiStage);
        expect(_plan(restored.currentPlan), committed);
        expect(
          fixture.random.draws,
          0,
          reason: 'Restoring cannot reroll the AI',
        );
        if (restored.paused) c.resume();
        clock.advance(Duration(milliseconds: remaining - 1));
        c.tick();
        expect(restored.aiAnswers, isEmpty);
        clock.advance(const Duration(milliseconds: 1));
        c.tick();
        expect(restored.aiAnswers, hasLength(1));
        expect(restored.aiAnswers.single.elapsed, committed['answerDelayMs']);
        expect(restored.questionSettled, isFalse);
        expect(c.continueQuestion(), isFalse);
        c.choose(restored.player.question.shape);
        c.scan('r2');
        expect(restored.player.score, 1);
        expect(restored.player.answers, hasLength(1));
        expect(restored.player.answers.single.elapsed, lessThan(20000));
        await _waitForBoth(c, clock);
        expect(c.continueQuestion(), isTrue);
        expect(restored.index, 1);
        expect(restored.aiAnswers, hasLength(1));
        expect(fixture.random.draws, 0);
        await _assertUnranked(fixture.app, c.bank!);
      },
    );
  }

  test('failed save blocks leave and actor change cannot publish or upload another account AI match', () async {
    final clock = ControlledCloudGameClock();
    final fixture = await _open(clock: clock, owner: cloudGameOwnerA);
    addTearDown(fixture.close);
    final c = fixture.controller;
    expect(
      await c.start(name: 'Owner A', difficulty: AiDifficulty.hard),
      isTrue,
    );
    final actorA = fixture.app.sessions.current;
    final repository = fixture.app.composition.services.get(
      AiBattleServices.repository,
    );
    final firstSlot = (await repository.read(actorA)).valueOrNull!;
    await fixture.app.database.transaction((tx) async {
      await tx.execute(
        'CREATE TRIGGER ai_flow_reject_insert BEFORE INSERT ON ai_battle_slots '
        "BEGIN SELECT RAISE(ABORT, 'Injected native AI storage failure'); END",
      );
      await tx.execute(
        'CREATE TRIGGER ai_flow_reject_update BEFORE UPDATE ON ai_battle_slots '
        "BEGIN SELECT RAISE(ABORT, 'Injected native AI storage failure'); END",
      );
    });
    c.choose(c.game!.player.question.shape);
    c.scan('r1');
    expect(c.game!.player.stage, GeometryCardKind.net);
    expect(await c.leave(), isFalse);
    expect(c.failure?.code, FailureCode.storage);
    expect(c.game?.paused, isTrue);
    expect(c.saved, isFalse);
    expect(
      jsonEncode((await repository.read(actorA)).valueOrNull!.game),
      jsonEncode(firstSlot.game),
      reason: 'A failed checkpoint must preserve the last durable match',
    );
    await repository.drain();
    fixture.app.sessions.bindUser(
      userId: cloudGameOwnerB,
      sessionId: 'fixture-owner-b',
    );
    expect(c.game, isNull);
    await c.initialize();
    expect(c.savedSlot, isNull);
    expect(await c.resumeSaved(), isFalse);
    await fixture.app.database.transaction((tx) async {
      await tx.execute('DROP TRIGGER ai_flow_reject_insert');
      await tx.execute('DROP TRIGGER ai_flow_reject_update');
    });
    expect(
      await c.start(name: 'Owner B', difficulty: AiDifficulty.easy),
      isTrue,
    );
    final matchB = c.game;
    expect(
      (await repository.save(actorA, firstSlot)).failureOrNull?.code,
      FailureCode.stale,
    );
    expect(c.game, same(matchB));
    expect(c.game!.player.score, 0);
    expect(
      (await fixture.app.database.query(
        'SELECT partition FROM ai_battle_slots',
      )).map((row) => row['partition']).toSet(),
      {actorA.partition, fixture.app.sessions.current.partition},
    );
    await _assertUnranked(fixture.app, c.bank!);
  });

  testWidgets(
    'real AI route browses solid and net cards without choosing or consuming an attempt at 320dp/150%',
    (tester) async {
      tester.view.physicalSize = const Size(320, 1100);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final clock = ControlledCloudGameClock();
      final app = (await tester.runAsync(
        () => bootstrapCloudGameForTest(
          features: productionFeatures(),
          clock: clock,
        ),
      ))!;
      final c = (await tester.runAsync(() async {
        final controller = app.composition.services.get(
          AiBattleServices.controller,
        );
        await controller.initialize();
        return controller;
      }))!;
      try {
        expect(
          await tester.runAsync(
            () => c.start(name: 'Swipe QA', difficulty: AiDifficulty.easy),
          ),
          isTrue,
        );
        await tester.runAsync(
          () => app.preferences.save(
            app.preferences.value.copyWith(
              language: AppLanguage.ms,
              theme: AppTheme.dark,
              textScale: 1.5,
              reducedMotion: true,
              musicEnabled: false,
              soundEnabled: false,
            ),
          ),
        );
        await tester.pumpWidget(
          GeoMathApp(dependencies: app, initialRoute: 'ai-battle'),
        );
        await _flushUi(tester, c);
        final game = c.game!;
        for (final kind in [GeometryCardKind.solid, GeometryCardKind.net]) {
          expect(game.player.stage, kind);
          expect(game.selected, isNull);
          final before = jsonEncode(game.player.checkpoint(c.now));
          final plan = _plan(game.currentPlan);
          final carousel = find.byType(GameCardCarousel);
          expect(carousel, findsOneWidget);
          final scroller = find.descendant(
            of: carousel,
            matching: find.byWidgetPredicate(
              (widget) =>
                  widget is Scrollable && widget.axis == Axis.horizontal,
            ),
          );
          final next = find.byKey(const ValueKey('ai-cards-next'));
          await tester.ensureVisible(next);
          await tester.tap(next);
          await tester.pump(const Duration(milliseconds: 350));
          final position = tester.state<ScrollableState>(scroller).position;
          expect(position.pixels, greaterThan(0));
          await tester.drag(scroller, const Offset(-200, 0));
          await tester.pump(const Duration(milliseconds: 350));
          expect(game.selected, isNull);
          expect(jsonEncode(game.player.checkpoint(c.now)), before);
          expect(_plan(game.currentPlan), plan);
          final shape = game.player.question.shape;
          final choice = find.byKey(
            ValueKey('ai-choice-${kind.name}-${shape.name}'),
          );
          await tester.ensureVisible(choice);
          await tester.runAsync(() => tester.tap(choice));
          await _flushUi(tester, c);
          expect(game.player.score, 0);
          expect(game.player.answers, isEmpty);
          final scan = find.byKey(
            ValueKey(kind == GeometryCardKind.solid ? 'ai-r1' : 'ai-r2'),
          );
          await tester.ensureVisible(scan);
          await tester.runAsync(() => tester.tap(scan));
          await _flushUi(tester, c);
          expect(tester.takeException(), isNull);
        }
        expect(game.player.score, 1);
        expect(game.player.answers, hasLength(1));
        expect(game.aiAnswers, isEmpty);
        expect(find.byKey(const ValueKey('ai-question-review')), findsNothing);
        await tester.runAsync(() => _assertUnranked(app, c.bank!));
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.runAsync(app.dispose);
      }
    },
  );
}

Future<void> _flushUi(
  WidgetTester tester,
  AiBattleController controller,
) async {
  await tester.runAsync(() async {
    if (controller.game != null) await controller.checkpoint();
    await Future<void>.delayed(const Duration(milliseconds: 15));
  });
  await tester.pump(const Duration(milliseconds: 350));
}
