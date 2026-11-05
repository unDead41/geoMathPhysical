"""Prefetch locked SQLite hook assets with bounded retries and unchanged hashes.

The sqlite3 hook independently rehashes these shared-cache files when it runs.
No package source, hook output descriptor or expected digest is modified here.
"""
import argparse
import hashlib
import http.client
import json
import os
import pathlib
import re
import time
import urllib.parse
import urllib.request

MAX_ASSET_BYTES = 32 * 1024 * 1024


def verified(data, expected):
    return (data.startswith(b'\x7fELF') and len(data) <= MAX_ASSET_BYTES
            and hashlib.sha256(data).hexdigest() == expected)


def fetch_verified(url, expected, target, *, attempts=3, opener=None, pause=None):
    opener = opener or urllib.request.urlopen
    pause = pause or time.sleep
    if (target.is_file() and target.stat().st_size <= MAX_ASSET_BYTES
            and verified(target.read_bytes(), expected)):
        return {'cached': True, 'attempts': 0, 'bytes': target.stat().st_size,
                'sha256': expected}
    failures = []
    for attempt in range(1, attempts + 1):
        try:
            request = urllib.request.Request(url, headers={
                'User-Agent': 'GeoMath-CI-verified-sqlite3',
                'Cache-Control': 'no-cache', 'Accept-Encoding': 'identity',
            })
            with opener(request, timeout=60) as response:
                if response.status != 200:
                    raise RuntimeError(f'HTTP {response.status}')
                data = response.read(MAX_ASSET_BYTES + 1)
            actual = hashlib.sha256(data).hexdigest()
            if not verified(data, expected):
                raise RuntimeError(f'invalid ELF/hash: {len(data)} bytes, SHA256 {actual}; expected {expected}')
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_name(target.name + '.verified-tmp')
            temporary.write_bytes(data)
            os.replace(temporary, target)
            return {'cached': False, 'attempts': attempt, 'bytes': len(data),
                    'sha256': actual, 'earlier_failures': failures}
        except (OSError, RuntimeError, http.client.HTTPException) as error:
            failures.append(str(error))
            if attempt != attempts:
                pause(2 * attempt)
    raise RuntimeError(f'{url} failed {attempts} verified attempts: {failures}')


def locked_assets(app):
    config_path = app / '.dart_tool/package_config.json'
    config = json.loads(config_path.read_text())
    package = next(item for item in config['packages'] if item['name'] == 'sqlite3')
    uri = urllib.parse.urlparse(urllib.parse.urljoin(config_path.as_uri(), package['rootUri']))
    if uri.scheme != 'file':
        raise RuntimeError('The resolved locked sqlite3 package must be a local pub package.')
    root = pathlib.Path(urllib.request.url2pathname(uri.path))
    version = re.search(r'^version:\s*([0-9]+\.[0-9]+\.[0-9]+)\s*$',
                        (root / 'pubspec.yaml').read_text(), re.M).group(1)
    hashes_source = root / 'lib/src/hook/asset_hashes.dart'
    text = hashes_source.read_text()
    tag = re.search(r"releaseTag\s*=\s*'([^']+)'", text).group(1)
    if tag != 'sqlite3-' + version:
        raise RuntimeError('SQLite release tag does not match the resolved package version.')
    hashes = dict(re.findall(r"'([^']+)'\s*:\s*'([0-9a-f]{64})'", text))
    names = ['libsqlite3.arm.android.so', 'libsqlite3.arm64.android.so',
             'libsqlite3.x64.android.so', 'libsqlite3.x64.linux.so']
    shared = app / '.dart_tool/hooks_runner/shared/sqlite3/build'
    assets = []
    for name in names:
        expected = hashes[name]
        assets.append((name,
            f'https://github.com/simolus3/sqlite3.dart/releases/download/{tag}/{name}',
            expected, shared / f'download-{expected[:8]}/libsqlite3.so'))
    return tag, hashlib.sha256(hashes_source.read_bytes()).hexdigest(), assets


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--app', type=pathlib.Path, default=pathlib.Path.cwd())
    parser.add_argument('--receipt', type=pathlib.Path,
                        default=pathlib.Path('build/sqlite-native-assets.json'))
    args = parser.parse_args()
    tag, source_hash, assets = locked_assets(args.app.resolve())
    results = []
    receipt = {'schema_version': 1, 'package_release': tag,
               'pinned_hash_table_sha256': source_hash,
               'package_and_hook_unchanged': True, 'assets': results}
    try:
        for name, url, expected, target in assets:
            result = fetch_verified(url, expected, target)
            result.update({'filename': name, 'source_url': url,
                           'cache_path': str(target.relative_to(args.app.resolve()))})
            results.append(result)
            print(f'{name}: SHA256 verified ({result["bytes"]} bytes, cached={result["cached"]})')
        receipt['status'] = 'verified'
    except (OSError, RuntimeError, http.client.HTTPException) as error:
        receipt.update(status='failed', error=str(error))
        raise
    finally:
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(receipt, indent=2) + '\n')


if __name__ == '__main__':
    main()
