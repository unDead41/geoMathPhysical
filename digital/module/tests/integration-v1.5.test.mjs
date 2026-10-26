import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from './app-fixture.mjs';

const change=(a,id,value,type='change')=>{a.nodes[id].value=String(value);a.nodes[id].emit(type);};

test('v1.4 exploration modes remain available with an explicit honest guided scope',()=>{
 const a=app();a.click('learn-labs');assert.equal(a.nodes['guided-begin'].disabled,true);assert.match(a.nodes['guided-scope'].textContent,/Galeri dan studio/);
 a.click('net-mode-editor');assert.equal(a.nodes['guided-begin'].disabled,false);a.click('net-mode-studio');assert.equal(a.nodes['guided-begin'].disabled,true);assert.equal(a.nodes['net-print-action'].disabled,false);
 a.click('lab-volume');assert.equal(a.nodes['guided-begin'].disabled,true);assert.match(a.nodes['guided-scope'].textContent,/A\/B/);a.click('compare-full-both');a.advance(6000);assert.equal(a.nodes['labs-canvas'].dataset.fillB,'1');
 change(a,'volume-kind','unit');assert.equal(a.nodes['guided-begin'].disabled,false);
 a.click('lab-area');change(a,'area-shape','sphere');a.click('area-all');assert.equal(a.nodes['guided-begin'].disabled,true);assert.equal(a.nodes['area-open'].disabled,true);assert.match(a.nodes['area-total'].textContent,/cm²/);
 change(a,'area-mode','cavity');assert.equal(a.nodes['guided-begin'].disabled,true);assert.match(a.nodes['workshop-area'].textContent,/170/);assert.match(a.nodes['module-count'].textContent,/0 \/ 4/);
});

test('Undo restores A/B contents and the conservation ledger and cancels old transfer callbacks',()=>{
 const a=app();a.click('learn-labs');a.click('lab-volume');change(a,'compare-fill-a',1000,'input');change(a,'compare-amount',27,'input');change(a,'compare-overflow','spill');
 a.click('compare-transfer-ab');a.advance(6000);assert.equal(a.nodes['labs-canvas'].dataset.spill,'3');a.click('lab-undo');assert.equal(a.nodes['labs-canvas'].dataset.fillA,'1');assert.equal(a.nodes['labs-canvas'].dataset.fillB,'0');assert.equal(a.nodes['labs-canvas'].dataset.spill,'0');assert.match(a.nodes['compare-ledger'].textContent,/selepas pindahan bermula/);
 a.click('compare-transfer-ab');a.advance(1000);a.click('lab-undo');a.advance(20000);assert.equal(a.nodes['labs-canvas'].dataset.fillA,'1');assert.equal(a.nodes['labs-canvas'].dataset.fillB,'0');assert.equal(a.pending(),0);
});

test('Undo includes studio hinges and physical print validity',()=>{
 const a=app();a.click('learn-labs');a.click('net-mode-studio');change(a,'studio-side-1','inside');assert.equal(a.nodes['labs-canvas'].dataset.valid,'false');assert.equal(a.nodes['net-print-action'].disabled,true);
 a.click('lab-undo');assert.equal(a.nodes['labs-canvas'].dataset.valid,'true');assert.equal(a.nodes['studio-side-1'].value,'outside');assert.equal(a.nodes['net-print-action'].disabled,false);
 change(a,'studio-shape','cube');assert.equal(a.nodes['studio-example'].children.length,12);a.click('lab-undo');assert.equal(a.nodes['studio-shape'].value,'triangular-prism');
});

test('Undo includes workshop lid, cavity dimensions and selected surface groups',()=>{
 const a=app();a.click('learn-labs');a.click('lab-area');change(a,'area-mode','container');const closed=a.nodes['workshop-area'].textContent;
 a.nodes['workshop-lid'].checked=false;a.nodes['workshop-lid'].emit('change');assert.notEqual(a.nodes['workshop-area'].textContent,closed);a.click('lab-undo');assert.equal(a.nodes['workshop-lid'].checked,true);assert.equal(a.nodes['workshop-area'].textContent,closed);
 change(a,'area-mode','cavity');a.click('workshop-all');change(a,'workshop-u','2.5','input');assert.notEqual(a.nodes['workshop-area'].textContent,'Luas keseluruhan = 170 cm²');a.click('lab-undo');assert.equal(a.nodes['workshop-u'].value,'2');assert.match(a.nodes['workshop-chosen'].textContent,/170/);
});

test('Next uses the gallery easing timeline and resumes without starting a new acceleration',()=>{
 const a=app();a.click('learn-labs');a.click('lab-next');assert.ok(Math.abs(Number(a.nodes['labs-canvas'].dataset.progress)-.028)<1e-10);assert.equal(a.pending(),0);
 a.click('lab-pause');a.advance(800);assert.ok(Math.abs(Number(a.nodes['labs-canvas'].dataset.progress)-.104)<1e-10);a.click('lab-pause');const before=a.nodes['labs-canvas'].dataset.progress;a.advance(20000);assert.equal(a.nodes['labs-canvas'].dataset.progress,before);
});

test('a new parent session discards suspended callbacks and never restores a live assessment gate',()=>{
 const a=app(true,{embedded:true}),context={type:'geodecoder:module-context',protocol:1,session:'one',theme:'light',progress:[]};a.receive(a.parent,context);a.click('learn-labs');a.click('net-fold');a.advance(1200);a.click('lab-volume');a.receive(a.parent,{...context,session:'two'});a.click('lab-net');assert.equal(a.nodes['lab-pause'].disabled,true);a.advance(20000);assert.equal(a.pending(),0);assert.equal(a.nodes['guided-complete'].disabled,true);assert.equal(a.messages.length,1);
});

test('native settings media and startup callback refresh preferences without clearing input or resuming a paused scene',()=>{
 let refresh,starts=0;const media={matches:true,addEventListener(){}},settings={autoRotate:false,showLabels:true};const host={media,settings,language:'ms',audioEnabled:true,start:fn=>{starts++;refresh=fn;fn(settings);}};
 const a=app(false,{host});assert.equal(starts,1);assert.equal(a.state().auto,'false');assert.equal(a.nodes.labels.checked,true);assert.equal(a.nodes['reduced-note'].hidden,false);
 a.click('learn-notes');change(a,'measure-a','7','input');refresh({...settings,language:'en',textSize:125});assert.equal(a.nodes['measure-a'].value,'7');assert.equal(a.nodes['calculated-volume'].textContent,'343 cm³');
 a.click('learn-explore');a.click('open-net');a.advance(1000);a.click('play');const before=a.state().progress;refresh({...settings,language:'en',audioEnabled:false});a.advance(6000);assert.equal(a.state().progress,before);assert.equal(a.state().playing,'false');
});

test('optional speech follows host language, excludes network voices and obeys audio preferences',()=>{
 let refresh,last,spoken=0,cancelled=0;const host={language:'en',audioEnabled:true,settings:{},start:fn=>{refresh=fn;fn({});}};
 const speech={getVoices:()=>[{lang:'en-US',localService:false},{lang:'ms-MY',localService:true},{lang:'en-GB',localService:true}],addEventListener(){},speak:u=>{last=u;spoken++;},cancel:()=>cancelled++};
 const a=app(true,{host,speech});assert.equal(spoken,0);a.nodes['speech-transcript'].textContent='Six faces meet along their edges.';a.click('speech-play');assert.equal(last.lang,'en-GB');assert.equal(last.text,'Six faces meet along their edges.');assert.equal(last.voice.localService,true);
 host.audioEnabled=false;refresh({audioEnabled:false});assert.equal(a.nodes['speech-play'].disabled,true);assert.ok(cancelled>0);assert.match(a.nodes['speech-status'].textContent,/Audio is disabled/);
 host.audioEnabled=true;host.language='ms';refresh({audioEnabled:true,language:'ms'});a.click('speech-play');assert.equal(last.lang,'ms-MY');assert.equal(spoken,2);
});
