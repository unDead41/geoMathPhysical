import test from 'node:test';
import assert from 'node:assert/strict';
import {projectionModel,projectionViews,projectionDrawingBounds,checkProjectionDrawing} from '../src/projection-geometry.mjs';

test('three projection sizes follow actual model dimensions at both offered scales',()=>{
 for(const [shape,d,xyz] of [['cube',{a:5},[5,5,5]],['cuboid',{p:8,l:3,t:5},[8,5,3]],['pyramid',{a:8,t:3},[8,3,8]],['cylinder',{j:2.5,t:7},[5,7,5]],['cone',{j:3,t:4},[6,4,6]]]){
  const m=projectionModel(shape,d);for(let i=0;i<3;i++)assert.ok(Math.abs(m.extents[i]-xyz[i])<1e-9,shape+' source dimension '+i);
  for(const scale of [1,2]){
   const views=projectionViews(m,scale);
   for(const [key,wh] of [['front',[xyz[0],xyz[1]]],['side',[xyz[2],xyz[1]]],['plan',[xyz[0],xyz[2]]]]){
    const b=projectionDrawingBounds(views[key].primitives);assert.ok(Math.abs(b.width-wh[0]/scale)<1e-8,shape+' '+key+' width');assert.ok(Math.abs(b.height-wh[1]/scale)<1e-8,shape+' '+key+' height');
   }
  }
 }
});

test('right view retains front-to-back orientation of an asymmetric model',()=>{
 const model=projectionModel('assembly-step'),views=projectionViews(model,1,[0,0]);
 // The extra cube is at positive z (front). From +X it must be on the LEFT.
 // Its y=3 top edge therefore lies between side x=0 and x=1.
 assert.ok(views.side.primitives.some(p=>p.kind==='line'&&p.type==='visible'&&Math.abs(p.a[1]-3)<1e-9&&Math.abs(p.b[1]-3)<1e-9&&Math.min(p.a[0],p.b[0])===0&&Math.max(p.a[0],p.b[0])===1));
 const reflected=views.side.primitives.map(p=>({...p,a:[2-p.a[0],p.a[1]],b:[2-p.b[0],p.b[1]]}));
 assert.equal(checkProjectionDrawing(views.side,reflected).valid,false);
});

test('answer generation is independent of a model world translation',()=>{
 const model=projectionModel('pyramid',{a:6,t:4}),shift=[3,5,-7],translated={...model,mesh:model.mesh.map(f=>({...f,vertices:f.vertices.map(v=>v.map((n,i)=>n+shift[i]))})),bounds:{...model.bounds,min:model.bounds.min.map((n,i)=>n+shift[i]),max:model.bounds.max.map((n,i)=>n+shift[i])}};
 const a=projectionViews(model),b=projectionViews(translated);
 for(const view of ['front','side','plan'])assert.equal(checkProjectionDrawing(a[view],b[view].primitives,{tolerance:0}).valid,true,view);
});
