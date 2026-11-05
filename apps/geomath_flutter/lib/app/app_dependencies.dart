import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:sqflite_common/sqlite_api.dart' show DatabaseFactory;

import '../core/audio/audio_coordinator.dart';
import '../core/features/feature_composition.dart';
import '../core/features/feature_contribution.dart';
import '../core/geometry/geometry_card_provider.dart';
import '../core/lifecycle/app_lifecycle.dart';
import '../core/preferences/preferences.dart';
import '../core/records/formative_records.dart';
import '../core/records/local_formative_records.dart';
import '../core/result.dart';
import '../core/runtime/clock.dart';
import '../core/runtime/random_source.dart';
import '../core/session/auth_session.dart';
import '../core/session/guest_identity_store.dart';
import '../core/session/session_store.dart';
import '../core/storage/app_database.dart';
import '../core/storage/sqlite_app_database.dart';
import 'app_router.dart';
import 'foundation_strings.dart';
import 'public_backend_configuration.dart';

/// Stable service keys. Features consume these owners instead of creating peers.
abstract final class FoundationServices {
  static const preferences = ServiceKey<PreferencesRepository>(
    'foundation.preferences',
  );
  static const sessions = ServiceKey<AuthSession>('foundation.sessions');
  static const sessionController = ServiceKey<SessionController>(
    'foundation.sessionController',
  );
  static const protectedSessions = ServiceKey<SessionStore>(
    'foundation.protectedSessions',
  );
  static const database = ServiceKey<AppDatabase>('foundation.database');
  static const recordsWriter = ServiceKey<FormativeRecordWriter>(
    'foundation.recordsWriter',
  );
  static const recordsReader = ServiceKey<FormativeRecordReader>(
    'foundation.recordsReader',
  );
  static const geometry = ServiceKey<GeometryCardProvider>(
    'foundation.geometry',
  );
  static const lifecycle = ServiceKey<AppLifecycleController>(
    'foundation.lifecycle',
  );
  static const audio = ServiceKey<AudioCoordinator>('foundation.audio');
  static const clock = ServiceKey<Clock>('foundation.clock');
  static const random = ServiceKey<RandomSource>('foundation.random');
  static const publicBackend = ServiceKey<PublicBackendConfiguration>(
    'foundation.publicBackend',
  );
}

/// Optional extension services, registered through a feature contribution.
abstract final class FoundationExtensions {
  static const formativeOutbox = ServiceKey<FormativeOutboxAppender>(
    'extension.formativeOutbox',
  );
  static const recordsWriter = ServiceKey<FormativeRecordWriter>(
    'extension.recordsWriter',
  );
}

/// Android guest bootstrap never requires cloud configuration or a network call.
final class AppDependencies {
  AppDependencies._({
    required this.preferences,
    required this.sessions,
    required this.clock,
    required this.random,
  }) : lifecycle = AppLifecycleController(),
       protectedSessions = SecureSessionStore(),
       geometry = BundleGeometryCardProvider();

  final PreferencesRepository preferences;
  final Clock clock;
  final RandomSource random;
  final SessionController sessions;
  final SessionStore protectedSessions;
  final AppLifecycleController lifecycle;
  final GeometryCardProvider geometry;
  final PublicBackendConfiguration publicBackend =
      const PublicBackendConfiguration.fromEnvironment();
  late final AudioCoordinator audio;
  late final AppDatabase database;
  late final LocalFormativeRecords records;
  late final FeatureComposition composition;
  AppFailure? preferencesWarning;
  bool _disposed = false;

  static Future<Result<AppDependencies>> bootstrap({
    List<FeatureContribution> features = const [],
    String? databasePath,
    DatabaseFactory? databaseFactory,
    PreferencesStore? preferencesStore,
    GuestIdentityStore? guestStore,
    Clock clock = const SystemClock(),
    RandomSource? random,
  }) async {
    final prefResult = await SharedPreferencesRepository.open(
      store: preferencesStore,
    );
    final pref = switch (prefResult) {
      Success<SharedPreferencesRepository>(:final value) => value,
      Failed<SharedPreferencesRepository>(:final failure) =>
        UnavailablePreferencesRepository(failure),
    };
    final rng = random ?? SecureRandomSource();
    final sessionResult = await SessionController.open(
      guestStore: guestStore,
      random: rng,
    );
    if (sessionResult case Failed<SessionController>(:final failure)) {
      pref.dispose();
      return Failed(failure);
    }
    final app = AppDependencies._(
      preferences: pref,
      sessions: (sessionResult as Success<SessionController>).value,
      clock: clock,
      random: rng,
    );
    if (prefResult case Failed<SharedPreferencesRepository>(:final failure)) {
      app.preferencesWarning = failure;
    }
    app.audio = AudioCoordinator(
      lifecycle: app.lifecycle,
      enabled: pref.value.musicEnabled || pref.value.soundEnabled,
    );
    FeatureComposition? registered;
    AppDatabase? openedDatabase;
    try {
      app.composition = FeatureComposition([
        FeatureContribution(
          id: 'foundation',
          routes: foundationRoutes(),
          localizations: [foundationStrings],
          services: [
            ServiceFactory(
              key: FoundationServices.preferences,
              createService: (_) => app.preferences,
            ),
            ServiceFactory(
              key: FoundationServices.sessions,
              createService: (_) => app.sessions,
            ),
            ServiceFactory(
              key: FoundationServices.sessionController,
              createService: (_) => app.sessions,
            ),
            ServiceFactory(
              key: FoundationServices.protectedSessions,
              createService: (_) => app.protectedSessions,
            ),
            ServiceFactory(
              key: FoundationServices.database,
              createService: (_) => app.database,
            ),
            ServiceFactory(
              key: FoundationServices.recordsWriter,
              createService: (services) =>
                  services.contains(FoundationExtensions.recordsWriter)
                  ? services.get(FoundationExtensions.recordsWriter)
                  : app.records,
            ),
            ServiceFactory(
              key: FoundationServices.recordsReader,
              createService: (_) => app.records,
            ),
            ServiceFactory(
              key: FoundationServices.geometry,
              createService: (_) => app.geometry,
            ),
            ServiceFactory(
              key: FoundationServices.lifecycle,
              createService: (_) => app.lifecycle,
            ),
            ServiceFactory(
              key: FoundationServices.audio,
              createService: (_) => app.audio,
            ),
            ServiceFactory(
              key: FoundationServices.clock,
              createService: (_) => app.clock,
            ),
            ServiceFactory(
              key: FoundationServices.random,
              createService: (_) => app.random,
            ),
            ServiceFactory(
              key: FoundationServices.publicBackend,
              createService: (_) => app.publicBackend,
            ),
          ],
        ),
        ...features,
      ]);
      registered = app.composition;
      final db = await SqliteAppDatabase.open(
        path: databasePath,
        factory: databaseFactory,
        migrations: app.composition.migrations.contributions,
      );
      if (db case Failed<SqliteAppDatabase>(:final failure)) {
        await _cleanup([app.composition.dispose, app._closeBootstrap]);
        return Failed(failure);
      }
      app.database = (db as Success<SqliteAppDatabase>).value;
      openedDatabase = app.database;
      final services = app.composition.services;
      app.records = LocalFormativeRecords(
        database: app.database,
        sessions: app.sessions,
        clock: app.clock,
        random: app.random,
        outbox: services.contains(FoundationExtensions.formativeOutbox)
            ? services.get(FoundationExtensions.formativeOutbox)
            : null,
      );
      pref.addListener(app._updateAudio);
      return Success(app);
    } catch (_) {
      await _cleanup([
        if (registered != null) registered.dispose,
        if (openedDatabase != null) openedDatabase.close,
        app._closeBootstrap,
      ]);
      return const Failed(
        AppFailure(
          code: FailureCode.invalid,
          message:
              'Feature registration or local bootstrap could not be completed.',
        ),
      );
    }
  }

  void _updateAudio() => audio.setEnabled(
    preferences.value.musicEnabled || preferences.value.soundEnabled,
  );

  Future<void> _closeBootstrap() async {
    await _cleanup([
      audio.close,
      lifecycle.dispose,
      sessions.dispose,
      preferences.dispose,
    ]);
  }

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    preferences.removeListener(_updateAudio);
    await _cleanup([composition.dispose, database.close, _closeBootstrap]);
  }
}

/// Release every owner even if a feature disposer fails. Disposal never makes a
/// business-record durability claim and is safe to repeat.
Future<void> _cleanup(List<FutureOr<void> Function()> tasks) async {
  for (final task in tasks) {
    try {
      await task();
    } catch (_) {
      /* Continue releasing the remaining owners. */
    }
  }
}

final class AppScope extends InheritedWidget {
  const AppScope({
    super.key,
    required this.dependencies,
    required this.router,
    required super.child,
  });
  final AppDependencies dependencies;
  final GeoMathRouter router;
  static AppScope of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AppScope>()!;
  @override
  bool updateShouldNotify(AppScope oldWidget) =>
      dependencies != oldWidget.dependencies || router != oldWidget.router;
}
