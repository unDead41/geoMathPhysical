#!/usr/bin/env python3
"""Exercise release checks against controlled miniature repositories."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

CHECKER = Path(__file__).resolve().parents[1] / 'tools' / 'check_version.py'


class VersionCheckTests(unittest.TestCase):
    def check_release(self, version='1.0.0', readme=None, changelog=None, previous=None):
        with tempfile.TemporaryDirectory(prefix='geodecoder-version-') as tmp:
            root = Path(tmp)
            (root / 'main').mkdir()
            (root / 'main' / 'firmware_version.h').write_text(
                '#pragma once\n#define GEODECODER_VERSION "' + version + '"\n', encoding='utf-8')
            (root / 'README.md').write_text(
                '# GeoDecoder\n\nVersi semasa: **v' + (readme or version) + '**.\n', encoding='utf-8')
            (root / 'CHANGELOG.md').write_text(
                '# Changelog\n\n## v' + (changelog or version) + ' - 2026-10-25\n', encoding='utf-8')
            cmd = [sys.executable, str(CHECKER), '--root', str(root)]
            if previous is not None:
                cmd += ['--previous-version', previous]
            return subprocess.run(cmd, capture_output=True, text=True)

    def test_matching_release_accepts_large_numeric_components(self):
        result = self.check_release('1.12.103')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('v1.12.103', result.stdout)

    def test_readme_disagreement_is_rejected(self):
        result = self.check_release(readme='1.0.1')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('README', result.stderr)

    def test_latest_changelog_disagreement_is_rejected(self):
        result = self.check_release(changelog='1.0.1')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('CHANGELOG', result.stderr)

    def test_leading_zero_and_incomplete_versions_are_rejected(self):
        for version in ['1.00.0', 'v1.0.0', '1.0', '1.0.0-dev.1']:
            with self.subTest(version=version):
                result = self.check_release(version)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('MAJOR.MINOR.PATCH', result.stderr)

    def test_published_version_must_advance(self):
        for previous in ['v1.0.0', '1.0.1', '2.0.0']:
            result = self.check_release(previous=previous)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('newer', result.stderr)

    def test_numeric_order_is_used_instead_of_text_order(self):
        result = self.check_release('1.10.0', previous='v1.9.9')
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    unittest.main()
