import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/design/design.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/navigation/app_navigation.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/preferences/preferences_repository.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/guest_identity_store.dart';
import 'package:geomath_flutter/features/learning/learning_catalogue.dart';
import 'package:geomath_flutter/features/learning/learning_strings.dart';
import 'package:geomath_flutter/features/learning/presentation/learning_hub.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

const _routes = [
  'learning-explore',
  'learning-views',
  'learning-notes',
  'learning-calculator',
  'learning-labs',
  'learning-net',
  'learning-volume',
  'learning-area',
  'learning-composite',
  'learning-projection',
  'learning-calculation',
  'learning-records',
];

void main() {
  sqfliteFfiInit();

  testWidgets('native routes carry the chosen canonical shape', (tester) async {
    final app = await _open(tester);
    try {
      await tester.ensureVisible(find.widgetWithText(ChoiceChip, 'Sphere'));
      await tester.tap(find.widgetWithText(ChoiceChip, 'Sphere'));
      await tester.pumpAndSettle();
      expect(find.text('Selected shape: Sphere'), findsOneWidget);
      for (final route in _routes) {
        final key = route == 'learning-explore'
            ? 'learning-open-explore'
            : route == 'learning-labs'
            ? 'learning-open-labs'
            : 'learning-open-$route';
        await tester.ensureVisible(find.byKey(ValueKey(key)));
        await tester.tap(find.byKey(ValueKey(key)));
        await tester.pumpAndSettle();
        final probe = find.text('$route:sphere');
        expect(probe, findsOneWidget);
        AppScope.of(tester.element(probe)).router.back();
        await tester.pumpAndSettle();
        expect(find.text('Selected shape: Sphere'), findsOneWidget);
      }
      expect(tester.takeException(), isNull);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(app.dispose);
    }
  });

  testWidgets('320dp and 150% dark contrast preserve the selected shape', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 780);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final bundle = _CatalogueBundle();
    final app = await _open(tester, bundle: bundle);
    try {
      await tester.ensureVisible(find.widgetWithText(ChoiceChip, 'Hemisphere'));
      await tester.tap(find.widgetWithText(ChoiceChip, 'Hemisphere'));
      await tester.pumpAndSettle();
      expect(bundle.catalogueLoads, 1);
      final saved = await tester.runAsync(
        () => app.preferences.save(
          app.preferences.value.copyWith(
            language: AppLanguage.ms,
            theme: AppTheme.dark,
            strongContrast: true,
            textScale: 1.5,
          ),
        ),
      );
      expect(saved, isA<Success<void>>());
      await tester.pumpAndSettle();
      expect(find.text('Bentuk pilihan: Hemisfera'), findsOneWidget);
      expect(bundle.catalogueLoads, 1);
      expect(tester.takeException(), isNull);
      for (final route in _routes.skip(1)) {
        final key = route == 'learning-labs'
            ? 'learning-open-labs'
            : 'learning-open-$route';
        final card = find.byKey(ValueKey(key));
        await tester.ensureVisible(card);
        await tester.pumpAndSettle();
        expect(tester.getSize(card).height, greaterThanOrEqualTo(48));
        expect(tester.getSize(card).width, lessThanOrEqualTo(280));
        expect(tester.takeException(), isNull);
      }
      tester.view.physicalSize = const Size(1024, 768);
      await tester.pumpAndSettle();
      expect(find.text('Bentuk pilihan: Hemisfera'), findsOneWidget);
      expect(bundle.catalogueLoads, 1);
      expect(tester.takeException(), isNull);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(app.dispose);
    }
  });

  testWidgets('unreadable catalogue shows retry and can recover', (
    tester,
  ) async {
    final bundle = _CatalogueBundle()..fail = true;
    final registry = FeatureLocalizationRegistry([learningStrings]);
    await tester.pumpWidget(
      DefaultAssetBundle(
        bundle: bundle,
        child: AppStringsScope(
          strings: AppStrings(
            AppLanguage.en,
            contributions: registry.translations,
          ),
          child: MaterialApp(
            theme: GeoMathTheme.light(),
            home: const LearningHub(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Shapes could not be loaded'), findsOneWidget);
    expect(find.text('Start exploring'), findsNothing);
    bundle.fail = false;
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    expect(find.text('11 shapes to explore'), findsOneWidget);
    expect(find.text('Start exploring'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

// These tests exercise the actual foundation router, preferences and SQLite
// composition. Leaf probes observe navigation only; no model/runtime is faked.
Future<AppDependencies> _open(
  WidgetTester tester, {
  AssetBundle? bundle,
}) async {
  final result = await tester.runAsync(
    () => AppDependencies.bootstrap(
      databasePath: inMemoryDatabasePath,
      databaseFactory: databaseFactoryFfi,
      preferencesStore: _PreferencesStore(),
      guestStore: _GuestStore(),
      features: [
        FeatureContribution(
          id: 'learning_qa',
          localizations: [learningStrings],
          routes: [
            FeatureRoute(
              name: 'learning',
              path: '/learning',
              showNavigation: false,
              builder: (_, _) => const LearningHub(),
            ),
            for (final route in _routes)
              FeatureRoute(
                name: route,
                path: '/learning/qa/$route',
                showNavigation: false,
                builder: (context, _) => Scaffold(
                  body: Text(
                    '$route:${AppRouteScope.of(context).entry.arguments['shapeId']}',
                  ),
                ),
              ),
          ],
        ),
      ],
    ),
  );
  expect(result, isA<Success<AppDependencies>>());
  final app = (result! as Success<AppDependencies>).value;
  Widget widget = GeoMathApp(dependencies: app, initialRoute: 'learning');
  if (bundle != null) {
    widget = DefaultAssetBundle(bundle: bundle, child: widget);
  }
  await tester.pumpWidget(widget);
  await tester.pumpAndSettle();
  return app;
}

final class _CatalogueBundle extends CachingAssetBundle {
  bool fail = false;
  int catalogueLoads = 0;

  @override
  Future<ByteData> load(String key) {
    if (key == LearningCatalogue.assetPath) {
      catalogueLoads++;
      if (fail) {
        return Future.error(const FormatException('Unreadable catalogue'));
      }
    }
    return rootBundle.load(key);
  }
}

final class _PreferencesStore implements PreferencesStore {
  String value = jsonEncode(
    const AppPreferences(
      language: AppLanguage.en,
      theme: AppTheme.light,
      reducedMotion: true,
    ).toJson(),
  );
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String value) async => this.value = value;
}

final class _GuestStore implements GuestIdentityStore {
  @override
  Future<Result<String?>> read() async =>
      const Success('learning-hub-test-guest');
  @override
  Future<Result<void>> write(String guestId) async => const Success(null);
}
