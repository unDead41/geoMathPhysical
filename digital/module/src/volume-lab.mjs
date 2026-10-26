import {calculateMeasures,LESSON_DATA,MEASURE_FIELDS} from './lessons.mjs';
import {MODEL_DATA} from './content.mjs';
import {studySolidMesh,fillLevelRatio} from './learning-mesh.mjs';
import {meshBounds,add3,clamp01} from './geometry.mjs';
export function volumeFields(key){return MEASURE_FIELDS[key]||(['triangular-prism','pentagonal-prism','hexagonal-prism','tetrahedron'].includes(key)?['a','t']:[]);}
export function volumeDefaults(key){return Object.fromEntries(Object.entries(LESSON_DATA[key]?.defaults||{a:3,t:4}).map(([k,v])=>[k,Math.max(1,Math.min(8,v))]));}
export function volumeInfo(key,d){
 const data=MODEL_DATA[key],m=calculateMeasures(key,d,'full');if(!data||!m.valid)throw new RangeError('Ukuran isi padu tidak sah.');
 return {name:data.name,volume:m.volume,baseArea:m.baseArea,formula:LESSON_DATA[key].volume.formula};
}
export function comparisonTotal(items,included=[true,true],count=2){return items.slice(0,count).reduce((s,item,i)=>s+(included[i]?volumeInfo(item.key,item.d).volume*clamp01(item.fill):0),0);}
function volumeShell(item){volumeInfo(item.key,item.d);return studySolidMesh(item.key,item.d);}
function volumeClip(mesh,level,color,id){
 const faces=[],cap=new Map();for(const f of mesh){const out=[];for(let i=0;i<f.vertices.length;i++){const p=f.vertices[i],q=f.vertices[(i+1)%f.vertices.length],a=p[1]<=level+1e-9,b=q[1]<=level+1e-9;if(a)out.push(p);if(a!==b){const t=(level-p[1])/(q[1]-p[1]),v=p.map((x,k)=>x+t*(q[k]-x));out.push(v);cap.set(v.map(x=>Math.round(x*1e8)).join(','),v);}}if(new Set(out.map(v=>v.map(x=>Math.round(x*1e8)).join(','))).size>=3)faces.push({...f,id,color,label:undefined,cut:null,vertices:out});}
 const ps=[...cap.values()];if(ps.length>=3){const c=[0,2].map(k=>ps.reduce((s,p)=>s+p[k],0)/ps.length);ps.sort((a,b)=>Math.atan2(a[2]-c[1],a[0]-c[0])-Math.atan2(b[2]-c[1],b[0]-c[0]));faces.push({id,color,outline:true,vertices:ps.reverse()});}return faces;
}
export function volumeComparisonMesh(items,count=2){
 const solids=items.slice(0,count).map(volumeShell),bounds=solids.map(meshBounds),offsets=count===1?[0]:[-(bounds[0].max[0]-bounds[0].min[0])/2-1,(bounds[1].max[0]-bounds[1].min[0])/2+1],result=[];
 solids.forEach((shell,i)=>{const item=items[i],b=bounds[i],f=clamp01(item.fill),height=(b.max[1]-b.min[1])*fillLevelRatio(item.key,f),shift=[offsets[i],0,0],color=i?'#94BDF7':'#64CBB8';
  if(f>0){const fluid=f===1?shell.map(face=>({...face,id:i,color,label:undefined,cut:null})):volumeClip(shell,b.min[1]+height,color,i);result.push(...fluid.map(face=>({...face,vertices:face.vertices.map(v=>add3(v,shift))})));}
  result.push(...shell.map((face,j)=>({...face,id:1000+i*100+face.id,color:'#526A7D',label:undefined,wire:true,cut:!face.outline&&j%24===0?(face.vertices.length===3?[[0,1]]:[[0,3]]):null,vertices:face.vertices.map(v=>add3(v,shift))})));
 });return result;
}
