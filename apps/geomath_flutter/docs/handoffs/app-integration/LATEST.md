# GeoMath Flutter integration

Status: **integrated; Android rerun required after observed failures**. App0.1.0+1, contract1.0.0.

## Sources

|Ref|Verified remote SHA|
|---|---|
|app|38f061af963256528d5060ff076bae9ee05eafc3|
|app-foundation|9a1f49a7c92d13bb70b7fd1420c34629a7785f9e|
|app-learning|8a5527438ee828a306afba36a337a3ca3bbedb83|
|app-cloud-game|33e6734a27db789f04a9a048bf7f69ebd046e016|
|main inspected|25836eb1a6f24459aace8a3980ae880a13e3b488|
|main-digitalized inspected|752ce908d16d13acc9cc7510797e8363d182c3f5|

Both features retain the same frozen contract/source-lock/pubspec-lock hashes.
The original feature ancestry is preserved; unknown unrelated source blobs were
left by hash, never replaced by a feature snapshot. See ancestry.md.

## Integration decisions

- Register productionFeatures() in lib/main.dart and await existing session/sync
  startup before Home. Move real cloud wiring to app/, retain a dev re-export.
- One database/migration registry, one session/audio owner, one shared formative
  writer and sync controller. Learning and Solo consume the same writer; guest
  stays local and signed-in records+events commit atomically.
- Bottom destinations now await leave policies for every discarded stack entry.
  Stay preserves a live draft, a stale confirmation cannot reset newer routes,
  and concurrent resets/back share one pending operation.
- Home reaches the real learning route and displays current guest/account state.
- Android reserves one app_links callback filter and disables competing Flutter
  deep-link dispatch. nativeCallbackReady remains false pending hosted proof.
- The workflow runs all feature host tests and one combined real-plugin/WebView
  Android APK, then runs/captures the preserved normal production APK offline.

## Evidence

Four destination regression tests failed before the fix and pass after it;
production Home composition likewise failed on development copy before repair.
Full combined host and Android results are updated after actual execution.
Worker audit receipts preserve exact tested source and label fixture scope.
SCREEN_ACCEPTANCE.md/.json cover all48IDs and16EXstates without claiming every
item device/hosted accepted. Android screenshots and APK receipts will link the
verified runtime source; this file never embeds its own commit SHA.

## Limits

No hosted Auth/profile/classroom/offline-sync/two-client Duel acceptance is
inferred from fixtures. No native Google/recovery success, physical phone,
TalkBack/manual gestures, iOS,5,000-user capacity or production signing claim.
No backend/Pages/store deployment or main/main-digitalized/sharing push.
APK source, mode, bytes and SHA256 are recorded only after a real build.

## First integrated Android run

Source290ee4ac048fed351f59539e2678a265de194d0b, CI42019726071:
format/analyze,479host tests,46Node checks, normal debug and development-signed
release builds all passed. Real API35/KVM device run reported18passed/8failed
(including runner teardown count). Failures are retained, not reported as PASS.

Fixture fixes now await current-route/private-WebView readiness instead of
casting null or querying a disposed controller. Records await actual rendered
widgets. The actor-reopen spike drains its old native document before allocating
a new platform-view lifetime, retaining the stale-envelope rejection assertion.
Classroom input dialogs now scroll title/form/actions together: a meaningful
320dp/150%/580dp-keyboard regression reproduced117px overflow and now passes.
The revoked-access fixture denies both scoped room and scheduled dashboard reads.

The runner preserves a failed integration exit code while independently launching
and capturing the normal app. No failure is hidden. Dependency-only CI caches
are saved before device execution; no account/session/config/build outputs are
cached. Hosted providers and physical-phone/manual acceptance remain separate.


## Current verified build and host checks

CI [42028366834](https://github.com/unDead41/geodecoder/actions/runs/42028366834),
source `e008090c511aabe45ea6aae06396a9d60fae3aa9`, has passed formatter,
Flutter analyzer, 480 combined host tests, 46 canonical/adapter Node checks,
normal debug APK and release-mode APK builds. The Android stage was cancelled after eight minutes of an unreachable VM
service, before any test started; this is not an Android PASS. Earlier host and
build steps retain their successful results. Runner diagnostics and a bounded
connection watchdog are being prepared before the next real-device run. Release mode uses development
signing, not a production keystore. The strict SQLite prefetch helper also has
five passing local Python regression tests; it verifies unchanged package-pinned
SHA256 values and never accepts a corrupt download.

The downloadable normal `lib/main.dart` debug APK is built from runtime source
`f3555c2e94fdfc8c39111d550de977ec7cf10bc3` with no cloud definitions. Later CI-only
changes do not change the product runtime. Its 170-file runtime manifest, package
assets, ZIP CRC and v2 signature are recorded in `evidence/local/apk-receipt.json`.
Bytes:174918800. SHA256:
`847d20b2ccb66abae51807d281859e3963b3493909e2ee72375c43f7d4c4d1a3`.
Android package `com.geomath.dev`, version0.1.0+1, minSDK24/targetSDK36,
ARMv7/ARM64/x86_64. This is a guest/offline development APK. Cloud definitions and
hosted capability verification are needed before claiming online operation.


## Cancelled emulator attempt

Run42028366834 / job127248186633 used API35 x86_64 and WebView124.0.6367.219.
The test APK installed, but Flutter's VM RPC connection never became usable;
no suite tests started. The lead cancelled the unbounded connection wait.
The previous attempt had also logged a null pre-test focus and ColorBuffer
warnings while successfully connecting, so neither warning alone establishes
an app defect. No product-runtime change is inferred without further evidence.
The cancelled run's evidence artifact13415769598 has ZIP SHA256
`95718510a7cafe8cf49687d24b27c12663746981706f4db4227137074aa6ca75`.


## Discriminating Android child-bootstrap run

Run42033540615 at a51147e passed Android window readiness and VM RPC connection.
It reproduced the second-actor WebView handshake failure at module_spike_test181
and a12minute learning fixture timeout waiting for a native JS response after
renderer teardown. Neither result is accepted as PASS. Wrapper diagnostics showed
a configured top-level document but neither opaque-child ready signal.

The next source adds sanitized, source/origin-validated child parse/load/error
counters and bounds fixture JS reads. Canonical HTML/math bytes remain unchanged.
This is instrumentation, not a claim that the handshake defect is fixed.
An explicit [android-diagnostic:module-spike] commit runs only that Android suite,
skipping full app builds/host tests/captures. Its receipt has full_publish_gate:false
and cannot replace the unmarked complete Android publication gate.


## Bounded startup and remaining fixture corrections

Focused Android diagnostic42040751191 on405a0d completed all three module cases
plus runner teardown successfully. It is explicitly not the complete app gate.
The previous full run finished22passed/5failed, including runner teardown;
classroom, Solo, sync and production composition tests all passed. Production
capture failed to locate the comma-joined Settings label in the real Android tree.

The source now gives trusted document loading/configuration its own bounded30s
foreground budget, followed by a separate bounded30s secure-ready budget.
Previously, native document loading consumed the secure handshake budget before
configuration completed. A29s document-delay regression reproduced that failure
at the old30s boundary. Missing configuration/ready still fails; terminal actors
and late callbacks cannot revive a view. Covered/background stages preserve their
remaining budget. URL, opaque-origin and bridge capability validation are intact.
Seven focused deadline cases and11preference-screen cases passed together
(18/18), with clean full analyzer/formatter. The full Android gate must be rerun.

The preference chooser now exposes its actual semantic tap action and disables it
while saving. Capture selectors recognize the actual comma-separated accessibility
labels and read fresh uniquely named UI hierarchies, preventing stale XML reuse.
Learning screenshots reset conversion state with the SDK's per-test teardown;
the actor-switch fixture expects stale rejection and checks durable partition
bytes directly in test SQLite. No assertion is replaced with fake success.
