import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/design/geomath_theme.dart';
import 'package:geomath_flutter/core/features/feature_localizations.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';
import 'package:geomath_flutter/features/learning/labs/surface_pages.dart';
import 'package:geomath_flutter/features/learning/labs/surface_strings.dart';

Widget _app({
  required Widget child,
  AppLanguage language = AppLanguage.ms,
  bool dark = false,
  double scale = 1,
}) => AppStringsScope(
  strings: AppStrings(
    language,
    contributions: FeatureLocalizationRegistry([learningSurfaceStrings])
        .translations,
  ),
  child: MaterialApp(
    theme: dark
        ? GeoMathTheme.dark(strongContrast: true)
        : GeoMathTheme.light(),
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(context)
          .copyWith(textScaler: TextScaler.linear(scale)),
      child: child!,
    ),
    home: Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: child,
      ),
    ),
  ),
);

void main() {
  testWidgets(
    'native area and composite chips dispatch their canonical modes',
    (tester) async {
      final modes = <String>[];
      await tester.pumpWidget(
        _app(
          child: LearningSurfaceHeader(
            mode: 'closed',
            composite: false,
            onModeChanged: modes.add,
          ),
        ),
      );
      await tester.tap(find.widgetWithText(ChoiceChip, 'Bekas terbuka'));
      await tester.tap(find.widgetWithText(ChoiceChip, 'Rongga tembus'));
      expect(modes, ['container', 'cavity']);
      await tester.pumpWidget(
        _app(
          language: AppLanguage.en,
          child: LearningSurfaceHeader(
            mode: 'roof',
            composite: true,
            onModeChanged: modes.add,
          ),
        ),
      );
      await tester.tap(find.widgetWithText(ChoiceChip, 'Cylinder + cone'));
      expect(modes.last, 'rocket');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'advanced disclosures explain capacity, inner walls and interfaces',
    (tester) async {
      for (final mode in ['container', 'cavity', 'rocket']) {
        await tester.pumpWidget(
          _app(
            language: AppLanguage.en,
            child: LearningSurfaceHeader(
              key: ValueKey(mode),
              mode: mode,
              composite: mode == 'rocket',
              onModeChanged: (_) {},
            ),
          ),
        );
        await tester.tap(find.text('Activity guide'));
        await tester.pumpAndSettle();
        final guide = find.textContaining(switch (mode) {
          'container' => 'container capacity stays the same',
          'cavity' => 'inner walls',
          _ => 'two shared base areas',
        });
        expect(guide, findsOneWidget);
        expect(
          find.textContaining('Records are self-directed reflections'),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      }
    },
  );

  testWidgets(
    'guidance and tap alternatives reflow at phone and tablet sizes',
    (tester) async {
      addTearDown(() => tester.view.resetPhysicalSize());
      addTearDown(() => tester.view.resetDevicePixelRatio());
      tester.view.devicePixelRatio = 1;
      for (final width in [320.0, 390.0, 768.0]) {
        tester.view.physicalSize = Size(width, 900);
        for (final language in AppLanguage.values) {
          for (final dark in [false, true]) {
            for (final scale in [1.0, 1.5]) {
              await tester.pumpWidget(
                _app(
                  language: language,
                  dark: dark,
                  scale: scale,
                  child: LearningSurfaceHeader(
                    key: ValueKey('$width-$language-$dark-$scale'),
                    mode: 'cavity',
                    composite: false,
                    onModeChanged: (_) {},
                  ),
                ),
              );
              for (final chip in find.byType(ChoiceChip).evaluate()) {
                final size = tester.getSize(find.byWidget(chip.widget));
                expect(size.height, greaterThanOrEqualTo(48));
                expect(size.width, lessThanOrEqualTo(width - 40));
              }
              await tester.tap(find.byType(ExpansionTile));
              await tester.pumpAndSettle();
              expect(tester.takeException(), isNull);
            }
          }
        }
      }
    },
  );
}
