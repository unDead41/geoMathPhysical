import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/geometry/geometry_card_provider.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/runtime/clock.dart';
import 'package:geomath_flutter/core/runtime/random_source.dart';
import 'package:geomath_flutter/core/session/guest_identity_store.dart';
import 'package:geomath_flutter/core/storage/app_database.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/features/ai_battle/ai_battle_feature.dart';
import 'package:geomath_flutter/features/duel/presentation/game_card_carousel.dart';
import 'package:geomath_flutter/features/duel/presentation/game_question_content.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

final class _Clock implements Clock {
  int value = 0;
  @override
  int monotonicMilliseconds() => value;
  @override
  DateTime now() =>
      DateTime.utc(2026, 11, 6).add(Duration(milliseconds: value));
}

final class _Preferences implements PreferencesStore {
  _Preferences(AppLanguage language, AppTheme theme, double scale)
    : value = jsonEncode(
        AppPreferences(
          language: language,
          theme: theme,
          textScale: scale,
          reducedMotion: true,
          musicEnabled: false,
          soundEnabled: false,
        ).toJson(),
      );
  String value;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String next) async => value = next;
}

final class _Guest implements GuestIdentityStore {
  @override
  Future<Result<String?>> read() async => const Success('ai-ui-fixture');
  @override
  Future<Result<void>> write(String guestId) async => const Success(null);
}

final class _Harness {
  _Harness(this.app, this.clock);
  final AppDependencies app;
  final _Clock clock;
  AiBattleController get c =>
      app.composition.services.get(AiBattleServices.controller);
}

/// Test-only wall-clock delay around the REAL SQLite read. The second read is
/// issued by the production route after bootstrap, inside the widget event zone.
final class _SlowReadDatabase implements AppDatabase {
  _SlowReadDatabase(this.delegate, this.delayMs);
  final AppDatabase delegate;
  final int delayMs;
  int reads = 0;
  @override
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> arguments = const [],
  ]) async {
    if (++reads == 2) {
      await Zone.root.run(
        () => Future<void>.delayed(Duration(milliseconds: delayMs)),
      );
    }
    return delegate.query(sql, arguments);
  }

  @override
  Future<T> transaction<T>(Future<T> Function(AppTransaction) action) =>
      delegate.transaction(action);
  @override
  Stream<void> get changes => delegate.changes;
  @override
  Future<void> close() => delegate.close();
}

FeatureContribution _feature({int secondReadDelayMs = 0}) {
  final real = aiBattleFeature();
  if (secondReadDelayMs == 0) return real;
  return FeatureContribution(
    id: real.id,
    migrations: real.migrations,
    routes: real.routes,
    localizations: real.localizations,
    services: [
      for (final factory in real.services)
        if (factory.name != AiBattleServices.repository.name) factory,
      ServiceFactory<AiBattleRepository>(
        key: AiBattleServices.repository,
        createService: (services) => AiBattleRepository(
          database: _SlowReadDatabase(
            services.get(FoundationServices.database),
            secondReadDelayMs,
          ),
          sessions: services.get(FoundationServices.sessions),
        ),
        dispose: (repository) => repository.drain(),
      ),
    ],
  );
}

Future<void> _pumpUntil(
  WidgetTester tester,
  bool Function() ready, {
  required String waitingFor,
}) async {
  final deadline = Stopwatch()..start();
  do {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 10)),
    );
    await tester.pump(const Duration(milliseconds: 50));
    if (ready()) return;
  } while (deadline.elapsed < const Duration(seconds: 10));
  fail(
    'Timed out waiting for $waitingFor after pumping real I/O and widget frames.',
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();

  Future<_Harness> boot(
    WidgetTester tester, {
    AppLanguage language = AppLanguage.ms,
    AppTheme theme = AppTheme.light,
    double width = 390,
    double scale = 1,
    int secondReadDelayMs = 0,
  }) async {
    tester.view.physicalSize = Size(width, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final clock = _Clock();
    final result = await tester.runAsync(
      () => AppDependencies.bootstrap(
        features: [_feature(secondReadDelayMs: secondReadDelayMs)],
        databasePath: inMemoryDatabasePath,
        databaseFactory: databaseFactoryFfi,
        preferencesStore: _Preferences(language, theme, scale),
        guestStore: _Guest(),
        clock: clock,
        random: DefaultRandomSource(Random(41)),
      ),
    );
    expect(result!.isSuccess, isTrue);
    final app = result.valueOrNull!;
    final h = _Harness(app, clock);
    await tester.runAsync(() async {
      final controller = app.composition.services.get(
        AiBattleServices.controller,
      );
      await controller.initialize();
    });
    await tester.pumpWidget(
      GeoMathApp(dependencies: app, initialRoute: 'ai-battle'),
    );
    await _pumpUntil(
      tester,
      () => !h.c.loading && !h.c.busy,
      waitingFor: 'the actual AI route to finish loading',
    );
    return h;
  }

  Future<void> flush(WidgetTester tester, _Harness h) async {
    // Widget callbacks can start SQLite completions in the fake event zone.
    // Let both real I/O and fresh frames progress rather than blocking a frame
    // on a second write queued behind one of those completions.
    await _pumpUntil(
      tester,
      () =>
          !h.c.busy &&
          !h.c.loading &&
          (h.c.game == null || h.c.saved || h.c.failure != null),
      waitingFor: 'the AI owner and its current durable save',
    );
    await tester.pump(const Duration(milliseconds: 50));
  }

  Future<void> tap(WidgetTester tester, _Harness h, String key) async {
    await flush(tester, h);
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump();
    final finder = find.byKey(ValueKey(key));
    await tester.ensureVisible(finder);
    await tester.pump();
    await tester.runAsync(() => tester.tap(finder));
    await flush(tester, h);
  }

  Future<void> start(WidgetTester tester, _Harness h) async {
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('ai-name')),
        matching: find.byType(TextFormField),
      ),
      'Adaptive QA',
    );
    await tap(tester, h, 'ai-start');
    expect(h.c.game, isNotNull);
    expect(h.c.game!.difficulty, AiDifficulty.medium);
  }

  Future<void> close(WidgetTester tester, _Harness h) async {
    await tester.pumpWidget(const SizedBox.shrink());
    var complete = false;
    Object? failure;
    StackTrace? failureTrace;
    await tester.runAsync(() async {
      // Do not hold runAsync open while a queued operation needs a widget-zone
      // continuation. Keep pumping both zones until the actual drain completes.
      unawaited(
        h.app.dispose().then(
          (_) => complete = true,
          onError: (Object error, StackTrace trace) {
            failure = error;
            failureTrace = trace;
            complete = true;
          },
        ),
      );
    });
    await _pumpUntil(
      tester,
      () => complete,
      waitingFor: 'AI route disposal and queued SQLite cleanup',
    );
    if (failure != null) {
      Error.throwWithStackTrace(failure!, failureTrace!);
    }
  }

  Finder carouselScrollable() => find.descendant(
    of: find.byType(GameCardCarousel),
    matching: find.byWidgetPredicate(
      (w) => w is Scrollable && w.axis == Axis.horizontal,
    ),
  );

  for (final language in AppLanguage.values) {
    for (final theme in [AppTheme.light, AppTheme.dark]) {
      testWidgets(
        '320dp/150% ${language.name}/${theme.name} setup, match, pause and review fit',
        (tester) async {
          final h = await boot(
            tester,
            language: language,
            theme: theme,
            width: 320,
            scale: 1.5,
          );
          try {
            expect(tester.takeException(), isNull);
            expect(find.byKey(const ValueKey('ai-difficulty')), findsOneWidget);
            final chips = tester.widgetList<ChoiceChip>(
              find.byType(ChoiceChip),
            );
            expect(chips, hasLength(3));
            for (final chip in chips) {
              await tester.ensureVisible(find.byWidget(chip));
              await tester.pump();
              expect(
                tester.getSize(find.byWidget(chip)).height,
                greaterThanOrEqualTo(48),
              );
            }
            await tap(tester, h, 'ai-start');
            expect(h.c.game, isNull);
            expect(
              find.text(
                language == AppLanguage.ms
                    ? 'Masukkan nama 2–60 aksara.'
                    : 'Enter a name with 2–60 characters.',
              ),
              findsOneWidget,
            );
            await start(tester, h);
            expect(find.byType(GameQuestionContent), findsOneWidget);
            expect(find.byType(GameCardCarousel), findsOneWidget);
            expect(
              find.byKey(const ValueKey('ai-correct-answer')),
              findsNothing,
            );
            await tap(tester, h, 'ai-pause');
            expect(find.byKey(const ValueKey('ai-paused')), findsOneWidget);
            await tester.ensureVisible(find.byKey(const ValueKey('ai-resume')));
            expect(
              tester.getSize(find.byKey(const ValueKey('ai-resume'))).height,
              greaterThanOrEqualTo(48),
            );
            await tap(tester, h, 'ai-resume');
            final shape = h.c.game!.player.question.shape;
            await tap(tester, h, 'ai-choice-solid-${shape.name}');
            await tap(tester, h, 'ai-r1');
            expect(h.c.game!.player.stage, GeometryCardKind.net);
            await tap(tester, h, 'ai-choice-net-${shape.name}');
            await tap(tester, h, 'ai-r2');
            expect(h.c.game!.player.score, 1);
            h.clock.value += 17000;
            h.c.tick();
            await flush(tester, h);
            expect(
              find.byKey(const ValueKey('ai-question-review')),
              findsOneWidget,
            );
            expect(
              tester
                  .widget<ActionButton>(
                    find.byKey(const ValueKey('ai-continue')),
                  )
                  .onPressed,
              isNull,
            );
            h.clock.value += 2000;
            h.c.tick();
            await flush(tester, h);
            await tester.ensureVisible(
              find.byKey(const ValueKey('ai-continue')),
            );
            expect(
              tester.getSize(find.byKey(const ValueKey('ai-continue'))).height,
              greaterThanOrEqualTo(48),
            );
            expect(tester.takeException(), isNull);
          } finally {
            await close(tester, h);
          }
        },
      );
    }
  }

  testWidgets(
    'left/right browsing does not select, consume a scan or expose the AI answer',
    (tester) async {
      final h = await boot(tester);
      try {
        await start(tester, h);
        final game = h.c.game!;
        final before = jsonEncode(game.checkpoint(h.c.now));
        await tap(tester, h, 'ai-cards-next');
        expect(game.selected, isNull);
        await tester.drag(carouselScrollable(), const Offset(-200, 0));
        await tester.pump(const Duration(milliseconds: 300));
        expect(game.selected, isNull);
        expect(game.player.answers, isEmpty);
        expect(game.player.attemptedSolid, isNull);
        expect(jsonEncode(game.checkpoint(h.c.now)), before);
        expect(
          tester
              .widget<ActionButton>(find.byKey(const ValueKey('ai-r1')))
              .onPressed,
          isNull,
        );
        expect(
          tester
              .widget<ActionButton>(find.byKey(const ValueKey('ai-r2')))
              .onPressed,
          isNull,
        );
        // AI may settle first. The UI still must not render its choices or the
        // canonical answer while the human can answer the question.
        h.clock.value += 17000;
        h.c.tick();
        await flush(tester, h);
        expect(game.aiStage, AiOpponentStage.done);
        expect(find.byKey(const ValueKey('ai-question-review')), findsNothing);
        expect(find.byKey(const ValueKey('ai-correct-answer')), findsNothing);
        expect(find.byKey(const ValueKey('ai-player-feedback')), findsNothing);
        final shape = game.player.question.shape;
        await tap(tester, h, 'ai-choice-solid-${shape.name}');
        expect(game.player.attemptedSolid, isNull);
        await tap(tester, h, 'ai-r1');
        expect(game.player.stage, GeometryCardKind.net);
        expect(game.selected, isNull);
        expect(find.byKey(const ValueKey('ai-correct-answer')), findsNothing);
        await tap(tester, h, 'ai-choice-net-${shape.name}');
        await tap(tester, h, 'ai-r2');
        expect(game.questionSettled, isTrue);
        expect(
          find.byKey(const ValueKey('ai-question-review')),
          findsOneWidget,
        );
        expect(find.byKey(const ValueKey('ai-correct-answer')), findsOneWidget);
        expect(game.player.score, 1);
        expect(tester.takeException(), isNull);
      } finally {
        await close(tester, h);
      }
    },
  );

  testWidgets(
    'pause retains both clocks and explicit resume does not fast-forward AI',
    (tester) async {
      final h = await boot(tester);
      try {
        await start(tester, h);
        h.clock.value += 1000;
        h.c.tick();
        await tap(tester, h, 'ai-pause');
        final game = h.c.game!;
        final before = jsonEncode(game.checkpoint(h.c.now));
        final time = game.player.time(h.c.now);
        h.clock.value += 60000;
        await tester.pump(const Duration(seconds: 1));
        expect(game.paused, isTrue);
        expect(game.player.time(h.c.now), time);
        expect(jsonEncode(game.checkpoint(h.c.now)), before);
        expect(game.aiAnswers, isEmpty);
        await tap(tester, h, 'ai-resume');
        expect(game.paused, isFalse);
        expect(game.aiAnswers, isEmpty);
        expect(game.player.time(h.c.now), time);
        expect(tester.takeException(), isNull);
      } finally {
        await close(tester, h);
      }
    },
  );

  testWidgets(
    'current target stays committed, next target adapts, preference changes keep the match and carousel',
    (tester) async {
      final h = await boot(tester);
      try {
        await start(tester, h);
        final game = h.c.game!, id = h.c.attemptId;
        final target = tester
            .widget<Text>(find.byKey(const ValueKey('ai-target-accuracy')))
            .data;
        await tap(tester, h, 'ai-cards-next');
        final scroll = tester
            .state<ScrollableState>(carouselScrollable())
            .position;
        final offset = scroll.pixels;
        expect(offset, greaterThan(0));
        await tester.runAsync(
          () => h.app.preferences.save(
            h.app.preferences.value.copyWith(
              language: AppLanguage.en,
              theme: AppTheme.dark,
              textScale: 1.5,
            ),
          ),
        );
        await flush(tester, h);
        expect(identical(h.c.game, game), isTrue);
        expect(h.c.attemptId, id);
        expect(scroll.pixels, offset);
        final firstAccuracy = game.currentPlan.accuracy;
        final shape = game.player.question.shape;
        await tap(tester, h, 'ai-choice-solid-${shape.name}');
        await tap(tester, h, 'ai-r1');
        await tap(tester, h, 'ai-choice-net-${shape.name}');
        await tap(tester, h, 'ai-r2');
        expect(game.currentPlan.accuracy, firstAccuracy);
        expect(
          tester
              .widget<Text>(find.byKey(const ValueKey('ai-target-accuracy')))
              .data,
          contains((firstAccuracy * 100).round().toString()),
        );
        expect(target, isNotEmpty);
        h.clock.value += 17000;
        h.c.tick();
        await flush(tester, h);
        h.clock.value += 2000;
        h.c.tick();
        await tap(tester, h, 'ai-continue');
        expect(game.index, 1);
        expect(game.currentPlan.accuracy, greaterThan(firstAccuracy));
        expect(
          tester.state<ScrollableState>(carouselScrollable()).position.pixels,
          0,
        );
        expect(tester.takeException(), isNull);
      } finally {
        await close(tester, h);
      }
    },
  );

  testWidgets('replacement confirmation cannot start under a different actor', (
    tester,
  ) async {
    final h = await boot(tester);
    try {
      await start(tester, h);
      expect(await tester.runAsync(h.c.leave), isTrue);
      await flush(tester, h);
      expect(h.c.game, isNull);
      expect(h.c.savedSlot, isNotNull);
      final oldId = h.c.savedSlot!.id;
      await tester.ensureVisible(find.byKey(const ValueKey('ai-start')));
      await tester.tap(find.byKey(const ValueKey('ai-start')));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Ganti perlawanan AI?'), findsOneWidget);
      h.app.sessions.bindUser(userId: 'ai-other-actor', sessionId: 'changed');
      await tester.pump(const Duration(milliseconds: 50));
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 10)),
      );
      await tester.pumpAndSettle();
      final confirm = find.text('Mula baharu');
      await tester.ensureVisible(confirm);
      await tester.pump();
      expect(confirm.hitTestable(), findsOneWidget);
      await tester.runAsync(() => tester.tap(confirm));
      await tester.pumpAndSettle();
      expect(find.byType(ConfirmationSheet), findsNothing);
      await flush(tester, h);
      expect(h.c.game, isNull);
      final field = tester.widget<TextFormField>(
        find.descendant(
          of: find.byKey(const ValueKey('ai-name')),
          matching: find.byType(TextFormField),
        ),
      );
      expect(field.controller!.text, isEmpty);
      final rows = await tester.runAsync(
        () => h.app.database.query('SELECT payload FROM ai_battle_slots'),
      );
      expect(
        rows!.map((row) => (jsonDecode(row['payload'] as String) as Map)['id']),
        contains(oldId),
      );
      expect(tester.takeException(), isNull);
    } finally {
      await close(tester, h);
    }
  });

  testWidgets(
    'question transitions reset vertical position while preferences retain it',
    (tester) async {
      final h = await boot(tester, width: 320, scale: 1.5);
      ScrollPosition vertical() => tester
          .state<ScrollableState>(
            find
                .byWidgetPredicate(
                  (widget) =>
                      widget is Scrollable && widget.axis == Axis.vertical,
                )
                .first,
          )
          .position;
      try {
        await start(tester, h);
        expect(
          vertical().pixels,
          0,
          reason: 'The first question must start with its prompt visible.',
        );
        final game = h.c.game!, shape = h.c.game!.player.question.shape;
        await tap(tester, h, 'ai-choice-solid-${shape.name}');
        await tap(tester, h, 'ai-r1');
        await tap(tester, h, 'ai-choice-net-${shape.name}');
        await tap(tester, h, 'ai-r2');
        h.clock.value += 17000;
        h.c.tick();
        await flush(tester, h);
        h.clock.value += 2000;
        h.c.tick();
        await tester.ensureVisible(find.byKey(const ValueKey('ai-continue')));
        await tester.pump();
        expect(vertical().pixels, greaterThan(0));
        await tap(tester, h, 'ai-continue');
        expect(game.index, 1);
        expect(
          vertical().pixels,
          0,
          reason:
              'The next prompt must not inherit the review scroll position.',
        );
        vertical().jumpTo(200);
        await tester.pump();
        final offset = vertical().pixels;
        await tester.runAsync(
          () => h.app.preferences.save(
            h.app.preferences.value.copyWith(
              language: AppLanguage.en,
              theme: AppTheme.dark,
            ),
          ),
        );
        await flush(tester, h);
        expect(
          vertical().pixels,
          offset,
          reason: 'Preferences do not change question scope.',
        );
        expect(tester.takeException(), isNull);
      } finally {
        await close(tester, h);
      }
    },
  );

  testWidgets(
    'slow real SQLite route read becomes ready and cleanup drains across widget frames',
    (tester) async {
      final h = await boot(tester, secondReadDelayMs: 800);
      try {
        expect(
          h.c.loading,
          isFalse,
          reason: 'A fixed300ms pump budget cannot claim readiness.',
        );
        expect(
          tester
              .widget<ActionButton>(find.byKey(const ValueKey('ai-start')))
              .onPressed,
          isNotNull,
        );
        await start(tester, h);
        expect(h.c.game, isNotNull);
      } finally {
        await close(tester, h);
      }
    },
  );
}
