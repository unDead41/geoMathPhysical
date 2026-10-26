import {GuidedActivity,LabHistory,LabMotion} from './guided.mjs';
import {ModelRenderer} from './renderer.mjs';
import {clamp01,ease,FACE_COLORS} from './geometry.mjs';
import {MODEL_DATA,MODEL_ORDER} from './content.mjs';
import {LESSON_DATA,MEASURE_FIELDS,calculateMeasures} from './lessons.mjs';
import {NET_PRESETS,cubeNetState,cubeNetMesh,pourState,compositionMeasures,unitCubeMesh,pourMesh,compositionMesh} from './lab-geometry.mjs';
import {PRESET_NETS,presetNetMesh} from './preset-nets.mjs';
import {volumeFields,volumeDefaults,volumeInfo,volumeComparisonMesh,comparisonTotal} from './volume-lab.mjs';
import {learningMesh,studySurfacePieces} from './learning-mesh.mjs';
import {readVolumeAmount,transferPlan,transferFrame} from './volume-transfer.mjs';
import {SurfaceWorkshop} from './surface-workshop.mjs';
import {NetStudio} from './net-studio.mjs';
import {NetPrinter} from './net-print.mjs';
import {UI_MOTION} from './design-system.mjs';
import {uiNode,playbackButton} from './ui.mjs';
const labEl=id=>document.getElementById(id);
const labNumberFormat=new Intl.NumberFormat('ms-MY',{maximumFractionDigits:2,useGrouping:false});
const labFmt=n=>n>0&&n<.01?'< 0.01':labNumberFormat.format(n);
const labNode=uiNode;
const LAB_COPY={net:['Teroka dan bina bentangan','Pilih bentangan siap atau susun petak kubus. Lipat perlahan, jeda dan jejaki muka yang sama melalui warna serta nombor.'],volume:['Makmal isi padu','Isi satu atau dua bongkah dan jumlahkan isi pilihan. Anda juga boleh menyusun kiub unit atau membandingkan tiga tuangan pada bekas bertapak dan bertinggi sama.'],area:['Terbitkan rumus luas permukaan','Hubungkan setiap permukaan berwarna dengan luasnya. Jumlah bahagian yang dipilih akan membentuk rumus keseluruhan.'],composite:['Bongkah gabungan','Cantum dua bongkah pada tapak yang sama saiz. Tentukan permukaan yang terdedah dan tambah isi padunya.']};
export class LearningLabs{
 constructor({announce,prefersReduced,onProgress=()=>{},onActivity=()=>{},onDescribe=()=>{}}){
  Object.assign(this,{onProgress,onActivity,onDescribe});this.guided=Object.fromEntries(['net','volume','area','composite'].map(k=>[k,new GuidedActivity(k)]));this.histories=Object.fromEntries(Object.keys(this.guided).map(k=>[k,new LabHistory()]));this.touched=new Set();this.guideFeedback='';this.lastProgressSent={};this.discoveries=new Set();
  this.announce=announce;this.prefersReduced=prefersReduced;this.ready=false;this.active=false;this.kind='net';this.raf=0;this.anim=null;this.paused=null;this.framing=null;this.step=time=>this.frame(time);
  this.speed=.5;this.suspended=new Map();this.guideKey='';
  this.camera={yaw:.48,pitch:.3,zoom:1};this.net={mode:'gallery',preset:'cube',presetFace:null,presetDirty:true,cells:NET_PRESETS.cross.map(p=>[...p]),progress:0,selected:0,dirty:true,notice:'',drag:null,suppressUntil:0};
  this.volume={kind:'compare',units:0,d:{p:3,l:2,t:3},size:3,height:4,pours:0,progress:0,full:true};
  this.compare={count:2,transfer:0,included:[true,true],amountRaw:'1',unit:'cm3',allowOverflow:false,spill:0,lastTransfer:null,feedback:'',items:[{key:'cube',d:{a:3},fill:0},{key:'cuboid',d:{p:4,l:3,t:2},fill:0}]};
  this.area={mode:'closed',shape:'cube',d:{...LESSON_DATA.cube.defaults},progress:0,selected:new Set(),focus:null,dirty:true};
  this.comp={kind:'roof',size:6,h:6,t:4,joined:0,selected:new Set(),dirty:true,feedback:''};
 }
 bind(id,fn,type='click'){
  labEl(id).addEventListener(type,event=>{
   const edits=/^(?:net-mode-|net-preset$|net-example$|net-clear$|net-fold$|net-flat$|volume-kind$|unit-|pour-|compare-|area-(?:mode|shape|[apltj]|open|close|all|clear)$|comp-(?:kind|size|body-height|roof-height|join|separate)$|lab-progress$)/.test(id);
   const input=labEl(id),value=input.value,checked=input.checked;
   if(edits){this.beginEdit();input.value=value;input.checked=checked;this.inEdit=true;}
   try{fn(event);}finally{this.inEdit=false;}
   this.render();
  });
 }
 init(){
  if(this.ready)return;this.ready=true;this.renderer=new ModelRenderer(labEl('labs-canvas'));
  this.printDirty=true;this.studio=new NetStudio({mount:labEl('net-studio-mount'),onBeforeChange:()=>this.beginEdit(),onChange:()=>{this.stop();this.net.progress=0;this.printDirty=true;this.render();}});
  this.printer=new NetPrinter({mount:labEl('net-print-mount'),printMount:labEl('net-print-sheet')});
  this.workshop=new SurfaceWorkshop({mount:labEl('surface-workshop-mount'),onBeforeChange:()=>this.beginEdit(),onChange:()=>{this.stop();this.render();},onView:()=>{this.camera={yaw:.4,pitch:1.2,zoom:1};this.render();}});
  for(const kind of Object.keys(LAB_COPY))this.bind('lab-'+kind,()=>this.choose(kind));
  for(const mode of ['gallery','editor','studio'])this.bind('net-mode-'+mode,()=>{this.stop();this.net.mode=mode;this.net.progress=0;this.net.dirty=true;this.printDirty=true;});
  const choices=()=>PRESET_NETS.map(p=>labNode('option',{value:p.key},p.name));
  labEl('net-preset').replaceChildren(...choices());
  this.bind('net-preset',()=>{this.stop();this.net.preset=labEl('net-preset').value;this.net.progress=0;this.net.presetFace=null;this.net.presetDirty=true;this.printDirty=true;},'change');
  this.bind('net-example',()=>{const preset=NET_PRESETS[labEl('net-example').value];if(preset){this.net.cells=preset.map(p=>[...p]);this.net.manualRepair=false;this.changedNet();}},'change');
  this.bind('net-clear',()=>{this.net.cells=[];this.changedNet();});this.bind('net-selected',()=>{this.net.selected=Number(labEl('net-selected').value);},'change');
  for(const [id,dx,dy] of [['net-left',-1,0],['net-right',1,0],['net-up',0,-1],['net-down',0,1]])this.bind(id,()=>{if(this.net.progress>0)return;const p=this.net.cells[this.net.selected];if(p)this.moveNet(this.net.selected,[p[0]+dx,p[1]+dy]);});
  this.bind('net-fold',()=>this.start(()=>this.net.progress,v=>this.net.progress=v,1,UI_MOTION.fold));
  this.bind('net-flat',()=>this.start(()=>this.net.progress,v=>this.net.progress=v,0,UI_MOTION.fold));
  this.bind('volume-kind',()=>{const kind=labEl('volume-kind').value;this.stop();this.volume.kind=kind;this.volume.size=kind==='pyramid'?6:3;this.resetPour();},'change');
  for(const key of ['p','l','t'])this.bind('unit-'+key,()=>{const value=Number(labEl('unit-'+key).value);this.stop();this.volume.d[key]=value;this.volume.units=0;this.announce('Ukuran berubah. Bekas kiub unit dikosongkan.');},'input');
  this.bind('unit-one',()=>{if(!this.anim&&!this.paused)this.volume.units=Math.min(this.unitCapacity(),this.volume.units+1);});
  this.bind('unit-layer',()=>this.fillUnits(Math.min(this.unitCapacity(),(Math.floor(this.volume.units/(this.volume.d.p*this.volume.d.l))+1)*this.volume.d.p*this.volume.d.l)));
  this.bind('unit-fill',()=>this.fillUnits(this.unitCapacity()));this.bind('unit-empty',()=>{this.stop();this.volume.units=0;});
  this.bind('pour-size',()=>{this.volume.size=Number(labEl('pour-size').value);this.resetPour();},'input');
  this.bind('pour-height',()=>{this.volume.height=Number(labEl('pour-height').value);this.resetPour();},'input');
  this.bind('pour-reset',()=>this.resetPour());this.bind('pour-refill',()=>{this.volume.full=true;this.volume.progress=0;});
  this.bind('pour-one',()=>{const v=this.volume;if(v.pours>=3||!v.full||v.progress>0||this.anim||this.paused)return;this.start(()=>v.progress,n=>v.progress=n,1,UI_MOTION.pour,()=>{v.pours++;v.progress=0;v.full=false;this.announce('Tuangan '+v.pours+' selesai. Perhatikan paras isi sebelum meneruskan.');});});
  for(const [i,letter] of ['a','b'].entries()){
   labEl('compare-shape-'+letter).replaceChildren(...MODEL_ORDER.map(key=>labNode('option',{value:key},MODEL_DATA[key].name)));
   this.bind('compare-shape-'+letter,()=>{this.stop();const key=labEl('compare-shape-'+letter).value;this.compare.items[i]={key,d:volumeDefaults(key),fill:0};this.clearTransfer();},'change');
   for(const field of ['a','p','l','t','j'])this.bind('compare-'+letter+'-'+field,()=>{const value=Number(labEl('compare-'+letter+'-'+field).value);this.stop();this.compare.items[i].d[field]=value;this.compare.items[i].fill=0;this.clearTransfer();},'input');
   this.bind('compare-fill-'+letter,()=>{const value=Number(labEl('compare-fill-'+letter).value)/1000;this.stop();this.compare.items[i].fill=clamp01(value);this.clearTransfer();},'input');
   this.bind('compare-include-'+letter,()=>{this.compare.included[i]=labEl('compare-include-'+letter).checked;},'change');
   this.bind('compare-add-'+letter,()=>this.fillCompare([i],false));this.bind('compare-full-'+letter,()=>this.fillCompare([i],true));
  }
  this.bind('compare-count',()=>{const count=Number(labEl('compare-count').value);this.stop();this.compare.count=count===1?1:2;this.compare.included=[true,true];this.clearTransfer();},'change');
  this.bind('compare-amount',()=>{const raw=labEl('compare-amount').value;this.stop();this.compare.amountRaw=raw;this.clearTransfer();},'input');
  this.bind('compare-unit',()=>{const unit=labEl('compare-unit').value;this.stop();this.compare.unit=unit;this.clearTransfer();},'change');
  this.bind('compare-overflow',()=>{const spill=labEl('compare-overflow').value==='spill';this.stop();this.compare.allowOverflow=spill;this.clearTransfer();},'change');
  this.bind('compare-transfer-ab',()=>this.transferCompare(0));this.bind('compare-transfer-ba',()=>this.transferCompare(1));
  this.bind('compare-add-both',()=>this.fillCompare([0,1],false));this.bind('compare-full-both',()=>this.fillCompare([0,1],true));
  this.bind('compare-empty',()=>{this.stop();this.compare.items.forEach(x=>x.fill=0);this.compare.transfer=0;this.compare.spill=0;this.clearTransfer();});
  labEl('area-shape').replaceChildren(...MODEL_ORDER.map(key=>labNode('option',{value:key},MODEL_DATA[key].name)));
  this.bind('area-mode',()=>{this.stop();this.area.mode=labEl('area-mode').value;this.area.progress=0;this.workshop.mode=this.area.mode;this.workshop.selected.clear();},'change');
  this.bind('area-shape',()=>{this.stop();this.area.shape=labEl('area-shape').value;this.area.d={...LESSON_DATA[this.area.shape].defaults};this.area.progress=0;this.clearArea();},'change');
  for(const key of ['a','p','l','t','j'])this.bind('area-'+key,()=>{const value=Number(labEl('area-'+key).value);this.stop();this.area.d[key]=value;this.clearArea();},'input');
  this.bind('area-open',()=>{if(!MODEL_DATA[this.area.shape].noNet)this.start(()=>this.area.progress,v=>this.area.progress=v,1,UI_MOTION.fold);});
  this.bind('area-close',()=>{if(!MODEL_DATA[this.area.shape].noNet)this.start(()=>this.area.progress,v=>this.area.progress=v,0,UI_MOTION.fold);});
  this.bind('area-all',()=>{if(!this.areaReady())return;this.area.selected=new Set(studySurfacePieces(this.area.shape,this.area.d).map(p=>p.id));this.area.dirty=true;});this.bind('area-clear',()=>this.clearArea());
  this.bind('comp-kind',()=>{this.stop();this.comp.kind=labEl('comp-kind').value;this.comp.size=this.comp.kind==='roof'?6:3;this.changedComp();},'change');
  for(const [id,key] of [['comp-size','size'],['comp-body-height','h'],['comp-roof-height','t']])this.bind(id,()=>{const value=Number(labEl(id).value);this.stop();this.comp[key]=value;this.changedComp();},'input');
  this.bind('comp-join',()=>this.start(()=>this.comp.joined,v=>this.comp.joined=v,1,UI_MOTION.join));this.bind('comp-separate',()=>this.start(()=>this.comp.joined,v=>this.comp.joined=v,0,UI_MOTION.join));
  this.bind('comp-check',()=>{const c=this.comp,r=compositionMeasures(c.kind,this.compDims());if(!this.compReady())return;const correct=r.groups.every(g=>c.selected.has(g.key)===g.external);c.feedback=correct?'Tepat! Kedua-dua permukaan yang bercantum berada di dalam. Jumlahkan permukaan yang terdedah sahaja.':'Semak semula. Pilih semua permukaan luar; dua permukaan yang bercantum tidak dikira. Pisahkan bongkah untuk melihatnya.';this.announce(c.feedback);});
  this.bind('lab-progress',()=>{const n=Number(labEl('lab-progress').value)/1000;this.stop();if(this.kind==='net')this.net.progress=n;if(this.kind==='area'&&this.area.mode==='closed'&&!MODEL_DATA[this.area.shape].noNet)this.area.progress=n;if(this.kind==='composite')this.comp.joined=n;},'input');
  this.bind('lab-pause',()=>{if(this.anim)this.pause();else this.resume();});
  this.bind('lab-speed',()=>{const value=Number(labEl('lab-speed').value);if([.25,.5,1].includes(value))this.speed=value;},'change');
  this.bind('lab-next',()=>this.nextStep());
  this.bind('guided-begin',()=>this.beginGuided());this.bind('guided-check',()=>this.checkGuided());this.bind('guided-complete',()=>this.completeGuided());
  this.bind('guided-prediction',()=>{const a=this.guided[this.kind];if(a.draft.prediction&&labEl('guided-prediction').value.trim()!==a.draft.prediction){a.retry();this.guideFeedback='Ramalan berubah. Simpan ramalan baharu sebelum eksperimen.';}},'input');
  for(const [id,type] of [['guided-answer','input'],['guided-term','change']])this.bind(id,()=>{const a=this.guided[this.kind];a.invalidateCheck();this.guideFeedback='Jawapan berubah. Semak semula sebelum menyimpan penerangan.';},type);
  this.bind('lab-undo',()=>this.undo());this.bind('lab-retry',()=>this.retryActivity());
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
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();else if(this.active)this.render();});
  if(typeof ResizeObserver!=='undefined'){this.resize=new ResizeObserver(()=>{if(this.active)this.draw();});this.resize.observe(canvas);}
 }
 open(){this.init();this.active=true;this.render();}
 close(){this.pause();this.active=false;this.net.drag=null;labEl('net-drag-ghost').hidden=true;}
 stop(clear=true){if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;this.anim=null;if(clear)this.paused=null;if(this.ready)this.refreshPlayback();}
 pause(){if(this.anim)this.paused=this.anim;this.stop(false);if(this.ready)this.render();}
 resume(){if(this.paused){this.anim=this.paused;this.paused=null;this.anim.last=performance.now();this.revealStage();this.raf=requestAnimationFrame(this.step);}}
 revealStage(){const canvas=labEl('labs-canvas'),r=canvas.getBoundingClientRect();canvas.focus({preventScroll:true});if(r.top<80||r.bottom>(window.innerHeight||800)-50)canvas.scrollIntoView({behavior:this.prefersReduced()?'instant':'smooth',block:'center'});}
 start(get,set,to,baseDuration,done=null,reveal=true){
  if(!this.inEdit)this.beginEdit();this.stop();if(reveal)this.revealStage();const from=get();if(from===to){if(done)done();this.render();return;}
  this.anim=new LabMotion(get,set,to,Math.max(1,baseDuration*Math.abs(to-from)),done,ease);this.anim.baseDuration=baseDuration;this.anim.last=performance.now();
  this.raf=requestAnimationFrame(this.step);this.refreshPlayback();
 }
 frame(time){
  this.raf=0;if(!this.active||document.hidden){this.pause();return;}const a=this.anim;if(!a)return;
  // Accumulate timeline time at the chosen speed; pause and speed changes keep
  // the original endpoints and easing rather than beginning a new acceleration.
  const dt=Math.max(0,time-a.last);a.last=time;this.advanceMotion(a,dt*this.speed);
  this.render();if(this.anim)this.raf=requestAnimationFrame(this.step);
 }
 advanceMotion(a,dt){
  a.advance(dt);if(a.finished){if(this.anim===a)this.anim=null;if(this.paused===a)this.paused=null;}
 }
 nextStep(){
  if(!this.anim&&!this.paused){
   if(this.kind==='volume'&&this.volume.kind==='unit'){this.beginEdit();this.volume.units=Math.min(this.unitCapacity(),this.volume.units+1);return;}
   const id=this.kind==='net'?'net-fold':this.kind==='area'?'area-open':this.kind==='composite'?'comp-join':this.volume.kind==='compare'?'compare-add-a':'pour-one';
   if(labEl(id).disabled)return;labEl(id).click();
  }
  const a=this.anim||this.paused;if(!a)return;this.stop(false);this.paused=a;this.advanceMotion(a,a.duration/10);
 }
 snapshot(){
  const copy=value=>JSON.parse(JSON.stringify(value)),k=this.kind;
  if(k==='net'){const net={...this.net};for(const key of ['drag','focusCell','suppressUntil','presetFocusPending'])delete net[key];return copy({net,studio:this.studio?{shape:this.studio.shape,parents:this.studio.parents,inside:this.studio.inside,dimensions:this.studio.dimensions,openFace:this.studio.openFace}:null});}
  if(k==='volume')return copy({volume:this.volume,compare:this.compare});
  if(k==='area')return copy({area:{...this.area,selected:[...this.area.selected]},workshop:this.workshop?{mode:this.workshop.mode,shape:this.workshop.shape,closed:this.workshop.closed,d:this.workshop.d,selected:[...this.workshop.selected]}:null});
  return copy({comp:{...this.comp,selected:[...this.comp.selected]}});
 }
 remember(){this.histories[this.kind].push(this.snapshot());}
 beginEdit(){this.remember();this.stop();this.suspended.delete(this.kind);this.guided[this.kind].edit();this.touched.add(this.kind);this.guideFeedback='';}
 undo(){
  const value=this.histories[this.kind].undo();if(!value)return;this.stop();this.suspended.delete(this.kind);this.guided[this.kind].edit();this.touched.add(this.kind);this.guideFeedback='';
  if(value.net){Object.assign(this.net,value.net,{dirty:true,presetDirty:true,drag:null});if(value.studio)Object.assign(this.studio,value.studio,{dirty:true});this.printDirty=true;}
  if(value.volume){Object.assign(this.volume,value.volume);Object.assign(this.compare,value.compare);}
  if(value.area){Object.assign(this.area,value.area,{selected:new Set(value.area.selected),dirty:true});if(value.workshop)Object.assign(this.workshop,value.workshop,{selected:new Set(value.workshop.selected)});}
  if(value.comp)Object.assign(this.comp,value.comp,{selected:new Set(value.comp.selected),dirty:true});
  this.announce('Edit terakhir diundur. Semak eksperimen semula.');
 }
 guidedSupported(){return this.kind==='net'?this.net.mode==='editor':this.kind==='volume'?['unit','cone','pyramid'].includes(this.volume.kind):this.kind==='area'?this.area.mode==='closed'&&['cube','cuboid','pyramid','cylinder','cone'].includes(this.area.shape):true;}
 choose(kind){if(!LAB_COPY[kind]||kind===this.kind)return;const old=this.kind,saved=this.anim||this.paused;this.stop();if(saved)this.suspended.set(old,saved);this.onActivity();this.kind=kind;this.guideOptionsKey=null;this.guideFeedback='';labEl('guided-prediction').value=this.guided[kind].draft.prediction;labEl('guided-explanation').value=this.guided[kind].draft.explanation;labEl('guided-answer').value='';this.paused=this.suspended.get(kind)||null;this.suspended.delete(kind);this.camera={yaw:.48,pitch:.3,zoom:1};this.announce(LAB_COPY[kind][0]+' dipilih.');}
 boundCamera(){this.camera.pitch=Math.max(-1.5,Math.min(1.5,this.camera.pitch));this.camera.zoom=Math.max(.6,Math.min(2,this.camera.zoom));}
 changedNet(){this.stop();this.net.progress=0;this.net.notice='';this.net.selected=Math.max(0,Math.min(this.net.selected,this.net.cells.length-1));this.net.dirty=true;this.printDirty=true;}
 moveNet(id,target){const n=this.net;if(target.some(v=>v<0||v>5)||n.cells.some((p,i)=>i!==id&&p[0]===target[0]&&p[1]===target[1])){n.notice='Pilih petak kosong dalam grid untuk memindahkan muka.';return;}this.beginEdit();n.cells[id]=target;n.manualRepair=true;this.changedNet();}
 buildNetGrid(){
  const n=this.net;labEl('net-grid').replaceChildren(...Array.from({length:36},(_,i)=>{
   const x=i%6,y=Math.floor(i/6),id=n.cells.findIndex(p=>p[0]===x&&p[1]===y),b=labNode('button',{type:'button',class:'net-cell','data-cell':x+','+y,'aria-pressed':String(id>=0),'aria-label':`Baris ${y+1}, lajur ${x+1}`+(id>=0?`, muka ${id+1}`:', petak kosong')},id>=0?String(id+1):'');if(id>=0)b.style.backgroundColor=FACE_COLORS[id];
   b.addEventListener('click',()=>{if(n.progress>0||this.anim||performance.now()<n.suppressUntil)return;if(id<0&&n.cells.length>=6){n.notice='Sudah ada 6 muka. Buang atau pindahkan satu muka dahulu.';this.render();return;}this.beginEdit();if(id>=0)n.cells.splice(id,1);else n.cells.push([x,y]);n.manualRepair=true;this.changedNet();n.focusCell=x+','+y;this.render();});
   b.addEventListener('pointerdown',e=>{if(n.progress>0||this.anim||id<0||(e.pointerType==='mouse'&&e.button!==0))return;n.selected=id;n.drag={id,x:e.clientX,y:e.clientY,moved:false};b.setPointerCapture(e.pointerId);});
   b.addEventListener('pointermove',e=>{const d=n.drag;if(!d||d.id!==id)return;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>6)d.moved=true;if(d.moved){e.preventDefault();const ghost=labEl('net-drag-ghost');ghost.hidden=false;ghost.textContent=String(id+1);ghost.style.backgroundColor=FACE_COLORS[id];ghost.style.left=e.clientX+7+'px';ghost.style.top=e.clientY+7+'px';}});
   b.addEventListener('pointerup',e=>{const d=n.drag;n.drag=null;labEl('net-drag-ghost').hidden=true;if(b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);if(!d?.moved)return;n.suppressUntil=performance.now()+250;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-cell]');if(target){const pos=target.dataset.cell.split(',').map(Number);this.moveNet(id,pos);this.render();}});
   b.addEventListener('pointercancel',()=>{n.drag=null;labEl('net-drag-ghost').hidden=true;});return b;
  }));
  labEl('net-selected').replaceChildren(...n.cells.map((p,id)=>labNode('option',{value:id},'Muka '+(id+1))));labEl('net-selected').value=String(n.selected);if(n.focusCell){[...labEl('net-grid').children].find(b=>b.dataset.cell===n.focusCell)?.focus({preventScroll:true});n.focusCell=null;}n.dirty=false;
 }
 fillUnits(target){if(this.anim||this.paused)return;const v=this.volume,perUnit=UI_MOTION.layer/(v.d.p*v.d.l);this.start(()=>v.units,n=>v.units=Math.round(n),target,perUnit);}
 amount(){try{return readVolumeAmount(this.compare.amountRaw,this.compare.unit);}catch{return null;}}
 clearTransfer(){this.compare.lastTransfer=null;this.compare.feedback='';}
 fillCompare(indices,full){
  if(this.anim||this.paused)return;const c=this.compare,amount=this.amount();if(!full&&amount===null)return;
  const from=c.items.map(x=>x.fill),targets=from.map((f,i)=>indices.includes(i)?Math.min(1,full?1:f+amount/volumeInfo(c.items[i].key,c.items[i].d).volume):f);
  if(targets.every((n,i)=>n===from[i]))return;this.clearTransfer();c.transfer=0;
  c.feedback=full?'Isi ditambah dari luar sehingga penuh.':'Isi ditambah dari luar, maksimum '+labFmt(amount)+' cm³ bagi setiap bekas pilihan. Isi berhenti pada kapasiti penuh.';
  this.start(()=>c.transfer,n=>{c.transfer=n;c.items.forEach((x,i)=>x.fill=from[i]+(targets[i]-from[i])*n);},1,full?UI_MOTION.compareFill:UI_MOTION.compareAdd);
 }
 transferCompare(from){
  const c=this.compare,amount=this.amount();if(c.count!==2||this.anim||this.paused||amount===null)return;
  const plan=transferPlan(c.items,from,amount,c.allowOverflow,c.spill);c.lastTransfer=plan;c.transfer=0;
  if(plan.moved===0){c.feedback='Tiada isi dipindahkan. Semak isi sumber dan ruang penerima.';return;}
  c.feedback='Pindahan '+(from?'B → A':'A → B')+': '+labFmt(plan.moved)+' cm³ keluar daripada sumber; '+labFmt(plan.accepted)+' cm³ diterima'+(plan.spilled?', '+labFmt(plan.spilled)+' cm³ melimpah.':'.');
  this.start(()=>c.transfer,n=>{c.transfer=n;const frame=transferFrame(plan,n);c.items=frame.items;c.spill=frame.spill;},1,UI_MOTION.pour,()=>this.announce(c.feedback));
 }
 retryActivity(){this.remember();this.stop();this.suspended.delete(this.kind);this.guided[this.kind].retry();this.touched.delete(this.kind);this.guideFeedback='Aktiviti baharu. Pencapaian terdahulu dikekalkan.';labEl('guided-prediction').value='';labEl('guided-explanation').value='';labEl('guided-answer').value='';if(this.kind==='net'){this.net.cells=NET_PRESETS.overlap.map(p=>[...p]);this.net.challenge=true;this.net.manualRepair=false;this.changedNet();}if(this.kind==='volume'){this.volume.units=0;this.resetPour();}if(this.kind==='area'){this.area.progress=0;this.clearArea();}if(this.kind==='composite')this.changedComp();}
 beginGuided(){if(!this.guidedSupported())return;this.suspended.delete(this.kind);const a=this.guided[this.kind],text=labEl('guided-prediction').value;if(!a.predict(text)){this.guideFeedback='Tulis ramalan terlebih dahulu.';return;}this.remember();this.stop();this.touched.delete(this.kind);labEl('guided-explanation').value='';labEl('guided-answer').value='';if(this.kind==='net'){this.net.cells=NET_PRESETS.overlap.map(p=>[...p]);this.changedNet();this.net.challenge=true;this.net.manualRepair=false;}if(this.kind==='volume'){this.volume.units=0;this.resetPour();}if(this.kind==='area'){this.area.progress=0;this.clearArea();}if(this.kind==='composite')this.changedComp();this.guideFeedback='Ramalan disimpan. Jalankan cabaran dan perhatikan hasilnya.';this.emitGuided();}
 emitGuided(){const record=this.guided[this.kind].record,key=JSON.stringify(record);if(this.lastProgressSent[this.kind]===key)return;this.lastProgressSent[this.kind]=key;this.onProgress({...record});}
 experimentReady(){if(!this.guidedSupported()||!this.touched.has(this.kind)||this.anim||this.paused)return false;if(this.kind==='net')return this.net.mode==='editor'&&this.net.progress===1&&cubeNetState(this.net.cells).valid&&(!this.net.challenge||this.net.manualRepair);if(this.kind==='volume')return this.volume.kind==='unit'?this.volume.units===this.unitCapacity():this.volume.pours===3;if(this.kind==='area')return this.area.progress===1&&this.area.selected.size===studySurfacePieces(this.area.shape,this.area.d).length;return this.comp.joined===1;}
 observeGuided(){const a=this.guided[this.kind];if(!a.observed&&a.draft.prediction&&this.experimentReady()){a.observe(labEl('lab-outcome').textContent+' '+(this.kind==='net'?cubeNetState(this.net.cells).message:this.kind==='volume'?(this.volume.kind==='unit'?labEl('unit-equation').textContent:labEl('pour-equation').textContent):this.kind==='area'?labEl('area-total').textContent:labEl('comp-equation').textContent));if(this.kind==='net')this.discoveries.add(JSON.stringify(this.net.cells));this.emitGuided();}}
 checkGuided(){const a=this.guided[this.kind];if(!this.guidedSupported()||!a.observed){this.guideFeedback='Lengkapkan eksperimen selepas menyimpan ramalan dahulu.';return;}const value=Number(labEl('guided-answer').value.replace(',','.'));let correct=false;if(this.kind==='net')correct=labEl('guided-term').value==='distinct'&&cubeNetState(this.net.cells).valid;
  if(this.kind==='volume')correct=labEl('guided-answer').value.trim()!==''&&value===(this.volume.kind==='unit'?this.unitCapacity():3);
  if(this.kind==='area')correct=labEl('guided-term').value===this.areaTerms()[0];
  if(this.kind==='composite'){const r=compositionMeasures(this.comp.kind,this.compDims());correct=value===2&&r.groups.every(g=>this.comp.selected.has(g.key)===g.external);}
  a.check(correct);this.guideFeedback=correct?'Tepat. Kini terangkan sebab pemerhatian dengan ayat sendiri.':this.kind==='composite'?'Tolak dua tapak, satu daripada setiap bongkah. Pilih semua permukaan luar sahaja.':this.kind==='area'?'Jejak permukaan 1 dan warnanya. Bezakan tinggi tegak t, tinggi sendeng s, dan luas tapak.':'Semak hubungan ukuran dan pemerhatian sebenar, kemudian cuba lagi.';if(correct)this.emitGuided();}
 completeGuided(){if(!this.guidedSupported())return;const a=this.guided[this.kind];if(a.complete(labEl('guided-explanation').value)){this.guideFeedback='Aktiviti selesai. Rekod ini ialah refleksi latihan kendiri.';this.emitGuided();}else this.guideFeedback='Perlu ramalan, eksperimen lengkap, semakan tepat dan penerangan yang tidak kosong.';}
 areaTerms(){const a=this.area;return a.shape==='cube'?Array(6).fill('a²'):a.shape==='cuboid'?['p × t','l × t','p × t','l × t','p × l','p × l']:a.shape==='pyramid'?['a²',...Array(4).fill('½as')]:a.shape==='cylinder'?['2πjt','πj²','πj²']:['πjs','πj²'];}
 renderGuided(){
  const a=this.guided[this.kind],names={prediction:'Ramalkan',experiment:'Cuba',check:'Semak',explanation:'Terangkan'};
  const prompts={net:'Cabaran: baiki susunan bertindih menjadi bentangan sah. Pindah/buang/tambah muka; lipat hingga penuh. Cuba susunan lain untuk menemui bentangan sah lain.',volume:this.volume.kind==='unit'?'Ramalkan kapasiti kuboid, kemudian penuhkan dengan kiub unit.':'Ramalkan bilangan tuangan penuh. Lakukan tiga pemindahan dengan isi semula sumber di antaranya.',area:'Ramalkan jumlah luas. Buka bentangan sepenuhnya dan pilih setiap permukaan berwarna. Hubungkan sebutan rumus dengan muka bernombor.',composite:'Ramalkan permukaan yang menjadi dalaman. Pisah untuk melihat kedua-dua tapak; cantum dan pilih hanya permukaan luar.'};
  const supported=this.guidedSupported();labEl('guided-scope').textContent=supported?'Latihan berpandu untuk mod ini. Rekod ialah refleksi kendiri, bukan gred TP.':this.kind==='net'?'Galeri dan studio kekal untuk penerokaan. Pilih Susun petak kubus untuk latihan pembaikan berpandu.':this.kind==='volume'?'Perbandingan A/B kekal untuk penerokaan. Pilih Kiub unit atau Tiga tuangan untuk latihan berpandu.':'Bentuk tambahan, bekas dan rongga kekal untuk penerokaan. Latihan berpandu meliputi lima bongkah tertutup asal.';
  for(const id of ['guided-prediction','guided-begin','lab-retry'])labEl(id).disabled=!supported;
  labEl('guided-challenge').textContent=prompts[this.kind]+(this.kind==='net'?' Susunan sah ditemui dalam sesi: '+this.discoveries.size+'.':'');
  labEl('guided-stage').textContent='Tahap semasa: '+names[a.checked?'explanation':a.observed?'check':a.draft.prediction?'experiment':'prediction']+(a.record.completed?' · Pencapaian disimpan':'');labEl('guided-observation').textContent=a.observed?'2. Diperhatikan: '+a.draft.result:'2. Cuba menggunakan kawalan makmal. Hasil direkod selepas eksperimen lengkap.';
  labEl('guided-check').disabled=!supported||!a.observed;labEl('guided-complete').disabled=!supported||!a.checked;labEl('guided-explanation').disabled=!supported||!a.checked;labEl('lab-undo').disabled=!this.histories[this.kind].size;
  const select=this.kind==='net'||this.kind==='area';labEl('guided-answer').hidden=select;labEl('guided-term').hidden=!select;labEl('guided-answer').disabled=!supported;labEl('guided-term').disabled=!supported;
  const options=this.kind==='net'?[['','Pilih sebab'],['distinct','Enam muka menutup enam arah berbeza tanpa bertindih'],['count','Asalkan ada enam petak, semua susunan sah'],['vertices','Bertemu pada bucu sahaja sudah mencukupi']]:[['','Pilih sebutan'],...['a²','p × t','l × t','p × l','½as','2πjt','πj²','πjs'].map(x=>[x,x])];
  const key=this.kind+(this.kind==='area'?this.area.shape:'');if(this.guideOptionsKey!==key){labEl('guided-term').replaceChildren(...options.map(([value,text])=>labNode('option',{value},text)));labEl('guided-term').value='';this.guideOptionsKey=key;}
  labEl('guided-question').textContent=this.kind==='net'?'3. Mengapa susunan yang dibaiki sah?':this.kind==='volume'?(this.volume.kind==='unit'?'3. Berapa kiub unit memenuhi kapasiti ini?':'3. Berapa tuangan sumber penuh mengisi penerima dengan tapak dan tinggi yang sama?'):this.kind==='area'?'3. Sebutan rumus manakah mewakili permukaan 1 ('+studySurfacePieces(this.area.shape,this.area.d)[0].name+')?':'3. Berapa permukaan tapak perlu ditolak daripada jumlah dua bongkah? Pilih juga permukaan luar di bawah.';
  labEl('guided-question').setAttribute('for',select?'guided-term':'guided-answer');labEl('guided-feedback').textContent=this.guideFeedback;
 }
 restoreProgress(records){for(const r of records)this.guided[r.activity]?.restore(r);if(this.active)this.render();}
 areaReady(){return this.area.mode==='closed'&&(MODEL_DATA[this.area.shape].noNet||this.area.progress===1)&&!this.anim&&!this.paused;}
 compReady(){return this.comp.joined===1&&!this.anim&&!this.paused;}
 renderGuide(){
  const k=this.kind,v=this.volume;let labels,index=0,next='';
  if(k==='net'){labels=[this.net.mode==='gallery'?'Pilih bentangan':this.net.mode==='studio'?'Pilih sambungan':'Susun 6 muka','Lipat perlahan','Periksa hasil'];index=this.net.progress===0?0:this.net.progress===1?2:1;next=this.net.mode==='studio'&&!this.studio.valid?'Baiki muka yang bertindih. Sorotan merah menunjukkan pertindihan dalam bentangan rata.':this.net.progress===0?'Tekan Lipat perlahan. Jejaki satu muka dahulu.':this.net.progress===1?'Periksa hasilnya. Tekan Buka rata untuk melihat bentangan semula.':'Perhatikan sambungan muka. Anda boleh Jeda atau gerakkan peluncur.';}
  if(k==='area'){
   if(this.area.mode!=='closed'){labels=['Pilih jenis model','Ubah ukuran','Pilih bahagian','Banding luas dan isi'];index=this.workshop.selected.size===this.workshop.measures().parts.length?3:2;next=this.area.mode==='cavity'?'Putar model untuk melihat dinding dalam. Pilih semua bahagian terdedah, termasuk dinding rongga.':'Buka atau tutup penutup. Bandingkan perubahan luas dengan kapasiti bekas.';}
   else{const round=MODEL_DATA[this.area.shape].noNet;labels=round?['Pilih ukuran','Pilih permukaan','Baca rumus']:['Pilih ukuran','Buka bentangan','Pilih permukaan','Baca rumus'];const count=studySurfacePieces(this.area.shape,this.area.d).length;index=round?(this.area.selected.size===count?2:1):this.area.progress<1?1:this.area.selected.size===count?3:2;next=!round&&index===1?'Buka bentangan dahulu. Tunggu sehingga rata, kemudian pilih permukaan.':this.area.selected.size===count?'Pilihan lengkap. Bandingkan jumlah bahagian dengan rumus keseluruhan.':round?'Permukaan sfera tidak mempunyai bentangan rata yang tepat. Pilih bahagian luas pada model melengkung.':'Pilih satu permukaan pada satu masa. Jumlah luas akan bertambah.';}
  }
  if(k==='composite'){labels=['Pilih ukuran','Cantum','Pilih muka luar','Semak'];index=this.comp.joined<1?1:this.comp.feedback?3:2;next=index===1?'Cantum bongkah dahulu. Tunggu sehingga kedua-duanya rapat.':index===2?'Pilih semua muka luar, kemudian tekan Semak pilihan.':'Baca maklum balas. Anda boleh ubah pilihan dan semak semula.';}
  if(k==='volume'&&v.kind==='unit'){labels=['Pilih ukuran','Susun lapisan','Bandingkan jumlah'];index=v.units===this.unitCapacity()?2:1;next=index===2?'Bekas penuh. Kira lapisan dan bandingkan dengan rumus.':'Tambah satu kiub, lengkapkan lapisan atau pilih Penuhkan beransur.';}
  if(k==='volume'&&v.kind==='compare'){labels=['Pilih 1 / 2 bongkah','Tetapkan jumlah isi','Tambah atau pindah','Semak jumlah'];index=this.compare.lastTransfer?3:this.compare.items.slice(0,this.compare.count).some(x=>x.fill>0)&&!this.anim?2:1;next=index===1?'Pilih jumlah dan unit. Tambah isi ke A, B atau kedua-duanya.':index===3?'Semak baki A + baki B + limpahan. Jumlah itu kekal sepanjang pindahan.':'Tandakan isi yang hendak dijumlahkan, atau buka Pindahkan isi A ↔ B.';}
  if(k==='volume'&&!['unit','compare'].includes(v.kind)){labels=['Isi sumber','Tuang satu bekas','Isi semula','Ulang hingga 3'];index=v.pours===3?3:!v.full?2:1;next=v.pours===3?'Penerima penuh. Bandingkan 3 isi sumber dengan 1 isi penerima.':!v.full?'Perhatikan paras penerima. Kemudian tekan Isi semula sumber.':'Tekan Tuang satu bekas. Tunggu satu tuangan selesai dahulu.';}
  if(this.paused)next='Gerakan dijeda. Tekan '+(k==='volume'&&!['unit','compare'].includes(v.kind)?'Sambung tuangan':'Sambung animasi')+' untuk meneruskan dari tempat yang sama.';
  const key=labels.join('|')+index;if(key!==this.guideKey){labEl('lab-steps').replaceChildren(...labels.map((label,i)=>labNode('li',{'aria-current':i===index?'step':'false',class:i<index?'step-done':''},label)));this.guideKey=key;}
  if(labEl('lab-next-step').textContent!==next)labEl('lab-next-step').textContent=next;
 }
 unitCapacity(){const d=this.volume.d;return d.p*d.l*d.t;}
 resetPour(){this.stop();Object.assign(this.volume,{pours:0,progress:0,full:true});}
 pourDims(){const v=this.volume;return v.kind==='cone'?{j:v.size,t:v.height}:{a:v.size,t:v.height};}
 clearArea(){this.area.selected.clear();this.area.focus=null;this.area.dirty=true;}
 compDims(){const c=this.comp;return c.kind==='roof'?{a:c.size,t:c.t}:{j:c.size,h:c.h,t:c.t};}
 changedComp(){this.comp.joined=0;this.comp.selected.clear();this.comp.dirty=true;this.comp.feedback='';}
 refreshPlayback(){
  labEl('lab-playback').hidden=false;labEl('lab-speed').value=String(this.speed);
  labEl('lab-next').disabled=!this.anim&&!this.paused&&(this.kind==='area'&&(this.area.mode!=='closed'||MODEL_DATA[this.area.shape].noNet)||this.kind==='net'&&labEl('net-fold').disabled||this.kind==='volume'&&this.volume.kind==='unit'&&this.volume.units===this.unitCapacity()||this.kind==='volume'&&this.volume.kind==='compare'&&labEl('compare-add-a').disabled||this.kind==='volume'&&!['unit','compare'].includes(this.volume.kind)&&labEl('pour-one').disabled||this.kind==='composite'&&labEl('comp-join').disabled);
   const slider=this.kind!=='volume'&&!(this.kind==='area'&&(this.area.mode!=='closed'||MODEL_DATA[this.area.shape].noNet)),pour=this.kind==='volume'&&!['unit','compare'].includes(this.volume.kind);labEl('lab-slider-wrap').hidden=!slider;labEl('lab-pause').disabled=!this.anim&&!this.paused;
  playbackButton(labEl('lab-pause'),this.paused?(pour?'Sambung tuangan':'Sambung animasi'):(pour?'Jeda tuangan':'Jeda animasi'),Boolean(this.anim));
  const progress=this.kind==='net'?this.net.progress:this.kind==='area'?this.area.progress:this.kind==='composite'?this.comp.joined:this.volume.kind==='compare'?this.compare.transfer:this.volume.progress,verb=this.kind==='net'?'dilipat':this.kind==='area'?'dibuka':'dicantum';
  labEl('lab-progress').value=String(Math.round(progress*1000));labEl('lab-progress-value').textContent=Math.round(progress*100)+'% '+verb;labEl('lab-progress').setAttribute('aria-valuetext',Math.round(progress*100)+' peratus '+verb);
  labEl('lab-progress-label').textContent=this.kind==='net'?'Bentangan rata → bongkah':this.kind==='area'?'Bongkah → bentangan rata':'Terpisah → bercantum';
  const status=this.paused?'Dijeda · sambung apabila bersedia':this.anim?'Sedang bergerak · boleh dijeda':'Sedia · bergerak selepas anda menekan butang';if(labEl('lab-motion-state').textContent!==status)labEl('lab-motion-state').textContent=status;
 }
 render(){
  if(!this.ready||!this.active)return;
  const k=this.kind;for(const kind of Object.keys(LAB_COPY)){labEl('lab-'+kind).setAttribute('aria-pressed',String(k===kind));labEl('lab-'+kind+'-panel').hidden=k!==kind;}
  labEl('lab-title').textContent=LAB_COPY[k][0];labEl('lab-intro').textContent=LAB_COPY[k][1];
  if(k==='net')this.renderNet();if(k==='volume')this.renderVolume();if(k==='area')this.renderArea();if(k==='composite')this.renderComposite();
  labEl('lab-zoom-level').textContent=Math.round(this.camera.zoom*100)+'%';labEl('lab-zoom-out').disabled=this.camera.zoom<=.6;labEl('lab-zoom-in').disabled=this.camera.zoom>=2;
  this.observeGuided();this.renderGuided();this.onDescribe(LAB_COPY[k][0]+'. '+labEl('guided-scope').textContent+' '+labEl('lab-caption').textContent);this.refreshPlayback();this.renderGuide();this.draw();
 }
 renderNet(){
  const n=this.net,gallery=n.mode==='gallery',studio=n.mode==='studio',data=PRESET_NETS.find(p=>p.key===n.preset),status=cubeNetState(n.cells),locked=n.progress>0||Boolean(this.anim);
  labEl('net-mode-gallery').setAttribute('aria-pressed',String(gallery));labEl('net-mode-editor').setAttribute('aria-pressed',String(n.mode==='editor'));labEl('net-mode-studio').setAttribute('aria-pressed',String(studio));labEl('net-preset-panel').hidden=!gallery;labEl('net-editor-panel').hidden=n.mode!=='editor';labEl('net-studio-mount').hidden=!studio;labEl('net-feedback').hidden=studio;
  labEl('net-preset').value=n.preset;labEl('net-preset').disabled=Boolean(this.anim);
  labEl('net-fold').disabled=(gallery?false:studio?!this.studio.state.treeValid:n.cells.length!==6||!status.connected)||n.progress===1;labEl('net-flat').disabled=n.progress===0;
  if(gallery){labEl('net-preset-tag').textContent=data.project?'Bongkah GeoDecoder':'Pengayaan · contoh tambahan';labEl('net-preset-summary').textContent=data.description;
   if(n.presetDirty){const mesh=presetNetMesh(n.preset,0),colors=new Map(mesh.map(f=>[f.id,f.color]));labEl('net-preset-faces').replaceChildren(...data.labels.map((name,id)=>{const b=labNode('button',{type:'button',class:'face-chip','aria-pressed':String(n.presetFace===id)},(id+1)+'. '+name),swatch=labNode('i',{'aria-hidden':'true',class:'preset-swatch'});swatch.style.backgroundColor=colors.get(id);b.append(swatch);b.addEventListener('click',()=>{n.presetFace=n.presetFace===id?null:id;n.presetFocusPending=id;n.presetDirty=true;this.render();});return b;}));if(n.presetFocusPending!==undefined){labEl('net-preset-faces').children[n.presetFocusPending]?.focus({preventScroll:true});delete n.presetFocusPending;}n.presetDirty=false;}
   labEl('net-feedback').textContent=this.paused?'Gerakan dijeda. Tekan Sambung animasi apabila bersedia.':this.anim?'Perhatikan muka yang sedang bergerak. Gunakan Jeda untuk memeriksa sambungannya.':n.progress===1?data.name+' telah terbentuk. Buka rata untuk menjejaki muka semula.':'Bentangan siap yang sah. Tekan Lipat perlahan untuk membentuk '+data.name.toLowerCase()+'.';labEl('net-feedback').dataset.success=n.progress===1?'true':'neutral';
  }else if(studio){this.studio.render({progress:n.progress,busy:Boolean(this.anim||this.paused)});labEl('net-feedback').textContent=this.studio.state.message;labEl('net-feedback').dataset.success=String(this.studio.valid);
  }else{if(n.dirty)this.buildNetGrid();for(const b of labEl('net-grid').children){b.disabled=locked;b.setAttribute('data-selected',String(b.dataset.cell===n.cells[n.selected]?.join(',')));}labEl('net-count').textContent=n.cells.length+' / 6 muka';for(const id of ['net-selected','net-left','net-right','net-up','net-down'])labEl(id).disabled=locked||n.cells.length===0;labEl('net-example').disabled=Boolean(this.anim);labEl('net-clear').disabled=Boolean(this.anim);
   labEl('net-feedback').textContent=n.notice||(n.progress===1?status.message:n.cells.length!==6||!status.connected?status.message:'Enam muka bersambung. Tekan Lipat perlahan untuk menyemak hasil.');labEl('net-feedback').dataset.success=n.progress===1?String(status.valid&&!n.notice):'neutral';
  }
  labEl('net-edit-note').textContent=!gallery&&locked?'Untuk mengubah petak, tekan Buka rata dahulu.':'Warna dan nombor menjejak muka yang sama sepanjang proses.';
  labEl('lab-scene-label').textContent=gallery?data.name.toUpperCase()+' · BENTANGAN SIAP':studio?this.studio.name.toUpperCase()+' · SAMBUNGAN SENDIRI':'KUBUS · SUSUNAN SENDIRI';labEl('lab-caption').textContent=gallery?data.description:studio?'Setiap muka berputar secara tegar pada rusuk sebenar. Ubah sambungan dan sisi bukaan ketika bentangan rata.':n.progress===0?'Setiap petak ialah satu muka kubus. Garis putus-putus, jika ada, menandakan potongan dalam pratonton.':n.progress===1?status.message:'Setiap muka bergerak pada sambungan sisi yang ditetapkan.';labEl('lab-outcome').textContent=gallery?data.labels.length+' muka / permukaan. Pilih label untuk menjejaknya.':studio?this.studio.state.message:'Ramalkan dahulu: adakah susunan ini menutup kubus tanpa pertindihan?';

  if(this.printDirty){
   this.printInput=gallery?{mesh:presetNetMesh(n.preset,0),title:data.name,valid:true,curved:['cylinder','cone'].includes(n.preset)}:studio?this.studio.getPrintInfo():{mesh:cubeNetMesh(n.cells,0),title:'Kubus · susunan sendiri',valid:status.valid,curved:false};
   this.printDirty=false;this.printAllowed=null;
  }
  const printAllowed=this.printInput.valid&&n.progress===0&&!this.anim&&!this.paused;
  if(printAllowed!==this.printAllowed){this.printAllowed=printAllowed;this.printer.render({...this.printInput,valid:printAllowed});}
 }
 renderCompare(){
  const c=this.compare,busy=Boolean(this.anim||this.paused),amount=this.amount(),valid=amount!==null,unit={cm3:'cm³',ml:'mL',l:'L'}[c.unit],amountLabel=valid?labFmt(readVolumeAmount(c.amountRaw,c.unit)/(c.unit==='l'?1000:1))+' '+unit:'jumlah pilihan';
  labEl('compare-count').value=String(c.count);labEl('compare-count').disabled=Boolean(this.anim);labEl('compare-card-b').hidden=c.count===1;labEl('compare-both-actions').hidden=c.count===1;labEl('compare-both-note').hidden=c.count===1;labEl('compare-include-b-label').hidden=c.count===1;labEl('compare-transfer-panel').hidden=c.count===1;
  labEl('compare-amount').value=c.amountRaw;labEl('compare-unit').value=c.unit;labEl('compare-amount').disabled=Boolean(this.anim);labEl('compare-unit').disabled=Boolean(this.anim);labEl('compare-amount').setAttribute('aria-invalid',String(!valid));labEl('compare-amount-error').textContent=valid?'':'Masukkan jumlah positif sehingga 1 000 000 cm³. Contoh: 5 atau 0,01 L.';
  labEl('compare-amount-preview').textContent=valid?amountLabel+' = '+labFmt(amount)+' cm³ · 1 mL = 1 cm³; 1 L = 1 000 cm³.':'';
  labEl('compare-both-note').textContent='Tambah '+amountLabel+' kepada setiap bekas, setakat ruang yang ada. Ini menambah isi dari luar.';
  c.items.forEach((item,i)=>{const letter=i?'b':'a',fields=volumeFields(item.key),info=volumeInfo(item.key,item.d);labEl('compare-shape-'+letter).value=item.key;labEl('compare-shape-'+letter).disabled=Boolean(this.anim);
   for(const key of ['a','p','l','t','j']){labEl('compare-field-'+letter+'-'+key).hidden=!fields.includes(key);labEl('compare-'+letter+'-'+key).value=String(item.d[key]||1);labEl('compare-'+letter+'-'+key).disabled=Boolean(this.anim);labEl('compare-'+letter+'-'+key+'-value').textContent=(item.d[key]||1)+' cm';}
   labEl('compare-dim-summary-'+letter).textContent=fields.map(k=>k+' = '+item.d[k]+' cm').join(' · ');labEl('compare-fill-'+letter).value=String(Math.round(item.fill*1000));labEl('compare-fill-'+letter).setAttribute('aria-valuetext',labFmt(item.fill*100)+' peratus isi padu; '+labFmt(info.volume*item.fill)+' cm³');labEl('compare-level-'+letter).textContent=labFmt(item.fill*100)+'% isi';labEl('compare-volume-'+letter).textContent='Isi '+letter.toUpperCase()+': '+labFmt(info.volume*item.fill)+' / '+labFmt(info.volume)+' cm³';labEl('compare-include-'+letter).checked=c.included[i];labEl('compare-add-'+letter).disabled=busy||!valid||item.fill===1;labEl('compare-full-'+letter).disabled=busy||item.fill===1;labEl('compare-add-'+letter).textContent='Tambah '+amountLabel+' ke '+letter.toUpperCase();
  });
  const full=c.items.slice(0,c.count).every(x=>x.fill===1);labEl('compare-add-both').disabled=busy||!valid||full;labEl('compare-full-both').disabled=busy||full;labEl('compare-add-both').textContent='Tambah '+amountLabel+' ke A dan B';
  labEl('compare-overflow').value=c.allowOverflow?'spill':'keep';labEl('compare-overflow').disabled=Boolean(this.anim);
  for(const [from,id] of [[0,'ab'],[1,'ba']])labEl('compare-transfer-'+id).disabled=busy||!valid||c.items[from].fill===0||(!c.allowOverflow&&c.items[1-from].fill===1);
  labEl('compare-transfer-feedback').textContent=c.feedback||'Pindahan mengambil isi yang sudah ada. Jika sumber tidak mencukupi, hanya isi yang tersedia dipindahkan.';
  labEl('compare-spill').textContent='Limpahan terkumpul: '+labFmt(c.spill)+' cm³. Kosongkan semua untuk memulakan rekod baharu.';
  const allVolume=comparisonTotal(c.items,[true,true],2);
  labEl('compare-ledger').textContent=c.lastTransfer?'Semasa pindahan: A + B + limpahan = '+labFmt(allVolume)+' + '+labFmt(c.spill)+' = '+labFmt(allVolume+c.spill)+' cm³. Sebelum pindahan: '+labFmt(c.lastTransfer.initialTotal)+' cm³.':'Semakan pemuliharaan isi akan dipaparkan selepas pindahan bermula.';
  const total=comparisonTotal(c.items,c.included,c.count),capacity=comparisonTotal(c.items.map(x=>({...x,fill:1})),c.included,c.count);labEl('compare-total').textContent='Jumlah isi dipilih '+(Number.isInteger(total)?'= ':'≈ ')+labFmt(total)+' cm³';labEl('compare-capacity').textContent='Kapasiti penuh bagi pilihan itu '+(Number.isInteger(capacity)?'= ':'≈ ')+labFmt(capacity)+' cm³.';labEl('compare-formulas').textContent=c.items.slice(0,c.count).map((x,i)=>(i?'B: ':'A: ')+volumeInfo(x.key,x.d).formula).join(' · ');
  labEl('lab-scene-label').textContent=c.count===1?'SATU BONGKAH · A':'DUA BONGKAH · A DI KIRI, B DI KANAN';labEl('lab-caption').textContent=c.lastTransfer?'Pindahan '+(c.lastTransfer.from?'B → A':'A → B')+'. Paras kedua-dua bekas berubah bersama. Semak baki dan limpahan dalam panel pindahan.':'Warna menunjukkan isi semasa; garisan luar menunjukkan saiz penuh. Bentuk dan ukuran boleh dipilih secara berasingan.';labEl('lab-outcome').textContent=c.items.slice(0,c.count).map((x,i)=>(i?'B':'A')+': '+labFmt(volumeInfo(x.key,x.d).volume*x.fill)+' cm³'+(c.included[i]?' · dikira':' · tidak dikira')).join(' | ')+'. Jumlah isi dipilih '+(Number.isInteger(total)?'= ':'≈ ')+labFmt(total)+' cm³.'+(c.spill?' Limpahan: '+labFmt(c.spill)+' cm³.':'');
 }
 renderVolume(){
  const v=this.volume,unit=v.kind==='unit',compare=v.kind==='compare',busy=Boolean(this.anim||this.paused);labEl('volume-kind').value=v.kind;labEl('unit-controls').hidden=!unit;labEl('compare-controls').hidden=!compare;labEl('pour-controls').hidden=unit||compare;if(compare){this.renderCompare();return;}
  labEl('lab-scene-label').textContent=unit?'KIUB UNIT · SETIAP KIUB = 1 cm³':'SUMBER DI KIRI → PENERIMA DI KANAN';
  if(unit){const {p,l,t}=v.d,total=this.unitCapacity(),layer=p*l;for(const key of ['p','l','t']){labEl('unit-'+key).disabled=Boolean(this.anim);labEl('unit-'+key).value=String(v.d[key]);labEl('unit-'+key+'-value').textContent=v.d[key]+' cm';}
   labEl('unit-one').disabled=busy||v.units===total;labEl('unit-layer').disabled=busy||v.units===total;labEl('unit-fill').disabled=busy||v.units===total;labEl('unit-empty').disabled=v.units===0;
   labEl('unit-result').textContent=`${v.units} / ${total} kiub · ${Math.floor(v.units/layer)} lapisan penuh daripada ${t}.`;
   labEl('unit-equation').textContent=`V = p × l × t = ${p} × ${l} × ${t} = ${total} cm³`;
   labEl('lab-caption').textContent=`Satu lapisan memuatkan ${p} × ${l} = ${layer} kiub. Warna membezakan lapisan. Garisan luar menunjukkan sempadan kuboid.`;
   labEl('lab-outcome').textContent=`Isi yang telah dimasukkan: ${v.units} cm³. Kapasiti penuh: ${total} cm³.`;
  }else{const cone=v.kind==='cone',d=this.pourDims(),p=pourState(v.kind,d,Math.min(2,v.pours),v.progress),fraction=v.pours===3?1:p.fraction;
   labEl('pour-explanation').textContent=(cone?'Kon dan silinder mempunyai tapak bulatan sama saiz.':'Piramid dan prisma mempunyai tapak segi empat sama sama saiz.')+' Kedua-dua bekas mempunyai tinggi tegak yang sama. Ramalkan bilangan tuangan untuk memenuhi penerima.';
   labEl('pour-size-label').textContent=cone?'j · jejari kedua-dua tapak':'a · sisi kedua-dua tapak';for(const [id,value] of [['pour-size',v.size],['pour-height',v.height]]){labEl(id).value=String(value);labEl(id+'-value').textContent=value+' cm';}
   labEl('pour-one').disabled=v.pours>=3||!v.full||v.progress>0||busy;labEl('pour-one').textContent='Tuang satu bekas';labEl('pour-refill').disabled=v.pours>=3||v.full||busy;labEl('pour-refill').textContent='Isi semula '+(cone?'kon':'piramid');
   labEl('pour-result').textContent=(v.progress>0?'Tuangan '+(v.pours+1)+' daripada 3 sedang '+(this.paused?'dijeda':'berlangsung')+'. ':v.pours+' / 3 tuangan lengkap. ')+'Penerima '+labFmt(fraction*100)+'% penuh.';
   labEl('pour-equation').textContent=`3 × ${cone?'V kon':'V piramid'} = ${cone?'V silinder':'V prisma'} ${Number.isInteger(p.capacity)?'=':'≈'} ${labFmt(p.capacity)} cm³`;
   labEl('lab-caption').textContent=`Kiri: ${cone?'kon':'piramid'}. Kanan: ${cone?'silinder':'prisma'}. Paras di kiri mengikut bentuk yang mengecil ke puncak; paras di kanan mengikut isi yang dipindahkan.`;
   labEl('lab-outcome').textContent=`Isi penerima: ${labFmt(p.capacity*fraction)} / ${labFmt(p.capacity)} cm³. `+(v.pours===3?'Tiga tuangan memenuhi penerima.':v.full?'Tekan Tuang satu bekas untuk memindahkan isi.':'Isi semula sumber untuk tuangan seterusnya.');
  }
 }
 renderArea(){
  const ready=this.areaReady();const a=this.area,advanced=a.mode!=='closed';labEl('area-mode').value=a.mode;labEl('area-closed-controls').hidden=advanced;labEl('surface-workshop-mount').hidden=!advanced;
  if(advanced){this.workshop.render();labEl('lab-scene-label').textContent=a.mode==='cavity'?'BONGKAH BERONGGA · DINDING DALAM DAN LUAR':'BEKAS · DENGAN ATAU TANPA PENUTUP';labEl('lab-caption').textContent=labEl('workshop-explanation').textContent;labEl('lab-outcome').textContent=labEl('workshop-area').textContent+'. '+labEl('workshop-volume').textContent+'.';return;}
  const parts=studySurfacePieces(a.shape,a.d),fields=MEASURE_FIELDS[a.shape];labEl('area-shape').value=a.shape;labEl('area-open').disabled=Boolean(MODEL_DATA[a.shape].noNet)||a.progress===1;labEl('area-close').disabled=Boolean(MODEL_DATA[a.shape].noNet)||a.progress===0;
  for(const key of ['a','p','l','t','j']){labEl('area-field-'+key).hidden=!fields.includes(key);labEl('area-'+key).value=String(a.d[key]||1);labEl('area-'+key+'-value').textContent=(a.d[key]||1)+' cm';}
  const measures=calculateMeasures(a.shape,a.d,'full');labEl('area-slant').textContent=measures.slant===null?'':'Tinggi sendeng s ≈ '+labFmt(measures.slant)+' cm, dikira daripada tinggi tegak dan '+(a.shape==='pyramid'?'separuh sisi tapak.':a.shape==='tetrahedron'?'apotem tapak segi tiga.':'jejari.');
  if(a.dirty){labEl('area-pieces').replaceChildren(...parts.map(p=>{const b=labNode('button',{type:'button',class:'area-piece','data-piece':p.id,'aria-pressed':String(a.selected.has(p.id))});const swatch=labNode('i',{'aria-hidden':'true'});swatch.style.backgroundColor=p.color;b.append(swatch,labNode('span',{},(p.id+1)+'. '+p.name+(this.guidedSupported()?' · '+this.areaTerms()[p.id]:'')),labNode('b',{},labFmt(p.area)+' cm²'));b.addEventListener('click',()=>{if(!this.areaReady())return;this.beginEdit();if(a.selected.has(p.id))a.selected.delete(p.id);else a.selected.add(p.id);a.focus=p.id;a.focusPending=true;a.dirty=true;this.render();});return b;}));if(a.focusPending){[...labEl('area-pieces').children].find(b=>Number(b.dataset.piece)===a.focus)?.focus({preventScroll:true});a.focusPending=false;}a.dirty=false;}
  for(const button of labEl('area-pieces').children)button.disabled=!ready;labEl('area-all').disabled=!ready;labEl('area-clear').disabled=a.selected.size===0;
  const chosen=parts.filter(p=>a.selected.has(p.id)),sum=chosen.reduce((s,p)=>s+p.area,0);labEl('area-count').textContent=`${chosen.length} / ${parts.length} permukaan dipilih`;
  labEl('area-sum').textContent=chosen.length?chosen.map(p=>labFmt(p.area)).join(' + ')+' cm²':'Pilih permukaan berwarna untuk mengumpulkan luasnya.';
  labEl('area-total').textContent='Jumlah dipilih '+(Number.isInteger(sum)?'= ':'≈ ')+labFmt(sum)+' cm²';labEl('area-formula').textContent=chosen.length===parts.length?'Rumus keseluruhan: '+LESSON_DATA[a.shape].surface.formula:'Rumus keseluruhan akan muncul selepas semua permukaan dipilih.';
  labEl('lab-scene-label').textContent=MODEL_DATA[a.shape].name.toUpperCase()+' · LUAS SETIAP PERMUKAAN';
  labEl('lab-caption').textContent=LESSON_DATA[a.shape].surface.why+(MODEL_DATA[a.shape].noNet?' Permukaan melengkung ini tidak mempunyai bentangan rata yang tepat.':'');
  labEl('lab-outcome').textContent=chosen.length===parts.length?'Semua permukaan telah dikira sekali. Jumlahnya ialah luas permukaan bongkah tertutup.':'Setiap permukaan mesti dikira tepat sekali, termasuk tapak.';
 }
 renderComposite(){
  const c=this.comp,r=compositionMeasures(c.kind,this.compDims()),roof=c.kind==='roof';labEl('comp-kind').value=c.kind;labEl('comp-size-label').textContent=roof?'a · sisi tapak bersama':'j · jejari tapak bersama';labEl('comp-body-field').hidden=roof;
  labEl('comp-join').disabled=c.joined===1&&!this.anim;labEl('comp-separate').disabled=c.joined===0&&!this.anim;
  for(const [id,value] of [['comp-size',c.size],['comp-body-height',c.h],['comp-roof-height',c.t]]){labEl(id).value=String(value);labEl(id+'-value').textContent=value+' cm';}
  if(c.dirty){labEl('comp-groups').replaceChildren(...r.groups.map(g=>{const b=labNode('button',{type:'button',class:'area-piece','data-group':g.key,'aria-pressed':String(c.selected.has(g.key))},g.label);b.addEventListener('click',()=>{if(!this.compReady())return;this.beginEdit();if(c.selected.has(g.key))c.selected.delete(g.key);else c.selected.add(g.key);c.dirty=true;c.focusPending=g.key;c.feedback='';this.render();});return b;}));if(c.focusPending){[...labEl('comp-groups').children].find(b=>b.dataset.group===c.focusPending)?.focus({preventScroll:true});c.focusPending=null;}c.dirty=false;}
  const ready=this.compReady();for(const button of labEl('comp-groups').children)button.disabled=!ready;labEl('comp-check').disabled=!ready;
  labEl('comp-feedback').textContent=c.feedback||'Pilih permukaan yang akan terdedah di luar selepas kedua-dua bongkah dicantum.';
  labEl('comp-feedback').setAttribute('data-success',c.feedback?String(c.feedback.startsWith('Tepat')):'');
  labEl('comp-area').textContent=c.joined===1?labFmt(r.area)+' cm²':'Cantum dahulu';labEl('comp-volume').textContent=labFmt(r.volume)+' cm³';
  labEl('comp-equation').textContent=`Langkah 1: ${labFmt(r.separateArea)} − ${labFmt(r.sharedArea)} = ${labFmt(r.separateArea-r.sharedArea)} cm². Langkah 2: ${labFmt(r.separateArea-r.sharedArea)} − ${labFmt(r.sharedArea)} = ${labFmt(r.area)} cm². Kedua-dua tapak dalaman ditolak. Tinggi sendeng bahagian atas s ≈ ${labFmt(r.slant)} cm.`;
  labEl('lab-scene-label').textContent=roof?'KUBUS + PIRAMID':'SILINDER + KON';labEl('lab-caption').textContent=c.joined===1?'Tapak bahagian atas menutup muka atas bahagian bawah. Kedua-duanya menjadi permukaan dalaman.':'Pisahkan untuk melihat kedua-dua tapak yang akan bertemu. Saiz tapaknya sentiasa sepadan.';
  labEl('lab-outcome').textContent='Isi padu gabungan ialah jumlah kedua-dua isi padu; luas luar mengecualikan kedua-dua muka yang bercantum.';
 }
 draw(){
  if(!this.ready||!this.active)return;const k=this.kind;let mesh,progress=0,labels=false,selected=null;
  if(k==='net'){progress=this.net.progress;mesh=this.net.mode==='gallery'?presetNetMesh(this.net.preset,progress):this.net.mode==='studio'?this.studio.mesh(progress):cubeNetMesh(this.net.cells,progress);labels=true;selected=this.net.mode==='gallery'?this.net.presetFace:null;}
  if(k==='volume'){const v=this.volume;progress=v.kind==='compare'?this.compare.transfer:v.kind==='unit'?v.units/this.unitCapacity():v.progress;mesh=v.kind==='compare'?volumeComparisonMesh(this.compare.items,this.compare.count):v.kind==='unit'?unitCubeMesh(v.d,v.units):pourMesh(v.kind,this.pourDims(),v.pours,v.progress,v.full);}
  if(k==='area'){const a=this.area;progress=a.progress;mesh=a.mode==='closed'?learningMesh(a.shape,progress,144,a.d):this.workshop.mesh();labels=a.mode==='closed';selected=a.mode==='closed'?[...a.selected]:this.workshop.selectedFaces();}
  if(k==='composite'){progress=this.comp.joined;mesh=compositionMesh(this.comp.kind,this.compDims(),progress);}
  let fitMesh=null;
  const advanced=k==='area'&&this.area.mode!=='closed',round=k==='area'&&MODEL_DATA[this.area.shape].noNet;
  if(k!=='volume'&&!advanced&&!round){
   const n=this.net,key=k+JSON.stringify(k==='net'?(n.mode==='gallery'?['gallery',n.preset]:n.mode==='studio'?['studio',this.studio.shape,this.studio.parents,this.studio.dimensions,this.studio.inside]:['editor',n.cells]):k==='area'?[this.area.shape,this.area.d]:[this.comp.kind,this.compDims()]);
   if(this.framing?.key!==key){
    const reference=[0,.25,.5,.75,1].flatMap(p=>k==='net'?(n.mode==='gallery'?presetNetMesh(n.preset,p):n.mode==='studio'?this.studio.mesh(p):cubeNetMesh(n.cells,p)):k==='area'?learningMesh(this.area.shape,p,64,this.area.d):compositionMesh(this.comp.kind,this.compDims(),p));
    this.framing={key,mesh:reference};
   }
   fitMesh=this.framing.mesh.length?this.framing.mesh:null;
  }
  this.renderer.draw({shape:'lab',mesh,fitMesh,progress,...this.camera,labels,selected});const canvas=labEl('labs-canvas');
  Object.assign(canvas.dataset,{lab:k,progress:String(progress),valid:String(this.net.mode==='studio'?this.studio.valid:cubeNetState(this.net.cells).valid),units:String(this.volume.units),pours:String(this.volume.pours),joined:String(this.comp.joined),yaw:String(this.camera.yaw),pitch:String(this.camera.pitch),zoom:String(this.camera.zoom),preset:this.net.mode==='gallery'?this.net.preset:this.net.mode,volumeMode:this.volume.kind,areaMode:this.area.mode,spill:String(this.compare.spill),fillA:String(this.compare.items[0].fill),fillB:String(this.compare.items[1].fill),totalVolume:String(comparisonTotal(this.compare.items,this.compare.included,this.compare.count))});
  canvas.setAttribute('aria-label',LAB_COPY[k][0]+'. '+labEl('lab-caption').textContent);
 }
}
