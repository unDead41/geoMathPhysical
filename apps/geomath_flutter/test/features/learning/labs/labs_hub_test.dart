import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/design/design.dart';
import 'package:geomath_flutter/core/features/feature_localizations.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/features/learning/labs/lab_strings.dart';
import 'package:geomath_flutter/features/learning/labs/labs_hub.dart';

void main() {
  for (final language in AppLanguage.values) {
    for (final (width, textScale) in [
      (320.0, 1.5),
      (430.0, 1.5),
      (768.0, 1.0),
      (768.0, 1.5),
    ]) {
      testWidgets(
        '${language.name} lab modes are reachable at $width dp/$textScale text',
        (tester) async {
          tester.view.physicalSize = Size(width, 800);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final launches = <(String, Map<String, Object?>)>[];
          final semantics = tester.ensureSemantics();
          addTearDown(semantics.dispose);

          await tester.pumpWidget(
            _hub(
              language: language,
              dark: language == AppLanguage.en,
              textScale: textScale,
              onOpen: (route, arguments) => launches.add((route, arguments)),
            ),
          );
          await tester.pumpAndSettle();

          for (final id in ['net', 'volume', 'area', 'composite']) {
            expect(find.byKey(ValueKey('lab-card-$id')), findsOneWidget);
          }
          final netPosition = tester.getTopLeft(
            find.byKey(const ValueKey('lab-card-net')),
          );
          final volumePosition = tester.getTopLeft(
            find.byKey(const ValueKey('lab-card-volume')),
          );
          if (width == 768 && textScale == 1) {
            expect(volumePosition.dx, greaterThan(netPosition.dx));
            expect(volumePosition.dy, closeTo(netPosition.dy, .1));
          } else {
            expect(volumePosition.dy, greaterThan(netPosition.dy));
          }
          for (final (activity, mode) in _modeLaunches) {
            final button = find.byKey(ValueKey('lab-launch-$activity-$mode'));
            await tester.ensureVisible(button);
            await tester.pumpAndSettle();
            final label = _strings(language).text('learning_labs.$mode');
            expect(find.bySemanticsLabel(label), findsOneWidget);
            expect(tester.getSize(button).height, greaterThanOrEqualTo(48));
            await tester.tap(button);
            await tester.pumpAndSettle();
            expect(launches.last.$1, 'learning-$activity');
            expect(launches.last.$2, {'mode': mode});
            expect(tester.takeException(), isNull);
          }
          expect(launches.length, _modeLaunches.length);

          for (final id in ['projection', 'calculation', 'records']) {
            final button = find.byKey(ValueKey('lab-shortcut-$id'));
            await tester.ensureVisible(button);
            await tester.pumpAndSettle();
            await tester.tap(button);
            await tester.pumpAndSettle();
            expect(launches.last.$1, 'learning-$id');
            expect(launches.last.$2, isEmpty);
          }
          expect(launches.length, _modeLaunches.length + 3);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets(
    'native hub exposes labeled 48 dp actions and all four lab names',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final semantics = tester.ensureSemantics();
      addTearDown(semantics.dispose);
      await tester.pumpWidget(_hub(onOpen: (_, _) {}));
      await tester.pumpAndSettle();
      for (final key in [
        'netTitle',
        'volumeTitle',
        'areaTitle',
        'compositeTitle',
      ]) {
        final heading = find.text(
          _strings(AppLanguage.ms).text('learning.$key'),
        );
        await tester.ensureVisible(heading);
        await tester.pumpAndSettle();
        expect(
          find.bySemanticsLabel(_strings(AppLanguage.ms).text('learning.$key')),
          findsOneWidget,
        );
      }
      await tester.ensureVisible(
        find.byKey(const ValueKey('lab-launch-net-gallery')),
      );
      await tester.pumpAndSettle();
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('presentation changes do not launch or replace an activity', (
    tester,
  ) async {
    var launches = 0;
    void open(String _, Map<String, Object?> arguments) => launches++;
    await tester.pumpWidget(_hub(onOpen: open));
    final studio = find.byKey(const ValueKey('lab-launch-net-studio'));
    await tester.ensureVisible(studio);
    await tester.tap(studio);
    await tester.pumpAndSettle();
    expect(launches, 1);

    await tester.pumpWidget(
      _hub(language: AppLanguage.en, dark: true, onOpen: open),
    );
    await tester.pumpAndSettle();
    expect(find.text('Face connection studio'), findsOneWidget);
    expect(launches, 1);
    expect(tester.takeException(), isNull);
  });
}

const _modeLaunches = [
  ('net', 'gallery'),
  ('net', 'editor'),
  ('net', 'studio'),
  ('volume', 'compare'),
  ('volume', 'unit'),
  ('volume', 'cone'),
  ('volume', 'pyramid'),
  ('area', 'closed'),
  ('area', 'container'),
  ('area', 'cavity'),
  ('composite', 'roof'),
  ('composite', 'rocket'),
];

// Hub titles belong to the common learning contribution, separate from labs.
final _localizations = FeatureLocalizationRegistry([
  learningLabStrings,
  FeatureLocalizations(
    namespace: 'learning',
    translations: const {
      'ms': {
        'labsTitle': 'Makmal interaktif',
        'netTitle': 'Bina Bentangan',
        'volumeTitle': 'Makmal Isi Padu',
        'areaTitle': 'Luas Permukaan & Rumus',
        'compositeTitle': 'Bongkah Gabungan',
      },
      'en': {
        'labsTitle': 'Interactive labs',
        'netTitle': 'Build a Net',
        'volumeTitle': 'Volume Lab',
        'areaTitle': 'Surface Area & Formulae',
        'compositeTitle': 'Composite Solids',
      },
    },
  ),
]);

AppStrings _strings(AppLanguage language) =>
    AppStrings(language, contributions: _localizations.translations);

Widget _hub({
  required void Function(String route, Map<String, Object?> arguments) onOpen,
  AppLanguage language = AppLanguage.ms,
  bool dark = false,
  double textScale = 1.5,
}) => MaterialApp(
  locale: Locale(language.name),
  supportedLocales: AppStrings.supportedLocales,
  localizationsDelegates: const [
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ],
  theme: dark ? GeoMathTheme.dark(strongContrast: true) : GeoMathTheme.light(),
  builder: (context, child) => AppStringsScope(
    strings: _strings(language),
    child: MediaQuery(
      data: MediaQuery.of(context)
          .copyWith(textScaler: TextScaler.linear(textScale)),
      child: child!,
    ),
  ),
  home: LearningLabsHub(onOpen: onOpen, onBack: () {}),
);
