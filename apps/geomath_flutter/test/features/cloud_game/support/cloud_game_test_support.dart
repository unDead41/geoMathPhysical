import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/preferences/preferences_repository.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/runtime/clock.dart';
import 'package:geomath_flutter/core/session/guest_identity_store.dart';
import 'package:geomath_flutter/dev/cloud_game_features.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

const cloudGameOwnerA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const cloudGameOwnerB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

/// Test-only preference/installation seams. Feature repositories, migrations,
/// shared record writer and SQLite transactions remain production code.
Future<AppDependencies> bootstrapCloudGameForTest({
  String databasePath = inMemoryDatabasePath,
  TestPreferencesStore? preferencesStore,
  TestGuestStore? guestStore,
  Clock clock = const SystemClock(),
  List<FeatureContribution>? features,
}) async {
  final result = await AppDependencies.bootstrap(
    features: features ?? cloudGameFeatures(),
    databasePath: databasePath,
    databaseFactory: databaseFactoryFfi,
    preferencesStore: preferencesStore ?? TestPreferencesStore(),
    guestStore: guestStore ?? TestGuestStore(),
    clock: clock,
  );
  if (result case Success<AppDependencies>(:final value)) return value;
  throw StateError(
    result.failureOrNull?.message ?? 'Cloud/game bootstrap failed',
  );
}

final class TestPreferencesStore implements PreferencesStore {
  String? value;

  @override
  Future<String?> read() async => value;

  @override
  Future<void> write(String value) async => this.value = value;
}

final class TestGuestStore implements GuestIdentityStore {
  TestGuestStore({this.value = 'cloud-game-test-installation'});

  String? value;

  @override
  Future<Result<String?>> read() async => Success(value);

  @override
  Future<Result<void>> write(String guestId) async {
    value = guestId;
    return const Success(null);
  }
}

final class ControlledCloudGameClock implements Clock {
  int milliseconds = 0;

  void advance(Duration duration) => milliseconds += duration.inMilliseconds;

  @override
  int monotonicMilliseconds() => milliseconds;

  @override
  DateTime now() =>
      DateTime.utc(2026, 11, 5).add(Duration(milliseconds: milliseconds));
}

CompletedSoloRecord completedSoloFixture(String id) =>
    CompletedSoloRecord.fromJson({
      'attempt_id': id,
      'mode': 'quiz',
      'ruleset': 'single-attempt-v1',
      'score': 7,
      'total': 10,
      'mistakes': 2,
      'hints': 1,
      'skipped': 1,
      'elapsed_ms': 1250,
    }).valueOrNull!;
