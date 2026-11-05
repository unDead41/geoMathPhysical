"""Bound Flutter-tool startup before its external driver is launched.

A real getVersion receipt from the existing driver is the only startup sentinel.
No app/test is retried and every original nonzero child exit is preserved.
"""
import argparse
import json
import os
import pathlib
import signal
import subprocess
import time


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--readiness', type=pathlib.Path, required=True)
    parser.add_argument('--startup-seconds', type=float, default=180)
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ['--'] else args.command
    if not command or args.startup_seconds <= 0:
        parser.error('Supply a command and a positive startup budget.')
    started_wall = time.time()
    started = time.monotonic()
    process = subprocess.Popen(command, start_new_session=True)
    ready = False

    def stop_child():
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            return
        # The leader can exit while an inherited driver ignores TERM. Wait on
        # the owned group, then remove any survivors even after leader exit.
        grace = time.monotonic() + 10
        while time.monotonic() < grace:
            process.poll()
            try:
                os.killpg(process.pid, 0)
            except ProcessLookupError:
                break
            time.sleep(.05)
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=5)

    def interrupted(number, _frame):
        stop_child()
        raise SystemExit(128 + number)

    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    while True:
        if not ready:
            try:
                ready = (args.readiness.stat().st_mtime >= started_wall
                         and json.loads(args.readiness.read_text()).get('status') == 'ready')
            except (OSError, ValueError):
                pass
        status = process.poll()
        if status is not None:
            if not ready:
                try:
                    ready = (args.readiness.stat().st_mtime >= started_wall
                             and json.loads(args.readiness.read_text()).get('status') == 'ready')
                except (OSError, ValueError):
                    pass
            # A successful CLI exit without the actual driver RPC receipt is
            # not evidence that the Android integration tests ran.
            result = status if status != 0 or ready else 125
            stop_child()
            break
        if not ready and time.monotonic() - started >= args.startup_seconds:
            print('GEOMATH_VM_STARTUP_TIMEOUT: Flutter tool did not reach real '
                  f'driver VM readiness in {args.startup_seconds:g}s.', flush=True)
            stop_child()
            result = 124
            break
        time.sleep(.25)
    result = 128 - result if result < 0 else result
    args.readiness.parent.mkdir(parents=True, exist_ok=True)
    (args.readiness.parent/'vm-startup-watchdog.json').write_text(json.dumps({
        'startup_budget_seconds': args.startup_seconds,
        'driver_rpc_ready': ready, 'exit_code': result,
        'elapsed_seconds': round(time.monotonic() - started, 3),
        'automatic_test_retries': 0,
    }, indent=2)+'\n')
    return result


if __name__ == '__main__':
    raise SystemExit(main())
