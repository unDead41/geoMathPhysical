import {GuidedActivity,LabHistory,LabMotion} from './guided.mjs';
import {ModelRenderer} from './renderer.mjs';
import {buildMesh,clamp01,ease,FACE_COLORS} from './geometry.mjs';
import {MODEL_DATA} from './content.mjs';
import {LESSON_DATA,MEASURE_FIELDS,calculateMeasures} from './lessons.mjs';
import {NET_PRESETS,cubeNetState,cubeNetMesh,labDimensions,surfacePieces,pourState,compositionMeasures,unitCubeMesh,pourMesh,compositionMesh} from './lab-geometry.mjs';
const labEl=id=>document.getElementById(id);
const labNumberFormat=new Intl.NumberFormat('ms-MY',{maximumFractionDigits:2,useGrouping:false});
const labFmt=n=>labNumberFormat.format(n);
function labNode(tag,attrs={},text=''){const n=document.createElement(tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text)n.textContent=text;return n;}
const LAB_COPY={net:['Bina bentangan sendiri','Susun enam segi empat sama, ramalkan hasilnya, kemudian lipat untuk menyemak. Muka kekal bersambung pada sisi yang dipilih.'],volume:['Makmal isi padu','Kira kiub unit atau pindahkan isi daripada kon/piramid ke bekas yang mempunyai luas tapak dan tinggi tegak yang sama.'],area:['Terbitkan rumus luas permukaan','Hubungkan setiap permukaan berwarna dengan luasnya. Jumlah bahagian yang dipilih akan membentuk rumus keseluruhan.'],composite:['Bongkah gabungan','Cantum dua bongkah pada tapak yang sama saiz. Tentukan permukaan yang terdedah dan tambah isi padunya.']};
export class LearningLabs{
 constructor({announce,prefersReduced,onProgress=()=>{},onActivity=()=>{},onDescribe=()=>{}}){
  this.onDescribe=onDescribe;this.onProgress=onProgress;this.onActivity=onActivity;this.guided=Object.fromEntries(['net','volume','area','composite'].map(k=>[k,new GuidedActivity(k)]));this.histories=Object.fromEntries(['net','volume','area','composite'].map(k=>[k,new LabHistory()]));this.touched=false;this.speed=1;this.guideFeedback='';this.lastProgressSent={};this.discoveries=new Set();this.announce=announce;this.prefersReduced=prefersReduced;this.ready=false;this.active=false;this.kind='net';this.raf=0;this.anim=null;this.paused=null;
  this.camera={yaw:.48,pitch:.3,zoom:1};this.net={cells:NET_PRESETS.cross.map(p=>[...p]),progress:0,selected:0,dirty:true,notice:'',drag:null,suppressUntil:0};
  this.volume={kind:'unit',units:0,d:{p:3,l:2,t:3},size:3,height:4,pours:0,progress:0,full:true};
  this.area={shape:'cube',d:{...LESSON_DATA.cube.defaults},progress:0,selected:new Set(),focus:null,dirty:true};
  this.comp={kind:'roof',size:6,h:6,t:4,joined:0,selected:new Set(),dirty:true,feedback:''};
 }
 bind(id,fn,type='click'){labEl(id).addEventListener(type,event=>{const edits=['net-example','net-clear','volume-kind','unit-p','unit-l','unit-t','unit-one','unit-layer','unit-fill','unit-empty','pour-size','pour-height','pour-reset','pour-refill','area-shape','area-a','area-p','area-l','area-t','area-j','area-all','area-clear','comp-kind','comp-size','comp-body-height','comp-roof-height','lab-progress'];if(edits.includes(id)){const inputValue=labEl(id).value;this.remember();this.editExperiment();if(id==='lab-progress')labEl(id).value=inputValue;}fn(event);this.render();});}
 init(){
  if(this.ready)return;this.ready=true;this.renderer=new ModelRenderer(labEl('labs-canvas'));
  for(const kind of Object.keys(LAB_COPY))this.bind('lab-'+kind,()=>this.choose(kind));
  this.bind('net-example',()=>{const preset=NET_PRESETS[labEl('net-example').value];if(preset){this.net.cells=preset.map(p=>[...p]);this.net.manualRepair=false;this.changedNet();}},'change');
  this.bind('net-clear',()=>{this.net.cells=[];this.changedNet();});this.bind('net-selected',()=>{this.net.selected=Number(labEl('net-selected').value);},'change');
  for(const [id,dx,dy] of [['net-left',-1,0],['net-right',1,0],['net-up',0,-1],['net-down',0,1]])this.bind(id,()=>{const p=this.net.cells[this.net.selected];if(p)this.moveNet(this.net.selected,[p[0]+dx,p[1]+dy]);});
  this.bind('net-fold',()=>this.start(()=>this.net.progress,v=>this.net.progress=v,1,4000));
  this.bind('net-flat',()=>this.start(()=>this.net.progress,v=>this.net.progress=v,0,4000));
  this.bind('volume-kind',()=>{this.stop();this.volume.kind=labEl('volume-kind').value;this.volume.size=this.volume.kind==='pyramid'?6:3;this.resetPour();},'change');
  for(const key of ['p','l','t'])this.bind('unit-'+key,()=>{this.volume.d[key]=Number(labEl('unit-'+key).value);this.volume.units=0;},'input');
  this.bind('unit-one',()=>this.volume.units=Math.min(this.unitCapacity(),this.volume.units+1));
  this.bind('unit-layer',()=>this.volume.units=Math.min(this.unitCapacity(),this.volume.units+this.volume.d.p*this.volume.d.l));
  this.bind('unit-fill',()=>this.volume.units=this.unitCapacity());this.bind('unit-empty',()=>this.volume.units=0);
  this.bind('pour-size',()=>{this.volume.size=Number(labEl('pour-size').value);this.resetPour();},'input');
  this.bind('pour-height',()=>{this.volume.height=Number(labEl('pour-height').value);this.resetPour();},'input');
  this.bind('pour-reset',()=>this.resetPour());this.bind('pour-refill',()=>{this.volume.full=true;this.volume.progress=0;});
  this.bind('pour-one',()=>{const v=this.volume;if(v.pours>=3||!v.full)return;this.start(()=>v.progress,n=>v.progress=n,1,2600,()=>{v.pours++;v.progress=0;v.full=false;this.announce('Tuangan '+v.pours+' selesai.');});});
  this.bind('area-shape',()=>{this.stop();this.area.shape=labEl('area-shape').value;this.area.d={...LESSON_DATA[this.area.shape].defaults};this.area.progress=0;this.clearArea();},'change');
  for(const key of ['a','p','l','t','j'])this.bind('area-'+key,()=>{this.stop();this.area.d[key]=Number(labEl('area-'+key).value);this.clearArea();},'input');
  this.bind('area-open',()=>this.start(()=>this.area.progress,v=>this.area.progress=v,1,4000));
  this.bind('area-close',()=>this.start(()=>this.area.progress,v=>this.area.progress=v,0,4000));
  this.bind('area-all',()=>{this.area.selected=new Set(surfacePieces(this.area.shape,this.area.d).map(p=>p.id));this.area.dirty=true;});
  this.bind('area-clear',()=>this.clearArea());
  this.bind('comp-kind',()=>{this.stop();this.comp.kind=labEl('comp-kind').value;this.comp.size=this.comp.kind==='roof'?6:3;this.changedComp();},'change');
  for(const [id,key] of [['comp-size','size'],['comp-body-height','h'],['comp-roof-height','t']])this.bind(id,()=>{this.stop();this.comp[key]=Number(labEl(id).value);this.changedComp();},'input');
  this.bind('comp-join',()=>this.start(()=>this.comp.joined,v=>this.comp.joined=v,1,1600));
  this.bind('comp-separate',()=>this.start(()=>this.comp.joined,v=>this.comp.joined=v,0,1600));
  this.bind('comp-check',()=>{const c=this.comp,r=compositionMeasures(c.kind,this.compDims());if(c.joined<1){c.feedback='Cantum bongkah dahulu, kemudian semak permukaan luar.';return;}
   const correct=r.groups.every(g=>c.selected.has(g.key)===g.external);c.feedback=correct?'Tepat! Kedua-dua permukaan yang bercantum berada di dalam. Jumlahkan permukaan yang terdedah sahaja.':'Semak semula. Pilih semua permukaan luar; dua permukaan yang bercantum tidak dikira. Pisahkan bongkah untuk melihatnya.';this.announce(c.feedback);
  });
  this.bind('lab-progress',()=>{const n=Number(labEl('lab-progress').value)/1000;this.stop();if(this.kind==='net')this.net.progress=n;if(this.kind==='area')this.area.progress=n;if(this.kind==='composite')this.comp.joined=n;},'input');
  this.bind('lab-pause',()=>{if(this.anim){this.paused=this.anim;this.stop(false);}else if(this.paused){this.anim=this.paused;this.paused=null;this.scheduleMotion();}});
  this.bind('lab-speed',()=>{this.speed=labEl('lab-speed').value==='0.5'?.5:1;},'change');
  this.bind('lab-next',()=>this.nextStep());
  this.bind('guided-begin',()=>this.beginGuided());this.bind('guided-check',()=>this.checkGuided());this.bind('guided-complete',()=>this.completeGuided());
  this.bind('guided-prediction',()=>{const a=this.guided[this.kind];if(a.draft.prediction&&labEl('guided-prediction').value.trim()!==a.draft.prediction){a.retry();this.guideFeedback='Ramalan berubah. Simpan ramalan baharu sebelum eksperimen.';}},'input');
  for(const [id,type] of [['guided-answer','input'],['guided-term','change']])this.bind(id,()=>{const a=this.guided[this.kind];a.invalidateCheck();this.guideFeedback='Jawapan berubah. Semak semula sebelum menyimpan penerangan.';},type);
  this.bind('lab-undo',()=>this.undo());this.bind('lab-retry',()=>this.retryActivity());
  for(const [id,key,amount] of [['lab-left','yaw',-.2],['lab-right','yaw',.2],['lab-up','pitch',.15],['lab-down','pitch',-.15],['lab-zoom-out','zoom',-.15],['lab-zoom-in','zoom',.15]])this.bind(id,()=>{this.camera[key]+=amount;this.boundCamera();});
  this.bind('lab-reset-camera',()=>this.camera={yaw:.48,pitch:.3,zoom:1});
  const canvas=labEl('labs-canvas');let pointer=null;
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;this.camera.yaw+=(e.clientX-pointer.x)*.009;this.camera.pitch+=(e.clientY-pointer.y)*.009;pointer.x=e.clientX;pointer.y=e.clientY;this.boundCamera();this.draw();});
  const release=e=>{if(pointer?.id===e.pointerId){pointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}};
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',()=>pointer=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.camera.zoom+=e.deltaY<0?.08:-.08;this.boundCamera();this.render();},{passive:false});
  canvas.addEventListener('keydown',e=>{if(e.isComposing)return;const controls={ArrowLeft:'lab-left',ArrowRight:'lab-right',ArrowUp:'lab-up',ArrowDown:'lab-down','+':'lab-zoom-in','=':'lab-zoom-in','-':'lab-zoom-out',Home:'lab-reset-camera'};if(controls[e.key]){e.preventDefault();labEl(controls[e.key]).click();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});
  if(typeof ResizeObserver!=='undefined'){this.resize=new ResizeObserver(()=>{if(this.active)this.draw();});this.resize.observe(canvas);}
 }
 open(){this.init();this.active=true;this.render();}
 close(){this.active=false;this.stop();this.net.drag=null;labEl('net-drag-ghost').hidden=true;}
 stop(clear=true){if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;this.anim=null;if(clear)this.paused=null;if(this.ready)this.refreshPlayback();}
 revealStage(){const canvas=labEl('labs-canvas');canvas.focus({preventScroll:true});canvas.scrollIntoView({behavior:this.prefersReduced()?'instant':'smooth',block:'center'});}
 start(get,set,to,duration,done=null){
  this.remember();this.editExperiment();this.stop();this.revealStage();this.anim=new LabMotion(get,set,to,duration,done);
  this.scheduleMotion();this.refreshPlayback();
 }
 scheduleMotion(){
  this.motionTime=performance.now();
  const tick=time=>{this.raf=0;if(!this.active||document.hidden){this.stop();return;}const a=this.anim;if(!a)return;const dt=Math.max(0,time-this.motionTime);this.motionTime=time;a.advance(dt,this.speed);if(a.finished&&this.anim===a)this.anim=null;this.render();if(this.anim)this.raf=requestAnimationFrame(tick);};
  this.raf=requestAnimationFrame(tick);
 }
 nextStep(){
  if(!this.anim&&!this.paused){
   if(this.kind==='volume'&&this.volume.kind==='unit'){this.remember();this.editExperiment();this.volume.units=Math.min(this.unitCapacity(),this.volume.units+1);return;}
   const id=this.kind==='net'?'net-fold':this.kind==='area'?'area-open':this.kind==='composite'?'comp-join':'pour-one';
   if(labEl(id).disabled)return;labEl(id).click();
  }
  const a=this.anim||this.paused;if(!a)return;this.stop(false);this.paused=a;a.advance(a.duration/10);if(a.finished)this.paused=null;
 }
 snapshot(){const k=this.kind,v=k==='net'?this.net:k==='volume'?this.volume:k==='area'?this.area:this.comp;const copy={...v};for(const key of ['drag','focusCell','suppressUntil','focusPending'])delete copy[key];if(v.selected instanceof Set)copy.selected=[...v.selected];return JSON.parse(JSON.stringify(copy));}
 remember(){this.histories[this.kind].push(this.snapshot());}
 editExperiment(){this.stop();this.guided[this.kind].edit();this.touched=true;this.guideFeedback='';}
 undo(){const v=this.histories[this.kind].undo();if(!v)return;this.editExperiment();if(this.kind==='net'){Object.assign(this.net,v,{dirty:true,drag:null});}if(this.kind==='volume')Object.assign(this.volume,v);if(this.kind==='area')Object.assign(this.area,v,{selected:new Set(v.selected),dirty:true});if(this.kind==='composite')Object.assign(this.comp,v,{selected:new Set(v.selected),dirty:true});this.announce('Edit terakhir diundur. Semak eksperimen semula.');}
 retryActivity(){this.stop();this.guided[this.kind].retry();this.touched=false;this.guideFeedback='Aktiviti baharu. Pencapaian terdahulu dikekalkan.';labEl('guided-prediction').value='';labEl('guided-explanation').value='';labEl('guided-answer').value='';if(this.kind==='net'){this.net.cells=NET_PRESETS.overlap.map(p=>[...p]);this.changedNet();}if(this.kind==='volume'){this.volume.units=0;this.resetPour();}if(this.kind==='area'){this.area.progress=0;this.clearArea();}if(this.kind==='composite')this.changedComp();}
 beginGuided(){const a=this.guided[this.kind],text=labEl('guided-prediction').value;if(!a.predict(text)){this.guideFeedback='Tulis ramalan terlebih dahulu.';return;}this.remember();this.stop();this.touched=false;labEl('guided-explanation').value='';labEl('guided-answer').value='';if(this.kind==='net'){this.net.cells=NET_PRESETS.overlap.map(p=>[...p]);this.changedNet();this.net.challenge=true;this.net.manualRepair=false;}if(this.kind==='volume'){this.volume.units=0;this.resetPour();}if(this.kind==='area'){this.area.progress=0;this.clearArea();}if(this.kind==='composite')this.changedComp();this.guideFeedback='Ramalan disimpan. Jalankan cabaran dan perhatikan hasilnya.';this.emitGuided();}
 emitGuided(){const record=this.guided[this.kind].record,key=JSON.stringify(record);if(this.lastProgressSent[this.kind]===key)return;this.lastProgressSent[this.kind]=key;this.onProgress({...record});}
 experimentReady(){if(!this.touched)return false;if(this.kind==='net')return this.net.progress===1&&cubeNetState(this.net.cells).valid&&(!this.net.challenge||this.net.manualRepair);if(this.kind==='volume')return this.volume.kind==='unit'?this.volume.units===this.unitCapacity():this.volume.pours===3;if(this.kind==='area')return this.area.progress===1&&this.area.selected.size===surfacePieces(this.area.shape,this.area.d).length;return this.comp.joined===1;}
 observeGuided(){const a=this.guided[this.kind];if(!a.observed&&a.draft.prediction&&this.experimentReady()){a.observe(labEl('lab-outcome').textContent+' '+(this.kind==='net'?cubeNetState(this.net.cells).message:this.kind==='volume'?(this.volume.kind==='unit'?labEl('unit-equation').textContent:labEl('pour-equation').textContent):this.kind==='area'?labEl('area-total').textContent:labEl('comp-equation').textContent));if(this.kind==='net')this.discoveries.add(JSON.stringify(this.net.cells));this.emitGuided();}}
 checkGuided(){const a=this.guided[this.kind];if(!a.observed){this.guideFeedback='Lengkapkan eksperimen selepas menyimpan ramalan dahulu.';return;}const value=Number(labEl('guided-answer').value.replace(',','.'));let correct=false;if(this.kind==='net')correct=labEl('guided-term').value==='distinct'&&cubeNetState(this.net.cells).valid;
  if(this.kind==='volume')correct=labEl('guided-answer').value.trim()!==''&&value===(this.volume.kind==='unit'?this.unitCapacity():3);
  if(this.kind==='area')correct=labEl('guided-term').value===this.areaTerms()[0];
  if(this.kind==='composite'){const r=compositionMeasures(this.comp.kind,this.compDims());correct=value===2&&r.groups.every(g=>this.comp.selected.has(g.key)===g.external);}
  a.check(correct);this.guideFeedback=correct?'Tepat. Kini terangkan sebab pemerhatian dengan ayat sendiri.':this.kind==='composite'?'Tolak dua tapak, satu daripada setiap bongkah. Pilih semua permukaan luar sahaja.':this.kind==='area'?'Jejak permukaan 1 dan warnanya. Bezakan tinggi tegak t, tinggi sendeng s, dan luas tapak.':'Semak hubungan ukuran dan pemerhatian sebenar, kemudian cuba lagi.';if(correct)this.emitGuided();}
 completeGuided(){const a=this.guided[this.kind];if(a.complete(labEl('guided-explanation').value)){this.guideFeedback='Aktiviti selesai. Rekod ini ialah refleksi latihan kendiri.';this.emitGuided();}else this.guideFeedback='Perlu ramalan, eksperimen lengkap, semakan tepat dan penerangan yang tidak kosong.';}
 areaTerms(){const a=this.area;return a.shape==='cube'?Array(6).fill('a²'):a.shape==='cuboid'?['p × t','l × t','p × t','l × t','p × l','p × l']:a.shape==='pyramid'?['a²',...Array(4).fill('½as')]:a.shape==='cylinder'?['2πjt','πj²','πj²']:['πjs','πj²'];}
 renderGuided(){
  const a=this.guided[this.kind],names={prediction:'Ramalkan',experiment:'Cuba',check:'Semak',explanation:'Terangkan'};
  const prompts={net:'Cabaran: baiki susunan bertindih menjadi bentangan sah. Pindah/buang/tambah muka; lipat hingga penuh. Cuba susunan lain untuk menemui bentangan sah lain.',volume:this.volume.kind==='unit'?'Ramalkan kapasiti kuboid, kemudian penuhkan dengan kiub unit.':'Ramalkan bilangan tuangan penuh. Lakukan tiga pemindahan dengan isi semula sumber di antaranya.',area:'Ramalkan jumlah luas. Buka bentangan sepenuhnya dan pilih setiap permukaan berwarna. Hubungkan sebutan rumus dengan muka bernombor.',composite:'Ramalkan permukaan yang menjadi dalaman. Pisah untuk melihat kedua-dua tapak; cantum dan pilih hanya permukaan luar.'};
  labEl('guided-challenge').textContent=prompts[this.kind]+(this.kind==='net'?' Susunan sah ditemui dalam sesi: '+this.discoveries.size+'.':'');
  labEl('guided-stage').textContent='Tahap semasa: '+names[a.checked?'explanation':a.observed?'check':a.draft.prediction?'experiment':'prediction']+(a.record.completed?' · Pencapaian disimpan':'');labEl('guided-observation').textContent=a.observed?'2. Diperhatikan: '+a.draft.result:'2. Cuba menggunakan kawalan makmal. Hasil direkod selepas eksperimen lengkap.';
  labEl('guided-check').disabled=!a.observed;labEl('guided-complete').disabled=!a.checked;labEl('guided-explanation').disabled=!a.checked;labEl('lab-undo').disabled=!this.histories[this.kind].size;
  const select=this.kind==='net'||this.kind==='area';labEl('guided-answer').hidden=select;labEl('guided-term').hidden=!select;
  const options=this.kind==='net'?[['','Pilih sebab'],['distinct','Enam muka menutup enam arah berbeza tanpa bertindih'],['count','Asalkan ada enam petak, semua susunan sah'],['vertices','Bertemu pada bucu sahaja sudah mencukupi']]:[['','Pilih sebutan'],...['a²','p × t','l × t','p × l','½as','2πjt','πj²','πjs'].map(x=>[x,x])];
  const key=this.kind+(this.kind==='area'?this.area.shape:'');if(this.guideOptionsKey!==key){labEl('guided-term').replaceChildren(...options.map(([value,text])=>labNode('option',{value},text)));labEl('guided-term').value='';this.guideOptionsKey=key;}
  labEl('guided-question').textContent=this.kind==='net'?'3. Mengapa susunan yang dibaiki sah?':this.kind==='volume'?(this.volume.kind==='unit'?'3. Berapa kiub unit memenuhi kapasiti ini?':'3. Berapa tuangan sumber penuh mengisi penerima dengan tapak dan tinggi yang sama?'):this.kind==='area'?'3. Sebutan rumus manakah mewakili permukaan 1 ('+surfacePieces(this.area.shape,this.area.d)[0].name+')?':'3. Berapa permukaan tapak perlu ditolak daripada jumlah dua bongkah? Pilih juga permukaan luar di bawah.';
  labEl('guided-question').setAttribute('for',select?'guided-term':'guided-answer');labEl('guided-feedback').textContent=this.guideFeedback;
 }
 restoreProgress(records){for(const r of records)this.guided[r.activity]?.restore(r);if(this.active)this.render();}
 choose(kind){if(!LAB_COPY[kind])return;this.stop();this.onActivity();this.kind=kind;this.guideOptionsKey=null;this.guideFeedback='';this.touched=false;labEl('guided-prediction').value=this.guided[kind].draft.prediction;labEl('guided-explanation').value=this.guided[kind].draft.explanation;labEl('guided-answer').value='';this.camera={yaw:.48,pitch:.3,zoom:1};this.announce(LAB_COPY[kind][0]+' dipilih.');}
 boundCamera(){this.camera.pitch=Math.max(-1.5,Math.min(1.5,this.camera.pitch));this.camera.zoom=Math.max(.6,Math.min(2,this.camera.zoom));}
 changedNet(){this.stop();this.net.progress=0;this.net.notice='';this.net.selected=Math.max(0,Math.min(this.net.selected,this.net.cells.length-1));this.net.dirty=true;}
 moveNet(id,target){const n=this.net;if(target.some(v=>v<0||v>5)||n.cells.some((p,i)=>i!==id&&p[0]===target[0]&&p[1]===target[1])){n.notice='Pilih petak kosong dalam grid untuk memindahkan muka.';return;}this.remember();this.editExperiment();n.cells[id]=target;n.manualRepair=true;this.changedNet();}
 buildNetGrid(){
  const n=this.net;labEl('net-grid').replaceChildren(...Array.from({length:36},(_,i)=>{
   const x=i%6,y=Math.floor(i/6),id=n.cells.findIndex(p=>p[0]===x&&p[1]===y),b=labNode('button',{type:'button',class:'net-cell','data-cell':x+','+y,'aria-pressed':String(id>=0),'aria-label':`Baris ${y+1}, lajur ${x+1}`+(id>=0?`, muka ${id+1}`:', petak kosong')},id>=0?String(id+1):'');if(id>=0)b.style.backgroundColor=FACE_COLORS[id];
   b.addEventListener('click',()=>{if(performance.now()<n.suppressUntil)return;if(id>=0){this.remember();this.editExperiment();n.cells.splice(id,1);n.manualRepair=true;}else if(n.cells.length<6){this.remember();this.editExperiment();n.cells.push([x,y]);n.manualRepair=true;}else{n.notice='Sudah ada 6 muka. Buang atau pindahkan satu muka dahulu.';this.render();return;}this.changedNet();n.focusCell=x+','+y;this.render();});
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
  labEl('lab-playback').hidden=false;
  const slider=this.kind!=='volume';labEl('lab-slider-wrap').hidden=!slider;labEl('lab-pause').disabled=!this.anim&&!this.paused;labEl('lab-pause').textContent=this.paused?'Sambung animasi':'Jeda animasi';
  const progress=this.kind==='net'?this.net.progress:this.kind==='area'?this.area.progress:this.kind==='composite'?this.comp.joined:this.volume.progress;
  labEl('lab-progress').value=String(Math.round(progress*1000));labEl('lab-progress-value').textContent=Math.round(progress*100)+'%';
  labEl('lab-progress-label').textContent=this.kind==='net'?'Rata → dilipat':this.kind==='area'?'Bongkah → bentangan':'Terpisah → bercantum';
 }
 render(){
  if(!this.ready||!this.active)return;
  const k=this.kind;for(const kind of Object.keys(LAB_COPY)){labEl('lab-'+kind).setAttribute('aria-pressed',String(k===kind));labEl('lab-'+kind+'-panel').hidden=k!==kind;}
  labEl('lab-title').textContent=LAB_COPY[k][0];labEl('lab-intro').textContent=LAB_COPY[k][1];
  if(k==='net')this.renderNet();if(k==='volume')this.renderVolume();if(k==='area')this.renderArea();if(k==='composite')this.renderComposite();
  this.observeGuided();this.renderGuided();this.onDescribe(LAB_COPY[k][0]+'. '+labEl('guided-challenge').textContent+' '+labEl('lab-caption').textContent);labEl('lab-zoom-level').textContent=Math.round(this.camera.zoom*100)+'%';this.refreshPlayback();this.draw();
 }
 renderNet(){
  const n=this.net,s=cubeNetState(n.cells);if(n.dirty)this.buildNetGrid();labEl('net-count').textContent=n.cells.length+' / 6 muka';labEl('net-fold').disabled=n.cells.length!==6||!s.connected;labEl('net-flat').disabled=n.progress===0;
  for(const id of ['net-selected','net-left','net-right','net-up','net-down'])labEl(id).disabled=n.cells.length===0;
  for(const b of labEl('net-grid').children){const id=n.cells.findIndex(p=>p.join(',')===b.dataset.cell);b.setAttribute('data-overlap',String(s.overlaps.flat().includes(id)));}labEl('net-feedback').textContent=n.notice||s.message;labEl('net-feedback').dataset.success=String(s.valid&&!n.notice);
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
   labEl('pour-one').disabled=v.pours>=3||!v.full||Boolean(this.anim);labEl('pour-one').textContent=v.progress>0?'Sambung tuangan':'Tuang sekali';labEl('pour-refill').disabled=v.pours>=3||v.full||Boolean(this.anim);
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
  if(a.dirty){labEl('area-pieces').replaceChildren(...parts.map(p=>{const b=labNode('button',{type:'button',class:'area-piece','data-piece':p.id,'aria-pressed':String(a.selected.has(p.id))});const swatch=labNode('i',{'aria-hidden':'true'});swatch.style.backgroundColor=p.color;b.append(swatch,labNode('span',{},(p.id+1)+'. '+p.name+' · '+this.areaTerms()[p.id]),labNode('b',{},labFmt(p.area)+' cm²'));b.addEventListener('click',()=>{this.remember();this.editExperiment();if(a.selected.has(p.id))a.selected.delete(p.id);else a.selected.add(p.id);a.focus=p.id;a.focusPending=true;a.dirty=true;this.render();});return b;}));if(a.focusPending){[...labEl('area-pieces').children].find(b=>Number(b.dataset.piece)===a.focus)?.focus({preventScroll:true});a.focusPending=false;}a.dirty=false;}
  const chosen=parts.filter(p=>a.selected.has(p.id)),sum=chosen.reduce((s,p)=>s+p.area,0);labEl('area-count').textContent=`${chosen.length} / ${parts.length} permukaan dipilih`;
  labEl('area-sum').textContent=chosen.length?chosen.map(p=>labFmt(p.area)).join(' + ')+' cm²':'Pilih permukaan berwarna untuk mengumpulkan luasnya.';
  labEl('area-total').textContent='Jumlah dipilih '+(Number.isInteger(sum)?'= ':'≈ ')+labFmt(sum)+' cm²';labEl('area-formula').textContent=chosen.length===parts.length?'Rumus keseluruhan: '+LESSON_DATA[a.shape].surface.formula:'Rumus keseluruhan akan muncul selepas semua permukaan dipilih.';
  labEl('lab-scene-label').textContent=MODEL_DATA[a.shape].name.toUpperCase()+' · LUAS SETIAP PERMUKAAN';
  labEl('lab-caption').textContent=LESSON_DATA[a.shape].surface.why;
  labEl('lab-outcome').textContent=chosen.length===parts.length?'Semua permukaan telah dikira sekali. Jumlahnya ialah luas permukaan bongkah tertutup.':'Setiap permukaan mesti dikira tepat sekali, termasuk tapak.';
 }
 renderComposite(){
  const c=this.comp,r=compositionMeasures(c.kind,this.compDims()),roof=c.kind==='roof';labEl('comp-kind').value=c.kind;labEl('comp-size-label').textContent=roof?'a · sisi tapak bersama':'j · jejari tapak bersama';labEl('comp-body-field').hidden=roof;
  for(const [id,value] of [['comp-size',c.size],['comp-body-height',c.h],['comp-roof-height',c.t]]){labEl(id).value=String(value);labEl(id+'-value').textContent=value+' cm';}
  if(c.dirty){labEl('comp-groups').replaceChildren(...r.groups.map(g=>{const b=labNode('button',{type:'button',class:'area-piece','data-group':g.key,'aria-pressed':String(c.selected.has(g.key))},g.label+' · '+labFmt(g.area)+' cm²'+(!g.external?' · DALAMAN (tapak bercantum)':''));b.addEventListener('click',()=>{this.remember();this.editExperiment();if(c.selected.has(g.key))c.selected.delete(g.key);else c.selected.add(g.key);c.dirty=true;c.focusPending=g.key;c.feedback='';this.render();});return b;}));if(c.focusPending){[...labEl('comp-groups').children].find(b=>b.dataset.group===c.focusPending)?.focus({preventScroll:true});c.focusPending=null;}c.dirty=false;}
  labEl('comp-feedback').textContent=c.feedback||'Pilih permukaan yang akan terdedah di luar selepas kedua-dua bongkah dicantum.';
  labEl('comp-area').textContent=c.joined===1?labFmt(r.area)+' cm²':'Cantum dahulu';labEl('comp-volume').textContent=labFmt(r.volume)+' cm³';
  labEl('comp-equation').textContent=`Luas dua bongkah berasingan ${labFmt(r.separateArea)} cm² − 2 × luas tapak bersama ${labFmt(r.sharedArea)} cm² = ${labFmt(r.area)} cm². Langkah 1: tolak muka atas bongkah bawah, ${labFmt(r.sharedArea)} cm² → ${labFmt(r.separateArea-r.sharedArea)} cm². Langkah 2: tolak tapak bongkah atas, ${labFmt(r.sharedArea)} cm² → ${labFmt(r.area)} cm². Tinggi sendeng bahagian atas s ≈ ${labFmt(r.slant)} cm.`;
  labEl('lab-scene-label').textContent=roof?'KUBUS + PIRAMID':'SILINDER + KON';labEl('lab-caption').textContent=c.joined===1?'Tapak bahagian atas menutup muka atas bahagian bawah. Kedua-duanya menjadi permukaan dalaman.':'Pisahkan untuk melihat kedua-dua tapak yang akan bertemu. Saiz tapaknya sentiasa sepadan.';
  labEl('lab-outcome').textContent='Isi padu gabungan ialah jumlah kedua-dua isi padu; luas luar mengecualikan kedua-dua muka yang bercantum.';
 }
 draw(){
  if(!this.ready||!this.active)return;const k=this.kind;let mesh,progress=0,labels=false,selected=null;
  if(k==='net'){progress=this.net.progress;mesh=cubeNetMesh(this.net.cells,progress);labels=true;}
  if(k==='volume'){const v=this.volume;progress=v.progress;mesh=v.kind==='unit'?unitCubeMesh(v.d,v.units):pourMesh(v.kind,this.pourDims(),v.pours,v.progress,v.full);}
  if(k==='area'){const a=this.area;progress=a.progress;mesh=buildMesh(a.shape,progress,144,labDimensions(a.shape,a.d));labels=true;selected=[...a.selected];}
  if(k==='composite'){progress=this.comp.joined;mesh=compositionMesh(this.comp.kind,this.compDims(),progress);labels=true;selected=mesh.filter(f=>this.comp.selected.has(f.group)).map(f=>f.id);mesh=mesh.map(f=>f.group==='joinLower'||f.group==='joinUpper'?{...f,warning:true,outline:true,color:'#E8A7CB',label:f.group==='joinLower'?'Dalaman A':'Dalaman B'}:f);}
  this.renderer.draw({shape:'lab',mesh,progress,...this.camera,labels,selected});const canvas=labEl('labs-canvas');
  Object.assign(canvas.dataset,{lab:k,progress:String(progress),valid:String(cubeNetState(this.net.cells).valid),units:String(this.volume.units),pours:String(this.volume.pours),joined:String(this.comp.joined),yaw:String(this.camera.yaw),pitch:String(this.camera.pitch),zoom:String(this.camera.zoom)});
  canvas.setAttribute('aria-label',LAB_COPY[k][0]+'. '+labEl('lab-caption').textContent);
 }
}
