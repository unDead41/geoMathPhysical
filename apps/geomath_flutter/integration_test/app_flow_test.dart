import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/features/help/report_screen.dart';
import 'package:geomath_flutter/features/learning/module_spike_host.dart';
import 'package:geomath_flutter/features/preferences/preferences_screen.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';
import 'package:webview_flutter/webview_flutter.dart';

// Android only: real SQLite, preferences, clipboard and canonical WebView.
// Run with network disabled on the test emulator for the offline receipt:
// flutter test integration_test/app_flow_test.dart -d <android-device-id>
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'guest app opens real offline module, persists preferences/records and keeps reports local',
    (tester) async {
      expect(defaultTargetPlatform, TargetPlatform.android);
      final cache = await getTemporaryDirectory();
      final fixtureDirectory = await Directory(
        '${cache.path}/geomath-smoke-${DateTime.now().microsecondsSinceEpoch}',
      ).create();
      final databasePath = '${fixtureDirectory.path}/foundation.sqlite';
      final opened = await AppDependencies.bootstrap(
        databasePath: databasePath,
      );
      expect(opened, isA<Success<AppDependencies>>());
      var app = (opened as Success<AppDependencies>).value;
      final originalPreferences = app.preferences.value;
      var disposed = false;
      try {
        expect(app.sessions.current.isGuest, isTrue);
        final guestPartition = app.sessions.current.partition;
        expect(
          await app.preferences.save(
            const AppPreferences(
              theme: AppTheme.light,
              reducedMotion: true,
              musicEnabled: false,
              soundEnabled: false,
            ),
          ),
          isA<Success<void>>(),
        );
        await tester.pumpWidget(GeoMathApp(dependencies: app));
        await tester.pumpAndSettle();
        await _tap(tester, 'home-explore');
        await _until(
          tester,
          () =>
              find.byType(WebViewWidget).evaluate().isNotEmpty &&
              find.byType(LinearProgressIndicator).evaluate().isEmpty,
          timeout: const Duration(seconds: 50),
        );
        final webView = tester.widget<WebViewWidget>(
          find.byType(WebViewWidget),
        );
        final platformController = webView.platform.params.controller;
        expect(
          await platformController.currentUrl(),
          ModuleSpikeController.trustedAssetUrl,
        );
        expect(
          await platformController.runJavaScriptReturningResult(
            'window.GeoMathModule.diagnostics().emittedReady',
          ),
          true,
        );
        final instance = await platformController.runJavaScriptReturningResult(
          'window.GeoMathModule.diagnostics().instanceId',
        );
        final router = AppScope.of(
          tester.element(find.byType(ModuleSpikeScreen)),
        ).router;
        router.open('preferences');
        await tester.pumpAndSettle();
        await _tap(tester, 'preference-language');
        await _tap(tester, 'preference-option-AppLanguage.en');
        await _until(
          tester,
          () => app.preferences.value.language == AppLanguage.en,
        );
        await _tap(tester, 'preference-theme');
        await _tap(tester, 'preference-option-AppTheme.dark');
        await _until(
          tester,
          () => app.preferences.value.theme == AppTheme.dark,
        );
        await _tap(tester, 'preference-text-scale');
        await _tap(tester, 'preference-option-1.5');
        await _until(tester, () => app.preferences.value.textScale == 1.5);
        router.back();
        await tester.pumpAndSettle();
        expect(find.byType(PreferencesScreen), findsNothing);
        final returned = tester.widget<WebViewWidget>(
          find.byType(WebViewWidget),
        );
        expect(
          identical(returned.platform.params.controller, platformController),
          isTrue,
        );
        expect(
          await returned.platform.params.controller
              .runJavaScriptReturningResult(
                'window.GeoMathModule.diagnostics().instanceId',
              ),
          instance,
        );
        router.back();
        await tester.pumpAndSettle();

        for (final destination in ['play', 'classes', 'profile']) {
          await _tap(tester, 'nav-$destination');
          expect(find.text('Development incomplete'), findsOneWidget);
        }
        await _tap(tester, 'nav-home');
        await _tap(tester, 'home-help');
        await _tap(tester, 'help-report');
        for (final entry in const {
          'description': 'The displayed net needs checking.',
          'steps': 'Rotate the cube, then unfold it.',
          'expected': 'Face labels remain attached to the same faces.',
          'actual': 'An unexpected label is shown.',
        }.entries) {
          final field = find.descendant(
            of: find.byKey(ValueKey('report-${entry.key}')),
            matching: find.byType(TextFormField),
          );
          await tester.ensureVisible(field);
          await tester.enterText(field, entry.value);
        }
        FocusManager.instance.primaryFocus?.unfocus();
        await _tap(tester, 'report-preview');
        final preview = tester.widget<SelectableText>(
          find.byKey(const ValueKey('report-preview-text')),
        );
        expect(preview.data, contains('Reports are never sent automatically.'));
        expect(preview.data, isNot(contains(app.sessions.current.sessionId)));
        await _tap(tester, 'report-copy');
        final copied = await Clipboard.getData(Clipboard.kTextPlain);
        expect(copied?.text, preview.data);

        final closePreview = tester.binding.handlePopRoute();
        await tester.pumpAndSettle();
        await closePreview;
        expect(find.byKey(const ValueKey('report-preview-text')), findsNothing);
        expect(find.byType(ReportScreen), findsOneWidget);
        final back = tester.binding.handlePopRoute();
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Keep editing'));
        await tester.pumpAndSettle();
        expect(find.text('Keep editing').hitTestable(), findsOneWidget);
        await tester.tap(find.text('Keep editing'));
        await tester.pumpAndSettle();
        await back;
        expect(find.byType(ReportScreen), findsOneWidget);

        final reflection = ModuleReflection.create(
          activity: ModuleActivity.net,
          stage: ReflectionStage.prediction,
          prediction: 'Six connected faces can fold into the cube.',
        );
        expect(reflection, isA<Success<ModuleReflection>>());
        final saved = await app.records.saveReflection(
          actor: app.sessions.current,
          reflection: (reflection as Success<ModuleReflection>).value,
        );
        expect(saved, isA<Success<DurableRecordReceipt>>());
        expect(
          (saved as Success<DurableRecordReceipt>).value.state,
          FormativeSaveState.local,
        );
        final persistedPreferences = app.preferences.value;
        await tester.pumpWidget(const SizedBox.shrink());
        await app.dispose();
        disposed = true;
        final reopened = await AppDependencies.bootstrap(
          databasePath: databasePath,
        );
        expect(reopened, isA<Success<AppDependencies>>());
        app = (reopened as Success<AppDependencies>).value;
        disposed = false;
        expect(app.sessions.current.partition, guestPartition);
        expect(app.preferences.value, persistedPreferences);
        final read = await app.records
            .watchReflections(app.sessions.current)
            .first;
        expect(read, isA<Success<List<ModuleReflection>>>());
        expect(
          (read as Success<List<ModuleReflection>>).value.map(
            (r) => r.activity,
          ),
          contains(ModuleActivity.net),
        );
        await tester.pumpWidget(GeoMathApp(dependencies: app));
        await tester.pumpAndSettle();
        expect(find.text('Hello, explorer!'), findsOneWidget);
        expect(tester.takeException(), isNull);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        if (!disposed) {
          await app.preferences.save(originalPreferences);
          await app.dispose();
        }
        await fixtureDirectory.delete(recursive: true);
      }
    },
    timeout: const Timeout(Duration(minutes: 5)),
  );
}

Future<void> _tap(WidgetTester tester, String key) async {
  final target = find.byKey(ValueKey(key));
  if (target.evaluate().isEmpty &&
      find.byType(DraggableScrollableSheet).evaluate().isNotEmpty) {
    await tester.scrollUntilVisible(
      target,
      180,
      scrollable: find
          .descendant(
            of: find.byType(DraggableScrollableSheet),
            matching: find.byType(Scrollable),
          )
          .first,
    );
  } else {
    await tester.ensureVisible(target);
  }
  await tester.pumpAndSettle();
  expect(target.hitTestable(), findsOneWidget, reason: '$key is not reachable');
  await tester.tap(target);
  await tester.pumpAndSettle();
}

Future<void> _until(
  WidgetTester tester,
  bool Function() condition, {
  Duration timeout = const Duration(seconds: 15),
}) async {
  final deadline = DateTime.now().add(timeout);
  while (!condition()) {
    if (DateTime.now().isAfter(deadline)) {
      fail('Android app-flow condition did not complete within $timeout.');
    }
    await tester.pump(const Duration(milliseconds: 100));
  }
}
