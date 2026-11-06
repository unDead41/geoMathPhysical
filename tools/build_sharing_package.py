#!/usr/bin/env python3
"""Build the Windows sharing ZIP from the one current Physical source tree."""
from pathlib import Path
import argparse
import hashlib
import io
import json
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = 'tools/sharing/template/'
FILES = {'platformio.ini', 'platformio.local.ini.example', '.vscode/extensions.json',
         '.vscode/settings.json', 'SAMBUNGAN.md', 'COMMANDS.md',
         'docs/GAME_FLOW_RGB.md', 'docs/TUTORIAL_FLOW_V2_HANDOFF.md',
         'docs/lcd/GeoDecoder_15_Contoh_LCD_Soalan_dan_Hint.pdf'}
PREFIXES = ('main/', 'src/', 'print_labels/', 'tutorial/')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build(root=ROOT):
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
    payload = {}
    for name in sorted(p for p in tracked if p):
        if name in FILES or name.startswith(PREFIXES):
            target = name
        elif name.startswith(TEMPLATE):
            target = name[len(TEMPLATE):]
        else:
            continue
        path = root / name
        if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(root.resolve()):
            raise ValueError('Expected a regular tracked source file: ' + name)
        if target in payload:
            raise ValueError('Duplicate package path: ' + target)
        payload[target] = path.read_bytes()
    version = re.search(r'^#define GEODECODER_VERSION "([0-9.]+)"$',
                        payload['main/firmware_version.h'].decode(), re.M).group(1)
    source = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    manifest = {'schemaVersion': 1, 'packageId': 'GeoDecoder-sharing',
                'packageVersion': version + '-sharing.1', 'firmwareVersion': version,
                'sourceRepository': 'unDead41/geoMathPhysical', 'sourceSha': source,
                'platformioCore': '6.1.18',
                'tutorial': {'path': 'tutorial/GeoDecoder_Panduan_A-Z.pdf',
                             'edition': '2026-10-25', 'firmwareVersion': '1.1.1',
                             'note': 'Historical installation pictures; follow README and current GAME_FLOW_RGB.'},
                'files': [{'path': p, 'sha256': digest(b)} for p, b in sorted(payload.items())]}
    required = {'setup.ps1', 'setupGeoDecoder.ps1', 'geodecoder.ps1', 'scripts/common.ps1',
                '.vscode/tasks.json', 'src/main.cpp', 'platformio.ini', 'README.md'}
    if required - set(payload):
        raise ValueError('Missing package inputs: ' + repr(required - set(payload)))
    payload['package.json'] = (json.dumps(manifest, indent=2, ensure_ascii=False) + '\n').encode()
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(payload.items()):
            info = zipfile.ZipInfo('GeoMathPhysical/' + name, (2026, 11, 6, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    return version, payload, output.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='also verify reproducibility, paths and manifest hashes')
    args = parser.parse_args()
    version, payload, data = build()
    if args.check:
        if data != build()[2]:
            raise SystemExit('Package bytes were not reproducible.')
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            expected = {'GeoMathPhysical/' + name for name in payload}
            if set(archive.namelist()) != expected or len(archive.namelist()) != len(expected):
                raise SystemExit('ZIP inventory mismatch.')
            for entry in json.loads(payload['package.json'])['files']:
                if digest(archive.read('GeoMathPhysical/' + entry['path'])) != entry['sha256']:
                    raise SystemExit('Package hash mismatch: ' + entry['path'])
            for name in payload:
                if any(part in ('.git', '.pio', 'node_modules', '__pycache__') for part in Path(name).parts):
                    raise SystemExit('Non-source package input: ' + name)
    destination = ROOT / 'artifacts' / ('GeoMathPhysical-' + version + '-sharing.zip')
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    print(json.dumps({'package': str(destination.relative_to(ROOT)), 'files': len(payload),
                      'bytes': len(data), 'sha256': digest(data), 'reproducibility_checked': args.check}))


if __name__ == '__main__':
    main()
