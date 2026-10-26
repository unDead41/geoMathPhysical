import test from 'node:test';
import assert from 'node:assert/strict';
import {transferPlan,transferFrame,readVolumeAmount} from '../src/volume-transfer.mjs';
const vessel=(p,l,t,fill)=>({key:'cuboid',d:{p,l,t},fill});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('volume amount accepts cm³/mL/L, decimal commas and rejects invalid requests',()=>{
 near(readVolumeAmount('2,5','l'),2500);near(readVolumeAmount('30','ml'),30);near(readVolumeAmount('1.5','cm3'),1.5);
 for(const [s,u] of [['0','ml'],['-2','cm3'],['foo','l'],['2','unknown']])assert.throws(()=>readVolumeAmount(s,u),RangeError);
});
test('transfer keeps unused contents in the source when the receiver is full',()=>{
 const p=transferPlan([vessel(4,5,6,100/120),vessel(3,4,5,20/60)],0,50,false,0);
 near(p.moved,40);near(p.accepted,40);near(p.spilled,0);
 const end=transferFrame(p,1);near(end.volumes[0],60);near(end.volumes[1],60);near(end.spill,0);
});
test('overflow is accounted for independently of selected-sum checkboxes',()=>{
 const p=transferPlan([vessel(4,5,6,100/120),vessel(3,4,5,20/60)],0,50,true,7);
 near(p.moved,50);near(p.accepted,40);near(p.spilled,10);
 for(let i=0;i<=100;i++){const s=transferFrame(p,i/100);near(s.volumes[0]+s.volumes[1]+s.spill,p.initialTotal);assert.ok(s.items.every(x=>x.fill>=0&&x.fill<=1));}
 const end=transferFrame(p,1);near(end.volumes[0],50);near(end.volumes[1],60);near(end.spill,17);
});
test('reverse transfers, empty sources and excessive requests are bounded',()=>{
 const items=[vessel(2,2,2,0),vessel(2,2,3,.5)];
 const p=transferPlan(items,1,100,true,0),end=transferFrame(p,1);near(p.moved,6);near(end.volumes[0],6);near(end.volumes[1],0);near(end.spill,0);
 const no=transferPlan(items,0,4,true,0);near(no.moved,0);
 assert.throws(()=>transferPlan(items,2,4,false,0),RangeError);
});
