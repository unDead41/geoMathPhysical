import test from 'node:test';import assert from 'node:assert/strict';
import {learningMesh,studySolidMesh,fillLevelRatio,studySurfacePieces} from '../src/learning-mesh.mjs';
import {cross3,sub3,length3} from '../src/geometry.mjs';
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const area=m=>m.reduce((s,f)=>s+f.vertices.slice(1,-1).reduce((a,p,i)=>a+length3(cross3(sub3(p,f.vertices[0]),sub3(f.vertices[i+2],f.vertices[0])))/2,0),0);
test('sphere and hemisphere have correct curved/base face identities and areas',()=>{
 for(const [shape,expected,ids] of [['sphere',64*Math.PI,[0]],['hemisphere',48*Math.PI,[0,1]]]){const m=learningMesh(shape,0,96,{j:4});near(area(m),expected,expected*.004);assert.deepEqual([...new Set(m.map(f=>f.id))],ids);assert.ok(m.every(f=>f.vertices.flat().every(Number.isFinite)));}
});
test('round solids never pretend to unfold into an exact flat net',()=>{for(const s of ['sphere','hemisphere'])assert.throws(()=>learningMesh(s,.5),RangeError);});
test('round fill levels use spherical-cap volumes, not a linear height fraction',()=>{
 near(fillLevelRatio('sphere',.5),.5);assert.ok(fillLevelRatio('hemisphere',.5)<.5);
 for(const f of [.001,.1,.25,.5,.9,1]){let u=2*fillLevelRatio('sphere',f);near((3*u*u-u*u*u)/4,f);u=fillLevelRatio('hemisphere',f);near((3*u-u*u*u)/2,f);}
});
test('all eleven learning solids and their surface pieces have finite valid geometry',()=>{
 for(const key of ['cube','cuboid','pyramid','cylinder','cone','triangular-prism','tetrahedron','pentagonal-prism','hexagonal-prism','sphere','hemisphere']){const d=key==='cube'?{a:4}:key==='cuboid'?{p:4,l:3,t:2}:['cylinder','cone','sphere','hemisphere'].includes(key)?{j:3,t:4}:{a:4,t:6};const m=studySolidMesh(key,d),p=studySurfacePieces(key,d);assert.ok(m.length>0);assert.ok(p.every(x=>x.area>0));const ymin=Math.min(...m.flatMap(f=>f.vertices.map(v=>v[1])));near(ymin,0);}
});
import {viewPoint,VIEWS} from '../src/geometry.mjs';
test('six extra solids have independently calculated extents in all six orthographic directions',()=>{
 for(const key of ['triangular-prism','tetrahedron','pentagonal-prism','hexagonal-prism','sphere','hemisphere']){
  const d={a:4,t:6,j:3},mesh=learningMesh(key,0,144,d);let ext;
  if(['sphere','hemisphere'].includes(key))ext=[6,key==='sphere'?6:3,6];
  else{const n=key==='pentagonal-prism'?5:key==='hexagonal-prism'?6:3,R=4/(2*Math.sin(Math.PI/n)),angles=Array.from({length:n},(_,i)=>key==='tetrahedron'?2*i*Math.PI/n:(2*i-1)*Math.PI/n),xs=angles.map(a=>R*Math.sin(a)),zs=angles.map(a=>R*Math.cos(a));ext=[Math.max(...xs)-Math.min(...xs),6,Math.max(...zs)-Math.min(...zs)];}
  for(const [view,v] of Object.entries(VIEWS)){const ps=mesh.flatMap(f=>f.vertices).map(p=>viewPoint(p,v.yaw,v.pitch)),size=[0,1].map(i=>Math.max(...ps.map(p=>p[i]))-Math.min(...ps.map(p=>p[i]))),want=['top','bottom'].includes(view)?[ext[0],ext[2]]:['left','right'].includes(view)?[ext[2],ext[1]]:[ext[0],ext[1]];near(size[0],want[0]);near(size[1],want[1]);}
 }
});
