# Native GeoMath sync resume review

Reviewed on 2026-11-05 in `/workspace/scratch/7395917c0f68/native-worktrees/worker-5`, private branch `app-cloud-game-native-worker-5`. App version remains `0.1.0+1`; no firmware or root files changed. No push, hosted changes, or sub-agent delegation.

Commits to integrate, in order:

- Existing implementation: `b358d72edf4c1ed3d2f6d3a0a8f1058f0759b521` — atomic native formative sync and durable signed-in solo receipts.
- Resume fixes: `a5be14f43d3b08621d8e4332c882b99b164bc442` — guard sync save coalescing and cloud history retry deadlines.
- Real Auth outage regression: `39933d80f4897601dbbf354f9411d5f862f46e50` — test transient Auth HTTP 503 through durable sync retries. Requires Auth follow-up `848307d3e56b1bdb62cb8c076420fb21c38499e4` after `e2bb4474d6502549a78fdbe61b7b2c4928886aa3`.

The resume commit changes exactly three paths: `lib/features/sync/application/formative_sync_controller.dart`, `lib/features/sync/data/sync_formative_record_writer.dart`, and `test/features/sync/native_outbox_test.dart`, all beneath `apps/geomath_flutter/`. Final worker tree/index is clean. The missing unchanged blobs in this reconstructed sparse repository prevented normal `git commit`; the lead-authorized `write-tree --missing-ok`, `commit-tree`, and expected-head `update-ref` created the private commit without changing unrelated files.

Two reproducible defects were fixed. An identical save in a new binding epoch previously reused an in-flight save belonging to the old epoch, returning stale without executing the current actor's save. Coalescing now requires full actor equality; current work waits for old work, then saves with its own binding. Cloud-history refresh previously bypassed the shared retry deadline and could repeatedly call the same throttled RPC. It now returns the remaining retry delay until the deadline, honors delay metadata from successful history responses too, and rechecks the actor/generation before delivering a deferred result. Five new regression cases cover these behaviors, including HTTP 200/429, a push-derived deadline, and an actor change while a deferred result is pending.

Reviewed the existing implementation against AGENTS, Prompt 03, COMMON_RULES, STORAGE_CONTRACT and FOUNDATION_CONTRACT. The shared writer and supplied transaction keep reflection/history, queue append, and solo receipt atomic. Signed-in receipts preserve attempt identity, canonical payload and original commit time after outbox acknowledgment, 50-quiz retention, session changes and disk reopen; an appender check prevents a racing pruned attempt from being reinserted. Queue reads/acks are owner partitioned and check complete bindings after awaits. Guest writes stay local and are never transferred to an owner. The 20-event batch and 2000-pending-owner limits, immutable event payloads, accepted-ID-only deletion, invalid/missing acknowledgment preservation, partial acknowledgment handling, finite retries, Retry-After, permanent rejection, needs-auth and unavailable states already have implementation and baseline regression coverage. Those unrelated baseline cases were not broadly rerun during this resume review.

Verification with `/workspace/scratch/7395917c0f68/toolchains/flutter/bin/`:

- Before fixes: the two initial focused regressions failed as expected; `/workspace/scratch/7395917c0f68/evidence/resume-sync-before.log` records the stale-save result and repeated history delay.
- Final `flutter test --no-pub test/features/sync/native_outbox_test.dart --name 'a new epoch save|history refresh honors|history cooldown|cached history|history coalesces|Retry-After survives|wakes coalesce|binding change during append' --reporter expanded`: **10 passed, exit 0**. Log: `/workspace/scratch/7395917c0f68/evidence/resume-sync-tests.log`.
- `flutter analyze --no-pub lib/features/sync test/features/sync integration_test/sync_storage_test.dart`: **no issues, exit 0**. Log: `/workspace/scratch/7395917c0f68/evidence/resume-sync-analyze.log`.
- `dart format --output=none --set-exit-if-changed` on the three changed Dart files: **0 changes, exit 0**. Log: `/workspace/scratch/7395917c0f68/evidence/resume-sync-format.log`.
- `git diff --check`: **exit 0**.

The worker did not contain Auth. The approved temporary read-only symlink to worker-1 Auth was used for checks and removed afterward; it is absent from the commit. Worker-1's resulting Auth commit is `e2bb4474d6502549a78fdbe61b7b2c4928886aa3`. Relevant dependency SHA-256 values observed after checks: `auth_services.dart` = `e6878da47aa637900832f82afa250da7689af34dbb205c979307b98bdfc79895`; `data/cloud_gateway.dart` = `2476b818d7924eb234401f2079a97466b05eb3636819e75740e089164d3bb6d6`; `data/auth_repository.dart` = `a7b0e8457a1c7cabbcf85906e8884b23e3d213004cebfb0d9330b3b93539e75c`. The first two hashes were identical before and after the final checks. One earlier concurrent Flutter wrapper launch raced on the shared SDK's `engine.stamp.tmp` rename before tests started; the sequential rerun completed successfully.

Integration needs and limits:

- Integrate Auth and register `syncFeature()` once. Its `sync:1` migration and formative outbox/writer extensions are feature contributions; no shared schema edit is needed. Keep one `SyncServices.controller` alive/resolved for the app lifetime so startup/foreground triggers run even before opening `/sync`. Learning and solo should obtain `FoundationServices.recordsWriter`, which resolves the receipt-aware wrapper.
- The existing `integration_test/sync_storage_test.dart` remains unchanged and passes static analysis. Android execution/APK/device smoke and hosted `geo_offline_sync` capability/authorization remain lead integration checks; none were newly run or claimed here. The Android test uses an explicitly labelled RPC fixture and does not establish hosted acceptance.
- Guest receipts use the shared local writer and have no sync ledger. SOLO was informed that its durable finalized marker is the guard after guest quiz retention; the guest crash window between shared-writer commit and SOLO marker is outside this worker's ownership. Signed-in retries are protected by `sync_solo_receipts` even in that window.
- No remaining blocker within the changed sync paths. No credentials, real tokens or backend configuration were introduced.

## Follow-up: real Auth HTTP 503 classification

The integration review identified that the real `NativeAuthRepository` classified HTTP 503 as `unavailable`, halting sync as though its RPC capability were absent. The Auth owner corrected that classification to transient `network`; 404/405/501 remain unavailable. This worker added only two focused integration regressions to `test/features/sync/native_outbox_test.dart` in `39933d80f4897601dbbf354f9411d5f862f46e50`. No sync controller or Auth production file changed here.

The tests use the real native credential owner and RPC adapter after scripted login/server identity verification, real on-disk SQLite, the signed-in writer/outbox and the actual sync controller. An explicitly labelled `AuthTransport` script supplies HTTP responses; no hosted request occurs, and synthetic session data stays in an in-memory protected-store fixture.

- The first case returns HTTP 503 with a three-second Retry-After. It checks pending rows are unchanged, an immediate manual wake cannot bypass that deadline, and automatic foreground recovery acknowledges the identical event ID and payload without removing local completed history.
- The second returns five HTTP 503 responses. It checks pending rows survive every failure, retries stop at the five-attempt budget, an ordinary wake makes no sixth request, and an explicit retry recovers with the identical original event.
- `flutter test --no-pub test/features/sync/native_outbox_test.dart --name 'native Auth HTTP503' --reporter expanded`: **2 passed, exit 0**; `/workspace/scratch/7395917c0f68/evidence/resume-sync-auth-503-tests.log`.
- Bundled Dart SDK `dart analyze test/features/sync/native_outbox_test.dart`: **no issues, exit 0**; `/workspace/scratch/7395917c0f68/evidence/resume-sync-auth-503-analyze.log`.
- Bundled Dart SDK `dart format --output=none --set-exit-if-changed test/features/sync/native_outbox_test.dart`: **0 changes, exit 0**; `/workspace/scratch/7395917c0f68/evidence/resume-sync-auth-503-format.log`. `git diff --check` also passed.

These targeted tests used the pre-existing approved read-only worker-1 Auth symlink, which was left untouched and remains untracked. Auth production file SHA-256 values were identical before and after the tests: `data/native_auth_repository.dart` = `10e8de48938de375ac34be45c4fd93ba8cb62cb5bf4fa6cc5d87f0fb61699529`; `data/auth_transport.dart` = `ea95345fc52fdd2fedc97356db4c884ecf34ab87a4ef0296339796cd9c7215d3`. The Auth owner confirmed those sources in final follow-up commit `848307d3e56b1bdb62cb8c076420fb21c38499e4`. Tracked worker files and index are clean. No broad suite, Android device, or hosted check was rerun for this test-only follow-up.
