import 'package:flutter/services.dart';

import '../../core/result.dart';

/// An explicit Android document-picker action. No transport or ticket service.
abstract interface class LocalReportExporter {
  Future<Result<bool>> saveText(String content);
}

final class AndroidReportExporter implements LocalReportExporter {
  const AndroidReportExporter();
  static const channel = MethodChannel('geomath/files');
  @override
  Future<Result<bool>> saveText(String content) async {
    try {
      final saved = await channel.invokeMethod<bool>('saveText', {
        'filename': 'GeoMath_report.txt',
        'content': content,
      });
      return Success(saved == true);
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.storage,
          message: 'The TXT document has not been saved.',
        ),
      );
    }
  }
}

/// Only user-entered fields are included. Session, actor, logs and environment
/// never enter the report. Common pasted credentials are removed before preview.
String redactReportText(String value) => value
    .replaceAll(RegExp(r'Bearer\s+[^\s]+', caseSensitive: false), '[REDACTED]')
    .replaceAll(
      RegExp(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'),
      '[REDACTED]',
    )
    .replaceAll(RegExp(r'sb_secret_[A-Za-z0-9_-]+'), '[REDACTED]')
    .replaceAll(
      RegExp(
        r'(password|kata\s+laluan|refresh[_ -]?token|access[_ -]?token|client[_ -]?secret|service[_ -]?role)\s*[:=]\s*[^\r\n]+',
        caseSensitive: false,
      ),
      '[REDACTED]',
    );
