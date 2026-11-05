# Learning verification, 2026-11-05

This checkpoint adds executable acceptance tests and an Android evidence runner. **It does not contain a learning APK, a completed Flutter test run, or device screenshots.** See `verification-result.json` for commands actually executed and their log hashes.

The foundation gate is READY at `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e`. Its successful CI run `41973098124` proves the foundation smoke suite and default app. It does not prove the Prompt 2 contribution or `lib/dev/learning_main.dart`. The canonical content remains source `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`, Digital 2.9.1, module 1.6.2.

## What is authored

| Target | Meaningful checks | Execution here |
|---|---|---|
| `test/features/learning/acceptance/feature_acceptance_test.dart` | All 13 contributed routes; bilingual namespace completeness; actual shared SQLite record DTO; guest/account isolation; EX11 delayed persistence failure with no saved notice before acknowledgement; retry saves the same draft through the real shared writer | NOT RUN |
| `test/features/learning/acceptance/bundled_assets_acceptance_test.dart` | Actual installed manifest/source pin; cold verification by a fresh repository; every listed runtime file missing and corrupt independently; later healthy verification | NOT RUN |
| `integration_test/learning_acceptance_test.dart` | Production `learningFeature()` plus real Android WebView; 13 routes; 11 models in explorer/notes/calculator; six views; all 12 lab modes; unavailable hemisphere net; cube/cuboid stable palette after rotation/folding; seven projection projects, 1:2 restore and Undo; BM/EN/light/dark/contrast/150% preserve native instance and pose; lifecycle adapter; system Back checkpoint acknowledgement and reopening; malformed/wrong-nonce/owner-bearing/oversized native messages; shared SQLite reopen and actor partitioning | NOT RUN |

The record tests use the frozen `FormativeRecordReader`/`FormativeRecordWriter`, not a second reflection table. The EX11 seam faults one writer acknowledgement; its retry delegates to actual shared SQLite. The Android test does not replace a WebView, controller, native bridge, lifecycle owner, or asset verifier. It calls the production wrapper's bounded private action API; it cannot choose an owner or supply a bridge capability.

Worker 1 owns the exact source/origin/capability/replay/sequence tests and canonical math parity tests. Those checks are complementary. An unchanged checkpoint after a rejected injected message alone is not proof of every bridge invariant. Worker 5 owns the checkpoint repository's SQL/schema/failure tests. Do not add historical source test counts to new native test counts or infer a native pass from JavaScript source tests.

## Runtime blocker and actual local checks

The retained Dart 3.13.7 binary can parse and format the test sources. No Flutter or adb executable is on PATH, Android SDK variables are unset, and `/dev/kvm` is absent. The previously installed Flutter directory is no longer present.

On 2026-11-05, the correct official pinned SDK archive URL returned HTTP 404 (`curl` exit 22):

`https://storage.googleapis.com/flutter_infra_release/flutter/releases/stable/linux/flutter_linux_3.47.9-stable.tar.xz`

The official Linux release manifest also returned HTTP 404 during the initial lookup. By contrast, a HEAD request to Google's Android command-line tools archive returned HTTP 200 (exit 0). These are endpoint observations from this workspace; they do not establish global SDK unavailability. No substitute Flutter version was installed, and Android tools alone would not run the pinned feature tests. Exact commands, time, response and hashes for the two retained probes are in `runtime-probes/`.

Dart format and Bash syntax checks are recorded separately from Flutter analysis or tests. The formatter warns that `package:flutter_lints/flutter.yaml` cannot resolve without the Flutter dependency environment. Formatting is not type analysis.

## Run the feature preview and native suite

After all worker contributions are integrated, use Flutter 3.47.9 / Dart 3.13.7 and an Android emulator/device. The normal project checks remain:

```sh
dart format --output=none --set-exit-if-changed lib test integration_test test_driver
flutter analyze
flutter test test/features/learning
flutter build apk --debug -t lib/dev/learning_main.dart
flutter run -t lib/dev/learning_main.dart -d <android-device-id>
```

For reproducible native evidence, prepare an isolated offline Android emulator: airplane mode on, Wi-Fi off. The helper checks these states and does not change device preferences. From the app directory:

```sh
bash docs/handoffs/app-learning/evidence/run_learning_android.sh emulator-5554
LEARNING_VISUAL_MATRIX=true bash docs/handoffs/app-learning/evidence/run_learning_android.sh emulator-5556
```

The helper validates the SDK pin, records the source revision/dirty state, Android version/model/ABI/size/density/WebView, builds the **learning preview entry point**, builds the separate learning integration APK, runs the real WebView suite through the host screenshot driver, then launches the actual learning preview APK and captures its screen. Commands, exit codes, APK hashes, logs and screenshots are written under the ignored app `build/learning-evidence/` directory by default. A successful helper receipt still leaves manual visual/accessibility review pending. If a command fails, inspect its `.exit` and `.log`; do not treat partially written output as a successful receipt.

Screenshots use Flutter's documented Android surface conversion and extended integration driver. A reviewer must inspect whether platform view pixels are present. A PNG's existence does not establish correct WebView composition or visual parity. The final `adb` capture independently records the preview's actual Android window.

The existing `.github/workflows/geomath-flutter.yml` automatically runs host format/analyze/test on `app-learning`, but its emulator target is `foundation_smoke_test.dart` and its ordinary build is the default main entry point. P4 must explicitly run the learning target/preview to supply learning evidence. This worker does not edit the shared workflow or execute builds as side effects of unit tests.

## Screen and manual acceptance receipt

| Screen | Route | Automated native target | Visual/device result |
|---|---|---|---|
| 25 | `/learn/explore` | Authored | PENDING |
| 26 | `/learn/views` | Authored | PENDING |
| 27 | `/learn/notes/:shapeId` | Authored | PENDING |
| 28 | `/learn/calculator/:shapeId` | Authored | PENDING |
| 29 | `/learn/labs/net` | Authored | PENDING |
| 30 | `/learn/labs/volume` | Authored | PENDING |
| 31 | `/learn/labs/area` | Authored | PENDING |
| 32 | `/learn/labs/composite` | Authored | PENDING |
| 33 | `/learn/labs` | Authored | PENDING |
| 34 | `/learn/projection` | Authored | PENDING |
| 35 | `/learn/calculation` | Authored | PENDING |
| 36 | `/learn/records` | Authored | PENDING |
| 41 | `/learn` | Authored | PENDING |

For SOR L01–L08/U02, keep the native acceptance gate open until the exact feature source SHA has an actual run receipt. Historical canonical tests and foundation CI are supporting evidence only. The optional visual matrix captures all 13 routes for BM/EN × light/dark × standard100%/strongcontrast150%; run it independently on a phone and tablet. Confirm no clipping, keyboard obstruction, horizontal overflow, lost focus or unreadable model labels. Also check 125% text through the shared preference UI.

The following require actual interaction and must retain separate pass/fail receipts with device/OS/WebView, source SHA and evidence paths:

- Cold install and relaunch without network; every screen works without CDN, service-worker cache or a previous WebView session. Corrupted/missing assets show recovery and never a ready/saved receipt.
- Real TalkBack focus order, labels, headings, selected state and live save/error announcements. Activate controls using TalkBack and the available tap alternatives. A semantics tree or screenshot alone cannot pass this item.
- Touch rotate, pinch/zoom, unfold, page scrolling and projection draw/line/circle/Undo; verify native controls do not steal the canvas gesture, with equivalent tap controls available.
- App-bar and physical/system Back from activities and modal sheets; checkpoint failure offers Stay/Leave; Stay keeps the draft and Leave does not claim persistence. OS background stops audio/motion and foreground/reopen restores allowed state. The deterministic lifecycle adapter test does not pass physical OS backgrounding.
- Complete Ramalkan→Cuba→Semak→Terangkan in all four labs; invalid reflections never complete. Force EX11 from a learning save and retry; display saved only after a durable receipt. Guest/account/epoch changes must not expose the previous actor's drafts or accept an old instance.
- Verify cube a=4 cm gives 96 cm²/64 cm³; π modes, units and all shape formulas match canonical outputs. Check projection 1:1/1:2 and the inclusive 0.06 cm tolerance boundary; run canonical parser malicious/oversized limits. Source-level parity does not establish the native input gesture itself.

No device, screenshot, TalkBack, gesture, learning APK, Flutter analyze or Flutter test result is marked passed in this checkpoint.
