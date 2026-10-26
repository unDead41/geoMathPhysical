import {calculateMeasures,LESSON_DATA,MEASURE_FIELDS} from './lessons.mjs';
import {PRESET_NETS,presetNetMesh} from './preset-nets.mjs';
import {labSolidMesh} from './lab-geometry.mjs';
import {meshBounds,add3,clamp01} from './geometry.mjs';
export function volumeFields(key){return MEASURE_FIELDS[key]||(['triangular-prism','pentagonal-prism','hexagonal-prism','tetrahedron'].includes(key)?['a','t']:[]);}
export function volumeDefaults(key){return Object.fromEntries(Object.entries(LESSON_DATA[key]?.defaults||{a:3,t:4}).map(([k,v])=>[k,Math.max(1,Math.min(8,v))]));}
export function volumeInfo(key,d){
 const data=PRESET_NETS.find(x=>x.key===key);if(!data)throw new RangeError('Pilih bongkah isi padu yang tersedia.');
 let volume,baseArea,formula;
 if(data.project){const m=calculateMeasures(key,d,'full');if(!m.valid)throw new RangeError('Ukuran isi padu tidak sah.');volume=m.volume;formula=LESSON_DATA[key].volume.formula;}
 else {for(const k of ['a','t'])if(!Number.isFinite(d[k])||d[k]<.1||d[k]>1000)throw new RangeError('Ukuran isi padu tidak sah.');const n=key==='tetrahedron'?3:data.n;baseArea=n*d.a*d.a/(4*Math.tan(Math.PI/n));volume=baseArea*d.t/(key==='tetrahedron'?3:1);formula=key==='tetrahedron'?'V = ⅓ × luas tapak × tinggi tegak':'V = luas tapak × tinggi tegak';}
 return {name:data.name,volume,baseArea,formula};
}
export function comparisonTotal(items,included=[true,true],count=2){return items.slice(0,count).reduce((s,item,i)=>s+(included[i]?volumeInfo(item.key,item.d).volume*clamp01(item.fill):0),0);}
function volumeShell(item){const data=PRESET_NETS.find(x=>x.key===item.key);volumeInfo(item.key,item.d);if(data.project)return labSolidMesh(item.key,item.d);const mesh=presetNetMesh(item.key,1,item.d),b=meshBounds(mesh);return mesh.map(f=>({...f,vertices:f.vertices.map(p=>[p[0]-b.center[0],p[1]-b.min[1],p[2]-b.center[2]])}));}
function volumeClip(mesh,level,color,id){
 const faces=[],cap=new Map();for(const f of mesh){const out=[];for(let i=0;i<f.vertices.length;i++){const p=f.vertices[i],q=f.vertices[(i+1)%f.vertices.length],a=p[1]<=level+1e-9,b=q[1]<=level+1e-9;if(a)out.push(p);if(a!==b){const t=(level-p[1])/(q[1]-p[1]),v=p.map((x,k)=>x+t*(q[k]-x));out.push(v);cap.set(v.map(x=>Math.round(x*1e8)).join(','),v);}}if(out.length>=3)faces.push({...f,id,color,label:undefined,cut:null,vertices:out});}
 const ps=[...cap.values()];if(ps.length>=3){const c=[0,2].map(k=>ps.reduce((s,p)=>s+p[k],0)/ps.length);ps.sort((a,b)=>Math.atan2(a[2]-c[1],a[0]-c[0])-Math.atan2(b[2]-c[1],b[0]-c[0]));faces.push({id,color,outline:true,vertices:ps});}return faces;
}
export function volumeComparisonMesh(items,count=2){
 const solids=items.slice(0,count).map(volumeShell),bounds=solids.map(meshBounds),offsets=count===1?[0]:[-(bounds[0].max[0]-bounds[0].min[0])/2-1,(bounds[1].max[0]-bounds[1].min[0])/2+1],result=[];
 solids.forEach((shell,i)=>{const item=items[i],b=bounds[i],f=clamp01(item.fill),pyramidal=['cone','pyramid','tetrahedron'].includes(item.key),height=(b.max[1]-b.min[1])*(pyramidal?1-Math.cbrt(1-f):f),shift=[offsets[i],0,0],color=i?'#94BDF7':'#64CBB8';
  if(f>0){const fluid=f===1?shell.map(face=>({...face,id:i,color,label:undefined,cut:null})):volumeClip(shell,b.min[1]+height,color,i);result.push(...fluid.map(face=>({...face,vertices:face.vertices.map(v=>add3(v,shift))})));}
  result.push(...shell.map((face,j)=>({...face,id:1000+i*100+face.id,color:'#526A7D',label:undefined,wire:true,cut:!face.outline&&j%24===0?(face.vertices.length===3?[[0,1]]:[[0,3]]):null,vertices:face.vertices.map(v=>add3(v,shift))})));
 });return result;
}
