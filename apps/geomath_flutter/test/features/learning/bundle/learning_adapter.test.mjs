import assert from 'node:assert/strict';
import test from 'node:test';
import {teachingRuntime} from './runtime_fixture.mjs';
import {learningSchema} from '../../../../tools/module/learning_schema.mjs';

test('private adapter boots the actual source and all eleven models across exploration, views, notes and calculator',()=>{
  const r=teachingRuntime();
  assert.equal(r.latest().result.ok,true,JSON.stringify(r.latest()));
  for(const shape of learningSchema.models)for(const section of ['explore','views','notes','calculator']){
    const result=r.action({action:'launch',section,shape});
    assert.equal(result.result.ok,true,`${section}/${shape}: ${JSON.stringify(result.result)}`);
    assert.equal(result.checkpoint.explore.shape,shape);assert.equal(result.diagnostics.modelCount,11);assert.equal(result.checkpoint.section,section);
  }
  assert.equal(r.action({action:'launch',section:'calculator',shape:'cube'}).result.ok,true);
  assert.equal(r.nodes['calculated-area'].textContent,'96 cm²');assert.equal(r.nodes['calculated-volume'].textContent,'64 cm³');
});

test('all native sections and advanced lab modes invoke canonical controls',()=>{
  const r=teachingRuntime();
  for(const [section,modes] of Object.entries({net:['gallery','editor','studio'],volume:['compare','unit','cone','pyramid'],area:['closed','container','cavity'],composite:['roof','rocket']}))for(const mode of modes){
    const m=r.action({action:'launch',section,mode});assert.equal(m.result.ok,true,`${section}/${mode}: ${JSON.stringify(m.result)}`);assert.equal(m.checkpoint.section,section);assert.equal(m.diagnostics.labMode,mode);
  }
  for(const section of ['projection','calculation'])assert.equal(r.action({action:'launch',section}).result.ok,true,section);
  assert.equal(r.action({action:'launch',section:'area',mode:'closed'}).result.ok,true,'closed area after cavity is a supported source state');
});

test('physical face colors stay stable through all eleven models, folding, orbit and six views',()=>{
  const r=teachingRuntime();
  for(const shape of learningSchema.models){
    const start=r.action({action:'launch',section:'explore',shape});const expected=start.diagnostics.faceColors;
    for(const value of [0,.35,1]){
      const folded=r.action({action:'fold',value});assert.equal(folded.result.ok,!['sphere','hemisphere'].includes(shape));assert.deepEqual(folded.diagnostics.faceColors,expected);
      assert.deepEqual(r.action({action:'rotate',yaw:.2,pitch:.1}).diagnostics.faceColors,expected);
    }
    for(const view of ['front','back','left','right','top','bottom'])assert.deepEqual(r.action({action:'view',view}).diagnostics.faceColors,expected);
  }
});

test('checkpoint validates before mutation and restores camera, unfolding, dimensions and raw notes',()=>{
  const r=teachingRuntime();r.action({action:'launch',section:'calculator',shape:'cube'});
  r.nodes['measure-a'].value='7.5';r.nodes['measure-a'].dispatchEvent(new Event('input',{bubbles:true}));
  r.action({action:'rotate',yaw:.2,pitch:-.1});r.action({action:'fold',value:.45});
  const checkpoint=r.action({action:'checkpoint'}).checkpoint;assert.equal(learningSchema.checkpoint(checkpoint),true);
  r.action({action:'launch',section:'notes',shape:'cylinder'});
  const restored=r.action({action:'restore',checkpoint});assert.equal(restored.result.ok,true,JSON.stringify(restored.result));assert.equal(restored.checkpoint.explore.progress,.45);assert.equal(restored.checkpoint.explore.yaw,checkpoint.explore.yaw);assert.equal(restored.checkpoint.notes.dimensions.a,'7.5');
  const before=JSON.stringify(restored.checkpoint),bad=structuredClone(checkpoint);bad.explore.zoom=-5;
  const rejected=r.action({action:'restore',checkpoint:bad});assert.equal(rejected.result.ok,false);assert.equal(JSON.stringify(rejected.checkpoint),before);
});

test('canonical lab Undo, unfinished drafts and quarter speed survive a checkpoint',()=>{
  const r=teachingRuntime();r.action({action:'launch',section:'volume',mode:'unit'});
  r.nodes['unit-one'].click();r.nodes['unit-one'].click();r.nodes['guided-prediction'].value='A partial prediction';r.nodes['guided-explanation'].value='A partial explanation';r.nodes['guided-answer'].value='18';
  r.nodes['lab-speed'].value='.25';r.nodes['lab-speed'].dispatchEvent(new Event('change',{bubbles:true}));
  const checkpoint=r.action({action:'checkpoint'}).checkpoint;
  assert.equal(checkpoint.labs.snapshots.volume.volume.units,2);assert.equal(checkpoint.labs.speed,.25);assert.ok(checkpoint.labs.histories.volume.length>=2);
  r.nodes['unit-empty'].click();
  const restored=r.action({action:'restore',checkpoint});assert.equal(restored.result.ok,true,JSON.stringify(restored.result));
  assert.equal(restored.checkpoint.labs.snapshots.volume.volume.units,2);assert.equal(restored.checkpoint.labs.drafts.volume.prediction,'A partial prediction');assert.equal(r.nodes['guided-answer'].value,'18');
  assert.equal(r.action({action:'undo'}).checkpoint.labs.snapshots.volume.volume.units,1);
});

test('unsent lab inputs survive activity switches and restore without completing reflections',()=>{
  const r=teachingRuntime();r.action({action:'launch',section:'volume',mode:'unit'});
  for(const [id,value] of [['guided-prediction','Unsent volume prediction'],['guided-explanation','Unsent volume explanation'],['guided-answer','18']]){
    r.nodes[id].value=value;r.nodes[id].dispatchEvent(new Event('input',{bubbles:true}));
  }
  const switchLab=kind=>{r.nodes['lab-switch'].value=kind;r.nodes['lab-switch'].dispatchEvent(new Event('change',{bubbles:true}));};
  switchLab('net');
  const checkpoint=r.action({action:'checkpoint'}).checkpoint;
  assert.deepEqual(checkpoint.labs.drafts.volume,{prediction:'Unsent volume prediction',result:'',explanation:'Unsent volume explanation',answer:'18'});
  switchLab('volume');
  assert.equal(r.nodes['guided-prediction'].value,'Unsent volume prediction');
  assert.equal(r.nodes['guided-answer'].value,'18');
  assert.equal(r.nodes['guided-complete'].disabled,true,'raw inputs do not complete a reflection');
  assert.equal(r.messages.some(m=>m.type==='geomath:learning-progress'),false,'raw typing never emits accepted progress');
  r.nodes['guided-prediction'].value='';r.nodes['guided-explanation'].value='';r.nodes['guided-answer'].value='';
  switchLab('net');switchLab('volume');
  assert.equal(r.nodes['guided-prediction'].value,'','intentional input clearing is retained');
  assert.equal(r.action({action:'restore',checkpoint}).result.ok,true);
  switchLab('volume');
  assert.equal(r.nodes['guided-prediction'].value,'Unsent volume prediction');
  assert.equal(r.nodes['guided-explanation'].value,'Unsent volume explanation');
  assert.equal(r.nodes['guided-answer'].value,'18');
  assert.equal(r.nodes['guided-complete'].disabled,true,'restored typing cannot restore checked/completed gates');
});

test('pause and validated restore resume original net, unit, pour and transfer timelines once',()=>{
  for(const [section,mode,button] of [['net','gallery','net-fold'],['volume','unit','unit-fill'],['volume','cone','pour-one'],['volume','compare','compare-transfer-ab']]){
    const r=teachingRuntime();r.action({action:'launch',section,mode});
    if(mode==='compare'){r.nodes['compare-fill-a'].value='1000';r.nodes['compare-fill-a'].dispatchEvent(new Event('input',{bubbles:true}));}
    r.nodes[button].click();r.tick(200);const paused=r.action({action:'pause'}).checkpoint;
    assert.ok(paused.labs.motion,`${section}/${mode} has a resumable timeline`);
    const restored=r.action({action:'restore',checkpoint:paused});assert.equal(restored.result.ok,true,`${mode}: ${JSON.stringify(restored.result)}`);
    assert.deepEqual(restored.checkpoint.labs.motion,paused.labs.motion);
    const cursor=JSON.stringify(restored.checkpoint.labs.snapshots);r.tick(100000);
    assert.equal(JSON.stringify(r.action({action:'checkpoint'}).checkpoint.labs.snapshots),cursor,'restored cursor stays paused');
    r.action({action:'resume'});r.tick(100000);
    const finished=r.action({action:'checkpoint'}).checkpoint;assert.equal(finished.labs.motion,null);
    if(section==='net')assert.equal(finished.labs.snapshots.net.net.progress,1);
    if(mode==='unit')assert.equal(finished.labs.snapshots.volume.volume.units,18);
    if(mode==='cone'){assert.equal(finished.labs.snapshots.volume.volume.pours,1);r.tick(100000);assert.equal(r.action({action:'checkpoint'}).checkpoint.labs.snapshots.volume.volume.pours,1);}
    if(mode==='compare'){const c=finished.labs.snapshots.volume.compare;assert.ok(c.items[0].fill<1);assert.ok(c.items[1].fill>0);assert.equal(c.spill,0);}
  }
});

test('activity switches checkpoint suspended motion and selecting the same mode preserves it',()=>{
  const r=teachingRuntime();r.action({action:'launch',section:'net',mode:'gallery'});r.nodes['net-fold'].click();r.tick(200);
  r.action({action:'launch',section:'volume',mode:'unit'});r.nodes['unit-fill'].click();r.tick(200);
  const checkpoint=r.action({action:'pause'}).checkpoint;assert.equal(checkpoint.labs.motion.type,'unit');assert.equal(checkpoint.labs.suspended.net.type,'net');
  assert.equal(r.action({action:'restore',checkpoint}).result.ok,true);
  const resumedNet=r.action({action:'launch',section:'net',mode:'gallery'});assert.equal(resumedNet.checkpoint.labs.motion.type,'net');assert.equal(resumedNet.checkpoint.labs.suspended.volume.type,'unit');
  const elapsed=resumedNet.checkpoint.labs.motion.elapsed;assert.equal(r.action({action:'launch',section:'net',mode:'gallery'}).checkpoint.labs.motion.elapsed,elapsed);
});

test('projection keeps three-view drawings, maximum Undo, exact dimensions and raw coordinate drafts',()=>{
  const r=teachingRuntime();r.action({action:'launch',section:'projection',shape:'cuboid'});
  const checkpoint=r.action({action:'checkpoint'}).checkpoint,p=checkpoint.projection;
  const line={kind:'line',a:[1,1],b:[2,1],type:'visible'};
  for(const view of ['front','side','plan']){p.state.drawings[view]=Array.from({length:200},()=>structuredClone(line));p.state.history[view]=Array.from({length:30},()=>Array.from({length:200},()=>structuredClone(line)));}
  p.state.mode='exercise';p.state.guideStep=3;p.state.scale=2;p.state.dimensions={p:20,l:3,t:4};p.measurementDraft={p:'unfinished'};p.coordinateDraft={x1:'2,5',y1:'',x2:'-','y2':'4',radius:'2'};
  assert.ok(learningSchema.bytes(checkpoint)>65536);assert.equal(learningSchema.checkpoint(checkpoint),true);
  const restored=r.action({action:'restore',checkpoint});assert.equal(restored.result.ok,true,JSON.stringify(restored.result));assert.deepEqual(restored.checkpoint.projection,p);assert.equal(r.nodes['projection-x2'].value,'-');
  const undone=r.action({action:'undo'});assert.equal(undone.checkpoint.projection.state.history.front.length,29);
  for(const patch of [{p:21,l:3,t:4},{p:1.5,l:3,t:4},{p:2,l:3,t:4,j:1},{}]){
    const invalid=structuredClone(checkpoint);invalid.projection.state.dimensions=patch;assert.equal(learningSchema.checkpoint(invalid),false);
  }
});

test('calculation preserves bounded drafts and rejects oversized expressions without evaluation',()=>{
  const r=teachingRuntime();r.action({action:'launch',section:'calculation',shape:'cube'});
  const checkpoint=r.action({action:'checkpoint'}).checkpoint;
  checkpoint.calculation.draft.answers.formula='a'.repeat(480);checkpoint.calculation.draft.dimensions.a='incomplete';checkpoint.calculation.activeStep=2;
  const restored=r.action({action:'restore',checkpoint});assert.equal(restored.result.ok,true);assert.equal(restored.checkpoint.calculation.draft.answers.formula.length,480);assert.equal(restored.checkpoint.calculation.activeStep,0,'invalid answers cannot restore a checked gate');
  const invalid=structuredClone(checkpoint);invalid.calculation.draft.answers.formula+='a';assert.equal(learningSchema.checkpoint(invalid),false);
  assert.equal(r.window.compromised,undefined);
});

test('native workflow uses the source notes context and recomputes calculation step gates',()=>{
  const r=teachingRuntime();r.action({action:'launch',section:'calculator',shape:'cylinder'});
  r.nodes['measure-j'].value='7';r.nodes['measure-t'].value='8';r.nodes['measure-j'].dispatchEvent(new Event('input',{bubbles:true}));
  r.nodes['pi-decimal'].click();
  const workflow=r.action({action:'workflow',target:'calculation'});assert.equal(workflow.result.ok,true);assert.equal(workflow.checkpoint.calculation.draft.dimensions.j,'7');assert.equal(workflow.checkpoint.calculation.draft.dimensions.t,'8');assert.equal(workflow.checkpoint.calculation.draft.piMode,'3.142');
  r.action({action:'launch',section:'calculation',shape:'cube'});
  const checkpoint=r.action({action:'checkpoint'}).checkpoint;checkpoint.calculation.activeStep=2;checkpoint.calculation.draft.answers.formula='6*a^2';checkpoint.calculation.draft.answers.substitution='6*4^2';
  const restored=r.action({action:'restore',checkpoint});assert.equal(restored.result.ok,true);assert.equal(restored.checkpoint.calculation.activeStep,2,'recomputed source answers unlock their saved tab');
  r.action({action:'launch',section:'calculator',shape:'sphere'});assert.equal(r.action({action:'workflow',target:'projection'}).result.error,'workflow-unavailable');
  r.nodes['measure-j'].value='invalid';assert.equal(r.action({action:'workflow',target:'calculation'}).result.error,'workflow-unavailable');
});

test('source notes-to-net preserves edits made after the last native poll and its exact unfolding semantics',()=>{
  const r=teachingRuntime();const oldPoll=r.action({action:'launch',section:'notes',shape:'cube'});
  assert.equal(oldPoll.transitionCheckpoint,null,'bootstrap launch belongs to its requested native page');
  assert.equal(oldPoll.checkpoint.notes.dimensions.a,'4');
  r.nodes['measure-a'].value='7.5';r.nodes['measure-a'].dispatchEvent(new Event('input',{bubbles:true}));
  r.nodes['note-explore-net'].click();
  const destination=r.action({action:'checkpoint'});
  assert.equal(destination.result.ok,true);assert.equal(destination.checkpoint.section,'explore');
  assert.equal(destination.transitionCheckpoint.section,'notes');assert.equal(destination.transitionCheckpoint.notes.dimensions.a,'7.5');
  assert.equal(destination.diagnostics.playing,true,'the real source net action starts its target animation');
  assert.deepEqual(destination.checkpoint.explore.pausedAnimation,{direction:1,kind:'target',hold:0});
  assert.equal(learningSchema.checkpoint(destination.transitionCheckpoint),true);
  // The native owner saves and restores this origin, then seeds a new route
  // with the destination. Back therefore returns to the actual latest edit.
  const returned=r.action({action:'restore',checkpoint:destination.transitionCheckpoint});
  assert.equal(returned.checkpoint.notes.dimensions.a,'7.5');assert.equal(returned.transitionCheckpoint,null);
  const next=teachingRuntime();next.action({action:'launch',section:'explore',shape:'cube'});
  const seeded=next.action({action:'restore',checkpoint:destination.checkpoint});assert.deepEqual(seeded.checkpoint.explore.pausedAnimation,destination.checkpoint.explore.pausedAnimation);assert.equal(seeded.transitionCheckpoint,null);
  next.action({action:'resume'});next.tick(100);next.tick(1000);assert.ok(next.action({action:'checkpoint'}).checkpoint.explore.progress>0,'the same canonical target resumes after transfer');
});

test('source activity changes preserve the first origin across multiple hops until native restore',()=>{
  const r=teachingRuntime();r.action({action:'launch',section:'volume',mode:'unit'});
  r.nodes['unit-one'].click();r.nodes['guided-prediction'].value='Typed after polling';r.nodes['guided-answer'].value='18';
  r.nodes['lab-switch'].value='area';r.nodes['lab-switch'].dispatchEvent(new Event('change',{bubbles:true}));
  let destination=r.action({action:'checkpoint'});assert.equal(destination.checkpoint.section,'area');assert.equal(destination.transitionCheckpoint.section,'volume');
  assert.equal(destination.transitionCheckpoint.labs.snapshots.volume.volume.units,1);assert.equal(destination.transitionCheckpoint.labs.drafts.volume.prediction,'Typed after polling');
  r.nodes['labs-projection'].click();destination=r.action({action:'checkpoint'});
  assert.equal(destination.checkpoint.section,'projection');assert.equal(destination.transitionCheckpoint.section,'volume','intermediate sections cannot replace the native route origin');
  const returned=r.action({action:'restore',checkpoint:destination.transitionCheckpoint});assert.equal(returned.checkpoint.section,'volume');assert.equal(r.nodes['guided-answer'].value,'18');assert.equal(returned.transitionCheckpoint,null);
});

test('returning to the pending origin clears it and later source transitions capture fresh state',()=>{
  const r=teachingRuntime();r.action({action:'launch',section:'explore',shape:'cube'});r.action({action:'fold',value:.45});
  r.nodes['mode-views'].click();let view=r.action({action:'checkpoint'});assert.equal(view.transitionCheckpoint.section,'explore');assert.equal(view.transitionCheckpoint.explore.progress,.45);
  r.nodes['mode-model'].click();assert.equal(r.action({action:'checkpoint'}).transitionCheckpoint,null);
  const rotated=r.action({action:'rotate',yaw:.3,pitch:.1}).checkpoint;
  r.nodes['mode-views'].click();view=r.action({action:'checkpoint'});assert.equal(view.transitionCheckpoint.explore.yaw,rotated.explore.yaw);
  r.action({action:'restore',checkpoint:view.transitionCheckpoint});
  r.action({action:'launch',section:'calculator',shape:'cylinder'});r.action({action:'restore',checkpoint:r.action({action:'checkpoint'}).checkpoint});
  r.nodes['measure-j'].value='6';r.nodes['measure-j'].dispatchEvent(new Event('input',{bubbles:true}));r.nodes['pi-decimal'].click();
  const workflow=r.action({action:'workflow',target:'calculation'});assert.equal(workflow.transitionCheckpoint.section,'calculator');assert.equal(workflow.transitionCheckpoint.notes.dimensions.j,'6');assert.equal(workflow.checkpoint.calculation.draft.piMode,'3.142');
});

test('source net export contains the actual safe SVG and mobile shell retains advanced controls',()=>{
  const r=teachingRuntime();r.action({action:'launch',section:'net',mode:'gallery'});
  const result=r.action({action:'export-net'});assert.equal(result.result.ok,true,JSON.stringify(result.result));
  const exported=r.messages.find(m=>m.type==='geomath:learning-export').export;
  assert.equal(exported.format,'image/svg+xml');assert.match(exported.svg,/^<svg /);assert.match(exported.svg,/<polygon /);assert.match(exported.svg,/width="[\d.]+mm"/);
  const before=r.messages.filter(m=>m.type==='geomath:learning-export').length;r.nodes['net-print-action'].click();assert.equal(r.messages.filter(m=>m.type==='geomath:learning-export').length,before+1);
  assert.match(r.prepared,/id="geomath-native-layout"/);assert.match(r.prepared,/\.module-sidebar,#module-intro,#model-picker-panel/);assert.match(r.prepared,/min-height:48px!important/);
  assert.match(r.prepared,/#note-check-steps,#note-draw-projections,#calculation-notes/);
  for(const id of ['studio-shape','volume-kind','area-shape','workshop-lid','comp-size'])assert.ok(r.nodes[id],id);
});

test('invalid semantic geometry and surface checkpoints fail atomically',()=>{
  const r=teachingRuntime();r.action({action:'launch',section:'area',mode:'closed'});
  const before=r.action({action:'checkpoint'}).checkpoint;
  for(const mutate of [c=>{c.labs.surface.area.dimensions.a=0;},c=>{c.labs.snapshots.volume.compare.items[0].d={};},c=>{c.labs.snapshots.net.studio.dimensions={};},c=>{c.labs.snapshots.volume.volume.d={p:1000,l:1000,t:1000};},c=>{c.labs.histories.volume.push({...structuredClone(c.labs.snapshots.volume),volume:{...c.labs.snapshots.volume.volume,d:{}}});}]){
    const invalid=structuredClone(before);mutate(invalid);
    const rejected=r.action({action:'restore',checkpoint:invalid});assert.equal(rejected.result.ok,false);assert.deepEqual(rejected.checkpoint,before);
  }
});

test('unknown actions, stale private sequences, malformed checkpoints and fake actors cannot run',()=>{
  const r=teachingRuntime();const before=r.latest().checkpoint;
  assert.equal(r.action({action:'evaluate',code:'globalThis.compromised=true'}).result.ok,false);
  assert.equal(r.action({action:'launch',section:'net',owner:'other'}).result.ok,false);
  r.receive({type:'geomath:learning-action',version:1,sequence:1,value:{action:'launch',section:'notes'}});
  assert.equal(r.latest().checkpoint.section,before.section);
  const invalid=structuredClone(before);invalid.explore.yaw=Infinity;assert.equal(learningSchema.checkpoint(invalid),false);
  assert.equal(learningSchema.action({action:'restore',checkpoint:{...before,owner:'other'}}),false);
});
