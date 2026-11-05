import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../result.dart';
import 'app_preferences.dart';

abstract class PreferencesRepository extends ChangeNotifier {
  AppPreferences get value;
  Future<Result<void>> save(AppPreferences preferences);
}

/// Small persistence seam for denied/full/delayed storage tests. One complete
/// JSON document prevents partially applied language/theme/audio combinations.
abstract interface class PreferencesStore {
  Future<String?> read();
  Future<void> write(String value);
}

final class SharedPreferencesStore implements PreferencesStore {
  SharedPreferencesStore({SharedPreferencesAsync? preferences})
    : _preferences = preferences ?? SharedPreferencesAsync();

  static const storageKey = 'geomath.preferences.v1';
  final SharedPreferencesAsync _preferences;

  @override
  Future<String?> read() => _preferences.getString(storageKey);

  @override
  Future<void> write(String value) async {
    await _preferences.setString(storageKey, value);
    if (await read() != value) {
      throw StateError('Preference persistence was not acknowledged.');
    }
  }
}

/// Production preferences use the uncached platform API (Android DataStore).
/// The published snapshot changes only after the awaited persistence operation.
final class SharedPreferencesRepository extends PreferencesRepository {
  SharedPreferencesRepository._(this._store, this._value);

  final PreferencesStore _store;
  AppPreferences _value;
  Future<void> _queue = Future<void>.value();
  bool _disposed = false;

  static Future<Result<SharedPreferencesRepository>> open({
    PreferencesStore? store,
  }) async {
    try {
      final persistence = store ?? SharedPreferencesStore();
      final raw = await persistence.read();
      AppPreferences preferences = const AppPreferences();
      if (raw != null) {
        final decoded = jsonDecode(raw);
        if (decoded is! Map<String, dynamic>) {
          throw const FormatException('Invalid preferences document.');
        }
        preferences = AppPreferences.fromJson(decoded);
      }
      return Success(SharedPreferencesRepository._(persistence, preferences));
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.storage,
          message: 'Preferences could not be read from this device.',
        ),
      );
    }
  }

  @override
  AppPreferences get value => _value;

  @override
  Future<Result<void>> save(AppPreferences preferences) {
    if (_disposed) {
      return Future.value(
        const Failed(
          AppFailure(
            code: FailureCode.unavailable,
            message: 'Preferences are unavailable.',
          ),
        ),
      );
    }
    if (!preferences.isValid) {
      return Future.value(
        const Failed(
          AppFailure(
            code: FailureCode.invalid,
            message: 'The preference values are unsupported.',
          ),
        ),
      );
    }
    final completion = Completer<Result<void>>();
    _queue = _queue.then((_) async {
      try {
        await _store.write(jsonEncode(preferences.toJson()));
        _value = preferences;
        if (!_disposed) notifyListeners();
        completion.complete(const Success<void>(null));
      } catch (_) {
        completion.complete(
          const Failed(
            AppFailure(
              code: FailureCode.storage,
              message: 'Preferences have not been saved to this device.',
            ),
          ),
        );
      }
    });
    return completion.future;
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}

/// Bootstrap fallback: defaults remain usable after a read failure while every
/// save clearly fails. It never claims that a temporary preference is durable.
final class UnavailablePreferencesRepository extends PreferencesRepository {
  UnavailablePreferencesRepository(this.failure);

  final AppFailure failure;

  @override
  AppPreferences get value => const AppPreferences();

  @override
  Future<Result<void>> save(AppPreferences preferences) async =>
      Failed(failure);
}

/// Preview injection only. Production bootstrap uses SharedPreferencesRepository.
final class MemoryPreferencesRepository extends PreferencesRepository {
  MemoryPreferencesRepository([AppPreferences initial = const AppPreferences()])
    : _value = initial;

  AppPreferences _value;

  @override
  AppPreferences get value => _value;

  @override
  Future<Result<void>> save(AppPreferences preferences) async {
    if (!preferences.isValid) {
      return const Failed(
        AppFailure(
          code: FailureCode.invalid,
          message: 'Unsupported preferences.',
        ),
      );
    }
    _value = preferences;
    notifyListeners();
    return const Success<void>(null);
  }
}
