import test from 'node:test';import assert from 'node:assert/strict';import {ModelRenderer} from '../src/renderer.mjs';
for(const shape of ['cylinder','cone'])test(shape+': numbered curved-surface label is not painted over by adjacent strips',()=>{
 const events=[];let path='';
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),beginPath(){path='';},moveTo(){path='polygon';},lineTo(){},arc(){path='badge';},fill(){events.push({type:'fill',path});},fillText(text){events.push({type:'text',text});}},{get:(o,key)=>key in o?o[key]:()=>{}});
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:700,height:420}),width:0,height:0};
 const saved=globalThis.window;globalThis.window={devicePixelRatio:1};
 try{new ModelRenderer(canvas).draw({shape,progress:.5,yaw:.48,pitch:.28,labels:true});}finally{if(saved===undefined)delete globalThis.window;else globalThis.window=saved;}
 const number=events.findIndex(e=>e.type==='text'&&e.text==='1'),lastPanel=events.findLastIndex(e=>e.type==='fill'&&e.path==='polygon');
 assert.ok(number>=0,'surface label visible');assert.ok(number>lastPanel,'later surface strips must not cover the label');
});
test('a wide custom lab scene uses the available canvas width without distorting geometry',()=>{
 let points=[],polygons=[];const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),beginPath(){points=[];},moveTo(x,y){points.push([x,y]);},lineTo(x,y){points.push([x,y]);},fill(){if(points.length>=4)polygons.push([...points]);}},{get:(o,key)=>key in o?o[key]:()=>{}});
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:700,height:410})},saved=globalThis.window;globalThis.window={devicePixelRatio:1};
 try{new ModelRenderer(canvas).draw({shape:'lab',yaw:0,pitch:0,mesh:[{id:0,color:'#64CBB8',outline:true,vertices:[[-10,-2,0],[10,-2,0],[10,2,0],[-10,2,0]]}]});}finally{if(saved===undefined)delete globalThis.window;else globalThis.window=saved;}
 const xs=polygons[0].map(p=>p[0]),ys=polygons[0].map(p=>p[1]),w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys);assert.ok(w>500&&w<700);assert.ok(Math.abs(w/h-5)<1e-8);
});
test('a shared reference mesh keeps the same physical scale across an animated lab scene',()=>{
 let points=[],polygons=[];const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),beginPath(){points=[];},moveTo(x,y){points.push([x,y]);},lineTo(x,y){points.push([x,y]);},fill(){if(points.length>=4)polygons.push([...points]);}},{get:(o,key)=>key in o?o[key]:()=>{}});
 const face=w=>[{id:0,color:'#64CBB8',outline:true,vertices:[[-w,-1,0],[w,-1,0],[w,1,0],[-w,1,0]]}],canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:700,height:410})},saved=globalThis.window;globalThis.window={devicePixelRatio:1};
 try{const r=new ModelRenderer(canvas);r.draw({shape:'lab',yaw:0,pitch:0,mesh:face(2),fitMesh:face(10)});r.draw({shape:'lab',yaw:0,pitch:0,mesh:face(4),fitMesh:face(10)});}finally{if(saved===undefined)delete globalThis.window;else globalThis.window=saved;}
 const width=poly=>Math.max(...poly.map(p=>p[0]))-Math.min(...poly.map(p=>p[0]));
 assert.ok(Math.abs(width(polygons[1])/width(polygons[0])-2)<1e-8,'auto-fit changed apparent scale while the geometry moved');
});
