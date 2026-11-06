import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/app_router.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'support/cloud_game_test_support.dart';

void main() {
  sqfliteFfiInit();
  // Cached asset Futures must not retain a completed test's fake-async zone.
  // Every profile still reads and verifies the real bundled contract bytes.
  setUp(rootBundle.clear);

  const routes = [
    'cloud-game-play',
    'cloud-game-classes',
    'cloud-game-profile',
    'cloud-game-login',
    'cloud-game-signup',
    'cloud-game-recover',
    'cloud-game-legacy-recovery',
    'cloud-game-confirmation',
    'cloud-game-reset',
    'cloud-game-security',
    'cloud-game-sessions',
    'solo-resume',
    'solo-game',
    'solo-scores',
    'ai-battle',
    'cloud-game-duel',
    'cloud-game-duel-lobby',
    'cloud-game-duel-match',
    'cloud-game-duel-result',
    'sync.pending',
  ];

  for (final width in [320.0, 390.0, 430.0, 768.0]) {
    for (final language in AppLanguage.values) {
      for (final theme in [AppTheme.light, AppTheme.dark]) {
        testWidgets(
          'real guest routes fit $width dp ${language.name}/${theme.name}/150% and expose labeled tap targets',
          (tester) async {
            tester.view.physicalSize = Size(width, 1000);
            tester.view.devicePixelRatio = 1;
            addTearDown(tester.view.resetPhysicalSize);
            addTearDown(tester.view.resetDevicePixelRatio);
            final semantics = tester.ensureSemantics();
            final app = (await tester.runAsync(bootstrapCloudGameForTest))!;
            try {
              await tester.runAsync(
                () => app.preferences.save(
                  app.preferences.value.copyWith(
                    language: language,
                    theme: theme,
                    textScale: 1.5,
                    reducedMotion: true,
                    musicEnabled: false,
                    soundEnabled: false,
                  ),
                ),
              );
              await tester.pumpWidget(
                GeoMathApp(dependencies: app, initialRoute: 'cloud-game-play'),
              );
              await settleCloudGameIo(tester);
              final router = _router(tester);
              final guest = app.sessions.current;
              final writer = app.composition.services.get(
                FoundationServices.recordsWriter,
              );
              expect(
                app.composition.features
                    .where((feature) => feature.id != 'foundation')
                    .expand((feature) => feature.routes)
                    .map((route) => route.name)
                    .toSet(),
                routes.toSet(),
              );
              for (final route in routes) {
                if (router.navigation.current.route.name != route) {
                  router.navigation.reset(route);
                }
                await settleCloudGameIo(tester);
                expect(router.navigation.current.route.name, route);
                expect(find.byType(MaterialApp), findsOneWidget);
                expect(
                  find.byType(GeoMathScaffold),
                  findsOneWidget,
                  reason: route,
                );
                expect(app.sessions.current, guest, reason: route);
                expect(
                  app.composition.services.get(
                    FoundationServices.recordsWriter,
                  ),
                  same(writer),
                );
                if (route == 'cloud-game-login') {
                  expect(
                    find.byKey(const ValueKey('auth-unavailable')),
                    findsOneWidget,
                  );
                  final submit = tester.widget<ActionButton>(
                    find.byKey(const ValueKey('auth-login-submit')),
                  );
                  expect(submit.onPressed, isNull);
                }
                if (route == 'cloud-game-classes') {
                  expect(
                    find
                            .byKey(const ValueKey('classroom-guest'))
                            .evaluate()
                            .isNotEmpty ||
                        find
                            .byKey(const ValueKey('classroom-unavailable'))
                            .evaluate()
                            .isNotEmpty,
                    isTrue,
                  );
                }
                if (route == 'cloud-game-duel') {
                  expect(
                    find.byKey(const ValueKey('duel-unavailable')),
                    findsOneWidget,
                  );
                }
                for (final text in tester.widgetList<Text>(find.byType(Text))) {
                  expect(
                    RegExp(
                      r'^(auth|profile|classroom|solo|duel|sync|ai_battle|cloud_game_preview)\.[A-Za-z_]',
                    ).hasMatch(text.data ?? ''),
                    isFalse,
                    reason: '$route exposed an untranslated key: ${text.data}',
                  );
                }
                await expectLater(
                  tester,
                  meetsGuideline(androidTapTargetGuideline),
                );
                await expectLater(
                  tester,
                  meetsGuideline(labeledTapTargetGuideline),
                );
                expect(tester.takeException(), isNull, reason: route);
              }
            } finally {
              semantics.dispose();
              await tester.pumpWidget(const SizedBox.shrink());
              await tester.runAsync(app.dispose);
            }
          },
        );
      }
    }
  }

  testWidgets(
    'installed destination taps keep one guest and do not authorize raw account routes',
    (tester) async {
      final app = (await tester.runAsync(bootstrapCloudGameForTest))!;
      try {
        await tester.pumpWidget(
          GeoMathApp(dependencies: app, initialRoute: 'cloud-game-play'),
        );
        await settleCloudGameIo(tester);
        final router = _router(tester);
        final actor = app.sessions.current;
        // Re-selecting the installed destination can replace a mounted route.
        // Existing controller listeners must not be notified during that build.
        await tester.tap(find.byKey(const ValueKey('nav-play')));
        await settleCloudGameIo(tester);
        expect(tester.takeException(), isNull);
        for (final destination in ['classes', 'profile', 'play']) {
          final target = find.byKey(ValueKey('nav-$destination'));
          expect(tester.getSize(target).height, greaterThanOrEqualTo(48));
          await tester.tap(target);
          await settleCloudGameIo(tester);
          expect(router.currentConfiguration, '/$destination');
          expect(app.sessions.current, actor);
        }
        for (final entry in const {
          'solo-ai': 'ai-battle',
          'solo-duel': 'cloud-game-duel',
          'solo-sync': 'sync.pending',
        }.entries) {
          final target = find.byKey(ValueKey(entry.key));
          expect(target, findsOneWidget);
          await tester.ensureVisible(target);
          await tester.pump();
          await tester.tap(target);
          await settleCloudGameIo(tester);
          expect(router.navigation.current.route.name, entry.value);
          expect(app.sessions.current, actor);
          expect(tester.takeException(), isNull);
          router.back();
          await settleCloudGameIo(tester);
          expect(router.navigation.current.route.name, 'cloud-game-play');
        }
        for (final route in [
          'cloud-game-reset',
          'cloud-game-security',
          'cloud-game-sessions',
        ]) {
          router.open(route);
          await settleCloudGameIo(tester);
          expect(app.sessions.current, actor);
          expect(app.sessions.current.isGuest, isTrue);
          expect(tester.takeException(), isNull);
          router.back();
          await settleCloudGameIo(tester);
        }
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.runAsync(app.dispose);
      }
    },
  );
}

GeoMathRouter _router(WidgetTester tester) =>
    tester.widget<MaterialApp>(find.byType(MaterialApp)).routerDelegate!
        as GeoMathRouter;

/// SQLite FFI and bundled assets perform real I/O outside the fake widget clock.
/// Keep the wait bounded instead of skipping loading states or faking a result.
Future<void> settleCloudGameIo(WidgetTester tester) async {
  var quietFrames = 0;
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
      // A route's first quiet frame may precede its FutureBuilder child. Keep
      // servicing real SQLite/asset I/O between consecutive stable frames.
      quietFrames++;
      if (quietFrames >= 3) return;
    } else {
      quietFrames = 0;
    }
  }
  fail(
    'Cloud/game preview did not reach a stable page within the bounded I/O wait. '
    'Pages: ${tester.widgetList<GeoMathScaffold>(find.byType(GeoMathScaffold)).map((page) => page.title).toList()}; '
    'progress: ${find.byType(CircularProgressIndicator).evaluate().length}; '
    'startup: ${find.byKey(const ValueKey('cloud-game-startup-loading')).evaluate().length}.',
  );
}
