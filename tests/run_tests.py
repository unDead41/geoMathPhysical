#!/usr/bin/env python3
"""Exercise real firmware, either as a sketch or as independent C++ modules."""
from pathlib import Path
import argparse
import os
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--sketch', type=Path, default=root.parent / 'main')
parser.add_argument('--rgb', action='store_true')
mode = parser.add_mutually_exclusive_group()
mode.add_argument('--entrypoint', type=Path, help='Exercise e.g. src/main.cpp')
mode.add_argument('--separate-modules', action='store_true',
                  help='Compile every real .ino separately, with no include-order shortcuts')
args = parser.parse_args()
subprocess.run([sys.executable, str(root.parent / 'tools' / 'check_version.py')], check=True)
subprocess.run([sys.executable, str(root / 'test_version_check.py')], check=True)
subprocess.run([sys.executable, str(root / 'run_domain_tests.py')], check=True)
with tempfile.TemporaryDirectory(prefix='geodecoder-test-') as tmp:
    exe = Path(tmp) / 'behaviour'
    cmd = ['g++', '-std=c++11', '-Wall', '-Wextra', '-Werror', '-pedantic', '-g',
           '-fsanitize=address,undefined', '-DARDUINO_ARCH_ESP32', '-DCONFIG_IDF_TARGET_ESP32',
           '-DGEODECODER_RGB_ENABLED=' + str(int(args.rgb)),
           '-I' + str(root / 'fakes'), '-I' + str(args.sketch.resolve())]
    if args.separate_modules:
        cmd += ['-DGEODECODER_SEPARATE_MODULES']
    elif args.entrypoint:
        cmd += ['-DGEODECODER_ENTRYPOINT="' + str(args.entrypoint.resolve()) + '"']
    cmd += [str(root / 'behaviour.cpp')]
    if args.separate_modules:
        cmd += ['-x', 'c++'] + [str(p) for p in sorted(args.sketch.resolve().glob('*.ino'))]
    cmd += ['-o', str(exe)]
    subprocess.run(cmd, check=True)
    # LeakSanitizer cannot inspect /proc tasks in this managed runtime.
    env = dict(os.environ, ASAN_OPTIONS='detect_leaks=0')
    raise SystemExit(subprocess.run([str(exe)], env=env).returncode)


