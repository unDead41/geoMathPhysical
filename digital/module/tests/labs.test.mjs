import test from 'node:test';import assert from 'node:assert/strict';
import {NET_PRESETS,cubeNetState,cubeNetMesh,labDimensions,surfacePieces,pourState,compositionMeasures,labSolidMesh} from '../src/lab-geometry.mjs';
import {buildMesh,length3,sub3,cross3} from '../src/geometry.mjs';
import {LESSON_DATA,calculateMeasures} from '../src/lessons.mjs';
const near=(a,b,tol=1e-8)=>{assert.equal(typeof a,'number');assert.ok(Number.isFinite(a));assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);};
const polygonArea=f=>{const a=f.vertices[0];return f.vertices.slice(1,-1).reduce((s,b,i)=>s+length3(cross3(sub3(b,a),sub3(f.vertices[i+2],a)))/2,0);};
test('a cross folds into six different cube faces; a 2x3 rectangle overlaps',()=>{
 assert.equal(cubeNetState(NET_PRESETS.cross).valid,true);const bad=cubeNetState(NET_PRESETS.overlap);assert.equal(bad.valid,false);assert.ok(bad.overlaps.length>0);
});
test('nets reject disconnected, duplicate, missing and out-of-grid squares',()=>{
 for(const cells of [[],[[0,0],[0,0]],[[0,0],[5,5]],[[6,0]],NET_PRESETS.cross.slice(0,5)])assert.equal(cubeNetState(cells).valid,false);
 assert.equal(cubeNetState([[0,0],[5,5]]).connected,false);
});
function canonical(cells){const forms=[];for(const swap of [false,true])for(const sx of [-1,1])for(const sy of [-1,1]){let ps=cells.map(([x,y])=>swap?[sx*y,sy*x]:[sx*x,sy*y]);const mx=Math.min(...ps.map(p=>p[0])),my=Math.min(...ps.map(p=>p[1]));forms.push(ps.map(([x,y])=>[x-mx,y-my]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(p=>p.join(',')).join(';'));}return forms.sort()[0];}
test('exhaustive free-hexomino enumeration finds exactly 11 of 35 cube nets',()=>{
 let shapes=new Map([['0,0',[[0,0]]]]);for(let n=1;n<6;n++){const next=new Map();for(const cells of shapes.values())for(const [x,y] of cells)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const p=[x+dx,y+dy];if(cells.some(q=>q[0]===p[0]&&q[1]===p[1]))continue;const key=canonical([...cells,p]);next.set(key,key.split(';').map(s=>s.split(',').map(Number)));}shapes=next;}
 assert.equal(shapes.size,35);assert.equal([...shapes.values()].filter(c=>cubeNetState(c).valid).length,11);
});
test('cube-net folding keeps every square rigid and all parent hinge endpoints coincident',()=>{
 for(const t of [0,.1,.4,.7,1]){const faces=cubeNetMesh(NET_PRESETS.cross,t);assert.equal(faces.length,6);for(const f of faces){near(polygonArea(f),1);for(let i=0;i<4;i++)near(length3(sub3(f.vertices[i],f.vertices[(i+1)%4])),1);if(f.parent!==null){const parent=faces[f.parent];const shared=f.vertices.filter(p=>parent.vertices.some(q=>length3(sub3(p,q))<1e-7));assert.equal(shared.length,2);}}}
});
for(const shape of ['cube','cuboid','pyramid','cylinder','cone'])test(shape+': labelled surface pieces sum to the independently verified area',()=>{
 const d=LESSON_DATA[shape].defaults,parts=surfacePieces(shape,d);assert.equal(parts.length,{cube:6,cuboid:6,pyramid:5,cylinder:3,cone:2}[shape]);near(parts.reduce((a,p)=>a+p.area,0),calculateMeasures(shape,d,'full').area);
 const mesh=buildMesh(shape,.63,160,labDimensions(shape,d));const expected=calculateMeasures(shape,d,'full').area;near(mesh.reduce((s,f)=>s+polygonArea(f),0),expected,expected*.001);
});
test('custom solid dimensions do not mutate canonical geometry',()=>{
 const original=JSON.stringify(buildMesh('cube',0));labSolidMesh('cube',{a:6});assert.equal(JSON.stringify(buildMesh('cube',0)),original);
});
for(const kind of ['cone','pyramid'])test(kind+': transfers conserve volume and three full pours fill the matching receiver',()=>{
 const d=kind==='cone'?{j:3,t:4}:{a:6,t:4};for(let n=0;n<3;n++)for(const u of [0,.25,.5,.9,1]){const p=pourState(kind,d,n,u);near(p.sourceVolume+p.targetVolume,(n+1)*p.oneVolume);near(p.targetHeight/d.t,(n+u)/3);near(p.sourceHeight/d.t,1-Math.cbrt(u));}
 const p=pourState(kind,d,2,1);near(p.targetVolume,p.capacity);near(p.targetHeight,d.t);near(p.sourceHeight,0);
});
test('half of cone volume uses a nonlinear source fill height',()=>{const p=pourState('cone',{j:3,t:4},0,.5);near(p.sourceHeight,4*(1-Math.cbrt(.5)));assert.ok(p.sourceHeight<2);});
test('composite cube and pyramid exclude BOTH mating faces and add volumes',()=>{const r=compositionMeasures('roof',{a:6,t:4});near(r.area,240);near(r.volume,264);near(r.separateArea-r.area,72);assert.equal(r.groups.filter(g=>g.external).length,3);});
test('composite cylinder and cone use matching circular bases',()=>{const r=compositionMeasures('rocket',{j:3,h:6,t:4});near(r.area,60*Math.PI);near(r.volume,66*Math.PI);near(r.separateArea-r.area,18*Math.PI);});
test('lab math rejects impossible dimensions and transfer indices',()=>{assert.throws(()=>compositionMeasures('roof',{a:0,t:4}),RangeError);assert.throws(()=>pourState('cone',{j:3,t:4},3,.5),RangeError);assert.throws(()=>surfacePieces('cone',{j:-1,t:4}),RangeError);});
// Convex volume from the ACTUAL drawn faces, independent of fill-height formulas.
function convexVolume(mesh){if(!mesh.length)return 0;const vs=mesh.flatMap(f=>f.vertices),c=[0,1,2].map(i=>vs.reduce((s,p)=>s+p[i],0)/vs.length);let volume=0;for(const f of mesh){const a=sub3(f.vertices[0],c);for(let i=1;i<f.vertices.length-1;i++){const b=sub3(f.vertices[i],c),n=cross3(b,sub3(f.vertices[i+1],c));volume+=Math.abs(a.reduce((s,x,j)=>s+x*n[j],0))/6;}}return volume;}
for(const kind of ['cone','pyramid'])test(kind+': rendered liquid meshes match conserved volumes at intermediate transfer frames',async()=>{
 const {pourMesh}=await import('../src/lab-geometry.mjs'),d=kind==='cone'?{j:3,t:4}:{a:6,t:4};for(const n of [0,1,2])for(const u of [0,.25,.5,.75,1]){const p=pourState(kind,d,n,u),mesh=pourMesh(kind,d,n,u);near(convexVolume(mesh.filter(f=>f.id===0)),p.sourceVolume,p.oneVolume*.002+1e-8);near(convexVolume(mesh.filter(f=>f.id===1)),p.targetVolume,p.capacity*.002+1e-8);}
});
test('cyclic hexomino previews explicitly mark the two cuts needed beyond the five hinges',()=>{
 const s=cubeNetState(NET_PRESETS.overlap);assert.equal(s.cutCount,2);assert.match(s.message,/potong/);const faces=cubeNetMesh(NET_PRESETS.overlap,0);assert.equal(faces.reduce((n,f)=>n+(f.cut?.length||0),0),4);assert.equal(cubeNetState(NET_PRESETS.cross).cutCount,0);
});
