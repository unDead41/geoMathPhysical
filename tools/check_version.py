#!/usr/bin/env python3
"""Check that firmware, GitHub README and latest changelog identify one release."""
from pathlib import Path
import argparse
import re
import sys

VERSION = r'(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)'


def validate(root, previous=None):
    header = (root / 'main' / 'firmware_version.h').read_text(encoding='utf-8')
    definitions = re.findall(r'^#define\s+GEODECODER_VERSION\s+"([^"\n]+)"\s*$', header, re.M)
    if len(definitions) != 1 or not re.fullmatch(VERSION, definitions[0]):
        raise ValueError('firmware_version.h must define one MAJOR.MINOR.PATCH without leading zeros')
    version = definitions[0]
    label = 'v' + version
    readme = (root / 'README.md').read_text(encoding='utf-8')
    visible = re.findall(r'^Versi semasa: \*\*(v[^*\n]+)\*\*\.', readme, re.M)
    if visible != [label]:
        raise ValueError('README current version must equal ' + label)
    changelog = (root / 'CHANGELOG.md').read_text(encoding='utf-8')
    entries = re.findall(r'^## (v\S+) - \d{4}-\d{2}-\d{2}\s*$', changelog, re.M)
    if not entries or entries[0] != label:
        raise ValueError('CHANGELOG latest version must equal ' + label)
    if previous is not None:
        old = previous[1:] if previous.startswith('v') else previous
        if not re.fullmatch(VERSION, old):
            raise ValueError('previous version must use MAJOR.MINOR.PATCH')
        if tuple(map(int, version.split('.'))) <= tuple(map(int, old.split('.'))):
            raise ValueError(label + ' must be newer than v' + old)
    return label


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--previous-version', help='require an increase from this published version')
    args = parser.parse_args()
    try:
        label = validate(args.root, args.previous_version)
    except (OSError, ValueError) as error:
        print('[VERSION ERROR] ' + str(error), file=sys.stderr)
        return 1
    print('[VERSION OK] GeoDecoder ' + label + ' | firmware = README = CHANGELOG')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
