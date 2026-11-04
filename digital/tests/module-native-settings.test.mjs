import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {prepareModuleFrame,scaleModuleTypography,MODULE_CHANNEL} from '../dist/module-frame.mjs';
const release=JSON.parse(fs.readFileSync(new URL('../vendor/module-release.json',import.meta.url),'utf8'));
const canonical=fs.readFileSync(new URL('../vendor/'+release.path,import.meta.url),'utf8');
const initial={language:'en',textSize:150,motionPaused:true,contrast:'strong',autoRotate:true,showLabels:true,resume:false,lastSection:'explore',audioEnabled:false};
function fixture(settings=initial){
  const messages=[],errors=[],parent={postMessage:value=>messages.push(value)};
  const source=prepareModuleFrame(canonical,{settings,instanceId:'native-test'});
  const console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error));
  const dom=new JSDOM(source,{url:'https://module.invalid/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,beforeParse(win){
    Object.defineProperty(win,'parent',{value:parent});
    win.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
    win.requestAnimationFrame=()=>1;win.cancelAnimationFrame=()=>{};
    win.HTMLElement.prototype.scrollIntoView=function(){};
    win.ResizeObserver=class{observe(){}disconnect(){}};
    win.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:value=>({width:String(value).length*8}),createLinearGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]||(()=>{})});};
  }});
  const {window}=dom;
  function receive(settings,overrides={}){window.dispatchEvent(new window.MessageEvent('message',{source:parent,data:{channel:MODULE_CHANNEL,version:1,instanceId:'native-test',type:'settings',settings,...overrides}}));}
  return {dom,window,messages,errors,source,receive};
}
test('every stylesheet and typography token in the pinned artifact receives text scaling while model dimensions stay unchanged',()=>{
  const f=fixture();try{
    const original=[...canonical.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match=>match[1]);
    const prepared=[...f.source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match=>match[1]);
    assert.ok(original.length>=2);assert.match(original[0],/--text-body\s*:\s*1rem/);assert.ok((original[1].match(/font-size\s*:/g)||[]).length>=100);
    original.forEach((style,index)=>assert.equal(prepared[index],scaleModuleTypography(style)));
    const computed=f.window.getComputedStyle(f.window.document.documentElement);
    assert.match(computed.getPropertyValue('--text-body'),/calc\(1rem\s*\*\s*var\(--geodecoder-text-scale,\s*1\)\)/);
    assert.match(computed.getPropertyValue('--text-small'),/calc\(0\.875rem\s*\*\s*var\(--geodecoder-text-scale,\s*1\)\)/);
    assert.equal(computed.getPropertyValue('--geodecoder-text-scale'),'1.5');
    assert.ok(prepared[1].includes('font-size:calc(1.375rem * var(--geodecoder-text-scale,1))'));
    assert.deepEqual([...f.source.matchAll(/<canvas\b[^>]*>/gi)].map(match=>match[0]),[...canonical.matchAll(/<canvas\b[^>]*>/gi)].map(match=>match[0]));
    assert.equal(scaleModuleTypography('.stage{height:300px;width:20rem;padding:12px}h2{font-size:20px}'),'.stage{height:300px;width:20rem;padding:12px}h2{font-size:calc(20px * var(--geodecoder-text-scale,1))}');
  }finally{f.window.close();}
});
test('the actual module artifact starts through the native bridge with current preferences and both independent protocols',async()=>{
  const f=fixture();try{
    await new Promise(resolve=>f.window.setTimeout(resolve,0));
    assert.deepEqual(f.errors.map(error=>error.message.slice(0,180)),[]);
    assert.ok(f.messages.some(message=>message.type==='geodecoder:module-ready'&&message.protocol===1));
    assert.ok(f.messages.some(message=>message.channel===MODULE_CHANNEL&&message.type==='ready'));
    assert.equal(f.window.__geodecoderModuleHost.language,'en');assert.equal(f.window.__geodecoderModuleHost.audioEnabled,false);
    assert.equal(f.window.document.documentElement.lang,'en');assert.equal(f.window.document.documentElement.dataset.textSize,'150');
    assert.equal(f.window.document.getElementById('labels').checked,true);
    assert.equal(f.window.document.getElementById('auto-rotate').getAttribute('aria-pressed'),'false');
    assert.equal(f.window.document.getElementById('module-settings').textContent,'Settings');
    for(const label of ['Display options','Model direction controls','Comparison of eleven solid properties','Formula summary for eleven solids','Activity steps','Ways to explore nets','Follow faces in the preset net'])assert.ok(f.window.document.querySelector('[aria-label="'+label+'"]'),'English accessible label: '+label);
    const records=f.window.document.querySelector('details.progress-summary');
    assert.equal(records.getAttribute('aria-labelledby'),'module-records-title');
    assert.equal(f.window.document.getElementById('module-records-title').textContent,'Your learning journey');
    assert.equal(records.querySelectorAll('[id^="module-record-action-"]').length,4,'All four activity actions remain in the named disclosure');
    for(const direction of ['left','right','up','down']){
      const control=f.window.document.getElementById('orbit-'+direction);
      assert.equal(control.getAttribute('aria-label'),'Rotate solid '+direction);assert.equal(control.getAttribute('title'),'Rotate '+direction);
    }
    assert.match(f.window.document.getElementById('speech-status').textContent,/disabled|available/i);
  }finally{f.window.close();}
});
test('settings messages preserve document identity and measurements, reject stale instances, and update language/audio live',async()=>{
  const f=fixture();try{
    const doc=f.window.document;doc.getElementById('learn-notes').click();
    const input=doc.getElementById('measure-a');assert.equal(input.disabled,false);
    input.value='7.5';input.dispatchEvent(new f.window.Event('input',{bubbles:true}));
    const area=doc.getElementById('calculated-area').textContent;assert.match(area,/337.5/);
    f.receive({...initial,language:'ms',textSize:125,audioEnabled:true},{instanceId:'stale'});
    assert.equal(doc.documentElement.lang,'en');
    f.receive({...initial,language:'ms',textSize:125,audioEnabled:true});
    await new Promise(resolve=>f.window.setTimeout(resolve,0));
    assert.equal(f.window.document,doc);assert.equal(doc.documentElement.lang,'ms');assert.equal(doc.documentElement.dataset.textSize,'125');
    assert.equal(input.value,'7.5');assert.equal(doc.getElementById('calculated-area').textContent,area);assert.equal(f.window.__geodecoderModuleHost.audioEnabled,true);
    assert.equal(doc.getElementById('module-settings').textContent,'Tetapan');assert.deepEqual(f.errors.map(error=>error.message.slice(0,180)),[]);
    assert.equal(doc.getElementById('orbit-left').getAttribute('aria-label'),'Putar bongkah ke kiri');
    assert.equal(doc.querySelector('.module-tools').getAttribute('aria-label'),'Pilihan paparan');
  }finally{f.window.close();}
});
test('guided labels localize while a learner prediction and paused model stay unchanged',async()=>{
  const f=fixture({...initial,motionPaused:false,autoRotate:false});try{
    const doc=f.window.document;doc.getElementById('learn-labs').click();doc.getElementById('net-mode-editor').click();
    const prediction=doc.getElementById('guided-prediction');prediction.value='Kubus is my own prediction <b>kept literally</b>';
    prediction.dispatchEvent(new f.window.Event('input',{bubbles:true}));doc.getElementById('guided-begin').click();
    await new Promise(resolve=>f.window.setTimeout(resolve,0));
    assert.match(doc.getElementById('guided-stage').textContent,/Current stage.*Try/);
    assert.match(doc.getElementById('guided-scope').textContent,/self-reported/);
    assert.equal(doc.getElementById('auto-rotate').getAttribute('aria-pressed'),'false');
    f.receive({...initial,motionPaused:false,autoRotate:false,language:'ms'});f.receive({...initial,motionPaused:false,autoRotate:false,language:'en'});
    await new Promise(resolve=>f.window.setTimeout(resolve,0));
    assert.equal(prediction.value,'Kubus is my own prediction <b>kept literally</b>');
    assert.equal(doc.getElementById('auto-rotate').getAttribute('aria-pressed'),'false');assert.match(doc.getElementById('guided-stage').textContent,/Current stage.*Try/);
    assert.deepEqual(f.errors.map(error=>error.message.slice(0,180)),[]);
  }finally{f.window.close();}
});
test('English lab and print preview labels translate without changing SVG geometry or print-scale values',async()=>{
  const f=fixture();try{
    const doc=f.window.document;doc.getElementById('learn-labs').click();
    await new Promise(resolve=>f.window.setTimeout(resolve,0));
    assert.match(doc.getElementById('lab-steps').textContent,/Inspect the result/);
    assert.doesNotMatch(doc.getElementById('lab-progress-value').textContent,/dilipat/);
    const print=doc.getElementById('net-print-mount');assert.match(print.textContent,/Print and build a model/);assert.match(print.textContent,/Paper model measurement scale/);assert.match(print.textContent,/Include a 1 cm grid/);assert.match(print.textContent,/Download SVG/);
    const svg=print.querySelector('svg'),paths=[...svg.querySelectorAll('path')].map(node=>node.getAttribute('d')),viewBox=svg.getAttribute('viewBox');
    assert.match(svg.textContent,/1 model unit = 1 cm · grid 1 cm/);assert.match(svg.textContent,/Ruler check: 1 cm/);assert.match(svg.textContent,/Solid lines: cut · dashed lines: fold · print at 100%/);
    assert.equal(doc.getElementById('net-print-scale').value,'1');
    f.receive({...initial,language:'ms'});f.receive({...initial,language:'en'});await new Promise(resolve=>f.window.setTimeout(resolve,0));
    assert.deepEqual([...svg.querySelectorAll('path')].map(node=>node.getAttribute('d')),paths);assert.equal(svg.getAttribute('viewBox'),viewBox);assert.equal(doc.getElementById('net-print-scale').value,'1');
  }finally{f.window.close();}
});
