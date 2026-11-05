# Learning verification evidence

Flutter 3.47.9 / Dart 3.13.7 host checks and the universal learning preview APK
build have passed. Device execution, screenshots and manual accessibility review remain
pending. See [verification-result.json](verification-result.json) and the complete
[build input receipt](learning-preview-build.json) for the precise scope and hashes.

| Check | Actual result |
|---|---|
| Formatter | All109 Dart files unchanged |
| Flutter analyzer | PASS; no issues |
| All Flutter unit/widget tests |139/139 PASS |
| Learning feature unit/widget tests |47/47 PASS |
| Canonical source suite/build/check |341/341 PASS; canonical HTML unchanged |
| Node source/bridge/geometry/surface checks |45/45 PASS |
| Dart–JavaScript checkpoint corpus |25/25 cases PASS |
| `lib/dev/learning_main.dart` universal debug APK | PASS; ARM64/ARMv7/x86_64; ZIP CRC and v2 signature |
| Separate x86_64 preview build | PASS;120 runtime inputs verified |
| Learning integration tests on Android | NOT RUN |
| Phone/tablet screenshots, TalkBack, physical gestures | NOT RUN |

The separate x86_64 build receipt verifies120 runtime input files against the source
snapshot and lists the single controller overlay above its published base.
`runtimeInputSha256` identifies the exact compiled inputs independently of later
documentation commits. The ZIP contains the same module submanifest as the source.
Both APKs use the learning contribution through its actual preview entry. The
[universal APK receipt](resume-20261105/apk.json) records all three Flutter engine
ABIs, full ZIP CRC, current packaged assets and the v2 signature. The ordinary
foundation-main APK is a separate build. ARM runtime execution remains unverified.

## Corrections verified during resume

- Source navigation captures the freshest origin synchronously, including typing
  after the last native poll. Native saves/restores that origin before pushing a
  destination seed; failed persistence retains the live draft for another save.
- Foreground initialization waits while covered/backgrounded; actual initialization
  failures expose Reopen. Actor and route checks still guard callbacks.
- Manifest metadata and each runtime byte source fail closed on damage. Canonical
  HTML digest metadata must agree with its file entry; capability/version fields
  must match native support.
- Widget fixtures create their future-owning ports inside the widget test zone;
  semantics handles dispose before Flutter's end-of-test invariant. Labels are
  asserted against the actual shared localization and merged card semantics.

The shared reader/writer and SQLite repository are exercised directly, including
EX11 acknowledgement failure and retry. No successful platform plugin or WebView
is substituted by these host tests. Four Android integration cases are authored
in `integration_test/learning_acceptance_test.dart`; they are still unexecuted.

## Required shared navigation correction

`GeoMathRouter.select` resets the route without awaiting the contributed leave
guard. The integrator must apply BackPolicy before bottom-destination reset,
including storage-failure Stay/Leave. This shared router is outside feature
ownership; the exact request is recorded in the [integration request](../../../integration_requests/app-learning.json).
An immediate bottom navigation after editing can otherwise skip the last save.

## Android runtime gate

A real API35 x86_64 emulator was attempted. Its userdata allocation requires
7372.80MB free space; the last attempt had3173.76MB available. `/dev/kvm` is absent.
A separate software-rendered emulator attempt also stopped before boot with a
segmentation fault. [Blocker details](resume-20261105/android-blocker.txt) record
that attempt; no app screenshot,
boot or device PASS is claimed. Earlier Gradle lock/JRE failures were resolved
using an isolated source/build snapshot, a complete JDK17 and a dedicated cache.

The existing hosted workflow runs host checks, builds default main and runs
`foundation_smoke_test.dart`. It does not execute the learning integration target
or the preview. The integrator owns shared workflow updates; this feature does
not add hidden build/device side effects to unit tests.

On an offline Android emulator/device with sufficient capacity:

```sh
cd apps/geomath_flutter
flutter pub get
flutter analyze
flutter test test/features/learning
flutter build apk --debug -t lib/dev/learning_main.dart
flutter run -t lib/dev/learning_main.dart -d <device-id>
bash docs/handoffs/app-learning/evidence/run_learning_android.sh <device-id>
```

The runner checks the exact SDK, records device/WebView/source status, builds the
preview and integration targets, executes the real WebView suite, and captures
actual app output under ignored `build/learning-evidence/`. Turn airplane mode on
and Wi-Fi off before running. Set `LEARNING_VISUAL_MATRIX=true` for all13 routes
in BM/EN × light/dark × standard100%/strongcontrast150%; repeat on a tablet.
Its screenshot driver is `learning_driver.dart`. Inspect every command exit/log;
partial output does not count as a successful runtime receipt.

| Screen ID | Route | Code | Device evidence |
|---|---|---|---|
|25|`/learn/explore`|Implemented|PENDING|
|26|`/learn/views`|Implemented|PENDING|
|27|`/learn/notes/:shapeId`|Implemented|PENDING|
|28|`/learn/calculator/:shapeId`|Implemented|PENDING|
|29|`/learn/labs/net`|Implemented|PENDING|
|30|`/learn/labs/volume`|Implemented|PENDING|
|31|`/learn/labs/area`|Implemented|PENDING|
|32|`/learn/labs/composite`|Implemented|PENDING|
|33|`/learn/labs`|Implemented|PENDING|
|34|`/learn/projection`|Implemented|PENDING|
|35|`/learn/calculation`|Implemented|PENDING|
|36|`/learn/records`|Implemented|PENDING|
|41|`/learn`|Implemented|PENDING|

Keep the native SOR L01–L08/U02 gate open until actual learning device receipts:
check all11 models; stable face colors through rotate/fold/six views; curved
surfaces and unavailable sphere nets; cube a=4cm gives96cm²/64cm³; all units/π;
all lab stages/modes and valid/invalid reflections; projection both scales and
inclusive0.06cm tolerance; parser malicious/oversized inputs; stale module/actor
switch; storage failure/retry; asset corruption; checkpoint reopen/system Back.

Manual review must also cover keyboard reachability, tap alternatives, drag/
draw/rotate/scroll arbitration, TalkBack focus/labels, reduced motion, background
silence and125% text. Source parity alone does not verify these device gestures.

The historical [authoring receipt](authoring-verification-result.json) and
`runtime-probes/` retain the earlier SDK-absent observations. Those are historical
workspace observations; the current host/build results above supersede them.
