import 'package:shared_preferences/shared_preferences.dart';

import '../result.dart';

abstract interface class GuestIdentityStore {
  Future<Result<String?>> read();
  Future<Result<void>> write(String guestId);
}

/// Only an opaque, non-secret installation identity is stored in preferences.
final class SharedPreferencesGuestIdentityStore implements GuestIdentityStore {
  SharedPreferencesGuestIdentityStore({SharedPreferencesAsync? preferences})
    : _preferences = preferences ?? SharedPreferencesAsync();

  static const key = 'geomath.guest.identity.v1';
  final SharedPreferencesAsync _preferences;

  @override
  Future<Result<String?>> read() async {
    try {
      return Success(await _preferences.getString(key));
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.storage,
          message: 'Guest identity could not be read.',
        ),
      );
    }
  }

  @override
  Future<Result<void>> write(String guestId) async {
    if (!RegExp(r'^[A-Za-z0-9_.-]{1,160}$').hasMatch(guestId)) {
      return const Failed(
        AppFailure(
          code: FailureCode.invalid,
          message: 'Guest identity is invalid.',
        ),
      );
    }
    try {
      await _preferences.setString(key, guestId);
      return const Success(null);
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.storage,
          message: 'Guest identity could not be persisted.',
        ),
      );
    }
  }
}
