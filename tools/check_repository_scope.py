#!/usr/bin/env python3
"""Reject accidental cross-platform source files in a GeoMath checkout."""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
platform = (root / '.geomath-platform').read_text().strip()
files = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
common = ('main/', 'src/', 'print_labels/', 'tutorial/', 'platformio.ini',
          'platformio.local.ini.example', 'SAMBUNGAN.md', 'COMMANDS.md')
if platform == 'app':
    banned = (*common, 'digital/', 'supabase/')
    required = ('apps/geomath_flutter/pubspec.yaml',
                'apps/geomath_flutter/lib/features/ai_battle/domain/ai_policy.dart')
elif platform == 'digital':
    banned = (*common, 'apps/')
    required = ('digital/package.json', 'supabase/config.toml')
elif platform == 'physical':
    banned = ('apps/', 'digital/', 'supabase/', 'index.html', 'APP.md',
              'docs/geomath-app/', 'docs/geomath-app-prompts/')
    required = ('platformio.ini', 'main/firmware_version.h')
else:
    raise SystemExit('Unknown GeoMath platform: ' + platform)
bad = [p for p in files if p and any(p == x or p.startswith(x) for x in banned)]
missing = [p for p in required if not (root / p).is_file()]
if bad or missing:
    print('Cross-platform files:', bad)
    print('Missing required source:', missing)
    sys.exit(1)
print(f'PASS: {platform} source ownership ({len([p for p in files if p])} tracked files).')
