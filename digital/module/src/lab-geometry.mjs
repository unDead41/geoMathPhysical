/** Pure lab mathematics. No DOM, runtime storage or network. */
import {buildMesh,meshBounds,FACE_COLORS,add3,cross3,clamp01} from './geometry.mjs';
import {calculateMeasures} from './lessons.mjs';
export const NET_PRESETS={cross:[[1,0],[0,1],[1,1],[2,1],[3,1],[1,2]],overlap:[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]};
const labMul=(v,k)=>v.map(x=>x*k);
const labBasis=(u,a,v,b)=>add3(labMul(u,a),labMul(v,b));
function labNetFrames(cells,t){
 const frames=Array(cells.length).fill(null);if(!cells.length)return frames;
 frames[0]={center:[cells[0][0],-cells[0][1],0],u:[1,0,0],v:[0,1,0],n:[0,0,1],parent:null};
 const queue=[0],c=Math.cos(clamp01(t)*Math.PI/2),s=Math.sin(clamp01(t)*Math.PI/2);
 for(const i of queue)for(let j=0;j<cells.length;j++){
  const dx=cells[j][0]-cells[i][0],dy=cells[i][1]-cells[j][1];if(frames[j]||Math.abs(dx)+Math.abs(dy)!==1)continue;
  const p=frames[i],u=dx?labBasis(p.u,c,p.n,-dx*s):p.u,v=dy?labBasis(p.v,c,p.n,-dy*s):p.v;
  const hinge=add3(p.center,labMul(dx?p.u:p.v,(dx||dy)/2)),center=add3(hinge,labMul(dx?u:v,(dx||dy)/2));
  frames[j]={u,v,n:cross3(u,v),center,parent:i};queue.push(j);
 }
 return frames;
}
// A cyclic tile layout has more joins than a hinge tree. Mark extra joins as cuts
// rather than pretending an uncut rectangular sheet can follow a tree fold.
function labNetCuts(cells,frames){
 const cuts=[];for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++){
  if(!frames[i]||!frames[j]||frames[i].parent===j||frames[j].parent===i)continue;
  const dx=cells[j][0]-cells[i][0],dy=cells[j][1]-cells[i][1];
  if(Math.abs(dx)+Math.abs(dy)===1)cuts.push({i,j,edge:dx===1?[1,2]:dx===-1?[3,0]:dy===1?[0,1]:[2,3],other:dx===1?[3,0]:dx===-1?[1,2]:dy===1?[2,3]:[0,1]});
 }return cuts;
}
export function cubeNetState(cells){
 const legal=Array.isArray(cells)&&cells.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isInteger(n)&&n>=0&&n<6));
 if(!legal)return {valid:false,connected:false,overlaps:[],message:'Gunakan petak dalam grid 6 × 6.'};
 if(new Set(cells.map(p=>p.join(','))).size!==cells.length)return {valid:false,connected:false,overlaps:[],message:'Dua muka tidak boleh berada pada petak yang sama.'};
 const frames=labNetFrames(cells,1),connected=cells.length>0&&frames.every(Boolean),groups=new Map();
 frames.forEach((f,id)=>{if(f){const key=f.n.map(n=>Math.round(n)).join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(id);}});
 const overlaps=[...groups.values()].filter(a=>a.length>1),valid=cells.length===6&&connected&&overlaps.length===0;
 let message=cells.length!==6?`Pilih tepat 6 muka. Kini ada ${cells.length}.`:!connected?'Sambungkan semua muka pada sisi penuh, bukan bucu sahaja.':overlaps.length?'Muka '+overlaps.map(a=>a.map(id=>id+1).join(' dan ')).join('; ')+' bertindih apabila dilipat.':'Bentangan sah: keenam-enam muka menutup kubus tanpa pertindihan.';
 const cutCount=labNetCuts(cells,frames).length;if(cutCount)message+=' Garis putus-putus ialah potongan tambahan yang digunakan dalam pratonton lipatan.';
 return {valid,connected,overlaps,message,cutCount};
}
export function cubeNetMesh(cells,t=0){
 const status=cubeNetState(cells),frames=labNetFrames(cells,t),warning=new Set(status.overlaps.flat()),cuts=labNetCuts(cells,frames);
 return cells.map(([x,y],id)=>{const f=frames[id]||{center:[x,-y,0],u:[1,0,0],v:[0,1,0],parent:null};return {id,name:'Muka '+(id+1),color:FACE_COLORS[id%6],outline:true,parent:f.parent,cutUnderlay:true,cut:cuts.flatMap(c=>c.i===id?[c.edge]:c.j===id?[c.other]:[]),warning:t>.98&&warning.has(id),vertices:[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([a,b])=>add3(f.center,labBasis(f.u,a,f.v,b)))};});
}
function labMeasure(shape,d){const r=calculateMeasures(shape,d,'full');if(!r.valid)throw new RangeError('Ukuran bongkah tidak sah.');return r;}
export function labDimensions(shape,d){
 labMeasure(shape,d);if(shape==='cube')return {w:d.a,h:d.a,d:d.a};if(shape==='cuboid')return {w:d.p,h:d.t,d:d.l};if(shape==='pyramid')return {a:d.a,h:d.t};return {r:d.j,h:d.t,l:Math.hypot(d.j,d.t)};
}
export function surfacePieces(shape,d){
 const m=labMeasure(shape,d),pi=Math.PI;let values,names;
 if(shape==='cube'){values=Array(6).fill(d.a*d.a);names=['Depan','Kanan','Belakang','Kiri','Atas','Bawah'];}
 if(shape==='cuboid'){values=[d.p*d.t,d.l*d.t,d.p*d.t,d.l*d.t,d.p*d.l,d.p*d.l];names=['Depan: p × t','Kanan: l × t','Belakang: p × t','Kiri: l × t','Atas: p × l','Bawah: p × l'];}
 if(shape==='pyramid'){values=[d.a*d.a,...Array(4).fill(d.a*m.slant/2)];names=['Tapak: a²','Segi tiga depan','Segi tiga kanan','Segi tiga belakang','Segi tiga kiri'];}
 if(shape==='cylinder'){values=[2*pi*d.j*d.t,pi*d.j*d.j,pi*d.j*d.j];names=['Melengkung: 2πjt','Tapak atas: πj²','Tapak bawah: πj²'];}
 if(shape==='cone'){values=[pi*d.j*m.slant,pi*d.j*d.j];names=['Melengkung: πjs','Tapak bulatan: πj²'];}
 return values.map((area,id)=>({id,area,name:names[id],color:FACE_COLORS[id]}));
}
export function pourState(kind,d,pours=0,progress=0){
 if(!['cone','pyramid'].includes(kind)||!Number.isInteger(pours)||pours<0||pours>2||!Number.isFinite(progress)||progress<0||progress>1)throw new RangeError('Keadaan tuangan tidak sah.');
 const m=labMeasure(kind,d),oneVolume=m.volume,capacity=3*oneVolume;
 return {oneVolume,capacity,sourceVolume:oneVolume*(1-progress),targetVolume:oneVolume*(pours+progress),sourceHeight:d.t*(1-Math.cbrt(progress)),targetHeight:d.t*(pours+progress)/3,fraction:(pours+progress)/3};
}
export function compositionMeasures(kind,d){
 if(!['roof','rocket'].includes(kind))throw new RangeError('Gabungan tidak diketahui.');
 const roof=kind==='roof',r=labMeasure(roof?'pyramid':'cone',d);if(!roof&&(!Number.isFinite(d.h)||d.h<.1||d.h>1000))throw new RangeError('Tinggi silinder tidak sah.');
 const base=roof?d.a*d.a:Math.PI*d.j*d.j,side=roof?4*base:2*Math.PI*d.j*d.h,roofSide=roof?2*d.a*r.slant:Math.PI*d.j*r.slant;
 const groups=[{key:'side',label:roof?'4 muka sisi kubus':'Permukaan melengkung silinder',area:side,external:true},{key:'bottom',label:roof?'Muka bawah kubus':'Tapak bawah silinder',area:base,external:true},{key:'joinLower',label:roof?'Muka atas kubus':'Tapak atas silinder',area:base,external:false},{key:'joinUpper',label:roof?'Tapak piramid':'Tapak kon',area:base,external:false},{key:'roofSide',label:roof?'4 muka segi tiga piramid':'Permukaan melengkung kon',area:roofSide,external:true}];
 return {groups,sharedArea:base,slant:r.slant,area:side+base+roofSide,separateArea:side+3*base+roofSide,volume:(roof?d.a**3:base*d.h)+r.volume};
}
function labMapMesh(mesh,offset=[0,0,0],idOffset=0,color=null,wire=false){return mesh.map(f=>({...f,id:f.id+idOffset,color:color||f.color,label:undefined,wire,vertices:f.vertices.map(v=>add3(v,offset))}));}
export function labSolidMesh(shape,d,offset=[0,0,0],idOffset=0,color=null,wire=false){
 const mesh=buildMesh(shape,0,96,labDimensions(shape,d)),b=meshBounds(mesh),shift=[offset[0]-b.center[0],offset[1]-b.min[1],offset[2]-b.center[2]];
 const result=labMapMesh(mesh,shift,idOffset,color,wire);
 if(wire)result.forEach((f,i)=>{if(!f.outline){f.cut=i%24===0?(f.vertices.length===3?[[0,1]]:[[0,3]]):null;}});
 return result;
}
export function unitCubeMesh(d,count){
 const {p,l,t}=d;labMeasure('cuboid',d);if(![p,l,t,count].every(Number.isInteger)||p>6||l>6||t>6||count<0||count>p*l*t)throw new RangeError('Bilangan kiub unit tidak sah.');
 const mesh=[];for(let n=0;n<count;n++){const y=Math.floor(n/(p*l)),z=Math.floor(n/p)%l,x=n%p;mesh.push(...labSolidMesh('cube',{a:1},[x-(p-1)/2,y,z-(l-1)/2],n*6,FACE_COLORS[y%6]));}
 mesh.push(...labSolidMesh('cuboid',{p,l,t},[0,0,0],2000,'#526A7D',true));return mesh;
}
function labFrustum(sides,rb,rt,h,offset,color,id){
 if(h<1e-9)return [];
 const ring=(r,y)=>Array.from({length:sides},(_,i)=>{const xz=sides===4?[[-r,-r],[r,-r],[r,r],[-r,r]][i]:[r*Math.sin(i*2*Math.PI/sides),r*Math.cos(i*2*Math.PI/sides)];return add3([xz[0],y,xz[1]],offset);});
 const bottom=ring(rb,0),top=ring(rt,h),faces=[];
 for(let i=0;i<sides;i++)faces.push({id,name:'Cecair',color,outline:sides===4,vertices:[bottom[i],bottom[(i+1)%sides],top[(i+1)%sides],top[i]]});
 faces.push({id,name:'Paras cecair',color,outline:true,vertices:top},{id,name:'Dasar cecair',color,outline:true,vertices:bottom});return faces;
}
export function pourMesh(kind,d,pours,progress,sourceFull=true){
 const p=pourState(kind,d,Math.min(2,pours),progress),r=kind==='cone'?d.j:d.a/2,shift=r+1.5,targetKind=kind==='cone'?'cylinder':'cuboid',td=kind==='cone'?d:{p:d.a,l:d.a,t:d.t};
 const source=sourceFull?p.sourceHeight:0,receiver=pours===3?d.t:p.targetHeight;
 const mesh=[...labSolidMesh(kind,d,[-shift,0,0],1000,'#526A7D',true),...labSolidMesh(targetKind,td,[shift,0,0],2000,'#526A7D',true)];
 mesh.push(...labFrustum(kind==='cone'?80:4,r,r*(1-source/d.t),source,[-shift,0,0],'#64CBB8',0));
 mesh.push(...labFrustum(kind==='cone'?80:4,r,r,receiver,[shift,0,0],'#94BDF7',1));return mesh;
}
export function compositionMesh(kind,d,joined=1){
 const roof=kind==='roof',m=compositionMeasures(kind,d),height=roof?d.a:d.h,space=(roof?d.a:d.j*2)*.7*(1-clamp01(joined));
 const lower=labSolidMesh(roof?'cube':'cylinder',roof?{a:d.a}:{j:d.j,t:d.h}),upper=labSolidMesh(roof?'pyramid':'cone',d,[0,height+space,0],10);
 lower.forEach(f=>f.group=f.id===(roof?4:1)?'joinLower':f.id===(roof?5:2)?'bottom':'side');
 upper.forEach(f=>f.group=f.id===(roof?10:11)?'joinUpper':'roofSide');
 return [...lower,...upper];
}
