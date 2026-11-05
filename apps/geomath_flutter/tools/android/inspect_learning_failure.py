"""Read bounded, whitelisted fields from the installed debug app's Dart VM.

Never evaluates expressions, invokes methods, changes state or records the VM
authentication URI. A missing inspector is diagnostic failure, never app success.
HTTP RPC support is verified in this Dart SDK's vmservice_server.dart.
"""
import argparse
import json
import pathlib
import re
import subprocess
import urllib.parse
import urllib.request


def inspect(device):
    def adb(*args):
        return subprocess.check_output(['adb', '-s', device, *args], timeout=8).decode()
    pid = adb('shell', 'pidof', 'com.geomath.dev').strip()
    if not pid.isdigit():
        raise RuntimeError('No single production app process.')
    logs = adb('logcat', '-d', '--pid=' + pid, '-s', 'flutter:I', '*:S')
    urls = re.findall(r'The Dart VM service is listening on http://127\.0\.0\.1:(\d+)(/[A-Za-z0-9_=-]+/)', logs)
    if not urls:
        raise RuntimeError('Current production VM endpoint not observed.')
    port, auth_path = urls[-1]
    assert 0 < int(port) < 65536
    adb('forward', 'tcp:8183', 'tcp:' + port)
    base = 'http://127.0.0.1:8183' + auth_path
    try:
        def rpc(method, **params):
            url = base + method + '?' + urllib.parse.urlencode(params)
            with urllib.request.urlopen(url, timeout=4) as response:
                result = json.load(response)
            if 'error' in result:
                raise RuntimeError('Read-only VM RPC rejected: ' + method)
            return result['result']
        vm = rpc('getVM')
        isolate = next(item['id'] for item in vm['isolates'] if item['name'] == 'main')
        classes = rpc('getClassList', isolateId=isolate)['classes']
        def fields(ref):
            if 'valueAsString' in ref:
                return ref['valueAsString'][:240]
            obj = rpc('getObject', isolateId=isolate, objectId=ref['id'])
            values = {x['decl']['name']: x['value'] for x in obj.get('fields', [])}
            # Enums and the two explicit failure/startup value objects only.
            allowed = {'_name', 'index', 'message', 'code', '_stage', '_active', '_remaining'}
            return {name: fields(value) for name, value in values.items() if name in allowed}
        results = []
        allowed = {'_phase', '_failure', '_configured', '_disposed', '_started',
                   '_startup', '_initializing', 'initializationFailed', 'failure',
                   'recoveryRequired', 'initialShape'}
        for cls in classes:
            if cls['name'] not in ('ModuleSpikeController', 'LearningModuleController'):
                continue
            detail = rpc('getObject', isolateId=isolate, objectId=cls['id'])
            if not detail.get('library', {}).get('uri', '').startswith('package:geomath_flutter/features/learning/'):
                continue
            instances = rpc('getInstances', isolateId=isolate, objectId=cls['id'], limit=2)
            for instance in instances['instances']:
                obj = rpc('getObject', isolateId=isolate, objectId=instance['id'])
                values = {field['decl']['name']: fields(field['value'])
                          for field in obj.get('fields', []) if field['decl']['name'] in allowed}
                results.append({'class': cls['name'], 'fields': values})
        return {'status': 'observed', 'scope': 'read-only whitelisted diagnostic fields; no evaluation or state change',
                'instances': results}
    finally:
        adb('forward', '--remove', 'tcp:8183')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--device', required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    try:
        result = inspect(args.device)
    except Exception as error:
        # Exception messages can contain the private endpoint. Record type only.
        result = {'status': 'unavailable', 'error_type': type(error).__name__}
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result), flush=True)


if __name__ == '__main__':
    main()
