import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/audio/audio_coordinator.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/module/module_host_bridge.dart';
import 'package:geomath_flutter/core/preferences/preferences_repository.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/features/learning/module_asset_repository.dart';
import 'package:geomath_flutter/features/learning/module_spike_host.dart';

final class _MissingAssets extends CachingAssetBundle {
  @override
  Future<ByteData> load(String key) =>
      Future.error(StateError('Missing bundle'));
}

void main() {
  test(
    'an absent offline bundle cannot construct WebView or emit ready',
    () async {
      final sessions = SessionController.guest(
        guestId: 'fixture',
        sessionId: 'session',
      );
      final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
      final audio = AudioCoordinator(lifecycle: lifecycle);
      final preferences = MemoryPreferencesRepository();
      final controller = ModuleSpikeController(
        sessions: sessions,
        lifecycle: lifecycle,
        preferences: preferences,
        audio: audio,
        assets: ModuleAssetRepository(bundle: _MissingAssets()),
      );
      await controller.initialize();
      final receipt = await controller.ready;
      expect(receipt, isA<Failed<ModuleCommand>>());
      expect(receipt.failureOrNull!.code, FailureCode.unavailable);
      expect(controller.phase, ModuleLoadPhase.failed);
      expect(controller.webViewController, isNull);
      expect(controller.acceptedCommandCount, 0);
      expect(controller.bridge.status, ModuleBridgeStatus.closed);
      controller.dispose();
      preferences.dispose();
      await audio.close();
      lifecycle.dispose();
      await sessions.dispose();
    },
  );
}
