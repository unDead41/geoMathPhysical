# GeoMath foundation contract 1.0.0

Contract version: **1.0.0**. App version: **0.1.0+1**. All paths below are relative
to `apps/geomath_flutter/`, package `geomath_flutter`. This is the implementation
contract for Prompt 2 and Prompt 3. Its READY receipt separately records whether
all required runtime gates have been completed.
Contract/source hashes and gate results are recorded in the handoff and
`docs/FOUNDATION_READY.json`; the final commit is reported after remote readback.
This document does not make the Android READY claim.
Both feature branches must start from the same published READY commit. A blocked
READY receipt is a dependency blocker, not permission to build another foundation.

## Owners and extension boundaries

| Concern | Single implementation owner / public entry point |
| --- | --- |
| Bootstrap, routing, dependency registration | `lib/app/app.dart`, `app_dependencies.dart`, `app_router.dart` |
| Feature previews | `lib/app/feature_previews.dart` |
| Theme, tokens, native components | `lib/core/design/`, `lib/core/widgets/` |
| BM/English strings | `lib/core/l10n/app_strings.dart`, feature contribution maps |
| Durable preferences | `lib/core/preferences/` |
| Actor/session binding and protected persistence port | `lib/core/session/` |
| Transaction database, migrations, shared formative schema | `lib/core/storage/` |
| Shared record DTOs, reader, local writer and outbox append port | `lib/core/records/` |
| Lifecycle, navigation/back, audio focus | `lib/core/lifecycle/`, `navigation/`, `audio/` |
| Native module transport boundary | `lib/core/module/module_host_bridge.dart` |
| Neutral game geometry | `lib/core/geometry/geometry_card_provider.dart`, `geometry_card_view.dart` |
| Learning implementation after freeze | Prompt 2: `lib/features/learning/`, `assets/module/`, `tools/module/` |
| Auth/classroom/solo/Duel/sync implementation after freeze | Prompt 3: its feature folders, tests and `lib/dev/cloud_game_main.dart` |

Features use the owners above. They do not create another preferences/session
store, root Navigator, theme, database, reflection schema or lifecycle observer.
Shared API/schema/asset-registration changes go through
`docs/integration_requests/<branch>.json` and the foundation owner. Supabase,
secure storage, SQLite and WebView dependencies are already declared and locked;
their presence does not establish hosted service capability or authorization.

## Results, identity and protected session

`lib/core/result.dart` exports the actual algebra:

```dart
sealed class Result<T> {
  bool get isSuccess;
  T? get valueOrNull;
  AppFailure? get failureOrNull;
  Result<R> map<R>(R Function(T value) transform);
}
Success<T>(T value);
Failed<T>(AppFailure failure);
AppFailure({required FailureCode code, required String message,
  Duration? retryAfter});
enum FailureCode { unavailable, stale, unauthorized, conflict, storage,
  retryAfter, invalid, network, cancelled, unexpected }
```

Failures contain safe UI messages and optional retry delay, never raw credentials
or transport dumps. `Success<void>(null)` is the void success form.

`lib/core/session/actor_binding.dart` exports immutable value-equal
`ActorBinding({required String? userId, required String partition, required String
sessionId, required int epoch, required String scope})`, plus `bool get isGuest`.
Every request, callback, save, subscription and bridge command captures the whole
binding. Checking `userId` alone is insufficient. Guest partition is
`guest:<durably stored installation ID>`; signed-in partition is `owner:<userId>`.
Restarting the app preserves the guest partition, not an old session/epoch.

```dart
// lib/core/session/auth_session.dart
abstract interface class AuthSession {
  ActorBinding get current;
  Stream<ActorBinding> get bindings;
  bool isCurrent(ActorBinding binding);
}
```

`SessionController.open({GuestIdentityStore? guestStore, RandomSource? random})`
returns `Future<Result<SessionController>>`. Test/preview construction is
`SessionController.guest({required String guestId, required String sessionId,
String scope = 'app', RandomSource? random})`. Public mutations are
`bindUser({required String userId, required String sessionId, String scope =
'app'})`, `logout()`, `changeScope(String)`, and `Future<void> dispose()`.
Token refresh under unchanged user/session/scope preserves epoch; actor, session,
scope change or logout increments it and invalidates old work. Logout returns to
the same guest partition with a fresh session. The controller carries identity,
not proof of a server role or login. Prompt 3 supplies verified Auth operations;
there is no preimplemented foundation `AuthRepository.login()` API.

`lib/core/session/session_store.dart` defines `SessionStore.read()` returning
`Future<Result<String?>>`, `write(String serializedSession)` and `clear()` both
returning `Future<Result<void>>`. `SecureSessionStore` is the protected plugin
adapter. Only the native Auth adapter handles this serialized content; it is never
sent to a WebView, record, outbox, report or general UI state. Guest ID persistence
uses `GuestIdentityStore` and stores an opaque non-secret ID.

## Clock, RNG and request policy

`lib/core/runtime/clock.dart`: `Clock.now() -> DateTime` and
`monotonicMilliseconds() -> int`; `SystemClock` supplies UTC wall time and a local
monotonic stopwatch. Persist wall timestamps; measure local elapsed time with
monotonic input. This clock does not replace the server clock in Duel/classroom.

`lib/core/runtime/random_source.dart`: `RandomSource.nextDouble() -> double`,
`nextInt(int maximum) -> int`; implementations are `DefaultRandomSource` and
`SecureRandomSource`. `randomIdentifier(RandomSource, {int bytes = 16})` produces
opaque IDs. Solo parity consumes the explicit draw stream in canonical fixtures;
matching JavaScript and Dart numeric seeds is not a parity contract.

`lib/core/network/network_policy.dart` exports
`NetworkPolicy({required AuthSession sessions, Clock clock = const SystemClock(),
RandomSource? random, Duration baseRetry = const Duration(milliseconds: 300),
Duration maxRetry = const Duration(seconds: 30), int maxAttempts = 5})`.
`guard<T>(ActorBinding, Future<Result<T>> Function())` rejects stale work before
and after the request. `retryDelay(int attempt, AppFailure) -> Duration?` retries
only network/retryAfter failures within its bounded budget;
`parseRetryAfter(String?) -> Duration?` accepts delay seconds or an HTTP date.
The request adapter captures the correct credential at request start. This policy
does not implement request coalescing, caches, background sending or live-action
queues; feature adapters must own and cancel their single request/subscription
source per scope. Auth, CRUD, PIN, classroom, Duel and help reports are not outbox
actions.

## Preferences, strings and native presentation

`lib/core/preferences/preferences.dart` exports the shared DTO/repository:

```dart
enum AppLanguage { ms, en }
enum AppTheme { light, dark, system }
AppPreferences({AppLanguage language = AppLanguage.ms,
  AppTheme theme = AppTheme.system, double textScale = 1,
  bool strongContrast = false, bool reducedMotion = false,
  bool musicEnabled = true, bool soundEnabled = true});
abstract class PreferencesRepository extends ChangeNotifier {
  AppPreferences get value;
  Future<Result<void>> save(AppPreferences preferences);
}
```

`AppPreferences.schemaVersion == 1`; text scales are exactly `1`, `1.25`, `1.5`.
`copyWith`, `isValid`, `toJson`, `fromJson` and value equality are implemented.
`SharedPreferencesRepository.open({PreferencesStore? store})` returns
`Future<Result<SharedPreferencesRepository>>`. It serializes complete snapshot
writes and publishes a new `value` only after acknowledged persistence. Read/save
failure does not silently overwrite old values or claim durable settings.
`UnavailablePreferencesRepository` exposes usable defaults with failing saves;
`MemoryPreferencesRepository` is an explicitly non-durable preview implementation.

`AppStrings(AppLanguage, {Map<String, Map<String, String>> contributions = const
{}})` in `lib/core/l10n/app_strings.dart` has `text(String key, {String? fallback,
Map<String,Object> parameters = const {}})`, `locale`, `of(BuildContext)`,
`supportedLocales`, `delegate`; `AppStringsScope(strings:, child:)` carries the
actual contribution-aware instance. Fallback order is selected language, English,
BM, explicit fallback, key. Feature translations use `ms`/`en` and
`<namespace>.<localKey>`. Reserved built-in namespaces are exported once by
`AppStrings.reservedNamespaces`: `app`, `nav`, `common`, `settings`, `home`,
`help`, `shape`, `face`, `model`. Feature registration rejects those namespaces
and duplicate feature namespaces. `foundation` is already contributed by root.

Use `GeoMathTheme.light/dark({bool strongContrast = false})`,
`GeoMathTheme.mode(AppTheme)`, `GeoMathColors`, `GeoMathSpacing`,
`lib/core/design/face_palette.dart` and `lib/core/widgets/widgets.dart` exports.
The root owns `MaterialApp`, locale, theme and text scaling. Features preserve
activity controllers and page keys when these presentation values change. Native
touch targets are at least 48 dp. Face IDs are stable physical surfaces; neutral
game cards do not encode matching answers with color.

## Database, migrations and shared records

`lib/core/storage/app_database.dart` defines:

```dart
abstract interface class AppDatabase {
  Future<T> transaction<T>(Future<T> Function(AppTransaction) action);
  Future<List<Map<String,Object?>>> query(String sql,
    [List<Object?> arguments = const []]);
  Stream<void> get changes;
  Future<void> close();
}
```

`AppTransaction` has `execute` returning `Future<void>`, `query` returning the
same row type, and `rawInsert`, `rawUpdate`, `rawDelete` returning `Future<int>`;
all accept SQL plus optional positional argument list. A transaction handle is
valid only inside its callback. Do not retain it, nest transactions or await the
parent database inside that callback. Throwing rolls back the entire transaction.

`MigrationContribution({required String namespace, required int version, required
String description, required Future<void> Function(AppTransaction) migrate})`
and `MigrationRegistry(Iterable<MigrationContribution>)` are in
`lib/core/storage/migration.dart`. `.id` is `namespace:version`;
registry `.contributions` is immutable and sorted. Namespace matches
`[a-z][a-z0-9_]{0,63}`; versions must be contiguous from 1, with unique
namespace/version and immutable descriptions. `SqliteAppDatabase.open({String?
path, DatabaseFactory? factory, Iterable<MigrationContribution> migrations =
const []}) -> Future<Result<SqliteAppDatabase>>` applies pending migrations in
one transaction. It always installs the reserved `foundation_records` migration
first; features must not contribute that namespace again.

Foundation owns `FormativeSchema` in `lib/core/storage/formative_schema.dart`:

| Shared table | Partition/key and content |
| --- | --- |
| `foundation_migrations` | PK(namespace,version), immutable description |
| `module_reflections` | PK(partition,activity), canonical JSON payload, updated_at_ms |
| `completed_solo_records` | PK(partition,attempt_id), mode, canonical JSON payload, created_at_ms |
| `formative_outbox` | PK(partition,event_id), owner_id, kind, content_version=1, canonical payload, created_at_ms; partition=`owner:`+owner_id |

Features use shared DTOs/readers/writers, not a second reflection or solo result
read model. Schema constants include `contentVersion = 1`,
`maxPendingPerOwner = 2000`, `maxBatchSize = 20`, `maxLocalQuizScores = 50`.
Feature migrations may create separately prefixed tables for their own data.

`lib/core/records/formative_record.dart` exports:

| DTO | Actual fields and creation boundary |
| --- | --- |
| `ModuleReflection` | `ModuleActivity activity`, `ReflectionStage stage`, String prediction/result/explanation, bool completed; `create({required activity, required stage, required prediction, result='', explanation='', completed=false})` and `fromJson(Map<String,Object?>)` return `Result<ModuleReflection>` |
| `CompletedSoloRecord` | String attemptId/ruleset; `SoloMode mode`; int score/total/mistakes/hints/skipped/elapsedMilliseconds; `fromJson(Map<String,Object?>)` returns `Result<CompletedSoloRecord>` |

`ModuleActivity` is `net/volume/area/composite`; `ReflectionStage` is
`prediction/experiment/check/explanation`. Reflection limits are 240/600/600
UTF-16 code units **before trimming**, with prohibited controls rejected.
Prediction is required; result is required from experiment; explanation is
required at explanation; completed is valid only at explanation. `merge(next)`
preserves completed/higher-stage progress. `toJson()` excludes envelopes/actors.
`SoloMode` is `quiz/practice/review`. Solo JSON keys are `attempt_id`, `mode`,
`ruleset`, `score`, `total`, `mistakes`, `hints`, `skipped`, `elapsed_ms`.
Ruleset is `single-attempt-v1`; quiz total 10, practice 15, review 1–15;
score+mistakes+skipped equals total; elapsed is 0–604800000 ms. IDs match
`[A-Za-z0-9:_.-]{1,160}`. Completed solo records are unverified formative study,
never official classroom or Duel marks.

`lib/core/records/formative_records.dart` freezes:

```dart
abstract interface class FormativeRecordWriter {
  Future<Result<DurableRecordReceipt>> saveReflection({
    required ActorBinding actor, required ModuleReflection reflection});
  Future<Result<DurableRecordReceipt>> saveCompletedSolo({
    required ActorBinding actor, required CompletedSoloRecord record});
}
abstract interface class FormativeRecordReader {
  Stream<Result<List<ModuleReflection>>> watchReflections(ActorBinding actor);
  Future<Result<List<CompletedSoloRecord>>> readCompletedSolo(ActorBinding actor);
}
abstract interface class FormativeOutboxAppender {
  Future<Result<void>> append({required AppTransaction transaction,
    required ActorBinding actor, required FormativeEvent event});
}
```

`DurableRecordReceipt` contains actor, recordId, persistedAt,
`FormativeSaveState.local/pending`, and `durable == true`. No synced state exists.
`FormativeEvent({required String id, required FormativeEventKind kind, required
Map<String,Object?> payload})` validates module/solo canonical content, rejects
extra fields, and exports `toWireJson()` with `id`, `kind`, `content_version:1`,
`payload`, without owner credentials. Only the two formative kinds exist.

`LocalFormativeRecords({required AppDatabase database, required AuthSession
sessions, Clock clock = const SystemClock(), RandomSource? random,
FormativeOutboxAppender? outbox})` implements both ports. Guest saves commit
locally and never enqueue. Signed-in saves return unavailable if the outbox
adapter is absent. When present, record and event use the **same supplied
transaction**; append failure rolls both back. The append hook never sends.
It must preserve native owner, immutable event content, capacity and idempotency.
Receipt comes only after commit and a final complete-binding check. Identical
completed attempts are idempotent; changed content under an existing attempt ID
fails conflict. Only quiz history is capped at 50 per partition. Watchers emit
stale and terminate after binding changes; no old result is delivered to a new
actor. `docs/STORAGE_CONTRACT.md` documents the same owner and schema in detail.

## Contributions, bootstrap and service keys

`lib/core/features/feature_contribution.dart` exports:

```dart
FeatureContribution({required String id,
  Iterable<FeatureRoute> routes = const [],
  Iterable<FeatureLocalizations> localizations = const [],
  Iterable<MigrationContribution> migrations = const [],
  Iterable<ServiceFactoryBase> services = const []});
FeatureRoute({required String name, required String path,
  required Widget Function(BuildContext, ServiceRegistry) builder,
  BackPolicy? backPolicy, bool showNavigation = true});
FeatureLocalizations({required String namespace,
  required Map<String,Map<String,String>> translations});
```

`FeatureComposition(Iterable<FeatureContribution>)` in `feature_composition.dart`
validates the entire list before lazy factories run. It exposes `features`,
`routes`, `localizations`, `migrations`, `services` and `dispose()`.
`FeatureCompositionScope.of(context)` returns that same composition.
Feature IDs, route names/path patterns, localisation namespaces and migration
identities reject collisions. Routes support `:parameter` segments;
`FeatureRouteRegistry.matchPath(path)` returns route plus parameter map; literal
paths take precedence. Equivalent parameter patterns collide.

`ServiceKey<T extends Object>(String name)` and
`ServiceFactory<T>(key:, createService: T Function(ServiceRegistry), dispose:
void Function(T)?)` are in `service_registry.dart`. Use `services.get(key)` and
`contains(key)`. Names are globally unique even across different types. Factories
are lazy singletons; cycles and type mismatches fail. Disposal is once, in reverse
construction order. Root-owned resources have one root disposal path; a feature
does not close a borrowed foundation service.

`lib/app/app_dependencies.dart` exports these typed keys:

| `FoundationServices` field | Type |
| --- | --- |
| preferences | PreferencesRepository |
| sessions | AuthSession |
| sessionController | SessionController, used by the verified native Auth adapter to publish binding changes |
| protectedSessions | SessionStore |
| database | AppDatabase |
| recordsWriter / recordsReader | FormativeRecordWriter / FormativeRecordReader |
| geometry | GeometryCardProvider |
| lifecycle / audio | AppLifecycleController / AudioCoordinator |
| clock / random | Clock / RandomSource |
| publicBackend | PublicBackendConfiguration |

`FoundationExtensions.formativeOutbox` is
`ServiceKey<FormativeOutboxAppender>('extension.formativeOutbox')`;
`FoundationExtensions.recordsWriter` is
`ServiceKey<FormativeRecordWriter>('extension.recordsWriter')`. Prompt 3 registers
these optional keys through its contribution. The public foundation writer key
resolves the override when installed, otherwise the shared local writer. The
reader remains the shared schema reader. Never replace the foundation key itself.

`AppDependencies.bootstrap({List<FeatureContribution> features = const [],
String? databasePath, DatabaseFactory? databaseFactory, PreferencesStore?
preferencesStore, GuestIdentityStore? guestStore, Clock clock = const
SystemClock(), RandomSource? random}) -> Future<Result<AppDependencies>>`
constructs the common composition, opens the database with all contributed
migrations, then constructs the shared record adapter. Bootstrap resolves the
optional outbox factory **after database open but before `app.records` exists**.
That factory may borrow the database and session keys only; it must not resolve
either shared reader/writer key or writer override, which would cause a dependency
cycle or premature access. Its append operation receives the transaction later.
The optional writer override is lazy and must preserve the same DTO/schema and
durable/actor guarantees. `AppDependencies.dispose() -> Future<void>` closes the
composition and root resources, attempting every cleanup even after a feature
disposer fails. Missing cloud configuration does not affect guest
bootstrap or create simulated Auth capabilities.

`lib/app/public_backend_configuration.dart` supplies the single public config
reader. `PublicBackendConfiguration.fromEnvironment().connection()` returns
`Result<PublicBackendConnection>`; empty config is `unavailable`, malformed or
secret configuration is `invalid`. The exact public example is
`config/public.example.json`, passed with `--dart-define-from-file` when Prompt 3
installs its real adapter. Only HTTPS and publishable/legacy-anon keys are
accepted. A valid connection configuration does not prove server capabilities,
Google/SMS setup, Auth callbacks or migration deployment. The development
callback is `com.geomath.dev://auth/callback`; native callback activation is
owned by Prompt 3. No key is forwarded to the module or support reports.

The five native destination lookups are `/`, `/learn`, `/play`, `/classes`,
`/profile`. Root already owns `/`, `/guide`, `/settings`, `/help`, `/report`,
`/foundation/module-spike` and fallback `/foundation/learn`, `/foundation/play`,
`/foundation/classes`, `/foundation/profile`. Prompt 2 contributes `/learn`;
Prompt 3 contributes `/play`, `/classes`, `/profile` and feature subroutes.
Choosing an installed tab uses its contributed route. Choosing an absent tab
uses the explicit incomplete-feature screen, not a duplicate feature shell.

## Real preview entry points and extension examples

`lib/app/feature_previews.dart` provides these production-root adapters:

```dart
Future<void> runLearningPreview({
  required List<FeatureContribution> contributions,
  required String initialRoute});
Future<void> runCloudGamePreview({
  required List<FeatureContribution> contributions,
  required String initialRoute});
```

Both call `runGeoMath(features: contributions, initialRoute: initialRoute)` in
`lib/app/app.dart`, which boots the same `AppDependencies` and `GeoMathApp` used
by `main.dart`. `initialRoute` is a registered **route name**, not a URL.
Prompt 2 owns `lib/dev/learning_main.dart`; Prompt 3 owns
`lib/dev/cloud_game_main.dart`. No root edits are needed. The lower-level
`FeaturePreview(foundation:, contributions:, builder:)` widget also exists for
injected widget tests; its builder is responsible for real root setup.
`GeoMathApp(dependencies:, initialRoute:'home', disposeDependencies:false)` supports
an injected dependency owner; such tests await `AppDependencies.dispose()` in
teardown. `runGeoMath` owns the dependency lifetime and passes
`disposeDependencies:true`. Concurrent production bootstrap/retry calls share a
single pending operation.

This complete illustrative learning contribution uses only implemented APIs.
Replace its demonstration widget/service/table with feature implementation;
the shared records tables are deliberately consumed through the existing reader.

```dart
import 'package:flutter/material.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/feature_previews.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';

const learningReader = ServiceKey<FormativeRecordReader>('learning.reader');
final learningContribution = FeatureContribution(
  id: 'learning',
  routes: [FeatureRoute(name: 'learning-home', path: '/learn',
    builder: (context, services) {
      services.get(learningReader); // borrows the existing schema reader
      return Center(child: Text(AppStrings.of(context).text('learning.title')));
    })],
  services: [ServiceFactory<FormativeRecordReader>(key: learningReader,
    createService: (services) => services.get(FoundationServices.recordsReader))],
  localizations: [FeatureLocalizations(namespace: 'learning', translations: {
    'ms': {'title': 'Belajar'}, 'en': {'title': 'Learn'},
  })],
  migrations: [MigrationContribution(namespace: 'learning', version: 1,
    description: 'Feature-owned preview selection',
    migrate: (tx) => tx.execute('CREATE TABLE learning_preview_selection '
      '(id TEXT PRIMARY KEY, selected_model TEXT NOT NULL)'))],
);

Future<void> main() => runLearningPreview(
  contributions: [learningContribution], initialRoute: 'learning-home');
```

Cloud/game uses the same registration path. This helper registers an actual
feature-supplied append adapter without naming an unimplemented foundation class:

```dart
FeatureContribution cloudQueueContribution({
  required FormativeOutboxAppender Function(AppDatabase, AuthSession) createOutbox,
}) => FeatureContribution(id: 'cloud_queue', services: [
  ServiceFactory<FormativeOutboxAppender>(
    key: FoundationExtensions.formativeOutbox,
    createService: (services) => createOutbox(
      services.get(FoundationServices.database),
      services.get(FoundationServices.sessions)),
  ),
]);
// In lib/dev/cloud_game_main.dart, after defining your real contributions:
// runCloudGamePreview(contributions: [cloudGameContribution, queueContribution],
//   initialRoute: 'cloud-game-play');
```

Import `AppDatabase` from `core/storage/app_database.dart`, `AuthSession` from
`core/session/auth_session.dart`, and the record ports from
`core/records/formative_records.dart`. `cloudGameContribution` owns the real
`cloud-game-play` route at `/play`, plus `/classes` and `/profile`, its own
namespace maps/migrations/services; those identifiers in the final comments are
example feature code, not an already shipped game/auth implementation.

## Navigation, lifecycle and one audio owner

`lib/core/navigation/app_navigation.dart` exports
`AppNavigationController({required FeatureRouteRegistry routes, required String
initialRoute})`, `.entries`, `.current`, `.canPop`, `.hasPendingBack`,
`push/replace/reset(String routeName, {Map<String,Object?> arguments = const {}})`
and `requestBack(BackOrigin) -> Future<BackOutcome>`. `AppRouteEntry` has
`route`, unique `instance`, immutable `arguments`. `AppRouteScope(entry:,
isCurrent:,child:)` exposes `.of/.maybeOf`; covered feature routes pause through
`isCurrent` without losing their controllers. Root owns the SDK Router/Navigator.
Use the scope's arguments, not a global current-entry lookup from an offstage page.

`BackOrigin` is `system/gesture/appBar/programmatic`; `BackPolicy` is
`Future<BackDecision> Function(BackRequest)` with origin and captured entry.
`BackDecision` is `allow/stay`; outcomes are `popped/atRoot/blocked/superseded`.
Use one shared callback for confirmation, checkpoint/pause or forfeit. The
controller coalesces concurrent/reentrant back requests and ignores a confirmation
whose entry has changed. The root `GeoMathRouter` also coalesces Android/page
pop callbacks, closes pageless dialogs/sheets first, and captures the entry before
awaiting the report draft confirmation. Route factories run under `AppRouteScope`
and an actual Navigator/Overlay, so dialogs and inherited route arguments work.
`MaterialPage.canPop:false` disables
unguarded predictive/native removal; approved back updates the declarative pages
through the controller. App-bar, gesture and system back must reach that owner.
`AppScope.of(context).router` exposes `GeoMathRouter.open(String name,
{Map<String,Object?> arguments = const {}})`, `back()` and
`select(AppDestination)`. Dynamic parameters must be nonempty String arguments;
the router restores their encoded concrete path and parses incoming paths using
`matchPath`, preserving the parameter map. Route names are never server
authorization checks, and login/recovery routes do not validate callbacks alone.

`AppLifecycleController({bool observeWidgetsBinding = true})` in
`lib/core/lifecycle/app_lifecycle.dart` is the one `ChangeNotifier`/SDK observer.
It exposes `.phase`, `.isForeground`, `.isDisposed`; phases are
`foreground/inactive/background/detached`. Features listen, not register another
binding observer. `setPhase` supports adapters/deterministic tests. Background
pauses local motion/audio; online clocks remain server-authoritative.

`lib/core/audio/audio_coordinator.dart` provides:

```dart
abstract interface class AudioEndpoint {
  Future<void> setPlaybackAllowed(bool allowed);
  Future<void> dispose();
}
AudioCoordinator({required AppLifecycleController lifecycle, bool enabled = true});
// register({required String owner, required AudioEndpoint endpoint}) -> AudioLease
// AudioLease.activate(), deactivate(), release() -> Future<void>
// AudioCoordinator.setEnabled(bool), close() -> Future<void>
// AudioCoordinator.pause() -> AudioPause; AudioPause.release() -> Future<void>
```

Owners are unique. A grant follows successful revocation of the previous owner.
The endpoint's false acknowledgement must stop music, effects and speech before
returning. Nested pause handles resume only after the last release. Lifecycle and
preferences revoke centrally. A covered module deactivates its lease and resumes
the same lease when visible. Release/disposal is once; async root teardown awaits
`close()`. A failed revoke never grants a second endpoint permission.

## Module bridge, offline assets and neutral geometry

`lib/core/module/module_host_bridge.dart` implements `ModuleBridgePort` through
`ModuleHostBridge({required AuthSession sessions, required AppLifecycleController
lifecycle, required String instanceId, required String bridgeSession, required
String progressSession, Set<String> allowedNavigationRoutes = const {}})`.
It exposes native `.binding`, transport `.identity`, `.status`,
`attachDocument(String documentId)`, `receive(String encodedEnvelope, {required
ModuleMessageContext context}) -> Result<ModuleCommand>`, `close()` and
`dispose()`. It is a `Listenable`; no second module session owner is created.

The exact native envelope is `{nativeBridgeVersion:1, instanceId, bridgeSession,
command, payload}`. Byte length is at most 65536 UTF-8 bytes. Unknown keys,
commands, guessed identity, mismatched document, stale actor or unsupported schema
fail. `ready` uses `{}`; after ready, `open-settings` and `open-help` use `{}`;
`request-navigation` uses `{route:<native allowlist member>}`. `progress` contains
the complete canonical `type:'geodecoder:module-progress', protocol:1, session,
activity, stage, prediction, result, explanation, completed` message. Progress
session differs from the native capability. Settings uses its independent
`channel/version:1/instanceId/type/settings` contract. These three version-1
numbers are separate contracts and must never be conflated.

`ModuleCommand` has enum `.kind` (`ready/progress/openSettings/openHelp/
requestNavigation`), authoritative native `.binding`, `.instanceId`, optional
typed `.progress` (`ModuleProgressMessage` fields matching the payload), optional
`.navigationRoute`. A progress command is not a durable receipt; native code maps
it through `ModuleReflection.fromJson` validation and the single
`FormativeRecordWriter`.
Background/inactive suspends incoming commands; actor/session/epoch/scope changes
or detached lifecycle close the instance and discard old input. No JS actor,
owner, epoch or credential field is accepted or exported.

`ModuleMessageContext({required String documentId, required bool
isTrustedDocument, required ModuleSourceProof sourceProof})` comes from the native
adapter. `ModuleSourceProof.wrapperCapability` explicitly records that Android
JavaScriptChannel **does not expose the sending frame**. It does not assert native
main-frame metadata. The adapter pins the verified wrapper URL/document generation,
blocks untrusted navigation, initializes an unguessable capability in the
top-document closure, removes the one-use `configure` function after successful
initialization, and keeps the canonical child in an opaque sandbox. Only
the wrapper sees the native capability; it validates
`event.source === iframe.contentWindow` and opaque origin before forwarding.
The child receives separate progress/settings identities. A platform adapter may
use `nativeMainFrame` only when it actually verifies native frame provenance.
No `origin`/`isMainFrame` field supplied by JS establishes trust.

`lib/features/learning/module_asset_repository.dart` implements
`ModuleAssetRepository({AssetBundle? bundle}).verify() ->
Future<Result<VerifiedModuleAssets>>`. Success carries entryPoint, sourceCommit,
moduleVersion and fileCount only after every required file's bytes/hash validate.
Failure is unavailable, never ready. `ModuleSpikeController` and
`ModuleSpikeScreen` in `module_spike_host.dart` consume the shared sessions,
lifecycle, preferences and audio. The screen accepts optional `onCommand`,
asset-repository and controller injection, plus `embedded:false` for standalone
presentation. `lib/features/home/module_preview_page.dart` embeds it under the
foundation shell, converts validated progress into the shared DTO, waits for the
shared writer receipt and displays local/pending/failed status itself. The child
labels draft activity and never claims native durable storage. It is an offline spike,
not a claim that the whole native learning feature has been completed.

Manifest ownership is exact:

| File | Owner and content |
| --- | --- |
| `docs/source_lock.json` | Foundation provenance, contract/source versions and feature manifest **paths** |
| `assets/contracts/manifest.json` | Foundation bank/ruleset/fixtures/neutral cards; schema_version 1, feature contracts, source_commit, files path/sha256/bytes |
| `assets/module/manifest.json` | Learning-owned bundle; schema_version 1, feature learning, source/module/adapter versions, entry_point, offline flag, separate protocol versions and files path/sha256/bytes |

Root reserves asset directories in pubspec. Bundle changes within those declared
directories update the feature's own submanifest and handoff, without rewriting
a frozen central learning hash list. The central source lock/READY hash is the
foundation snapshot, not an ongoing override of Prompt 2's bundle manifest.
`ModuleAssetRepository.manifestPath` is `assets/module/manifest.json`, entryPoint
is `assets/module/index.html`; the required bundle also contains
`native-adapter.js` and `canonical-module.html`. There is no runtime web/CDN/raw
GitHub dependency, remote updater, or promise that a mutable branch is trusted.
New root asset directories or dependencies require an integration request.

`lib/core/geometry/geometry_card_provider.dart` exports
`GeometryShape {cube,cuboid,pyramid,cylinder,cone}`,
`GeometryCardKind {solid,net}` and
`GeometryCardProvider.card(GeometryShape, GeometryCardKind) ->
Future<Result<GeometryCard>>`. `BundleGeometryCardProvider({AssetBundle? bundle})`
verifies `assets/contracts/geometry_cards.json` against its submanifest and
returns immutable canonical mesh faces, stable IDs, yaw/pitch and neutral fill.
`GeometryPoint(x,y,z)`, `GeometryFace(id:,name:,vertices:,outline:,rim:,cut:)`,
and `GeometryCard(shape:,kind:,faces:,yaw:,pitch:)` are the actual DTOs.
`GeometryCardView(shape:,kind:,provider:,semanticLabel:,size:120)` in
`geometry_card_view.dart` paints them natively. Prompt 3 consumes this neutral
provider directly, without importing or waiting on the learning WebView.
The eleven learning models remain canonical `learning-mesh.mjs/studySolidMesh`
content; the five game shapes do not replace that catalogue.

## Verification and freeze limits

Behavioral tests exercise service/routes/migrations/localisations contributions
through previews, duplicate registrations, typed/cyclic services and disposal,
back concurrency/stale guards, lifecycle/audio handover, and malformed/forged/
oversize/stale bridge messages. Storage tests exercise real SQLite transactions,
reopen/rollback/owner isolation, canonical DTOs and absent queue failures. Asset
tests verify missing/corrupt files and canonical source fixtures. Final full
analyze/tests/APK/device command results, screenshot paths and hashes belong in
the READY receipt and branch handoff; a unit/source PASS is not an Android or
hosted-service result.

The Auth/cloud adapter, bounded outbox flusher and server acknowledgements,
request coalescing, live classroom/Duel implementation, full native learning UI,
and iOS validation are not invented foundation capabilities. Queue append is an
implemented extension port; online behavior requires Prompt 3's real adapter and
capability checks. Pending means locally durable and awaiting server acceptance,
never synced. Help reports remain local preview/copy/TXT actions with no auto-send.

The handoff and READY receipt reconcile the integrated root, contract hashes and
runtime evidence. This document describes
implemented public APIs and their owner boundaries; it does not substitute for
the final integrated build and device smoke receipt.
