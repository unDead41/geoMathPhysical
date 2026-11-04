# Foundation independent review

Review scope: Prompt 1 (`01-flutter-foundation.md`) and `COMMON_RULES.md`,
with the archived SOR, architecture, UX, design, test plan and implementation
plan as supporting requirements. This review does not accept feature work from
Prompts 2 or 3 and does not establish hosted backend readiness.

## Baseline and evidence limits

- Worktree: `workers/review`; private branch
  `app-foundation-worker-review-5c9e`.
- App source baseline: `38f061af963256528d5060ff076bae9ee05eafc3`.
- Requested firmware reference: `25836eb1a6f24459aace8a3980ae880a13e3b488`,
  v2.0.2; requested Digital reference:
  `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`, Digital 2.9.1 / module 1.6.2.
  The review checkout initially contains a partial file snapshot, without the
  latter Git objects. Source export provenance must therefore be checked
  against the source owner's canonical receipts, rather than claimed from a
  local `git show`.
- The archived package refers to twelve mockup PNGs. These binaries are absent
  from the initial review checkout. Their visual inspection is not claimed.
- Unit/widget tests, Android builds, emulator runs, physical phone runs and
  hosted service checks are separate evidence classes. A widget screenshot
  cannot establish Android WebView operation.

## Required acceptance checklist

The evidence column is a verification target until a result is recorded below.
No row is accepted merely because its interface, route or placeholder exists.

| Area | Required behavior | Verification target |
|---|---|---|
| Offline bootstrap | Guest starts without cloud configuration or Internet; unavailable cloud features remain clearly labelled | Actual app-flow Android smoke plus root bootstrap/widget checks |
| Native foundation screens | 01, 04, 37, 38, 39, 40 function as real UI; unfinished tabs clearly state their status | Navigate home/help/guide/settings/report; validate/report preview/copy/TXT |
| Preferences | BM/English, light/dark/system, 100/125/150%, contrast, reduced motion and audio persist after reopen | Real local database reopen plus Android app-flow |
| Design ownership | Shared tokens/components; face colors use stable physical IDs; neutral game cards do not reveal answer pairs | Generated provenance, palette tests and canonical asset checks |
| Actor binding | Stable guest partition; account/session/scope changes invalidate stale work; same-session refresh retains actor epoch | Actor isolation/refresh tests and stale bridge negative case |
| Protected sessions | Credentials live behind protected session storage and do not enter general state, assets, reports or bridge | Session-store adapter review; serialization and source inspection |
| Durable records | Actual guest reflection/solo persistence uses canonical shared DTOs; failed transaction cannot return durable success | Failure-injection/rollback/reopen and actor-bound reader tests |
| Missing signed-in queue | Signed-in storage without its queue adapter reports unavailable/failure; it must not imply saved or synced | Writer failure/receipt contract test and consumer review |
| Extension points | Preview contribution registers routes, services, migrations and localisations without root changes | Independent preview bootstrap contract test, including duplicate rejection |
| Dependency ownership | One auth, database, preference and audio owner; clock/RNG and lifecycle/back policy injectable | Composition/service ownership review and lifecycle tests |
| Source export | Bank 15, three per five canonical shapes including cone; 11 learning models; explicit RNG draws and clocked JS golden actions | Canonical source export checks and manifest hashes |
| Module bundle | Full canonical local HTML/JS/audio is bundled; no runtime CDN/GitHub dependency | Source manifest/integrity checks and true Android WebView launch |
| Bridge boundaries | Native envelope, progress protocol 1 and settings version 1 stay separate; untrusted navigation/messages rejected | Native validator negative tests and real WebView receipt |
| Asset registration | Central registry points at feature-owned submanifest; feature updates do not require duplicated aggregate per-file hashes | Manifest ownership review and corrupt/missing-byte rejection |
| Freeze | Actual signatures/DTOs and ownership documented; lockfile committed; source/contract/asset hashes and actual SDK recorded | FOUNDATION_CONTRACT/SOURCE_LOCK/READY record review |
| Git scope | Only lead integrates and pushes app-foundation; firmware/Digital/hosted services unchanged | Final scoped diff and remote readback by lead |

## Five mandatory scenarios

| Scenario | Meaningful test | Acceptance condition |
|---|---|---|
| Settings during model rotation | Capture real module diagnostics after rotate/unfold, update theme/language/text, inspect the same WebView instance | Camera/model/unfold state survives; preferences update without reload |
| Offline cold start, missing/corrupt asset | Start from bundled assets, then use missing/corrupt bundle loader before host launch | Valid bundle can become ready; invalid bundle never loads/labels ready and provides an error/retry path |
| Late old actor response | Capture old actor/instance envelope, switch actor epoch, deliver old message | No accepted receipt/record/state change for the new actor |
| Failed save / queue absent | Force real transaction failure and call signed-in writer before queue adapter is installed | Failure result; no committed partial record and no durable/synced UI claim |
| 320 dp, 150%, keyboard and back | Render native report/settings at 320 dp; focus field, show keyboard, invoke system/app back and exercise confirmation | Main action and cancel/stay/discard controls remain reachable without overflow or draft loss |

## READY decision rule

`ready` requires all of the following on the integrated foundation commit:

1. Actual `flutter analyze`, `flutter test` and debug APK build finish with exit
   code 0. Formatting checks and dependency resolution also pass.
2. Real Android WebView integration smoke runs on an identified emulator or
   physical device; the module renders, rotates/unfolds, validates a bridge
   message, retains model state through preferences and rejects invalid assets.
3. Required actor/storage/preview/accessibility negative cases are tested or a
   specific unresolved case blocks readiness.
4. Evidence includes actual commands/status, SDK/device/WebView versions,
   source lock, contract/asset hashes, rendered screenshots and known limits.

Any missing required run means `blocked`, with its specific reason. An APK
build alone is not a device-smoke pass. A future test file is not an executed
test. A timeout, skipped test or unavailable device is not a pass. Device
availability must not be hidden behind WebView plugin mocks or a generic
navigation-only integration test.

## Findings and verification results

| Check | Actual result | Evidence / limitation |
|---|---|---|
| Archived visuals restored | All 12 PNGs match the app-tree Git blob IDs; contact sheet and full-size settings/support reviewed | Source archive SHA256 verified by lead; independent Git blob checks performed on all 12 originals |
| Canonical source integrity | 72 present canonical module source files match the main-digitalized-tree Git blob IDs | Checked the files actually present in the scratch snapshot, not an unavailable complete Git checkout |
| Canonical math contracts | 93 tests passed, 0 failed, 0 skipped; exit 0 | `node --test tests/learning-mesh.test.mjs tests/geometry.test.mjs tests/calculation-steps.test.mjs tests/projection-geometry.test.mjs` in the canonical module snapshot; no Android rendering inference |
| Inherited firmware consistency | `[VERSION OK] GeoDecoder v1.1.3`; exit 0 | App baseline retains Digital's historical firmware files; this does not supersede actual main v2.0.2 and no firmware bump is made |
| Navigation review | Synchronous back-policy reentry could invoke duplicate confirmation before pending registration | Reported to composition owner; independent regression test added; implementation fix and run pending |

Integrated-code follow-up:

| Check | Actual result | Evidence / limitation |
|---|---|---|
| Back contract | 3 PASS | Reentrant confirmation, coalesced back requests, superseded route and draft-preserving stay; `back_policy_contract_test.dart` |
| Preview bootstrap | 3 PASS | Both preview contributions render and translate through the normal root, with real SQLite FFI migrations/services; duplicate database owner rejected |
| Bundled native adapter | 5 PASS | Actual bundled JavaScript in a unit harness; background-ready retry, source checks, protocol separation, exact record keys and disposal; no WebView simulation claim |
| Report at 320 dp / 150% | Partial run, then test-helper correction | Validation, keyboard, coalesced back confirmation and draft preservation passed before the test attempted to find an unbuilt lazy-list button; helper now scrolls the sheet to build/reach buttons |
| Failed report export | Test-helper correction pending rerun | Same lazy-list finder problem corrected; failed export assertion is not yet marked PASS |
| Scoped analysis | PASS before the final helper adjustment | All five independent Dart targets analyzed without issues; final integrated analysis remains the lead's gate |
| Latest scoped retry | Host timeout, not PASS | A retry stalled while loading the test file and hit the external 120-second timeout (exit 124), without a test assertion; further concurrent Flutter work paused while Android build/emulator uses host resources |

The initial root runtime review also found an absent Overlay ancestor for
navigation tooltips, popup back dismissal bypassing the popup stack, two module
headers and unconnected progress persistence. The lead corrected these in the
composition/root owners. Native progress now uses the shared record writer and
shows a receipt/failure notice; canonical child copy describes provisional
draft state. Final verification must run against the integrated root, not the
earlier worker snapshots.

These checks establish no APK or Android device PASS. The real WebView targets
are `integration_test/module_spike_test.dart` and
`integration_test/app_flow_test.dart`; both require an actual Android device and
neither replaces the WebView platform/controller with a mock. The app-flow test
uses actual SQLite, preferences and clipboard plugins, isolates its database
fixture, restores preferences and deletes its database fixture afterward.
