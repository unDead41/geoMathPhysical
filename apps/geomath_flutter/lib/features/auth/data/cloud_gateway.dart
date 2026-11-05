import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';

/// Shared cloud seam. A binding is identity, never an authorization credential.
abstract interface class CloudGateway {
  AuthSession get sessions;
  bool get configured;

  Future<Result<CloudReply>> rpc({
    required String name,
    required Map<String, Object?> parameters,
    required ActorBinding actor,
  });
}

/// Transport success can still contain a server application denial.
/// Credentials and untrusted server error text never leave the transport layer.
final class CloudReply {
  CloudReply({
    required Map<String, Object?> data,
    this.statusCode = 200,
    this.retryAfter,
  }) : data = _safeMap(data);

  final Map<String, Object?> data;
  final int statusCode;
  final Duration? retryAfter;

  String? get errorCode {
    final error = data['error'];
    final code = error is Map ? error['code'] : null;
    return code is String && RegExp(r'^[A-Za-z0-9_-]{1,80}$').hasMatch(code)
        ? code
        : null;
  }

  static Map<String, Object?> _safeMap(Map source) => Map.unmodifiable({
    for (final entry in source.entries)
      if (entry.key is String && !_secretKeys.contains(entry.key))
        entry.key as String: entry.key == 'error'
            ? _safeError(entry.value)
            : _safeValue(entry.value),
  });

  static Object? _safeValue(Object? value) => switch (value) {
    Map() => _safeMap(value),
    List() => List<Object?>.unmodifiable(value.map(_safeValue)),
    null || String() || num() || bool() => value,
    _ => null,
  };

  static Map<String, Object?>? _safeError(Object? value) {
    if (value == null) return null;
    final code = value is Map ? value['code'] : null;
    return Map.unmodifiable({
      'code': code is String && RegExp(r'^[A-Za-z0-9_-]{1,80}$').hasMatch(code)
          ? code
          : 'request_failed',
    });
  }

  static const _secretKeys = {
    'access_token',
    'refresh_token',
    'provider_token',
    'provider_refresh_token',
    'password',
    'current_password',
    'password_confirm',
    'token',
    'authorization',
    'service_role_key',
    'client_secret',
    'recovery_code',
    'code_verifier',
    'id_token',
  };
}
