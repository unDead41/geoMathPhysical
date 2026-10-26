import {ModelRenderer} from './renderer.mjs';
import {buildMesh,clamp01,ease,FACE_COLORS} from './geometry.mjs';
import {MODEL_DATA} from './content.mjs';
import {LESSON_DATA,MEASURE_FIELDS,calculateMeasures} from './lessons.mjs';
import {NET_PRESETS,cubeNetState,cubeNetMesh,labDimensions,surfacePieces,pourState,compositionMeasures,unitCubeMesh,pourMesh,compositionMesh} from './lab-geometry.mjs';
import {UI_MOTION} from './design-system.mjs';
import {uiNode,playbackButton} from './ui.mjs';
const labEl=id=>document.getElementById(id);
const labNumberFormat=new Intl.NumberFormat('ms-MY',{maximumFractionDigits:2,useGrouping:false});
const labFmt=n=>labNumberFormat.format(n);
const labNode=uiNode;
const LAB_COPY={net:['Bina bentangan sendiri','Susun enam segi empat sama, ramalkan hasilnya, kemudian lipat untuk menyemak. Muka kekal bersambung pada sisi yang dipilih.'],volume:['Makmal isi padu','Kira kiub unit atau pindahkan isi daripada kon/piramid ke bekas yang mempunyai luas tapak dan tinggi tegak yang sama.'],area:['Terbitkan rumus luas permukaan','Hubungkan setiap permukaan berwarna dengan luasnya. Jumlah bahagian yang dipilih akan membentuk rumus keseluruhan.'],composite:['Bongkah gabungan','Cantum dua bongkah pada tapak yang sama saiz. Tentukan permukaan yang terdedah dan tambah isi padunya.']};
export class LearningLabs{
 constructor({announce,prefersReduced}){
  this.announce=announce;this.prefersReduced=prefersReduced;this.ready=false;this.active=false;this.kind='net';this.raf=0;this.anim=null;this.paused=null;this.framing=null;this.step=time=>this.frame(time);
  this.camera={yaw:.48,pitch:.3,zoom:1};this.net={cells:NET_PRESETS.cross.map(p=>[...p]),progress:0,selected:0,dirty:true,notice:'',drag:null,suppressUntil:0};
  this.volume={kind:'unit',units:0,d:{p:3,l:2,t:3},size:3,height:4,pours:0,progress:0,full:true};
  this.area={shape:'cube',d:{...LESSON_DATA.cube.defaults},progress:0,selected:new Set(),focus:null,dirty:true};
  this.comp={kind:'roof',size:6,h:6,t:4,joined:0,selected:new Set(),dirty:true,feedback:''};
 }
 bind(id,fn,type='click'){labEl(id).addEventListener(type,event=>{fn(event);this.render();});}
 init(){
  if(this.ready)return;this.ready=true;this.renderer=new ModelRenderer(labEl('labs-canvas'));
  for(const kind of Object.keys(LAB_COPY))this.bind('lab-'+kind,()=>this.choose(kind));
  this.bind('net-example',()=>{const preset=NET_PRESETS[labEl('net-example').value];if(preset){this.net.cells=preset.map(p=>[...p]);this.changedNet();}},'change');
  this.bind('net-clear',()=>{this.net.cells=[];this.changedNet();});this.bind('net-selected',()=>{this.net.selected=Number(labEl('net-selected').value);},'change');
  for(const [id,dx,dy] of [['net-left',-1,0],['net-right',1,0],['net-up',0,-1],['net-down',0,1]])this.bind(id,()=>{const p=this.net.cells[this.net.selected];if(p)this.moveNet(this.net.selected,[p[0]+dx,p[1]+dy]);});
  this.bind('net-fold',()=>this.start(()=>this.net.progress,v=>this.net.progress=v,1,UI_MOTION.fold));
  this.bind('net-flat',()=>this.start(()=>this.net.progress,v=>this.net.progress=v,0,UI_MOTION.fold));
  this.bind('volume-kind',()=>{this.stop();this.volume.kind=labEl('volume-kind').value;this.volume.size=this.volume.kind==='pyramid'?6:3;this.resetPour();},'change');
  for(const key of ['p','l','t'])this.bind('unit-'+key,()=>{this.volume.d[key]=Number(labEl('unit-'+key).value);this.volume.units=0;},'input');
  this.bind('unit-one',()=>this.volume.units=Math.min(this.unitCapacity(),this.volume.units+1));
  this.bind('unit-layer',()=>this.volume.units=Math.min(this.unitCapacity(),this.volume.units+this.volume.d.p*this.volume.d.l));
  this.bind('unit-fill',()=>this.volume.units=this.unitCapacity());this.bind('unit-empty',()=>this.volume.units=0);
  this.bind('pour-size',()=>{this.volume.size=Number(labEl('pour-size').value);this.resetPour();},'input');
  this.bind('pour-height',()=>{this.volume.height=Number(labEl('pour-height').value);this.resetPour();},'input');
  this.bind('pour-reset',()=>this.resetPour());this.bind('pour-refill',()=>{this.volume.full=true;this.volume.progress=0;});
  this.bind('pour-one',()=>{const v=this.volume;if(v.pours>=3||!v.full||this.anim||this.paused)return;this.start(()=>v.progress,n=>v.progress=n,1,UI_MOTION.pour,()=>{v.pours++;v.progress=0;v.full=false;this.announce('Tuangan '+v.pours+' selesai.');});});
  this.bind('area-shape',()=>{this.stop();this.area.shape=labEl('area-shape').value;this.area.d={...LESSON_DATA[this.area.shape].defaults};this.area.progress=0;this.clearArea();},'change');
  for(const key of ['a','p','l','t','j'])this.bind('area-'+key,()=>{this.stop();this.area.d[key]=Number(labEl('area-'+key).value);this.clearArea();},'input');
  this.bind('area-open',()=>this.start(()=>this.area.progress,v=>this.area.progress=v,1,UI_MOTION.fold));
  this.bind('area-close',()=>this.start(()=>this.area.progress,v=>this.area.progress=v,0,UI_MOTION.fold));
  this.bind('area-all',()=>{this.area.selected=new Set(surfacePieces(this.area.shape,this.area.d).map(p=>p.id));this.area.dirty=true;});
  this.bind('area-clear',()=>this.clearArea());
  this.bind('comp-kind',()=>{this.stop();this.comp.kind=labEl('comp-kind').value;this.comp.size=this.comp.kind==='roof'?6:3;this.changedComp();},'change');
  for(const [id,key] of [['comp-size','size'],['comp-body-height','h'],['comp-roof-height','t']])this.bind(id,()=>{this.stop();this.comp[key]=Number(labEl(id).value);this.changedComp();},'input');
  this.bind('comp-join',()=>this.start(()=>this.comp.joined,v=>this.comp.joined=v,1,UI_MOTION.join));
  this.bind('comp-separate',()=>this.start(()=>this.comp.joined,v=>this.comp.joined=v,0,UI_MOTION.join));
  this.bind('comp-check',()=>{const c=this.comp,r=compositionMeasures(c.kind,this.compDims());if(c.joined<1){c.feedback='Cantum bongkah dahulu, kemudian semak permukaan luar.';return;}
   const correct=r.groups.every(g=>c.selected.has(g.key)===g.external);c.feedback=correct?'Tepat! Kedua-dua permukaan yang bercantum berada di dalam. Jumlahkan permukaan yang terdedah sahaja.':'Semak semula. Pilih semua permukaan luar; dua permukaan yang bercantum tidak dikira. Pisahkan bongkah untuk melihatnya.';this.announce(c.feedback);
  });
  this.bind('lab-progress',()=>{const n=Number(labEl('lab-progress').value)/1000;this.stop();if(this.kind==='net')this.net.progress=n;if(this.kind==='area')this.area.progress=n;if(this.kind==='composite')this.comp.joined=n;},'input');
  this.bind('lab-pause',()=>{if(this.anim)this.suspend();else if(this.paused){this.anim=this.paused;this.paused=null;this.anim.last=performance.now();this.revealStage();this.raf=requestAnimationFrame(this.step);}});
  for(const [id,key,amount] of [['lab-left','yaw',-.2],['lab-right','yaw',.2],['lab-up','pitch',.15],['lab-down','pitch',-.15],['lab-zoom-out','zoom',-.15],['lab-zoom-in','zoom',.15]])this.bind(id,()=>{this.camera[key]+=amount;this.boundCamera();});
  this.bind('lab-reset-camera',()=>this.camera={yaw:.48,pitch:.3,zoom:1});
  this.bind('lab-return',()=>this.revealStage());
  const canvas=labEl('labs-canvas');let pointer=null;
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;this.camera.yaw+=(e.clientX-pointer.x)*.009;this.camera.pitch+=(e.clientY-pointer.y)*.009;pointer.x=e.clientX;pointer.y=e.clientY;this.boundCamera();this.draw();});
  const release=e=>{if(pointer?.id===e.pointerId){pointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}};
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',()=>pointer=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.camera.zoom+=e.deltaY<0?.08:-.08;this.boundCamera();this.render();},{passive:false});
  canvas.addEventListener('keydown',e=>{if(e.isComposing)return;const controls={ArrowLeft:'lab-left',ArrowRight:'lab-right',ArrowUp:'lab-up',ArrowDown:'lab-down','+':'lab-zoom-in','=':'lab-zoom-in','-':'lab-zoom-out',Home:'lab-reset-camera'};if(controls[e.key]){e.preventDefault();labEl(controls[e.key]).click();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.suspend();else if(this.active)this.render();});
  if(typeof ResizeObserver!=='undefined'){this.resize=new ResizeObserver(()=>{if(this.active)this.draw();});this.resize.observe(canvas);}
 }
 open(){this.init();this.active=true;this.render();}
 close(){this.active=false;this.stop();this.net.drag=null;labEl('net-drag-ghost').hidden=true;}
 stop(clear=true){if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;this.anim=null;if(clear)this.paused=null;if(this.ready)this.refreshPlayback();}
 suspend(){if(this.anim)this.paused=this.anim;this.stop(false);if(this.active)this.render();}
 revealStage(){const canvas=labEl('labs-canvas');canvas.focus({preventScroll:true});canvas.scrollIntoView({behavior:this.prefersReduced()?'instant':'smooth',block:'center'});}
 start(get,set,to,duration,done=null){
  this.stop();this.revealStage();const from=get();if(from===to){if(done)done();this.render();return;}
  this.anim={get,set,from,to,duration:Math.max(1,duration*Math.abs(to-from)),elapsed:0,last:performance.now(),done};
  this.raf=requestAnimationFrame(this.step);this.refreshPlayback();
 }
 frame(time){
  this.raf=0;if(!this.active||document.hidden){this.suspend();return;}const a=this.anim;if(!a)return;
  a.elapsed+=Math.max(0,time-a.last);a.last=time;
  const t=clamp01(a.elapsed/a.duration);a.set(a.from+(a.to-a.from)*ease(t));
  if(t===1){a.set(a.to);this.anim=null;if(a.done)a.done();}
  this.render();if(this.anim)this.raf=requestAnimationFrame(this.step);
 }
 choose(kind){if(!LAB_COPY[kind])return;this.stop();this.kind=kind;this.camera={yaw:.48,pitch:.3,zoom:1};this.announce(LAB_COPY[kind][0]+' dipilih.');}
 boundCamera(){this.camera.pitch=Math.max(-1.5,Math.min(1.5,this.camera.pitch));this.camera.zoom=Math.max(.6,Math.min(2,this.camera.zoom));}
 changedNet(){this.stop();this.net.progress=0;this.net.notice='';this.net.selected=Math.max(0,Math.min(this.net.selected,this.net.cells.length-1));this.net.dirty=true;}
 moveNet(id,target){const n=this.net;if(target.some(v=>v<0||v>5)||n.cells.some((p,i)=>i!==id&&p[0]===target[0]&&p[1]===target[1])){n.notice='Pilih petak kosong dalam grid untuk memindahkan muka.';return;}n.cells[id]=target;this.changedNet();}
 buildNetGrid(){
  const n=this.net;labEl('net-grid').replaceChildren(...Array.from({length:36},(_,i)=>{
   const x=i%6,y=Math.floor(i/6),id=n.cells.findIndex(p=>p[0]===x&&p[1]===y),b=labNode('button',{type:'button',class:'net-cell','data-cell':x+','+y,'aria-pressed':String(id>=0),'aria-label':`Baris ${y+1}, lajur ${x+1}`+(id>=0?`, muka ${id+1}`:', petak kosong')},id>=0?String(id+1):'');if(id>=0)b.style.backgroundColor=FACE_COLORS[id];
   b.addEventListener('click',()=>{if(performance.now()<n.suppressUntil)return;if(id>=0)n.cells.splice(id,1);else if(n.cells.length<6)n.cells.push([x,y]);else{n.notice='Sudah ada 6 muka. Buang atau pindahkan satu muka dahulu.';this.render();return;}this.changedNet();n.focusCell=x+','+y;this.render();});
   b.addEventListener('pointerdown',e=>{if(id<0||(e.pointerType==='mouse'&&e.button!==0))return;n.selected=id;n.drag={id,x:e.clientX,y:e.clientY,moved:false};b.setPointerCapture(e.pointerId);});
   b.addEventListener('pointermove',e=>{const d=n.drag;if(!d||d.id!==id)return;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>6)d.moved=true;if(d.moved){e.preventDefault();const ghost=labEl('net-drag-ghost');ghost.hidden=false;ghost.textContent=String(id+1);ghost.style.backgroundColor=FACE_COLORS[id];ghost.style.left=e.clientX+7+'px';ghost.style.top=e.clientY+7+'px';}});
   b.addEventListener('pointerup',e=>{const d=n.drag;n.drag=null;labEl('net-drag-ghost').hidden=true;if(b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);if(!d?.moved)return;n.suppressUntil=performance.now()+250;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-cell]');if(target){const pos=target.dataset.cell.split(',').map(Number);this.moveNet(id,pos);this.render();}});
   b.addEventListener('pointercancel',()=>{n.drag=null;labEl('net-drag-ghost').hidden=true;});return b;
  }));
  labEl('net-selected').replaceChildren(...n.cells.map((p,id)=>labNode('option',{value:id},'Muka '+(id+1))));labEl('net-selected').value=String(n.selected);if(n.focusCell){[...labEl('net-grid').children].find(b=>b.dataset.cell===n.focusCell)?.focus({preventScroll:true});n.focusCell=null;}n.dirty=false;
 }
 unitCapacity(){const d=this.volume.d;return d.p*d.l*d.t;}
 resetPour(){this.stop();Object.assign(this.volume,{pours:0,progress:0,full:true});}
 pourDims(){const v=this.volume;return v.kind==='cone'?{j:v.size,t:v.height}:{a:v.size,t:v.height};}
 clearArea(){this.area.selected.clear();this.area.focus=null;this.area.dirty=true;}
 compDims(){const c=this.comp;return c.kind==='roof'?{a:c.size,t:c.t}:{j:c.size,h:c.h,t:c.t};}
 changedComp(){this.comp.joined=0;this.comp.selected.clear();this.comp.dirty=true;this.comp.feedback='';}
 refreshPlayback(){
  labEl('lab-playback').hidden=this.kind==='volume'&&this.volume.kind==='unit';
  const slider=this.kind!=='volume';labEl('lab-slider-wrap').hidden=!slider;labEl('lab-pause').disabled=!this.anim&&!this.paused;
  playbackButton(labEl('lab-pause'),this.paused?'Sambung animasi':'Jeda animasi',Boolean(this.anim));
  const progress=this.kind==='net'?this.net.progress:this.kind==='area'?this.area.progress:this.kind==='composite'?this.comp.joined:this.volume.progress;
  labEl('lab-progress').value=String(Math.round(progress*1000));labEl('lab-progress-value').textContent=Math.round(progress*100)+'%';
  labEl('lab-progress').setAttribute('aria-valuetext',Math.round(progress*100)+' peratus '+(this.kind==='net'?'dilipat':this.kind==='area'?'terbuka':'bercantum'));
  labEl('lab-progress-label').textContent=this.kind==='net'?'Rata → dilipat':this.kind==='area'?'Bongkah → bentangan':'Terpisah → bercantum';
 }
 render(){
  if(!this.ready||!this.active)return;
  const k=this.kind;for(const kind of Object.keys(LAB_COPY)){labEl('lab-'+kind).setAttribute('aria-pressed',String(k===kind));labEl('lab-'+kind+'-panel').hidden=k!==kind;}
  labEl('lab-title').textContent=LAB_COPY[k][0];labEl('lab-intro').textContent=LAB_COPY[k][1];
  if(k==='net')this.renderNet();if(k==='volume')this.renderVolume();if(k==='area')this.renderArea();if(k==='composite')this.renderComposite();
  labEl('lab-zoom-level').textContent=Math.round(this.camera.zoom*100)+'%';
  labEl('lab-zoom-out').disabled=this.camera.zoom<=.6;labEl('lab-zoom-in').disabled=this.camera.zoom>=2;
  this.refreshPlayback();this.draw();
 }
 renderNet(){
  const n=this.net,s=cubeNetState(n.cells);if(n.dirty)this.buildNetGrid();labEl('net-count').textContent=n.cells.length+' / 6 muka';labEl('net-fold').disabled=n.cells.length!==6||!s.connected;labEl('net-flat').disabled=n.progress===0;
  for(const button of labEl('net-grid').children)button.setAttribute('data-selected',String(button.dataset.cell===n.cells[n.selected]?.join(',')));
  for(const id of ['net-selected','net-left','net-right','net-up','net-down'])labEl(id).disabled=n.cells.length===0;
  labEl('net-feedback').textContent=n.notice||s.message;labEl('net-feedback').dataset.success=String(s.valid&&!n.notice);
  labEl('lab-scene-label').textContent='BENTANGAN KUBUS · MUKA BERNOMBOR';labEl('lab-caption').textContent=n.progress===0?'Rata: setiap segi empat sama ialah satu muka kubus. Warna dan nombor kekal sepanjang lipatan.'+(s.cutCount?' Garis putus-putus menunjukkan potongan tambahan.':''):n.progress===1?'Dilipat sepenuhnya. '+s.message:'Perhatikan setiap muka berputar pada satu sisi yang bersambung.';
  labEl('lab-outcome').textContent='Ramalkan dahulu: adakah keenam-enam muka akan menutup kubus tanpa bertindih?';
 }
 renderVolume(){
  const v=this.volume,unit=v.kind==='unit';labEl('volume-kind').value=v.kind;labEl('unit-controls').hidden=!unit;labEl('pour-controls').hidden=unit;
  labEl('lab-scene-label').textContent=unit?'KIUB UNIT · SETIAP KIUB = 1 cm³':'SUMBER DI KIRI → PENERIMA DI KANAN';
  if(unit){const {p,l,t}=v.d,total=this.unitCapacity(),layer=p*l;for(const key of ['p','l','t']){labEl('unit-'+key).value=String(v.d[key]);labEl('unit-'+key+'-value').textContent=v.d[key]+' cm';}
   labEl('unit-one').disabled=v.units===total;labEl('unit-layer').disabled=v.units===total;labEl('unit-fill').disabled=v.units===total;labEl('unit-empty').disabled=v.units===0;
   labEl('unit-result').textContent=`${v.units} / ${total} kiub · ${Math.floor(v.units/layer)} lapisan penuh daripada ${t}.`;
   labEl('unit-equation').textContent=`V = p × l × t = ${p} × ${l} × ${t} = ${total} cm³`;
   labEl('lab-caption').textContent=`Satu lapisan memuatkan ${p} × ${l} = ${layer} kiub. Warna membezakan lapisan. Garisan luar menunjukkan sempadan kuboid.`;
   labEl('lab-outcome').textContent=`Isi yang telah dimasukkan: ${v.units} cm³. Kapasiti penuh: ${total} cm³.`;
  }else{const cone=v.kind==='cone',d=this.pourDims(),p=pourState(v.kind,d,Math.min(2,v.pours),v.progress),fraction=v.pours===3?1:p.fraction;
   labEl('pour-explanation').textContent=(cone?'Kon dan silinder mempunyai tapak bulatan sama saiz.':'Piramid dan prisma mempunyai tapak segi empat sama sama saiz.')+' Kedua-dua bekas mempunyai tinggi tegak yang sama. Ramalkan bilangan tuangan untuk memenuhi penerima.';
   labEl('pour-size-label').textContent=cone?'j · jejari kedua-dua tapak':'a · sisi kedua-dua tapak';for(const [id,value] of [['pour-size',v.size],['pour-height',v.height]]){labEl(id).value=String(value);labEl(id+'-value').textContent=value+' cm';}
   labEl('pour-one').disabled=v.pours>=3||!v.full||Boolean(this.anim||this.paused);labEl('pour-one').textContent=this.paused?'Tuangan dijeda':this.anim?'Sedang menuang…':'Tuang sekali';labEl('pour-refill').disabled=v.pours>=3||v.full||Boolean(this.anim||this.paused);
   labEl('pour-result').textContent=`${v.pours} / 3 tuangan lengkap · Penerima ${labFmt(fraction*100)}% penuh.`;
   labEl('pour-equation').textContent=`3 × ${cone?'V kon':'V piramid'} = ${cone?'V silinder':'V prisma'} ${Number.isInteger(p.capacity)?'=':'≈'} ${labFmt(p.capacity)} cm³`;
   labEl('lab-caption').textContent=`Kiri: ${cone?'kon':'piramid'}. Kanan: ${cone?'silinder':'prisma'}. Paras di kiri mengikut bentuk yang mengecil ke puncak; paras di kanan mengikut isi yang dipindahkan.`;
   labEl('lab-outcome').textContent=`Isi penerima: ${labFmt(p.capacity*fraction)} / ${labFmt(p.capacity)} cm³. `+(v.pours===3?'Tiga tuangan memenuhi penerima.':v.full?'Tekan Tuang sekali untuk memindahkan isi.':'Isi semula sumber untuk tuangan seterusnya.');
  }
 }
 renderArea(){
  const a=this.area,parts=surfacePieces(a.shape,a.d),fields=MEASURE_FIELDS[a.shape];labEl('area-shape').value=a.shape;
  for(const key of ['a','p','l','t','j']){labEl('area-field-'+key).hidden=!fields.includes(key);labEl('area-'+key).value=String(a.d[key]||1);labEl('area-'+key+'-value').textContent=(a.d[key]||1)+' cm';}
  const measures=calculateMeasures(a.shape,a.d,'full');labEl('area-slant').textContent=measures.slant===null?'':'Tinggi sendeng s ≈ '+labFmt(measures.slant)+' cm, dikira daripada tinggi tegak dan '+(a.shape==='pyramid'?'separuh sisi tapak.':'jejari.');
  labEl('area-open').disabled=a.progress===1&&!this.anim;labEl('area-close').disabled=a.progress===0&&!this.anim;
  if(a.dirty){labEl('area-pieces').replaceChildren(...parts.map(p=>{const b=labNode('button',{type:'button',class:'area-piece','data-piece':p.id,'aria-pressed':String(a.selected.has(p.id))});const swatch=labNode('i',{'aria-hidden':'true'});swatch.style.backgroundColor=p.color;b.append(swatch,labNode('span',{},(p.id+1)+'. '+p.name),labNode('b',{},labFmt(p.area)+' cm²'));b.addEventListener('click',()=>{if(a.selected.has(p.id))a.selected.delete(p.id);else a.selected.add(p.id);a.focus=p.id;a.focusPending=true;a.dirty=true;this.render();});return b;}));if(a.focusPending){[...labEl('area-pieces').children].find(b=>Number(b.dataset.piece)===a.focus)?.focus({preventScroll:true});a.focusPending=false;}a.dirty=false;}
  const chosen=parts.filter(p=>a.selected.has(p.id)),sum=chosen.reduce((s,p)=>s+p.area,0);labEl('area-count').textContent=`${chosen.length} / ${parts.length} permukaan dipilih`;
  labEl('area-sum').textContent=chosen.length?chosen.map(p=>labFmt(p.area)).join(' + ')+' cm²':'Pilih permukaan berwarna untuk mengumpulkan luasnya.';
  labEl('area-total').textContent='Jumlah dipilih '+(Number.isInteger(sum)?'= ':'≈ ')+labFmt(sum)+' cm²';labEl('area-formula').textContent=chosen.length===parts.length?'Rumus keseluruhan: '+LESSON_DATA[a.shape].surface.formula:'Rumus keseluruhan akan muncul selepas semua permukaan dipilih.';
  labEl('lab-scene-label').textContent=MODEL_DATA[a.shape].name.toUpperCase()+' · LUAS SETIAP PERMUKAAN';
  labEl('lab-caption').textContent=LESSON_DATA[a.shape].surface.why;
  labEl('lab-outcome').textContent=chosen.length===parts.length?'Semua permukaan telah dikira sekali. Jumlahnya ialah luas permukaan bongkah tertutup.':'Setiap permukaan mesti dikira tepat sekali, termasuk tapak.';
 }
 renderComposite(){
  const c=this.comp,r=compositionMeasures(c.kind,this.compDims()),roof=c.kind==='roof';labEl('comp-kind').value=c.kind;labEl('comp-size-label').textContent=roof?'a · sisi tapak bersama':'j · jejari tapak bersama';labEl('comp-body-field').hidden=roof;
  labEl('comp-join').disabled=c.joined===1&&!this.anim;labEl('comp-separate').disabled=c.joined===0&&!this.anim;
  for(const [id,value] of [['comp-size',c.size],['comp-body-height',c.h],['comp-roof-height',c.t]]){labEl(id).value=String(value);labEl(id+'-value').textContent=value+' cm';}
  if(c.dirty){labEl('comp-groups').replaceChildren(...r.groups.map(g=>{const b=labNode('button',{type:'button',class:'area-piece','data-group':g.key,'aria-pressed':String(c.selected.has(g.key))},g.label);b.addEventListener('click',()=>{if(c.selected.has(g.key))c.selected.delete(g.key);else c.selected.add(g.key);c.dirty=true;c.focusPending=g.key;c.feedback='';this.render();});return b;}));if(c.focusPending){[...labEl('comp-groups').children].find(b=>b.dataset.group===c.focusPending)?.focus({preventScroll:true});c.focusPending=null;}c.dirty=false;}
  labEl('comp-feedback').textContent=c.feedback||'Pilih permukaan yang akan terdedah di luar selepas kedua-dua bongkah dicantum.';
  if(c.feedback)labEl('comp-feedback').setAttribute('data-success',String(c.feedback.startsWith('Tepat')));else labEl('comp-feedback').setAttribute('data-success','');
  labEl('comp-area').textContent=c.joined===1?labFmt(r.area)+' cm²':'Cantum dahulu';labEl('comp-volume').textContent=labFmt(r.volume)+' cm³';
  labEl('comp-equation').textContent=`Luas dua bongkah berasingan ${labFmt(r.separateArea)} cm² − 2 × luas tapak bersama ${labFmt(r.sharedArea)} cm² = ${labFmt(r.area)} cm². Tinggi sendeng bahagian atas s ≈ ${labFmt(r.slant)} cm.`;
  labEl('lab-scene-label').textContent=roof?'KUBUS + PIRAMID':'SILINDER + KON';labEl('lab-caption').textContent=c.joined===1?'Tapak bahagian atas menutup muka atas bahagian bawah. Kedua-duanya menjadi permukaan dalaman.':'Pisahkan untuk melihat kedua-dua tapak yang akan bertemu. Saiz tapaknya sentiasa sepadan.';
  labEl('lab-outcome').textContent='Isi padu gabungan ialah jumlah kedua-dua isi padu; luas luar mengecualikan kedua-dua muka yang bercantum.';
 }
 draw(){
  if(!this.ready||!this.active)return;const k=this.kind;let mesh,progress=0,labels=false,selected=null;
  if(k==='net'){progress=this.net.progress;mesh=cubeNetMesh(this.net.cells,progress);labels=true;}
  if(k==='volume'){const v=this.volume;progress=v.progress;mesh=v.kind==='unit'?unitCubeMesh(v.d,v.units):pourMesh(v.kind,this.pourDims(),v.pours,v.progress,v.full);}
  if(k==='area'){const a=this.area;progress=a.progress;mesh=buildMesh(a.shape,progress,144,labDimensions(a.shape,a.d));labels=true;selected=[...a.selected];}
  if(k==='composite'){progress=this.comp.joined;mesh=compositionMesh(this.comp.kind,this.compDims(),progress);}
  let fitMesh=null;
  if(k!=='volume'){
   const key=k+JSON.stringify(k==='net'?this.net.cells:k==='area'?[this.area.shape,this.area.d]:[this.comp.kind,this.compDims()]);
   if(this.framing?.key!==key){
    const samples=[0,.25,.5,.75,1];
    const reference=samples.flatMap(p=>k==='net'?cubeNetMesh(this.net.cells,p):k==='area'?buildMesh(this.area.shape,p,64,labDimensions(this.area.shape,this.area.d)):compositionMesh(this.comp.kind,this.compDims(),p));
    this.framing={key,mesh:reference};
   }
   fitMesh=this.framing.mesh.length?this.framing.mesh:null;
  }
  this.renderer.draw({shape:'lab',mesh,fitMesh,progress,...this.camera,labels,selected});const canvas=labEl('labs-canvas');
  Object.assign(canvas.dataset,{lab:k,progress:String(progress),valid:String(cubeNetState(this.net.cells).valid),units:String(this.volume.units),pours:String(this.volume.pours),joined:String(this.comp.joined),yaw:String(this.camera.yaw),pitch:String(this.camera.pitch),zoom:String(this.camera.zoom)});
  canvas.setAttribute('aria-label',LAB_COPY[k][0]+'. '+labEl('lab-caption').textContent);
 }
}
