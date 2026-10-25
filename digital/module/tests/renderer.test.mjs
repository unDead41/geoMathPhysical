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
