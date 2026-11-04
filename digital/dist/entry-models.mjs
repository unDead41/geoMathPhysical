import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {PALETTES} from './visuals.mjs';

/** Shared, original procedural assets. Dimensions are presentation-only: gameplay
 * and learning geometry keep their existing mathematical source of truth. */
export const ENTRY_SCENE_TYPES=Object.freeze(['hero','quiz','practice','duel','resume','cube','net','pair']);
const PI=Math.PI;
const color=tone=>PALETTES[tone].dark;
const plastic=(tone,options={})=>new THREE.MeshPhysicalMaterial({color:color(tone),roughness:.29,metalness:.06,clearcoat:.65,clearcoatRoughness:.24,...options});
const neutral=(value,options={})=>new THREE.MeshStandardMaterial({color:value,roughness:.55,...options});
function mesh(geometry,material,x=0,y=0,z=0){
  const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;
}
function box(w,h,d,material,x=0,y=0,z=0,r=.045){return mesh(new RoundedBoxGeometry(w,h,d,3,r),material,x,y,z);}
function sphere(r,material,x=0,y=0,z=0){return mesh(new THREE.SphereGeometry(r,24,16),material,x,y,z);}
function rod(a,b,r,material){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const m=mesh(new THREE.CylinderGeometry(r,r,delta.length(),12),material);
  m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
}
function lines(points,material){return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),material);}
function grid(w,d,step,ink,y){
  const points=[];
  for(let x=-w/2;x<=w/2+.001;x+=step)points.push([x,y,-d/2],[x,y,d/2]);
  for(let z=-d/2;z<=d/2+.001;z+=step)points.push([-w/2,y,z],[w/2,y,z]);
  return lines(points,new THREE.LineBasicMaterial({color:ink,transparent:true,opacity:.38}));
}
function contactShadow(w,d){
  // Local procedural texture; no remote HDRI, image tracking or CDN dependency.
  const size=64,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const radius=Math.hypot((x+0.5-size/2)/(size/2),(y+0.5-size/2)/(size/2));
    const i=(y*size+x)*4;data[i]=21;data[i+1]=44;data[i+2]=77;data[i+3]=Math.round(Math.pow(Math.max(0,1-radius),2)*66);
  }
  const texture=new THREE.DataTexture(data,size,size);texture.needsUpdate=true;
  const m=mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}),0,-.2,0);
  m.rotation.x=-PI/2;m.castShadow=false;return m;
}
function board(group,w,d,theme,{ruler=false}={}){
  const dark=theme.dark;
  group.add(contactShadow(w*1.45,d*1.55));
  group.add(box(w,.16,d,neutral(dark?'#233D58':'#DFEAF8'),0,-.1,0,.08));
  group.add(box(w-.07,.075,d-.07,neutral(theme.surface),0,.013,0,.035));
  group.add(grid(w-.35,d-.35,.4,theme.grid,.057));
  if(ruler){
    const rulerMaterial=plastic('blue',{color:PALETTES.blue.light,transparent:true,opacity:.86,roughness:.2});
    const tool=new THREE.Group();tool.position.set(-.45,.13,d/2-.32);
    tool.add(box(w*.67,.055,.39,rulerMaterial));
    const p=[];for(let i=0;i<52;i++){const x=-w*.33+.11+i*.11;p.push([x,.032,-.18],[x,.032,i%5===0?.07:-.05]);}
    tool.add(lines(p,new THREE.LineBasicMaterial({color:theme.toolInk})));group.add(tool);
  }
}
function setSquare(theme){
  const shape=new THREE.Shape();shape.moveTo(-1.3,-.7);shape.lineTo(1.3,-.7);shape.lineTo(-1.3,.9);shape.closePath();
  const hole=new THREE.Path();hole.moveTo(-.97,-.43);hole.lineTo(-.97,.37);hole.lineTo(.3,-.43);hole.closePath();shape.holes.push(hole);
  const g=new THREE.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.018,bevelThickness:.018});
  const m=mesh(g,plastic('blue',{color:PALETTES.blue.mid,transparent:true,opacity:.8,roughness:.2}));
  m.rotation.x=-PI/2;m.rotation.z=-.12;m.position.set(-2.8,.13,-1.7);
  const marks=[];for(let i=0;i<20;i++){const x=-1.18+i*.11;marks.push([x,-.68,.08],[x,-.68+(i%5===0?.18:.1),.08]);}
  m.add(lines(marks,new THREE.LineBasicMaterial({color:theme.toolInk})));return m;
}
function compass(theme){
  const g=new THREE.Group();g.position.set(3.9,.21,.6);g.rotation.y=-.22;
  const metal=new THREE.MeshStandardMaterial({color:'#D3DFEB',metalness:.88,roughness:.21});
  const blue=plastic('blue',{color:theme.primary}),graphite=neutral('#25415C',{metalness:.5});
  g.add(rod([0,.12,-.85],[-.52,.12,1.1],.048,metal),rod([0,.12,-.85],[.52,.12,1.1],.048,metal));
  g.add(rod([-.52,.12,1.1],[-.56,.05,1.27],.018,graphite),rod([.52,.12,1.1],[.57,.05,1.27],.026,graphite));
  g.add(box(.15,.14,.46,blue,0,.13,-1.1,.04));
  const joint=mesh(new THREE.CylinderGeometry(.2,.2,.16,32),blue,0,.18,-.85);g.add(joint);
  g.add(mesh(new THREE.CylinderGeometry(.075,.075,.018,24),metal,0,.27,-.85));
  g.add(rod([-.31,.15,.35],[.31,.15,.35],.025,metal),sphere(.065,blue,0,.15,.35));return g;
}
function clipboard(theme){
  const g=new THREE.Group(),primary=plastic('blue',{color:theme.primary});
  g.add(box(1.65,.16,2.15,primary,0,.05,0,.12));
  g.add(box(1.46,.055,1.94,neutral('#F9FCFF'),0,.16,0,.045));
  g.add(box(.65,.12,.32,primary,0,.22,-.88,.07));
  const strokes=[];
  for(let i=0;i<3;i++){
    const z=-.4+i*.48;
    strokes.push([-.49,.205,z],[-.39,.205,z+.1],[-.2,.205,z-.13]);
    g.add(box(.57,.022,.065,neutral(PALETTES.blue.mid),.28,.199,z,.02));
  }
  const geometry=new THREE.BufferGeometry().setFromPoints(strokes.map(p=>new THREE.Vector3(...p)));
  for(let i=0;i<3;i++){const p=strokes.slice(i*3,i*3+3);g.add(rod(p[0],p[1],.027,primary),rod(p[1],p[2],.027,primary));}
  geometry.dispose();g.rotation.y=-.15;return g;
}
function graduation(theme){
  const g=new THREE.Group(),mint=plastic('mint'),gold=plastic('yellow');
  g.add(box(1.8,.2,1.5,neutral('#F8FCFF'),0,-.12,.15,.075));
  g.add(box(1.87,.065,1.57,mint,0,-.23,.15,.055));
  g.add(mesh(new THREE.CylinderGeometry(.59,.62,.56,48),mint,0,.23,0));
  const cap=box(1.65,.12,1.65,mint,0,.55,0,.035);cap.rotation.y=PI/4;g.add(cap);
  g.add(sphere(.065,gold,0,.67,0),rod([0,.66,0],[.95,.66,.3],.018,gold),rod([.95,.66,.3],[.95,.12,.3],.025,gold));
  const tassel=mesh(new THREE.ConeGeometry(.07,.23,12),gold,.95,.025,.3);g.add(tassel);return g;
}
function player(tone,x,z){
  const g=new THREE.Group(),material=plastic(tone);g.position.set(x,0,z);
  g.add(mesh(new THREE.CylinderGeometry(.24,.44,.88,40),material,0,.45,0));
  g.add(sphere(.33,material,0,1.15,0));g.add(mesh(new THREE.CylinderGeometry(.49,.49,.09,40),material,0,.035,0));return g;
}
function net(tone){
  const g=new THREE.Group(),material=plastic(tone,{roughness:.4});
  // Six equal squares: a valid cube net, also used by the fallback diagram.
  for(const [x,z] of [[-1,0],[0,0],[1,0],[2,0],[0,-1],[0,1]])g.add(box(.96,.055,.96,material,x-.5,0,z,.012));
  return g;
}

export function buildEntryModel(type,theme){
  if(!ENTRY_SCENE_TYPES.includes(type))throw Error('Unknown entry scene');
  const group=new THREE.Group(),moving=[];
  const addMoving=(object,phase=0)=>{moving.push({object,y:object.position.y,rotation:object.rotation.y,phase});group.add(object);return object;};
  if(type==='hero'){
    board(group,8.9,5.9,theme,{ruler:true});group.add(setSquare(theme),compass(theme));
    const cube=box(1.55,1.55,1.55,plastic('blue',{color:theme.primary}),-2.05,.84,.76,.035);cube.rotation.y=-.14;addMoving(cube,0);
    const pyramid=mesh(new THREE.ConeGeometry(1.08,2.12,4),plastic('mint',{flatShading:true}),-.15,1.14,-.8);pyramid.rotation.y=PI/4;addMoving(pyramid,1.8);
    const cylinder=mesh(new THREE.CylinderGeometry(.68,.68,1.95,64),plastic('blue'),2.2,1.055,-1.55);addMoving(cylinder,3.1);
    const cuboid=box(1.24,1.1,2.04,plastic('yellow'),1.72,.62,1.18,.025);cuboid.rotation.y=-.14;addMoving(cuboid,4.7);
  }else if(['quiz','practice','duel'].includes(type)){
    group.add(contactShadow(4,3.4));
    if(type==='quiz'){const clip=clipboard(theme);clip.rotation.x=.18;addMoving(clip);}
    else if(type==='practice')addMoving(graduation(theme));
    else{addMoving(player('blue',-.62,.18));addMoving(player('yellow',.65,-.3),2);}
  }else if(type==='resume'){
    board(group,4.4,3.3,theme);
    addMoving(box(1.35,1.35,1.35,plastic('blue',{color:theme.primary}),-.67,.75,.35),0);
    addMoving(box(1.19,1.19,1.19,plastic('yellow'),.77,.67,-.4),2.4);
  }else if(type==='net'){
    board(group,5.3,3.8,theme);const tiles=net('orange');tiles.position.y=.12;group.add(tiles);
  }else{
    board(group,3.2,2.8,theme);const cube=box(1.32,1.32,1.32,plastic('blue',{color:theme.primary}),0,.74,0,.012);addMoving(cube);
  }
  return {group,moving,type};
}
