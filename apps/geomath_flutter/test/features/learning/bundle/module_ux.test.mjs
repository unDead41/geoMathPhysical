import assert from 'node:assert/strict';
import test from 'node:test';
import {teachingRuntime,nativeWrapper} from './runtime_fixture.mjs';
import {learningSchema} from '../../../../tools/module/learning_schema.mjs';

const cameraPresets={front:[0,0],back:[Math.PI,0],left:[-Math.PI/2,0],right:[Math.PI/2,0],top:[0,Math.PI/2],bottom:[0,-Math.PI/2],isometric:[.55,.35]};
const fixture=()=>teachingRuntime({canvas:true,transform:code=>code.replace(/\}\)\(\);\s*$/,'globalThis.uxTest={state,mainRenderer,notesRenderer,notesNetRenderer,viewRenderers,drawMain,drawViews};})();')});
const pointer=(node,type,id,x,y)=>node.dispatchEvent({type,pointerId:id,clientX:x,clientY:y,pointerType:'touch',button:0,bubbles:true});
function visiblePoint(renderer,except=null){
  for(const face of [...renderer.hitFaces].reverse()){
    const x=face.pts.reduce((sum,p)=>sum+p[0],0)/face.pts.length,y=face.pts.reduce((sum,p)=>sum+p[1],0)/face.pts.length;
    if(face.id!==except&&renderer.pick(x,y)===face.id)return {id:face.id,x,y};
  }
  assert.fail('Canonical renderer has a visible physical surface');
}

test('camera presets preserve exploration, unfolding, zoom and physical selection without a native route transition',()=>{
  const r=fixture();r.action({action:'launch',section:'explore',shape:'cuboid'});
  r.action({action:'fold',value:.37});r.action({action:'zoom',delta:.2});r.action({action:'selectFace',id:2});
  for(const [view,[yaw,pitch]] of Object.entries(cameraPresets)){
    const result=r.action({action:'preset',view});
    assert.equal(result.result.ok,true,view);assert.equal(result.checkpoint.section,'explore');assert.equal(result.transitionCheckpoint,null);
    assert.equal(result.checkpoint.explore.yaw,yaw);assert.equal(result.checkpoint.explore.pitch,pitch);
    assert.equal(result.checkpoint.explore.progress,.37);assert.equal(result.checkpoint.explore.zoom,1.2);assert.equal(result.checkpoint.explore.selected,2);
  }
  r.action({action:'rotate',yaw:.2,pitch:-.1});const rotated=r.action({action:'checkpoint'}).checkpoint.explore;
  assert.equal(rotated.yaw,.75);assert.ok(Math.abs(rotated.pitch-.25)<1e-12);
  r.action({action:'launch',section:'views'});assert.equal(r.action({action:'preset',view:'isometric'}).result.error,'preset-unavailable');
  assert.equal(r.action({action:'view',view:'top'}).checkpoint.section,'views','real 2D view action keeps its existing contract');
});

test('canonical notes and calculator move into a resizable panel while model, raw draft and step disclosure remain mounted',()=>{
  const r=fixture();r.action({action:'launch',section:'explore',shape:'cube'});
  r.action({action:'rotate',yaw:.4,pitch:-.15});r.action({action:'fold',value:.43});r.action({action:'selectFace',id:1});
  const model=r.nodes['model-canvas'],study=r.nodes['study-panel'],home=study.parentElement;
  const before=r.action({action:'checkpoint'}).checkpoint.explore;
  const opened=r.action({action:'panel',panel:'calculator'});
  assert.equal(opened.result.ok,true);assert.equal(opened.diagnostics.panel,'calculator');
  assert.equal(opened.checkpoint.section,'explore');assert.equal(opened.transitionCheckpoint,null);assert.deepEqual(opened.checkpoint.explore,before);
  assert.equal(r.nodes['model-canvas'],model);assert.equal(study.parentElement,r.nodes['geomath-study-content']);
  assert.equal(r.nodes['geomath-panel-size'].getAttribute('step'),'1');
  r.nodes['geomath-panel-handle'].dispatchEvent({type:'keydown',key:'ArrowUp',bubbles:true});
  assert.equal(r.nodes['geomath-panel-size'].value,'53');assert.equal(r.action({action:'checkpoint'}).diagnostics.height,53);
  assert.equal(study.closest('[data-module-native-language]'),null,'the canonical language host still owns the moved notes text');
  r.nodes['measure-a'].value='7,';r.nodes['measure-a'].dispatchEvent(new Event('input',{bubbles:true}));
  const example=r.nodes['area-example'].children[0];example.open=true;
  r.nodes['geomath-panel-size'].value='65';r.nodes['geomath-panel-size'].dispatchEvent(new Event('input',{bubbles:true}));
  assert.equal(r.action({action:'checkpoint'}).diagnostics.height,65);
  const handle=r.nodes['geomath-panel-handle'];pointer(handle,'pointerdown',9,100,200);pointer(handle,'pointermove',9,100,150);pointer(handle,'pointerup',9,100,150);
  assert.equal(r.action({action:'checkpoint'}).diagnostics.height,71);
  handle.dispatchEvent({type:'keydown',key:'End',bubbles:true});assert.equal(r.action({action:'checkpoint'}).diagnostics.height,80);
  r.action({action:'panel',panel:'none'});assert.equal(study.parentElement,home);assert.equal(r.nodes['geomath-study-drawer'].hidden,true);
  const reopened=r.action({action:'panel',panel:'notes'});assert.equal(reopened.checkpoint.notes.dimensions.a,'7,');assert.equal(reopened.checkpoint.section,'explore');
  assert.equal(r.nodes['area-example'].children[0],example);assert.equal(example.open,true);assert.deepEqual(reopened.checkpoint.explore,before);
  r.host.language='en';r.receive({channel:'geodecoder.module.preferences',type:'settings'});r.host.refresh({...r.host.settings,textSize:150,motionPaused:true});
  assert.equal(r.nodes['geomath-panel-close'].getAttribute('aria-label'),'Close panel');assert.equal(r.nodes['measure-a'].value,'7,');assert.equal(r.nodes['model-canvas'],model);
  r.action({action:'panel',panel:'calculator'});r.nodes['measure-a'].value='4';r.nodes['measure-a'].dispatchEvent(new Event('input',{bubbles:true}));
  assert.equal(r.nodes['calculated-area'].textContent,'96 cm²');assert.equal(r.nodes['calculated-volume'].textContent,'64 cm³');
  assert.match(r.nodes['note-area-formula'].textContent,/a²/,'canonical cube symbol remains readable');
  r.nodes['geomath-panel-close'].click();assert.equal(r.action({action:'checkpoint'}).diagnostics.panel,'none');
});

test('actual canonical pointer orbit, pinch and face picking retain the physical selection through net and 2D renders',()=>{
  const r=fixture();r.action({action:'launch',section:'explore',shape:'cube'});r.tick();
  const {mainRenderer,notesNetRenderer,viewRenderers}=r.context.uxTest,canvas=r.nodes['model-canvas'];
  const point=visiblePoint(mainRenderer);pointer(canvas,'pointerdown',1,point.x,point.y);pointer(canvas,'pointerup',1,point.x,point.y);
  assert.equal(r.action({action:'checkpoint'}).checkpoint.explore.selected,point.id);
  const start=r.latest().checkpoint.explore;
  pointer(canvas,'pointerdown',2,90,100);pointer(canvas,'pointermove',2,120,120);pointer(canvas,'pointerup',2,120,120);
  let moved=r.action({action:'checkpoint'}).checkpoint.explore;
  assert.ok(Math.abs(moved.yaw-start.yaw-.27)<1e-12);assert.ok(Math.abs(moved.pitch-start.pitch-.18)<1e-12);assert.equal(moved.selected,point.id,'orbit does not select an incidental face');
  pointer(canvas,'pointerdown',3,100,100);pointer(canvas,'pointerdown',4,200,100);pointer(canvas,'pointermove',4,250,100);
  pointer(canvas,'pointerup',4,250,100);pointer(canvas,'pointerup',3,100,100);
  moved=r.action({action:'checkpoint'}).checkpoint.explore;assert.equal(moved.zoom,1.5);assert.equal(moved.selected,point.id,'pinch release does not select a face');
  r.action({action:'fold',value:1});r.tick();r.action({action:'panel',panel:'notes'});
  assert.equal(r.nodes['notes-net-model'].dataset.selectedFaceId,String(point.id));
  const netPoint=visiblePoint(notesNetRenderer,point.id),net=r.nodes['notes-net-model'];
  pointer(net,'pointerdown',5,netPoint.x,netPoint.y);pointer(net,'pointerup',5,netPoint.x,netPoint.y);
  assert.equal(r.action({action:'checkpoint'}).checkpoint.explore.selected,netPoint.id,'flat-net hit uses the same physical face ID');
  assert.equal(canvas.dataset.selectedFaceId,String(netPoint.id));assert.equal(r.nodes['notes-model'].dataset.selectedFaceId,String(netPoint.id));
  r.action({action:'view',view:'front'});r.tick(100000);
  for(const renderer of viewRenderers.values())assert.equal(renderer.canvas.dataset.selectedFaceId,String(netPoint.id));
  assert.equal(r.action({action:'checkpoint'}).checkpoint.explore.selected,netPoint.id);
  const selected=r.nodes['face-legend'].children.find(n=>n.dataset.face===String(netPoint.id));
  assert.equal(selected.getAttribute('aria-pressed'),'true');assert.equal(selected.dataset.stableFaceId,String(netPoint.id));
});

test('curved tessellation selects one physical surface and no-net shapes remain honest with the panel open',()=>{
  const r=fixture();r.action({action:'launch',section:'explore',shape:'cylinder'});r.action({action:'selectFace',id:0});r.tick();
  const renderer=r.context.uxTest.mainRenderer;
  assert.ok(renderer.mesh.filter(face=>face.id===0).length>1,'curved surface retains its canonical tessellation');
  assert.deepEqual([...new Set(renderer.mesh.map(face=>face.id))].sort(),[0,1,2]);
  assert.equal(r.action({action:'selectFace',id:3}).result.error,'face-unavailable');
  for(const shape of ['sphere','hemisphere']){
    r.action({action:'launch',section:'explore',shape});r.action({action:'panel',panel:'notes'});
    const folded=r.action({action:'fold',value:1});assert.equal(folded.result.error,'net-unavailable');assert.equal(folded.checkpoint.explore.progress,0);
    assert.equal(r.nodes['notes-net-model'].hidden,true);assert.equal(r.nodes['notes-net-unavailable'].hidden,false);assert.equal(r.nodes['note-explore-net'].disabled,true);
  }
});

test('new private controls remain exact, bounded and readiness-gated in the real native wrapper',()=>{
  for(const value of [{action:'preset',view:'isometric'},{action:'panel',panel:'notes'}])assert.equal(learningSchema.action(value),true);
  for(const value of [{action:'preset',view:'north'},{action:'view',view:'isometric'},{action:'panel',panel:'notes',owner:'other'},{action:'panel',panel:'remote'}])assert.equal(learningSchema.action(value),false);
  const h=nativeWrapper();assert.equal(h.api.learningAction({action:'panel',panel:'notes'}).error,'learning-not-ready');
  h.ready();const before=h.loads();assert.equal(h.api.learningAction({action:'preset',view:'isometric'}).accepted,true);
  assert.equal(h.teaching.at(-1).value.value.view,'isometric');assert.equal(h.loads(),before,'controls never replace srcdoc');
});
