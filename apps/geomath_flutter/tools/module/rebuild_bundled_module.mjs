import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {appRoot,sha256,SOURCE_COMMIT} from '../contracts/export_contracts.mjs';
import {writeModuleAssets} from './prepare_module.mjs';

// The canonical build output is already pinned in the app's source lock. This
// path rebuilds only its adapter, with the unchanged canonical preferences host.
// No extraction from a previously generated native-adapter.js is involved.
export function verifyBundledInputs(root=appRoot){
  const reference=path.join(root,'tools/module/reference');
  const provenance=JSON.parse(fs.readFileSync(path.join(reference,'provenance.json'),'utf8'));
  const inputs=JSON.parse(fs.readFileSync(path.join(root,'tools/contracts/canonical_inputs.json'),'utf8'));
  const lock=JSON.parse(fs.readFileSync(path.join(root,'docs/source_lock.json'),'utf8'));
  if(provenance.source_commit!==SOURCE_COMMIT||inputs.canonical_commit!==SOURCE_COMMIT||lock.canonical_commit!==SOURCE_COMMIT)throw Error('Canonical source commit mismatch');
  for(const file of provenance.files){
    const bytes=fs.readFileSync(path.join(reference,file.path));
    const blob=createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
    if(bytes.length!==file.bytes||sha256(bytes)!==file.sha256||blob!==file.git_blob)throw Error('Canonical frame reference hash mismatch: '+file.path);
    const input=inputs.source_inputs.find(item=>item.path===file.source);
    if(input&&(input.sha256!==file.sha256||input.git_blob!==file.git_blob||input.bytes!==file.bytes))throw Error('Canonical frame input mismatch: '+file.path);
  }
  const canonical=fs.readFileSync(path.join(root,'assets/module/canonical-module.html'),'utf8');
  const hash=sha256(Buffer.from(canonical));
  if(hash!==provenance.canonical_html_sha256||hash!==lock.module_build.canonical_html_sha256)throw Error('Canonical HTML hash mismatch');
  return canonical;
}

export async function rebuildBundledModule(){
  const canonical=verifyBundledInputs();
  const {prepareModuleFrame}=await import('./reference/module-frame.mjs');
  return writeModuleAssets(canonical,prepareModuleFrame);
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const manifest=await rebuildBundledModule();
  console.log(`Rebuilt pinned offline module adapter v${manifest.adapter_version}; canonical HTML ${manifest.canonical_html_sha256}.`);
}
