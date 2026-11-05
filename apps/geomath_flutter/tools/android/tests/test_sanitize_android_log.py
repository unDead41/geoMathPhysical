"""Privacy regression checks; fixture markers cannot establish Android success."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).parents[1] / 'sanitize_android_log.py'
SPEC = importlib.util.spec_from_file_location('sanitize_android_log', SCRIPT)
sanitize = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sanitize)


class SanitizeAndroidLogTest(unittest.TestCase):
    def test_vm_devtools_jwt_and_arbitrary_lines_are_not_persisted(self):
        raw = ('I/flutter: The Dart VM service is listening on '
               'http://127.0.0.1:44999/private_vm_token=/\n'
               'DevTools http://127.0.0.1:9100/?uri=ws%3A%2F%2F127.0.0.1%3A44999%2Fprivate_vm_token%3D%2Fws\n'
               'I/flutter: Authorization: Bearer private_jwt\n'
               'I/chromium: arbitrary child payload and private_bridge_nonce\n')
        result = sanitize.sanitize(raw.splitlines(True))
        self.assertEqual(result['events'], [])
        self.assertEqual(result['omitted_lines'], 4)
        encoded = json.dumps(result)
        for secret in ('private_vm_token', 'private_jwt', 'private_bridge_nonce',
                       'http:', 'ws%', '44999'):
            self.assertNotIn(secret, encoded)
        self.assertFalse(result['establishes_readiness'])

    def test_only_known_complete_phase_markers_survive(self):
        raw = ('I/flutter ( 123): GEOMATH_CHILD_STAGE preferences-start\n'
               'I/chromium: [INFO:CONSOLE(1)] "GEOMATH_CHILD_STAGE host-end", source: '
               'http://127.0.0.1:44999/private_vm_token=/ (1)\n'
               'I/flutter: GEOMATH_CHILD_STAGE invented-stage\n'
               'I/flutter: GEOMATH_CHILD_STAGE host-end private_jwt\n')
        result = sanitize.sanitize(raw.splitlines(True))
        self.assertEqual(result['events'], [
            {'kind': 'child_stage', 'stage': 'preferences-start'},
            {'kind': 'child_stage', 'stage': 'host-end'},
        ])
        self.assertNotIn('private_', json.dumps(result))

    def test_csp_warning_keeps_directive_names_but_never_policy_or_sources(self):
        line = ('I/chromium: Refused to execute inline script because it violates the following '
                'Content Security Policy directive: "script-src \'nonce-private_nonce\'". '
                'source: http://127.0.0.1:44999/private_vm_token=/ secret_payload\n')
        result = sanitize.sanitize([line])
        self.assertEqual(result['events'], [
            {'kind': 'content_security_policy_warning', 'directives': ['script-src']},
        ])
        self.assertNotIn('private_', json.dumps(result))
        self.assertNotIn('secret_payload', json.dumps(result))

    def test_sandbox_warning_is_a_fixed_code_only(self):
        line = ("Blocked script execution in 'private_origin' because the document's frame "
                "is sandboxed and the 'allow-scripts' permission is not set.\n")
        self.assertEqual(sanitize.classify(line), {'kind': 'sandbox_script_blocked'})

    def test_oversized_lines_and_extra_events_are_bounded(self):
        self.assertIsNone(sanitize.classify('Content Security Policy ' + 'x' * 8192))
        result = sanitize.sanitize(['GEOMATH_CHILD_STAGE host-end\n'] * (sanitize.MAX_EVENTS + 2))
        self.assertEqual(len(result['events']), sanitize.MAX_EVENTS)
        self.assertTrue(result['events_truncated'])
        self.assertEqual(result['omitted_lines'], 2)

    def test_cli_never_writes_raw_input_to_file_or_stdout(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'safe.json'
            raw = ('The Dart VM service is listening on http://127.0.0.1:3456/private_token=/\n'
                   'GEOMATH_CHILD_STAGE models-end\n')
            process = subprocess.run([sys.executable, str(SCRIPT), '--output', str(output)],
                                     input=raw, text=True, capture_output=True, check=True)
            combined = output.read_text() + process.stdout + process.stderr
            self.assertNotIn('private_token', combined)
            self.assertNotIn('127.0.0.1', combined)
            self.assertEqual(json.loads(output.read_text())['events'], [
                {'kind': 'child_stage', 'stage': 'models-end'},
            ])
            self.assertEqual(list(Path(folder).iterdir()), [output])


if __name__ == '__main__':
    unittest.main()
