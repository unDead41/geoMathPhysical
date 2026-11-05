# GeoMath Flutter integration

Current source377a444 passed494host tests,50canonical checks,26tool checks,
debug/release builds and3affected real-Android WebView cases. CI42082666643
completed32normal-main captures, but independent visual review rejected two:
390dp captured before the native controller was ready and430dp cropped the cube.
All28non-cube originals and320/768cube originals are visually clear. This is not
a visual gate PASS and app remains unchanged.

The capture-only correction reuses exact normal APK d2a7ab8253b3e85dca5455f556338431e350206b85f327211338928c3c5bda09
from source377, requires the native picker enabled ANDclickable, final canonical
Image semantics, two fresh ready hierarchies and the entire canvas within the
WebView. Only390/430cube PNGs are recaptured; thirty valid originals are retained
with per-image provenance. No product runtime changes or failed-app retry.

Current native correction: the direct-install run completed the320dp profile,
then failed at390dp. Fixed diagnostic breadcrumbs show a valid child taking
32.911seconds, beyond the old30second budget. The host now starts a bounded
60second child budget after the trusted root is verified and before configure
IPC; document loading remains30seconds. Ready/actor/origin/nonce authority is
unchanged. Ten deadline tests and80 learning/module tests pass, including the
35second RED-to-GREEN regression. See bootstrap-deadline-regression.json.
This changes one native runtime file; the previous170-file equivalence receipt
does not certify this corrected APK. Rebuild, full host checks and affected real
Android WebView/production captures are required before app can advance.

Latest run: CI42075633834 / source2daa280 passed the corrected real-Android Solo
case in19seconds, plus teardown. Its workflow remains failed: normal-main module
startup showed a real unavailable state before any canonical canvas appeared.
The three genuine Settings/Home/Hub captures are retained; they do not satisfy
the32capture gate. No app fast-forward is authorized by this result.

The next diagnostic uses the same hash-verified normal APK installed/launched
directly through ADB, without rebuilding or rerunning passed functional tests.
It records restricted Flutter/Chromium output and read-only whitelisted host
failure fields, without evaluating expressions or exposing a VM authentication
URI. The current unavailable copy now fails capture immediately. Product runtime
files remain identical to245f9ee; the exact bootstrap cause is still unproven.

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


## Direct VM transport and pre-driver watchdog

The efc312 full run passed host/canonical checks and both APK builds, then the
Flutter tool retried refused VM connections before invoking the external driver.
That interval was outside the driver's90s RPC probe. This attempt is not accepted
as Android PASS. The runner now bypasses optional DDS with --no-dds, uses fixed
direct host VM ports8181/8182 and bounds pre-driver startup to180s. A fresh actual
getVersion receipt is required; CLI success without it is rejected. Original
failure exits are preserved, owned process groups are stopped on timeout, and
failed-process PID/forward/crash evidence is retained before app cleanup. No
functional test is retried or waived. Product runtime remains exact efc312.

Independent process-group review also reproduced an orphaned driver after its
leader exited on TERM. The watchdog now waits on the owned group and removes
remaining descendants before normal APK cleanup. The committed regression fails
against the former leader-only cleanup and passes against the corrected helper;
original statuses0/7/125/124 remain unchanged. Both Python runner regression
modules execute in CI before Android builds.


## Child bootstrap isolation (full run still failing)

Full run42053609842 atdeceaaf reached real Android tests after direct VM readiness.
Host488/Node48/Python7, formatter/analyzer and both normal APK builds passed.
The second actor WebView still failed its secure handshake; child telemetry only
reached head, without error or origin/source rejection. Learning device cases
also timed out; these failures remain failures and app is not advanced.

Fixed, non-payload console/validated-message breadcrumbs now distinguish the
preference parser, canonical renderer, access and host bootstrap steps. The
canonical572718-byteHTML remains unchanged. Screenshot platform calls are bounded
and announce start/end so an SDK image-surface stall can be distinguished from a
learning action stall. The optional runtime-bootstrap diagnostic runs the same
combined device cases with SDK image conversion disabled; native production ADB
captures remain a separate mandatory full-gate step. Diagnostic receipts always
have full_publish_gate:false and cannot authorize app publication.


## Reproducible test-owner race and bounded recovery

Diagnostic42061373320 atbbc568 completed25 progress passes (including teardown)
and2 failures. It is not a publication gate. The13-route/model/mode test reached
Studio in3minutes; Undo correctly remained disabled in its guided demonstration.
The fixture now explicitly restores exercise mode before expecting Undo.

The remaining geometry timeout was traced to a second private learningAction
caller in the test, competing with production autosave. The exact generated
wrapper reproduces sequence1being replaced bysequence2 before the production
controller reads its reply. Production sequence/actor guards remain strict.
Android drivers now use the page's existing serialized controller; expected
rejection still requires an invalid result and unchanged model. Back pumps its
real guard and reports an unexpected unsaved-draft dialog, and teardown unmounts
widgets before disposing their dependencies. Independent review found no
blocking issue or weakened authorization/math contract.

Native platform Futures now consume the existing8-second private API phase
budget. A missing response returns unavailable, releases the action queue, never
saves a late callback and keeps the current mode when its checkpoint failed.
Four meaningful controller/SQLite regressions were added; the combined492host
suite passed. The projection guide/exercise contract adds one Node check (50total).

Functional Android tests no longer convert the Flutter surface into a screenshot
image. Full verification still requires the independently installed default-main
APK and32real ADB captures. Those captures require fresh expected XML labels,
non-splash header paint and two stable frames; original PNG bytes are preserved.
The paint guard passed8unit tests and3actual failed-run fixture regressions.
Temporary empty XML cannot become a loaded model or reuse an old hierarchy.


## Targeted Android completion on unchanged runtime

Full245f9ee run42066617435 passed all host/build checks and25actual Android cases.
Only Solo's immediate post-tap game assertion failed; the fixture now waits for
actual native SQLite initialization/start/save and enabled controls. It retains
all R1/R2,selection,attempt,score and reopen assertions. The normal APK rendered
Home/hub correctly after the paint guard; it also loaded the real cube. Capture
failed because screen-wide gesture endpoints crossed the shorter WebView's
bounds, leaving only134px of canvas visible. Fresh XML-derived gutter gestures
retain the200px minimum and will be tested on the device.

The targeted follow-up reuses the hash-verified normal245APK and rejects any
change to170runtime files, avoiding unrelated debug/release rebuilds. Its Solo
case and32captures must pass and be combined with the unchanged baseline's25
Android cases; it cannot publish app on its own. [Gate policy](GATE_POLICY.md)
records this condition and keeps the baseline's failed outcome visible.
