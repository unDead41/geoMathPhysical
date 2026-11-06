import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {verifyBundledInputs} from '../../../../tools/module/rebuild_bundled_module.mjs';

const root=new URL('../../../../',import.meta.url);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

test('shipped canonical HTML and every generated asset match verified offline source hashes',()=>{
  const canonical=verifyBundledInputs();
  assert.equal(digest(canonical),'7ddd5d60a25fbdf73c20f9f8e8fc0db4253e582fb50d17c944307b8f682066c4');
  const manifest=JSON.parse(fs.readFileSync(new URL('assets/module/manifest.json',root)));
  for(const file of manifest.files){const bytes=fs.readFileSync(new URL(file.path,root));assert.equal(bytes.length,file.bytes);assert.equal(digest(bytes),file.sha256,file.path);}
  assert.equal(manifest.source_commit,'37bc2cd262cc0a54e8ee31339ea37471c1ecfda5');assert.equal(manifest.adapter_version,4);
});

test('offline rebuild rejects altered canonical HTML or frame dependencies before executing source',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'geomath-bundle-integrity-'));
  try{
    for(const source of ['tools/module/reference','tools/contracts/canonical_inputs.json','docs/source_lock.json','assets/module/canonical-module.html']){
      const destination=path.join(directory,source);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.cpSync(new URL(source,root),destination,{recursive:true});
    }
    assert.equal(typeof verifyBundledInputs(directory),'string');
    const frame=path.join(directory,'tools/module/reference/module-frame.mjs'),original=fs.readFileSync(frame);
    fs.appendFileSync(frame,'\nthrow Error("unexpected execution");');
    assert.throws(()=>verifyBundledInputs(directory),/reference hash mismatch/);
    fs.writeFileSync(frame,original);
    fs.appendFileSync(path.join(directory,'assets/module/canonical-module.html'),'<!-- modified -->');
    assert.throws(()=>verifyBundledInputs(directory),/Canonical HTML hash mismatch/);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
