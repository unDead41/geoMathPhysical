/** Original orthographic exercises. Coordinates and tolerance are in drawing cm.
 * Meshes come from the learning geometry; curved outlines remain analytic.
 * Convention: front from +Z, plan from +Y, right elevation from +X placed LEFT
 * of the front elevation (Form 3 Chapter 7, method 1, printed pp. 182–184).
 */
import {studySolidMesh} from './learning-mesh.mjs';
import {meshBounds} from './geometry.mjs';
import {LESSON_DATA} from './lessons.mjs';

export const PROJECTION_TOLERANCE=.06;
export const PROJECTION_VIEWS=Object.freeze({
 front:{direction:[0,0,1],position:'above-plan',ms:'Dongakan depan',en:'Front elevation'},
 side:{direction:[1,0,0],position:'left-of-front',ms:'Dongakan sisi kanan',en:'Right side elevation'},
 plan:{direction:[0,1,0],position:'below-front',ms:'Pelan',en:'Plan'}
});
export const PROJECTION_SHAPES=Object.freeze([
 {key:'cube',ms:'Kubus',en:'Cube'}, {key:'cuboid',ms:'Kuboid',en:'Cuboid'},
 {key:'pyramid',ms:'Piramid tapak segi empat sama',en:'Square based pyramid'},
 {key:'cylinder',ms:'Silinder',en:'Cylinder'}, {key:'cone',ms:'Kon',en:'Cone'},
 {key:'assembly-step',ms:'Susunan kiub: tangga dan takuk',en:'Cube assembly: step and notch'},
 {key:'assembly-recess',ms:'Susunan kiub: lekuk atas',en:'Cube assembly: top recess'}
]);
const projEpsilon=1e-8;
const projDot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
const projSubtract=(a,b)=>a.map((n,i)=>n-b[i]);
const projLerp=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
const projCross2=(a,b)=>a[0]*b[1]-a[1]*b[0];
const projKey=p=>p.map(n=>Math.round(n*1e8)).join(',');
const projClean=n=>Math.round(n*1e10)/1e10;
const projLine=(a,b,type='visible')=>({kind:'line',a,b,type});
const projUnique=items=>[...new Set(items)];
function projNormal(face){
 const a=projSubtract(face.vertices[1],face.vertices[0]),b=projSubtract(face.vertices[2],face.vertices[0]);
 const n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=Math.hypot(...n)||1;
 return n.map(v=>v/length);
}
function projAssemblyCells(key){
 if(key==='assembly-step'){
  const cells=[];for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++)if(!(x===0&&y===1&&z===0))cells.push([x,y,z]);
  cells.push([1,2,1]);return cells;
 }
 const cells=[];for(let x=0;x<3;x++)for(let y=0;y<2;y++)for(let z=0;z<3;z++)if(!(x===1&&y===1&&z===1))cells.push([x,y,z]);return cells;
}
function projAssemblyMesh(cells){
 const occupied=new Set(cells.map(p=>p.join(','))),source=studySolidMesh('cube',{a:1}),mesh=[];
 for(const [id,cell] of cells.entries())for(const face of source){
  const centre=face.vertices.reduce((s,p)=>s.map((n,i)=>n+p[i]/face.vertices.length),[0,0,0]),out=[centre[0]*2,(centre[1]-.5)*2,centre[2]*2].map(Math.round);
  if(occupied.has(cell.map((n,i)=>n+out[i]).join(',')))continue;
  mesh.push({...face,id:id*6+face.id,vertices:face.vertices.map(p=>[p[0]+cell[0],p[1]+cell[1],p[2]+cell[2]])});
 }
 return mesh;
}
/** Supported source solid with its own dimensions; never mutates quiz or notes. */
export function projectionModel(shape='cube',dimensions){
 if(!PROJECTION_SHAPES.some(item=>item.key===shape))throw new RangeError('Unsupported projection solid.');
 const assembly=shape.startsWith('assembly-'),d=assembly?{a:1}:{...(dimensions||LESSON_DATA[shape].defaults)},cells=assembly?projAssemblyCells(shape):null;
 const mesh=assembly?projAssemblyMesh(cells):studySolidMesh(shape,d),bounds=meshBounds(mesh);
 return {shape,dimensions:d,mesh,bounds,extents:bounds.max.map((n,i)=>n-bounds.min[i]),cells,gridStep:shape==='pyramid'?.25:.5};
}
/** Measurement arrows share the model's actual coordinate frame. Round bases
 * use their diameter through the centre, rather than a bounding-box corner. */
export function projectionDimensionSegments(model){
 const {min,max,center}=model.bounds,[w,h,d]=model.extents,round=['cylinder','cone'].includes(model.shape),axis=['pyramid','cone'].includes(model.shape);
 const result=[{key:'width',a:[min[0],min[1],round?center[2]:max[2]],b:[max[0],min[1],round?center[2]:max[2]],value:projClean(w)}];
 if(!round)result.push({key:'depth',a:[max[0],min[1],max[2]],b:[max[0],min[1],min[2]],value:projClean(d)});
 result.push({key:'height',a:axis?[center[0],min[1],center[2]]:[max[0],min[1],round?center[2]:max[2]],b:axis?[center[0],max[1],center[2]]:[max[0],max[1],round?center[2]:max[2]],value:projClean(h)});
 return result;
}
function projCoordinates(p,view,bounds){
 if(view==='front')return [p[0]-bounds.min[0],p[1]-bounds.min[1],p[2]];
 if(view==='side')return [bounds.max[2]-p[2],p[1]-bounds.min[1],p[0]];
 return [p[0]-bounds.min[0],bounds.max[2]-p[2],p[1]];
}
function projPhysicalEdges(mesh){
 const edges=new Map();
 for(const face of mesh){const normal=projNormal(face);for(let i=0;i<face.vertices.length;i++){
  const a=face.vertices[i],b=face.vertices[(i+1)%face.vertices.length],key=[projKey(a),projKey(b)].sort().join('|');
  if(!edges.has(key))edges.set(key,{a,b,normals:[]});edges.get(key).normals.push(normal);
 }}
 // Adjacent coplanar unit faces do not create a physical edge in a joined solid.
 return [...edges.values()].filter(e=>e.normals.length===1||e.normals.some(n=>Math.abs(projDot(n,e.normals[0]))<1-projEpsilon));
}
function projIntersectionParameters(a,b,c,d){
 const u=projSubtract(b,a),v=projSubtract(d,c),q=projSubtract(c,a),cross=projCross2(u,v),length2=projDot(u,u);
 if(Math.abs(cross)<projEpsilon){
  if(Math.abs(projCross2(q,u))>projEpsilon||length2<projEpsilon)return [];
  return [projDot(q,u)/length2,projDot(projSubtract(d,a),u)/length2].filter(t=>t>projEpsilon&&t<1-projEpsilon);
 }
 const t=projCross2(q,v)/cross,s=projCross2(q,u)/cross;
 return t>projEpsilon&&t<1-projEpsilon&&s>=-projEpsilon&&s<=1+projEpsilon?[t]:[];
}
function projFaceDepth(p,vertices){
 // All source faces are convex. A triangle fan gives the exact plane depth.
 for(let i=1;i<vertices.length-1;i++){
  const a=vertices[0],b=vertices[i],c=vertices[i+1],v=projSubtract(b,a),w=projSubtract(c,a),q=projSubtract(p,a),det=projCross2(v,w);
  if(Math.abs(det)<projEpsilon)continue;
  const u=projCross2(q,w)/det,t=projCross2(v,q)/det;
  if(u>=-projEpsilon&&t>=-projEpsilon&&u+t<=1+projEpsilon)return a[2]+u*(b[2]-a[2])+t*(c[2]-a[2]);
 }
 return -Infinity;
}
function projPolyhedronView(model,view){
 const faces=model.mesh.map(f=>f.vertices.map(p=>projCoordinates(p,view,model.bounds))),primitives=[];
 for(const edge of projPhysicalEdges(model.mesh)){
  const a=projCoordinates(edge.a,view,model.bounds),b=projCoordinates(edge.b,view,model.bounds);
  if(Math.hypot(a[0]-b[0],a[1]-b[1])<projEpsilon)continue;
  const cuts=[0,1];for(const face of faces)for(let i=0;i<face.length;i++)cuts.push(...projIntersectionParameters(a,b,face[i],face[(i+1)%face.length]));
  const sorted=projUnique(cuts.map(n=>Math.round(n*1e10)/1e10)).sort((x,y)=>x-y);
  for(let i=0;i<sorted.length-1;i++){
   const start=sorted[i],end=sorted[i+1];if(end-start<projEpsilon)continue;
   const p=projLerp(a,b,(start+end)/2),depth=Math.max(...faces.map(f=>projFaceDepth(p,f))),type=depth>p[2]+projEpsilon?'hidden':'visible';
   primitives.push(projLine(projLerp(a,b,start).slice(0,2),projLerp(a,b,end).slice(0,2),type));
  }
 }
 return projCanonical(primitives).map(({indices,...p})=>p);
}
function projCurvedView(model,view){
 const {j:r,t:h}=model.dimensions;
 if(view==='plan')return [{kind:'circle',center:[r,r],r,type:'visible'}];
 const points=model.shape==='cylinder'?[[0,0],[2*r,0],[2*r,h],[0,h]]:[[0,0],[2*r,0],[r,h]];
 return points.map((p,i)=>projLine(p,points[(i+1)%points.length]));
}
/** scale is the denominator: 1 means 1:1; 2 means 1:2. The default anchor is
 * (1,1) drawing cm, so position and scale can be checked independently. */
export function projectionViews(model,scale=1,anchor=[1,1]){
 if(![1,2].includes(scale)||!Array.isArray(anchor)||anchor.length!==2||!anchor.every(Number.isFinite))throw new RangeError('Invalid drawing scale or anchor.');
 const result={};for(const view of ['front','side','plan']){
  const source=['cylinder','cone'].includes(model.shape)?projCurvedView(model,view):projPolyhedronView(model,view);
  const primitives=source.map(p=>p.kind==='circle'?{...p,center:p.center.map((n,i)=>projClean(n/scale+anchor[i])),r:p.r/scale}:{...p,a:p.a.map((n,i)=>projClean(n/scale+anchor[i])),b:p.b.map((n,i)=>projClean(n/scale+anchor[i]))});
  const [x,y,z]=model.extents;result[view]={key:view,primitives,width:projClean((view==='side'?z:x)/scale),height:projClean((view==='plan'?z:y)/scale),scale,anchor:[...anchor]};
 }return result;
}
/** Exact bounds of analytic circles and line segments. */
export function projectionDrawingBounds(primitives){
 const points=primitives.flatMap(p=>p.kind==='circle'?[[p.center[0]-p.r,p.center[1]-p.r],[p.center[0]+p.r,p.center[1]+p.r]]:[p.a,p.b]);
 if(!points.length)return null;const min=[0,1].map(i=>Math.min(...points.map(p=>p[i]))),max=[0,1].map(i=>Math.max(...points.map(p=>p[i])));
 return {min,max,width:max[0]-min[0],height:max[1]-min[1]};
}
function projValidPrimitive(p){
 const point=a=>Array.isArray(a)&&a.length===2&&a.every(n=>Number.isFinite(n)&&Math.abs(n)<1e6);
 return p&&['visible','hidden','construction'].includes(p.type)&&(p.kind==='line'?point(p.a)&&point(p.b)&&Math.hypot(...projSubtract(p.a,p.b))>projEpsilon:p.kind==='circle'&&point(p.center)&&Number.isFinite(p.r)&&p.r>0&&p.r<1e6);
}
function projCanonical(primitives){
 const groups=[],circles=[];
 primitives.forEach((p,index)=>{
  if(p.type==='construction')return;
  if(p.kind==='circle'){
   const found=circles.find(q=>Math.hypot(...projSubtract(q.center,p.center))<projEpsilon&&Math.abs(q.r-p.r)<projEpsilon);
   if(found){found.indices.push(index);if(p.type==='visible')found.type='visible';}else circles.push({...p,indices:[index]});return;
  }
  const delta=projSubtract(p.b,p.a),length=Math.hypot(...delta),direction=delta.map(n=>n/length);if(direction[0]<-projEpsilon||Math.abs(direction[0])<projEpsilon&&direction[1]<0)direction.forEach((n,i)=>direction[i]=-n);
  const normal=[-direction[1],direction[0]],offset=projDot(normal,p.a);let group=groups.find(g=>Math.abs(projCross2(g.direction,direction))<projEpsilon&&Math.abs(g.offset-offset)<projEpsilon);
  if(!group){group={direction,normal,offset,intervals:[]};groups.push(group);}
  const ends=[projDot(group.direction,p.a),projDot(group.direction,p.b)].sort((a,b)=>a-b);group.intervals.push({start:ends[0],end:ends[1],type:p.type,index});
 });
 const result=[];for(const group of groups){
  const cuts=projUnique(group.intervals.flatMap(p=>[p.start,p.end])).sort((a,b)=>a-b),pieces=[];
  const point=t=>group.direction.map((n,i)=>n*t+group.normal[i]*group.offset);
  for(let i=0;i<cuts.length-1;i++){
   if(cuts[i+1]-cuts[i]<projEpsilon)continue;const mid=(cuts[i]+cuts[i+1])/2,cover=group.intervals.filter(p=>p.start<=mid&&p.end>=mid);if(!cover.length)continue;
   const type=cover.some(p=>p.type==='visible')?'visible':'hidden',indices=projUnique(cover.filter(p=>p.type===type).map(p=>p.index)),last=pieces[pieces.length-1];
   if(last&&last.type===type&&Math.abs(last.end-cuts[i])<projEpsilon){last.end=cuts[i+1];last.indices=projUnique([...last.indices,...indices]);}
   else pieces.push({start:cuts[i],end:cuts[i+1],type,indices});
  }
  result.push(...pieces.map(p=>({...projLine(point(p.start),point(p.end),p.type),indices:p.indices})));
 }return [...result,...circles];
}
function projLineCovered(target,candidates,tolerance,ignoreType){
 const delta=projSubtract(target.b,target.a),length=Math.hypot(...delta),unit=delta.map(n=>n/length),intervals=[];
 for(const p of candidates){
  if(p.kind!=='line'||!ignoreType&&p.type!==target.type)continue;
  const a=projSubtract(p.a,target.a),b=projSubtract(p.b,target.a);
  if(Math.abs(projCross2(a,unit))>tolerance+projEpsilon||Math.abs(projCross2(b,unit))>tolerance+projEpsilon)continue;
  const range=[projDot(a,unit),projDot(b,unit)].sort((x,y)=>x-y);if(range[1]>=-tolerance&&range[0]<=length+tolerance)intervals.push(range);
 }
 intervals.sort((a,b)=>a[0]-b[0]);let end=0;
 for(const range of intervals){if(range[0]>end+tolerance+projEpsilon)return false;end=Math.max(end,range[1]);if(end>=length-tolerance-projEpsilon)return true;}
 return false;
}
function projCovered(target,candidates,tolerance,ignoreType=false){
 if(target.kind==='line')return projLineCovered(target,candidates,tolerance,ignoreType);
 return candidates.some(p=>p.kind==='circle'&&(ignoreType||p.type===target.type)&&Math.hypot(...projSubtract(p.center,target.center))<=tolerance+projEpsilon&&Math.abs(p.r-target.r)<=tolerance+projEpsilon);
}
function projCompare(expected,actual,tolerance,ignoreType=false){
 const missing=expected.filter(p=>!projCovered(p,actual,tolerance,ignoreType)),extra=actual.filter(p=>!projCovered(p,expected,tolerance,ignoreType));return {missing,extra,valid:!missing.length&&!extra.length};
}
function projDiagnose(expected,actual,tolerance,comparison){
 if(!actual.length)return 'missing';
 if(projCompare(expected,actual,tolerance,true).valid)return 'line-type';
 const eb=projectionDrawingBounds(expected),ab=projectionDrawingBounds(actual);
 if(eb&&ab){
  const sx=ab.width>projEpsilon?eb.width/ab.width:1,sy=ab.height>projEpsilon?eb.height/ab.height:1;
  const transform=p=>p.map((n,i)=>eb.min[i]+(n-ab.min[i])*[sx,sy][i]);
  const normalized=actual.map(p=>p.kind==='line'?{...p,a:transform(p.a),b:transform(p.b)}:{...p,center:transform(p.center),r:p.r*sx});
  if(projCompare(expected,normalized,tolerance,true).valid){
   const sameSize=Math.abs(eb.width-ab.width)<=tolerance+projEpsilon&&Math.abs(eb.height-ab.height)<=tolerance+projEpsilon;
   if(sameSize)return 'position';
   const ratios=[eb.width>projEpsilon?ab.width/eb.width:null,eb.height>projEpsilon?ab.height/eb.height:null].filter(n=>n!==null);
   return ratios.length===1||Math.abs(ratios[0]-ratios[1])*Math.max(eb.width,eb.height)<=tolerance+projEpsilon?'scale':'length';
  }
 }
 if(expected.some(p=>p.kind==='circle')!==actual.some(p=>p.kind==='circle'))return 'shape';
 if(!comparison.extra.length)return 'missing';if(!comparison.missing.length)return 'extra';
 return expected.length===actual.length?'length':'shape';
}
/** Compare geometric coverage, independent of order, direction or collinear
 * subdivision. Visible edges override coincident hidden edges. Construction
 * lines are optional. Tolerance is inclusive in DRAWING cm: perpendicular
 * distance, endpoint/gap distance, circle centre distance and radius error.
 * The result includes original indices for accessible visual highlighting.
 */
export function checkProjectionDrawing(expectedInput,actualInput,{tolerance=PROJECTION_TOLERANCE}={}){
 const expected=Array.isArray(expectedInput)?expectedInput:expectedInput?.primitives,actual=actualInput;
 if(!Array.isArray(expected)||!Array.isArray(actual)||expected.length>512||actual.length>512||!expected.every(projValidPrimitive)||!actual.every(projValidPrimitive)||!Number.isFinite(tolerance)||tolerance<0||tolerance>.25)return {valid:false,issues:[{code:'shape',expectedIndices:[],actualIndices:[]}],missing:[],extra:[],tolerance};
 const canonicalExpected=projCanonical(expected),canonicalActual=projCanonical(actual),comparison=projCompare(canonicalExpected,canonicalActual,tolerance);
 const expectedIndices=projUnique(comparison.missing.flatMap(p=>p.indices)),actualIndices=projUnique(comparison.extra.flatMap(p=>p.indices));
 const issues=comparison.valid?[]:[{code:projDiagnose(canonicalExpected,canonicalActual,tolerance,comparison),expectedIndices,actualIndices}];
 return {...comparison,issues,tolerance};
}
