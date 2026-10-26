/** Ready-made, valid nets; enrichment does not alter quiz Shape IDs. */
import {buildMesh,FACE_COLORS,clamp01,ease,rx,add3,sub3,cross3,length3} from './geometry.mjs';
import {labDimensions} from './lab-geometry.mjs';
import {MODEL_DATA} from './content.mjs';
const PRESET_COLORS=[...FACE_COLORS,'#83D0EA','#DAAE8D'];
const presetPolygonNames={3:'segi tiga',5:'segi lima',6:'segi enam'};
export const PRESET_NETS=[...['cube','cuboid','pyramid','cylinder','cone'].map(key=>({key,name:key==='pyramid'?'Piramid bertapak segi empat sama':MODEL_DATA[key].name,labels:MODEL_DATA[key].labels,project:true,description:MODEL_DATA[key].net})),...[[3,'triangular-prism'],[5,'pentagonal-prism'],[6,'hexagonal-prism']].map(([n,key])=>({key,n,name:'Prisma '+presetPolygonNames[n],labels:[...Array.from({length:n},(_,i)=>'Muka segi empat tepat '+(i+1)),'Tapak '+presetPolygonNames[n]+' atas','Tapak '+presetPolygonNames[n]+' bawah'],project:false,description:`Prisma tegak: dua tapak ${presetPolygonNames[n]} sekata yang sama saiz dan ${n} muka segi empat tepat. Lipat jalur muka sisi dahulu, kemudian tutup kedua-dua tapak.`})),{key:'tetrahedron',name:'Piramid bertapak segi tiga',labels:['Tapak segi tiga','Muka sisi 1','Muka sisi 2','Muka sisi 3'],project:false,description:'Tapaknya segi tiga sama sisi. Juga dikenali sebagai tetrahedron. Model ini mempunyai 4 muka segi tiga, 6 rusuk dan 4 bucu. Tiga muka sisi bertemu pada satu puncak.'}];
function presetPanel(id,vertices,parent=null){return {id,name:String(id+1),color:PRESET_COLORS[id],outline:true,vertices,parent};}
function presetPrism(n,fold,d={}){
 const r=d.a?d.a/(2*Math.sin(Math.PI/n)):1.3,h=d.t||2.4,s=2*r*Math.sin(Math.PI/n),angle=2*Math.PI/n*ease(fold/.72),cap=(1-ease((fold-.68)/.32))*Math.PI/2,faces=[];
 let start=[-s/2,0,0];
 for(let i=0;i<n;i++){const end=add3(start,[s*Math.cos(i*angle),0,-s*Math.sin(i*angle)]);faces.push(presetPanel(i,[[start[0],-h/2,start[2]],[end[0],-h/2,end[2]],[end[0],h/2,end[2]],[start[0],h/2,start[2]]],i?i-1:null));start=end;}
 let p=[-s/2,0,0];const polygon=[];for(let i=0;i<n;i++){polygon.push([...p]);p=add3(p,[s*Math.cos(i*2*Math.PI/n),0,-s*Math.sin(i*2*Math.PI/n)]);}
 faces.push(presetPanel(n,polygon.map(v=>add3(rx(v,cap),[0,h/2,0])),0),presetPanel(n+1,polygon.map(v=>add3(rx(v,-cap),[0,-h/2,0])),0));return faces;
}
function presetRotateAxis(point,origin,axis,angle){const v=sub3(point,origin),c=Math.cos(angle),s=Math.sin(angle),cross=cross3(axis,v),dot=axis.reduce((a,x,i)=>a+x*v[i],0);return add3(origin,v.map((x,i)=>x*c+cross[i]*s+axis[i]*dot*(1-c)));}
function presetTetrahedron(fold,d={}){
 const r=d.a?d.a/Math.sqrt(3):1.5,h=d.t||r*Math.SQRT2,base=Array.from({length:3},(_,i)=>[r*Math.sin(i*2*Math.PI/3),0,r*Math.cos(i*2*Math.PI/3)]),tip=[0,h,0],faces=[presetPanel(0,base)];
 for(let i=0;i<3;i++){const a=base[i],b=base[(i+1)%3],edge=sub3(b,a),axis=edge.map(x=>x/length3(edge)),mid=a.map((x,j)=>(x+b[j])/2),closed=sub3(tip,mid),out=[mid[0],0,mid[2]],target=out.map(x=>x*length3(closed)/length3(out));const cross=cross3(closed,target),signed=Math.atan2(axis.reduce((s,x,j)=>s+x*cross[j],0),closed.reduce((s,x,j)=>s+x*target[j],0));faces.push(presetPanel(i+1,[a,b,tip].map(p=>presetRotateAxis(p,a,axis,signed*(1-fold))),0));}
 return faces.map(f=>({...f,vertices:f.vertices.map(v=>rx(v,-(1-fold)*Math.PI/2))}));
}
export function presetNetMesh(key,fold=0,dimensions=undefined){
 const data=PRESET_NETS.find(p=>p.key===key);if(!data||!Number.isFinite(fold))throw new RangeError('Bentangan siap tidak diketahui.');const t=clamp01(fold);
 if(data.project)return buildMesh(key,1-t,144,dimensions?labDimensions(key,dimensions):undefined);if(key==='tetrahedron')return presetTetrahedron(t,dimensions);return presetPrism(data.n,t,dimensions);
}
