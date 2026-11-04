import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from './app-fixture.mjs';
const record={activity:'volume',stage:'explanation',prediction:'18 kiub',result:'18 kiub diperhatikan',explanation:'Tiga lapisan enam kiub.',completed:true};
const context=(a,session,progress)=>a.receive(a.parent,{type:'geodecoder:module-context',protocol:1,session,theme:'light',progress});
test('records show real reflections; revisit keeps achievement and session change clears the view',()=>{
 const a=app(true,{embedded:true});context(a,'record-session',[record]);assert.match(a.nodes['module-count'].textContent,/1 \/ 4/);
 assert.equal(a.nodes['module-record-stage-volume'].textContent,'Selesai');assert.equal(a.nodes['module-record-stage-area'].textContent,'Belum direkod');assert.match(a.nodes['module-summary'].textContent,/Tiga lapisan enam kiub/);
 const messages=a.messages.length;a.click('module-record-action-volume');assert.equal(a.nodes['labs-canvas'].dataset.lab,'volume');assert.match(a.nodes['module-count'].textContent,/1 \/ 4/);assert.equal(a.messages.length,messages);
 context(a,'new-record-session',[]);assert.equal(a.nodes['module-record-stage-volume'].textContent,'Belum direkod');assert.ok(!a.nodes['module-summary'].textContent.includes(record.explanation));assert.equal(a.nodes['module-record-meter'].getAttribute('value'),'0');
});

test('record locale updates reuse focusable nodes and keep pupil text literal',()=>{
 let refresh;const host={language:'ms',settings:{autoRotate:false},start:fn=>{refresh=fn;fn({autoRotate:false});}},a=app(true,{host,embedded:true});
 context(a,'literal-record',[{...record,explanation:'<img src=x onerror=alert(1)> & original words'}]);
 const action=a.nodes['module-record-action-volume'];host.language='en';refresh({language:'en',textSize:150,audioEnabled:false});
 assert.equal(a.nodes['module-record-action-volume'],action);assert.equal(action.textContent,'Revisit');assert.equal(a.nodes['module-record-stage-area'].textContent,'Not recorded');
 assert.match(a.nodes['module-summary'].textContent,/<img src=x onerror=alert\(1\)> & original words/);assert.deepEqual(a.duplicateIds(),[]);
});
