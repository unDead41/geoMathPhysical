import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/features/feature_composition.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';

const _message = ServiceKey<String>('preview.message');

FeatureContribution _feature(String id) => FeatureContribution(
  id: id,
  routes: [
    FeatureRoute(
      name: '$id-preview',
      path: '/$id',
      builder: (context, services) => Text(services.get(_message)),
    ),
  ],
  services: [
    ServiceFactory<String>(key: _message, createService: (_) => '$id service'),
  ],
  localizations: [
    FeatureLocalizations(
      namespace: id,
      translations: {
        'ms': {'title': 'Pratonton $id'},
        'en': {'title': '$id preview'},
      },
    ),
  ],
  migrations: [
    MigrationContribution(
      namespace: id,
      version: 1,
      description: '$id local records',
      migrate: (_) async {},
    ),
  ],
);

void main() {
  for (final id in ['learning', 'cloud_game']) {
    testWidgets(
      '$id preview registers all contributions through the same root',
      (tester) async {
        FeatureComposition? captured;
        await tester.pumpWidget(
          FeaturePreview(
            contributions: [_feature(id)],
            builder: (context, composition) {
              captured = composition;
              expect(FeatureCompositionScope.of(context), same(composition));
              expect(composition.migrations.contributions.single.id, '$id:1');
              expect(
                composition.localizations.lookup('ms', '$id.title'),
                'Pratonton $id',
              );
              final route = composition.routes['$id-preview'];
              return MaterialApp(
                home: route.builder(context, composition.services),
              );
            },
          ),
        );
        expect(find.text('$id service'), findsOneWidget);
        await tester.pumpWidget(const SizedBox());
        expect(captured!.services.isDisposed, isTrue);
      },
    );
  }

  test('a service is lazy, typed, shared and disposed after its dependent', () {
    const dependency = ServiceKey<_Disposable>('dependency');
    const dependent = ServiceKey<_Disposable>('dependent');
    var calls = 0;
    final disposal = <String>[];
    final registry = ServiceRegistry([
      ServiceFactory<_Disposable>(
        key: dependent,
        createService: (services) {
          services.get(dependency);
          return _Disposable('dependent');
        },
        dispose: (value) => disposal.add(value.name),
      ),
      ServiceFactory<_Disposable>(
        key: dependency,
        createService: (_) {
          calls++;
          return _Disposable('dependency');
        },
        dispose: (value) => disposal.add(value.name),
      ),
    ]);
    expect(calls, 0);
    registry.get(dependent);
    expect(registry.get(dependency), same(registry.get(dependency)));
    expect(calls, 1);
    expect(
      () => registry.get(const ServiceKey<String>('dependency')),
      throwsStateError,
    );
    registry.dispose();
    registry.dispose();
    expect(disposal, ['dependent', 'dependency']);
    expect(() => registry.get(dependency), throwsStateError);
  });

  test(
    'cycles and name collisions fail before creating an ambiguous service',
    () {
      const a = ServiceKey<String>('a');
      const b = ServiceKey<String>('b');
      final registry = ServiceRegistry([
        ServiceFactory(key: a, createService: (services) => services.get(b)),
        ServiceFactory(key: b, createService: (services) => services.get(a)),
      ]);
      expect(() => registry.get(a), throwsStateError);
      expect(
        () => ServiceRegistry([
          ServiceFactory(key: a, createService: (_) => 'a'),
          ServiceFactory(
            key: const ServiceKey<int>('a'),
            createService: (_) => 1,
          ),
        ]),
        throwsArgumentError,
      );
      registry.dispose();
    },
  );

  test(
    'composition rejects collisions in every contribution before factories',
    () {
      var created = false;
      final valid = _feature('learning');
      FeatureContribution other({
        Iterable<FeatureRoute> routes = const [],
        Iterable<FeatureLocalizations> localizations = const [],
        Iterable<MigrationContribution> migrations = const [],
        Iterable<ServiceFactoryBase> services = const [],
      }) => FeatureContribution(
        id: 'other',
        routes: routes,
        localizations: localizations,
        migrations: migrations,
        services: [
          ...services,
          ServiceFactory(
            key: const ServiceKey<Object>('never-created'),
            createService: (_) {
              created = true;
              return Object();
            },
          ),
        ],
      );
      for (final collision in [
        valid,
        other(routes: valid.routes),
        other(localizations: valid.localizations),
        other(migrations: valid.migrations),
        other(services: valid.services),
      ]) {
        expect(
          () => FeatureComposition([valid, collision]),
          throwsArgumentError,
        );
        expect(created, isFalse);
      }
    },
  );

  test(
    'localisations are immutable, namespaced and use the app fallback order',
    () {
      final input = {'title': 'Learning'};
      final registry = FeatureLocalizationRegistry([
        FeatureLocalizations(
          namespace: 'learning',
          translations: {'en': input},
        ),
      ]);
      input['title'] = 'mutated';
      expect(registry.lookup('ms', 'learning.title'), 'Learning');
      expect(registry.lookup('en', 'title'), isNull);
      expect(
        () => registry.translations['en']!['learning.title'] = 'changed',
        throwsUnsupportedError,
      );
    },
  );

  test('feature strings cannot replace shared native string namespaces', () {
    for (final namespace in AppStrings.reservedNamespaces) {
      expect(
        () => FeatureLocalizationRegistry([
          FeatureLocalizations(
            namespace: namespace,
            translations: const {
              'ms': {'title': 'Forged shared label'},
            },
          ),
        ]),
        throwsArgumentError,
        reason: namespace,
      );
    }
    expect(
      FeatureLocalizationRegistry([
        FeatureLocalizations(
          namespace: 'foundation',
          translations: const {
            'en': {'title': 'Foundation'},
          },
        ),
        FeatureLocalizations(
          namespace: 'learning',
          translations: const {
            'en': {'title': 'Learning'},
          },
        ),
      ]).lookup('ms', 'learning.title'),
      'Learning',
    );
  });

  test('parameter routes resolve and equivalent parameter paths collide', () {
    Widget builder(BuildContext context, ServiceRegistry services) =>
        const SizedBox();
    final registry = FeatureRouteRegistry([
      FeatureRoute(name: 'class', path: '/classes/:id', builder: builder),
      FeatureRoute(name: 'new', path: '/classes/new', builder: builder),
    ]);
    expect(registry.matchPath('/classes/abc')!.parameters, {'id': 'abc'});
    expect(registry.byPath('/classes/new')!.name, 'new');
    expect(registry.byPath('https://evil.test/classes/abc'), isNull);
    expect(
      () => FeatureRouteRegistry([
        ...registry.routes,
        FeatureRoute(name: 'alias', path: '/classes/:other', builder: builder),
      ]),
      throwsArgumentError,
    );
  });
}

final class _Disposable {
  const _Disposable(this.name);
  final String name;
}
