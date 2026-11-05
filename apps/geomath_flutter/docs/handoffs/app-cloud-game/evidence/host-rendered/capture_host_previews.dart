// Explicit opt-in host render. This is not an Android screenshot/device test.
// Run this file directly with `flutter test`; it is outside CI test discovery.
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/app_router.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/preferences/preferences_repository.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/guest_identity_store.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/dev/cloud_game_features.dart';
import 'package:geomath_flutter/features/solo/solo_feature.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

const output = String.fromEnvironment(
  'HOST_PREVIEW_OUTPUT',
  defaultValue: '/workspace/scratch/7395917c0f68/evidence/host-previews',
);
const fontDirectory = String.fromEnvironment(
  'HOST_PREVIEW_FONTS',
  defaultValue: '/workspace/scratch/7395917c0f68/toolchains/flutter/bin/cache/artifacts/material_fonts',
);

void main() {
  sqfliteFfiInit();
  testWidgets('capture actual GeoMath widgets with the host Flutter renderer', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.runAsync(() async {
      // The host test engine defaults unspecified text families to square Ahem
      // glyphs. Load Android's default Roboto for this host-only capture.
      for (final family in ['Roboto', 'Ahem']) {
        final roboto = FontLoader(family);
        for (final name in [
          'Roboto-Regular.ttf',
          'Roboto-Medium.ttf',
          'Roboto-Bold.ttf',
        ]) {
          roboto.addFont(_font(name));
        }
        await roboto.load();
      }
      await (FontLoader(
        'MaterialIcons',
      )..addFont(_font('MaterialIcons-Regular.otf'))).load();
      await Directory(output).create(recursive: true);
    });
    final directory = (await tester.runAsync(
      () => Directory.systemTemp.createTemp('geomath-host-preview-'),
    ))!;
    final app = (await tester.runAsync(
      () => AppDependencies.bootstrap(
        features: cloudGameFeatures().map(_hostFonts).toList(),
        databasePath: '${directory.path}/preview.sqlite',
        databaseFactory: databaseFactoryFfi,
        preferencesStore: _HostPreferences(),
        guestStore: _HostGuest(),
      ),
    ))!.valueOrNull!;
    final capture = GlobalKey();
    try {
      expect(app.publicBackend.connection().isSuccess, isFalse);
      expect(app.sessions.current.isGuest, isTrue);
      await _preferences(tester, app, AppLanguage.ms, AppTheme.light, 1);
      await tester.pumpWidget(
        RepaintBoundary(
          key: capture,
          child: GeoMathApp(dependencies: app, initialRoute: 'cloud-game-play'),
        ),
      );
      await _settle(tester);
      expect(find.byKey(const ValueKey('solo-name')), findsOneWidget);
      await _save(tester, capture, '01-host-play-ms-light-100.png');

      await _preferences(tester, app, AppLanguage.en, AppTheme.dark, 1.5);
      await _settle(tester);
      await _save(tester, capture, '02-host-play-en-dark-150.png');

      await _preferences(tester, app, AppLanguage.en, AppTheme.light, 1);
      await _settle(tester);
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('solo-name')),
          matching: find.byType(TextFormField),
        ),
        'Guest preview',
      );
      await tester.ensureVisible(find.byKey(const ValueKey('solo-start')));
      await tester.tap(find.byKey(const ValueKey('solo-start')));
      await _settle(tester);
      expect(
        app.composition.services.get(SoloServices.controller).game,
        isNotNull,
      );
      expect(find.byKey(const ValueKey('solo-r1')), findsOneWidget);
      await _save(tester, capture, '03-host-solo-question-en-light-100.png');

      await _preferences(tester, app, AppLanguage.ms, AppTheme.light, 1);
      final router =
          tester.widget<MaterialApp>(find.byType(MaterialApp)).routerDelegate!
              as GeoMathRouter;
      router.open('cloud-game-profile');
      await _settle(tester);
      expect(find.byKey(const ValueKey('profile-unavailable')), findsOneWidget);
      await _save(tester, capture, '04-host-guest-profile-ms-light-100.png');
      expect(app.sessions.current.isGuest, isTrue);
      expect(tester.takeException(), isNull);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(app.dispose);
      await tester.runAsync(() => directory.delete(recursive: true));
    }
  });
}

// Explicit host capture adaptation: the test engine's Ahem fallback cannot be
// replaced reliably by registering another family with the same name. Apply
// loaded Roboto to the real routes while retaining sizes/colors/widgets/state.
// This override exists only in this opt-in rendering script, never in the APK.
FeatureContribution _hostFonts(
  FeatureContribution feature,
) => FeatureContribution(
  id: feature.id,
  services: feature.services,
  localizations: feature.localizations,
  migrations: feature.migrations,
  routes: [
    for (final route in feature.routes)
      FeatureRoute(
        name: route.name,
        path: route.path,
        backPolicy: route.backPolicy,
        showNavigation: route.showNavigation,
        builder: (context, services) {
          final base = Theme.of(context);
          final labels = WidgetStatePropertyAll(
            base.textTheme.labelLarge?.copyWith(fontFamily: 'Roboto'),
          );
          final theme = base.copyWith(
            textTheme: base.textTheme.apply(fontFamily: 'Roboto'),
            primaryTextTheme: base.primaryTextTheme.apply(fontFamily: 'Roboto'),
            chipTheme: base.chipTheme.copyWith(
              labelStyle: base.chipTheme.labelStyle?.copyWith(
                fontFamily: 'Roboto',
              ),
              secondaryLabelStyle: base.chipTheme.secondaryLabelStyle?.copyWith(
                fontFamily: 'Roboto',
              ),
            ),
            appBarTheme: base.appBarTheme.copyWith(
              titleTextStyle: base.appBarTheme.titleTextStyle?.copyWith(
                fontFamily: 'Roboto',
              ),
            ),
            filledButtonTheme: FilledButtonThemeData(
              style: base.filledButtonTheme.style?.copyWith(textStyle: labels),
            ),
            outlinedButtonTheme: OutlinedButtonThemeData(
              style: base.outlinedButtonTheme.style?.copyWith(
                textStyle: labels,
              ),
            ),
            textButtonTheme: TextButtonThemeData(
              style: base.textButtonTheme.style?.copyWith(textStyle: labels),
            ),
          );
          return Theme(
            data: theme,
            child: DefaultTextStyle.merge(
              style: const TextStyle(fontFamily: 'Roboto'),
              child: Builder(
                builder: (inner) => route.builder(inner, services),
              ),
            ),
          );
        },
      ),
  ],
);

Future<ByteData> _font(String filename) async {
  final bytes = await File('$fontDirectory/$filename').readAsBytes();
  return ByteData.sublistView(bytes);
}

Future<void> _preferences(
  WidgetTester tester,
  AppDependencies app,
  AppLanguage language,
  AppTheme theme,
  double scale,
) async {
  final result = await tester.runAsync(
    () => app.preferences.save(
      app.preferences.value.copyWith(
        language: language,
        theme: theme,
        textScale: scale,
        reducedMotion: true,
        musicEnabled: false,
        soundEnabled: false,
      ),
    ),
  );
  expect(result!.isSuccess, isTrue);
}

Future<void> _settle(WidgetTester tester) async {
  var quiet = 0;
  for (var attempt = 0; attempt < 200; attempt++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 5)),
    );
    await tester.pump(const Duration(milliseconds: 20));
    if (find.byType(CircularProgressIndicator).evaluate().isEmpty &&
        find
            .byKey(const ValueKey('cloud-game-startup-loading'))
            .evaluate()
            .isEmpty &&
        find.byType(GeoMathScaffold).evaluate().isNotEmpty &&
        !tester.binding.hasScheduledFrame) {
      if (++quiet >= 3) return;
    } else {
      quiet = 0;
    }
  }
  fail('Actual host widgets did not settle within the bounded I/O wait.');
}

Future<void> _save(WidgetTester tester, GlobalKey key, String filename) async {
  await tester.pump();
  expect(tester.takeException(), isNull, reason: filename);
  final boundary =
      key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  await tester.runAsync(() async {
    final rendered = await boundary.toImage(pixelRatio: 2);
    try {
      final data = await rendered.toByteData(format: ui.ImageByteFormat.png);
      await File('$output/$filename').writeAsBytes(
        data!.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes),
      );
    } finally {
      rendered.dispose();
    }
  });
}

// Host-only persistence seams. The app's actual repositories, database,
// contributions, Solo engine and root own all rendering and feature behavior.
final class _HostPreferences implements PreferencesStore {
  String? value;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String text) async => value = text;
}

final class _HostGuest implements GuestIdentityStore {
  @override
  Future<Result<String?>> read() async =>
      const Success('host-render-installation');
  @override
  Future<Result<void>> write(String value) async => const Success(null);
}
