import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/result.dart';

/// Separate secret namespace. This is never the foundation/Auth SessionStore.
abstract interface class DuelProtectedStore {
  Future<Result<String?>> read(String partition);
  Future<Result<void>> write(String partition, String value);
  Future<Result<void>> clear(String partition);
}

final class SecureDuelProtectedStore implements DuelProtectedStore {
  SecureDuelProtectedStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();
  static const keyPrefix = 'geomath.duel.capability-pending.v2.';
  final FlutterSecureStorage _storage;
  String _key(String partition) =>
      '$keyPrefix${base64Url.encode(utf8.encode(partition))}';

  @override
  Future<Result<String?>> read(String partition) async {
    try {
      return Success(await _storage.read(key: _key(partition)));
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.storage,
          message: 'The protected Duel session could not be read.',
        ),
      );
    }
  }

  @override
  Future<Result<void>> write(String partition, String value) async {
    if (value.isEmpty || value.length > 16384) {
      return const Failed(
        AppFailure(
          code: FailureCode.invalid,
          message: 'The protected Duel session is invalid.',
        ),
      );
    }
    try {
      await _storage.write(key: _key(partition), value: value);
      return const Success(null);
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.storage,
          message: 'The Duel action has not been safely saved.',
        ),
      );
    }
  }

  @override
  Future<Result<void>> clear(String partition) async {
    try {
      await _storage.delete(key: _key(partition));
      return const Success(null);
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.storage,
          message: 'The protected Duel session could not be cleared.',
        ),
      );
    }
  }
}
