# Android integration evidence preparation

Status at worker handoff: prepared; integrated Android execution is pending.
The lead's final integration handoff and exact CI receipts supersede this note.

The host initially had zero available disk bytes. `/proc` inspection found no
running Java, Gradle, Flutter, Dart or emulator process and no open file descriptors
under either nominated cache. With lead coordination, only these regenerable,
unused locations were removed:

- `/workspace/scratch/7395917c0f68/toolchains/android-sdk/.temp`
- `/workspace/scratch/2c9458ca3d01/gradle-clean/caches/9.3.1/transforms`

The readback then reported 6,029,099,008 available bytes. Source files, APKs,
previous evidence, persistent AVD data and other chat worktrees were retained.

Actual executable checks reported Dart 3.13.7, Java 17.0.20 and ADB 37.0.1.
`/dev/kvm` is absent. The existing local software emulator history had boot
stall/segfault failures; no local device PASS is inferred. The already verified
foundation CI uses a GitHub-hosted API35 x86_64 emulator with KVM and is the
recommended environment for the integrated test run.

## Integration workflow contract

Build the normal production main APK first and preserve it as
`$RUNNER_TEMP/geomath-main-debug.apk`. Build the combined
`integration_test/integration_smoke_test.dart` as an Android x64 debug APK and
preserve it as `$RUNNER_TEMP/geomath-integration-debug.apk`. Compile the latter
with `--dart-define=LEARNING_SCREENSHOTS=true` to retain the learning suite's
actual Android screenshots. `LEARNING_VISUAL_MATRIX=true` additionally exercises
the expanded learning language/theme/contrast presentation matrix.

The combined runner may alias-import each existing suite's `main()` function;
repeated `IntegrationTestWidgetsFlutterBinding.ensureInitialized()` calls reuse
the singleton binding. Suite fixtures remain explicitly labelled and must not be
reported as live hosted Auth, classroom or two-client Duel proof.

Run from `apps/geomath_flutter` on the authorized CI emulator:

```sh
bash tools/android/run_integration_smoke.sh
```

The script establishes offline mode, records toolchain/source/plugin evidence,
drives the combined real-plugin suite, installs and launches the separately
preserved normal APK, then calls `capture_integration.py`. The screenshot driver
validates PNG headers, confines filenames, writes PNGs and retains response
metadata without duplicating the screenshot bytes into JSON.

Production captures operate the real Android UI through ADB, including settings,
five destinations and the canonical WebView cube. They cover representative
320/390/430/768dp profiles, both languages, light/dark/high-contrast themes,
100/125/150% text and reduced motion. A missing control, failed module or invisible
canvas fails the script; no replacement screen is rendered. Each capture has a
SHA256 receipt and XML hierarchy. These captures still need visual review and do
not establish a manual TalkBack or physical-phone result.

## Worker verification performed

- `flutter pub get --offline`: exit0.
- `dart analyze test_driver/integration_evidence_driver.dart`: exit0, no issues.
- `dart format --output=none --set-exit-if-changed test_driver/integration_evidence_driver.dart`: exit0.
- `python3 -m py_compile tools/android/capture_integration.py`: exit0.
- `bash -n tools/android/run_integration_smoke.sh`: exit0.

These checks validate the prepared tooling, not an Android run. Final integrated
APK hashes, emulator execution, captured screenshots and remaining hosted gates
must be read from the lead's actual run receipts.
