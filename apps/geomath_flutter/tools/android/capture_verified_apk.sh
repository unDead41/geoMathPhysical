#!/usr/bin/env bash
set -euo pipefail
evidence_dir=docs/handoffs/app-foundation/evidence/android-capture
mkdir -p "$evidence_dir"
trap 'adb shell dumpsys window > "$evidence_dir/window-final.txt"; adb shell dumpsys power > "$evidence_dir/power-final.txt"; adb exec-out screencap -p > "$evidence_dir/last-screen.png"' EXIT
adb shell wm size 720x1280
adb shell wm density 320
adb shell settings put system screen_off_timeout 1800000
adb shell svc power stayon true
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
adb shell cmd connectivity airplane-mode enable
adb shell svc wifi disable
adb shell svc data disable
test "$(adb shell settings get global airplane_mode_on | tr -d '\r')" = '1'
adb install -r "$RUNNER_TEMP/geomath-main-debug.apk"
python3 tools/android/capture_evidence.py --device emulator-5554 --output "$evidence_dir"
sha256sum "$RUNNER_TEMP/geomath-main-debug.apk" > "$evidence_dir/normal-apk.sha256"
