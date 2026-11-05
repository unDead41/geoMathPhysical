#!/usr/bin/env bash
set -euo pipefail

evidence_dir=docs/handoffs/app-foundation/evidence/android
mkdir -p "$evidence_dir"
native_log_pid=''

capture_final_state() {
  smoke_status=$?
  trap - EXIT
  if [[ -n "$native_log_pid" ]]; then
    kill "$native_log_pid" 2>/dev/null || true
    wait "$native_log_pid" 2>/dev/null || true
  fi
  adb shell dumpsys webviewupdate > "$evidence_dir/webview-final.txt" || true
  adb shell dumpsys window > "$evidence_dir/window-final.txt" || true
  adb shell dumpsys power > "$evidence_dir/power-final.txt" || true
  adb exec-out screencap -p > "$evidence_dir/last-screen.png" || true
  exit "$smoke_status"
}
trap capture_final_state EXIT

flutter devices | tee "$evidence_dir/devices.txt"
adb shell wm size 720x1280
adb shell wm density 320
adb shell settings put system screen_off_timeout 1800000
adb shell svc power stayon true
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
adb shell wm size | tee "$evidence_dir/display.txt"
adb shell wm density >> "$evidence_dir/display.txt"
adb shell dumpsys webviewupdate | tee "$evidence_dir/webview-initial.txt"
adb logcat -v threadtime ClipboardService:I ActivityManager:W ActivityTaskManager:W \
  InputDispatcher:W AndroidRuntime:E '*:S' > "$evidence_dir/native-services.txt" &
native_log_pid=$!
adb shell cmd connectivity airplane-mode enable
adb shell svc wifi disable
adb shell svc data disable
test "$(adb shell settings get global airplane_mode_on | tr -d '\r')" = '1'
adb shell dumpsys window > "$evidence_dir/window-before-tests.txt"
python3 - "$evidence_dir/window-before-tests.txt" <<'PY'
import pathlib, sys
text = pathlib.Path(sys.argv[1]).read_text()
focus = next((line.strip() for line in text.splitlines() if 'mCurrentFocus=' in line), '')
if 'Not Responding' in focus:
    raise SystemExit('Android system ANR owns input focus before the test suite: ' + focus)
print('Native focus before test suite: ' + focus)
PY
sha256sum "$RUNNER_TEMP/geomath-integration-debug.apk" > "$evidence_dir/integration-apk.sha256"
flutter drive --no-pub --driver=test_driver/integration_driver.dart \
  --target=integration_test/foundation_smoke_test.dart \
  --use-application-binary="$RUNNER_TEMP/geomath-integration-debug.apk" \
  --screenshot="$evidence_dir/drive" --keep-app-running -d emulator-5554 \
  2>&1 | tee "$evidence_dir/integration.txt"
adb shell am force-stop com.geomath.dev
flutter run --no-pub --no-resident \
  --use-application-binary="$RUNNER_TEMP/geomath-main-debug.apk" -d emulator-5554 \
  2>&1 | tee "$evidence_dir/run.txt"
python3 tools/android/capture_evidence.py --device emulator-5554 --output "$evidence_dir"
sha256sum "$RUNNER_TEMP/geomath-main-debug.apk" > "$evidence_dir/normal-apk.sha256"
