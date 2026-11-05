import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/features/auth/data/native_auth_links.dart';

/// Compatibility with the platform channels of locked app_links 7.2.2.
/// These fixture messages do not prove Android intents or hosted OAuth consent.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  const methods = MethodChannel('com.llfbandit.app_links/messages');
  const events = MethodChannel('com.llfbandit.app_links/events');
  const codec = StandardMethodCodec();
  const links = NativeAuthLinks();

  tearDown(() {
    messenger.setMockMethodCallHandler(methods, null);
    messenger.setMockMethodCallHandler(events, null);
  });

  test(
    'cold plugin link uses the locked method and bounds URI input',
    () async {
      String? response = 'com.geomath.dev://auth/callback?code=fixture';
      final calls = <MethodCall>[];
      messenger.setMockMethodCallHandler(methods, (call) async {
        calls.add(call);
        return response;
      });
      expect(
        await links.initial(),
        Uri.parse('com.geomath.dev://auth/callback?code=fixture'),
      );
      expect(calls.single.method, 'getInitialLink');
      expect(calls.single.arguments, isNull);
      response = 'x' * 4097;
      expect(await links.initial(), isNull);
      response = null;
      expect(await links.initial(), isNull);
    },
  );

  test(
    'warm plugin stream cancels its listener and drops oversized input',
    () async {
      final calls = <String>[];
      final listening = Completer<void>();
      messenger.setMockMethodCallHandler(events, (call) async {
        calls.add(call.method);
        if (call.method == 'listen') listening.complete();
        return null;
      });
      final received = <Uri>[];
      final subscription = links.callbacks.listen(received.add);
      await listening.future;
      for (final value in [
        'com.geomath.dev://auth/callback?code=fixture',
        'x' * 4097,
        null,
      ]) {
        await messenger.handlePlatformMessage(
          events.name,
          codec.encodeSuccessEnvelope(value),
          null,
        );
      }
      // EventChannel delivers into a broadcast stream asynchronously.
      await Future<void>.delayed(Duration.zero);
      expect(received, [
        Uri.parse('com.geomath.dev://auth/callback?code=fixture'),
      ]);
      await subscription.cancel();
      expect(calls, ['listen', 'cancel']);
    },
  );
}
