#!/usr/bin/env bash
set -euo pipefail

# Run from any directory with an already authorized Android emulator/device.
# Usage: bash run_learning_android.sh <adb-serial> [output-directory]
# LEARNING_VISUAL_MATRIX=true captures every route in BM/EN, light/dark,
# standard100%/strongcontrast150%. Repeat on a tablet emulator for that receipt.
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
app_dir=$(cd -- "$script_dir/../../../.." && pwd)
device=${1:?Supply the Android adb serial (flutter devices / adb devices).}
output=${2:-"$app_dir/build/learning-evidence/$(date -u +%Y%m%dT%H%M%SZ)"}
mkdir -p -- "$output"
output=$(cd -- "$output" && pwd)
export LEARNING_EVIDENCE_DIR="$output"
cd -- "$app_dir"

for executable in flutter adb python3; do
  command -v "$executable" >/dev/null || { echo "Missing required executable: $executable" >&2; exit 2; }
done
adb -s "$device" get-state >"$output/adb-state.txt"
flutter --version --machine >"$output/flutter-version.json"
python3 - "$output/flutter-version.json" <<'PY'
import json, sys
version = json.load(open(sys.argv[1]))
if version.get('frameworkVersion') != '3.47.9' or version.get('dartSdkVersion', '').split()[0] != '3.13.7':
    raise SystemExit('This project requires Flutter 3.47.9 / Dart 3.13.7.')
PY
adb -s "$device" shell settings get global airplane_mode_on >"$output/airplane-mode.txt"
if [[ $(tr -d '\r\n' <"$output/airplane-mode.txt") != 1 ]]; then
  echo 'Prepare an offline emulator (airplane mode on) before this evidence run.' >&2
  exit 2
fi
adb -s "$device" shell settings get global wifi_on >"$output/wifi-state.txt"
if [[ $(tr -d '\r\n' <"$output/wifi-state.txt") != 0 ]]; then
  echo 'Disable Wi-Fi on the evidence emulator before this offline run.' >&2
  exit 2
fi
adb -s "$device" shell getprop ro.build.version.release >"$output/android-version.txt"
adb -s "$device" shell getprop ro.product.model >"$output/android-model.txt"
adb -s "$device" shell getprop ro.product.cpu.abi >"$output/android-abi.txt"
adb -s "$device" shell wm size >"$output/android-size.txt"
adb -s "$device" shell wm density >"$output/android-density.txt"
adb -s "$device" shell dumpsys webviewupdate >"$output/android-webview.txt"
git rev-parse HEAD >"$output/source-commit.txt"
git status --porcelain >"$output/source-status.txt"

case $(tr -d '\r\n' <"$output/android-abi.txt") in
  x86_64) target_platform=android-x64 ;;
  arm64-v8a) target_platform=android-arm64 ;;
  armeabi-v7a) target_platform=android-arm ;;
  *) echo 'Unsupported evidence device ABI.' >&2; exit 2 ;;
esac

run_logged() {
  local name=$1
  shift
  printf '%q ' "$@" >"$output/$name.command"
  printf '\n' >>"$output/$name.command"
  set +e
  "$@" 2>&1 | tee "$output/$name.log"
  local result=${PIPESTATUS[0]}
  set -e
  printf '%s\n' "$result" >"$output/$name.exit"
  return "$result"
}

run_logged pub-get flutter pub get
run_logged learning-preview-build flutter build apk --debug --target-platform "$target_platform" -t lib/dev/learning_main.dart
cp -- build/app/outputs/flutter-apk/app-debug.apk "$output/learning-preview-debug.apk"
run_logged learning-integration-build flutter build apk --debug --target-platform "$target_platform" -t integration_test/learning_acceptance_test.dart --dart-define=LEARNING_SCREENSHOTS=true --dart-define="LEARNING_VISUAL_MATRIX=${LEARNING_VISUAL_MATRIX:-false}"
cp -- build/app/outputs/flutter-apk/app-debug.apk "$output/learning-integration-debug.apk"
run_logged learning-integration-drive flutter drive --no-pub --driver=docs/handoffs/app-learning/evidence/learning_driver.dart --target=integration_test/learning_acceptance_test.dart --use-application-binary="$output/learning-integration-debug.apk" -d "$device" --dart-define=LEARNING_SCREENSHOTS=true --dart-define="LEARNING_VISUAL_MATRIX=${LEARNING_VISUAL_MATRIX:-false}"
run_logged learning-preview-launch flutter run --no-pub --no-resident -t lib/dev/learning_main.dart --use-application-binary="$output/learning-preview-debug.apk" -d "$device"
adb -s "$device" exec-out screencap -p >"$output/learning-preview-launch.png"

python3 - "$output" <<'PY'
import hashlib, json, pathlib, sys
root = pathlib.Path(sys.argv[1])
files = []
for path in sorted(root.iterdir()):
    if path.is_file() and path.name != 'runtime-result.json':
        data = path.read_bytes()
        files.append({'path': path.name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
result = {'schemaVersion': 1, 'scope': 'learning-preview-and-real-Android-WebView',
          'sourceCommit': (root/'source-commit.txt').read_text().strip(),
          'sourceDirty': bool((root/'source-status.txt').read_text().strip()),
          'offlinePreparation': {'airplaneMode': '1', 'wifiEnabled': '0'},
          'commands': {p.stem: int(p.read_text()) for p in root.glob('*.exit')},
          'files': files,
          'manualVisualAndAccessibilityReview': 'PENDING'}
(root/'runtime-result.json').write_text(json.dumps(result, indent=2)+'\n')
PY
printf 'Learning runtime evidence written to %s\n' "$output"
