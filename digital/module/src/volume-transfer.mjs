import {volumeInfo} from './volume-lab.mjs';
import {readDimension} from './lessons.mjs';
import {clamp01} from './geometry.mjs';

export function readVolumeAmount(raw,unit='cm3'){
 const n=readDimension(raw),factors={cm3:1,ml:1,l:1000};
 if(!Object.hasOwn(factors,unit)||!Number.isFinite(n)||n<=0||n*factors[unit]>1e6)throw new RangeError('Masukkan jumlah positif sehingga 1 000 000 cm³.');
 return n*factors[unit];
}
export function transferPlan(items,from,amount,allowOverflow=false,previousSpill=0){
 if(items.length!==2||![0,1].includes(from)||!Number.isFinite(amount)||amount<=0||!Number.isFinite(previousSpill)||previousSpill<0)throw new RangeError('Pindahan tidak sah.');
 const capacities=items.map(x=>volumeInfo(x.key,x.d).volume),start=items.map((x,i)=>capacities[i]*clamp01(x.fill)),to=1-from,space=Math.max(0,capacities[to]-start[to]);
 const moved=Math.min(start[from],amount,allowOverflow?Infinity:space),accepted=Math.min(space,moved),spilled=Math.max(0,moved-accepted),end=[...start];
 end[from]-=moved;end[to]+=accepted;
 return {items:items.map(x=>({...x,d:{...x.d}})),capacities,start,end,from,to,requested:amount,moved,accepted,spilled,previousSpill,initialTotal:start[0]+start[1]+previousSpill};
}
export function transferFrame(plan,progress){
 const t=clamp01(progress),moved=plan.moved*t,volumes=[...plan.start];
 volumes[plan.from]-=moved;volumes[plan.to]=Math.min(plan.capacities[plan.to],plan.start[plan.to]+moved);
 const spill=plan.previousSpill+Math.max(0,plan.start[plan.to]+moved-plan.capacities[plan.to]);
 return {items:plan.items.map((x,i)=>({...x,fill:clamp01(volumes[i]/plan.capacities[i])})),volumes,spill};
}
