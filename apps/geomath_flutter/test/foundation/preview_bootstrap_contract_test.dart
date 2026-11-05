import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/preferences/preferences_repository.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/guest_identity_store.dart';
import 'package:geomath_flutter/core/storage/app_database.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  sqfliteFfiInit();

  for (final feature in ['learning', 'cloud_game']) {
    testWidgets(
      '$feature preview receives route, translation, service and migrated database',
      (tester) async {
        final key = ServiceKey<_FeatureProbe>('qa.$feature.probe');
        final contribution = FeatureContribution(
          id: 'qa_$feature',
          routes: [
            FeatureRoute(
              name: 'qa-$feature',
              path: '/qa/$feature',
              builder: (context, services) => Scaffold(
                body: Center(
                  child: Text(
                    '${AppStrings.of(context).text('qa_$feature.title')} '
                    '${services.get(key).label}',
                  ),
                ),
              ),
            ),
          ],
          localizations: [
            FeatureLocalizations(
              namespace: 'qa_$feature',
              translations: const {
                'ms': {'title': 'Pratonton ciri'},
                'en': {'title': 'Feature preview'},
              },
            ),
          ],
          migrations: [
            MigrationContribution(
              namespace: 'qa_$feature',
              version: 1,
              description: 'QA preview registration probe',
              migrate: (transaction) async {
                await transaction.execute(
                  'CREATE TABLE qa_${feature}_probe (value TEXT NOT NULL)',
                );
                await transaction.rawInsert(
                  'INSERT INTO qa_${feature}_probe (value) VALUES (?)',
                  ['migration ran before feature service use'],
                );
              },
            ),
          ],
          services: [
            ServiceFactory(
              key: key,
              createService: (services) => _FeatureProbe(
                services.get(FoundationServices.database),
                feature,
              ),
            ),
          ],
        );
        final opened = await tester.runAsync(
          () => AppDependencies.bootstrap(
            features: [contribution],
            databasePath: inMemoryDatabasePath,
            databaseFactory: databaseFactoryFfi,
            preferencesStore: _PreferencesStore(),
            guestStore: _GuestStore(),
          ),
        );
        expect(opened, isA<Success<AppDependencies>>());
        final app = (opened! as Success<AppDependencies>).value;
        try {
          final probe = app.composition.services.get(key);
          expect(
            identical(
              probe.database,
              app.composition.services.get(FoundationServices.database),
            ),
            isTrue,
          );
          expect(
            await tester.runAsync(probe.read),
            'migration ran before feature service use',
          );
          expect(
            app.composition.migrations.contributions.map((entry) => entry.id),
            contains('qa_$feature:1'),
          );
          await tester.pumpWidget(
            GeoMathApp(dependencies: app, initialRoute: 'qa-$feature'),
          );
          await tester.pumpAndSettle();
          expect(find.text('Pratonton ciri registered'), findsOneWidget);
          expect(
            await tester.runAsync(
              () => app.preferences.save(
                app.preferences.value.copyWith(language: AppLanguage.en),
              ),
            ),
            isA<Success<void>>(),
          );
          await tester.pumpAndSettle();
          expect(find.text('Feature preview registered'), findsOneWidget);
          expect(identical(app.composition.services.get(key), probe), isTrue);
          expect(tester.takeException(), isNull);
        } finally {
          await tester.pumpWidget(const SizedBox.shrink());
          await tester.runAsync(app.dispose);
        }
      },
    );
  }

  testWidgets('feature cannot replace the foundation database owner', (
    tester,
  ) async {
    var factoryCalled = false;
    final result = await tester.runAsync(
      () => AppDependencies.bootstrap(
        databasePath: inMemoryDatabasePath,
        databaseFactory: databaseFactoryFfi,
        preferencesStore: _PreferencesStore(),
        guestStore: _GuestStore(),
        features: [
          FeatureContribution(
            id: 'qa_collision',
            services: [
              ServiceFactory(
                key: FoundationServices.database,
                createService: (_) {
                  factoryCalled = true;
                  throw StateError('A duplicate owner must not be constructed');
                },
              ),
            ],
          ),
        ],
      ),
    );
    expect(result, isA<Failed<AppDependencies>>());
    expect(
      (result! as Failed<AppDependencies>).failure.code,
      FailureCode.invalid,
    );
    expect(factoryCalled, isFalse);
  });
}

final class _FeatureProbe {
  const _FeatureProbe(this.database, this.feature);
  final AppDatabase database;
  final String feature;
  String get label => 'registered';

  Future<String> read() async {
    final rows = await database.query('SELECT value FROM qa_${feature}_probe');
    return rows.single['value']! as String;
  }
}

// Preview tests use documented store seams. Migrations and queries above run
// against real SQLite FFI; this is widget/SQLite evidence, not Android evidence.
final class _PreferencesStore implements PreferencesStore {
  String? value;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String value) async => this.value = value;
}

final class _GuestStore implements GuestIdentityStore {
  @override
  Future<Result<String?>> read() async => const Success('qa-preview-guest');
  @override
  Future<Result<void>> write(String guestId) async => const Success(null);
}
