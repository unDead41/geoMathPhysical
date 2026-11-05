"""Persist only fixed bootstrap markers and classified CSP/sandbox warnings.

Raw logcat remains a pipe/in-memory input. Arbitrary message text, source URLs,
VM/DevTools endpoints, payloads, nonces and authentication tokens are omitted.
These diagnostic events never establish module readiness or test acceptance.
"""
import argparse
import json
import pathlib
import re
import sys

STAGES = frozenset(('preferences-start', 'preferences-end', 'canonical-start',
                    'render-start', 'render-end', 'models-end', 'access-end',
                    'host-start', 'host-end'))
STAGE = re.compile(r'\bGEOMATH_CHILD_STAGE ([a-z-]+)(.*)$')
DIRECTIVES = re.compile(r'\b(default-src|script-src-elem|script-src-attr|script-src|'
                        r'style-src-elem|style-src-attr|style-src|img-src|connect-src|'
                        r'font-src|frame-src|child-src|object-src|base-uri|form-action)\b')
MAX_LINE_CHARACTERS = 8192
MAX_EVENTS = 2000


def classify(line):
    if len(line) > MAX_LINE_CHARACTERS:
        return None
    marker = STAGE.search(line.rstrip('\r\n'))
    if marker and marker[1] in STAGES:
        tail = marker[2].strip()
        # Flutter prints a bare marker; Chromium can append its console source.
        # Even in the latter case the source and complete message are omitted.
        if not tail or tail == '"' or tail.startswith('", source: '):
            return {'kind': 'child_stage', 'stage': marker[1]}
    lower = line.casefold()
    if 'content security policy' in lower:
        directives = sorted(set(DIRECTIVES.findall(lower)))
        return {'kind': 'content_security_policy_warning',
                'directives': directives}
    if ('blocked script execution' in lower and 'sandbox' in lower
            and 'allow-scripts' in lower):
        return {'kind': 'sandbox_script_blocked'}
    return None


def sanitize(lines):
    events = []
    count = omitted = 0
    truncated = False
    for line in lines:
        count += 1
        event = classify(line)
        if event is None:
            omitted += 1
        elif len(events) < MAX_EVENTS:
            events.append(event)
        else:
            omitted += 1
            truncated = True
    return {'schema_version': 1, 'scope': 'fixed diagnostic markers only',
            'establishes_readiness': False, 'raw_log_persisted': False,
            'input_lines': count, 'omitted_lines': omitted,
            'events_truncated': truncated, 'events': events}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    result = sanitize(sys.stdin)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'sanitized_diagnostic_events': len(result['events']),
                      'raw_log_persisted': False}), flush=True)


if __name__ == '__main__':
    main()
