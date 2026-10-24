#!/usr/bin/env python3
"""Build the real core without Arduino headers, devices or target defines."""
from pathlib import Path
import os
import subprocess
import tempfile

root = Path(__file__).resolve().parent
with tempfile.TemporaryDirectory(prefix='geodecoder-domain-') as tmp:
    binary = Path(tmp) / 'domain'
    subprocess.run(['g++', '-std=c++11', '-Wall', '-Wextra', '-Werror', '-pedantic',
                    '-g', '-fsanitize=address,undefined', '-I' + str(root.parent / 'main'),
                    str(root / 'domain.cpp'), '-x', 'c++',
                    *[str(root.parent / 'main' / name) for name in
                      ('app_ports.ino', 'app.ino', 'quiz.ino', 'tag_registry.ino')],
                    '-o', str(binary)], check=True)
    raise SystemExit(subprocess.run([str(binary)], env=dict(os.environ, ASAN_OPTIONS='detect_leaks=0')).returncode)
