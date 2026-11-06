#!/usr/bin/env python3
"""Retire migrated active refs after verifying destination histories and backup."""
import base64
import json
import os
from pathlib import Path
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'migration/sources.json').read_text())
SOURCE_URL = CONFIG['source_url']


def git(*args, capture=False, env=None):
    result = subprocess.run(['git', *args], cwd=ROOT, check=True, env=env,
                            text=True, stdout=subprocess.PIPE if capture else None)
    return result.stdout.strip() if capture else None


def refs(url):
    return {ref.removeprefix('refs/heads/'): sha for sha, ref in
            (line.split() for line in git('ls-remote', '--heads', url,
                                          capture=True).splitlines())}


if os.environ.get('GITHUB_REPOSITORY') != 'unDead41/geoMathPhysical':
    raise SystemExit('This workflow is scoped to geoMathPhysical.')

token = os.environ['GH_TOKEN']
auth = base64.b64encode(('x-access-token:' + token).encode()).decode()
env = os.environ.copy()
env.update(GIT_CONFIG_COUNT='1', GIT_CONFIG_KEY_0='http.https://github.com/.extraheader',
           GIT_CONFIG_VALUE_0='AUTHORIZATION: basic ' + auth,
           GIT_TERMINAL_PROMPT='0')
git('config', 'user.name', 'GeoMath source migration')
git('config', 'user.email', '121752339+unDead41@users.noreply.github.com')
original = {row['name']: row['sha'] for row in CONFIG['branches']}
live = refs(SOURCE_URL)
moved = []
destinations = {}
for platform, repo in [('app', 'geoMathApp'), ('digital', 'geoMathDigital')]:
    url = f'https://raw.githubusercontent.com/unDead41/{repo}/main/migration/receipt.json'
    with urllib.request.urlopen(url, timeout=60) as response:
        receipt = json.load(response)
    assert receipt['platform'] == platform and receipt['published'] is True
    assert receipt['destination_repository'] == 'unDead41/' + repo
    target_refs = refs(f'https://github.com/unDead41/{repo}.git')
    for row in receipt['source_branches']:
        assert original.get(row['name']) == row['sha'], row['name']
        assert target_refs.get(row['destination_branch']) == row['filtered_sha'], row['name']
        if row['name'] in live:
            assert live[row['name']] == row['sha'], f'Source advanced: {row["name"]}'
            moved.append(row)
    destinations[repo] = {'main': target_refs['main'],
                          'branches_verified': len(receipt['source_branches'])}

expected = [row for row in CONFIG['branches'] if row['name'] == 'app'
            or row['name'].startswith(('app-', 'digitalized-', 'digitalize/'))
            or row['name'] in ('main-digitalized', 'ui/ux-redesign-concept')]
assert len(expected) == sum(x['branches_verified'] for x in destinations.values())
if not moved:
    print('All migrated branches are already retired; nothing to delete.')
    raise SystemExit(0)

git('fetch', 'origin', '+refs/heads/*:refs/remotes/origin/*')
main_sha = git('rev-parse', 'refs/remotes/origin/main', capture=True)
tree = git('rev-parse', main_sha + '^{tree}', capture=True)
parents = list(dict.fromkeys([main_sha] + [row['sha'] for row in expected]))
args = ['commit-tree', tree]
for parent in parents:
    args.extend(['-p', parent])
args.extend(['-m', 'Archive every original mixed branch before platform separation'])
archive = git(*args, capture=True)
tag = 'refs/tags/archive/mixed-before-20261106'
existing_tag = git('ls-remote', SOURCE_URL, tag, capture=True)
if existing_tag:
    archive = existing_tag.split()[0]
    git('fetch', 'origin', tag)
    for row in expected:
        git('merge-base', '--is-ancestor', row['sha'], archive)
else:
    git('push', SOURCE_URL, archive + ':' + tag, env=env)

# Establish the server backup before removing any active refs. Exact leases
# reject a branch changed after the audit; no branch contents are force-pushed.
assert git('ls-remote', SOURCE_URL, tag, capture=True).split()[0] == archive
args = ['push', '--atomic']
for row in moved:
    args.append('--force-with-lease=refs/heads/' + row['name'] + ':' + row['sha'])
args.append(SOURCE_URL)
args.extend(':refs/heads/' + row['name'] for row in moved)
git(*args, env=env)
remaining = refs(SOURCE_URL)
assert not any(row['name'] in remaining for row in expected)
assert remaining['main'] == main_sha, 'Cleanup must not change Physical main.'
receipt = {'archive_tag': tag, 'archive_commit': archive,
           'retired_branches': len(moved), 'destinations': destinations,
           'physical_main_unchanged_by_cleanup': main_sha,
           'remaining_branches': remaining}
(ROOT / 'migration/retirement-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
