import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {appRoot,verifySource,sha256,json,SOURCE_COMMIT,exportContracts} from '../contracts/export_contracts.mjs';

const [sourceArg,treeArg] = process.argv.slice(2);
if(!sourceArg || !treeArg)throw Error('Usage: node tools/module/build_module.mjs <canonical-root> <recursive-tree.json>');
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
  const palette=JSON.parse(fs.readFileSync(path.join(appRoot,'../../docs/geomath-app/face_colors.json')));
  const colors=palette.faces.map(face=>face.hex);
  let adapted=canonical;
  // Presentation-only adapter: preserve every canonical vertex, face ID,
  // formula, parser, projection and folding transition.
  const paletteAdapter=`\nconst geomathFaceColor=(shape,id)=>{const cube=${JSON.stringify(colors)};if(shape==='cylinder')return ['#4C8DFF','#F4C95D','#9B7EDC'][id]||cube[id%6];if(shape==='cone'||shape==='hemisphere')return ['#4C8DFF','#9B7EDC'][id]||cube[id%6];return cube[id%6];};\nFACE_COLORS.splice(0,6,...${JSON.stringify(colors)});const geomathPaintMesh=(shape,mesh)=>mesh.map(face=>({...face,color:geomathFaceColor(shape,face.id)}));const geomathBuildMesh=buildMesh;buildMesh=(shape,...args)=>geomathPaintMesh(shape,geomathBuildMesh(shape,...args));const geomathLearningMesh=learningMesh;learningMesh=(shape,...args)=>geomathPaintMesh(shape,geomathLearningMesh(shape,...args));const geomathPresetMesh=presetNetMesh;presetNetMesh=(shape,...args)=>geomathPaintMesh(shape,geomathPresetMesh(shape,...args));const geomathSurfacePieces=surfacePieces;surfacePieces=(shape,...args)=>geomathPaintMesh(shape,geomathSurfacePieces(shape,...args));const geomathStudyPieces=studySurfacePieces;studySurfacePieces=(shape,...args)=>geomathPaintMesh(shape,geomathStudyPieces(shape,...args));const geomathDraw=ModelRenderer.prototype.draw;ModelRenderer.prototype.draw=function(options){const mesh=options.mesh||learningMesh(options.shape,options.progress||0,options.mini?64:144);return geomathDraw.call(this,{...options,mesh:MODEL_ORDER.includes(options.shape)?geomathPaintMesh(options.shape,mesh):mesh});};\n`;
  const marker='const el=id=>document.getElementById(id);';
  if(!adapted.includes(marker))throw Error('Canonical renderer adapter anchor changed');
  adapted=adapted.replace(marker,paletteAdapter+marker).replace('number.style.backgroundColor=FACE_COLORS[id]','number.style.backgroundColor=geomathFaceColor(state.shape,id)');
  const diagnostics=`\nObject.defineProperty(window,'__geomathDiagnostics',{get:()=>Object.freeze({shape:state.shape,yaw:state.yaw,pitch:state.pitch,zoom:state.zoom,progress:state.progress,mode:state.mode,learningView:state.learningView,selected:state.selected,playing:state.playing,dimensions:LESSON_DATA[state.shape].defaults,modelCount:MODEL_ORDER.length,meshSource:'learning-mesh.mjs/studySolidMesh'}),configurable:false});\nlet geomathNativeActive=true;const geomathHidden=Object.getOwnPropertyDescriptor(Document.prototype,'hidden')?.get;Object.defineProperty(document,'hidden',{get:()=>!geomathNativeActive||Boolean(geomathHidden?.call(document)),configurable:false});window.addEventListener('message',event=>{if(event.source!==window.parent)return;const message=event.data;if(message?.type==='geomath:native-lifecycle'&&typeof message.active==='boolean'){geomathNativeActive=message.active;moduleAccess.stopSpeech();document.dispatchEvent(new Event('visibilitychange'));}else if(message?.type==='geomath:audio'&&typeof message.allowed==='boolean'&&Number.isInteger(message.revision)){if(!message.allowed)moduleAccess.stopSpeech();moduleAccess.voiceAvailability();window.parent.postMessage({type:'geomath:audio-ack',revision:message.revision},'*');}else if(message?.type==='geomath:inspect'){window.parent.postMessage({type:'geomath:diagnostics',snapshot:window.__geomathDiagnostics},'*');}else if(message?.type==='geomath:control'){if(message.action==='rotate-right')el('model-canvas').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));else if(message.action==='set-unfold'&&Number.isInteger(message.value)&&message.value>=0&&message.value<=1000){el('progress').value=String(message.value);el('progress').dispatchEvent(new Event('input',{bubbles:true}));}else if(message.action==='stop-auto'&&state.auto)el('auto-rotate').click();}});\n`;
  const end='window.__geodecoderModuleHost?.start(refreshModuleHost);';
  if(!adapted.includes(end))throw Error('Canonical diagnostics anchor changed');
  adapted=adapted.replace(end,end+diagnostics);
  const initial={language:'ms',textSize:100,motionPaused:false,contrast:'standard',autoRotate:false,showLabels:true,audioEnabled:false};
  let prepared=prepareModuleFrame(adapted,{settings:initial,instanceId:'geomath-settings-v1'});
  // Teaching state is provisional until the native writer returns a durable
  // receipt. Change presentation copy, including the translation catalog keys,
  // so the child cannot claim persistence ahead of that receipt.
  for(const [from,to] of [['Ramalan disimpan','Draf ramalan'],['Penerangan disimpan','Draf penerangan'],['Pencapaian disimpan','Aktiviti selesai pada paparan'],['Prediction saved','Prediction draft'],['Prediction recorded','Prediction draft'],['Explanation saved','Explanation draft'],['Explanation recorded','Explanation draft'],['Achievement saved','Activity complete in this view']])prepared=prepared.replaceAll(from,to);
  const template=fs.readFileSync(path.join(appRoot,'tools/module/native-adapter.template.js'),'utf8');
  const safeInline=JSON.stringify(prepared).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  const adapter=template.replace('__GEOMATH_PREPARED_SOURCE__',()=>safeInline);
  const output=path.join(appRoot,'assets/module');fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'canonical-module.html'),canonical);
  fs.writeFileSync(path.join(output,'native-adapter.js'),adapter);
  fs.writeFileSync(path.join(output,'index.html'),'<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\' \'unsafe-inline\'; style-src \'unsafe-inline\'; frame-src \'self\' about:; img-src data:; connect-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'"><title>GeoMath Learning</title><style>html,body,iframe{margin:0;border:0;width:100%;height:100%;overflow:hidden}iframe{display:block}</style></head><body><iframe id="module" title="GeoMath interactive learning" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe><script src="native-adapter.js"></script></body></html>\n');
  const files=['canonical-module.html','index.html','native-adapter.js'].map(name=>{const bytes=fs.readFileSync(path.join(output,name));return {path:`assets/module/${name}`,sha256:sha256(bytes),bytes:bytes.length};});
  const manifest={schema_version:1,feature:'learning',source_commit:SOURCE_COMMIT,digital_version:'2.9.1',module_version:'1.6.2',entry_point:'assets/module/index.html',canonical_build:'digital/module/tools/build.mjs',canonical_html_sha256:sha256(Buffer.from(canonical)),offline:true,module_progress_protocol:1,module_settings_version:1,native_bridge_version:1,adapter_version:1,files};
  fs.writeFileSync(path.join(output,'manifest.json'),json(manifest));
  const contracts=await exportContracts(sourceRoot,treePath);
  const lock={schema_version:1,repository:'unDead41/geodecoder',app_base_commit:'38f061af963256528d5060ff076bae9ee05eafc3',canonical_branch:'main-digitalized',firmware_main_reference:{commit:'25836eb1a6f24459aace8a3980ae880a13e3b488',version:'2.0.2',modified:false},canonical_commit:SOURCE_COMMIT,canonical_tree:'ce89242bbf9409c6ccad5129631dfe8ac3a52db8',digital_version:'2.9.1',module_version:'1.6.2',bank_version:`bank15-sha256:${contracts.bankHash}`,ruleset:'single-attempt-v1',schemas:{module_progress:1,module_settings:1,native_envelope:1,solo_snapshot:1,formative_record:1,asset_manifest:1},source_inputs:provenance,feature_manifests:['assets/contracts/manifest.json','assets/module/manifest.json'],module_build:{command:'node tools/module/build_module.mjs <canonical-root> <recursive-tree.json>',source_built:true,canonical_html_sha256:manifest.canonical_html_sha256,adapter_version:1},limitations:['Android device smoke must be recorded separately; source/build checks are not Android WebView evidence.']};
  fs.writeFileSync(path.join(appRoot,'docs/source_lock.json'),json(lock));
  console.log(`Bundled source-built canonical module offline (${files.reduce((n,file)=>n+file.bytes,0)} bytes), with separately versioned wrapper and hash manifest.`);
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
