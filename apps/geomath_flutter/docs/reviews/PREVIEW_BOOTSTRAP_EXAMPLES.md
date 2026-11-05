# Feature preview entry points

The foundation supplies `runGeoMath` in `lib/app/app.dart`. Each feature owns
its contribution and preview entry point; it does not create another database,
session controller, preferences repository, theme or root router.

The names `learningContribution` / `cloudGameContribution` and the route names
below are examples of values to be provided by their owning features, not a
claim that those feature implementations already exist. The exported
foundation types and bootstrap signatures in these examples are actual APIs.

Prompt 2's future `lib/dev/learning_main.dart`:

```dart
import '../app/app.dart';
import '../features/learning/learning_contribution.dart'; // Feature-owned file.

Future<void> main() => runGeoMath(
  features: [learningContribution],
  initialRoute: 'learning-home', // A route in learningContribution.routes.
);
```

Prompt 3's future `lib/dev/cloud_game_main.dart`:

```dart
import '../app/app.dart';
import '../features/solo/cloud_game_contribution.dart'; // Feature-owned file.

Future<void> main() => runGeoMath(
  features: [cloudGameContribution],
  initialRoute: 'cloud-game-home', // A route in cloudGameContribution.routes.
);
```

Both use the same production guest bootstrap. The root aggregates each
`FeatureContribution`'s `routes`, `localizations`, `migrations` and `services`.
The database owner applies registered migrations before route code can resolve
its database-backed feature services.

| Extension | Actual API | Feature responsibility |
|---|---|---|
| Route | `FeatureRoute(name:, path:, builder:, backPolicy:, showNavigation:)` | Unique name/path, typed feature state, shared back policy |
| Translation | `FeatureLocalizations(namespace:, translations:)` | Unique namespace, BM/English keys; read via the existing `AppStrings` |
| Migration | `MigrationContribution(namespace:, version:, description:, migrate:)` | Unique namespace, contiguous versions from 1, immutable applied identity |
| Service | `ServiceFactory<T>(key:, createService:, dispose:)` / `ServiceKey<T>` | Unique key, resolve foundation owners through `FoundationServices` |
| Native dependencies | `FoundationServices.database`, `.sessions`, `.preferences`, `.recordsWriter`, `.recordsReader`, `.geometry`, `.audio`, `.lifecycle` | Consume the shared instance; do not replace its owner |

The complete executable examples are in
`test/foundation/preview_bootstrap_contract_test.dart`. They run the actual
bootstrap separately for learning and cloud/game contributions, create/read
real SQLite FFI tables through migrations and services, render a registered
route, switch BM→English and reject a duplicate database owner. These are
widget/SQLite tests; they do not establish Android device or hosted feature
readiness.

An unfinished feature stays labelled as incomplete until its concrete routes
and behavior are implemented and verified. A preview entry point is a development
surface and does not change that acceptance status.
