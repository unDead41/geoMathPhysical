import test from 'node:test';
import assert from 'node:assert/strict';
import {studySolidMesh} from '../src/learning-mesh.mjs';
import {meshBounds} from '../src/geometry.mjs';

let projection={};
try{projection=await import('../src/projection-geometry.mjs');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
const line=(a,b,type='visible')=>({kind:'line',a,b,type});
const circle=(center,r,type='visible')=>({kind:'circle',center,r,type});
const move=(items,x,y,k=1)=>items.map(p=>p.kind==='line'?{...p,a:p.a.map((n,i)=>n*k+[x,y][i]),b:p.b.map((n,i)=>n*k+[x,y][i])}:{...p,center:p.center.map((n,i)=>n*k+[x,y][i]),r:p.r*k});

test('projection API fixes the textbook right-to-left side convention',()=>{
 assert.equal(typeof projection.projectionModel,'function');
 assert.deepEqual(projection.PROJECTION_VIEWS.front.direction,[0,0,1]);
 assert.deepEqual(projection.PROJECTION_VIEWS.plan.direction,[0,1,0]);
 assert.deepEqual(projection.PROJECTION_VIEWS.side.direction,[1,0,0]);
 assert.equal(projection.PROJECTION_VIEWS.side.position,'left-of-front');
});
test('the five source solids use the actual shared study mesh and measurements',()=>{
 for(const [shape,d] of [['cube',{a:4}],['cuboid',{p:6,l:4,t:3}],['pyramid',{a:6,t:4}],['cylinder',{j:7,t:10}],['cone',{j:3,t:4}]]){
  const model=projection.projectionModel(shape,d),expected=studySolidMesh(shape,d);
  assert.deepEqual(model.mesh,expected);
  const b=meshBounds(expected);assert.deepEqual(model.extents,b.max.map((n,i)=>n-b.min[i]));
 }
});
test('cuboid front, right side and plan have independently calculated sizes and origins',()=>{
 const views=projection.projectionViews(projection.projectionModel('cuboid',{p:6,l:4,t:3}));
 for(const [view,w,h] of [['front',6,3],['side',4,3],['plan',6,4]]){
  near(views[view].width,w);near(views[view].height,h);assert.equal(views[view].primitives.length,4);
  const b=projection.projectionDrawingBounds(views[view].primitives);assert.deepEqual(b,{min:[1,1],max:[w+1,h+1],width:w,height:h});
  assert.ok(views[view].primitives.every(p=>p.type==='visible'));
 }
});
test('the square pyramid has four plan diagonals and triangle elevations from true vertices',()=>{
 const views=projection.projectionViews(projection.projectionModel('pyramid',{a:6,t:4}));
 const corners=[[1,1],[7,1],[7,7],[1,7]],plan=[...corners.map((p,i)=>line(p,corners[(i+1)%4])),...corners.map(p=>line(p,[4,4]))];
 assert.equal(projection.checkProjectionDrawing(plan,views.plan.primitives).valid,true);assert.equal(views.front.primitives.length,3);assert.equal(views.side.primitives.length,3);
 assert.ok(views.front.primitives.some(p=>p.a[0]===4&&p.a[1]===5||p.b[0]===4&&p.b[1]===5));
 assert.ok(Object.values(views).every(v=>v.primitives.every(p=>p.type==='visible')));
});
test('cylinder and cone top views are analytic circles; elevations are rectangle and triangle',()=>{
 for(const shape of ['cylinder','cone']){
  const views=projection.projectionViews(projection.projectionModel(shape,{j:3,t:4}));
  assert.deepEqual(views.plan.primitives,[circle([4,4],3)]);
  assert.equal(views.front.primitives.length,shape==='cylinder'?4:3);assert.equal(views.side.primitives.length,shape==='cylinder'?4:3);
  near(views.front.width,6);near(views.front.height,4);
 }
});
test('both cube assemblies remove shared interior faces and retain real hidden edges',()=>{
 for(const key of ['assembly-step','assembly-recess']){
  const model=projection.projectionModel(key),views=projection.projectionViews(model);
  assert.ok(model.mesh.length<model.cells.length*6);
  assert.ok(views.front.primitives.some(p=>p.type==='hidden'),key+' needs a genuinely occluded front edge');
  assert.ok(views.side.primitives.some(p=>p.type==='hidden'),key+' needs a genuinely occluded side edge');
  assert.ok(views.plan.primitives.every(p=>p.type==='visible'));
  assert.ok(model.mesh.every(f=>f.vertices.flat().every(Number.isFinite)));
 }
});
test('a removed upper centre cube creates an occluded recess at its actual 1 cm depth',()=>{
 const views=projection.projectionViews(projection.projectionModel('assembly-recess'));
 const hidden=views.front.primitives.filter(p=>p.type==='hidden');
 assert.ok(hidden.some(p=>Math.abs(p.a[1]-2)<1e-8&&Math.abs(p.b[1]-2)<1e-8));
 assert.ok(views.plan.primitives.some(p=>p.a[0]===2&&p.b[0]===2));
 assert.equal(projection.projectionModel('assembly-recess').cells.length,17);
});
test('1:2 scales every answer length and radius while preserving the source solid',()=>{
 const model=projection.projectionModel('cone',{j:3,t:4}),full=projection.projectionViews(model,1),half=projection.projectionViews(model,2);
 near(half.front.width,full.front.width/2);near(half.front.height,full.front.height/2);near(half.plan.primitives[0].r,1.5);
 assert.deepEqual(half.plan.primitives[0].center,[2.5,2.5]);assert.deepEqual(model.dimensions,{j:3,t:4});
 assert.throws(()=>projection.projectionViews(model,3),RangeError);
});
test('model dimension arrows terminate on real geometry, with a diameter and perpendicular height for rounds',()=>{
 assert.equal(typeof projection.projectionDimensionSegments,'function');
 for(const shape of ['cylinder','cone']){
  const model=projection.projectionModel(shape,{j:3,t:4}),arrows=projection.projectionDimensionSegments(model),diameter=arrows.find(a=>a.key==='width'),height=arrows.find(a=>a.key==='height');
  near(diameter.value,6);near(height.value,4);near(diameter.a[1],0);near(diameter.b[1],0);
  for(const p of [diameter.a,diameter.b])near(Math.hypot(p[0]-model.bounds.center[0],p[2]-model.bounds.center[2]),3);
  near(height.a[0],height.b[0]);near(height.a[2],height.b[2]);
 }
 const pyramid=projection.projectionModel('pyramid',{a:6,t:4}),height=projection.projectionDimensionSegments(pyramid).find(a=>a.key==='height');assert.deepEqual(height.a,[0,0,0]);assert.deepEqual(height.b,[0,4,0]);
});
test('line equivalence ignores order, reversal, duplicates and collinear split or merge',()=>{
 const expected=[line([1,1],[5,1]),line([5,1],[5,4])];
 const drawn=[line([5,4],[5,2]),line([3,1],[1,1]),line([5,1],[3,1]),line([5,2],[5,1]),line([5,1],[1,1])];
 assert.equal(projection.checkProjectionDrawing(expected,drawn).valid,true);
 assert.equal(projection.checkProjectionDrawing(drawn,expected).valid,true);
});
test('visible coincident edges take precedence over hidden edges, including partial overlaps',()=>{
 const expected=[line([1,1],[5,1]),line([1,1],[7,1],'hidden')],drawn=[line([5,1],[1,1]),line([5,1],[7,1],'hidden')];
 assert.equal(projection.checkProjectionDrawing(expected,drawn).valid,true);
 assert.equal(projection.checkProjectionDrawing(drawn,expected).valid,true);
});
test('construction lines are optional and ignored but cannot replace required solid edges',()=>{
 const expected=[line([1,1],[5,1])],guide=line([0,0],[9,9],'construction');
 assert.equal(projection.checkProjectionDrawing(expected,[...expected,guide]).valid,true);
 assert.equal(projection.checkProjectionDrawing(expected,[{...expected[0],type:'construction'}]).valid,false);
});
test('line-type errors identify actual and expected edges for highlighting',()=>{
 const result=projection.checkProjectionDrawing([line([1,1],[5,1],'hidden')],[line([1,1],[5,1])]);
 assert.equal(result.valid,false);assert.equal(result.issues[0].code,'line-type');
 assert.deepEqual(result.issues[0].actualIndices,[0]);assert.deepEqual(result.issues[0].expectedIndices,[0]);
});
test('position, scale, length and shape mistakes have distinct actionable feedback',()=>{
 const expected=[line([1,1],[5,1]),line([5,1],[5,4]),line([5,4],[1,4]),line([1,4],[1,1])];
 assert.equal(projection.checkProjectionDrawing(expected,move(expected,1,0)).issues[0].code,'position');
 assert.equal(projection.checkProjectionDrawing(expected,move(expected,-1,-1,2)).issues[0].code,'scale');
 const wide=expected.map(p=>({...p,a:[1+(p.a[0]-1)*1.5,p.a[1]],b:[1+(p.b[0]-1)*1.5,p.b[1]]}));
 assert.equal(projection.checkProjectionDrawing(expected,wide).issues[0].code,'length');
 assert.equal(projection.checkProjectionDrawing([circle([4,4],3)],expected).issues[0].code,'shape');
});
test('drawing cm tolerance includes the exact boundary and rejects just beyond it',()=>{
 const tol=projection.PROJECTION_TOLERANCE;near(tol,.06);
 const expected=[line([1,1],[5,1])];
 assert.equal(projection.checkProjectionDrawing(expected,[line([1,1+tol],[5,1+tol])]).valid,true);
 assert.equal(projection.checkProjectionDrawing(expected,[line([1,1+tol+.0001],[5,1+tol+.0001])]).valid,false);
 assert.equal(projection.checkProjectionDrawing(expected,[line([1+tol,1],[5-tol,1])]).valid,true);
 assert.equal(projection.checkProjectionDrawing(expected,[line([1+tol+.0001,1],[5,1])]).valid,false);
});
test('circle tolerance is analytic in centre distance and radius rather than polygon sampling',()=>{
 const tol=projection.PROJECTION_TOLERANCE,expected=[circle([4,4],3)];
 assert.equal(projection.checkProjectionDrawing(expected,[circle([4+tol,4],3+tol)]).valid,true);
 assert.equal(projection.checkProjectionDrawing(expected,[circle([4+tol+.0001,4],3)]).valid,false);
 assert.equal(projection.checkProjectionDrawing(expected,[circle([4,4],3+tol+.0001)]).valid,false);
 assert.equal(projection.checkProjectionDrawing(expected,[circle([4+.05,4+.05],3)]).valid,false);
});
test('invalid, non-finite and overlong submissions cannot be accepted',()=>{
 assert.throws(()=>projection.projectionModel('sphere'),RangeError);
 assert.throws(()=>projection.projectionModel('cube',{a:-1}),RangeError);
 assert.equal(projection.checkProjectionDrawing([line([1,1],[5,1])],[line([NaN,1],[5,1])]).valid,false);
 assert.equal(projection.checkProjectionDrawing([line([1,1],[5,1])],Array.from({length:513},()=>line([1,1],[5,1]))).valid,false);
 assert.equal(projection.checkProjectionDrawing([line([1,1],[5,1])],[]).issues[0].code,'missing');
});
