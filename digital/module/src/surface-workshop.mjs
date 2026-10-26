import {learningMesh} from './learning-mesh.mjs';
import {calculateMeasures} from './lessons.mjs';
import {FACE_COLORS,cross3,sub3} from './geometry.mjs';

export function containerMeasures(shape,d,closed=true){
 if(!['cuboid','cylinder'].includes(shape))throw new RangeError('Pilih kuboid atau silinder.');
 const r=calculateMeasures(shape,d,'full');if(!r.valid)throw new RangeError('Ukuran bekas tidak sah.');
 const base=shape==='cuboid'?d.p*d.l:Math.PI*d.j*d.j,sides=shape==='cuboid'?2*d.t*(d.p+d.l):2*Math.PI*d.j*d.t;
 return {area:sides+base*(closed?2:1),volume:r.volume,parts:[{key:'outer',label:shape==='cuboid'?'Empat muka sisi':'Permukaan melengkung',area:sides},{key:'bottom',label:'Tapak bawah',area:base},...(closed?[{key:'lid',label:'Penutup atas',area:base}]:[])]};
}
export function holeMeasures(d){
 const {p,l,t,u,v}=d;if(![p,l,t,u,v].every(n=>Number.isFinite(n)&&n>0&&n<=1000)||u>=p||v>=l)throw new RangeError('Rongga mesti lebih kecil daripada panjang dan lebar luar.');
 const parts=[{key:'outer',label:'Empat dinding luar',area:2*t*(p+l)},{key:'inner',label:'Empat dinding dalam rongga',area:2*t*(u+v)},{key:'top',label:'Muka atas selepas ditebuk',area:p*l-u*v},{key:'bottom',label:'Muka bawah selepas ditebuk',area:p*l-u*v}];
 return {area:parts.reduce((s,x)=>s+x.area,0),volume:(p*l-u*v)*t,outerVolume:p*l*t,holeVolume:u*v*t,parts};
}
function swFace(id,vertices,normal,group,color){const n=cross3(sub3(vertices[1],vertices[0]),sub3(vertices[2],vertices[0]));if(n.reduce((s,x,i)=>s+x*normal[i],0)<0)vertices.reverse();return {id,vertices,group,color,outline:true};}
export function workshopMesh(mode,d,{shape='cuboid',closed=true}={}){
 if(mode==='container'){
  containerMeasures(shape,d,closed);const lid=shape==='cuboid'?4:1,bottom=shape==='cuboid'?5:2;
  return learningMesh(shape,0,144,d).filter(f=>closed||f.id!==lid).map(f=>({...f,group:f.id===lid?'lid':f.id===bottom?'bottom':'outer'}));
 }
 if(mode!=='cavity')throw new RangeError('Aktiviti luas tidak diketahui.');holeMeasures(d);
 const {p,l,t,u,v}=d,X=p/2,Z=l/2,x=u/2,z=v/2,m=[];
 const wall=(id,a,b,n,g,c)=>m.push(swFace(id,[[a[0],0,a[1]],[b[0],0,b[1]],[b[0],t,b[1]],[a[0],t,a[1]]],n,g,c));
 wall(0,[-X,Z],[X,Z],[0,0,1],'outer',FACE_COLORS[0]);wall(1,[X,-Z],[-X,-Z],[0,0,-1],'outer',FACE_COLORS[0]);wall(2,[-X,-Z],[-X,Z],[-1,0,0],'outer',FACE_COLORS[0]);wall(3,[X,Z],[X,-Z],[1,0,0],'outer',FACE_COLORS[0]);
 wall(4,[-x,z],[x,z],[0,0,-1],'inner',FACE_COLORS[2]);wall(5,[x,-z],[-x,-z],[0,0,1],'inner',FACE_COLORS[2]);wall(6,[-x,-z],[-x,z],[1,0,0],'inner',FACE_COLORS[2]);wall(7,[x,z],[x,-z],[-1,0,0],'inner',FACE_COLORS[2]);
 const rectangles=[[-X,-x,-Z,Z],[x,X,-Z,Z],[-x,x,z,Z],[-x,x,-Z,-z]];
 for(const [level,y] of [t,0].entries())for(let i=0;i<4;i++){const [a,b,c,e]=rectangles[i];m.push(swFace(8+level*4+i,[[a,y,c],[b,y,c],[b,y,e],[a,y,e]],[0,level?-1:1,0],level?'bottom':'top',FACE_COLORS[level?4:1]));}
 return m;
}

function swNode(tag,attrs={},text=''){const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text)e.textContent=text;return e;}
const swFmt=n=>new Intl.NumberFormat('ms-MY',{maximumFractionDigits:2,useGrouping:false}).format(n);
export class SurfaceWorkshop{
 constructor({mount,onChange,onView,onBeforeChange=()=>{}}){
  this.mount=mount;this.onChange=onChange;this.onBeforeChange=onBeforeChange;this.onView=onView;this.mode='container';this.shape='cylinder';this.closed=true;this.d={p:6,l:5,t:4,j:3,u:2,v:1.5};this.selected=new Set();this.nodes={};
  const add=(tag,id,attrs={},text='')=>{const e=swNode(tag,{...attrs,id},text);this.nodes[id]=e;return e;};
  const label=swNode('label',{for:'workshop-shape'},'Bentuk bekas'),shape=add('select','workshop-shape');shape.append(swNode('option',{value:'cylinder'},'Silinder'),swNode('option',{value:'cuboid'},'Kuboid'));shape.addEventListener('change',()=>{this.onBeforeChange();this.shape=shape.value;this.changed();});
  const field=add('div','workshop-shape-field',{class:'lab-field'});field.append(label,shape);mount.append(field);
  const lidLabel=add('label','workshop-lid-label',{class:'workshop-toggle'}),lid=add('input','workshop-lid',{type:'checkbox'});lid.checked=true;lidLabel.append(lid,swNode('span',{},'Sertakan penutup atas'));lid.addEventListener('change',()=>{this.onBeforeChange();this.closed=lid.checked;this.changed();});mount.append(lidLabel);
  const dimensions=swNode('div',{class:'lab-dimensions'});
  for(const [k,name,min,max,step] of [['p','p · panjang luar',3,10,1],['l','l · lebar luar',3,10,1],['t','t · tinggi',1,10,1],['j','j · jejari',1,8,1],['u','u · panjang bukaan rongga',.5,5.5,.5],['v','v · lebar bukaan rongga',.5,4.5,.5]]){
   const wrap=add('label','workshop-field-'+k,{for:'workshop-'+k},name),value=add('output','workshop-value-'+k),input=add('input','workshop-'+k,{type:'range',min,max,step});wrap.append(value,input);dimensions.append(wrap);input.addEventListener('input',()=>{this.onBeforeChange();this.d[k]=Number(input.value);this.d.u=Math.min(this.d.u,this.d.p-.5);this.d.v=Math.min(this.d.v,this.d.l-.5);this.changed();});
  }
  mount.append(dimensions,add('p','workshop-explanation',{class:'lab-note'}),add('div','workshop-parts',{class:'area-pieces',role:'group','aria-label':'Pilih bahagian luas'}));
  const actions=swNode('div',{class:'lab-actions'}),all=add('button','workshop-all',{type:'button',class:'button'},'Pilih semua bahagian'),clear=add('button','workshop-clear',{type:'button',class:'button'},'Kosongkan pilihan'),view=add('button','workshop-view',{type:'button',class:'button'},'Lihat dari atas');
  all.addEventListener('click',()=>{this.onBeforeChange();this.selected=new Set(this.measures().parts.map(p=>p.key));this.render();this.onChange();});clear.addEventListener('click',()=>{this.onBeforeChange();this.selected.clear();this.render();this.onChange();});view.addEventListener('click',()=>this.onView());actions.append(all,clear,view);
  mount.append(actions,add('p','workshop-chosen',{class:'lab-sum'}),add('p','workshop-area',{class:'lab-equation',role:'status'}),add('p','workshop-volume',{class:'lab-feedback'}),add('p','workshop-equation',{class:'lab-note'}));
 }
 changed(){this.selected.clear();this.render();this.onChange();}
 measures(){return this.mode==='cavity'?holeMeasures(this.d):containerMeasures(this.shape,this.d,this.closed);}
 mesh(){return workshopMesh(this.mode,this.d,{shape:this.shape,closed:this.closed});}
 selectedFaces(){return this.mesh().filter(f=>this.selected.has(f.group)).map(f=>f.id);}
 render(){
  const n=this.nodes,cavity=this.mode==='cavity',r=this.measures();n['workshop-shape-field'].hidden=cavity;n['workshop-lid-label'].hidden=cavity;n['workshop-shape'].value=this.shape;n['workshop-lid'].checked=this.closed;
  for(const k of ['p','l','t','j','u','v']){const active=cavity?k!=='j':this.shape==='cylinder'?['j','t'].includes(k):['p','l','t'].includes(k);n['workshop-field-'+k].hidden=!active;n['workshop-'+k].value=String(this.d[k]);n['workshop-value-'+k].textContent=swFmt(this.d[k])+' cm';}n['workshop-u'].max=String(this.d.p-.5);n['workshop-v'].max=String(this.d.l-.5);
  n['workshop-explanation'].textContent=cavity?'Rongga segi empat tepat menembusi dari atas ke bawah. Dinding dalam yang terdedah juga mempunyai luas.':'Model mengabaikan ketebalan dinding. Membuka penutup mengubah luas bahan, sementara kapasiti ruang bekas kekal.';
  n['workshop-parts'].replaceChildren(...r.parts.map(p=>{const b=swNode('button',{type:'button',class:'area-piece','aria-pressed':String(this.selected.has(p.key)),'data-workshop-part':p.key},p.label+' · '+swFmt(p.area)+' cm²');b.addEventListener('click',()=>{this.onBeforeChange();if(this.selected.has(p.key))this.selected.delete(p.key);else this.selected.add(p.key);this.render();this.onChange();[...n['workshop-parts'].children].find(e=>e.dataset.workshopPart===p.key)?.focus({preventScroll:true});});return b;}));
  const chosen=r.parts.filter(p=>this.selected.has(p.key)),sum=chosen.reduce((s,p)=>s+p.area,0);n['workshop-chosen'].textContent='Jumlah bahagian dipilih = '+swFmt(sum)+' cm²';n['workshop-area'].textContent='Luas keseluruhan '+(Number.isInteger(r.area)?'= ':'≈ ')+swFmt(r.area)+' cm²';
  n['workshop-volume'].textContent=(cavity?'Isi padu bahan':'Kapasiti bekas')+' '+(Number.isInteger(r.volume)?'= ':'≈ ')+swFmt(r.volume)+' cm³';
  n['workshop-equation'].textContent=cavity?'V bahan = V luar − V rongga = '+swFmt(r.outerVolume)+' − '+swFmt(r.holeVolume)+' cm³. Luas = dua bingkai tapak + dinding luar + dinding dalam.':'Luas = '+(this.closed?'dua tapak':'satu tapak')+' + luas dinding. Kapasiti = luas satu tapak × tinggi.';
 }
}
