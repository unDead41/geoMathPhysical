import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/audio/audio_coordinator.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/module/module_host_bridge.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/preferences/preferences_repository.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/features/learning/module_asset_repository.dart';
import 'package:geomath_flutter/features/learning/module_spike_host.dart';
import 'package:integration_test/integration_test.dart';
import 'package:webview_flutter/webview_flutter.dart';

// Run on Android, with emulator network disabled for the offline receipt:
// flutter test integration_test/module_spike_test.dart -d <android-device-id>
// No WebView platform/controller is replaced by this test.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'real local WebView rotates/unfolds and survives preferences and actor switch',
    (tester) async {
      expect(defaultTargetPlatform, TargetPlatform.android);
      final opened = await SharedPreferencesRepository.open();
      expect(opened, isA<Success<SharedPreferencesRepository>>());
      final preferences =
          (opened as Success<SharedPreferencesRepository>).value;
      final originalPreferences = preferences.value;
      final sessions = SessionController.guest(
        guestId: 'android-module-smoke',
        sessionId: 'android-module-smoke-session',
      );
      final lifecycle = AppLifecycleController();
      final audio = AudioCoordinator(lifecycle: lifecycle, enabled: false);
      final controllers = <ModuleSpikeController>[];
      addTearDown(() async {
        for (final controller in controllers.reversed) {
          controller.dispose();
        }
        await audio.close();
        await preferences.save(originalPreferences);
        preferences.dispose();
        lifecycle.dispose();
        await sessions.dispose();
      });
      expect(
        await preferences.save(
          const AppPreferences(
            language: AppLanguage.ms,
            theme: AppTheme.light,
            musicEnabled: false,
            soundEnabled: false,
          ),
        ),
        isA<Success<void>>(),
      );
      final first = ModuleSpikeController(
        sessions: sessions,
        lifecycle: lifecycle,
        preferences: preferences,
        audio: audio,
      );
      controllers.add(first);
      await _mount(tester, first, sessions, lifecycle, preferences, audio);
      expect(find.byType(WebViewWidget), findsOneWidget);
      expect(
        await first.webViewController!.currentUrl(),
        ModuleSpikeController.trustedAssetUrl,
      );
      expect(first.lastValidatedCommand?.kind, ModuleCommandKind.ready);
      expect(first.lastValidatedCommand?.binding, sessions.current);
      final initial = await _diagnostics(tester, first);
      expect(initial['readyAcknowledged'], isTrue);
      final readyCount = first.acceptedCommandCount;
      final duplicateReady = jsonEncode({
        ...first.bridge.identity.toJson(),
        'command': 'ready',
        'payload': <String, Object?>{},
      });
      await first.webViewController!.runJavaScript(
        'window.GeoMathNative.postMessage(${jsonEncode(duplicateReady)})',
      );
      await tester.pump(const Duration(milliseconds: 200));
      expect(first.acceptedCommandCount, readyCount);
      final initialModel = initial['model'] as Map<String, Object?>;
      expect(initialModel['modelCount'], 11);
      expect(initialModel['shape'], 'cube');
      expect(initialModel['meshSource'], 'learning-mesh.mjs/studySolidMesh');

      await first.webViewController!.runJavaScript(
        "window.GeoMathModule.activateControl('stop-auto');"
        "window.GeoMathModule.activateControl('rotate-right');",
      );
      final rotated = await _diagnostics(
        tester,
        first,
        accept: (value) =>
            (value['model'] as Map)['yaw'] != initialModel['yaw'],
      );
      await first.webViewController!.runJavaScript(
        "window.GeoMathModule.activateControl('set-unfold', 610)",
      );
      final unfolded = await _diagnostics(
        tester,
        first,
        accept: (value) => ((value['model'] as Map)['progress'] as num) > 0.5,
      );
      expect(
        (unfolded['model'] as Map)['yaw'],
        (rotated['model'] as Map)['yaw'],
      );
      final platformController = first.webViewController;
      final instance = first.bridge.identity.instanceId;
      expect(
        await preferences.save(
          preferences.value.copyWith(
            language: AppLanguage.en,
            theme: AppTheme.dark,
            textScale: 1.5,
            strongContrast: true,
          ),
        ),
        isA<Success<void>>(),
      );
      final changed = await _diagnostics(
        tester,
        first,
        accept: (value) =>
            (value['settings'] as Map?)?['language'] == 'en' &&
            (value['settings'] as Map?)?['textSize'] == 150,
      );
      expect(identical(first.webViewController, platformController), isTrue);
      expect(first.bridge.identity.instanceId, instance);
      for (final key in [
        'shape',
        'yaw',
        'pitch',
        'zoom',
        'progress',
        'mode',
        'learningView',
        'dimensions',
      ]) {
        expect(
          (changed['model'] as Map)[key],
          (unfolded['model'] as Map)[key],
          reason: '$key reset during preferences update',
        );
      }

      final staleEnvelope = jsonEncode({
        ...first.bridge.identity.toJson(),
        'command': 'ready',
        'payload': <String, Object?>{},
      });
      final oldActor = sessions.current;
      sessions.logout();
      await _until(tester, () => first.phase == ModuleLoadPhase.closed);
      expect(sessions.current.epoch, greaterThan(oldActor.epoch));
      // Reopen is a new platform-view lifetime. Drain the old native document
      // before attaching another renderer, while retaining the stale envelope
      // above to prove the new instance still rejects its former capability.
      await first.webViewController!.runJavaScript(
        'window.GeoMathModule.dispose()',
      );
      await tester.pumpWidget(const SizedBox.shrink());
      first.dispose();
      await tester.pump();
      final second = ModuleSpikeController(
        sessions: sessions,
        lifecycle: lifecycle,
        preferences: preferences,
        audio: audio,
      );
      controllers.add(second);
      await _mount(tester, second, sessions, lifecycle, preferences, audio);
      final acceptedBefore = second.acceptedCommandCount;
      await second.webViewController!.runJavaScript(
        'window.GeoMathNative.postMessage(${jsonEncode(staleEnvelope)})',
      );
      await tester.pump(const Duration(milliseconds: 200));
      expect(second.acceptedCommandCount, acceptedBefore);
      expect(second.phase, ModuleLoadPhase.ready);
      expect(second.lastValidatedCommand?.binding, sessions.current);
      expect(second.bridge.identity.instanceId, isNot(instance));
      await tester.pumpWidget(const SizedBox.shrink());
    },
    timeout: const Timeout(Duration(minutes: 4)),
  );

  for (final corrupt in [false, true]) {
    testWidgets(
      '${corrupt ? 'corrupt' : 'missing'} local asset never creates a ready WebView',
      (tester) async {
        expect(defaultTargetPlatform, TargetPlatform.android);
        final opened = await SharedPreferencesRepository.open();
        expect(opened, isA<Success<SharedPreferencesRepository>>());
        final preferences =
            (opened as Success<SharedPreferencesRepository>).value;
        final sessions = SessionController.guest(
          guestId: 'android-asset-smoke',
          sessionId: 'android-asset-smoke-session',
        );
        final lifecycle = AppLifecycleController();
        final audio = AudioCoordinator(lifecycle: lifecycle, enabled: false);
        final controller = ModuleSpikeController(
          sessions: sessions,
          lifecycle: lifecycle,
          preferences: preferences,
          audio: audio,
          assets: ModuleAssetRepository(
            bundle: _FaultingAssetBundle(corrupt: corrupt),
          ),
        );
        addTearDown(() async {
          controller.dispose();
          await audio.close();
          preferences.dispose();
          lifecycle.dispose();
          await sessions.dispose();
        });
        await tester.pumpWidget(
          MaterialApp(
            home: ModuleSpikeScreen(
              sessions: sessions,
              lifecycle: lifecycle,
              preferences: preferences,
              audio: audio,
              controller: controller,
            ),
          ),
        );
        await _until(tester, () => controller.phase == ModuleLoadPhase.failed);
        expect(await controller.ready, isA<Failed<ModuleCommand>>());
        expect(controller.webViewController, isNull);
        expect(controller.acceptedCommandCount, 0);
        expect(find.byType(WebViewWidget), findsNothing);
        expect(find.byType(SelectableText), findsOneWidget);
        await tester.pumpWidget(const SizedBox.shrink());
      },
      timeout: const Timeout(Duration(minutes: 1)),
    );
  }
}

Future<void> _mount(
  WidgetTester tester,
  ModuleSpikeController controller,
  SessionController sessions,
  AppLifecycleController lifecycle,
  PreferencesRepository preferences,
  AudioCoordinator audio,
) async {
  var nextDiagnostic = DateTime.now().add(const Duration(seconds: 10));
  await tester.pumpWidget(
    MaterialApp(
      home: ModuleSpikeScreen(
        // A fresh module instance owns a fresh screen State and platform view.
        key: ValueKey(controller.bridge.identity.instanceId),
        sessions: sessions,
        lifecycle: lifecycle,
        preferences: preferences,
        audio: audio,
        controller: controller,
      ),
    ),
  );
  await _until(
    tester,
    () =>
        controller.phase == ModuleLoadPhase.ready ||
        controller.phase == ModuleLoadPhase.failed ||
        controller.phase == ModuleLoadPhase.closed,
    timeout: const Duration(seconds: 50),
    action: () async {
      if (DateTime.now().isBefore(nextDiagnostic)) return;
      nextDiagnostic = DateTime.now().add(const Duration(seconds: 10));
      await _logStartupState(controller, lifecycle);
    },
  );
  expect(
    controller.phase,
    ModuleLoadPhase.ready,
    reason: controller.failure?.message,
  );
  expect(await controller.ready, isA<Success<ModuleCommand>>());
}

Future<void> _logStartupState(
  ModuleSpikeController controller,
  AppLifecycleController lifecycle,
) async {
  final safe = <String, Object?>{
    'phase': controller.phase.name,
    'lifecycle': lifecycle.phase.name,
    'bridge': controller.bridge.status.name,
    'accepted': controller.acceptedCommandCount,
  };
  final view = controller.webViewController;
  if (view != null) {
    try {
      safe['trustedUrl'] =
          await view.currentUrl().timeout(const Duration(seconds: 2)) ==
          ModuleSpikeController.trustedAssetUrl;
      Object? decoded = await view
          .runJavaScriptReturningResult('''
JSON.stringify((() => {
  const d = window.GeoMathModule?.diagnostics();
  return {documentReady:document.readyState,adapterAvailable:!!d,
    moduleReady:d?.moduleReady,settingsReady:d?.settingsReady,
    emittedReady:d?.emittedReady,readyAcknowledged:d?.readyAcknowledged,
    active:d?.active,bootstrap:d?.bootstrap};
})())
''')
          .timeout(const Duration(seconds: 2));
      while (decoded is String) {
        decoded = jsonDecode(decoded);
      }
      if (decoded is Map) safe['wrapper'] = decoded;
    } catch (_) {
      safe['diagnosticsAvailable'] = false;
    }
  }
  debugPrint('GEOMATH_STARTUP ${jsonEncode(safe)}');
}

Future<Map<String, Object?>> _diagnostics(
  WidgetTester tester,
  ModuleSpikeController controller, {
  bool Function(Map<String, Object?>)? accept,
}) async {
  Map<String, Object?>? result;
  await _until(
    tester,
    () => result != null,
    action: () async {
      await controller.webViewController!.runJavaScript(
        'window.GeoMathModule.inspect()',
      );
      await tester.pump(const Duration(milliseconds: 75));
      Object? decoded = await controller.webViewController!
          .runJavaScriptReturningResult(
            'JSON.stringify(window.GeoMathModule.diagnostics())',
          );
      while (decoded is String) {
        decoded = jsonDecode(decoded);
      }
      final value = Map<String, Object?>.from(decoded! as Map);
      if (value['model'] is Map && (accept == null || accept(value))) {
        result = value;
      }
    },
  );
  return result!;
}

Future<void> _until(
  WidgetTester tester,
  bool Function() condition, {
  Duration timeout = const Duration(seconds: 15),
  Future<void> Function()? action,
}) async {
  final deadline = DateTime.now().add(timeout);
  while (!condition()) {
    if (DateTime.now().isAfter(deadline)) {
      fail('Android module condition did not complete within $timeout.');
    }
    await action?.call();
    await tester.pump(const Duration(milliseconds: 75));
  }
}

/// Fault injection affects real bundled bytes before native verification.
/// The platform WebView is not mocked or replaced.
final class _FaultingAssetBundle extends CachingAssetBundle {
  _FaultingAssetBundle({required this.corrupt});
  final bool corrupt;

  @override
  Future<ByteData> load(String key) async {
    final original = await rootBundle.load(key);
    if (key != 'assets/module/native-adapter.js') return original;
    if (!corrupt) throw StateError('Deliberate missing bundled asset.');
    final bytes = Uint8List.fromList(Uint8List.sublistView(original));
    bytes[0] ^= 1;
    return ByteData.sublistView(bytes);
  }
}
