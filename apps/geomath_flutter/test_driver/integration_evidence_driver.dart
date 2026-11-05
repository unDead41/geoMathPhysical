import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

/// Writes only screenshots returned by the actual Android test application.
/// Capture names are confined to the evidence directory; no replacement UI is
/// rendered by this driver. ADB captures separately include native WebViews.
Future<void> main() async {
  final output = Directory(
    Platform.environment['GEOMATH_ANDROID_EVIDENCE'] ??
        'docs/handoffs/app-integration/evidence/android',
  );
  await output.create(recursive: true);
  await _verifyVmService(output);
  final captures = <Map<String, Object?>>[];
  await integrationDriver(
    onScreenshot: (name, bytes, [arguments]) async {
      if (!RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(name)) return false;
      if (bytes.length < 8 ||
          !const ListEquality().equals(bytes.take(8).toList(), [
            137,
            80,
            78,
            71,
            13,
            10,
            26,
            10,
          ])) {
        return false;
      }
      await File('${output.path}/test-$name.png').writeAsBytes(bytes);
      captures.add({'path': 'test-$name.png', 'bytes': bytes.length});
      await File('${output.path}/test-captures.json').writeAsString(
        '${const JsonEncoder.withIndent('  ').convert(captures)}\n',
      );
      return true;
    },
    responseDataCallback: (data) async {
      final response = Map<String, Object?>.from(data ?? {});
      response.remove('screenshots');
      await File('${output.path}/integration-response.json').writeAsString(
        '${const JsonEncoder.withIndent('  ').convert(response)}\n',
      );
    },
    writeResponseOnFailure: true,
  ).timeout(const Duration(minutes: 25));
}

class ListEquality {
  const ListEquality();

  bool equals(List<int> left, List<int> right) {
    if (left.length != right.length) return false;
    for (var index = 0; index < left.length; index++) {
      if (left[index] != right[index]) return false;
    }
    return true;
  }
}

/// Probe the actual forwarded service before FlutterDriver's unbounded socket
/// retry loop. No isolate/test is resumed here and no VM auth URI is logged.
Future<void> _verifyVmService(Directory output) async {
  final uri = Uri.parse(Platform.environment['VM_SERVICE_URL'] ?? '');
  if (!['127.0.0.1', 'localhost', '::1'].contains(uri.host)) {
    throw StateError('Expected a local forwarded VM service URL.');
  }
  final webSocketUri = uri.replace(
    scheme: uri.scheme == 'https' ? 'wss' : 'ws',
    path: '${uri.path.endsWith('/') ? uri.path : '${uri.path}/'}ws',
  );
  final elapsed = Stopwatch()..start();
  var attempts = 0;
  String? lastError;
  while (elapsed.elapsed < const Duration(seconds: 90)) {
    WebSocket? socket;
    attempts++;
    try {
      socket = await WebSocket.connect(webSocketUri.toString())
          .timeout(const Duration(seconds: 5));
      socket.add(
        jsonEncode({'jsonrpc': '2.0', 'id': 1, 'method': 'getVersion'}),
      );
      final response = jsonDecode(
        await socket.first.timeout(const Duration(seconds: 5)) as String,
      ) as Map<String, dynamic>;
      if (response['id'] != 1 || response['result'] is! Map) {
        throw StateError('VM getVersion did not return an RPC result.');
      }
      await File('${output.path}/vm-service-readiness.json').writeAsString(
        jsonEncode({
          'status': 'ready',
          'rpc': 'getVersion',
          'attempts': attempts,
          'elapsed_ms': elapsed.elapsedMilliseconds,
        }),
      );
      return;
    } catch (error) {
      lastError = error.runtimeType.toString();
    } finally {
      if (socket != null) unawaited(socket.close());
    }
    await Future<void>.delayed(const Duration(seconds: 1));
  }
  await File('${output.path}/vm-service-readiness.json').writeAsString(
    jsonEncode({
      'status': 'failed',
      'rpc': 'getVersion',
      'attempts': attempts,
      'elapsed_ms': elapsed.elapsedMilliseconds,
      'last_error_type': lastError,
    }),
  );
  throw TimeoutException(
    'Forwarded VM service failed RPC readiness within 90s.',
  );
}
