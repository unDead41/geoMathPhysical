import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from './app-fixture.mjs';

const change=(a,id,value,type='change')=>{a.nodes[id].value=String(value);a.nodes[id].emit(type);};

test('hub opens the existing lab and returns without losing a paused fold or restarting it',()=>{
 const a=app();a.click('learn-labs');assert.equal(a.nodes['labs-hub'].hidden,false);assert.equal(a.nodes['labs-workspace'].hidden,true);
 a.click('lab-net');assert.equal(a.nodes['labs-workspace'].hidden,false);a.click('net-fold');a.advance(1200);
 const before=a.nodes['labs-canvas'].dataset.progress;a.click('lab-home');a.advance(10000);
 assert.equal(a.nodes['labs-hub'].hidden,false);assert.equal(a.nodes['labs-canvas'].dataset.progress,before);assert.equal(a.pending(),0);
 a.click('lab-net');assert.equal(a.nodes['labs-canvas'].dataset.progress,before);assert.equal(a.nodes['lab-pause'].disabled,false);
 a.click('lab-pause');a.advance(10000);assert.equal(a.nodes['labs-canvas'].dataset.progress,'1');
});

test('workspace activity select uses the existing activities, advanced modes and history',()=>{
 const a=app();a.click('learn-labs');a.click('lab-net');a.click('net-mode-studio');
 change(a,'studio-shape','cube');change(a,'studio-example','10');const original=a.nodes['labs-canvas'].dataset.valid;
 change(a,'lab-switch','volume');change(a,'compare-fill-a',500,'input');const fill=a.nodes['labs-canvas'].dataset.fillA;
 a.click('lab-home');a.click('lab-volume');assert.equal(a.nodes['labs-canvas'].dataset.fillA,fill);
 change(a,'lab-switch','area');change(a,'area-mode','cavity');assert.match(a.nodes['workshop-area'].textContent,/170/);
 change(a,'lab-switch','net');assert.equal(a.nodes['studio-shape'].value,'cube');assert.equal(a.nodes['studio-example'].value,'10');assert.equal(a.nodes['labs-canvas'].dataset.valid,original);
});

test('hub status reflects an earned result and retry retains that result without unlocking a check',()=>{
 const a=app();a.click('learn-labs');a.click('lab-volume');change(a,'volume-kind','unit');
 a.nodes['guided-prediction'].value='18 kiub';a.click('guided-begin');assert.equal(a.nodes['lab-path-experiment'].getAttribute('aria-current'),'step');
 a.click('unit-fill');a.advance(6000);assert.equal(a.nodes['lab-path-check'].getAttribute('aria-current'),'step');
 change(a,'guided-answer','18','input');a.click('guided-check');assert.equal(a.nodes['lab-path-explanation'].getAttribute('aria-current'),'step');
 a.nodes['guided-explanation'].value='Tiga lapisan dengan enam kiub setiap lapisan.';a.click('guided-complete');a.click('lab-home');
 assert.equal(a.nodes['lab-card-state-volume'].textContent,'Refleksi selesai');a.click('lab-volume');a.click('lab-retry');
 assert.equal(a.nodes['guided-check'].disabled,true);assert.equal(a.nodes['lab-card-state-volume'].textContent,'Refleksi selesai');
});

test('native hub labels follow the current host locale while retaining experimental values and drafts',()=>{
 let refresh;const host={language:'ms',settings:{},media:{matches:true,addEventListener(){}},start:fn=>{refresh=fn;fn({});}};
 const a=app(true,{host});a.click('learn-labs');a.click('lab-volume');change(a,'volume-kind','unit');
 a.nodes['guided-prediction'].value='18';a.click('guided-begin');a.click('unit-one');
 host.language='en';refresh({language:'en',textSize:150});
 assert.equal(a.nodes['lab-home-label'].textContent,'Lab hub');assert.equal(a.nodes['lab-card-title-volume'].textContent,'Volume Lab');
 assert.equal(a.nodes['labs-canvas'].dataset.units,'1');assert.equal(a.nodes['guided-prediction'].value,'18');
 a.click('lab-home');assert.equal(a.nodes['labs-title'].textContent,'Choose how you learn.');
 host.language='ms';refresh({language:'ms'});assert.equal(a.nodes['lab-card-title-volume'].textContent,'Makmal Isi Padu');
});

test('hub links dispatch the canonical studio and calculation navigation',()=>{
 const a=app();a.click('learn-labs');a.click('labs-projection');assert.equal(a.nodes['projection-panel'].hidden,false);assert.equal(a.nodes['labs-panel'].hidden,true);
 a.click('learn-labs');a.click('labs-calculation');assert.equal(a.nodes['calculation-panel'].hidden,false);assert.equal(a.nodes['labs-panel'].hidden,true);
});
