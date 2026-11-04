import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from './app-fixture.mjs';

test('calculator is a direct notes view and keeps the same measurement draft',()=>{
 const a=app();
 a.click('learn-measures');
 assert.equal(a.nodes['study-panel'].hidden,false);
 assert.equal(a.nodes['study-panel'].dataset.studyMode,'calculator');
 assert.equal(a.nodes['learn-measures'].getAttribute('aria-pressed'),'true');
 assert.equal(a.nodes['learn-notes'].getAttribute('aria-pressed'),'false');
 a.nodes['measure-a'].value='2,5';a.nodes['measure-a'].emit('input');
 a.click('learn-notes');
 assert.equal(a.nodes['study-panel'].dataset.studyMode,'notes');
 assert.equal(a.nodes['learn-measures'].getAttribute('aria-pressed'),'false');
 a.click('jump-calculate');
 assert.equal(a.nodes['study-panel'].dataset.studyMode,'calculator');
 assert.equal(a.nodes['measure-a'].value,'2,5');
 assert.equal(a.nodes['calculated-area'].textContent,'37.5 cm²');
 assert.equal(a.nodes['calculated-volume'].textContent,'15.63 cm³');
});

test('calculator navigation preserves the selected circular solid, pi and exploration pose',()=>{
 const a=app();
 a.nodes['shape-picker'].children.find(n=>n.dataset.shape==='cylinder').emit('click');
 a.nodes.progress.value='432';a.nodes.progress.emit('input');a.advance(1000);
 a.click('orbit-right');a.tick();const pose=a.state();
 a.click('learn-measures');a.click('pi-full');
 a.nodes['measure-j'].value='3.5';a.nodes['measure-j'].emit('input');
 a.click('learn-notes');a.click('learn-measures');
 assert.equal(a.nodes['measure-j'].value,'3.5');
 assert.equal(a.nodes['pi-full'].getAttribute('aria-pressed'),'true');
 a.click('learn-explore');a.tick();
 for(const key of ['shape','progress','yaw','pitch','zoom'])assert.equal(a.state()[key],pose[key],key);
 a.click('learn-labs');assert.equal(a.nodes['model-workbench'].hidden,true);
 a.click('learn-measures');assert.equal(a.nodes['model-workbench'].hidden,false);
 assert.equal(a.nodes['measure-j'].value,'3.5');
});

test('calculator validates on its button and Enter without a native form submission',()=>{
 const a=app();a.click('learn-measures');a.nodes['measure-a'].value='0';
 a.click('calculate-measures');
 assert.equal(a.nodes['measure-a'].focused,true);
 assert.equal(a.nodes['measure-a'].getAttribute('aria-invalid'),'true');
 a.nodes['measure-a'].focused=false;
 let prevented=false;
 a.nodes['notes-form'].emit('keydown',{key:'Enter',isComposing:false,target:{tagName:'INPUT'},preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(a.nodes['measure-a'].focused,true);
});
