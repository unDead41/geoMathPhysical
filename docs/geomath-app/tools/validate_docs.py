#!/usr/bin/env python3
"""Validate the planning pack only; no app/runtime/network tests."""
from pathlib import Path
import hashlib, json, re, struct

root=Path(__file__).resolve().parents[1]
errors=[]
manifest=json.loads((root/'manifest.json').read_text())
for name,expected in manifest['files'].items():
    path=root/name
    if not path.is_file(): errors.append('Missing file: '+name);continue
    data=path.read_bytes()
    if hashlib.sha256(data).hexdigest()!=expected['sha256']:errors.append('Hash mismatch: '+name)
    if len(data)!=expected['bytes']:errors.append('Size mismatch: '+name)

actual={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and p.name!='manifest.json'}
if actual!=set(manifest['files']):errors.append('Manifest/file inventory mismatch')
catalog=json.loads((root/'screen_catalog.json').read_text())
ids=[s['id'] for s in catalog['screens']]
if ids!=[f'{i:02d}' for i in range(1,49)]:errors.append('Screen IDs must be exactly01–48')
if len(catalog['supplemental_states'])!=16:errors.append('Expected16supplemental states')
if len(manifest['mockups'])!=12:errors.append('Expected12mockup boards')
mapped=[v for b in manifest['mockups'] for v in b['screen_ids']]
if mapped!=ids:errors.append('Board/screen mapping mismatch')

palette=json.loads((root/'face_colors.json').read_text())
expected_colors={0:'#4C8DFF',1:'#F69B45',2:'#E9799B',3:'#42B883',4:'#F4C95D',5:'#9B7EDC'}
if {f['id']:f['hex'] for f in palette['faces']}!=expected_colors:errors.append('Face ID palette mismatch')

mds=list(root.rglob('*.md'))
for path in mds:
    content=path.read_text(encoding='utf-8')
    if len(re.findall(r'^```',content,re.M))%2:errors.append('Unbalanced code fence: '+str(path.relative_to(root)))
    for raw in re.findall(r'!?\[[^\]]*\]\(([^)]+)\)',content):
        if re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:',raw) or raw.startswith('#'):continue
        target=raw.split('#',1)[0].strip('<>')
        if not (path.parent/target).resolve().exists():errors.append('Broken relative link: '+str(path.relative_to(root))+' -> '+raw)

req=set(re.findall(r'^\| ([A-Z]\d{2}) \|',(root/'SOR.md').read_text(),re.M))
tested=set(re.findall(r'\b[A-Z]\d{2}\b',(root/'TEST_PLAN.md').read_text()))
if req-tested:errors.append('SOR IDs absent from test plan: '+','.join(sorted(req-tested)))
for path in (root/'assets').rglob('*.png'):
    head=path.read_bytes()[:24]
    if head[:8]!=b'\x89PNG\r\n\x1a\n':errors.append('Invalid PNG header: '+path.name);continue
    w,h=struct.unpack('>II',head[16:24])
    if min(w,h)<500:errors.append('Unexpected low-resolution PNG: '+path.name)
if errors:
    print(json.dumps({'status':'FAIL','errors':errors},ensure_ascii=False,indent=2));raise SystemExit(1)
print(json.dumps({'status':'PASS','files':len(manifest['files'])+1,'markdown_files':len(mds),'mockup_boards':12,'screens':len(ids),'supplemental_states':16,'sor_requirements':len(req),'png_images':13,'runtime_tests':'not run — planning documents only'},ensure_ascii=False,indent=2))
