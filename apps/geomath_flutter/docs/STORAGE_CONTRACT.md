# Foundation storage and actor contract v1

Source baseline: `origin/app` at `38f061af963256528d5060ff076bae9ee05eafc3`.
Canonical validators were read from `digital/dist/module-progress.mjs`,
`offline-records.mjs`, `network-policy.mjs` and `digital/backend/offline-sync.sql`
at that exact commit. This document freezes the implemented Dart interfaces;
it does not assert any hosted migration or Auth provider is enabled.

## Types and injection

All paths below are relative to `lib/`.

| Path | Implemented public contract |
|---|---|
| `core/result.dart` | Sealed `Result<T>`, `Success<T>(T value)`, `Failed<T>(AppFailure failure)`; `isSuccess`, `valueOrNull`, `failureOrNull`, `map` |
| `core/result.dart` | `AppFailure({required FailureCode code, required String message, Duration? retryAfter})`; codes `unavailable`, `stale`, `unauthorized`, `conflict`, `storage`, `retryAfter`, `invalid`, `network`, `cancelled`, `unexpected` |
| `core/runtime/clock.dart` | `Clock.now()` UTC wall timestamp and `monotonicMilliseconds()` for local elapsed; concrete `SystemClock` |
| `core/runtime/random_source.dart` | `RandomSource.nextDouble()`/`nextInt(int maximum)`, `DefaultRandomSource`, `SecureRandomSource`; game parity uses explicit draws rather than assuming equal JavaScript/Dart seeds |
| `core/session/actor_binding.dart` | `const ActorBinding({required String? userId, required String partition, required String sessionId, required int epoch, required String scope})`; value equality and `isGuest`; no credential fields |
| `core/session/auth_session.dart` | `AuthSession.current`, `bindings`, `isCurrent(ActorBinding)`; single `SessionController` owns identity/scope boundaries |
| `core/session/session_store.dart` | Protected `SessionStore.read()` → `Future<Result<String?>>`, `write(String)`/`clear()` → `Future<Result<void>>`; `SecureSessionStore` uses `flutter_secure_storage`, never SQLite/preferences |
| `core/session/guest_identity_store.dart` | `GuestIdentityStore.read()`/`write(String)`; `SharedPreferencesGuestIdentityStore` stores an opaque non-secret installation ID |
| `core/storage/app_database.dart` | `AppDatabase.transaction<T>(Future<T> Function(AppTransaction))`, `query(String sql, [List<Object?> arguments])`, `Stream<void> changes`, `close()` |
| `core/storage/app_database.dart` | `AppTransaction.execute`/`query`/`rawInsert`/`rawUpdate`/`rawDelete` take SQL and optional positional arguments; handle expires when callback ends |
| `core/storage/sqlite_app_database.dart` | `SqliteAppDatabase.open({String? path, DatabaseFactory? factory, Iterable<MigrationContribution> migrations = const []})` → `Future<Result<SqliteAppDatabase>>`; default Android sqflite, injectable real SQLite factory |
| `core/storage/migration.dart` | `MigrationContribution({required namespace, required version, required description, required Future<void> Function(AppTransaction) migrate})`; `MigrationRegistry(Iterable<MigrationContribution>).contributions` |
| `core/network/network_policy.dart` | `NetworkPolicy(sessions:, clock:, random:, baseRetry:, maxRetry:, maxAttempts:)`; actor-bound `guard<T>(actor, request)`, bounded `retryDelay(attempt, failure)`, `parseRetryAfter(String?)` |

`SessionController.open({GuestIdentityStore? guestStore, RandomSource? random})`
returns `Future<Result<SessionController>>` only after the stable guest ID has
been read or acknowledged by persistence. Invalid/failed guest identity storage
returns `storage`, not a claim of a durable installation partition. Explicit
preview constructors may use `SessionController.guest(guestId:, sessionId:)`.

Partitions are `guest:<persisted-id>` and `owner:<validated-auth-user-id>`.
`bindUser(userId:, sessionId:, scope: 'app')` preserves epoch for a token refresh
in the same user/session/scope. User, auth-session or scope changes increment
epoch. `changeScope(String)` increments epoch only on change. `logout()` always
increments epoch, creates a fresh guest session ID, and returns to the original
guest partition. `dispose()` invalidates current checks and closes the stream.
The cloud auth adapter is responsible for verified SDK identities and credential
capture; remembered identity alone never authorizes a server operation.

`NetworkPolicy.guard` checks the full binding before starting and after every
completed request, discarding stale results/errors. A request adapter must capture
the credential for that binding at the start; it must not await and then take a
new actor's token. Retry is bounded, injectable and only applicable to network or
`retryAfter` failures. It respects the server's longer Retry-After; auth,
capability, validation and conflict failures stop automatic retry. This policy
does not implement automatic sending, caches, background timers or live outboxes.

## Shared records

`core/records/formative_record.dart` implements:

- `ModuleActivity { net, volume, area, composite }` and
  `ReflectionStage { prediction, experiment, check, explanation }`.
- `ModuleReflection.create({required activity, required stage, required prediction,
  String result = '', String explanation = '', bool completed = false})` and
  `ModuleReflection.fromJson(Map<String,Object?>)` return `Result<ModuleReflection>`.
- Reflection length limits are 240/600/600 **UTF-16 code units before trimming**,
  matching JavaScript source. Disallowed control characters fail. Prediction is
  always required; result is required from experiment; explanation is required
  at explanation; completed is only valid at explanation.
- `merge(next)` matches canonical stage/completed preservation; an incomplete
  earlier stage cannot overwrite a completed explanation.
- `CompletedSoloRecord.fromJson(Map<String,Object?>)` accepts canonical keys:
  `attempt_id`, `mode`, `ruleset`, `score`, `total`, `mistakes`, `hints`, `skipped`,
  `elapsed_ms`. Ruleset is `single-attempt-v1`; quiz total10, practice15,
  review1–15; score+mistakes+skipped=total; all counts are bounded integers;
  elapsed is0–604800000ms. ID is1–160 ASCII `[A-Za-z0-9:_.-]`.
- `toJson()` emits canonical content only, without envelope, owner or credentials.

`core/records/formative_records.dart` freezes the feature ports:

```dart
abstract interface class FormativeRecordWriter {
  Future<Result<DurableRecordReceipt>> saveReflection({
    required ActorBinding actor,
    required ModuleReflection reflection,
  });
  Future<Result<DurableRecordReceipt>> saveCompletedSolo({
    required ActorBinding actor,
    required CompletedSoloRecord record,
  });
}

abstract interface class FormativeRecordReader {
  Stream<Result<List<ModuleReflection>>> watchReflections(ActorBinding actor);
  Future<Result<List<CompletedSoloRecord>>> readCompletedSolo(ActorBinding actor);
}
```

`LocalFormativeRecords(database:, sessions:, clock:, random:, outbox:)` implements
both ports in `core/records/local_formative_records.dart`. Root supplies one
instance to learning and cloud/game. Guest writes are durable local writes and
never enqueue events. Signed-in writes fail `unavailable` when no queue adapter
is installed. They cannot silently claim a synced or durable account save.
`DurableRecordReceipt` contains `actor`, `recordId`, `persistedAt`, `state` and
`durable`. Only `FormativeSaveState.local`/`pending` exist; this writer cannot
produce a server-synced receipt. A receipt is created only after the transaction
future confirms commit, with a final actor check.

`FormativeOutboxAppender.append({required AppTransaction transaction, required
ActorBinding actor, required FormativeEvent event})` returns `Future<Result<void>>`.
Prompt3 installs the signed-in adapter and uses **the supplied transaction**.
It must validate the account owner and immutable ID/payload, enforce the2000
pending-owner limit, and return failure if append cannot persist. Failure rolls
back the record together with the event. This hook must never send a request.
The later flusher reads at most20 events, sends canonical `toWireJson()` without
owner, and validates/acks only accepted batch IDs in the captured owner scope.
Hosted capability, retry and acknowledgment logic remains Prompt3 work.

Completed solo attempts are idempotent for identical content; changing payload
under an existing attempt ID fails `conflict`. Local quiz history retains the
latest50 quiz records per partition; practice/review records are unaffected.
The records remain unverified formative study, never class or Duel marks.

All reads, watcher emissions and writes recheck the complete current binding.
Watchers emit `stale` and terminate after identity/scope changes. A native commit
already acknowledged cannot be undone by a subsequent account switch; its row
stays in the captured partition, and no receipt is delivered to the new actor.
Storage exceptions and corrupt local JSON return `storage` without exposing raw
exception contents, SQL parameters or session values to UI/reporting.

## Schema ownership and migration rules

Foundation owns `core/storage/formative_schema.dart` and these shared tables.
Prompt2 and Prompt3 use its names, DTOs and reader/writer ports. Changes require
a foundation integration request and a new migration version, not a second SQL
reflection model.

| Table | Columns and key |
|---|---|
| `foundation_migrations` | `namespace TEXT`, `version INTEGER`, `description TEXT`; PK(namespace,version) |
| `module_reflections` | `partition TEXT`, `activity TEXT`, `payload TEXT` canonical JSON, `updated_at_ms INTEGER`; PK(partition,activity) |
| `completed_solo_records` | `partition TEXT`, `attempt_id TEXT`, `mode TEXT`, `payload TEXT` canonical JSON, `created_at_ms INTEGER`; PK(partition,attempt_id) |
| `formative_outbox` | `partition TEXT`, `owner_id TEXT`, `event_id TEXT`, `kind TEXT` module/solo, `content_version INTEGER` exactly1, `payload TEXT` canonical payload JSON, `created_at_ms INTEGER`; PK(partition,event_id), CHECK partition=`owner:`+owner_id |

Migrations use a validated namespace `[a-z][a-z0-9_]{0,63}`, positive contiguous
versions1..n, immutable descriptions, and unique(namespace,version). The registry
rejects collisions before opening the database. `foundation_records` is reserved;
`SqliteAppDatabase.open` installs its version1 before sorted feature migrations.
Feature contributions must not register it again. The migration ledger and all
pending migrations run in one SQLite transaction. A throw rolls everything back.
Already-applied descriptions cannot be changed; removing a feature contribution
does not drop its stored tables. Call only the transaction handle from inside a
transaction, never the parent database; awaiting the parent can deadlock sqflite.

SQLite opens with foreign keys enabled and `synchronous=FULL`. A successful
platform commit acknowledgment is the durable boundary; widget memory and
connectivity status are not that boundary. Credentials are held solely by
`SessionStore`. Validated DTO/event writers accept only canonical formative
fields. Raw SQL is an adapter capability, not an untrusted module interface;
the signed-in queue adapter must preserve the same credential-free boundary.

## Verification scope

`test/core/formative_record_test.dart`, `test/core/session_network_test.dart`
and `test/storage/sqlite_formative_records_test.dart` exercise canonical bounds,
session refresh/switch/logout, stale responses, protected-store adapter paths,
Retry-After, real SQLite reopen/rollback, delayed commit, absent queue, owner
isolation, immutable attempts, migration collisions and quiz retention.

SQLite tests use the real `sqflite_common_ffi` engine and temporary on-disk files.
The test outbox adapter is local only. Secure-storage unit tests use the plugin's
explicit mock interface; they do not prove an Android Keystore round-trip.
Android boot/reopen/device tests are foundation integration evidence recorded by
the lead separately. No hosted backend, Auth email or physical device result is
claimed by these tests.
