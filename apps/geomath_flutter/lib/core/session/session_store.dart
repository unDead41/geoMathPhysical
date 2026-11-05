import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../result.dart';

/// Protected persistence for the auth adapter only. Never expose this to modules.
abstract interface class SessionStore {
  Future<Result<String?>> read();
  Future<Result<void>> write(String serializedSession);
  Future<Result<void>> clear();
}

final class SecureSessionStore implements SessionStore {
  SecureSessionStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'geomath.auth.protected-session.v1';
  final FlutterSecureStorage _storage;

  @override
  Future<Result<String?>> read() async {
    try {
      return Success(await _storage.read(key: _key));
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.storage,
          message: 'Protected session could not be read.',
        ),
      );
    }
  }

  @override
  Future<Result<void>> write(String serializedSession) async {
    if (serializedSession.isEmpty || serializedSession.length > 131072) {
      return const Failed(
        AppFailure(
          code: FailureCode.invalid,
          message: 'Protected session has an invalid size.',
        ),
      );
    }
    try {
      await _storage.write(key: _key, value: serializedSession);
      return const Success(null);
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.storage,
          message: 'Protected session could not be persisted.',
        ),
      );
    }
  }

  @override
  Future<Result<void>> clear() async {
    try {
      await _storage.delete(key: _key);
      return const Success(null);
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.storage,
          message: 'Protected session could not be cleared.',
        ),
      );
    }
  }
}
