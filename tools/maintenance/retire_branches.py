#!/usr/bin/env python3
"""Archive reviewed heads, then retire only unchanged redundant branch refs."""
from pathlib import Path
import base64
import json
import os
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
PLAN = json.loads((ROOT / 'tools/maintenance/retire-plan.json').read_text())
REPO = PLAN['repository']
URL = 'https://github.com/' + REPO + '.git'


def git(*args, env=None):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True, env=env).strip()


def heads():
    return {ref.removeprefix('refs/heads/'): sha for sha, ref in
            (line.split() for line in git('ls-remote', '--heads', URL).splitlines())}


def auth():
    value = base64.b64encode(('x-access-token:' + os.environ['GH_TOKEN']).encode()).decode()
    env = os.environ.copy()
    env.update(GIT_CONFIG_COUNT='1', GIT_CONFIG_KEY_0='http.https://github.com/.extraheader',
               GIT_CONFIG_VALUE_0='AUTHORIZATION: basic ' + value, GIT_TERMINAL_PROMPT='0')
    return env


def main():
    if os.environ.get('GITHUB_REPOSITORY') != REPO:
        raise SystemExit('Wrong repository.')
    expected = {b['name']: b['sha'] for b in PLAN['original_branches']}
    expected['main'] = PLAN['verified_main_sha']
    expected[PLAN['candidate_branch']] = PLAN['candidate_sha']
    expected[PLAN['maintenance_branch']] = os.environ['GITHUB_SHA']
    current = heads()
    if current != expected:
        raise SystemExit('Branches advanced or appeared; review them before retiring anything.')
    request = urllib.request.Request('https://api.github.com/repos/' + REPO + '/actions/runs/' + str(PLAN['verification_run_id']),
                                    headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
                                             'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(request, timeout=30) as response:
        run = json.load(response)
    if run['head_sha'] != expected['main'] or run['conclusion'] != 'success' or run['status'] != 'completed':
        raise SystemExit('The exact current main does not have a successful verification run.')
    git('fetch', 'origin', '+refs/heads/*:refs/remotes/origin/*')
    git('config', 'user.name', 'GeoMath maintenance')
    git('config', 'user.email', '121752339+unDead41@users.noreply.github.com')
    for branch in PLAN['original_branches']:
        git('merge-base', '--is-ancestor', branch['sha'], expected['main'])
    git('merge-base', '--is-ancestor', PLAN['candidate_sha'], expected['main'])
    if PLAN.get('previous_firmware_version'):
        subprocess.check_call(['python3', 'tools/check_version.py', '--previous-version',
                               PLAN['previous_firmware_version']], cwd=ROOT)
    archived = git('ls-remote', URL, 'refs/tags/' + PLAN['archive_tag'])
    if archived:
        raise SystemExit('Archive tag exists; verify it rather than replacing it.')
    # Use the already-reviewed current main tree so the contents-only CI token
    # does not attempt to republish old workflow files. Original trees remain
    # reachable through their exact original parent commits.
    args = ['commit-tree', git('rev-parse', expected['main'] + '^{tree}')]
    for parent in dict.fromkeys([expected['main']] + list(current.values()) + [b['sha'] for b in PLAN['original_branches']]):
        args += ['-p', parent]
    archive = git(*args, '-m', 'Preserve original and preparation heads before GeoMath repository cleanup')
    git('push', URL, archive + ':refs/tags/' + PLAN['archive_tag'], env=auth())
    if git('ls-remote', URL, 'refs/tags/' + PLAN['archive_tag']).split()[0] != archive:
        raise SystemExit('Archive readback failed.')
    retired = {name: sha for name, sha in current.items() if name != 'main'}
    args = ['push', '--atomic']
    for name, sha in retired.items():
        args.append('--force-with-lease=refs/heads/' + name + ':' + sha)
    args += [URL] + [':refs/heads/' + name for name in retired]
    git(*args, env=auth())
    if heads() != {'main': expected['main']}:
        raise SystemExit('Unexpected final branch inventory.')
    print(json.dumps({'repository': REPO, 'remaining': heads(), 'retired': retired,
                      'archive_tag': PLAN['archive_tag'], 'archive_sha': archive}, indent=2))


if __name__ == '__main__':
    main()
