import {buildMesh,meshBounds,viewPoint,sub3,cross3,length3,faceCenter} from './geometry.mjs';
function shade(hex,amount) {
  const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16));
  return 'rgb('+c.map(v=>Math.round(Math.max(0,Math.min(255,v*amount)))).join(',')+')';
}
function trace(ctx,pts) {ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();}
function polygonContains(pts,x,y) {
  let inside=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++) if((pts[i][1]>y)!==(pts[j][1]>y)&&x<(pts[j][0]-pts[i][0])*(y-pts[i][1])/(pts[j][1]-pts[i][1])+pts[i][0])inside=!inside;
  return inside;
}
function drawBadge(ctx,p,text) {
  ctx.beginPath();ctx.arc(p[0],p[1],13,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.94)';ctx.fill();ctx.strokeStyle='rgba(24,51,75,.3)';ctx.lineWidth=1;ctx.stroke();
  ctx.font='bold 12px "Segoe UI",sans-serif';ctx.fillStyle='#18334B';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,p[0],p[1]+.5);
}
export class ModelRenderer {
  constructor(canvas) {this.canvas=canvas;this.ctx=canvas.getContext('2d');this.hitFaces=[];this.meshKey='';this.mesh=null;}
  draw({shape,progress=0,yaw=.55,pitch=.35,zoom=1,labels=false,selected=null,mini=false}) {
    const ctx=this.ctx;if(!ctx)return;
    const box=this.canvas.getBoundingClientRect(),w=box.width,h=box.height;
    if(w<=0||h<=0)return;
    const dpr=Math.min(2,window.devicePixelRatio||1),cw=Math.round(w*dpr),ch=Math.round(h*dpr);
    if(this.canvas.width!==cw||this.canvas.height!==ch){this.canvas.width=cw;this.canvas.height=ch;}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const key=shape+':'+progress+':'+mini;
    if(key!==this.meshKey){this.mesh=buildMesh(shape,progress,mini?64:144);this.bounds=meshBounds(this.mesh);this.meshKey=key;}
    const {center,radius}=this.bounds;
    const scale=Math.min(w,h)/(2*radius)*(mini?.79:.78)*zoom;
    const project=p=>{const v=viewPoint(sub3(p,center),yaw,pitch);return [w/2+v[0]*scale,h/2-v[1]*scale,v[2]];};
    if(!mini) {
      const gradient=ctx.createRadialGradient(w/2,h*.72,0,w/2,h*.72,w*.3);
      gradient.addColorStop(0,'rgba(35,74,110,.08)');gradient.addColorStop(1,'rgba(35,74,110,0)');
      ctx.save();ctx.translate(0,h*.62);ctx.scale(1,.18);ctx.fillStyle=gradient;ctx.fillRect(0,-h*.5,w,h);ctx.restore();
    }
    const projected=this.mesh.map(f=>{
      const pts=f.vertices.map(project),normal=cross3(sub3(f.vertices[1],f.vertices[0]),sub3(f.vertices[2],f.vertices[0]));
      const nLen=length3(normal)||1,n=normal.map(v=>v/nLen),vNormal=viewPoint(n,yaw,pitch);
      // Double-sided paper. Rear side is lit consistently when a face opens.
      const sign=vNormal[2]>=0?1:-1,light=(n[0]*-.35+n[1]*.65+n[2]*.68)*sign;
      return {f,pts,depth:pts.reduce((s,p)=>s+p[2],0)/pts.length,brightness:.82+.2*Math.max(-.45,light),vNormal};
    }).sort((a,b)=>a.depth-b.depth);
    this.hitFaces=[];const curveLabels=[];
    for(const {f,pts,brightness,vNormal} of projected) {
      if(Math.abs(vNormal[2])<.00001)continue;
      trace(ctx,pts);ctx.fillStyle=shade(f.color,brightness);ctx.fill();
      if(!f.outline) {ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.65;ctx.stroke();}
      if(f.outline) {ctx.strokeStyle=selected===f.id?'#215FF0':'rgba(24,51,75,.67)';ctx.lineWidth=selected===f.id?3:mini?1:1.45;ctx.stroke();}
      if(f.rim) {
        ctx.beginPath();for(const [a,b] of f.rim){ctx.moveTo(...pts[a].slice(0,2));ctx.lineTo(...pts[b].slice(0,2));}
        ctx.strokeStyle=selected===f.id?'#215FF0':'rgba(24,51,75,.6)';ctx.lineWidth=selected===f.id?2.7:mini?.9:1.25;ctx.stroke();
      }
      if(f.cut) {ctx.beginPath();for(const [a,b] of f.cut){ctx.moveTo(...pts[a].slice(0,2));ctx.lineTo(...pts[b].slice(0,2));}ctx.strokeStyle='#526A7D';ctx.setLineDash([4,3]);ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);}
      this.hitFaces.push({id:f.id,pts});
      if(labels&&!mini&&(f.label||f.outline)&&Math.abs(vNormal[2])>.17) {
        const p=project(faceCenter(f)),text=f.label||String(f.id+1);
        if(f.outline)drawBadge(ctx,p,text);
        else if(vNormal[2]>.17)curveLabels.push({id:f.id,p,text});
      }
    }
    // Draw curved-surface badges after all strips; keep real face occlusion.
    for(const {id,p,text} of curveLabels)if(this.pick(p[0],p[1])===id)drawBadge(ctx,p,text);
    // The tip projects to the centre in the top view of a closed cone.
    if(shape==='cone'&&progress===0&&Math.abs(pitch-Math.PI/2)<.001) {
      const p=project([0,0,0]);ctx.fillStyle='#18334B';ctx.beginPath();ctx.arc(p[0],p[1],mini?1.8:3,0,Math.PI*2);ctx.fill();
    }
    if(!mini) this.drawCompass(ctx,w,h,yaw,pitch);
  }
  pick(x,y) {for(const f of [...this.hitFaces].reverse())if(polygonContains(f.pts,x,y))return f.id;return null;}
  drawCompass(ctx,w,h,yaw,pitch) {
    const x=45,y=h-44;
    ctx.font='10px "Segoe UI",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    for(const [dir,name,color] of [[[1,0,0],'Kanan','#2C6BC5'],[[0,1,0],'Atas','#237E6C'],[[0,0,1],'Depan','#A84C78']]) {
      const p=viewPoint(dir,yaw,pitch),end=[x+p[0]*26,y-p[1]*26];ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(...end);ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.stroke();ctx.fillStyle=color;ctx.fillText(name,end[0]+p[0]*10,end[1]-p[1]*10);
    }
  }
}
