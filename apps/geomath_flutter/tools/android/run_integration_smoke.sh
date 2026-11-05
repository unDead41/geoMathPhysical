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
suite=${GEOMATH_ANDROID_SUITE:-full}
case "$suite" in
  full)
    integration_target=integration_test/integration_smoke_test.dart
    drive_timeout=28m
    test -s "$normal_apk"
    ;;
  module-spike)
    integration_target=integration_test/module_spike_test.dart
    drive_timeout=12m
    ;;
  runtime-bootstrap)
    integration_target=integration_test/integration_smoke_test.dart
    drive_timeout=15m
    ;;
  solo-followup)
    integration_target=integration_test/solo_reopen_test.dart
    drive_timeout=8m
    test -s "$normal_apk"
    ;;
  *) echo 'Unsupported diagnostic suite' >&2; exit 2 ;;
esac
test -s "$test_apk"
log_pid=''

final_state() {
  status=$?
  trap - EXIT
  if [[ -n "$log_pid" ]]; then
    kill "$log_pid" 2>/dev/null || true
    wait "$log_pid" 2>/dev/null || true
  fi
  timeout 12s adb -s "$device" shell dumpsys webviewupdate > "$evidence_dir/webview-final.txt" || true
  timeout 12s adb -s "$device" shell dumpsys window > "$evidence_dir/window-final.txt" || true
  timeout 12s adb -s "$device" exec-out screencap -p > "$evidence_dir/last-screen.png" || true
  python3 tools/android/emit_png_evidence.py "$evidence_dir" || true
  timeout 10s adb -s "$device" forward --list > "$evidence_dir/adb-forwards.txt" || true
  timeout 10s adb -s "$device" shell pidof com.geomath.dev > "$evidence_dir/app-pid.txt" || true
  timeout 10s adb -s "$device" shell dumpsys activity activities > "$evidence_dir/activity-final.txt" || true
  timeout 10s adb -s "$device" shell dumpsys meminfo com.geomath.dev > "$evidence_dir/app-memory-final.txt" || true
  timeout 10s adb -s "$device" logcat -d -b crash > "$evidence_dir/crash-final.txt" || true
  if [[ "$status" != 0 ]]; then
    for diagnostic in app-pid.txt adb-forwards.txt crash-final.txt; do
      echo "Android diagnostic: $diagnostic"
      tail -n 60 "$evidence_dir/$diagnostic" || true
    done
  fi
  printf '%s\n' "$status" > "$evidence_dir/run.exit"
  exit "$status"
}
trap final_state EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

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
# Boot-completed alone does not establish a responsive Android window.
adb -s "$device" shell input keyevent KEYCODE_HOME
python3 tools/android/verify_device_ready.py --device "$device" --output "$evidence_dir"
sha256sum "$test_apk" > "$evidence_dir/integration-apk.sha256"
# Preserve the test exit status while also collecting the independent normal
# application's actual screenshots. A failed suite still fails the job.
# DDS otherwise redirects a requested host port to DDS while forwarding the
# device VM on another random port. Use the actual direct VM endpoint in CI.
adb -s "$device" forward --remove tcp:8181 2>/dev/null || true
python3 - <<'PORT_PY'
import socket
with socket.socket() as probe:
    probe.bind(('127.0.0.1', 8181))
PORT_PY
set +e
timeout --foreground --signal=TERM --kill-after=15s "$drive_timeout" \
  python3 tools/android/run_drive_bounded.py \
  --readiness "$evidence_dir/vm-service-readiness.json" --startup-seconds 180 -- \
  flutter drive --no-dds --host-vmservice-port=8181 --no-pub --driver=test_driver/integration_evidence_driver.dart \
  --target="$integration_target" \
  --use-application-binary="$test_apk" \
  --keep-app-running -d "$device" \
  2>&1 | tee "$evidence_dir/integration.txt"
integration_status=${PIPESTATUS[0]}
set -e
export GEOMATH_INTEGRATION_STATUS="$integration_status"
export GEOMATH_ANDROID_SUITE="$suite"
if [[ "$integration_status" != 0 ]]; then
  # Preserve the failed test process before normal-APK cleanup can replace it.
  timeout 6s adb -s "$device" shell pidof com.geomath.dev > "$evidence_dir/test-failure-pid.txt" || true
  timeout 6s adb -s "$device" forward --list > "$evidence_dir/test-failure-forwards.txt" || true
  timeout 6s adb -s "$device" logcat -d -b crash > "$evidence_dir/test-failure-crash.txt" || true
  timeout 6s adb -s "$device" shell dumpsys meminfo com.geomath.dev > "$evidence_dir/test-failure-memory.txt" || true
  for diagnostic in test-failure-pid.txt test-failure-forwards.txt test-failure-crash.txt; do
    echo "Failed-test diagnostic: $diagnostic"
    tail -n 60 "$evidence_dir/$diagnostic" || true
  done
fi
if [[ "$suite" != full && "$suite" != solo-followup ]]; then
  export GEOMATH_DIAGNOSTIC_SUITE="$suite"
  python3 - "$evidence_dir" <<'DIAGNOSTIC_PY'
import json,os,pathlib,sys
root=pathlib.Path(sys.argv[1])
(root/'diagnostic-result.json').write_text(json.dumps({
    'schema_version':1,'scope':'diagnostic-only','full_publish_gate':False,
    'suite':os.environ['GEOMATH_DIAGNOSTIC_SUITE'],
    'source_commit':(root/'source-commit.txt').read_text().strip(),
    'integration_exit_code':int(os.environ['GEOMATH_INTEGRATION_STATUS']),
    'normal_production_apk_tested':False,'complete_app_acceptance':False,
},indent=2)+'\n')
DIAGNOSTIC_PY
  echo "Diagnostic-only $suite finished with exit $integration_status; full app acceptance was not run."
  exit "$integration_status"
fi
# A successful test-runner APK is not proof the production main boots. Remove
# its isolated records, install the preserved normal APK and run that entrypoint.
adb -s "$device" shell am force-stop com.geomath.dev
adb -s "$device" shell pm clear com.geomath.dev
if [[ "$suite" == solo-followup ]]; then
  # The disposable test APK can have the current runner's debug certificate.
  # The hash-verified normal APK retains the earlier build's certificate.
  adb -s "$device" uninstall com.geomath.dev
fi
timeout --foreground --signal=TERM --kill-after=15s 3m flutter run --no-dds --host-vmservice-port=8182 --no-pub --no-resident --use-application-binary="$normal_apk" -d "$device" \
  2>&1 | tee "$evidence_dir/run-normal.txt"
python3 tools/android/capture_integration.py --device "$device" --output "$evidence_dir"
sha256sum "$normal_apk" > "$evidence_dir/normal-apk.sha256"
python3 - "$evidence_dir" <<'PY'
import hashlib,json,os,pathlib,sys
root=pathlib.Path(sys.argv[1])
items=[{'path':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
       for p in sorted(root.glob('*')) if p.is_file() and p.name!='runtime-result.json']
(root/'runtime-result.json').write_text(json.dumps({
    'schema_version':1,'source_commit':(root/'source-commit.txt').read_text().strip(),
    'scope':'integrated normal Android APK and native-plugin integration tests',
    'suite':os.environ['GEOMATH_ANDROID_SUITE'],
    'full_publish_gate':os.environ['GEOMATH_ANDROID_SUITE']=='full',
    'integration_exit_code':int(os.environ['GEOMATH_INTEGRATION_STATUS']),
    'offline':True,'hosted_services':'not verified by this offline fixture run',
    'physical_phone':'not tested','manual_talkback_and_visual_review':'pending',
    'files':items},indent=2)+'\n')
PY

exit "$integration_status"
