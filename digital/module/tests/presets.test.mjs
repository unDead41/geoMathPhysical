import test from 'node:test';import assert from 'node:assert/strict';
import {PRESET_NETS,presetNetMesh} from '../src/preset-nets.mjs';
import {cross3,sub3,length3} from '../src/geometry.mjs';
const area=f=>f.vertices.slice(1,-1).reduce((s,p,i)=>s+length3(cross3(sub3(p,f.vertices[0]),sub3(f.vertices[i+2],f.vertices[0])))/2,0);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const pointKey=p=>p.map(n=>Math.round(n*1e7)).join(',');
const extra=[['triangular-prism',5,6,9],['tetrahedron',4,4,6],['pentagonal-prism',7,10,15],['hexagonal-prism',8,12,18]];
test('ready-made gallery includes five canonical shapes and four named enrichment solids',()=>{assert.equal(PRESET_NETS.length,9);for(const p of PRESET_NETS){assert.equal(typeof p.name,'string');assert.ok(p.labels.length>=2);assert.ok(presetNetMesh(p.key,0).length>=p.labels.length);}});
for(const [key,F,V,E] of extra){
 test(key+': closed shell has correct topology and exactly two faces at each edge',()=>{
  const faces=presetNetMesh(key,1),vertices=new Set(),edges=new Map();assert.equal(faces.length,F);
  for(const f of faces){assert.ok(area(f)>0);for(let i=0;i<f.vertices.length;i++){const a=pointKey(f.vertices[i]),b=pointKey(f.vertices[(i+1)%f.vertices.length]);vertices.add(a);const e=[a,b].sort().join('|');edges.set(e,(edges.get(e)||0)+1);}}
  assert.equal(vertices.size,V);assert.equal(edges.size,E);for(const n of edges.values())assert.equal(n,2);assert.equal(V-E+F,2);
 });
 test(key+': every face remains rigid and each hinge stays connected through 101 frames',()=>{
  const reference=presetNetMesh(key,0);assert.equal(reference.length,F);
  for(let step=0;step<=100;step++){const mesh=presetNetMesh(key,step/100);for(let i=0;i<mesh.length;i++){const f=mesh[i],r=reference[i];assert.equal(f.id,r.id);assert.equal(f.color,r.color);close(area(f),area(r));for(let j=0;j<f.vertices.length;j++)close(length3(sub3(f.vertices[j],f.vertices[(j+1)%f.vertices.length])),length3(sub3(r.vertices[j],r.vertices[(j+1)%r.vertices.length])));if(f.parent!==null){const parent=mesh[f.parent];assert.equal(f.vertices.filter(p=>parent.vertices.some(q=>length3(sub3(p,q))<1e-7)).length,2);}}}
 });
 test(key+': unfolded faces lie on one plane without overlapping areas',()=>{
  const mesh=presetNetMesh(key,0);assert.equal(mesh.length,F);for(const f of mesh)for(const p of f.vertices)close(p[2],0);
  for(let a=0;a<mesh.length;a++)for(let b=a+1;b<mesh.length;b++)assert.ok(overlap(mesh[a].vertices,mesh[b].vertices)<1e-7,key+' overlaps');
 });
}
function overlap(A,B){let ps=A.map(p=>p.slice(0,2));const sign=Math.sign(B.reduce((s,p,i)=>s+p[0]*B[(i+1)%B.length][1]-B[(i+1)%B.length][0]*p[1],0));for(let i=0;i<B.length&&ps.length;i++){const a=B[i],b=B[(i+1)%B.length],cross=p=>sign*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]));const out=[];for(let j=0;j<ps.length;j++){const p=ps[j],q=ps[(j+1)%ps.length],cp=cross(p),cq=cross(q);if(cp>=-1e-10)out.push(p);if((cp>=-1e-10)!==(cq>=-1e-10)){const t=cp/(cp-cq);out.push(p.map((x,k)=>x+t*(q[k]-x)));}}ps=out;}return Math.abs(ps.reduce((s,p,i)=>s+p[0]*ps[(i+1)%ps.length][1]-ps[(i+1)%ps.length][0]*p[1],0))/2;}
test('unknown ready-made net is rejected instead of drawing a substitute',()=>assert.throws(()=>presetNetMesh('sphere',.5),RangeError));
