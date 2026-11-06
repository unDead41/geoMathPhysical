import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/app_router.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/guest_identity_store.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/features/ai_battle/ai_battle_feature.dart';
import 'package:geomath_flutter/features/ai_battle/presentation/ai_battle_screen.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  sqfliteFfiInit();

  Future<AppDependencies> bootstrap(
    WidgetTester tester, {
    AppPreferences preferences = const AppPreferences(),
    GlobalKey<_ActivityState>? activityKey,
    List<FeatureContribution> extraFeatures = const [],
  }) async {
    final result = await tester.runAsync(
      () => AppDependencies.bootstrap(
        databasePath: inMemoryDatabasePath,
        databaseFactory: databaseFactoryFfi,
        preferencesStore: _PreferencesStore(preferences),
        guestStore: _GuestStore(),
        features: [
          FeatureContribution(
            id: 'adaptive-test',
            routes: [
              FeatureRoute(
                name: 'test-learn',
                path: '/learn',
                builder: (_, _) => _Activity(key: activityKey),
              ),
              FeatureRoute(
                name: 'test-play',
                path: '/play',
                builder: (_, _) => const GeoMathScaffold(
                  title: 'Play',
                  body: Text('Play destination'),
                ),
              ),
            ],
          ),
          ...extraFeatures,
        ],
      ),
    );
    expect(result, isA<Success<AppDependencies>>());
    final dependencies = (result! as Success<AppDependencies>).value;
    addTearDown(() async {
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(dependencies.dispose);
    });
    return dependencies;
  }

  for (final (width, systemScale) in [
    (320.0, 1.5),
    (390.0, 1.5),
    (430.0, 1.5),
    (768.0, 1.5),
    (320.0, 2.0),
  ]) {
    for (final language in AppLanguage.values) {
      testWidgets(
        'navigation at $width dp/${language.name}/system$systemScale honors large text',
        (tester) async {
          _viewport(tester, width);
          tester.platformDispatcher.textScaleFactorTestValue = systemScale;
          addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
          final app = await bootstrap(
            tester,
            preferences: AppPreferences(
              language: language,
              textScale: 1.5,
              reducedMotion: true,
              strongContrast: true,
              hapticsEnabled: false,
            ),
          );
          await tester.pumpWidget(
            GeoMathApp(dependencies: app, initialRoute: 'test-learn'),
          );
          await tester.pumpAndSettle();
          final semantics = tester.ensureSemantics();
          expect(
            MediaQuery.textScalerOf(
              tester.element(find.byKey(const ValueKey('activity-heading'))),
            ).scale(16),
            16 * systemScale * 1.5,
          );
          expect(
            find.byType(NavigationRail),
            width >= 600 ? findsOneWidget : findsNothing,
          );
          expect(
            find.byType(GeoDestinationBar),
            width < 600 ? findsOneWidget : findsNothing,
          );
          expect(tester, meetsGuideline(androidTapTargetGuideline));
          for (final destination in [
            'home',
            'learn',
            'play',
            'classes',
            'profile',
          ]) {
            final target = find.byKey(ValueKey('nav-$destination'));
            final size = tester.getSize(target);
            expect(size.width, greaterThanOrEqualTo(48));
            expect(size.height, greaterThanOrEqualTo(48));
          }
          if (width < 600) {
            expect(
              tester.getSize(find.byType(GeoDestinationBar)).height,
              lessThan(300),
            );
            expect(
              tester
                  .widget<GeoDestinationBar>(find.byType(GeoDestinationBar))
                  .selectedIndex,
              AppDestination.learn.index,
            );
          }
          await tester.tap(find.byKey(const ValueKey('nav-play')));
          await tester.pumpAndSettle();
          expect(find.text('Play destination'), findsOneWidget);
          expect(tester.takeException(), isNull);
          semantics.dispose();
        },
      );
    }
  }

  testWidgets(
    'landscape rail scrolls all destinations into reach at combined 225% text',
    (tester) async {
      _viewport(tester, 800);
      tester.view.physicalSize = const Size(800, 600);
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final app = await bootstrap(
        tester,
        preferences: const AppPreferences(
          language: AppLanguage.en,
          textScale: 1.5,
          reducedMotion: true,
        ),
      );
      await tester.pumpWidget(
        GeoMathApp(dependencies: app, initialRoute: 'test-learn'),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final target = find.byKey(const ValueKey('nav-profile'));
      await tester.ensureVisible(target);
      await tester.pumpAndSettle();
      expect(tester.getSize(target).height, greaterThanOrEqualTo(48));
      await tester.tap(target);
      await tester.pumpAndSettle();
      expect(find.byType(UninstalledFeatureScreen), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'rail, utilities and preferences preserve mounted activity and scroll',
    (tester) async {
      _viewport(tester, 390);
      final activityKey = GlobalKey<_ActivityState>();
      final app = await bootstrap(tester, activityKey: activityKey);
      await tester.pumpWidget(
        GeoMathApp(dependencies: app, initialRoute: 'test-learn'),
      );
      await tester.pumpAndSettle();
      final activity = activityKey.currentState!;
      final router = AppScope.of(activity.context).router;
      await tester.enterText(find.byType(TextField), 'Draft survives layout');
      await tester.drag(
        find.byType(SingleChildScrollView),
        const Offset(0, -600),
      );
      await tester.pumpAndSettle();
      double offset() => tester
          .state<ScrollableState>(find.byType(Scrollable).first)
          .position
          .pixels;
      final savedOffset = offset();
      expect(savedOffset, greaterThan(0));

      tester.view.physicalSize = const Size(768, 900);
      await tester.pumpAndSettle();
      expect(activityKey.currentState, same(activity));
      expect(activity.controller.text, 'Draft survives layout');
      // The rail adds its own scroll view; the feature scroll is scoped below
      // the activity so its offset is independent of the rail.
      final activityScroll = find.descendant(
        of: find.byType(_Activity),
        matching: find.byType(Scrollable),
      );
      expect(
        tester.state<ScrollableState>(activityScroll.first).position.pixels,
        savedOffset,
      );
      await tester.runAsync(
        () => app.preferences.save(
          app.preferences.value.copyWith(
            language: AppLanguage.en,
            theme: AppTheme.dark,
            textScale: 1.5,
            reducedMotion: true,
            hapticsEnabled: false,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(activityKey.currentState, same(activity));
      expect(activity.controller.text, 'Draft survives layout');

      router.open('preferences');
      await tester.pumpAndSettle();
      expect(router.destination, AppDestination.learn);
      await tester.runAsync(router.popRoute);
      await tester.pumpAndSettle();
      expect(activityKey.currentState, same(activity));
      final currentInstance = router.navigation.current.instance;
      await tester.runAsync(() => router.select(AppDestination.learn));
      expect(router.navigation.current.instance, currentInstance);
      expect(activityKey.currentState, same(activity));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('returning to a destination restores its scroll offset', (
    tester,
  ) async {
    _viewport(tester, 390);
    final app = await bootstrap(tester);
    await tester.pumpWidget(
      GeoMathApp(dependencies: app, initialRoute: 'test-learn'),
    );
    await tester.pumpAndSettle();
    await tester.drag(
      find.byType(SingleChildScrollView),
      const Offset(0, -650),
    );
    await tester.pumpAndSettle();
    final savedOffset = tester
        .state<ScrollableState>(find.byType(Scrollable).first)
        .position
        .pixels;
    await tester.tap(find.byKey(const ValueKey('nav-play')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('nav-learn')));
    await tester.pumpAndSettle();
    expect(
      tester
          .state<ScrollableState>(find.byType(Scrollable).first)
          .position
          .pixels,
      savedOffset,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'AI confirmation consumes one back before returning to the preserved activity',
    (tester) async {
      _viewport(tester, 390);
      final activityKey = GlobalKey<_ActivityState>();
      final app = await bootstrap(
        tester,
        activityKey: activityKey,
        preferences: const AppPreferences(textScale: 1.5, reducedMotion: true),
        extraFeatures: [aiBattleFeature()],
      );
      final ai = (await tester.runAsync(
        () async => app.composition.services.get(AiBattleServices.controller),
      ))!;
      await tester.runAsync(() async {
        await ai.initialize();
        expect(
          await ai.start(
            name: 'Previously saved match',
            difficulty: AiDifficulty.easy,
          ),
          isTrue,
        );
        expect(await ai.leave(), isTrue);
      });
      final savedId = ai.savedSlot!.id;
      await tester.pumpWidget(
        Builder(
          builder: (context) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: const _NonlinearScaler()),
            child: GeoMathApp(dependencies: app, initialRoute: 'test-learn'),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final activity = activityKey.currentState!;
      final router = AppScope.of(activity.context).router;
      final activityInstance = router.navigation.current.instance;
      await tester.enterText(
        find.byType(TextField),
        'Preserved learning draft',
      );
      FocusManager.instance.primaryFocus?.unfocus();
      router.open('ai-battle');
      await tester.pump();
      await _settleAiRead(tester, ai);
      await tester.pumpAndSettle();
      final aiInstance = router.navigation.current.instance;
      expect(find.byType(GeoDestinationBar), findsNothing);
      expect(find.byType(NavigationRail), findsNothing);
      expect(router.destination, AppDestination.play);
      final aiContext = tester.element(find.byType(AiBattleScreen));
      final scaler = MediaQuery.textScalerOf(aiContext);
      expect(scaler.scale(16), 48);
      expect(scaler.scale(32), 72);
      final name = find.descendant(
        of: find.byKey(const ValueKey('ai-name')),
        matching: find.byType(TextFormField),
      );
      await tester.enterText(name, 'Retained AI draft');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pump();
      final start = find.byKey(const ValueKey('ai-start'));
      await tester.ensureVisible(start);
      await tester.pumpAndSettle();
      await tester.tap(start);
      await tester.pumpAndSettle();
      expect(find.byType(ConfirmationSheet), findsOneWidget);

      expect(
        await tester.runAsync(() {
          final firstBack = router.popRoute();
          router.back();
          return firstBack;
        }),
        isTrue,
      );
      await tester.pumpAndSettle();
      expect(find.byType(ConfirmationSheet), findsNothing);
      expect(router.navigation.current.instance, aiInstance);
      expect(ai.savedSlot!.id, savedId);
      expect(ai.game, isNull);

      tester.view.physicalSize = const Size(768, 900);
      await tester.runAsync(
        () => app.preferences.save(
          app.preferences.value.copyWith(
            language: AppLanguage.en,
            theme: AppTheme.dark,
          ),
        ),
      );
      await tester.pump();
      await _settleAiRead(tester, ai);
      await tester.pumpAndSettle();
      expect(find.byType(GeoDestinationBar), findsNothing);
      expect(find.byType(NavigationRail), findsNothing);
      expect(
        tester.widget<TextFormField>(name).controller!.text,
        'Retained AI draft',
      );
      expect(
        app.composition.services.get(AiBattleServices.controller),
        same(ai),
      );
      expect(activityKey.currentState, same(activity));
      expect(activity.controller.text, 'Preserved learning draft');

      expect(await tester.runAsync(router.popRoute), isTrue);
      await tester.pumpAndSettle();
      expect(router.navigation.current.instance, activityInstance);
      expect(activityKey.currentState, same(activity));
      expect(activity.controller.text, 'Preserved learning draft');
      expect(find.byType(NavigationRail), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('system reduced motion disables theme transitions and feedback', (
    tester,
  ) async {
    final app = await bootstrap(tester);
    await tester.pumpWidget(
      GeoMathApp(dependencies: app, initialRoute: 'test-learn'),
    );
    await tester.pumpAndSettle();
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<MaterialApp>(find.byType(MaterialApp))
          .themeAnimationDuration,
      Duration.zero,
    );
    final context = tester.element(
      find.byKey(const ValueKey('activity-heading')),
    );
    expect(MediaQuery.disableAnimationsOf(context), isTrue);
    expect(GeoFeedbackPolicy.maybeOf(context)!.reducedMotion, isTrue);
    expect(tester.takeException(), isNull);
  });
}

void _viewport(WidgetTester tester, double width) {
  tester.view.physicalSize = Size(width, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

Future<void> _settleAiRead(
  WidgetTester tester,
  AiBattleController controller,
) async {
  // The real route starts its SQLite read in the widget zone. Alternate I/O
  // and frames so neither the real completion nor fake async waits on itself.
  final deadline = Stopwatch()..start();
  do {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 10)),
    );
    await tester.pump(const Duration(milliseconds: 50));
    if (!controller.loading) return;
  } while (deadline.elapsed < const Duration(seconds: 10));
  fail('The AI route did not complete its local SQLite read.');
}

final class _Activity extends StatefulWidget {
  const _Activity({super.key});

  @override
  State<_Activity> createState() => _ActivityState();
}

final class _ActivityState extends State<_Activity> {
  final controller = TextEditingController();

  @override
  Widget build(BuildContext context) => GeoMathScaffold(
    title: AppStrings.of(context).language == AppLanguage.ms
        ? 'Penerokaan model geometri'
        : 'Explore geometry models',
    body: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Current activity', key: ValueKey('activity-heading')),
        TextField(controller: controller),
        for (var index = 0; index < 30; index++)
          SizedBox(height: 80, child: Text('Learning section $index')),
      ],
    ),
  );

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }
}

final class _PreferencesStore implements PreferencesStore {
  _PreferencesStore(AppPreferences preferences)
    : value = jsonEncode(preferences.toJson());
  String value;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String value) async => this.value = value;
}

final class _GuestStore implements GuestIdentityStore {
  @override
  Future<Result<String?>> read() async => const Success('adaptive-test-guest');
  @override
  Future<Result<void>> write(String guestId) async => const Success(null);
}

final class _NonlinearScaler extends TextScaler {
  const _NonlinearScaler();

  @override
  double scale(double fontSize) => fontSize * (fontSize <= 20 ? 2 : 1.5);

  @override
  double get textScaleFactor => 2;
}
