"""Portable process regression tests for the actual adjacent CI watchdog."""
import json
import os
import pathlib
import signal
import subprocess
import sys
import tempfile
import time
import unittest


HELPER = pathlib.Path(__file__).with_name('run_drive_bounded.py')


@unittest.skipUnless(os.name == 'posix', 'The Android CI watchdog uses POSIX groups.')
class BoundedDriveTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = pathlib.Path(self.directory.name)

    def command(self, readiness, source, budget=2):
        return [sys.executable, str(HELPER), '--readiness', str(readiness),
                '--startup-seconds', str(budget), '--',
                sys.executable, '-c', source]

    def test_success_requires_fresh_receipt_and_failures_are_preserved(self):
        cases = [
            ('fresh-ready', True, 0, False, 0),
            ('original-failure', False, 7, False, 7),
            ('no-receipt', False, 0, False, 125),
            ('startup-timeout', False, 0, True, 124),
        ]
        for name, ready, child_exit, hang, expected in cases:
            with self.subTest(name=name):
                output = self.root / name
                output.mkdir()
                readiness = output / 'readiness.json'
                source = 'import json,pathlib,time,sys; '
                if ready:
                    source += (f'pathlib.Path({str(readiness)!r}).write_text('
                               'json.dumps({"status":"ready"})); ')
                if hang:
                    source += 'time.sleep(120); '
                source += f'sys.exit({child_exit})'
                process = subprocess.run(
                    self.command(readiness, source, budget=.5 if hang else 2),
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                    timeout=15,
                )
                self.assertEqual(process.returncode, expected)
                receipt = json.loads((output / 'vm-startup-watchdog.json').read_text())
                self.assertEqual(receipt['exit_code'], expected)
                self.assertEqual(receipt['driver_rpc_ready'], ready)

    def test_timeout_kills_term_ignoring_descendant_after_leader_exits(self):
        readiness = self.root / 'readiness.json'
        leader_file = self.root / 'leader.pid'
        child_file = self.root / 'descendant.pid'
        heartbeat = self.root / 'heartbeat'
        descendant = (
            'import os,pathlib,signal,time; '
            'signal.signal(signal.SIGTERM,signal.SIG_IGN); '
            f'pathlib.Path({str(child_file)!r}).write_text(str(os.getpid())); '
            f'heartbeat=pathlib.Path({str(heartbeat)!r}); '
            '\nwhile True:\n heartbeat.write_text(str(time.monotonic_ns()))\n time.sleep(.05)\n'
        )
        leader = (
            'import os,pathlib,subprocess,time; '
            f'pathlib.Path({str(leader_file)!r}).write_text(str(os.getpid())); '
            f'subprocess.Popen([{sys.executable!r},"-c",{descendant!r}]); '
            'time.sleep(120)'
        )
        wrapper = None
        try:
            wrapper = subprocess.Popen(
                self.command(readiness, leader, budget=1.5),
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            self.assertEqual(wrapper.wait(timeout=20), 124)
            self.assertTrue(child_file.is_file(), 'The TERM-ignoring descendant must have started.')
            self.assertTrue(heartbeat.is_file(), 'The descendant must have been running.')
            child_pid = int(child_file.read_text())
            before = heartbeat.read_text()
            time.sleep(.3)
            self.assertEqual(heartbeat.read_text(), before,
                             'Descendant continued running after the watchdog exited.')
            # A reparented dead descendant may remain a zombie until PID1 reaps
            # it. A live R/S process is a failure; absent procfs is portable.
            stat = pathlib.Path(f'/proc/{child_pid}/stat')
            if stat.is_file():
                state = stat.read_text().rsplit(')', 1)[1].split()[0]
                self.assertEqual(state, 'Z', f'Descendant still exists in state {state}.')
        finally:
            # Clean only the process group and PIDs created by this fixture,
            # including when running against the pre-fix watchdog.
            if leader_file.is_file():
                try:
                    os.killpg(int(leader_file.read_text()), signal.SIGKILL)
                except ProcessLookupError:
                    pass
            if child_file.is_file():
                try:
                    os.kill(int(child_file.read_text()), signal.SIGKILL)
                except ProcessLookupError:
                    pass
            if wrapper is not None and wrapper.poll() is None:
                wrapper.kill()
                wrapper.wait(timeout=5)


if __name__ == '__main__':
    unittest.main()
