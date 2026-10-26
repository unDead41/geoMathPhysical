/** Exact rigid panels and continuous isometric developments. No rendering dependency. */
export const TAU = Math.PI * 2;
export const clamp01 = v => Math.max(0, Math.min(1, v));
export const ease = v => { const t = clamp01(v); return t * t * (3 - 2 * t); };
export const VIEWS = {
  front: {name:'Depan', yaw:0, pitch:0}, back:{name:'Belakang',yaw:Math.PI,pitch:0},
  left:{name:'Kiri',yaw:-Math.PI/2,pitch:0}, right:{name:'Kanan',yaw:Math.PI/2,pitch:0},
  top:{name:'Atas',yaw:0,pitch:Math.PI/2}, bottom:{name:'Bawah',yaw:0,pitch:-Math.PI/2}
};
export const VIEW_ORDER = ['top','bottom','front','back','left','right'];
export const FACE_COLORS = ['#64CBB8','#94BDF7','#F2A1C2','#BCADF0','#FFD17D','#FFAD8F'];
export const DIMENSIONS = {
  cube:{w:2,h:2,d:2},cuboid:{w:3,h:1.5,d:2},pyramid:{a:2.4,h:2.6},
  cylinder:{r:1,h:2.5},cone:{r:1,h:2.4,l:2.6}
};
export function rx([x,y,z],a) { return [x,y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)]; }
export function ry([x,y,z],a) { return [x*Math.cos(a)+z*Math.sin(a),y,-x*Math.sin(a)+z*Math.cos(a)]; }
export function rz([x,y,z],a) { return [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a),z]; }
export const add3 = (a,b) => a.map((v,i)=>v+b[i]);
export const sub3 = (a,b) => a.map((v,i)=>v-b[i]);
export const length3 = a => Math.hypot(...a);
export const cross3 = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function viewPoint(v,yaw,pitch) { const a=ry(v,-yaw); return rx(a,pitch); }
function panel(id,name,vertices,color=FACE_COLORS[id],extra={}) {
  return {id,name,vertices,color,outline:true,...extra};
}
function boxMesh(shape,t,dimensions=DIMENSIONS[shape]) {
  const {w,h,d}=dimensions, theta=(1-t)*Math.PI/2;
  const right=v=>add3([w/2,0,0],ry(v,theta));
  const faces=[
    panel(0,'Depan',[[-w/2,-h/2,0],[w/2,-h/2,0],[w/2,h/2,0],[-w/2,h/2,0]]),
    panel(1,'Kanan',[[0,-h/2,0],[d,-h/2,0],[d,h/2,0],[0,h/2,0]].map(right)),
    panel(2,'Belakang',[[0,-h/2,0],[w,-h/2,0],[w,h/2,0],[0,h/2,0]].map(v=>right(add3([d,0,0],ry(v,theta))))),
    panel(3,'Kiri',[[-d,-h/2,0],[0,-h/2,0],[0,h/2,0],[-d,h/2,0]].map(v=>add3([-w/2,0,0],ry(v,-theta)))),
    panel(4,'Atas',[[-w/2,0,0],[w/2,0,0],[w/2,d,0],[-w/2,d,0]].map(v=>add3([0,h/2,0],rx(v,-theta)))),
    panel(5,'Bawah',[[-w/2,-d,0],[w/2,-d,0],[w/2,0,0],[-w/2,0,0]].map(v=>add3([0,-h/2,0],rx(v,theta))))
  ];
  return faces;
}
function pyramidMesh(t,dimensions=DIMENSIONS.pyramid) {
  const {a,h}=dimensions, b=a/2, angle=Math.atan2(h,-b)*t;
  const base=[[-b,0,-b],[b,0,-b],[b,0,b],[-b,0,b]], tip=[0,h,0];
  const hinge=(verts,origin,rot,ang)=>verts.map(v=>add3(origin,rot(sub3(v,origin),ang)));
  const faces=[panel(0,'Tapak',base),
    panel(1,'Sisi depan',hinge([base[3],base[2],tip],[0,0,b],rx,angle)),
    panel(2,'Sisi kanan',hinge([base[2],base[1],tip],[b,0,0],rz,-angle)),
    panel(3,'Sisi belakang',hinge([base[1],base[0],tip],[0,0,-b],rx,-angle)),
    panel(4,'Sisi kiri',hinge([base[0],base[3],tip],[-b,0,0],rz,angle))];
  return faces.map(f=>({...f,vertices:f.vertices.map(v=>rx(v,-t*Math.PI/2))}));
}
/** u is material arc length. |dP/du| = 1 for every opening; no stretching. */
export function cylinderPoint(u,y,t,dimensions=DIMENSIONS.cylinder) {
  const {r}=dimensions, developed=ease((t-.2)/.8), k=(1-developed)/r;
  if(Math.abs(k)<1e-6) return [u,y,-k*u*u/2];
  return [Math.sin(k*u)/k,y,-2*Math.sin(k*u/2)**2/k];
}
function cylinderMesh(t,n,dimensions=DIMENSIONS.cylinder) {
  const {r,h}=dimensions, faces=[];
  for(let i=0;i<n;i++) {
    const u0=-Math.PI*r+TAU*r*i/n,u1=-Math.PI*r+TAU*r*(i+1)/n;
    faces.push(panel(0,'Permukaan melengkung',[cylinderPoint(u0,-h/2,t,dimensions),cylinderPoint(u1,-h/2,t,dimensions),cylinderPoint(u1,h/2,t,dimensions),cylinderPoint(u0,h/2,t,dimensions)],FACE_COLORS[0],{
      outline:false, rim:[[0,1],[2,3]], cut:t>.02?(i===0?[[0,3]]:i===n-1?[[1,2]]:null):null, label:i===Math.floor(n/2)-1?'1':null
    }));
  }
  for(const [id,sign] of [[1,1],[2,-1]]) {
    const vertices=Array.from({length:n},(_,i)=>add3([0,sign*h/2,0],rx([r*Math.sin(TAU*i/n),0,r*(Math.cos(TAU*i/n)-1)],sign*ease(t/.2)*Math.PI/2)));
    faces.push(panel(id,sign===1?'Tapak atas':'Tapak bawah',vertices,FACE_COLORS[id],{label:String(id+1)}));
  }
  return faces;
}
/** beta is the material sector angle; metric ds²+s² dβ² at ALL frames. */
export function conePoint(s,beta,t,dimensions=DIMENSIONS.cone) {
  const {r,l}=dimensions, start=Math.asin(r/l), developed=ease((t-.22)/.78);
  const alpha=start+(Math.PI/2-start)*developed,a=Math.sin(alpha),q=Math.cos(alpha),phi=beta/a;
  const p=[s*a*Math.sin(phi),-s*(q*q+a*a*Math.cos(phi)),s*a*q*(Math.cos(phi)-1)];
  return rx(p,-start*(1-developed));
}
function coneMesh(t,n,dimensions=DIMENSIONS.cone) {
  const {r,l}=dimensions, start=Math.asin(r/l), developed=ease((t-.22)/.78), sector=TAU*r/l,faces=[];
  for(let i=0;i<n;i++) {
    const b0=-sector/2+sector*i/n,b1=-sector/2+sector*(i+1)/n;
    faces.push(panel(0,'Permukaan melengkung',[[0,0,0],conePoint(l,b0,t,dimensions),conePoint(l,b1,t,dimensions)],FACE_COLORS[0],{
      outline:false,rim:[[1,2]],cut:t>.02?(i===0?[[0,1]]:i===n-1?[[0,2]]:null):null,label:i===Math.floor(n/2)-1?'1':null
    }));
  }
  const disk=Array.from({length:n},(_,i)=>{
    const phi=TAU*i/n;
    let p=[r*Math.sin(phi),r*(1-Math.cos(phi))*Math.sin(start),-r*(1-Math.cos(phi))*Math.cos(start)];
    p=rx(p,-(Math.PI/2+start)*ease(t/.22));
    return rx(add3([0,-l,0],p),-start*(1-developed));
  });
  faces.push(panel(1,'Tapak bulatan',disk,FACE_COLORS[1],{label:'2'}));
  return faces;
}
export function buildMesh(shape,progress=0,segments=128,dimensions=undefined) {
  const t=clamp01(progress),n=Math.max(24,Math.round(segments));
  if(shape==='cube'||shape==='cuboid')return boxMesh(shape,t,dimensions);
  if(shape==='pyramid')return pyramidMesh(t,dimensions);
  if(shape==='cylinder')return cylinderMesh(t,n,dimensions);
  if(shape==='cone')return coneMesh(t,n,dimensions);
  throw new RangeError('Bongkah tidak diketahui: '+shape);
}
export function meshBounds(mesh) {
  const v=mesh.flatMap(f=>f.vertices),min=[0,1,2].map(i=>Math.min(...v.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...v.map(p=>p[i])));
  const center=min.map((x,i)=>(x+max[i])/2),radius=Math.max(...v.map(p=>length3(sub3(p,center))));
  return {min,max,center,radius};
}
export function faceCenter(f) {return f.vertices.reduce((sum,p)=>add3(sum,p),[0,0,0]).map(v=>v/f.vertices.length);}
