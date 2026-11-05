import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/design/design.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';
import 'package:geomath_flutter/features/preferences/preferences_screen.dart';

void main() {
  testWidgets('every native preference changes through the UI and reopens', (
    tester,
  ) async {
    _viewport(tester, 390);
    final store = _Store();
    final repository = (await SharedPreferencesRepository.open(store: store))
        .valueOrNull!;
    await tester.pumpWidget(_Harness(repository: repository));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('preference-language')));
    await tester.pumpAndSettle();
    await tester.tap(
      find.byKey(const ValueKey('preference-option-AppLanguage.en')),
    );
    await tester.pumpAndSettle();
    expect(find.text('Settings'), findsOneWidget);
    expect(repository.value.language, AppLanguage.en);

    await tester.tap(find.byKey(const ValueKey('preference-theme')));
    await tester.pumpAndSettle();
    await tester.tap(
      find.byKey(const ValueKey('preference-option-AppTheme.dark')),
    );
    await tester.pumpAndSettle();
    expect(
      Theme.of(tester.element(find.byType(PreferencesScreen))).brightness,
      Brightness.dark,
    );

    await tester.tap(find.byKey(const ValueKey('preference-text-scale')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('preference-option-1.5')));
    await tester.pumpAndSettle();
    for (final id in ['music', 'sound', 'motion', 'contrast']) {
      final control = find.byKey(ValueKey('preference-$id'));
      await tester.ensureVisible(control);
      await tester.pumpAndSettle();
      await tester.tap(control);
      await tester.pumpAndSettle();
    }
    const expected = AppPreferences(
      language: AppLanguage.en,
      theme: AppTheme.dark,
      textScale: 1.5,
      reducedMotion: true,
      strongContrast: true,
      musicEnabled: false,
      soundEnabled: false,
    );
    expect(repository.value, expected);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    repository.dispose();
    final reopened = (await SharedPreferencesRepository.open(store: store))
        .valueOrNull!;
    expect(reopened.value, expected);
    reopened.dispose();
  });

  testWidgets(
    'failed save keeps old control value and retry saves the same intent',
    (tester) async {
      _viewport(tester, 390);
      final store = _Store()..fail = true;
      final repository = (await SharedPreferencesRepository.open(store: store))
          .valueOrNull!;
      await tester.pumpWidget(_Harness(repository: repository));
      await tester.tap(find.byKey(const ValueKey('preference-theme')));
      await tester.pumpAndSettle();
      await tester.tap(
        find.byKey(const ValueKey('preference-option-AppTheme.dark')),
      );
      await tester.pumpAndSettle();
      expect(repository.value.theme, AppTheme.system);
      expect(find.byKey(const ValueKey('preferences-error')), findsOneWidget);
      expect(find.text('Belum disimpan'), findsOneWidget);
      store.fail = false;
      await tester.ensureVisible(find.text('Cuba semula'));
      await tester.tap(find.text('Cuba semula'));
      await tester.pumpAndSettle();
      expect(repository.value.theme, AppTheme.dark);
      expect(find.byKey(const ValueKey('preferences-error')), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
      repository.dispose();
    },
  );

  for (final width in [320.0, 390.0, 430.0, 768.0]) {
    for (final language in AppLanguage.values) {
      testWidgets(
        'settings reachable at $width dp, ${language.name}, dark/contrast/150%',
        (tester) async {
          _viewport(tester, width);
          final repository = MemoryPreferencesRepository(
            AppPreferences(
              language: language,
              theme: AppTheme.dark,
              textScale: 1.5,
              strongContrast: true,
              reducedMotion: true,
            ),
          );
          await tester.pumpWidget(_Harness(repository: repository));
          await tester.pumpAndSettle();
          final semantics = tester.ensureSemantics();
          expect(tester, meetsGuideline(androidTapTargetGuideline));
          await tester.ensureVisible(
            find.byKey(const ValueKey('preference-contrast')),
          );
          await tester.pumpAndSettle();
          await tester.tap(find.byKey(const ValueKey('preference-contrast')));
          await tester.pumpAndSettle();
          expect(repository.value.strongContrast, isFalse);
          expect(tester.takeException(), isNull);
          semantics.dispose();
          await tester.pumpWidget(const SizedBox.shrink());
          repository.dispose();
        },
      );
    }
  }
}

void _viewport(WidgetTester tester, double width) {
  tester.view.physicalSize = Size(width, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

final class _Harness extends StatelessWidget {
  const _Harness({required this.repository});
  final PreferencesRepository repository;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: repository,
    builder: (context, _) => MaterialApp(
      theme: GeoMathTheme.light(
        strongContrast: repository.value.strongContrast,
      ),
      darkTheme: GeoMathTheme.dark(
        strongContrast: repository.value.strongContrast,
      ),
      themeMode: GeoMathTheme.mode(repository.value.theme),
      themeAnimationDuration: Duration.zero,
      locale: Locale(repository.value.language.name),
      supportedLocales: AppStrings.supportedLocales,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        AppStrings.delegate,
      ],
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(
          textScaler: TextScaler.linear(repository.value.textScale),
          disableAnimations: repository.value.reducedMotion,
        ),
        child: AppStringsScope(
          strings: AppStrings(repository.value.language),
          child: child!,
        ),
      ),
      home: PreferencesScreen(repository: repository),
    ),
  );
}

final class _Store implements PreferencesStore {
  String? saved;
  bool fail = false;

  @override
  Future<String?> read() async => saved;

  @override
  Future<void> write(String value) async {
    if (fail) throw StateError('storage failure');
    saved = value;
  }
}
