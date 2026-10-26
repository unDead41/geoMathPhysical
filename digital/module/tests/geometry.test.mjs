import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMesh,DIMENSIONS,TAU,rx,viewPoint,VIEWS,VIEW_ORDER,meshBounds,sub3,length3,cross3,cylinderPoint,conePoint} from '../src/geometry.mjs';
import {MODEL_DATA,MODEL_ORDER} from '../src/content.mjs';
const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} ≠ ${b}`);
const pointKey=p=>p.map(v=>Math.round(v*1e7)).join(',');
const dist=(a,b)=>length3(sub3(a,b));
function polygonArea(pts){let s=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];s+=a[0]*b[1]-a[1]*b[0];}return s/2;}
function overlap(a,b){
 let out=a.map(v=>v.slice(0,2)),clip=b.map(v=>v.slice(0,2));if(polygonArea(clip)<0)clip.reverse();
 for(let j=0;j<clip.length;j++){
  const p=clip[j],q=clip[(j+1)%clip.length],input=out;out=[];if(!input.length)break;
  const side=v=>(q[0]-p[0])*(v[1]-p[1])-(q[1]-p[1])*(v[0]-p[0]);
  for(let i=0;i<input.length;i++){
   const a=input[i],b=input[(i+1)%input.length],sa=side(a),sb=side(b),ina=sa>=-1e-10,inb=sb>=-1e-10;
   if(ina)out.push(a);
   if(ina!==inb){const t=sa/(sa-sb);out.push(a.map((v,k)=>v+t*(b[k]-v)));}
  }
 }
 return out.length>2?Math.abs(polygonArea(out)):0;
}
for(const [shape,expected] of [['cube',[8,12,6]],['cuboid',[8,12,6]],['pyramid',[5,8,5]]]) {
 test(shape+': closed topology has the correct vertices, edges and faces',()=>{
  const mesh=buildMesh(shape,0),vertices=new Set(),edges=new Map();
  for(const f of mesh)for(let i=0;i<f.vertices.length;i++){
   const a=pointKey(f.vertices[i]),b=pointKey(f.vertices[(i+1)%f.vertices.length]);vertices.add(a);
   const key=[a,b].sort().join('|');edges.set(key,(edges.get(key)||0)+1);
  }
  assert.deepEqual([vertices.size,edges.size,mesh.length],expected);assert.ok([...edges.values()].every(n=>n===2));
 });
 test(shape+': every panel remains rigid through 101 opening frames',()=>{
  const closed=buildMesh(shape,0);
  for(let step=0;step<=100;step++){
   const mesh=buildMesh(shape,step/100);
   for(let k=0;k<mesh.length;k++)for(let i=0;i<mesh[k].vertices.length;i++)for(let j=i+1;j<mesh[k].vertices.length;j++)near(dist(mesh[k].vertices[i],mesh[k].vertices[j]),dist(closed[k].vertices[i],closed[k].vertices[j]));
  }
 });
 test(shape+': flat net is planar, has no overlapping faces and preserves total area',()=>{
  const mesh=buildMesh(shape,1);for(const f of mesh)for(const p of f.vertices)near(p[2],0);
  for(let i=0;i<mesh.length;i++)for(let j=i+1;j<mesh.length;j++)near(overlap(mesh[i].vertices,mesh[j].vertices),0,1e-7);
  const area=mesh.reduce((s,f)=>s+Math.abs(polygonArea(f.vertices)),0),d=DIMENSIONS[shape];
  near(area,shape==='pyramid'?d.a*d.a+2*d.a*Math.hypot(d.h,d.a/2):2*(d.w*d.h+d.w*d.d+d.h*d.d));
 });
 test(shape+': opening keeps one connected hinge tree',()=>{
  for(const t of [.03,.2,.5,.8,.99]){
   const m=buildMesh(shape,t),adj=m.map(()=>[]);
   for(let i=0;i<m.length;i++)for(let j=i+1;j<m.length;j++){
    const common=m[i].vertices.filter(a=>m[j].vertices.some(b=>dist(a,b)<1e-8));if(common.length>=2){adj[i].push(j);adj[j].push(i);}
   }
   const seen=new Set([0]),queue=[0];while(queue.length)for(const j of adj[queue.pop()])if(!seen.has(j)){seen.add(j);queue.push(j);}
   assert.equal(seen.size,m.length);assert.equal(adj.reduce((s,a)=>s+a.length,0)/2,m.length-1);
  }
 });
}
test('cylinder: closed shell is circular with matching top and bottom',()=>{
 const {r,h}=DIMENSIONS.cylinder;
 for(let i=0;i<=128;i++){const p=cylinderPoint(-Math.PI*r+TAU*r*i/128,h/2,0);near(p[0]**2+(p[2]+r)**2,r*r);near(p[1],h/2);}
 near(dist(cylinderPoint(-Math.PI*r,0,0),cylinderPoint(Math.PI*r,0,0)),0);
});
test('cylinder: continuous development preserves arc-length and vertical distances',()=>{
 const eps=1e-6;
 for(const t of [0,.05,.2,.25,.5,.8,.98,1])for(const u of [-2.6,-1,0,1,2.6]){
  const a=cylinderPoint(u,.5,t),b=cylinderPoint(u+eps,.5,t),c=cylinderPoint(u,.5+eps,t);
  near(dist(a,b)/eps,1,2e-6);near(dist(a,c)/eps,1,1e-6);
  const v=sub3(b,a),w=sub3(c,a);near(v.reduce((sum,n,i)=>sum+n*w[i],0)/eps**2,0,1e-5);
 }
});
test('cylinder: flat rectangle width equals 2πr, height equals h, disks are tangent and planar',()=>{
 const {r,h}=DIMENSIONS.cylinder,m=buildMesh('cylinder',1),shell=m.filter(f=>f.id===0).flatMap(f=>f.vertices);
 near(Math.max(...shell.map(p=>p[0]))-Math.min(...shell.map(p=>p[0])),TAU*r);near(Math.max(...shell.map(p=>p[1]))-Math.min(...shell.map(p=>p[1])),h);
 for(const id of [1,2]){
  const f=m.find(f=>f.id===id),sign=id===1?1:-1,center=[0,sign*(h/2+r),0];
  for(const p of f.vertices){near(p[2],0);near(dist(p,center),r);}
  near(Math.min(...f.vertices.map(p=>sign*p[1])),h/2);
 }
});
test('cylinder: flat area equals 2πrh + 2πr² within tessellation tolerance',()=>{
 const {r,h}=DIMENSIONS.cylinder,m=buildMesh('cylinder',1,512),area=m.reduce((s,f)=>s+Math.abs(polygonArea(f.vertices)),0);
 near(area,TAU*r*h+TAU*r*r,.0002);
});
test('cone: the closed surface is the right circular cone used by the module',()=>{
 const {r,h,l}=DIMENSIONS.cone,sector=TAU*r/l;
 for(const s of [.1,.8,l])for(let i=0;i<=128;i++){
  const p=conePoint(s,-sector/2+sector*i/128,0);near(p[1],-s*h/l);near(Math.hypot(p[0],p[2]),s*r/l);
 }
 near(dist(conePoint(l,-sector/2,0),conePoint(l,sector/2,0)),0);
});
test('cone: the entire changing curved surface preserves its intrinsic metric',()=>{
 const eps=1e-6;
 for(const t of [0,.1,.22,.25,.5,.75,.98,1])for(const s of [.3,1,2.4])for(const beta of [-1,-.3,0,.3,1]){
  const a=conePoint(s,beta,t),b=conePoint(s+eps,beta,t),c=conePoint(s,beta+eps,t),ds=sub3(b,a),db=sub3(c,a);
  near(length3(ds)/eps,1,2e-6);near(length3(db)/eps,s,2e-6);near(ds.reduce((sum,v,i)=>sum+v*db[i],0)/eps**2,0,2e-5);
 }
});
test('cone: flat sector has slant radius s and arc exactly equal to the base circumference',()=>{
 const {r,l}=DIMENSIONS.cone,sector=TAU*r/l;
 near(l*sector,TAU*r);assert.ok(sector<Math.PI);
 for(let i=0;i<=128;i++){const p=conePoint(l,-sector/2+sector*i/128,1);near(p[2],0);near(Math.hypot(p[0],p[1]),l);}
});
test('cone: the circular base remains rigid and touches the sector at its midpoint',()=>{
 const {r,l}=DIMENSIONS.cone,m=buildMesh('cone',1),f=m.find(f=>f.id===1),center=[0,-l-r,0];
 for(const p of f.vertices){near(p[2],0);near(dist(p,center),r);}
 near(Math.max(...f.vertices.map(p=>p[1])),-l);near(dist(f.vertices[0],conePoint(l,0,1)),0);
 for(const t of [0,.1,.3,.7,1]){const f=buildMesh('cone',t).find(f=>f.id===1);near(dist(f.vertices[0],f.vertices[64]),2*r);}
});
test('cone: flat sector and base areas match πrs + πr²',()=>{
 const {r,l}=DIMENSIONS.cone,m=buildMesh('cone',1,512),area=m.reduce((s,f)=>s+Math.abs(polygonArea(f.vertices)),0);near(area,Math.PI*r*l+Math.PI*r*r,.00015);
});
for(const shape of Object.keys(DIMENSIONS)){
 test(shape+': 1001 frames are finite and continuous, with stable face IDs and colours',()=>{
  let previous=buildMesh(shape,0,32),ids=previous.map(f=>[f.id,f.color]);
  for(let i=0;i<=1000;i++){
   const m=buildMesh(shape,i/1000,32);assert.deepEqual(m.map(f=>[f.id,f.color]),ids);
   for(let f=0;f<m.length;f++)for(let v=0;v<m[f].vertices.length;v++){
    const p=m[f].vertices[v];assert.ok(p.every(Number.isFinite));assert.ok(dist(p,previous[f].vertices[v])<.09);
   }
   previous=m;
  }
 });
 test(shape+': all six camera directions have the expected orthographic extents',()=>{
  const m=buildMesh(shape,0),d=DIMENSIONS[shape],expected=shape==='cube'?[d.w,d.h,d.d]:shape==='cuboid'?[d.w,d.h,d.d]:shape==='pyramid'?[d.a,d.h,d.a]:[2*d.r,d.h,2*d.r];
  for(const key of VIEW_ORDER){const v=VIEWS[key],pts=m.flatMap(f=>f.vertices).map(p=>viewPoint(p,v.yaw,v.pitch)),size=[0,1].map(i=>Math.max(...pts.map(p=>p[i]))-Math.min(...pts.map(p=>p[i])));
   const want=['top','bottom'].includes(key)?[expected[0],expected[2]]:['left','right'].includes(key)?[expected[2],expected[1]]:[expected[0],expected[1]];
   near(size[0],want[0],1e-7);near(size[1],want[1],1e-7);
  }
 });
}
test('view labels correspond to the visible side, including top and bottom',()=>{
 const cases={front:[0,0,1],back:[0,0,-1],left:[-1,0,0],right:[1,0,0],top:[0,1,0],bottom:[0,-1,0]};
 for(const [key,point] of Object.entries(cases)){const p=viewPoint(point,VIEWS[key].yaw,VIEWS[key].pitch);near(p[0],0);near(p[1],0);near(p[2],1);}
});
test('five canonical project shapes retain their order and accurate surface/edge/vertex counts',()=>{
 assert.deepEqual(MODEL_ORDER.slice(0,5),['cube','cuboid','pyramid','cylinder','cone']);
 const expected={cube:[6,0,12,8],cuboid:[6,0,12,8],pyramid:[5,0,8,5],cylinder:[2,1,2,0],cone:[1,1,1,1]};
 for(const shape of Object.keys(expected)){const d=MODEL_DATA[shape];assert.deepEqual([d.flat,d.curved,d.edges,d.vertices],expected[shape]);assert.equal(d.views.length,6);assert.equal(d.labels.length,d.flat+d.curved);assert.ok(d.answer>=0&&d.answer<d.options.length);}
});
