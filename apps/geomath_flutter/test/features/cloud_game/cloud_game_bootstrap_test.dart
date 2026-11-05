import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/storage/formative_schema.dart';
import 'package:geomath_flutter/dev/cloud_game_features.dart';
import 'package:geomath_flutter/features/auth/auth_services.dart';
import 'package:geomath_flutter/features/auth/data/native_auth_repository.dart';
import 'package:geomath_flutter/features/classroom/classroom_feature.dart';
import 'package:geomath_flutter/features/profile/data/profile_repository.dart';
import 'package:geomath_flutter/features/profile/profile_services.dart';
import 'package:geomath_flutter/features/solo/solo_feature.dart';
import 'package:geomath_flutter/features/sync/sync_feature.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'support/cloud_game_test_support.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();

  test('production contribution set boots one database without cloud config', () async {
    final app = await bootstrapCloudGameForTest();
    addTearDown(app.dispose);
    final composition = app.composition;
    final services = composition.services;

    expect(composition.features.map((feature) => feature.id).toSet(), {
      'foundation',
      'cloud_game_preview',
      'auth',
      'profile',
      'classroom',
      'solo',
      'duel',
      'sync',
    });
    expect(app.sessions.current.isGuest, isTrue);
    expect(app.publicBackend.connection().isSuccess, isFalse);
    expect(services.get(FoundationServices.database), same(app.database));
    expect(services.get(FoundationServices.sessions), same(app.sessions));
    expect(services.get(FoundationServices.recordsReader), same(app.records));
    expect(services.contains(FoundationExtensions.formativeOutbox), isTrue);
    expect(services.contains(FoundationExtensions.recordsWriter), isTrue);
    // Resolving the actual override catches premature app.records access or an
    // outbox -> writer -> outbox cycle across otherwise isolated features.
    expect(services.get(FoundationServices.recordsWriter), isNotNull);
    expect(services.names.toSet().length, services.names.length);
    final startup = services.get(CloudGamePreviewServices.startup);
    final ready = startup.ready;
    expect(identical(ready, startup.ready), isTrue);
    expect((await ready).isSuccess, isTrue);
    expect(app.sessions.current.isGuest, isTrue);

    // Cross-feature assembly must share the actual credential and record owners.
    // A parallel gateway or local-only solo writer could pass isolated tests.
    final auth = services.get(AuthServices.repository);
    final gateway = services.get(AuthServices.gateway);
    expect(auth, isA<NativeAuthRepository>());
    expect(gateway, same(auth));
    expect(auth.sessions, same(app.sessions));
    final profile = services.get(ProfileServices.repository);
    expect(profile, isA<GatewayProfileRepository>());
    expect((profile as GatewayProfileRepository).gateway, same(gateway));
    final classroom = services.get(ClassroomServices.repository);
    expect(classroom.gateway, same(gateway));
    expect(classroom.sessions, same(app.sessions));
    final writer = services.get(SyncServices.writer);
    final outbox = services.get(SyncServices.outbox);
    final solo = services.get(SoloServices.repository);
    final sync = services.get(SyncServices.controller);
    expect(services.get(FoundationServices.recordsWriter), same(writer));
    expect(services.get(FoundationExtensions.recordsWriter), same(writer));
    expect(services.get(FoundationExtensions.formativeOutbox), same(outbox));
    expect(writer.delegate, same(app.records));
    expect(writer.sessions, same(app.sessions));
    expect(writer.outbox, same(outbox));
    expect(outbox.database, same(app.database));
    expect(outbox.sessions, same(app.sessions));
    expect(solo.writer, same(writer));
    expect(solo.database, same(app.database));
    expect(solo.sessions, same(app.sessions));
    expect(sync.gateway, same(gateway));
    expect(sync.sessions, same(app.sessions));
    expect(sync.writer, same(writer));
    expect(sync.outbox, same(outbox));
    expect(sync.lifecycle, same(app.lifecycle));
    expect(sync.clock, same(app.clock));

    final routes = composition.routes;
    expect(routes.byPath('/play')?.name, 'cloud-game-play');
    expect(routes.byPath('/classes')?.name, 'cloud-game-classes');
    expect(routes.byPath('/profile')?.name, 'cloud-game-profile');
    expect(routes.byPath('/auth/login')?.name, 'cloud-game-login');
    expect(routes.byPath('/duel')?.name, 'cloud-game-duel');
    expect(routes.byPath('/sync')?.name, 'sync.pending');

    final rows = await app.database.query(
      'SELECT namespace, version, description FROM foundation_migrations',
    );
    final expectedMigrations = {
      FormativeSchema.migration.id,
      ...composition.migrations.contributions.map((migration) => migration.id),
    };
    expect(
      rows.map((row) => '${row['namespace']}:${row['version']}').toSet(),
      expectedMigrations,
    );
    expect(
      rows.where((row) => row['namespace'] == 'foundation_records'),
      hasLength(1),
    );
    expect(
      await app.database.query('SELECT * FROM ${FormativeSchema.outbox}'),
      isEmpty,
    );
  });

  test('production feature strings register in BM and English without replacing shared labels', () async {
    final app = await bootstrapCloudGameForTest();
    addTearDown(app.dispose);
    final contributions = cloudGameFeatures();
    final strings = app.composition.localizations.translations;

    for (final feature in contributions) {
      expect(feature.localizations, isNotEmpty, reason: feature.id);
      for (final localizations in feature.localizations) {
        final ms = localizations.translations['ms'];
        final en = localizations.translations['en'];
        expect(ms, isNotEmpty, reason: localizations.namespace);
        expect(en, isNotEmpty, reason: localizations.namespace);
        expect(
          en!.keys.toSet(),
          ms!.keys.toSet(),
          reason: localizations.namespace,
        );
        for (final key in ms.keys) {
          final namespaced = '${localizations.namespace}.$key';
          expect(
            AppStrings(AppLanguage.ms, contributions: strings).text(namespaced),
            ms[key],
          );
          expect(
            AppStrings(AppLanguage.en, contributions: strings).text(namespaced),
            en[key],
          );
        }
      }
    }
    expect(
      AppStrings(AppLanguage.ms, contributions: strings).text('common.back'),
      AppStrings(AppLanguage.ms).text('common.back'),
    );
    expect(
      AppStrings(AppLanguage.en, contributions: strings).text('common.back'),
      AppStrings(AppLanguage.en).text('common.back'),
    );
  });
}
