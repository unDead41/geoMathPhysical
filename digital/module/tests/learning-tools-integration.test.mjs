import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {app} from './app-fixture.mjs';

test('two learning tools have independent accessible entry points in the shipped HTML',()=>{
 const html=fs.readFileSync(new URL('../GeoDecoder_Modul_V1.html',import.meta.url),'utf8');
 for(const id of ['learn-projection','learn-calculation','projection-panel','calculation-panel','note-check-steps','note-draw-projections'])assert.match(html,new RegExp('id="'+id+'"'));
 for(const id of ['projection-panel','calculation-panel'])assert.match(html,new RegExp('id="'+id+'"[^>]*data-module-native-language'));
});
test('existing notes, labs and host startup still work before either new tool is opened',()=>{
 let refresh,starts=0;const host={language:'ms',settings:{autoRotate:false},start:fn=>{starts++;refresh=fn;fn({autoRotate:false});}};
 const a=app(true,{host});assert.equal(starts,1);a.click('learn-notes');a.nodes['measure-a'].value='7,5';a.nodes['measure-a'].emit('input');
 refresh({language:'en',textSize:150});assert.equal(a.nodes['measure-a'].value,'7,5');assert.equal(a.nodes['calculated-volume'].textContent,'421.88 cm³');
 a.click('learn-labs');a.click('net-mode-editor');assert.equal(a.nodes['guided-begin'].disabled,false);
 assert.equal(a.nodes['projection-panel'].hidden,true);assert.equal(a.nodes['calculation-panel'].hidden,true);assert.match(a.nodes['module-count'].textContent,/0 \/ 4/);
});

test('opening both lazy tools preserves unique DOM ids and a single active section',()=>{
 const a=app();a.click('learn-projection');a.click('learn-calculation');
 assert.deepEqual(a.duplicateIds(),[]);
 assert.equal(a.nodes['projection-panel'].hidden,true);assert.equal(a.nodes['calculation-panel'].hidden,false);
 assert.equal(a.nodes['shape-picker'].hidden,true);assert.equal(a.nodes['learn-calculation'].getAttribute('aria-pressed'),'true');
 assert.equal(a.pending(),0);assert.match(a.nodes['module-count'].textContent,/0 \/ 4/);
});

test('notes send current dimensions and pi to calculation checks and changed notes invalidate old checks',()=>{
 const a=app();a.click('learn-notes');a.nodes['measure-a'].value='7,5';a.nodes['measure-a'].emit('input');a.click('note-check-steps');
 assert.equal(a.nodes['calculation-dimension-a'].value,'7.5');
 a.nodes['calculation-formula'].value='6*a^2';a.nodes['calculation-formula'].emit('input');a.click('calculation-check-formula');assert.equal(a.nodes['calculation-substitution'].disabled,false);
 a.click('learn-notes');a.nodes['measure-a'].value='2';a.nodes['measure-a'].emit('input');a.click('note-check-steps');
 assert.equal(a.nodes['calculation-dimension-a'].value,'2');assert.equal(a.nodes['calculation-substitution'].disabled,true);
 a.click('learn-notes');a.nodes['measure-a'].value='0';a.nodes['measure-a'].emit('input');a.click('note-check-steps');assert.equal(a.nodes['study-panel'].hidden,false);
});

test('host language changes preserve pupil drafts and a new session clears them without progress writes',()=>{
 let refresh;const host={language:'ms',settings:{autoRotate:false},start:fn=>{refresh=fn;fn({autoRotate:false});}};
 const a=app(true,{host,embedded:true}),context={type:'geodecoder:module-context',protocol:1,session:'learning-one',theme:'light',progress:[]};a.receive(a.parent,context);
 a.click('learn-calculation');a.nodes['calculation-formula'].value='6*a^2';a.nodes['calculation-formula'].emit('input');a.click('calculation-check-formula');
 host.language='en';refresh({language:'en',textSize:150,audioEnabled:false});assert.equal(a.nodes['calculation-formula'].value,'6*a^2');assert.equal(a.nodes['calculation-substitution'].disabled,false);assert.equal(a.nodes['learn-calculation-label'].textContent,'Calculation Steps');
 a.click('learn-projection');assert.match(a.nodes['projection-title'].textContent,/Plan.*Elevation/);a.receive(a.parent,{...context,session:'learning-two'});
 assert.equal(a.nodes['calculation-formula'].value,'');assert.equal(a.nodes['projection-panel'].dataset.mode,'guide');assert.equal(a.messages.length,1);assert.equal(a.duplicateIds().length,0);
});

test('unapplied studio measurements survive host preferences and ordinary section navigation',()=>{
 let refresh;const host={language:'ms',settings:{autoRotate:false},start:fn=>{refresh=fn;fn({autoRotate:false});}},a=app(true,{host});
 a.click('learn-projection');a.nodes['projection-measure-a'].value='7';a.nodes['projection-measure-a'].emit('input');
 host.language='en';refresh({language:'en',textSize:150,contrast:'strong'});assert.equal(a.nodes['projection-measure-a'].value,'7');
 a.click('learn-calculation');a.click('learn-projection');assert.equal(a.nodes['projection-measure-a'].value,'7');
 a.click('projection-apply-dimensions');assert.match(a.nodes['projection-model-description'].textContent,/a=7 cm/);
});
