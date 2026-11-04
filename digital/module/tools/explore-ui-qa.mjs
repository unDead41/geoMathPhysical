import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareModuleFrame} from '../../dist/module-frame.mjs';
import {MODEL_ORDER,MODEL_DATA} from '../src/content.mjs';
import {LESSON_DATA,calculateMeasures} from '../src/lessons.mjs';

// Extend the existing iframe QA approach. No production import/build hook.
// Output is a temporary static fixture, never a replacement vendor pin.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=process.argv[2];
if(!output||!path.isAbsolute(output))throw new Error('Pass an absolute temporary output directory');
fs.mkdirSync(output,{recursive:true});
const html=fs.readFileSync(path.join(root,'GeoDecoder_Modul_V1.html'),'utf8');
const expected=Object.fromEntries(MODEL_ORDER.map(shape=>{
 const r=calculateMeasures(shape,LESSON_DATA[shape].defaults,'22/7');
 const number=n=>new Intl.NumberFormat('ms-MY',{maximumFractionDigits:2,useGrouping:false}).format(n);
 return [shape,{area:number(r.area)+' cm²',volume:number(r.volume)+' cm³',noNet:Boolean(MODEL_DATA[shape].noNet)}];
}));
function childQa(expected){
 const get=id=>document.getElementById(id),tick=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const assert=(value,message)=>{if(!value)throw new Error(message);};
 const change=(id,value)=>{get(id).value=value;get(id).dispatchEvent(new Event(id==='extra-shape-select'?'change':'input',{bubbles:true}));};
 let configureResolve;
 const configure=config=>new Promise(resolve=>{configureResolve=resolve;parent.postMessage({type:'explore-qa-config',config},'*');});
 const pose=()=>{const s=get('model-canvas').dataset;return Object.fromEntries(['shape','progress','yaw','pitch','zoom'].map(k=>[k,s[k]]));};
 const errors=[];addEventListener('error',e=>errors.push(e.message));
 addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const report={fixture:'actual built module + prepareModuleFrame; sandbox allow-scripts; no vendor pin',checks:[],matrix:[],errors};
 const check=message=>{report.checks.push(message);parent.postMessage({type:'explore-qa-progress',message},'*');};
 const select=shape=>{const b=document.querySelector('[data-shape="'+shape+'"]');if(b)b.click();else change('extra-shape-select',shape);};
 const layout=()=>{
  const width=document.documentElement.clientWidth,scroll=document.documentElement.scrollWidth;
  const visible=e=>e.getClientRects().length>0;
  const controls=[...document.querySelectorAll('#model-workbench button,#model-workbench select,#model-workbench summary,.module-sidebar button')].filter(visible);
  const brokenHeadingWords=[];
  for(const heading of [get('study-title'),get('note-calculate-title')].filter(visible)){
   const walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);let node;
   while(node=walker.nextNode())for(const match of node.textContent.matchAll(/\S+/g)){
    const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
    if(new Set([...range.getClientRects()].filter(r=>r.width>0).map(r=>Math.round(r.top))).size>1)brokenHeadingWords.push(match[0]);
   }
  }
  return {width,scroll,brokenHeadingWords,smallTargets:controls.filter(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9;}).map(e=>({id:e.id,label:e.textContent.trim(),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))};
 };
 async function run(){
  report.checks=[];report.matrix=[];report.failure=null;
  try{
   await configure({width:1440,language:'ms',theme:'light',textSize:100,motionPaused:true});await tick();
   assert(getComputedStyle(document.querySelector('.site-header')).display==='none','Embedded app header must be hidden');
   assert(get('module-settings')&&get('module-help'),'Keep real host settings/help actions');check('Embedded shell has no duplicate app header and retains host controls');
   for(const shape of Object.keys(expected)){
    get('learn-explore').click();get('mode-model').click();select(shape);await tick();
    assert(get('model-canvas').dataset.shape===shape,'Selected solid '+shape);
    assert(get('view-grid').children.length===6,'Six views '+shape);
    const e=expected[shape];
    assert(get('open-net').disabled===e.noNet,'Net availability '+shape);
    if(!e.noNet){change('progress','1000');await tick();assert(get('model-canvas').dataset.progress==='1','Flat net '+shape);change('progress','0');}
    get('mode-views').click();await tick();
    for(const view of get('view-grid').children){view.click();await tick();assert(view.getAttribute('aria-pressed')==='true','View selection '+shape);assert(get('model-canvas').dataset.progress==='0','Closed projection '+shape);}
    get('learn-measures').click();await tick();
    assert(get('calculated-area').textContent===e.area,'Canonical area '+shape);
    assert(get('calculated-volume').textContent===e.volume,'Canonical volume '+shape);
    get('learn-notes').click();await tick();
    const canvas=get('notes-model'),pixel=canvas.getContext('2d').getImageData(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1).data;
    assert(pixel[3]>0,'Canonical note preview redraws after calculator '+shape);
    assert(get('area-example').querySelector('details')&&get('volume-example').querySelector('details'),'Both worked examples '+shape);
    check(shape+': model, net availability, six views, notes, dimensions and canonical results');
   }
   get('learn-explore').click();get('mode-model').click();select('cube');await tick();
   get('zoom-in').click();await tick();assert(get('model-canvas').dataset.zoom==='1.15','Zoom action');
   get('reset').click();await tick();assert(get('model-canvas').dataset.zoom==='1','Camera reset');
   get('orbit-right').click();await tick();const before=pose();
   get('learn-measures').click();change('measure-a','7.5');get('learn-notes').click();get('learn-measures').click();
   assert(get('measure-a').value==='7.5','Notes/calculator draft');
   change('measure-a','0');assert(get('calculated-area').textContent==='—','Invalid clears area');assert(get('measure-a').getAttribute('aria-invalid')==='true','Invalid field semantics');
   get('calculate-measures').click();assert(document.activeElement===get('measure-a'),'First invalid focus');change('measure-a','7.5');
   get('learn-explore').click();await tick();assert(JSON.stringify(pose())===JSON.stringify(before),'Camera/progress survive notes');check('Zoom, reset, orbit, invalid-input recovery, focus and measurement draft');
   for(const width of [1440,390])for(const language of ['ms','en'])for(const theme of ['light','dark'])for(const textSize of [100,150]){
    await configure({width,language,theme,textSize,motionPaused:true});await tick();
    assert(JSON.stringify(pose())===JSON.stringify(before),'Preferences/resize preserve pose');
    for(const view of ['explore','views','notes','calculator']){
     if(view==='explore'||view==='views'){get('learn-explore').click();get(view==='views'?'mode-views':'mode-model').click();}
     else get(view==='notes'?'learn-notes':'learn-measures').click();
     await tick();const result=layout();report.matrix.push({width,language,theme,textSize,view,...result});
     assert(result.scroll<=result.width+1,'Horizontal overflow '+JSON.stringify(report.matrix.at(-1)));
     assert(!result.smallTargets.length,'Undersized controls '+JSON.stringify(report.matrix.at(-1)));
     assert(!result.brokenHeadingWords.length,'Split heading words '+JSON.stringify(report.matrix.at(-1)));
     assert(document.documentElement.lang===language,'Host language');
     assert(document.documentElement.dataset.theme===theme,'Host theme');
     assert(document.documentElement.dataset.textSize===String(textSize),'Host text scale');
     if(view==='calculator')assert(get('measure-a').value==='7.5','Preferences preserve dimensions');
    }
    // Return to the identical model pose before checking the next resize.
    get('learn-explore').click();get('mode-model').click();get('reset').click();await tick();get('orbit-right').click();await tick();
   }
   check('64 rendered layout states: 1440/390 × BM/English × light/dark × 100/150% × four views');
   await configure({width:1440,language:'ms',theme:'light',textSize:100,motionPaused:true});
   get('learn-measures').click();get('reset-measures').click();get('note-check-steps').click();await tick();assert(!get('calculation-panel').hidden,'Actual calculation workshop opens');
   get('learn-notes').click();get('note-draw-projections').click();await tick();assert(!get('projection-panel').hidden,'Actual projection studio opens');
   get('learn-labs').click();await tick();assert(!get('labs-panel').hidden,'Actual labs mount');
   get('learn-explore').click();get('mode-model').click();get('reset').click();await tick();
   assert(!errors.length,'No runtime errors');check('Existing labs/projection/calculation mounts remain functional');
  }catch(e){report.failure=e.message;}
  report.finishedAt=new Date().toISOString();parent.postMessage({type:'explore-qa-report',report},'*');
 }
 addEventListener('message',e=>{if(e.source!==parent)return;if(e.data?.type==='explore-qa-config-done')configureResolve?.();if(e.data?.type==='explore-qa-run')run();});
 parent.postMessage({type:'explore-qa-child-ready'},'*');
}
const instrumented=html.replace('</body>',`<script>(${childQa.toString()})(${JSON.stringify(expected)});</script></body>`);
const initial={language:'ms',textSize:100,motionPaused:true,contrast:'standard',autoRotate:false,showLabels:false,resume:false,lastSection:'explore',audioEnabled:false};
const prepared=prepareModuleFrame(instrumented,{settings:initial,instanceId:'explore-ui-qa'});
const source=JSON.stringify(prepared).replace(/</g,'\\u003c');
fs.writeFileSync(path.join(output,'qa.html'),`<!doctype html><html lang="ms"><meta charset="utf-8"><title>GeoMath — QA Modul 1</title><style>body{margin:12px;font:14px/1.5 system-ui;background:#eaf0f6;color:#18334b}nav{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}button,select{min-height:44px;font:inherit;padding:8px}iframe{display:block;border:0;width:1440px;height:1040px;background:white}pre{max-width:1000px;white-space:pre-wrap}label{display:flex;align-items:center;gap:6px}</style><nav><b>GeoMath · QA Modul 1</b><button id="run">Jalankan matriks</button><button id="download">Muat turun laporan</button><label>Lebar<select id="width"><option>1440</option><option>390</option></select></label><label>Bahasa<select id="language"><option value="ms">BM</option><option value="en">English</option></select></label><label>Tema<select id="theme"><option value="light">Light</option><option value="dark">Dark</option></select></label><label>Teks<select id="textSize"><option>100</option><option>150</option></select></label></nav><iframe id="preview" sandbox="allow-scripts" title="Modul sebenar · viewport CSS iframe"></iframe><pre id="report" role="status">Sedia.</pre><script>
const frame=document.getElementById('preview'),get=id=>document.getElementById(id);let settings=${JSON.stringify(initial)},lastReport;
function apply(c={}){for(const [key,value] of Object.entries(c))if(get(key))get(key).value=value;frame.style.width=get('width').value+'px';settings={...settings,language:get('language').value,textSize:Number(get('textSize').value)};frame.contentWindow.postMessage({channel:'geodecoder.module.preferences',version:1,instanceId:'explore-ui-qa',type:'settings',settings},'*');frame.contentWindow.postMessage({type:'geodecoder:module-context',protocol:1,session:'explore-ui-qa-session',theme:get('theme').value,progress:[]},'*');}
addEventListener('message',e=>{if(e.source!==frame.contentWindow)return;const d=e.data;if(d?.type==='explore-qa-child-ready')apply();if(d?.type==='explore-qa-config'){apply(d.config);requestAnimationFrame(()=>requestAnimationFrame(()=>frame.contentWindow.postMessage({type:'explore-qa-config-done'},'*')));}if(d?.type==='explore-qa-progress')get('report').textContent=d.message;if(d?.type==='explore-qa-report'){lastReport=d.report;get('report').textContent=JSON.stringify(d.report,null,2);get('run').disabled=false;}});
for(const id of ['width','language','theme','textSize'])get(id).onchange=()=>apply();
get('run').onclick=()=>{get('run').disabled=true;get('report').textContent='Ujian sedang berjalan…';frame.contentWindow.postMessage({type:'explore-qa-run'},'*');};
get('download').onclick=()=>{if(!lastReport)return;const url=URL.createObjectURL(new Blob([JSON.stringify(lastReport,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='geomath-module1-browser-results.json';a.click();URL.revokeObjectURL(url);};
frame.srcdoc=${source};
</script></html>`);
fs.writeFileSync(path.join(output,'index.html'),html);
console.log('Static QA fixture ready: '+path.join(output,'qa.html'));
