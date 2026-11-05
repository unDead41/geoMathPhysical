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
  );
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
