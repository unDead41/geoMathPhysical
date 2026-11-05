"""Wait for actual boot/package/window readiness; never manufacture a PASS."""
import argparse
import json
import pathlib
import subprocess
import time


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--device', required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    deadline = time.monotonic() + 90
    state = {'status': 'failed'}
    while time.monotonic() < deadline:
        try:
            def adb(*parts):
                return subprocess.check_output(['adb', '-s', args.device, *parts],
                    timeout=8).decode(errors='replace')
            boot = adb('shell', 'getprop', 'sys.boot_completed').strip()
            packages = adb('shell', 'cmd', 'package', 'list', 'packages', 'com.android.systemui')
            window = adb('shell', 'dumpsys', 'window')
            (args.output/'window-before-tests.txt').write_text(window)
            focus = next((line.strip() for line in window.splitlines() if 'mCurrentFocus=' in line), '')
            state = {'status': 'failed', 'boot_completed': boot, 'focus': focus,
                     'package_manager_ready': 'com.android.systemui' in packages}
            if (boot == '1' and state['package_manager_ready'] and focus
                    and not focus.endswith('=null') and 'Not Responding' not in focus):
                state['status'] = 'ready'
                break
        except subprocess.SubprocessError as error:
            state = {'status': 'failed', 'error_type': type(error).__name__}
        time.sleep(2)
    (args.output/'device-readiness.json').write_text(json.dumps(state, indent=2)+'\n')
    print(json.dumps(state))
    if state['status'] != 'ready':
        raise SystemExit('Android boot/package/window readiness failed within90s.')


if __name__ == '__main__':
    main()
