import 'package:flutter/services.dart';

abstract interface class AuthLinks {
  Future<Uri?> initial();
  Stream<Uri> get callbacks;
}

/// Platform transport used by the locked app_links 7.2.2 plugin. Its inspected
/// app_links_platform_interface method adapter uses exactly these channels and
/// getInitialLink. Keeping the narrow port here avoids another root singleton
/// or an undeclared direct dependency. The integrator owns manifest/allowlist.
final class NativeAuthLinks implements AuthLinks {
  const NativeAuthLinks();
  static const _method = MethodChannel('com.llfbandit.app_links/messages');
  static const _events = EventChannel('com.llfbandit.app_links/events');
  Uri? _parse(Object? value) =>
      value is String && value.length <= 4096 ? Uri.tryParse(value) : null;
  @override
  Future<Uri?> initial() async =>
      _parse(await _method.invokeMethod<String?>('getInitialLink'));
  @override
  Stream<Uri> get callbacks => _events
      .receiveBroadcastStream()
      .map(_parse)
      .where((value) => value != null)
      .cast<Uri>();
}
