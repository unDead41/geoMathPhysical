import {Vector3,Matrix3,Color,SRGBColorSpace,Box3} from 'three';

/** Progressive enhancement for school devices without WebGL. Renders the SAME
 * 3D model transforms/camera with Canvas2D, lighting and soft projected shadows.
 * Small chamfered meshes keep this path bounded rather than rasterizing tens
 * of thousands of GPU triangles on the CPU. No network or external assets. */
const light=new Vector3(-.42,.83,.44).normalize();
const point=(x,y,z)=>new Vector3(x,y,z);
function roundedFaces(geometry){
  geometry.computeBoundingBox();const {min,max}=geometry.boundingBox;
  const hx=(max.x-min.x)/2,hy=(max.y-min.y)/2,hz=(max.z-min.z)/2;
  const center=min.clone().add(max).multiplyScalar(.5),r=Math.min(geometry.parameters.radius||.025,hx*.3,hy*.3,hz*.3);
  const vertices=[];
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])vertices.push(point(x*hx,y*(hy-r),z*(hz-r)),point(x*(hx-r),y*hy,z*(hz-r)),point(x*(hx-r),y*(hy-r),z*hz));
  const faces=[];
  // The convex chamfer has six planar faces, twelve edge faces, eight corners.
  const normals=[];
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){const a=[0,0,0];a[axis]=sign;normals.push(point(...a));}
  for(let zero=0;zero<3;zero++)for(const a of [-1,1])for(const b of [-1,1]){const n=[a,b];n.splice(zero,0,0);normals.push(point(...n).normalize());}
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])normals.push(point(x,y,z).normalize());
  for(const normal of normals){
    const distances=vertices.map(v=>v.dot(normal)),maxDistance=Math.max(...distances);
    let pts=vertices.filter((v,i)=>Math.abs(distances[i]-maxDistance)<.00001);
    if(pts.length<3)continue;
    const mean=pts.reduce((v,p)=>v.add(p),new Vector3()).multiplyScalar(1/pts.length);
    const u=pts[0].clone().sub(mean).normalize(),v=new Vector3().crossVectors(normal,u);
    pts.sort((a,b)=>Math.atan2(a.clone().sub(mean).dot(v),a.clone().sub(mean).dot(u))-Math.atan2(b.clone().sub(mean).dot(v),b.clone().sub(mean).dot(u)));
    faces.push({points:pts.map(p=>p.clone().add(center)),normal});
  }
  return faces;
}
function cylinderFaces(geometry){
  const p=geometry.parameters,top=p.radiusTop??0,bottom=p.radiusBottom??p.radius,h=p.height/2,segments=Math.min(p.radialSegments||32,32),faces=[];
  const ring=(radius,y)=>Array.from({length:segments},(_,i)=>point(Math.sin(i/segments*Math.PI*2)*radius,y,Math.cos(i/segments*Math.PI*2)*radius));
  const upper=ring(top,h),lower=ring(bottom,-h);
  for(let i=0;i<segments;i++){
    const j=(i+1)%segments,points=top>0?[lower[i],lower[j],upper[j],upper[i]]:[lower[i],lower[j],point(0,h,0)];
    const normal=new Vector3().crossVectors(points[1].clone().sub(points[0]),points[2].clone().sub(points[0])).normalize();
    faces.push({points,normal});
  }
  if(top>0)faces.push({points:upper,normal:point(0,1,0)});
  if(bottom>0)faces.push({points:lower,normal:point(0,-1,0)});
  return faces;
}
function sphereFaces(geometry){
  const radius=geometry.parameters.radius,faces=[],rows=8,columns=16;
  const vertex=(i,j)=>point(-radius*Math.cos(j/columns*Math.PI*2)*Math.sin(i/rows*Math.PI),radius*Math.cos(i/rows*Math.PI),radius*Math.sin(j/columns*Math.PI*2)*Math.sin(i/rows*Math.PI));
  for(let i=0;i<rows;i++)for(let j=0;j<columns;j++){
    const points=[vertex(i,j),vertex(i+1,j),vertex(i+1,j+1),vertex(i,j+1)];
    const normal=points.reduce((a,p)=>a.add(p),new Vector3()).normalize();faces.push({points,normal});
  }
  return faces;
}
function triangles(geometry){
  const p=geometry.getAttribute('position'),index=geometry.index,faces=[];
  for(let i=0;i<(index?.count||p.count);i+=3){
    const points=[0,1,2].map(offset=>new Vector3().fromBufferAttribute(p,index?index.getX(i+offset):i+offset));
    const normal=new Vector3().crossVectors(points[1].clone().sub(points[0]),points[2].clone().sub(points[0])).normalize();
    faces.push({points,normal});
  }
  return faces;
}
function hull(points){
  const p=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lower=[],upper=[];
  for(const point of p){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),point)<=0)lower.pop();lower.push(point);}
  for(const point of p.reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),point)<=0)upper.pop();upper.push(point);}
  return lower.slice(0,-1).concat(upper.slice(0,-1));
}
export function createSoftwareRenderer(){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  if(!ctx)return null;
  const cache=new WeakMap();let width=1,height=1;
  function projected(p,camera){const v=p.clone().project(camera);return [(v.x+1)*width/2,(1-v.y)*height/2,v.z];}
  function compile(geometry){
    if(cache.has(geometry))return cache.get(geometry);
    const faces=geometry.type==='RoundedBoxGeometry'?roundedFaces(geometry):['CylinderGeometry','ConeGeometry'].includes(geometry.type)?cylinderFaces(geometry):geometry.type==='SphereGeometry'?sphereFaces(geometry):triangles(geometry);
    cache.set(geometry,faces);return faces;
  }
  function path(points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();}
  function render(scene,camera){
    camera.updateMatrixWorld();scene.updateMatrixWorld(true);
    const draw=[],eye=camera.getWorldPosition(new Vector3());
    scene.traverse(object=>{
      if(!object.visible||!object.geometry)return;
      const material=Array.isArray(object.material)?object.material[0]:object.material;
      if(!material||material.visible===false)return;
      const normalMatrix=new Matrix3().getNormalMatrix(object.matrixWorld);
      const bounds=new Box3().setFromObject(object),floor=bounds.max.y<.09;
      if(object.isLineSegments){
        const position=object.geometry.getAttribute('position');
        for(let i=0;i<position.count;i+=2){
          const pts=[i,i+1].map(j=>projected(new Vector3().fromBufferAttribute(position,j).applyMatrix4(object.matrixWorld),camera));
          draw.push({layer:floor?1:3,line:true,points:pts,z:(pts[0][2]+pts[1][2])/2,color:material.color.getStyle(SRGBColorSpace),opacity:material.opacity});
        }
        return;
      }
      if(!object.isMesh)return;
      if(material.map?.isDataTexture)return; // replaced by projected physical shadows below
      const geometry=object.geometry,faces=compile(geometry),base=material.color||new Color('#FFFFFF');
      for(const face of faces){
        const world=face.points.map(p=>p.clone().applyMatrix4(object.matrixWorld));
        const center=world.reduce((a,p)=>a.add(p),new Vector3()).multiplyScalar(1/world.length);
        const normal=face.normal.clone().applyMatrix3(normalMatrix).normalize();
        if(normal.dot(eye.clone().sub(center))<0)continue;
        const points=world.map(p=>projected(p,camera));
        const half=eye.clone().sub(center).normalize().add(light).normalize();
        const diffuse=.47+Math.max(0,normal.dot(light))*.78;
        const specular=Math.pow(Math.max(0,normal.dot(half)),30)*.3;
        const shaded=base.clone().multiplyScalar(diffuse).lerp(new Color('#FFFFFF'),specular);
        draw.push({layer:floor?0:3,points,z:points.reduce((s,p)=>s+p[2],0)/points.length,color:shaded.getStyle(SRGBColorSpace),light:shaded.clone().lerp(new Color('#FFFFFF'),.12).getStyle(SRGBColorSpace),opacity:material.transparent?Math.max(.7,material.opacity):1});
      }
      // Convex projected contact silhouette, sorted onto the board like a face.
      if(object.castShadow&&bounds.max.y>.24&&bounds.min.y>=-.08){
        const corners=[];
        for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
          const delta=Math.max(0,y-.065);corners.push(projected(point(x+delta*.42,.065,z-delta*.46),camera));
        }
        const points=hull(corners),center=bounds.getCenter(new Vector3());
        center.y=.067;draw.push({layer:2,shadow:true,points,z:projected(center,camera)[2],opacity:.12});
      }
    });
    ctx.save();ctx.translate(0,canvas.height-height);ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
    // Ground the whole kit with a soft studio shadow before its geometry.
    const origin=projected(point(0,-.3,0),camera),large=width*.4;
    ctx.save();ctx.translate(origin[0],origin[1]+height*.15);ctx.scale(1,.3);
    const gradient=ctx.createRadialGradient(0,0,0,0,0,large);
    gradient.addColorStop(0,'rgba(30,65,110,.13)');gradient.addColorStop(1,'rgba(30,65,110,0)');
    ctx.fillStyle=gradient;ctx.fillRect(-large,-large,large*2,large*2);ctx.restore();
    draw.sort((a,b)=>a.layer-b.layer||b.z-a.z);
    for(const item of draw){
      ctx.globalAlpha=item.opacity??1;
      if(item.line){ctx.beginPath();ctx.moveTo(...item.points[0].slice(0,2));ctx.lineTo(...item.points[1].slice(0,2));ctx.strokeStyle=item.color;ctx.lineWidth=.8;ctx.stroke();continue;}
      path(item.points);
      if(item.shadow){ctx.save();ctx.fillStyle='#274C73';ctx.shadowColor='#274C73';ctx.shadowBlur=width*.014;ctx.fill();ctx.restore();continue;}
      const xs=item.points.map(p=>p[0]),ys=item.points.map(p=>p[1]);
      const g=ctx.createLinearGradient(Math.min(...xs),Math.min(...ys),Math.max(...xs)+.1,Math.max(...ys)+.1);
      g.addColorStop(0,item.light);g.addColorStop(1,item.color);ctx.fillStyle=g;ctx.strokeStyle=item.color;ctx.lineWidth=.45;ctx.lineJoin='round';ctx.fill();ctx.stroke();
    }
    ctx.restore();
  }
  return {kind:'software',domElement:canvas,setSize(w,h){canvas.width=w;canvas.height=h;},setViewport(x,y,w,h){width=w;height=h;},setScissor(){},setScissorTest(){},clear(){ctx.clearRect(0,0,canvas.width,canvas.height);},render,dispose(){canvas.width=1;canvas.height=1;}};
}
