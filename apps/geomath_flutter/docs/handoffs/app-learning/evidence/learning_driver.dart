import 'dart:convert';
import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

// Host-side only. The app test uses the real production platform WebView.
// LEARNING_EVIDENCE_DIR is set by run_learning_android.sh.
Future<void> main() async {
  final directory = Directory(
    Platform.environment['LEARNING_EVIDENCE_DIR'] ?? 'build/learning-evidence',
  );
  await directory.create(recursive: true);
  final images = <Map<String, Object?>>[];
  await integrationDriver(
    onScreenshot:
        (
          String name,
          List<int> bytes, [
          Map<String, Object?>? arguments,
        ]) async {
          if (!RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(name) || bytes.isEmpty) {
            return false;
          }
          await File('${directory.path}/$name.png')
              .writeAsBytes(bytes, flush: true);
          images.add({'name': name, 'bytes': bytes.length});
          await File('${directory.path}/screenshots.json').writeAsString(
            const JsonEncoder.withIndent('  ').convert(images),
            flush: true,
          );
          return true;
        },
    responseDataCallback: (data) async {
      // Screenshot bytes are already saved separately. Avoid duplicate base64
      // logs while keeping the actual test response available to reviewers.
      final response = Map<String, Object?>.from(data ?? {});
      response.remove('screenshots');
      await File('${directory.path}/integration-response.json').writeAsString(
        const JsonEncoder.withIndent('  ').convert(response),
        flush: true,
      );
    },
    writeResponseOnFailure: true,
  );
}
