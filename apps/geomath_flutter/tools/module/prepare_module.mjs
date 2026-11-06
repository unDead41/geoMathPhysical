import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {appRoot,sha256,json,SOURCE_COMMIT} from '../contracts/export_contracts.mjs';
import {createLearningSchema} from './learning_schema.mjs';
import {learningAdapterSource} from './learning_adapter.mjs';
import {moduleUxSource,moduleUxStyle} from './module_ux.mjs';

/** Presentation-only preparation shared by the pinned-source and offline rebuilds. */
export async function writeModuleAssets(canonical,prepareModuleFrame,helperPath=path.join(appRoot,'tools/module/surface_adapter.mjs')){
  const repositoryPalette=path.join(appRoot,'../../docs/geomath-app/face_colors.json');
  const palettePath=repositoryPalette;
  const palette=JSON.parse(fs.readFileSync(palettePath));
  const colors=palette.faces.map(face=>face.hex);
  let adapted=canonical;
  // Presentation-only adapter: preserve every canonical vertex, face ID,
  // formula, parser, projection and folding transition.
  const paletteAdapter=`\nconst geomathFaceColor=(shape,id)=>{if(typeof geomathSurfaceFaceColor==='function')return geomathSurfaceFaceColor(shape,id);const cube=${JSON.stringify(colors)};if(shape==='cylinder')return ['#4C8DFF','#F4C95D','#9B7EDC'][id]||cube[id%6];if(shape==='cone'||shape==='hemisphere')return ['#4C8DFF','#9B7EDC'][id]||cube[id%6];return cube[id%6];};\nFACE_COLORS.splice(0,6,...${JSON.stringify(colors)});const geomathPaintMesh=(shape,mesh)=>mesh.map(face=>({...face,color:geomathFaceColor(shape,face.id)}));const geomathBuildMesh=buildMesh;buildMesh=(shape,...args)=>geomathPaintMesh(shape,geomathBuildMesh(shape,...args));const geomathLearningMesh=learningMesh;learningMesh=(shape,...args)=>geomathPaintMesh(shape,geomathLearningMesh(shape,...args));const geomathPresetMesh=presetNetMesh;presetNetMesh=(shape,...args)=>geomathPaintMesh(shape,geomathPresetMesh(shape,...args));const geomathSurfacePieces=surfacePieces;surfacePieces=(shape,...args)=>geomathPaintMesh(shape,geomathSurfacePieces(shape,...args));const geomathStudyPieces=studySurfacePieces;studySurfacePieces=(shape,...args)=>geomathPaintMesh(shape,geomathStudyPieces(shape,...args));const geomathDraw=ModelRenderer.prototype.draw;ModelRenderer.prototype.draw=function(options){const mesh=options.mesh||learningMesh(options.shape,options.progress||0,options.mini?64:144);return geomathDraw.call(this,{...options,mesh:MODEL_ORDER.includes(options.shape)?geomathPaintMesh(options.shape,mesh):mesh});};\n`;
  const marker='const el=id=>document.getElementById(id);';
  if(!adapted.includes(marker))throw Error('Canonical renderer adapter anchor changed');
  adapted=adapted.replace(marker,paletteAdapter+marker).replace('number.style.backgroundColor=FACE_COLORS[id]','number.style.backgroundColor=geomathFaceColor(state.shape,id)');
  const diagnostics=`\nObject.defineProperty(window,'__geomathDiagnostics',{get:()=>Object.freeze({shape:state.shape,yaw:state.yaw,pitch:state.pitch,zoom:state.zoom,progress:state.progress,mode:state.mode,learningView:state.learningView,selected:state.selected,playing:state.playing,dimensions:LESSON_DATA[state.shape].defaults,modelCount:MODEL_ORDER.length,meshSource:'learning-mesh.mjs/studySolidMesh'}),configurable:false});\nlet geomathNativeActive=true;const geomathHidden=Object.getOwnPropertyDescriptor(Document.prototype,'hidden')?.get;Object.defineProperty(document,'hidden',{get:()=>!geomathNativeActive||Boolean(geomathHidden?.call(document)),configurable:false});window.addEventListener('message',event=>{if(event.source!==window.parent)return;const message=event.data;if(message?.type==='geomath:native-lifecycle'&&typeof message.active==='boolean'){geomathNativeActive=message.active;moduleAccess.stopSpeech();document.dispatchEvent(new Event('visibilitychange'));}else if(message?.type==='geomath:audio'&&typeof message.allowed==='boolean'&&Number.isInteger(message.revision)){if(!message.allowed)moduleAccess.stopSpeech();moduleAccess.voiceAvailability();window.parent.postMessage({type:'geomath:audio-ack',revision:message.revision},'*');}else if(message?.type==='geomath:inspect'){window.parent.postMessage({type:'geomath:diagnostics',snapshot:window.__geomathDiagnostics},'*');}else if(message?.type==='geomath:control'){if(message.action==='rotate-right')el('model-canvas').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));else if(message.action==='set-unfold'&&Number.isInteger(message.value)&&message.value>=0&&message.value<=1000){el('progress').value=String(message.value);el('progress').dispatchEvent(new Event('input',{bubbles:true}));}else if(message.action==='stop-auto'&&state.auto)el('auto-rotate').click();}});\n`;
  const end='window.__geodecoderModuleHost?.start(refreshModuleHost);';
  if(!adapted.includes(end))throw Error('Canonical diagnostics anchor changed');
  const {surfaceAdapterSource}=await import(pathToFileURL(helperPath).href);
  adapted=adapted.replace(end,end+diagnostics+surfaceAdapterSource()+moduleUxSource()+learningAdapterSource());
  const progressSource="window.parent.postMessage({type:'geodecoder:module-progress',protocol:1,session:this.session,...record},'*')";
  if(!adapted.includes(progressSource))throw Error('Canonical progress adapter anchor changed');
  adapted=adapted.replace(progressSource,"geomathLearningTransport.progress({type:'geodecoder:module-progress',protocol:1,session:this.session,...record})");
  const initial={language:'ms',textSize:100,motionPaused:false,contrast:'standard',autoRotate:false,showLabels:true,audioEnabled:false};
  // Fixed non-payload breadcrumbs distinguish parsing, renderer and optional
  // accessibility/bootstrap stalls in the real opaque Android child.
  const breadcrumb=stage=>`;console.info('GEOMATH_CHILD_STAGE ${stage}');window.parent.postMessage({type:'geomath:bootstrap-diagnostic',version:1,stage:'${stage}',code:'none',line:0},'*');`;
  const boot='renderContent();redrawSmallModels();moduleAccess.init();';
  if(adapted.split(boot).length!==2)throw Error('Canonical initial renderer bootstrap anchor changed');
  adapted=adapted.replace(boot,breadcrumb('render-start')+'renderContent();'+breadcrumb('render-end')+'redrawSmallModels();'+breadcrumb('models-end')+'moduleAccess.init();'+breadcrumb('access-end'));
  const hostBoot='window.__geodecoderModuleHost?.start(refreshModuleHost);';
  adapted=adapted.replace(hostBoot,breadcrumb('host-start')+hostBoot+breadcrumb('host-end'));
  const scriptBoot="<script>\n'use strict';\n(()=>{";
  if(!adapted.includes(scriptBoot))throw Error('Canonical script bootstrap anchor changed');
  adapted=adapted.replace(scriptBoot,scriptBoot+breadcrumb('canonical-start'));
  let prepared=prepareModuleFrame(adapted,{settings:initial,instanceId:'geomath-settings-v1'});
  // App-only additive settings extension: native sends its effective OS/user
  // text percentage, including fractional scales. Keep the pinned host source
  // unchanged and adapt only the one serialized validator in this app bundle.
  const textScaleAnchor='![100,125,150].includes(value.textSize)';
  if(prepared.split(textScaleAnchor).length!==2)throw Error('Canonical serialized text scale validator anchor changed');
  prepared=prepared.replace(textScaleAnchor,"!(typeof value.textSize==='number'&&Number.isFinite(value.textSize)&&value.textSize>0&&value.textSize<=1000)");
  const preferencesBoot='<script>window.__geodecoderModuleHost=';
  if(!prepared.includes(preferencesBoot))throw Error('Canonical preferences bootstrap anchor changed');
  prepared=prepared.replace(preferencesBoot,'<script>'+breadcrumb('preferences-start')+'window.__geodecoderModuleHost=');
  const prefStart=prepared.indexOf(breadcrumb('preferences-start'));
  const prefEnd=prepared.indexOf('</script>',prefStart);
  prepared=prepared.slice(0,prefEnd)+breadcrumb('preferences-end')+prepared.slice(prefEnd);
  // Observe the opaque child's real parsing/bootstrap milestones without
  // exporting arbitrary exception messages, code, URLs or native credentials.
  const bootstrapDiagnostic=`<script>(()=>{const codes=new Set(['Error','TypeError','SyntaxError','ReferenceError','RangeError','URIError','EvalError','AggregateError']);const report=(stage,code='none',line=0)=>window.parent.postMessage({type:'geomath:bootstrap-diagnostic',version:1,stage,code,line},'*');const code=e=>codes.has(e?.name)?e.name:'unknown';window.addEventListener('error',e=>report('error',code(e.error),Number.isSafeInteger(e.lineno)&&e.lineno>=0&&e.lineno<=1000000?e.lineno:0));window.addEventListener('unhandledrejection',e=>report('rejection',code(e.reason)));document.addEventListener('DOMContentLoaded',()=>report('dom-ready'));window.addEventListener('load',()=>report('loaded'));report('head');})();</script>`;
  if(!prepared.includes('<head>'))throw Error('Canonical bootstrap diagnostic anchor changed');
  prepared=prepared.replace('<head>','<head>'+bootstrapDiagnostic);
  // Flutter owns the website-level shell, model chooser and navigation. Keep
  // every canonical activity field and gesture alternative in the child.
  const mobileStyle=`<style id="geomath-native-layout">.site-header,.learning-navigation,.module-sidebar,#module-intro,#model-picker-panel,#note-check-steps,#note-draw-projections,#calculation-notes,body>footer{display:none!important}.module-shell,.model-workbench{display:block!important;max-width:100%!important}.module-shell{padding:.5rem!important}.module-content,.model-workbench-content{min-width:0}button,select,input:not([type=checkbox]):not([type=radio]),textarea,summary{min-height:48px!important}button{min-width:48px!important}label:has(>input[type=checkbox]),label:has(>input[type=radio]){min-height:48px;display:flex;align-items:center}#lab-area-panel .lab-field:has(> #area-mode),#lab-composite-panel .lab-field:has(> #comp-kind){display:none!important}</style>`;
  if(!prepared.includes('</head>'))throw Error('Canonical mobile style anchor changed');
  prepared=prepared.replace('</head>',mobileStyle+'<style id="geomath-module-ux">'+moduleUxStyle+'</style></head>');
  // Teaching state is provisional until the native writer returns a durable
  // receipt. Change presentation copy, including the translation catalog keys,
  // so the child cannot claim persistence ahead of that receipt.
  for(const [from,to] of [['Ramalan disimpan','Draf ramalan'],['Penerangan disimpan','Draf penerangan'],['Pencapaian disimpan','Aktiviti selesai pada paparan'],['Prediction saved','Prediction draft'],['Prediction recorded','Prediction draft'],['Explanation saved','Explanation draft'],['Explanation recorded','Explanation draft'],['Achievement saved','Activity complete in this view']])prepared=prepared.replaceAll(from,to);
  const template=fs.readFileSync(path.join(appRoot,'tools/module/native-adapter.template.js'),'utf8');
  const safeInline=JSON.stringify(prepared).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  const adapter=template.replace('__GEOMATH_PREPARED_SOURCE__',()=>safeInline).replace('__GEOMATH_LEARNING_SCHEMA__',()=>`(${createLearningSchema.toString()})()`);
  const output=path.join(appRoot,'assets/module');fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'canonical-module.html'),canonical);
  fs.writeFileSync(path.join(output,'native-adapter.js'),adapter);
  fs.writeFileSync(path.join(output,'index.html'),'<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\' \'unsafe-inline\'; style-src \'unsafe-inline\'; frame-src \'self\' about:; img-src data:; connect-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'"><title>GeoMath Learning</title><style>html,body,iframe{margin:0;border:0;width:100%;height:100%;overflow:hidden}iframe{display:block}</style></head><body><iframe id="module" title="GeoMath interactive learning" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe><script src="native-adapter.js"></script></body></html>\n');
  const files=['canonical-module.html','index.html','native-adapter.js'].map(name=>{const bytes=fs.readFileSync(path.join(output,name));return {path:`assets/module/${name}`,sha256:sha256(bytes),bytes:bytes.length};});
  const manifest={schema_version:1,feature:'learning',source_commit:SOURCE_COMMIT,digital_version:'2.9.1',module_version:'1.6.2',entry_point:'assets/module/index.html',canonical_build:'digital/module/tools/build.mjs',canonical_html_sha256:sha256(Buffer.from(canonical)),offline:true,module_progress_protocol:1,module_settings_version:1,native_bridge_version:1,adapter_version:4,learning_private_api_version:1,learning_checkpoint_schema:1,learning_checkpoint_max_bytes:2097152,files};
  fs.writeFileSync(path.join(output,'manifest.json'),json(manifest));
  return manifest;
}
