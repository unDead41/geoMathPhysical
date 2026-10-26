/** Geometry shared by the learning catalogue, separate from the game's Shape IDs. */
import {buildMesh,meshBounds,FACE_COLORS,add3,sub3,cross3,length3,clamp01} from './geometry.mjs';
import {labDimensions,surfacePieces} from './lab-geometry.mjs';
import {presetNetMesh,PRESET_NETS} from './preset-nets.mjs';
import {LESSON_DATA,calculateMeasures} from './lessons.mjs';

export const ROUND_STUDY_SHAPES=['sphere','hemisphere'];
const learningCore=['cube','cuboid','pyramid','cylinder','cone'];
function roundStudyMesh(shape,r,segments){
 if(!Number.isFinite(r)||r<=0)throw new RangeError('Jejari mesti positif.');
 const n=segments<=64?32:72,lat=n/2,half=shape==='hemisphere',start=half?0:-Math.PI/2,range=half?Math.PI/2:Math.PI,faces=[];
 const point=(i,j)=>{const a=i*2*Math.PI/n,b=start+range*j/lat;return [r*Math.cos(b)*Math.sin(a),r*Math.sin(b),r*Math.cos(b)*Math.cos(a)];};
 for(let j=0;j<lat;j++)for(let i=0;i<n;i++){
  const raw=[point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1)],vs=[];
  for(const p of raw)if(!vs.some(q=>length3(sub3(p,q))<1e-9))vs.push(p);
  if(vs.length<3)continue;
  faces.push({id:0,name:'Permukaan melengkung',color:FACE_COLORS[0],outline:false,vertices:vs,...(i===0&&j===Math.floor(lat/2)?{label:'1'}:{})});
 }
 if(half){const rim=Array.from({length:n},(_,i)=>[r*Math.sin(i*2*Math.PI/n),0,r*Math.cos(i*2*Math.PI/n)]).reverse();faces.push({id:1,name:'Tapak bulatan',color:FACE_COLORS[1],outline:true,vertices:rim});}
 return faces;
}
export function learningMesh(shape,progress=0,segments=96,dimensions){
 if(learningCore.includes(shape))return buildMesh(shape,progress,segments,dimensions?labDimensions(shape,dimensions):undefined);
 if(ROUND_STUDY_SHAPES.includes(shape)){
  if(!Number.isFinite(progress)||Math.abs(progress)>1e-10)throw new RangeError('Permukaan sfera tidak mempunyai bentangan rata tepat.');
  return roundStudyMesh(shape,(dimensions||LESSON_DATA[shape].defaults).j,segments);
 }
 if(PRESET_NETS.some(p=>p.key===shape))return presetNetMesh(shape,1-progress,dimensions||LESSON_DATA[shape].defaults);
 throw new RangeError('Bongkah pembelajaran tidak diketahui.');
}
export function studySolidMesh(shape,d){
 const mesh=learningMesh(shape,0,96,d),b=meshBounds(mesh),shift=[-b.center[0],-b.min[1],-b.center[2]];
 return mesh.map(f=>({...f,vertices:f.vertices.map(p=>add3(p,shift))}));
}
/** Fraction of full upright height for a given fraction of actual volume. */
export function fillLevelRatio(shape,fraction){
 if(!Number.isFinite(fraction))throw new RangeError('Pecahan isi tidak sah.');
 const f=clamp01(fraction);if(f===0||f===1)return f;
 if(['cone','pyramid','tetrahedron'].includes(shape))return 1-Math.cbrt(1-f);
 if(ROUND_STUDY_SHAPES.includes(shape)){
  let lo=0,hi=1;for(let i=0;i<60;i++){const x=(lo+hi)/2,u=shape==='sphere'?2*x:x,value=shape==='sphere'?(3*u*u-u*u*u)/4:(3*u-u*u*u)/2;if(value<f)lo=x;else hi=x;}return (lo+hi)/2;
 }
 return f;
}
export function studySurfacePieces(shape,d){
 if(learningCore.includes(shape))return surfacePieces(shape,d);
 const r=calculateMeasures(shape,d,'full');if(!r.valid)throw new RangeError('Ukuran tidak sah.');
 const item=(id,name,area)=>({id,name,area,color:FACE_COLORS[id%FACE_COLORS.length]});
 if(shape==='sphere')return [item(0,'Permukaan melengkung',r.area)];
 if(shape==='hemisphere')return [item(0,'Permukaan melengkung',2*Math.PI*d.j*d.j),item(1,'Tapak bulatan',Math.PI*d.j*d.j)];
 if(shape==='tetrahedron')return [item(0,'Tapak segi tiga sama sisi',r.baseArea),...Array.from({length:3},(_,i)=>item(i+1,'Muka sisi '+(i+1),d.a*r.slant/2))];
 const n=shape==='triangular-prism'?3:shape==='pentagonal-prism'?5:6;
 return [...Array.from({length:n},(_,i)=>item(i,'Muka segi empat tepat '+(i+1),d.a*d.t)),item(n,'Tapak atas',r.baseArea),item(n+1,'Tapak bawah',r.baseArea)];
}
