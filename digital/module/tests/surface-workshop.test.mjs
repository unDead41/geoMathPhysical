import test from 'node:test';
import assert from 'node:assert/strict';
import {containerMeasures,holeMeasures,workshopMesh} from '../src/surface-workshop.mjs';
import {cross3,sub3,length3} from '../src/geometry.mjs';
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const meshArea=m=>m.reduce((sum,f)=>sum+f.vertices.slice(1,-1).reduce((s,p,i)=>s+length3(cross3(sub3(p,f.vertices[0]),sub3(f.vertices[i+2],f.vertices[0])))/2,0),0);
const signedVolume=m=>m.reduce((sum,f)=>sum+f.vertices.slice(1,-1).reduce((s,p,i)=>{const n=cross3(p,f.vertices[i+2]);return s+f.vertices[0].reduce((q,x,k)=>q+x*n[k],0)/6;},0),0);
test('opening a container removes exactly one lid area while preserving capacity',()=>{
 const d={p:2,l:3,t:5};near(containerMeasures('cuboid',d,true).area,62);near(containerMeasures('cuboid',d,false).area,56);near(containerMeasures('cuboid',d,false).volume,30);
 near(containerMeasures('cylinder',{j:3,t:4},true).area,42*Math.PI);near(containerMeasures('cylinder',{j:3,t:4},false).area,33*Math.PI);
});
test('open and closed container meshes match their measured surface areas',()=>{
 for(const closed of [true,false])for(const [shape,d] of [['cuboid',{p:3,l:4,t:5}],['cylinder',{j:3,t:4}]]){const a=containerMeasures(shape,d,closed).area;near(meshArea(workshopMesh('container',d,{shape,closed})),a,a*.002);}
});
test('a through-hole adds the four exposed inner walls and removes both opening areas',()=>{
 const d={p:6,l:5,t:4,u:2,v:1.5},m=holeMeasures(d);near(m.area,170);near(m.volume,108);near(m.parts.reduce((s,p)=>s+p.area,0),170);
 const mesh=workshopMesh('cavity',d);near(meshArea(mesh),170);near(Math.abs(signedVolume(mesh)),108);
 assert.ok(mesh.some(f=>f.group==='inner'));assert.equal(mesh.length,16);
});
test('invalid hole sizes cannot silently invert or overlap the outer material',()=>{
 for(const x of [{p:3,l:4,t:5,u:3,v:1},{p:3,l:4,t:5,u:2,v:4},{p:3,l:4,t:0,u:1,v:1}])assert.throws(()=>holeMeasures(x),RangeError);
});
