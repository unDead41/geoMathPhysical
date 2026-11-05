# Feature composition

Production and preview entry points pass `FeatureContribution` objects to the
same `FeatureComposition`. There is one route, service, migration and
localisation registry; features do not edit root registration files.

```dart
const recordsKey = ServiceKey<Records>('learning.records');
final learning = FeatureContribution(
  id: 'learning',
  routes: [
    FeatureRoute(
      name: 'learning-records',
      path: '/learn/records',
      builder: (context, services) => RecordsView(services.get(recordsKey)),
    ),
  ],
  services: [
    ServiceFactory<Records>(
      key: recordsKey,
      createService: (services) => Records(),
      dispose: (records) => records.dispose(),
    ),
  ],
  localizations: [
    FeatureLocalizations(namespace: 'learning', translations: {
      'ms': {'records': 'Rekod latihan'},
      'en': {'records': 'Learning records'},
    }),
  ],
  migrations: [
    MigrationContribution(
      namespace: 'learning',
      version: 1,
      description: 'Feature-owned local data',
      migrate: (transaction) async { /* feature schema only */ },
    ),
  ],
);
```

The root supplies `composition.localizations.translations` to the single
`AppStrings(language, contributions: ...)` and
`composition.migrations.contributions` to `SqliteAppDatabase.open(migrations:
...)` before constructing services that use that database. Shared formative
tables belong to the database owner; feature migrations do not recreate them.
Registrations are validated before any lazy service factory runs. Service names,
route names/path patterns, localisation namespaces, and migration namespace plus
version collisions fail with `ArgumentError`. Lazy dependency cycles fail with
`StateError`. Services dispose once in reverse construction order.

Both feature previews use the production root adapter:

```dart
runApp(FeaturePreview(
  foundation: foundationContributions,
  contributions: [learning],
  builder: (context, composition) => buildFoundationApp(composition),
));
```

`FeaturePreview` owns its composition lifetime. It recreates the composition only
when its contribution objects change; settings changes inside the application do
not reconstruct feature services. The root builder is an application function,
not another navigation, preferences, session or database owner.

The root Router consumes `AppNavigationController.entries`. Every page is keyed
by `entry.instance` and wrapped in `AppRouteScope(entry: entry, isCurrent:
navigation.current.instance == entry.instance, child: ...)`. Feature widgets read
`AppRouteScope.of(context).entry.arguments` for typed application arguments and
`isCurrent` for pause/resume visibility. Covered routes retain widget and module
state. Android system/gesture and app-bar back call the same
`requestBack(BackOrigin)`; feature `BackPolicy` callbacks implement save or
confirmation. Stale confirmations cannot pop a replacement route.
