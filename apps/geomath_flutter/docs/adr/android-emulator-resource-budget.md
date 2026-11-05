# Android emulator resource budget

The repository is private. Its standard Linux runner has two CPUs and 8 GB RAM,
per the current GitHub-hosted runner reference. The first device configuration
used a Pixel 7 Pro profile at 1440x3120, a 3072 MB guest and software graphics,
while a generated integration listener was compiled with the emulator running.

Run 41963202642 passed all source checks and three Android tests. The report
copy action was hit-testable, but the native clipboard read returned null. The
retained post-test ADB image shows the launcher covered by a System UI ANR.
This proves that emulator instability occurred; it does not prove native window
focus at the exact clipboard call. Android permits ordinary clipboard reads only
with appropriate native focus, so a successful Dart hit test is insufficient.

The test runner now preserves the normal APK, prebuilds the aggregate integration
APK and stops Gradle before boot. The supported Flutter drive adaptor runs that
prebuilt APK, avoiding Flutter test's fresh generated listener compilation while
the guest is live. Both commands run the same four testWidgets; no assertions,
plugin behavior, per-test timeouts or 30-second module deadline are weakened.

The API remains 36. The Pixel 2 profile uses two guest cores and 2048 MB RAM;
ADB sets 720x1280 and density 320, producing a 360x640 dp viewport. The guest is
kept awake and unlocked. This reduces rendering/memory pressure within the
existing runner rather than changing the repository's visibility or runner tier.

The app-flow test performs one copy, waits for its visible completion receipt,
then polls the unmocked clipboard for the exact preview text within the existing
15-second condition budget. It neither primes nor repeats the write. Continuous
ClipboardService/ActivityManager logs, driver screenshots before cleanup and
native focus/power snapshots retain evidence if the environment still fails.

Sources inspected on 5 November 2026:

- https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- https://developer.android.com/reference/android/content/ClipboardManager
- https://github.com/flutter/flutter/blob/3.47.9/packages/flutter_tools/lib/src/commands/drive.dart
- https://github.com/flutter/flutter/blob/3.47.9/packages/flutter_tools/lib/src/test/flutter_platform.dart
- https://github.com/flutter/flutter/blob/3.47.9/packages/integration_test/lib/integration_test_driver.dart
