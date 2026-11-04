import test from 'node:test';
import assert from 'node:assert/strict';

let ProjectionStudio;
try{({ProjectionStudio}=await import('../src/projection-studio.mjs'));}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
class ProjectionTestNode{
 constructor(tag,registry){this.tagName=tag;this.registry=registry;this.children=[];this.attributes={};this.dataset={};this.style={};this.events={};this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.ownText='';}
 set textContent(value){this.ownText=String(value);this.children=[];}
 get textContent(){return this.ownText+this.children.map(n=>n.textContent||'').join('');}
 setAttribute(key,value){this.attributes[key]=String(value);if(key==='id'){this.id=value;this.registry[value]=this;}if(key.startsWith('data-'))this.dataset[key.slice(5)]=String(value);}
 getAttribute(key){return this.attributes[key]??null;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.ownText='';this.children=[...nodes];}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
 emit(type,data={}){for(const fn of this.events[type]??[])fn({target:this,preventDefault(){},...data});}
 click(){if(!this.disabled)this.emit('click');}
 focus(){this.focused=true;}
 getContext(){return null;}
 getBoundingClientRect(){return {left:0,top:0,width:0,height:0};}
 scrollIntoView(){}
}
function projectionFixture(){
 assert.equal(typeof ProjectionStudio,'function');
 const nodes={},oldDocument=globalThis.document,oldWindow=globalThis.window;
 const make=tag=>new ProjectionTestNode(tag,nodes);
 globalThis.document={createElement:make,createElementNS:(_,tag)=>make(tag),documentElement:make('html')};globalThis.window={addEventListener(){}};
 let language='ms';const root=make('section'),messages=[],spoken=[];
 const studio=new ProjectionStudio({root,announce:value=>messages.push(value),getLanguage:()=>language,onDescribe:value=>spoken.push(value)});
 return {studio,root,nodes,messages,spoken,setLanguage:value=>{language=value;studio.refreshLanguage();},restore(){globalThis.document=oldDocument;globalThis.window=oldWindow;}};
}
const projectionStartExercise=f=>{f.studio.open();for(let i=0;i<3;i++)f.nodes['projection-guide-next'].click();f.nodes['projection-practise'].click();assert.equal(f.studio.state.mode,'exercise');};
const projectionAdd=(f,values)=>{for(const [key,value] of Object.entries(values))f.nodes['projection-'+key].value=String(value);f.nodes['projection-add'].click();};

test('construction is lazy, and independent practice follows a worked example without copying it',()=>{
 const f=projectionFixture();try{
  assert.equal(f.root.children.length,0);f.studio.open('pyramid');assert.equal(f.studio.state.mode,'guide');assert.equal(f.nodes['projection-practise'].disabled,true);
  for(let i=0;i<3;i++)f.nodes['projection-guide-next'].click();assert.equal(f.nodes['projection-practise'].disabled,false);f.nodes['projection-practise'].click();
  assert.deepEqual(f.studio.state.drawings,{front:[],side:[],plan:[]});assert.equal(f.nodes['projection-title'].textContent,'Studio Pelan & Dongakan');
  assert.ok(f.nodes['projection-sheet']);assert.match(f.root.textContent,/45°/);
 }finally{f.restore();}
});
test('keyboard coordinate entry, selection, delete, undo and clear edit the real three-view drafts',()=>{
 const f=projectionFixture();try{
  projectionStartExercise(f);projectionAdd(f,{x1:1,y1:1,x2:5,y2:1});assert.equal(f.studio.state.drawings.front.length,1);
  f.nodes['projection-selection'].value='0';f.nodes['projection-selection'].emit('change');f.nodes['projection-delete'].click();assert.equal(f.studio.state.drawings.front.length,0);
  f.nodes['projection-undo'].click();assert.equal(f.studio.state.drawings.front.length,1);f.nodes['projection-clear'].click();assert.equal(f.studio.state.drawings.front.length,0);f.nodes['projection-undo'].click();assert.equal(f.studio.state.drawings.front.length,1);
  f.nodes['projection-active-view'].value='plan';f.nodes['projection-active-view'].emit('change');f.nodes['projection-tool'].value='circle';f.nodes['projection-tool'].emit('change');projectionAdd(f,{x1:3,y1:3,radius:2});
  assert.deepEqual(f.studio.state.drawings.plan,[{kind:'circle',center:[3,3],r:2,type:'visible'}]);assert.equal(f.studio.state.drawings.front.length,1);
 }finally{f.restore();}
});
test('each view has independent feedback and feedback clears after editing that view',()=>{
 const f=projectionFixture();try{
  projectionStartExercise(f);projectionAdd(f,{x1:1,y1:1,x2:5,y2:1});f.nodes['projection-check-front'].click();assert.equal(f.studio.state.results.front.valid,false);assert.equal(f.studio.state.results.plan,null);
  projectionAdd(f,{x1:5,y1:1,x2:5,y2:5});assert.equal(f.studio.state.results.front,null);f.nodes['projection-check-plan'].click();assert.equal(f.studio.state.results.plan.issues[0].code,'missing');
 }finally{f.restore();}
});
test('language, close and reopen preserve drafts while a new context erases them',()=>{
 const f=projectionFixture();try{
  projectionStartExercise(f);projectionAdd(f,{x1:1,y1:1,x2:5,y2:1});const draft=structuredClone(f.studio.state.drawings);
  f.setLanguage('en');assert.equal(f.nodes['projection-title'].textContent,'Plan & Elevation Studio');assert.deepEqual(f.studio.state.drawings,draft);
  f.studio.close();assert.equal(f.root.hidden,true);f.studio.open('cube');assert.deepEqual(f.studio.state.drawings,draft);
  f.studio.resetContext();assert.deepEqual(f.studio.state.drawings,{front:[],side:[],plan:[]});assert.equal(f.studio.state.mode,'guide');
 }finally{f.restore();}
});
test('scale and shape changes invalidate old checks, use new geometry and clearly restart the guide',()=>{
 const f=projectionFixture();try{
  projectionStartExercise(f);projectionAdd(f,{x1:1,y1:1,x2:5,y2:1});f.nodes['projection-check-front'].click();
  f.nodes['projection-scale'].value='2';f.nodes['projection-scale'].emit('change');assert.equal(f.studio.state.scale,2);assert.equal(f.studio.views.front.width,2);assert.equal(f.studio.state.mode,'guide');assert.equal(f.studio.state.results.front,null);
  f.nodes['projection-shape'].value='assembly-recess';f.nodes['projection-shape'].emit('change');assert.equal(f.studio.model.cells.length,17);assert.ok(f.studio.views.front.primitives.some(p=>p.type==='hidden'));
 }finally{f.restore();}
});
test('bad coordinates never create zero-length, non-finite, negative-radius or off-board primitives',()=>{
 const f=projectionFixture();try{
  projectionStartExercise(f);projectionAdd(f,{x1:1,y1:1,x2:1,y2:1});assert.equal(f.studio.state.drawings.front.length,0);assert.ok(f.nodes['projection-entry-error'].textContent);
  projectionAdd(f,{x1:'NaN',y1:1,x2:5,y2:1});assert.equal(f.studio.state.drawings.front.length,0);assert.equal(f.nodes['projection-x1'].getAttribute('aria-invalid'),'true');
  f.nodes['projection-tool'].value='circle';f.nodes['projection-tool'].emit('change');projectionAdd(f,{x1:1,y1:1,radius:-1});assert.equal(f.studio.state.drawings.front.length,0);
  projectionAdd(f,{x1:1,y1:1,radius:99});assert.equal(f.studio.state.drawings.front.length,0);
 }finally{f.restore();}
});
test('board arrows and Enter offer a non-drag drawing alternative and Escape cancels a pending point',()=>{
 const f=projectionFixture();try{
  projectionStartExercise(f);const board=f.nodes['projection-grid-front'];board.emit('keydown',{key:'Home'});board.emit('keydown',{key:'Enter'});assert.ok(f.studio.state.pending);
  board.emit('keydown',{key:'ArrowRight'});board.emit('keydown',{key:'Enter'});assert.equal(f.studio.state.drawings.front.length,1);assert.equal(f.studio.state.pending,null);
  board.emit('keydown',{key:'Enter'});board.emit('keydown',{key:'Escape'});assert.equal(f.studio.state.pending,null);
 }finally{f.restore();}
});
test('the optional speech transcript follows the open studio, changed scale and active language',()=>{
 const f=projectionFixture();try{
  f.studio.open('cone');assert.ok(f.spoken.length>0);assert.match(f.spoken.at(-1),/Kon/);assert.match(f.spoken.at(-1),/1:1/);
  f.nodes['projection-scale'].value='2';f.nodes['projection-scale'].emit('change');assert.match(f.spoken.at(-1),/1:2/);
  f.setLanguage('en');assert.match(f.spoken.at(-1),/Cone/);assert.match(f.spoken.at(-1),/right to left/);
  f.studio.close();const count=f.spoken.length;f.setLanguage('ms');assert.equal(f.spoken.length,count);
 }finally{f.restore();}
});
test('compact view headings separate the view name from its viewing-axis caption',()=>{
 const f=projectionFixture();try{
  f.studio.open('assembly-step');assert.equal(f.studio.boards.side.title.textContent,'Dongakan sisi kanan');assert.equal(f.studio.boards.side.direction.textContent,'+X → −X');
  f.setLanguage('en');assert.equal(f.studio.boards.side.title.textContent,'Right side elevation');assert.equal(f.studio.boards.side.direction.textContent,'+X → −X');
 }finally{f.restore();}
});

test('toolbar shortcuts use the canonical tool; Undo affects only the active view',()=>{
 const f=projectionFixture();try{
  f.studio.open();assert.equal(f.nodes['projection-quick-line'].disabled,true);for(let i=0;i<3;i++)f.nodes['projection-guide-next'].click();f.nodes['projection-practise'].click();
  f.nodes['projection-quick-circle'].click();assert.equal(f.studio.state.tool,'circle');assert.equal(f.nodes['projection-tool'].value,'circle');projectionAdd(f,{x1:3,y1:3,radius:2});f.nodes['projection-quick-line'].click();
  f.nodes['projection-active-view'].value='plan';f.nodes['projection-active-view'].emit('change');projectionAdd(f,{x1:1,y1:1,x2:5,y2:1});f.nodes['projection-undo'].click();
  assert.equal(f.studio.state.drawings.plan.length,0);assert.equal(f.studio.state.drawings.front.length,1);f.nodes['projection-check-active'].click();assert.equal(f.studio.state.results.plan.valid,false);
  f.setLanguage('en');assert.match(f.nodes['projection-quick-circle'].textContent,/Circle/);
 }finally{f.restore();}
});
