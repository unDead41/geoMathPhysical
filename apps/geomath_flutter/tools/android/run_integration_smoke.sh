#!/usr/bin/env bash
set -euo pipefail

# CI prebuilds both APKs before starting the emulator so Gradle and the Android
# device do not compete for memory. Only the final normal APK is user-deliverable.
device=${GEOMATH_ANDROID_DEVICE:-emulator-5554}
evidence_dir=${GEOMATH_ANDROID_EVIDENCE:-docs/handoffs/app-integration/evidence/android}
mkdir -p "$evidence_dir"
evidence_dir=$(cd -- "$evidence_dir" && pwd)
export GEOMATH_ANDROID_EVIDENCE="$evidence_dir"
normal_apk=${GEOMATH_NORMAL_APK:-${RUNNER_TEMP:?Set RUNNER_TEMP or GEOMATH_NORMAL_APK}/geomath-main-debug.apk}
test_apk=${GEOMATH_TEST_APK:-${RUNNER_TEMP:?Set RUNNER_TEMP or GEOMATH_TEST_APK}/geomath-integration-debug.apk}
test -s "$normal_apk"
test -s "$test_apk"
log_pid=''

final_state() {
  status=$?
  trap - EXIT
  if [[ -n "$log_pid" ]]; then
    kill "$log_pid" 2>/dev/null || true
    wait "$log_pid" 2>/dev/null || true
  fi
  adb -s "$device" shell dumpsys webviewupdate > "$evidence_dir/webview-final.txt" || true
  adb -s "$device" shell dumpsys window > "$evidence_dir/window-final.txt" || true
  adb -s "$device" exec-out screencap -p > "$evidence_dir/last-screen.png" || true
  printf '%s\n' "$status" > "$evidence_dir/run.exit"
  exit "$status"
}
trap final_state EXIT

flutter devices | tee "$evidence_dir/devices.txt"
flutter --version --machine > "$evidence_dir/flutter-version.json"
git rev-parse HEAD > "$evidence_dir/source-commit.txt"
git status --porcelain > "$evidence_dir/source-status.txt"
adb -s "$device" get-state
adb -s "$device" shell wm size 780x1688
adb -s "$device" shell wm density 320
adb -s "$device" shell settings put system screen_off_timeout 1800000
adb -s "$device" shell svc power stayon true
adb -s "$device" shell input keyevent KEYCODE_WAKEUP
adb -s "$device" shell wm dismiss-keyguard
adb -s "$device" shell dumpsys webviewupdate > "$evidence_dir/webview-initial.txt"
adb -s "$device" logcat -v threadtime AndroidRuntime:E ActivityManager:W ActivityTaskManager:W '*:S' > "$evidence_dir/native-services.txt" &
log_pid=$!
# This job proves offline behaviour. Scripted server tests inside the test APK
# retain their fixture labels and cannot be used as hosted service acceptance.
adb -s "$device" shell cmd connectivity airplane-mode enable
adb -s "$device" shell svc wifi disable
adb -s "$device" shell svc data disable
test "$(adb -s "$device" shell settings get global airplane_mode_on | tr -d '\r')" = '1'
adb -s "$device" shell dumpsys window > "$evidence_dir/window-before-tests.txt"
python3 - "$evidence_dir/window-before-tests.txt" <<'PY'
import pathlib,sys
text=pathlib.Path(sys.argv[1]).read_text()
focus=next((line.strip() for line in text.splitlines() if 'mCurrentFocus=' in line),'')
if 'Not Responding' in focus:
    raise SystemExit('System ANR owns Android input before the test suite: '+focus)
print('Android focus before tests: '+focus)
PY
sha256sum "$test_apk" > "$evidence_dir/integration-apk.sha256"
flutter drive --no-pub --driver=test_driver/integration_evidence_driver.dart \
  --target=integration_test/integration_smoke_test.dart \
  --use-application-binary="$test_apk" \
  --keep-app-running -d "$device" \
  2>&1 | tee "$evidence_dir/integration.txt"
# A successful test-runner APK is not proof the production main boots. Remove
# its isolated records, install the preserved normal APK and run that entrypoint.
adb -s "$device" shell am force-stop com.geomath.dev
adb -s "$device" shell pm clear com.geomath.dev
flutter run --no-pub --no-resident --use-application-binary="$normal_apk" -d "$device" \
  2>&1 | tee "$evidence_dir/run-normal.txt"
python3 tools/android/capture_integration.py --device "$device" --output "$evidence_dir"
sha256sum "$normal_apk" > "$evidence_dir/normal-apk.sha256"
python3 - "$evidence_dir" <<'PY'
import hashlib,json,pathlib,sys
root=pathlib.Path(sys.argv[1])
items=[{'path':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
       for p in sorted(root.glob('*')) if p.is_file() and p.name!='runtime-result.json']
(root/'runtime-result.json').write_text(json.dumps({
    'schema_version':1,'source_commit':(root/'source-commit.txt').read_text().strip(),
    'scope':'integrated normal Android APK and native-plugin integration tests',
    'offline':True,'hosted_services':'not verified by this offline fixture run',
    'physical_phone':'not tested','manual_talkback_and_visual_review':'pending',
    'files':items},indent=2)+'\n')
PY
