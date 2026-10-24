#!/usr/bin/env python3
"""Compile and exercise the real sketch with simulated electrical/device I/O."""
from pathlib import Path
import argparse
import os
import subprocess
import tempfile

root=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--sketch',type=Path,default=root.parent/'main')
parser.add_argument('--rgb',action='store_true')
parser.add_argument('--entrypoint',type=Path,
                    help='Exercise a C++ entry point, e.g. src/main.cpp, instead of individual tabs')
args=parser.parse_args()
with tempfile.TemporaryDirectory(prefix='geodecoder-test-') as tmp:
    exe=Path(tmp)/'behaviour'
    cmd=['g++','-std=c++11','-Wall','-Wextra','-Werror','-pedantic','-g','-fsanitize=address,undefined',
         '-DARDUINO_ARCH_ESP32','-DCONFIG_IDF_TARGET_ESP32',
         '-DGEODECODER_RGB_ENABLED='+str(int(args.rgb)),
         '-I'+str(root/'fakes'),'-I'+str(args.sketch.resolve()),str(root/'behaviour.cpp'),'-o',str(exe)]
    if args.entrypoint:
        cmd.insert(1, '-DGEODECODER_ENTRYPOINT="'+str(args.entrypoint.resolve())+'"')
    subprocess.run(cmd,check=True)
    # LeakSanitizer cannot inspect /proc tasks in this managed runtime.
    env=dict(os.environ,ASAN_OPTIONS='detect_leaks=0')
    raise SystemExit(subprocess.run([str(exe)],env=env).returncode)
