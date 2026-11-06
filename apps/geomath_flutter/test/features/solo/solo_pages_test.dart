import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/app_router.dart';
import 'package:geomath_flutter/core/geometry/geometry_card_view.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/runtime/clock.dart';
import 'package:geomath_flutter/core/runtime/random_source.dart';
import 'package:geomath_flutter/core/session/guest_identity_store.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/features/duel/presentation/game_card_carousel.dart';
import 'package:geomath_flutter/features/duel/presentation/game_card_drag.dart';
import 'package:geomath_flutter/features/duel/presentation/game_question_content.dart';
import 'package:geomath_flutter/features/solo/solo_feature.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

final class PageClock implements Clock {
  int milliseconds = 0;
  @override
  int monotonicMilliseconds() => milliseconds;
  @override
  DateTime now() =>
      DateTime.utc(2026, 11, 5).add(Duration(milliseconds: milliseconds));
}

final class PagePreferences implements PreferencesStore {
  String? value = jsonEncode(
    const AppPreferences(
      language: AppLanguage.ms,
      theme: AppTheme.light,
      reducedMotion: true,
    ).toJson(),
  );
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String next) async {
    value = next;
  }
}

final class PageGuest implements GuestIdentityStore {
  @override
  Future<Result<String?>> read() async => const Success('solo-widget-device');
  @override
  Future<Result<void>> write(String value) async => const Success(null);
}

final class PageRandom implements RandomSource {
  final _random = Random(321);
  int draws = 0;
  @override
  double nextDouble() {
    draws++;
    return _random.nextDouble();
  }

  @override
  int nextInt(int maximum) {
    draws++;
    return _random.nextInt(maximum);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();

  Future<AppDependencies> boot(
    WidgetTester tester,
    PageClock clock, {
    RandomSource? random,
  }) async {
    final result = await tester.runAsync(
      () => AppDependencies.bootstrap(
        features: [soloFeature()],
        databasePath: inMemoryDatabasePath,
        databaseFactory: databaseFactoryFfi,
        preferencesStore: PagePreferences(),
        guestStore: PageGuest(),
        clock: clock,
        random: random ?? DefaultRandomSource(Random(321)),
      ),
    );
    expect(result!.isSuccess, true);
    final app = result.valueOrNull!;
    await tester.runAsync(
      app.composition.services.get(SoloServices.controller).initialize,
    );
    return app;
  }

  Future<void> flush(WidgetTester tester, SoloController controller) async {
    await tester.runAsync(() async {
      if (controller.game != null) await controller.checkpoint();
      await Future<void>.delayed(const Duration(milliseconds: 15));
    });
    await tester.pump(const Duration(milliseconds: 350));
  }

  Future<void> tapKey(WidgetTester tester, String key) async {
    final finder = find.byKey(ValueKey(key));
    await tester.ensureVisible(finder);
    await tester.pump(const Duration(milliseconds: 350));
    await tester.runAsync(() => tester.tap(finder));
    await tester.pump(const Duration(milliseconds: 350));
  }

  Finder carouselScroller() => find.descendant(
    of: find.byType(GameCardCarousel),
    matching: find.byWidgetPredicate(
      (widget) => widget is Scrollable && widget.axis == Axis.horizontal,
    ),
  );

  double browseOffset(WidgetTester tester) =>
      tester.state<ScrollableState>(carouselScroller()).position.pixels;

  testWidgets(
    'dragging uses the active reader without scanning and old R1 gestures cannot select or submit at R2',
    (tester) async {
      tester.view.physicalSize = const Size(390, 1100);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final clock = PageClock();
      final app = await boot(tester, clock);
      final c = app.composition.services.get(SoloServices.controller);
      await tester.runAsync(
        () => c.start(
          name: 'Drag QA',
          mode: SoloMode.review,
          questionIds: ['K1', 'C3'],
        ),
      );
      await tester.pumpWidget(
        GeoMathApp(dependencies: app, initialRoute: 'solo-game'),
      );
      await flush(tester, c);
      final game = c.game!, correct = c.game!.question.shape;
      final card = find.byKey(ValueKey('solo-choice-solid-${correct.name}'));
      final data = tester
          .widget<GameCardDraggable>(
            find.ancestor(of: card, matching: find.byType(GameCardDraggable)),
          )
          .data;
      Future<void> dropOn(String target) async {
        await tester.ensureVisible(card);
        await tester.pump(const Duration(milliseconds: 350));
        final gesture = await tester.startGesture(tester.getCenter(card));
        await tester.pump(kLongPressTimeout + const Duration(milliseconds: 50));
        await gesture.moveTo(tester.getCenter(find.byKey(ValueKey(target))));
        await tester.pump();
        await gesture.up();
        await flush(tester, c);
      }

      await dropOn('solo-reader-r2');
      expect(c.selected, isNull);
      expect(game.attemptedSolid, isNull);
      await dropOn('solo-reader-r1');
      expect(c.selected, correct);
      expect(game.attemptedSolid, isNull);
      expect(game.score, 0);
      final oldTap = tester.widget<GeoMathCard>(card).onTap!;
      final oldScan = tester
          .widget<ActionButton>(find.byKey(const ValueKey('solo-r1')))
          .onPressed!;
      await tapKey(tester, 'solo-r1');
      expect(game.stage, GeometryCardKind.net);
      expect(c.selected, isNull);
      final target = tester.widget<DragTarget<GameCardDragData>>(
        find.descendant(
          of: find.byKey(const ValueKey('solo-reader-r2')),
          matching: find.byType(DragTarget<GameCardDragData>),
        ),
      );
      final details = DragTargetDetails(data: data, offset: Offset.zero);
      expect(target.onWillAcceptWithDetails!(details), false);
      target.onAcceptWithDetails!(details);
      oldTap();
      oldScan();
      await tester.pump();
      expect(c.selected, isNull);
      expect(game.stage, GeometryCardKind.net);
      expect(game.attemptedNet, isNull);
      expect(game.score, 0);
      expect(tester.takeException(), isNull);
      await flush(tester, c);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(app.dispose);
    },
  );

  testWidgets(
    'all five R1 and R2 cards browse without selection, attempts, score or RNG draws',
    (tester) async {
      tester.view.physicalSize = const Size(390, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final clock = PageClock(), random = PageRandom();
      final app = await boot(tester, clock, random: random);
      final c = app.composition.services.get(SoloServices.controller);
      expect(
        await tester.runAsync(
          () => c.start(
            name: 'Swipe QA',
            mode: SoloMode.review,
            questionIds: ['B2', 'K2'],
          ),
        ),
        true,
      );
      await tester.pumpWidget(
        GeoMathApp(dependencies: app, initialRoute: 'solo-game'),
      );
      await flush(tester, c);
      final game = c.game!, attempt = c.attemptId;

      Future<void> browseEveryCard() async {
        final order = game.stage == GeometryCardKind.solid
            ? game.solidOrder
            : game.netOrder;
        final snapshot = jsonEncode(game.checkpoint(c.now));
        final draws = random.draws;
        expect(c.selected, isNull);
        final cards = tester.widgetList<GeometryCardView>(
          find.descendant(
            of: find.byType(GameCardCarousel),
            matching: find.byType(GeometryCardView),
          ),
        );
        expect(cards.map((card) => card.shape), order);
        expect(cards.every((card) => card.kind == game.stage), true);
        for (var i = 0; i < order.length; i++) {
          final choice = find.byKey(
            ValueKey('solo-choice-${game.stage.name}-${order[i].name}'),
          );
          expect(choice, findsOneWidget);
          await tester.ensureVisible(choice);
          await tester.pump(const Duration(milliseconds: 350));
          expect(choice.hitTestable(), findsOneWidget);
        }
        await tapKey(tester, 'solo-cards-previous');
        await tester.ensureVisible(carouselScroller());
        await tester.pump(const Duration(milliseconds: 350));
        final beforeSwipe = browseOffset(tester);
        await tester.drag(carouselScroller(), const Offset(-240, 0));
        await tester.pump(const Duration(milliseconds: 350));
        expect(browseOffset(tester), greaterThan(beforeSwipe));
        await tapKey(tester, 'solo-cards-next');
        expect(c.selected, isNull);
        expect(c.attemptId, attempt);
        expect(jsonEncode(game.checkpoint(c.now)), snapshot);
        expect(random.draws, draws);
      }

      await browseEveryCard();
      await tapKey(tester, 'solo-choice-solid-${game.question.shape.name}');
      expect(game.attemptedSolid, isNull);
      expect(game.score, 0);
      await tapKey(tester, 'solo-r1');
      expect(game.stage, GeometryCardKind.net);
      expect(browseOffset(tester), 0);
      expect(game.score, 0);
      await browseEveryCard();
      final chosen = game.netOrder.last;
      await tapKey(tester, 'solo-choice-net-${chosen.name}');
      await tapKey(tester, 'solo-cards-previous');
      expect(c.selected, chosen);
      await tapKey(tester, 'solo-cards-next');
      final offset = browseOffset(tester);
      expect(offset, greaterThan(0));
      final snapshot = jsonEncode(game.checkpoint(c.now));
      final draws = random.draws;
      await tester.runAsync(
        () => app.preferences.save(
          app.preferences.value.copyWith(
            language: AppLanguage.en,
            theme: AppTheme.dark,
            textScale: 1.5,
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 350));
      expect(browseOffset(tester), closeTo(offset, .01));
      expect(c.selected, chosen);
      expect(c.attemptId, attempt);
      expect(jsonEncode(game.checkpoint(c.now)), snapshot);
      expect(random.draws, draws);
      expect(find.byTooltip('Next card'), findsOneWidget);
      expect(tester.takeException(), isNull);

      // Pausing hides controls while retaining this attempt's browse position.
      await tapKey(tester, 'solo-pause');
      await tapKey(tester, 'solo-unpause');
      expect(browseOffset(tester), closeTo(offset, .01));
      expect(c.selected, chosen);
      await tapKey(tester, 'solo-skip');
      clock.milliseconds = SoloGame.reviewMs;
      await tester.pump(const Duration(milliseconds: 110));
      final question = game.question.id;
      await tapKey(tester, 'solo-continue');
      expect(game.question.id, isNot(question));
      expect(game.stage, GeometryCardKind.solid);
      expect(browseOffset(tester), 0);
      expect(c.selected, isNull);
      expect(tester.takeException(), isNull);

      await tapKey(tester, 'solo-cards-next');
      expect(browseOffset(tester), greaterThan(0));
      expect(
        await tester.runAsync(
          () => c.start(
            name: 'New attempt QA',
            mode: SoloMode.review,
            questionIds: ['B2'],
            replaceConfirmed: true,
          ),
        ),
        true,
      );
      await tester.pump();
      expect(c.attemptId, isNot(attempt));
      expect(c.selected, isNull);
      expect(browseOffset(tester), 0);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(app.dispose);
    },
  );

  for (final (width, language) in [
    (320.0, AppLanguage.ms),
    (390.0, AppLanguage.en),
  ]) {
    testWidgets(
      'screenshot B2 formula and variable meanings reflow at $width / 150% in question, review and analysis',
      (tester) async {
        tester.view.physicalSize = Size(width, 900);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final clock = PageClock();
        final app = await boot(tester, clock);
        final c = app.composition.services.get(SoloServices.controller);
        await tester.runAsync(
          () => app.preferences.save(
            app.preferences.value.copyWith(language: language, textScale: 1.5),
          ),
        );
        await tester.runAsync(
          () => c.start(
            name: 'Formula QA',
            mode: SoloMode.review,
            questionIds: ['B2'],
          ),
        );
        await tester.pumpWidget(
          GeoMathApp(dependencies: app, initialRoute: 'solo-game'),
        );
        await flush(tester, c);
        final content = find.byKey(const ValueKey('solo-question-content'));
        expect(content, findsOneWidget);
        final question = tester.widget<GameQuestionContent>(content);
        expect(question.text, contains('V=p*l*t'));
        expect(question.showVariables, true);
        expect(question.languageCode, language.name);
        expect(find.textContaining('V=p*l*t'), findsNothing);
        final rendered = tester
            .widgetList<RichText>(find.byType(RichText))
            .map((widget) => widget.text.toPlainText())
            .join('\n');
        expect(rendered, contains('×'));
        expect(
          rendered,
          contains(language == AppLanguage.ms ? 'panjang' : 'length'),
        );
        expect(
          rendered,
          contains(language == AppLanguage.ms ? 'lebar' : 'width'),
        );
        expect(
          rendered,
          contains(language == AppLanguage.ms ? 'tinggi' : 'height'),
        );
        expect(tester.takeException(), isNull);

        await tapKey(tester, 'solo-skip');
        expect(c.game!.reviewing, true);
        expect(content, findsOneWidget);
        expect(find.textContaining('V=p*l*t'), findsNothing);
        expect(tester.takeException(), isNull);
        clock.milliseconds = SoloGame.reviewMs;
        await tester.pump(const Duration(milliseconds: 110));
        await tapKey(tester, 'solo-continue');
        await tester.runAsync(c.finish);
        await tester.pump();
        await tapKey(tester, 'solo-analysis-item-B2');
        final analysis = find.byKey(
          const ValueKey('solo-analysis-question-B2'),
        );
        await tester.ensureVisible(analysis);
        await tester.pump(const Duration(milliseconds: 350));
        expect(
          tester.widget<GameQuestionContent>(analysis).text,
          question.text,
        );
        expect(find.textContaining('V=p*l*t'), findsNothing);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.runAsync(app.dispose);
      },
    );
  }

  testWidgets(
    'real app keeps the R2 attempt across language/theme/150% text and shows failed saves',
    (tester) async {
      tester.view.physicalSize = const Size(320, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final clock = PageClock();
      final app = await boot(tester, clock);
      final c = app.composition.services.get(SoloServices.controller);
      await tester.pumpWidget(
        GeoMathApp(dependencies: app, initialRoute: 'cloud-game-play'),
      );
      await flush(tester, c);
      await tapKey(tester, 'solo-start');
      expect(find.text('Masukkan nama 2–60 aksara.'), findsOneWidget);
      await tester.enterText(find.byType(TextFormField), 'Widget QA');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await tapKey(tester, 'solo-start');
      await tester.runAsync(() async {
        await Future<void>.delayed(const Duration(milliseconds: 40));
      });
      await tester.pump();
      await flush(tester, c);
      expect(c.game, isNotNull);
      final game = c.game!, id = c.attemptId, order = game.netOrder;
      final correct = game.question.shape;
      await tapKey(tester, 'solo-choice-solid-${correct.name}');
      expect(game.stage, GeometryCardKind.solid);
      expect(game.answers, isEmpty);
      await tapKey(tester, 'solo-r1');
      expect(game.stage, GeometryCardKind.net);
      expect(game.score, 0);
      await tapKey(tester, 'solo-hint');
      expect(game.hints, 1);
      await tapKey(tester, 'solo-choice-net-${correct.name}');
      await tester.runAsync(
        () => app.preferences.save(
          app.preferences.value.copyWith(
            language: AppLanguage.en,
            theme: AppTheme.dark,
            textScale: 1.5,
          ),
        ),
      );
      await tester.pump();
      expect(identical(c.game, game), true);
      expect(c.attemptId, id);
      expect(game.netOrder, order);
      expect(game.stage, GeometryCardKind.net);
      expect(c.selected, correct);
      expect(game.hints, 1);
      expect(find.text('Free hint'), findsNothing);
      expect(find.text('Close hint'), findsOneWidget);
      expect(tester.takeException(), isNull);
      // Denied SQLite is a real persistence failure. The UI must immediately stop
      // announcing a successful save, preserve the attempt, and expose retry.
      await tester.runAsync(app.database.close);
      await tester.runAsync(() async {
        final pending = c.checkpoint();
        expect(c.saved, false);
        await pending;
      });
      await tester.pump();
      expect(c.failure?.code, FailureCode.storage);
      expect(find.byKey(const ValueKey('solo-error')), findsOneWidget);
      expect(find.byKey(const ValueKey('solo-save-status')), findsNothing);
      expect(identical(c.game, game), true);
      expect(c.selected, correct);
      expect(tester.takeException(), isNull);
      await tester.runAsync(() async {
        c.pause();
        await c.checkpoint();
      });
      final elapsed = game.time(c.now);
      clock.milliseconds = 100000;
      expect(game.time(c.now), elapsed);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(app.dispose);
    },
  );

  testWidgets(
    'corrupt checkpoint has recovery and discard needs confirmation',
    (tester) async {
      final app = await boot(tester, PageClock());
      final c = app.composition.services.get(SoloServices.controller);
      await tester.runAsync(
        () => app.database.transaction((tx) async {
          await tx.rawInsert(
            'INSERT INTO solo_checkpoints (partition,payload) VALUES (?,?)',
            [c.actor.partition, '{bad-json'],
          );
        }),
      );
      await tester.pumpWidget(
        GeoMathApp(dependencies: app, initialRoute: 'solo-resume'),
      );
      await tester.runAsync(c.initialize);
      await tester.pump();
      expect(find.byKey(const ValueKey('solo-error')), findsOneWidget);
      await tapKey(tester, 'solo-discard');
      expect(find.byType(BottomSheet), findsOneWidget);
      await tester.ensureVisible(find.text('Batal'));
      await tester.pumpAndSettle();
      await tester.runAsync(() => tester.tap(find.text('Batal')));
      await tester.pumpAndSettle();
      expect(
        (await tester.runAsync(
          () => app.database.query('SELECT * FROM solo_checkpoints'),
        ))!.length,
        1,
      );
      await tapKey(tester, 'solo-discard');
      await tester.ensureVisible(find.text('Mula baharu'));
      await tester.pumpAndSettle();
      await tester.runAsync(() => tester.tap(find.text('Mula baharu')));
      await tester.pumpAndSettle();
      await tester.runAsync(() async {
        await Future<void>.delayed(const Duration(milliseconds: 30));
      });
      await tester.pump();
      final rowsAfter = await tester.runAsync(
        () => app.database.query('SELECT * FROM solo_checkpoints'),
      );
      await tester.pump();
      expect(
        c.failure,
        isNull,
        reason: 'failure=${c.failure?.code} rows=$rowsAfter',
      );
      expect(find.text('Belum ada permainan tersimpan.'), findsOneWidget);
      expect(
        (await tester.runAsync(
          () => app.database.query('SELECT * FROM solo_checkpoints'),
        ))!,
        isEmpty,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(app.dispose);
    },
  );
  testWidgets(
    'wrong review and final analysis preserve the original when practising missed IDs',
    (tester) async {
      final clock = PageClock();
      final app = await boot(tester, clock);
      final c = app.composition.services.get(SoloServices.controller);
      await tester.runAsync(
        () => c.start(
          name: 'Analysis QA',
          mode: SoloMode.review,
          questionIds: ['K1', 'C3'],
        ),
      );
      await tester.pumpWidget(
        GeoMathApp(dependencies: app, initialRoute: 'solo-game'),
      );
      await tester.pump();
      final original = c.game!, originalId = c.attemptId;
      final wrong = GeometryShape.values.firstWhere(
        (s) => s != original.question.shape,
      );
      await tapKey(tester, 'solo-choice-solid-${wrong.name}');
      await tapKey(tester, 'solo-r1');
      expect(original.status, SoloStatus.review);
      expect(original.answers.single.net, isNull);
      expect(find.byKey(const ValueKey('solo-continue')), findsOneWidget);
      expect(find.text('Belum dicuba'), findsNothing);
      // Explicit injected time unlocks review; advancing widget time alone does not.
      final activeClock = app.clock as PageClock;
      activeClock.milliseconds = 1800;
      await tester.pump(const Duration(milliseconds: 110));
      await tapKey(tester, 'solo-continue');
      activeClock.milliseconds = 1900;
      await tapKey(tester, 'solo-skip');
      activeClock.milliseconds = 3700;
      await tester.pump(const Duration(milliseconds: 110));
      await tapKey(tester, 'solo-continue');
      await tester.runAsync(c.finish);
      await tester.pump();
      expect(c.receipt?.durable, true);
      expect(find.text('Analisis peringkat'), findsOneWidget);
      expect(find.text('Analisis bongkah'), findsOneWidget);
      expect(find.text('Analisis topik'), findsOneWidget);
      final before = await tester.runAsync(
        () => app.database.query(
          'SELECT detail FROM solo_analysis WHERE attempt_id=?',
          [originalId],
        ),
      );
      await tapKey(tester, 'solo-review-missed');
      await flush(tester, c);
      expect(c.game!.mode, SoloMode.review);
      expect(
        c.game!.round.map((q) => q.id).toSet(),
        original.missedIds.toSet(),
      );
      expect(c.attemptId, isNot(originalId));
      expect(
        (await tester.runAsync(
          () => app.database.query(
            'SELECT detail FROM solo_analysis WHERE attempt_id=?',
            [originalId],
          ),
        )),
        before,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(app.dispose);
    },
  );
  testWidgets(
    'root Play reentry is frame safe and guarded exit persists the R2 attempt',
    (tester) async {
      final app = await boot(tester, PageClock());
      final c = app.composition.services.get(SoloServices.controller);
      await tester.pumpWidget(
        GeoMathApp(dependencies: app, initialRoute: 'cloud-game-play'),
      );
      await tester.runAsync(c.initialize);
      await tester.pump(const Duration(milliseconds: 350));
      final router = AppScope.of(
        tester.element(find.byKey(const ValueKey('solo-start'))),
      ).router;
      // Reset replaces the page while the outgoing AnimatedBuilder still listens.
      for (var i = 0; i < 2; i++) {
        await tester.runAsync(() => router.select(AppDestination.play));
        await tester.pump();
        await tester.runAsync(c.initialize);
        await tester.pump(const Duration(milliseconds: 350));
        expect(tester.takeException(), isNull);
        expect(c.loading, false);
      }
      await tester.runAsync(() async {
        expect(await c.start(name: 'Root Reentry QA'), true);
        c.choose(c.game!.question.shape);
        c.scan('r1');
        c.choose(c.game!.question.shape);
        c.hint();
        await c.checkpoint();
      });
      final game = c.game!,
          bank = c.bank,
          id = c.attemptId,
          selected = c.selected,
          netOrder = game.netOrder;
      router.open('solo-game');
      await tester.pump(const Duration(milliseconds: 350));
      await tester.runAsync(() => router.select(AppDestination.play));
      await tester.pump(const Duration(milliseconds: 350));
      await tester.runAsync(c.initialize);
      await tester.pump(const Duration(milliseconds: 350));
      expect(tester.takeException(), isNull);
      // The new destination guard checkpoints and releases the active game.
      // Resume restores the same attempt/choices, not the old in-memory object.
      expect(c.game, isNull);
      expect(c.savedSlot!.id, id);
      expect(await tester.runAsync(c.resumeSaved), isTrue);
      final resumed = c.game!;
      expect(identical(c.bank, bank), true);
      expect(c.attemptId, id);
      expect(c.selected, selected);
      expect(resumed.stage, GeometryCardKind.net);
      expect(resumed.netOrder, netOrder);
      expect(resumed.hints, game.hints);
      expect(resumed.score, game.score);
      router.open('solo-resume');
      await tester.pump(const Duration(milliseconds: 350));
      expect(tester.takeException(), isNull);
      expect(identical(c.game, resumed), true);
      await tester.runAsync(c.checkpoint);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(app.dispose);
    },
  );
}
