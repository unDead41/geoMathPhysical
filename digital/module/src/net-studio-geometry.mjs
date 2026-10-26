/** Editable nets of convex polyhedra. Each selected connection is a real edge. */
import {PRESET_NETS,presetNetMesh} from './preset-nets.mjs';
import {cross3,sub3,add3,length3,clamp01} from './geometry.mjs';

export const STUDIO_SHAPES=PRESET_NETS.filter(s=>!['cylinder','cone'].includes(s.key)).map(s=>({key:s.key,name:s.name}));
const nsClosedCache=new Map(),nsStateCache=new Map();
const NS_FIELDS={cube:['a'],cuboid:['p','l','t'],pyramid:['a','t'],'triangular-prism':['a','t'],'pentagonal-prism':['a','t'],'hexagonal-prism':['a','t'],tetrahedron:['a','t']};
export function studioFields(shape){if(!NS_FIELDS[shape])throw new RangeError('Bentuk studio tidak diketahui.');return [...NS_FIELDS[shape]];}
export function studioDimensionDefaults(shape){return Object.fromEntries(studioFields(shape).map(k=>[k,k==='t'?3:k==='p'?3:2]));}
const nsDot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const nsUnit=v=>v.map(x=>x/(length3(v)||1));
const nsKey=p=>p.map(x=>Math.round(x*1e7)).join(',');
const nsEdgeKey=(a,b)=>[nsKey(a),nsKey(b)].sort().join('|');
const nsCenter=vertices=>vertices.reduce((s,v)=>add3(s,v),[0,0,0]).map(v=>v/vertices.length);
function nsNormal(vertices){return nsUnit(cross3(sub3(vertices[1],vertices[0]),sub3(vertices[2],vertices[0])));}
function nsRotate(p,origin,axis,angle){
 const v=sub3(p,origin),c=Math.cos(angle),s=Math.sin(angle),cr=cross3(axis,v),dot=nsDot(axis,v);
 return add3(origin,v.map((x,i)=>x*c+cr[i]*s+axis[i]*dot*(1-c)));
}
function nsSolid(shape,dimensions=undefined){
 const dim=dimensions?Object.fromEntries(studioFields(shape).map(k=>[k,dimensions[k]])):undefined,key=shape+':'+JSON.stringify(dim);
 if(dim&&Object.values(dim).some(v=>!Number.isFinite(v)||v<=0||v>1000))throw new RangeError('Ukuran studio mesti positif dan tidak melebihi 1000.');
 if(nsClosedCache.has(key))return nsClosedCache.get(key);
 const spec=PRESET_NETS.find(s=>s.key===shape);
 if(!spec||!STUDIO_SHAPES.some(s=>s.key===shape))throw new RangeError('Studio ini menggunakan muka poligon sahaja.');
 const source=presetNetMesh(shape,1,dim),center=nsCenter(source.flatMap(f=>f.vertices));
 const faces=source.map((f,i)=>{
  let vertices=f.vertices.map(v=>[...v]);
  if(nsDot(nsNormal(vertices),sub3(nsCenter(vertices),center))<0)vertices.reverse();
  return {...f,id:i,name:spec.labels[i]||'Muka '+(i+1),vertices};
 });
 const edges=new Map();
 for(const f of faces)for(let i=0;i<f.vertices.length;i++){
  const a=f.vertices[i],b=f.vertices[(i+1)%f.vertices.length],key=nsEdgeKey(a,b);
  if(!edges.has(key))edges.set(key,{a,b,faces:[]});edges.get(key).faces.push(f.id);
 }
 const adjacent=faces.map(()=>[]),hinges=new Map();
 for(const edge of edges.values()){
  if(edge.faces.length!==2)throw new Error('Bongkah studio mesti tertutup pada setiap rusuk.');
  const [a,b]=edge.faces;adjacent[a].push(b);adjacent[b].push(a);hinges.set([a,b].sort((x,y)=>x-y).join(','),edge);
 }
 adjacent.forEach(a=>a.sort((x,y)=>x-y));
 const result={shape,name:spec.name,faces,adjacent,hinges};if(nsClosedCache.size>=128)nsClosedCache.delete(nsClosedCache.keys().next().value);nsClosedCache.set(key,result);return result;
}
export function studioAdjacency(shape,dimensions=undefined){const s=nsSolid(shape,dimensions);return s.faces.map(f=>({id:f.id,name:f.name,neighbors:[...s.adjacent[f.id]]}));}
export function defaultStudioTree(shape){
 const s=nsSolid(shape),count=s.faces.length;
 if(shape==='cube'||shape==='cuboid')return [null,0,1,0,0,0];
 if(shape==='pyramid'||shape==='tetrahedron')return Array.from({length:count},(_,i)=>i?0:null);
 const n=count-2;return Array.from({length:count},(_,i)=>i===0?null:i<n?i-1:0);
}
function nsCheckTree(s,parents){
 if(!Array.isArray(parents)||parents.length!==s.faces.length||parents[0]!==null)return 'Muka 1 ialah muka asas. Setiap muka lain memerlukan satu sambungan.';
 for(let i=1;i<parents.length;i++)if(!Number.isInteger(parents[i])||!s.adjacent[i].includes(parents[i]))return 'Sambungkan muka pada rusuk sebenar yang sepadan.';
 for(let i=1;i<parents.length;i++){
  const seen=new Set();let at=i;
  while(at!==0){if(seen.has(at))return 'Sambungan membentuk kitaran. Pilih sambungan yang menuju ke muka asas.';seen.add(at);at=parents[at];}
 }
 return '';
}
function nsPose(s,parents,fold,inside=[]){
 const transforms=[p=>[...p]],posed=[],root=s.faces[0],origin=nsCenter(root.vertices),u=nsUnit(sub3(root.vertices[1],root.vertices[0])),n=nsNormal(root.vertices),v=cross3(n,u);
 function transform(id){
  if(transforms[id])return transforms[id];
  const parent=parents[id],ancestor=transform(parent),edge=s.hinges.get([id,parent].sort((a,b)=>a-b).join(','));
  const a=ancestor(edge.a),b=ancestor(edge.b),axis=nsUnit(sub3(b,a));
  const from=nsNormal(s.faces[id].vertices.map(ancestor)),parentNormal=nsNormal(s.faces[parent].vertices.map(ancestor)),to=inside[id]?parentNormal.map(n=>-n):parentNormal;
  const angle=Math.atan2(nsDot(axis,cross3(from,to)),Math.max(-1,Math.min(1,nsDot(from,to))))*(1-fold);
  transforms[id]=p=>nsRotate(ancestor(p),a,axis,angle);return transforms[id];
 }
 for(const face of s.faces){
  const t=transform(face.id),vertices=face.vertices.map(p=>{const q=sub3(t(p),origin);return [nsDot(q,u),nsDot(q,v),nsDot(q,n)];});
  posed.push({...face,vertices,parent:parents[face.id],outline:true,cut:null});
 }
 return posed;
}
function nsOverlapArea(A,B){
 let polygon=A.map(p=>p.slice(0,2));
 const signed=B.reduce((sum,p,i)=>sum+p[0]*B[(i+1)%B.length][1]-B[(i+1)%B.length][0]*p[1],0),sign=Math.sign(signed)||1;
 for(let i=0;i<B.length&&polygon.length;i++){
  const a=B[i],b=B[(i+1)%B.length],side=p=>sign*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])),next=[];
  for(let j=0;j<polygon.length;j++){
   const p=polygon[j],q=polygon[(j+1)%polygon.length],cp=side(p),cq=side(q),pin=cp>=-1e-10,qin=cq>=-1e-10;
   if(pin)next.push(p);
   if(pin!==qin){const t=cp/(cp-cq);next.push(p.map((x,k)=>x+t*(q[k]-x)));}
  }
  polygon=next;
 }
 return Math.abs(polygon.reduce((sum,p,i)=>sum+p[0]*polygon[(i+1)%polygon.length][1]-polygon[(i+1)%polygon.length][0]*p[1],0))/2;
}
export function netStudioState(shape,parents=defaultStudioTree(shape),dimensions=undefined,inside=[]){
 const solid=nsSolid(shape,dimensions),key=shape+':'+JSON.stringify([parents,dimensions,inside]);let state=nsStateCache.get(key);
 if(!state){
  const error=nsCheckTree(solid,parents),overlaps=[];
  if(!error){const flat=nsPose(solid,parents,0,inside);for(let a=0;a<flat.length;a++)for(let b=a+1;b<flat.length;b++)if(nsOverlapArea(flat[a].vertices,flat[b].vertices)>1e-7)overlaps.push([a,b]);}
  state={name:solid.name,treeValid:!error,valid:!error&&overlaps.length===0,overlaps,parents:Array.isArray(parents)?[...parents]:[],message:error||(!overlaps.length?'Bentangan sah. Muka tidak bertindih dan semua sambungan menggunakan rusuk yang sepadan.':'Muka '+[...new Set(overlaps.flat())].map(i=>i+1).join(', ')+' bertindih pada bentangan rata. Tukar sambungannya; muka terlibat disorot merah.')};
  if(nsStateCache.size>=256)nsStateCache.delete(nsStateCache.keys().next().value);nsStateCache.set(key,state);
 }
 return {...state,parents:[...state.parents],overlaps:state.overlaps.map(p=>[...p])};
}
export function studioNetMesh(shape,parents=defaultStudioTree(shape),fold=0,dimensions=undefined,inside=[]){
 if(!Number.isFinite(fold))throw new RangeError('Kemajuan lipatan mesti sah.');
 const s=nsSolid(shape,dimensions),state=netStudioState(shape,parents,dimensions,inside);if(!state.treeValid)throw new RangeError(state.message);
 const warned=new Set(state.overlaps.flat());return nsPose(s,parents,clamp01(fold),inside).map(f=>({...f,warning:warned.has(f.id)}));
}
let nsCubeExamples=null;
/** Group the 384 edge trees by rotations/reflections of their six square cells. */
export function cubeStudioExamples(){
 if(!nsCubeExamples){
  const adjacent=studioAdjacency('cube'),found=new Map();
  const signature=parents=>{
   const centers=studioNetMesh('cube',parents,0).map(f=>nsCenter(f.vertices).slice(0,2).map(n=>Math.round(n/2))),variants=[];
   for(const flip of [1,-1])for(let turn=0;turn<4;turn++){
    let cells=centers.map(([x,y])=>[x*flip,y]);for(let t=0;t<turn;t++)cells=cells.map(([x,y])=>[-y,x]);
    const minX=Math.min(...cells.map(p=>p[0])),minY=Math.min(...cells.map(p=>p[1]));variants.push(cells.map(([x,y])=>[x-minX,y-minY]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(p=>p.join(',')).join(';'));
   }
   return variants.sort()[0];
  };
  const add=parents=>{const state=netStudioState('cube',parents);if(state.valid){const key=signature(parents);if(!found.has(key))found.set(key,[...parents]);}};
  add(defaultStudioTree('cube'));
  function enumerate(parents){if(parents.length===adjacent.length){add(parents);return;}for(const parent of adjacent[parents.length].neighbors)enumerate([...parents,parent]);}
  enumerate([null]);nsCubeExamples=[...found.values()];
 }
 return nsCubeExamples.map(parents=>[...parents]);
}
