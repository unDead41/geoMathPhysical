import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {appRoot,sha256,gitBlob,replayScenario} from './export_contracts.mjs';
import {Game,SHAPES} from './reference/core.mjs';
import {QUESTIONS} from './reference/questions.mjs';
const read = name => JSON.parse(fs.readFileSync(path.join(appRoot,name),'utf8'));

test('every module and neutral contract asset is byte verified by its feature manifest',()=>{
  for(const feature of ['module','contracts']){
    const manifest=read(`assets/${feature}/manifest.json`);
    assert.equal(manifest.schema_version,1);
    for(const entry of manifest.files){const bytes=fs.readFileSync(path.join(appRoot,entry.path));assert.equal(bytes.length,entry.bytes,entry.path);assert.equal(sha256(bytes),entry.sha256,entry.path);}
  }
  const source=read('docs/source_lock.json');
  for(const name of ['core','questions','duel-state']){
    const original=source.source_inputs.find(item=>item.path===`digital/dist/${name}.mjs`);
    const bytes=fs.readFileSync(path.join(appRoot,`tools/contracts/reference/${name}.mjs`));
    assert.equal(gitBlob(bytes),original.git_blob);assert.equal(sha256(bytes),original.sha256);
  }
});
test('bank15 and five game shapes are canonical; the eleventh learning model is retained',()=>{
  assert.deepEqual(read('assets/contracts/bank15.json').questions,QUESTIONS);
  assert.equal(QUESTIONS.length,15);for(const shape of SHAPES)assert.equal(QUESTIONS.filter(q=>q.shape===shape).length,3);
  assert.equal(SHAPES.at(-1),'cone');
  const catalogue=read('assets/contracts/learning_catalogue.json');assert.equal(catalogue.models.length,11);
  assert.equal(catalogue.mesh_entry_point,'learning-mesh.mjs/studySolidMesh');
  assert.deepEqual(catalogue.models.find(m=>m.id==='sphere').physical_surface_ids,[0]);
  assert.deepEqual(catalogue.models.find(m=>m.id==='hemisphere').physical_surface_ids,[0,1]);
  const cards=read('assets/contracts/geometry_cards.json');assert.deepEqual(cards.game_shapes,SHAPES);
  for(const card of cards.cards)for(const kind of ['solid','net'])for(const face of card[kind])assert.equal(face.color,'#D5DFEA');
  for(const kind of ['solid','net'])assert.deepEqual([...new Set(cards.cards.find(c=>c.shape==='cone')[kind].map(f=>f.id))],[0,1]);
});
test('explicit RNG/clock action corpus replays against byte-identical canonical JS',()=>{
  const golden=read('assets/contracts/engine_golden.json');
  for(const scenario of golden.scenarios){
    assert.ok(scenario.actions.every(step=>Number.isFinite(step.clock_ms)));
    assert.ok(scenario.rng_draws.every(value=>value>=0&&value<1));
    assert.deepEqual(replayScenario(Game,QUESTIONS,scenario),scenario.expected,scenario.id);
    assert.equal(scenario.expected.rng_draws_consumed,scenario.rng_draws.length);
  }
  const quiz=golden.scenarios.find(s=>s.id==='quiz-perfect');assert.equal(quiz.expected.result.score,10);assert.equal(quiz.expected.result.answers.length,10);
  const practice=golden.scenarios.find(s=>s.id==='practice-mixed');assert.equal(practice.expected.result.answers.length,15);assert.ok(practice.expected.result.mistakes>0);assert.ok(practice.expected.result.skipped>0);
  const paused=practice.expected.snapshots.find(row=>row.action==='pause');const blocked=practice.expected.snapshots.find(row=>row.clock_ms===2000);assert.equal(blocked.outcome.type,'blocked');assert.equal(paused.state.elapsed_ms,blocked.state.elapsed_ms);
});

function wrapper(){
  let messageListener,loads=0;const native=[],child=[];
  const childWindow={postMessage:value=>child.push(value)};
  const frame={contentWindow:childWindow,removeAttribute(){},set srcdoc(value){loads++;this.source=value;}};
  const window={addEventListener:(name,fn)=>{if(name==='message')messageListener=fn;},GeoMathNative:{postMessage:raw=>native.push(JSON.parse(raw))}};
  vm.runInNewContext(fs.readFileSync(path.join(appRoot,'assets/module/native-adapter.js'),'utf8'),{window,document:{getElementById:()=>frame}});
  const config={instanceId:'fixture-instance-123',bridgeSession:'native-secret-123456',progressSession:'progress-nonce-123456',theme:'light',settings:{language:'ms',textSize:100,motionPaused:false,contrast:'standard',audioEnabled:false},progress:[]};
  assert.equal(window.GeoMathModule.configure(config),true);
  return {api:window.GeoMathModule,frame,native,child,config,loads:()=>loads,receive:(data,source=childWindow,origin='null')=>messageListener({data,source,origin})};
}
test('the actual adapted teaching runtime preserves mesh coordinates and physical surface colors',()=>{
  const w=wrapper();
  const scripts=[...w.frame.source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
  for(const script of scripts)new vm.Script(script);
  const runtime=scripts.find(script=>script.includes('class ModelRenderer'));
  assert.ok(runtime);
  const cut=runtime.indexOf('hydrateIcons(document);');
  const adapterStart=runtime.indexOf('const geomathFaceColor=');
  const adapterEnd=runtime.indexOf('const el=id=>document.getElementById(id);');
  assert.ok(cut>0&&adapterStart>cut&&adapterEnd>adapterStart);
  const probe=runtime.slice(0,cut)+runtime.slice(adapterStart,adapterEnd)+`\nglobalThis.probe={cards:['cube','cuboid','pyramid','cylinder','cone'].map(shape=>({shape,solid:studySolidMesh(shape),net:learningMesh(shape,1,96)})),models:MODEL_ORDER.map(shape=>({shape,mesh:studySolidMesh(shape)})),surface:studySurfacePieces('cylinder',LESSON_DATA.cylinder.defaults)};})();`;
  const context={window:{parent:{postMessage(){}}},console:{info(){}}};vm.runInNewContext(probe,context);
  const observed=JSON.parse(JSON.stringify(context.probe));
  const source=read('assets/contracts/geometry_cards.json');
  for(const card of observed.cards)for(const kind of ['solid','net']){
    const expected=source.cards.find(item=>item.shape===card.shape)[kind];
    assert.deepEqual(card[kind].map(({id,vertices})=>({id,vertices})),expected.map(({id,vertices})=>({id,vertices})));
  }
  for(const {shape,mesh} of observed.models){
    const surfaces=new Map();for(const face of mesh){if(surfaces.has(face.id))assert.equal(face.color,surfaces.get(face.id),shape);surfaces.set(face.id,face.color);}
    if(shape==='cube'||shape==='cuboid')assert.deepEqual([...surfaces.values()],['#4C8DFF','#F69B45','#E9799B','#42B883','#F4C95D','#9B7EDC']);
  }
  assert.deepEqual(observed.surface.map(piece=>piece.color),['#4C8DFF','#F4C95D','#9B7EDC']);
});
test('opaque child source and settings IDs are enforced; settings update keeps one document',()=>{
  const w=wrapper();
  assert.equal(w.api.configure,undefined);
  w.receive({type:'geodecoder:module-ready',protocol:1},{});assert.equal(w.native.length,0);
  w.receive({type:'geodecoder:module-ready',protocol:1},w.frame.contentWindow,'https://untrusted.example');assert.equal(w.native.length,0);
  w.receive({type:'geodecoder:module-ready',protocol:1});
  w.receive({channel:'geodecoder.module.preferences',version:1,instanceId:'wrong',type:'ready'});assert.equal(w.native.length,0);
  w.receive({channel:'geodecoder.module.preferences',version:1,instanceId:'geomath-settings-v1',type:'ready'});
  assert.equal(w.native.length,1);assert.equal(w.native[0].command,'ready');
  w.api.updatePreferences({theme:'dark',settings:{...w.config.settings,language:'en',textSize:150}});
  assert.equal(w.loads(),1);assert.equal(w.api.diagnostics().settings.language,'en');
  assert.ok(!JSON.stringify(w.child).includes(w.config.bridgeSession));
  assert.ok(!JSON.stringify(w.child).includes(w.config.instanceId));
  assert.ok(!JSON.stringify(w.api.diagnostics()).includes(w.config.bridgeSession));
});
test('background readiness is retried on foreground and stale progress nonce is dropped',()=>{
  const w=wrapper();w.api.setActive(false);
  w.receive({type:'geodecoder:module-ready',protocol:1});w.receive({channel:'geodecoder.module.preferences',version:1,instanceId:'geomath-settings-v1',type:'ready'});
  assert.equal(w.native.length,0);assert.equal(w.api.diagnostics().emittedReady,false);
  w.api.setActive(true);assert.equal(w.native.length,1);
  const progress={type:'geodecoder:module-progress',protocol:1,session:'old-progress-nonce',activity:'net',stage:'prediction',prediction:'Six faces',result:'',explanation:'',completed:false};
  w.receive(progress);assert.equal(w.native.length,1);
  w.receive({...progress,session:w.config.progressSession});assert.equal(w.native.length,2);assert.equal(w.native[1].payload.type,'geodecoder:module-progress');
  w.api.dispose();w.receive({...progress,session:w.config.progressSession});assert.equal(w.native.length,2);
});
