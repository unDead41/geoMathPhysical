import assert from 'node:assert/strict';
import test from 'node:test';
import {teachingRuntime,nativeWrapper} from './runtime_fixture.mjs';

const invalidScales=[NaN,Infinity,-Infinity,-1,0,1000.01,'225',null];
const settings=(r,patch)=>({channel:'geodecoder.module.preferences',version:1,instanceId:'geomath-settings-v1',type:'settings',settings:{...r.host.settings,...patch}});

test('real serialized preference host applies 225 percent and reduced motion without replacing geometry or typed notes',()=>{
  const r=teachingRuntime({preferences:true,transform:code=>code.replace(/\}\)\(\);\s*$/,'globalThis.accessibilityTest={state,learningMesh};})();')});
  r.action({action:'launch',section:'explore',shape:'cube'});r.action({action:'fold',value:.37});r.action({action:'zoom',delta:.2});r.action({action:'selectFace',id:4});
  r.action({action:'panel',panel:'calculator'});r.nodes['measure-a'].value='4.00';r.nodes['measure-a'].dispatchEvent(new Event('input',{bubbles:true}));
  r.nodes.play.click();
  const before=r.action({action:'checkpoint'});assert.equal(before.diagnostics.playing,true);
  const geometry=JSON.stringify(r.context.accessibilityTest.learningMesh('cube',before.checkpoint.explore.progress,64));
  const canvas=r.nodes['model-canvas'],study=r.nodes['study-panel'];
  r.receive(settings(r,{textSize:225,motionPaused:true}));
  assert.equal(r.host.settings.textSize,225);assert.equal(r.host.media.matches,true);
  assert.equal(r.document.documentElement.dataset.textSize,'225');assert.equal(r.document.documentElement.style['--geodecoder-text-scale'],'2.25');
  assert.equal(r.document.documentElement.dataset.motionPaused,'true');
  const after=r.action({action:'checkpoint'});assert.equal(after.diagnostics.playing,false);assert.equal(r.context.accessibilityTest.state.camera,null);
  for(const key of ['shape','progress','zoom','selected'])assert.equal(after.checkpoint.explore[key],before.checkpoint.explore[key],key);
  assert.equal(JSON.stringify(r.context.accessibilityTest.learningMesh('cube',after.checkpoint.explore.progress,64)),geometry);
  assert.equal(after.checkpoint.notes.dimensions.a,'4.00');assert.equal(r.nodes['model-canvas'],canvas);assert.equal(r.nodes['study-panel'],study);assert.equal(after.diagnostics.panel,'calculator');
  r.tick(100000);assert.equal(r.action({action:'checkpoint'}).checkpoint.explore.progress,after.checkpoint.explore.progress,'system reduced motion stops the active canonical timeline');
  r.action({action:'reset'});r.action({action:'fold',value:.5});assert.equal(r.context.accessibilityTest.state.camera,null,'camera alignment follows the actual reduced-motion media port');
  assert.match(r.prepared,/html\[data-motion-paused="true"\][^<]+animation:none!important;transition:none!important/);
});

test('child settings preserve exact effective OS percentages and reject invalid scale updates atomically',()=>{
  const r=teachingRuntime({preferences:true});
  for(const textSize of [85,100,125,150,225,237.5,450,1000]){
    r.receive(settings(r,{textSize}));assert.equal(r.host.settings.textSize,textSize);assert.equal(r.document.documentElement.style['--geodecoder-text-scale'],String(textSize/100));
  }
  const before=JSON.stringify(r.host.settings);
  for(const textSize of invalidScales){r.receive(settings(r,{textSize,motionPaused:true}));assert.equal(JSON.stringify(r.host.settings),before,String(textSize));}
});

test('native wrapper accepts effective font percentages and forwards system motion while reusing the same frame',()=>{
  const h=nativeWrapper({settings:{textSize:225,motionPaused:true}});h.ready();
  const loads=h.loads();
  let message=h.teaching.filter(entry=>entry.value.type==='settings').at(-1).value;
  assert.equal(message.settings.textSize,225);assert.equal(message.settings.motionPaused,true);
  for(const textSize of [85,100,125,150,237.5,450,1000]){
    assert.equal(h.api.updatePreferences({theme:'light',settings:{...h.config.settings,textSize,motionPaused:true}}),true);
    message=h.teaching.filter(entry=>entry.value.type==='settings').at(-1).value;assert.equal(message.settings.textSize,textSize);assert.equal(message.settings.motionPaused,true);
  }
  const before=JSON.stringify(h.api.diagnostics().settings),count=h.teaching.length;
  for(const textSize of invalidScales)assert.equal(h.api.updatePreferences({theme:'dark',settings:{...h.config.settings,textSize}}),false,String(textSize));
  assert.equal(JSON.stringify(h.api.diagnostics().settings),before);assert.equal(h.teaching.length,count);assert.equal(h.loads(),loads);
  for(const textSize of invalidScales)assert.throws(()=>nativeWrapper({settings:{textSize}}),/configuration rejected/);
});
