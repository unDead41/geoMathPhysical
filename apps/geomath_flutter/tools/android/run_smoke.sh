#!/usr/bin/env bash
set -euo pipefail

evidence_dir=docs/handoffs/app-foundation/evidence/android
mkdir -p "$evidence_dir"

capture_final_state() {
  smoke_status=$?
  trap - EXIT
  adb shell dumpsys webviewupdate > "$evidence_dir/webview-final.txt" || true
  adb exec-out screencap -p > "$evidence_dir/last-screen.png" || true
  exit "$smoke_status"
}
trap capture_final_state EXIT

flutter devices | tee "$evidence_dir/devices.txt"
adb shell dumpsys webviewupdate | tee "$evidence_dir/webview-initial.txt"
adb shell cmd connectivity airplane-mode enable
adb shell svc wifi disable
adb shell svc data disable
test "$(adb shell settings get global airplane_mode_on | tr -d '\r')" = '1'
flutter test integration_test/foundation_smoke_test.dart -d emulator-5554 \
  2>&1 | tee "$evidence_dir/integration.txt"
flutter run --no-pub --no-resident \
  --use-application-binary="$RUNNER_TEMP/geomath-main-debug.apk" -d emulator-5554 \
  2>&1 | tee "$evidence_dir/run.txt"
python3 tools/android/capture_evidence.py --device emulator-5554 --output "$evidence_dir"
sha256sum "$RUNNER_TEMP/geomath-main-debug.apk" > "$evidence_dir/normal-apk.sha256"
