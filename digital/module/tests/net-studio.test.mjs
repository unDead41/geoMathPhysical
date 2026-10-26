import test from 'node:test';
import assert from 'node:assert/strict';
import {STUDIO_SHAPES,studioAdjacency,defaultStudioTree,netStudioState,studioNetMesh,cubeStudioExamples} from '../src/net-studio-geometry.mjs';
import {PRESET_NETS,presetNetMesh} from '../src/preset-nets.mjs';
import {cubeNetState} from '../src/lab-geometry.mjs';
import {NetStudio} from '../src/net-studio.mjs';
import {netPrintPlan,netPrintSVG,NetPrinter} from '../src/net-print.mjs';

const nsTestNear=(a,b,tolerance=1e-7)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tolerance,`${a} != ${b}`);
const nsTestDistance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const nsTestCenter=f=>[0,1,2].map(k=>f.vertices.reduce((sum,p)=>sum+p[k],0)/f.vertices.length);
// Independent separating-axis test: positive overlap on every polygon normal.
function nsTestIntersects(A,B){
 for(const P of [A,B])for(let i=0;i<P.length;i++){
  const p=P[i],q=P[(i+1)%P.length],axis=[q[1]-p[1],p[0]-q[0]],dot=v=>v[0]*axis[0]+v[1]*axis[1],a=A.map(dot),b=B.map(dot);
  if(Math.min(Math.max(...a),Math.max(...b))-Math.max(Math.min(...a),Math.min(...b))<1e-7)return false;
 }
 return true;
}
const nsTestTopology={cube:[6,8,12],cuboid:[6,8,12],pyramid:[5,5,8],'triangular-prism':[5,6,9],tetrahedron:[4,4,6],'pentagonal-prism':[7,10,15],'hexagonal-prism':[8,12,18]};
for(const {key} of STUDIO_SHAPES){
 test(key+': editable default is planar, connected and independently non-overlapping',()=>{
  const parents=defaultStudioTree(key),mesh=studioNetMesh(key,parents,0),state=netStudioState(key,parents);
  assert.equal(state.valid,true);assert.equal(mesh.length,nsTestTopology[key][0]);
  for(const f of mesh)for(const p of f.vertices)nsTestNear(p[2],0);
  for(let a=0;a<mesh.length;a++)for(let b=a+1;b<mesh.length;b++)assert.equal(nsTestIntersects(mesh[a].vertices,mesh[b].vertices),false);
 });
 test(key+': all faces remain rigid and actual hinge endpoints coincide through 101 frames',()=>{
  const parents=defaultStudioTree(key),reference=studioNetMesh(key,parents,0);
  for(let step=0;step<=100;step++){
   const mesh=studioNetMesh(key,parents,step/100);
   for(let id=0;id<mesh.length;id++){
    const f=mesh[id],r=reference[id];assert.equal(f.id,r.id);assert.equal(f.color,r.color);
    for(let a=0;a<f.vertices.length;a++)for(let b=a+1;b<f.vertices.length;b++)nsTestNear(nsTestDistance(f.vertices[a],f.vertices[b]),nsTestDistance(r.vertices[a],r.vertices[b]));
    if(id){const parent=mesh[parents[id]];assert.ok(f.vertices.filter(p=>parent.vertices.some(q=>nsTestDistance(p,q)<1e-7)).length>=2);}
   }
  }
 });
 test(key+': closed edited shell preserves its real face/vertex/edge topology',()=>{
  const mesh=studioNetMesh(key,defaultStudioTree(key),1),vertices=new Set(),edges=new Map(),point=p=>p.map(n=>Math.round(n*1e7)).join(',');
  for(const f of mesh)for(let i=0;i<f.vertices.length;i++){const a=point(f.vertices[i]),b=point(f.vertices[(i+1)%f.vertices.length]);vertices.add(a);const edge=[a,b].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}
  assert.deepEqual([mesh.length,vertices.size,edges.size],nsTestTopology[key]);for(const count of edges.values())assert.equal(count,2);
 });
}
test('changing a genuine triangular-prism attachment changes the flat layout while preserving closure',()=>{
 const p=defaultStudioTree('triangular-prism'),q=[null,3,1,0,0];assert.equal(netStudioState('triangular-prism',q).valid,true);assert.notDeepEqual(studioNetMesh('triangular-prism',p,0).map(nsTestCenter),studioNetMesh('triangular-prism',q,0).map(nsTestCenter));
 assert.deepEqual(studioNetMesh('triangular-prism',p,1).map(f=>f.vertices),studioNetMesh('triangular-prism',q,1).map(f=>f.vertices));
});
test('placing a face on the wrong side exposes a real overlap and highlights the implicated faces',()=>{
 const parents=defaultStudioTree('triangular-prism'),inside=[false,true],state=netStudioState('triangular-prism',parents,undefined,inside),mesh=studioNetMesh('triangular-prism',parents,0,undefined,inside);
 assert.equal(state.treeValid,true);assert.equal(state.valid,false);assert.deepEqual(state.overlaps,[[0,1]]);assert.ok(nsTestIntersects(mesh[0].vertices,mesh[1].vertices));assert.deepEqual(mesh.filter(f=>f.warning).map(f=>f.id),[0,1]);assert.equal(netPrintPlan(mesh).valid,false);
});
test('cycles, missing roots, non-adjacent edges and curved surfaces are rejected',()=>{
 assert.equal(netStudioState('tetrahedron',[null,2,1,0]).treeValid,false);assert.equal(netStudioState('cube',[1,0,1,0,0,0]).treeValid,false);assert.equal(netStudioState('cube',[null,0,0,0,0,0]).treeValid,false);assert.equal(netStudioState('cube',null).treeValid,false);
 assert.throws(()=>studioNetMesh('tetrahedron',[null,2,1,0]),RangeError);assert.throws(()=>studioNetMesh('sphere'),RangeError);assert.throws(()=>studioNetMesh('cylinder'),RangeError);assert.throws(()=>studioNetMesh('cube',undefined,NaN),RangeError);assert.throws(()=>studioNetMesh('cube',undefined,0,{a:0}),RangeError);
});
test('studio dimensions change every corresponding edge without changing the selected topology',()=>{
 const a=studioNetMesh('cube',undefined,0,{a:1.5}),b=studioNetMesh('cube',undefined,0,{a:3});for(let i=0;i<a.length;i++)for(let j=0;j<a[i].vertices.length;j++)nsTestNear(nsTestDistance(b[i].vertices[j],b[i].vertices[(j+1)%4]),2*nsTestDistance(a[i].vertices[j],a[i].vertices[(j+1)%4]));
});
test('eleven cube examples are distinct under rotations/reflections and validate through the separate cube classifier',()=>{
 const examples=cubeStudioExamples(),signatures=new Set();assert.equal(examples.length,11);
 for(const parents of examples){let cells=studioNetMesh('cube',parents,0).map(f=>nsTestCenter(f).slice(0,2).map(n=>Math.round(n/2)));const lowX=Math.min(...cells.map(p=>p[0])),lowY=Math.min(...cells.map(p=>p[1]));cells=cells.map(([x,y])=>[x-lowX,y-lowY]);assert.equal(cubeNetState(cells).valid,true);const variants=[];for(const flip of [-1,1])for(let turn=0;turn<4;turn++){let c=cells.map(([x,y])=>[flip*x,y]);for(let t=0;t<turn;t++)c=c.map(([x,y])=>[-y,x]);const mx=Math.min(...c.map(p=>p[0])),my=Math.min(...c.map(p=>p[1]));variants.push(c.map(([x,y])=>[x-mx,y-my].join(',')).sort().join(';'));}signatures.add(variants.sort()[0]);}
 assert.equal(signatures.size,11);
});
test('every ready-made net has an A4 plan with its correct number of semantic surface labels',()=>{
 for(const shape of PRESET_NETS){const p=netPrintPlan(presetNetMesh(shape.key,0),{curved:['cylinder','cone'].includes(shape.key)});assert.equal(p.valid,true,shape.key);assert.equal(p.labels.length,shape.labels.length);assert.ok(p.widthMM<=190&&p.heightMM<=267);}
});
test('print coordinates preserve physical edge lengths in millimetres at each explicit scale',()=>{
 const mesh=studioNetMesh('triangular-prism');for(const scale of [.5,1,1.5]){const p=netPrintPlan(mesh,{cmPerUnit:scale});assert.equal(p.valid,true);for(let f=0;f<mesh.length;f++)for(let i=0;i<mesh[f].vertices.length;i++){const j=(i+1)%mesh[f].vertices.length;nsTestNear(nsTestDistance(p.faces[f].points[i],p.faces[f].points[j]),nsTestDistance(mesh[f].vertices[i],mesh[f].vertices[j])*10*scale,2e-5);}}
});
test('only selected tree connections become printed folds; curved tessellation never becomes a hinge',()=>{
 for(const shape of STUDIO_SHAPES){const p=netPrintPlan(studioNetMesh(shape.key));assert.equal(p.edges.filter(e=>e.fold).length,nsTestTopology[shape.key][0]-1);}
 for(const key of ['cone','cylinder'])assert.equal(netPrintPlan(presetNetMesh(key,0),{curved:true}).edges.some(e=>e.fold),false);
});
test('printing rejects folded, empty, invalid or oversize nets without silently shrinking them',()=>{
 assert.equal(netPrintPlan([]).valid,false);assert.equal(netPrintPlan(studioNetMesh('cube',undefined,.5)).valid,false);assert.equal(netPrintPlan(studioNetMesh('cuboid'),{cmPerUnit:3}).valid,false);assert.equal(netPrintSVG(studioNetMesh('cube'),{cmPerUnit:0}).svg,'');
});
test('downloaded SVG carries real mm dimensions, a 10mm grid and a 10mm calibration ruler',()=>{
 const p=netPrintSVG(studioNetMesh('tetrahedron'),{title:'<Cubaan & semak>'});assert.match(p.svg,new RegExp('width="'+p.widthMM+'mm"'));assert.match(p.svg,/pattern[^>]+width="10" height="10"/);assert.match(p.svg,/v 2 h 10 v -2/);assert.ok(p.svg.includes('&lt;Cubaan &amp; semak&gt;'));assert.ok(!p.svg.includes('<Cubaan'));
});

class NsTestNode{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.events={};this.value='';this.style={};this.disabled=false;this.checked=false;this.textContent='';}
 setAttribute(k,v){this.attributes[k]=v;}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
 focus(){this.focused=true;}
 emit(type){for(const fn of this.events[type]||[])fn({target:this});}
}
function nsTestDocument(run){
 const previousDocument=globalThis.document,previousWindow=globalThis.window,listeners={},body=new NsTestNode(),sheet=new NsTestNode();let printCalls=0;
 globalThis.document={body,getElementById:()=>sheet,createElement:tag=>new NsTestNode(tag),createElementNS:(_,tag)=>new NsTestNode(tag)};
 globalThis.window={addEventListener:(name,fn)=>listeners[name]=fn,print:()=>{printCalls++;assert.equal(body.dataset.netPrinting,'true');}};
 try{return run({body,sheet,listeners,prints:()=>printCalls});}finally{globalThis.document=previousDocument;globalThis.window=previousWindow;}
}
test('studio controls edit real connections, retain focus and lock while folded',()=>nsTestDocument(()=>{
 let changes=0;const studio=new NetStudio({mount:new NsTestNode(),onChange:()=>changes++});studio.controls[0].value='3';studio.controls[0].emit('change');assert.equal(studio.parents[1],3);assert.equal(studio.controls[0].focused,true);assert.equal(changes,1);
 studio.render({progress:.3});assert.equal(studio.controls[0].disabled,true);studio.controls[0].value='0';studio.controls[0].emit('change');assert.equal(studio.parents[1],3);
 studio.render({progress:0});studio.sideControls[1].value='inside';studio.sideControls[1].emit('change');assert.equal(studio.valid,false);assert.equal(studio.sideControls[1].focused,true);studio.reset.emit('click');assert.equal(studio.valid,true);
 studio.shapeSelect.value='cube';studio.shapeSelect.emit('change');assert.equal(studio.exampleField.hidden,false);studio.exampleSelect.value='10';studio.exampleSelect.emit('change');assert.equal(studio.valid,true);
}));
test('printer disables invalid/oversize states and activates print isolation only after an explicit click',()=>nsTestDocument(({sheet,listeners,body,prints})=>{
 const printer=new NetPrinter({mount:new NsTestNode(),printMount:sheet}),mesh=studioNetMesh('cuboid');printer.render({mesh,title:'Kuboid',valid:false});assert.equal(printer.printButton.disabled,true);assert.equal(body.dataset.netPrinting,undefined);
 printer.render({mesh,title:'Kuboid',valid:true});assert.equal(printer.printButton.disabled,false);printer.printButton.emit('click');assert.equal(prints(),1);assert.equal(sheet.hidden,false);assert.equal(body.dataset.netPrinting,'true');listeners.afterprint();assert.equal(body.dataset.netPrinting,undefined);
 printer.scale.value='2';printer.scale.emit('change');assert.equal(printer.printButton.disabled,true);assert.match(printer.status.textContent,/A4/);
}));
