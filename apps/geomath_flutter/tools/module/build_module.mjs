import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {appRoot,verifySource,json,SOURCE_COMMIT,exportContracts} from '../contracts/export_contracts.mjs';
import {writeModuleAssets} from './prepare_module.mjs';

const args=process.argv.slice(2),featureOnly=args.includes('--feature-only');
const helperIndex=args.indexOf('--surface-helper');
const helperPath=helperIndex>=0?path.resolve(args[helperIndex+1]):path.join(appRoot,'tools/module/surface_adapter.mjs');
const positional=args.filter((arg,index)=>arg!=='--feature-only'&&(helperIndex<0||index!==helperIndex&&index!==helperIndex+1));
const [sourceArg,treeArg] = positional;
if(!sourceArg || !treeArg)throw Error('Usage: node tools/module/build_module.mjs --feature-only <canonical-root> <recursive-tree.json>');
const sourceRoot=path.resolve(sourceArg),treePath=path.resolve(treeArg);
const provenance=verifySource(sourceRoot,treePath);
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'geomath-module-'));
try{
  // Canonical build is allowed to generate web outputs only in this isolated
  // source snapshot. The app branch never writes digital/**.
  fs.cpSync(path.join(sourceRoot,'digital'),path.join(scratch,'digital'),{recursive:true});
  execFileSync(process.execPath,[path.join(scratch,'digital/module/tools/build.mjs')],{stdio:'inherit'});
  const canonical=fs.readFileSync(path.join(scratch,'digital/module/GeoDecoder_Modul_V1.html'),'utf8');
  if(/<(?:script|link|img|audio|video)\b[^>]*(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(canonical))throw Error('Remote runtime dependency in module');
  const {prepareModuleFrame}=await import(pathToFileURL(path.join(scratch,'digital/dist/module-frame.mjs')).href);
  const manifest=await writeModuleAssets(canonical,prepareModuleFrame,helperPath);
  if(!featureOnly){
  const contracts=await exportContracts(sourceRoot,treePath);
  const lock={schema_version:1,repository:'unDead41/geodecoder',app_base_commit:'38f061af963256528d5060ff076bae9ee05eafc3',canonical_branch:'main-digitalized',firmware_main_reference:{commit:'25836eb1a6f24459aace8a3980ae880a13e3b488',version:'2.0.2',modified:false},canonical_commit:SOURCE_COMMIT,canonical_tree:'ce89242bbf9409c6ccad5129631dfe8ac3a52db8',digital_version:'2.9.1',module_version:'1.6.2',bank_version:`bank15-sha256:${contracts.bankHash}`,ruleset:'single-attempt-v1',schemas:{module_progress:1,module_settings:1,native_envelope:1,solo_snapshot:1,formative_record:1,asset_manifest:1},source_inputs:provenance,feature_manifests:['assets/contracts/manifest.json','assets/module/manifest.json'],module_build:{command:'node tools/module/build_module.mjs <canonical-root> <recursive-tree.json>',source_built:true,canonical_html_sha256:manifest.canonical_html_sha256,adapter_version:manifest.adapter_version},limitations:['Android device smoke must be recorded separately; source/build checks are not Android WebView evidence.']};
  fs.writeFileSync(path.join(appRoot,'docs/source_lock.json'),json(lock));
  }
  console.log(`Bundled source-built canonical module offline (${manifest.files.reduce((n,file)=>n+file.bytes,0)} bytes), with separately versioned wrapper and hash manifest.`);
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
