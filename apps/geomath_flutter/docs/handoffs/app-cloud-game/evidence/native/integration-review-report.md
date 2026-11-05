# Native cloud/game integration review

Reviewed 2026-11-05, read-only, at
`/workspace/scratch/7395917c0f68/native-worktrees/app-cloud-game`.
Reviewed HEAD: `a2a3926e130c46ff3b3085c1b954ad329d230248`.
Final scoped re-review HEAD: `344bea6a0323dae3d63a571e43945469bdeec6f6`.
Foundation READY: `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e`,
locally adopted as `41b5774694c83b9d2464df4bbc3bc55046a79dd8`.

Scope: meaningful integration between Auth/session restoration, the shared
gateway, shared writer/outbox/migrations, reachable Solo/Duel routes, and
navigation/lifecycle owners. Read Prompt 03, COMMON_RULES, the frozen
FOUNDATION_CONTRACT/STORAGE_CONTRACT, actual production registrations and
implementations, relevant composition tests, and the five worker resume reports.
No source edits, test reruns, agents, backend calls, deployment or push were made.
Existing passing suites were not repeated.

## Final scoped re-review verdict

**PASS for the three reviewed fixes at
`344bea6a0323dae3d63a571e43945469bdeec6f6`: all three Important findings are
resolved; no remaining Critical or Important issue was found in their patch.**
The bounded root navigation/callback and hosted/device verification limits below
remain. This is a source and focused-evidence review, not the parent's final
combined analysis/test/APK result.

Reviewed only the eight changed files in
`evidence/final-review-fixes.diff` from `a2a3926` to `344bea6`: production startup,
Auth HTTP transport/status mapping, their tests, the actual-gateway sync
regressions and Auth documentation. No test rerun, source modification, backend
call, push or expansion into untouched areas was performed.

| Original finding | Final implementation and evidence | Status |
| --- | --- | --- |
| Offline restoration blocks guest Solo | `lib/dev/cloud_game_features.dart:115` permits network/retryAfter/unavailable continuation only while Auth's actual current binding is guest. It retains protected credentials, publishes an actor-bound notice, offers a network-failure retry, keeps explicit login and Solo reachable, and constructs sync once. Throttled restoration deliberately has no immediate retry action. The added startup cases cover 502/429/503 in BM/English at 320dp and 150% text, existing owner queue preservation, guest local saves, retry coalescing and a superseded retry versus newer verified login. Parent reports the focused nine startup tests passed. | Resolved |
| Real HTTP 503 halts sync and bypasses profile unknown outcome | `lib/features/auth/data/native_auth_repository.dart:206` now leaves 503 on the transient network path, preserving Retry-After. 404/405/501 remain unavailable. The real profile repository receives network failure, reaching its existing unknown-outcome UI guard. Actual NativeAuthRepository + SQLite writer/outbox + sync controller regressions prove cooldown, foreground recovery with identical events, finite five-attempt budget and explicit recovery. Reviewed `auth-http-errors-tests.log` (21 passed) and `resume-sync-auth-503-tests.log` (2 passed), plus their worker receipts. | Resolved |
| Non-JSON 429 loses Retry-After | `lib/features/auth/data/auth_transport.dart:60` now returns non-2xx status and Retry-After before parsing successful JSON, discarding/cancelling untrusted error bodies. Loopback tests cover HTML 429/500/502/503/504/404/405/501; HTTP 200 still rejects malformed JSON and the existing whole-attempt deadline remains covered. Included in the 21 passing focused Auth/profile/transport tests. | Resolved |

The focused tests use explicitly labelled local transport/protected-store seams;
the HTTP body/header cases use a real loopback HTTP server. They establish the
specific native integration behavior without implying hosted activation or a
platform credential-store round trip. Parent owns the running final combined
checks and APK build.

## Historical verdict at the original reviewed HEAD

**Changes required: three Important integration defects; no Critical finding.**
The parent has assigned focused fixes and real-adapter regressions for all three.
Re-review should be limited to those changes and their test receipts.

### Important 1 — Offline session restoration blocks local guest Solo

- `apps/geomath_flutter/lib/dev/cloud_game_features.dart:101` awaits restoration,
  and lines 108–111 return network/retryAfter failures from the shared startup.
- The same file wraps every cloud/game feature route at lines 148–165 and renders
  only the retry panel on failure at lines 214–234.
- `apps/geomath_flutter/lib/features/auth/data/native_auth_repository.dart:357`
  refreshes stored credentials over the network; adoption follows verification
  at lines 370–375.

With a previously saved login and an offline connection, restoration returns a
network failure while the foundation binding is still guest. The preview's
initial `/play`, the login page, and all other cloud/game routes then remain
behind startup retry, so a user cannot reach the offline local Solo experience.
This is a product reachability failure, not loss of local records or accidental
adoption of an unverified account. Permit bounded guest continuation for network
and throttling failures, retain an honest warning and explicit restoration retry,
and preserve the protected session. The existing protected-store-failure gate is
a separate path and is not implicated by this finding.

Final status: resolved at `344bea6`; see the scoped re-review above.

### Important 2 — Real HTTP 503 permanently halts automatic formative sync

- `apps/geomath_flutter/lib/features/auth/data/native_auth_repository.dart:196`
  classifies non-success transport statuses; line 206 maps HTTP 503 to
  `FailureCode.unavailable`.
- `apps/geomath_flutter/lib/features/sync/application/formative_sync_controller.dart:139`
  includes unavailable among halted states. Lines 264–271 keep halted states
  stopped on ordinary wakes, including foreground wakes. Lines 426–435 map the
  gateway failure to unavailable instead of bounded transient retry.
- `apps/geomath_flutter/test/features/sync/native_outbox_test.dart:832` already
  tests a 503 as transient, but injects `Success(CloudReply(statusCode:503))`;
  the real gateway returns `Failed(unavailable)` before that branch can run.

A temporary JSON HTTP 503 from `geo_offline_sync` therefore leaves pending
records safe but stops automatic delivery for the app lifetime until the user
explicitly retries. This defeats the required transient retry policy and shows
an integration gap hidden by the narrower gateway fixture. Preserve 503 as a
transient transport failure through the actual native gateway, while keeping
missing RPC/service statuses unavailable. Validate with the real
NativeAuthRepository and sync controller rather than only a fabricated reply.

Related impact: `profile/presentation/profile_screen.dart:166` recognizes only
network failure as an unknown save outcome. The same 503 classification currently
bypasses that intended reconciliation guard. Treating the transport failure as
network also restores that protection. Classroom already handles either network
or unavailable conservatively for mutation outcomes.

Final status: resolved at `344bea6`; see the scoped re-review above.

### Important 3 — Non-JSON HTTP 429 loses the server cooldown

- `apps/geomath_flutter/lib/features/auth/data/auth_transport.dart:68` decodes
  every body as JSON before returning its HTTP status and Retry-After header
  at lines 74–77.
- `apps/geomath_flutter/lib/features/auth/data/native_auth_repository.dart:881`
  catches that parse error as a generic network failure without retry delay.
- `apps/geomath_flutter/lib/features/sync/application/formative_sync_controller.dart:410`
  consequently schedules its ordinary network backoff.

An upstream 429 with an HTML/plain-text body throws during decoding, hiding both
the throttle status and its Retry-After header. Automatic sync then retries using
its shorter local delay instead of honoring the server cooldown; other shared
gateway borrowers also lose the delay. Empty bodies are already supported, so
the specific failing case is a non-JSON error body. Preserve HTTP error status
and safe header metadata independently of successful-response JSON validation.
Use an actual loopback HTTP transport test for this path.

Final status: resolved at `344bea6`; see the scoped re-review above.

## Integration properties found consistent

- `cloudGameFeatures()` registers Auth, profile, classroom, Solo, Duel and sync
  once. Auth's real repository is the same `CloudGateway` instance borrowed by
  profile, classroom and sync. Duel uses its intentionally separate protected
  capability transport.
- Auth restoration precedes sync controller construction; startup has one lazy,
  coalesced lifetime. Verified adoption persists protected credentials first.
  Gateway requests capture their credential and check full actor/intent before
  and after awaits; feature controllers retain full binding/generation guards.
- Solo obtains `FoundationServices.recordsWriter`, resolving the sync wrapper
  around the actual shared record adapter. The outbox factory borrows only the
  database/session during bootstrap, avoiding premature `app.records` access.
- Shared local aggregate/reflection and formative event append use the same
  supplied SQLite transaction. The signed-in solo receipt ledger is in that
  transaction and protects retries after ack, retention and reopen. The solo
  detail/finalized marker is a separate recoverable feature projection.
- Contributions install only `solo:1` and `sync:1`; foundation installs its
  reserved schema first. No parallel reflection schema or second database was
  introduced. Owner partitions and accepted-ID-only acknowledgement remain intact.
- Play exposes real registered Duel and pending-record routes through the
  `solo-duel` and `solo-sync` buttons. Active Solo and Duel hide destination
  navigation. Their back policies use the contributed root owner; Solo pauses
  and checkpoints, while Duel reconciles the live server-owned match.
- No production registration imports tests or installs fixture transports,
  memory sessions, fake cloud replies or simulated cloud capabilities. The
  source-projection corpus is confined to tests. Missing public configuration
  returns honest unavailable states while guest bootstrap remains available.
- The changed-path list against the local foundation adoption contains feature
  implementation/tests and `lib/dev` only. No root/core/router, manifests,
  pubspec/lockfile, learning or digital source change was present at this HEAD.

## Known bounded foundation/platform limitations

1. `apps/geomath_flutter/lib/app/app_router.dart:86` selects destinations by
   `navigation.reset()` at line 91, bypassing contributed back policies. This
   skips profile save/discard/stay confirmation. Profile drafts and in-flight-save
   unknown-outcome state are retained in actor-bound feature memory
   (`profile_screen.dart:335`, `profile_drafts.dart:25`), so the inspected fallback
   does not show confirmed draft/record loss. The same bypass also skips the
   classroom attempt confirmation in `classroom_feature.dart:68`; leaving the
   page stops timers via `classroom_screen.dart:94` / controller `setVisible`,
   while its service-owned attempt and immutable pending command remain. This
   needs the integrator's shared destination guard; it is not a new secret leak,
   score authority failure or proven sequence loss. Root is immutable in this
   branch.
2. `auth_feature.dart:14` deliberately leaves `nativeCallbackReady:false` until
   Android callback intent handling and the identical hosted redirect allowlist
   are established and cold/warm round trips are verified. Provider/link
   unavailability is explicit. This remains an integration/platform gate, not a
   claim of working Google consent, SMS, native callbacks or email delivery.
3. Existing local unit/widget/SQLite/source parity receipts do not prove hosted
   Auth/classroom/offline-sync deployment, a real two-client Duel match, Android
   Keystore durability, physical-device execution or production capacity. The
   parent is completing combined QA/build evidence separately. No backend
   deployment is authorized or needed for these source changes.

## Evidence used without repetition

Worker receipts: `evidence/resume-auth.md`, `resume-classroom.md`,
`resume-solo.md`, `resume-duel.md`, `resume-sync.md`. These document their scoped
analysis/format/test commands and boundaries. Actual composition/startup tests
were read for dependency ownership and failure behavior. No pass is claimed for
a test command that this reviewer did not run.
