import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_router.dart';
import 'package:geomath_flutter/app/production_features.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/storage/formative_schema.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/features/ai_battle/ai_battle_feature.dart';
import 'package:geomath_flutter/features/ai_battle/presentation/ai_battle_screen.dart';
import 'package:geomath_flutter/features/solo/solo_feature.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../cloud_game/support/cloud_game_test_support.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();
  setUp(rootBundle.clear);

  test(
    'normal production composes one AI owner through the play feature',
    () async {
      final app = await bootstrapCloudGameForTest(
        features: productionFeatures(),
      );
      addTearDown(app.dispose);
      final composition = app.composition;
      final play = composition.features.singleWhere(
        (feature) => feature.id == 'solo',
      );
      expect(
        play.routes.where((route) => route.name == 'ai-battle'),
        hasLength(1),
      );
      expect(
        composition.routes.routes.where((route) => route.name == 'ai-battle'),
        hasLength(1),
      );
      expect(composition.routes.byPath('/play/ai')?.name, 'ai-battle');
      expect(composition.routes['ai-battle'].showNavigation, isFalse);
      expect(
        composition.features.where((feature) => feature.id == 'ai_battle'),
        isEmpty,
      );
      final services = composition.services;
      final ai = services.get(AiBattleServices.controller);
      expect(services.get(AiBattleServices.controller), same(ai));
      expect(
        services.names.where(
          (name) => name == AiBattleServices.controller.name,
        ),
        hasLength(1),
      );
      expect(
        services.names.where(
          (name) => name == AiBattleServices.repository.name,
        ),
        hasLength(1),
      );
      expect(ai.actor, app.sessions.current);
      expect(
        composition.migrations.contributions.where(
          (migration) => migration.id == 'ai_battle:1',
        ),
        hasLength(1),
      );
      expect(
        await app.database.query(
          "SELECT version FROM foundation_migrations WHERE namespace = 'ai_battle'",
        ),
        [
          {'version': 1},
        ],
      );
      for (final language in AppLanguage.values) {
        final strings = AppStrings(
          language,
          contributions: composition.localizations.translations,
        );
        expect(
          strings.text('solo.ai'),
          language == AppLanguage.ms ? 'Lawan AI' : 'Play AI',
        );
        final title = strings.text('ai_battle.title');
        expect(title, isNot('ai_battle.title'));
        expect(title.trim(), isNotEmpty);
      }
    },
  );

  test(
    'standalone AI contribution registers without the Solo feature',
    () async {
      final app = await bootstrapCloudGameForTest(
        features: [aiBattleFeature()],
      );
      addTearDown(app.dispose);
      expect(app.composition.routes.byPath('/play/ai')?.name, 'ai-battle');
      expect(app.composition.routes.contains('cloud-game-play'), isFalse);
      expect(
        app.composition.services.contains(SoloServices.controller),
        isFalse,
      );
      final ai = app.composition.services.get(AiBattleServices.controller);
      await ai.initialize();
      expect(ai.bank, isNotNull);
      expect(
        await ai.start(name: 'Offline AI', difficulty: AiDifficulty.easy),
        isTrue,
      );
      expect(ai.game?.total, 10);
      ai.pause();
      expect(await ai.checkpoint(), isTrue);
    },
  );

  testWidgets(
    'Main opens real AI while preserving the separate R2 Solo save and score/outbox tables',
    (tester) async {
      tester.view.physicalSize = const Size(390, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final clock = ControlledCloudGameClock();
      final app = (await tester.runAsync(
        () => bootstrapCloudGameForTest(
          features: productionFeatures(),
          clock: clock,
        ),
      ))!;
      try {
        final services = app.composition.services;
        final solo = (await tester.runAsync(
          () async => services.get(SoloServices.controller),
        ))!;
        await tester.runAsync(solo.initialize);
        expect(
          await tester.runAsync(
            () => solo.start(
              name: 'Preserved Solo',
              mode: SoloMode.review,
              questionIds: ['B2'],
            ),
          ),
          isTrue,
        );
        await tester.runAsync(() async {
          solo.choose(solo.game!.question.shape);
          expect(solo.scan('r1')['type'], 'solid');
          solo.pause();
          expect(await solo.checkpoint(), isTrue);
        });
        final originalAttempt = solo.attemptId;
        final originalGame = jsonEncode(solo.game!.checkpoint(solo.now));
        final actor = app.sessions.current;

        Future<Map<String, Object?>> protectedTables() async => {
          'slot': await app.database.query('SELECT * FROM solo_checkpoints'),
          'analysis': await app.database.query('SELECT * FROM solo_analysis'),
          'completed': await app.database.query(
            'SELECT * FROM ${FormativeSchema.completedSolo}',
          ),
          'outbox': await app.database.query(
            'SELECT * FROM ${FormativeSchema.outbox}',
          ),
        };
        final originalRows = await tester.runAsync(protectedTables);
        // Start the actual AI owner under real I/O before pushing its route.
        // Its independently saved match must coexist with the paused Solo slot.
        final ai = (await tester.runAsync(
          () async => services.get(AiBattleServices.controller),
        ))!;
        await tester.runAsync(ai.initialize);
        expect(
          await tester.runAsync(
            () => ai.start(
              name: 'Adaptive Player',
              difficulty: AiDifficulty.easy,
            ),
          ),
          isTrue,
        );
        await tester.pumpWidget(
          GeoMathApp(dependencies: app, initialRoute: 'cloud-game-play'),
        );
        await _flush(tester);
        final entry = find.byKey(const ValueKey('solo-ai'));
        expect(entry, findsOneWidget);
        expect(find.byKey(const ValueKey('solo-duel')), findsOneWidget);
        await tester.ensureVisible(entry);
        await tester.pump();
        expect(tester.getSize(entry).height, greaterThanOrEqualTo(48));
        await tester.tap(entry);
        await _flush(tester);
        final router =
            tester.widget<MaterialApp>(find.byType(MaterialApp)).routerDelegate!
                as GeoMathRouter;
        expect(router.navigation.current.route.name, 'ai-battle');
        expect(find.byType(AiBattleScreen), findsOneWidget);
        expect(ai.game, isNotNull);
        await tester.runAsync(() async {
          final firstAccuracy = ai.game!.currentPlan.accuracy;
          ai.choose(ai.game!.player.question.shape);
          expect(ai.scan('r1')['type'], 'solid');
          ai.choose(ai.game!.player.question.shape);
          clock.advance(const Duration(milliseconds: 100));
          expect(ai.scan('r2')['type'], 'correct');
          clock.advance(const Duration(seconds: 20));
          ai.tick();
          clock.advance(const Duration(seconds: 2));
          ai.tick();
          expect(ai.game!.questionSettled, isTrue);
          expect(ai.continueQuestion(), isTrue);
          expect(ai.game!.currentPlan.accuracy, greaterThan(firstAccuracy));
          ai.pause();
          expect(await ai.checkpoint(), isTrue);
        });

        expect(app.sessions.current, actor);
        expect(solo.attemptId, originalAttempt);
        expect(solo.game!.stage, GeometryCardKind.net);
        expect(jsonEncode(solo.game!.checkpoint(solo.now)), originalGame);
        expect(await tester.runAsync(protectedTables), originalRows);
        expect(
          (await tester.runAsync(
            () => app.database.query('SELECT * FROM ai_battle_slots'),
          )),
          hasLength(1),
        );
        router.back();
        await _flush(tester);
        expect(router.navigation.current.route.name, 'cloud-game-play');
        expect(solo.attemptId, originalAttempt);
        expect(tester.takeException(), isNull);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.runAsync(app.dispose);
      }
    },
  );
}

Future<void> _flush(WidgetTester tester) async {
  // Navigator retains both visible pages during its route animation. Finish
  // that transition while allowing the real SQLite reads to leave fake async.
  // A running AI ticker intentionally prevents pumpAndSettle from completing.
  for (var attempt = 0; attempt < 8; attempt++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 10)),
    );
    await tester.pump(const Duration(milliseconds: 100));
  }
  expect(find.byType(GeoMathScaffold), findsOneWidget);
  expect(tester.takeException(), isNull);
}
