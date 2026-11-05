#!/usr/bin/env bash
set -euo pipefail
device=${GEOMATH_ANDROID_DEVICE:-emulator-5554}
evidence_dir=docs/handoffs/app-integration/evidence/android
mkdir -p "$evidence_dir"
normal_apk=${GEOMATH_NORMAL_APK:?Set the hash-verified normal APK path}
git rev-parse HEAD > "$evidence_dir/source-commit.txt"
git status --porcelain > "$evidence_dir/source-status.txt"
sha256sum "$normal_apk" > "$evidence_dir/normal-apk.sha256"
final_state() {
  status=$?
  trap - EXIT
  if [[ "$status" != 0 ]]; then
    timeout 45s python3 tools/android/inspect_learning_failure.py --device "$device" --output "$evidence_dir/learning-failure-fields.json" || true
  fi
  timeout 12s adb -s "$device" logcat -d -s flutter:I chromium:I AndroidRuntime:E '*:S' > "$evidence_dir/production-debug-internal.txt" || true
  timeout 12s adb -s "$device" shell dumpsys webviewupdate > "$evidence_dir/webview-final.txt" || true
  timeout 12s adb -s "$device" exec-out screencap -p > "$evidence_dir/last-screen.png" || true
  printf '%s\n' "$status" > "$evidence_dir/run.exit"
  exit "$status"
}
trap final_state EXIT
adb -s "$device" shell settings put system screen_off_timeout 1800000
adb -s "$device" shell svc power stayon true
adb -s "$device" shell input keyevent KEYCODE_WAKEUP
adb -s "$device" shell wm dismiss-keyguard
adb -s "$device" shell cmd connectivity airplane-mode enable
adb -s "$device" shell svc wifi disable
adb -s "$device" shell svc data disable
test "$(adb -s "$device" shell settings get global airplane_mode_on | tr -d '\r')" = 1
adb -s "$device" shell input keyevent KEYCODE_HOME
python3 tools/android/verify_device_ready.py --device "$device" --output "$evidence_dir"
adb -s "$device" install -r "$normal_apk"
python3 tools/android/capture_integration.py --device "$device" --output "$evidence_dir"
python3 - "$evidence_dir" <<'PY'
import json,pathlib,sys
p=pathlib.Path(sys.argv[1]);c=json.loads((p/'production-captures.json').read_text())
assert len(c['captures'])==32
(p/'production-only-result.json').write_text(json.dumps({
 'schema_version':1,'source_commit':(p/'source-commit.txt').read_text().strip(),
 'scope':'Normal production APK installed and launched through ADB; no rebuild or app/test retry',
 'full_publish_gate':False,'functional_tests_run_here':False,'production_capture_exit_code':0,
 'captures':32,'offline':True,'normal_apk_sha256':(p/'normal-apk.sha256').read_text().split()[0]
},indent=2)+'\n')
PY
