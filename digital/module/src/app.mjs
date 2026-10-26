import {ModuleAccess} from './accessibility.mjs';
import {VIEWS,VIEW_ORDER,FACE_COLORS,clamp01,ease} from './geometry.mjs';
import {MODULE_VERSION,MODEL_ORDER,MODEL_DATA} from './content.mjs';
import {ModelRenderer} from './renderer.mjs';
import {LearningNotes} from './notes.mjs';
import {LearningLabs} from './labs.mjs';
import {UI_MOTION} from './design-system.mjs';
import {uiNode,playbackButton,hydrateIcons} from './ui.mjs';
hydrateIcons(document);
const el=id=>document.getElementById(id);
const reduced=window.__geodecoderModuleHost?.media || window.matchMedia('(prefers-reduced-motion: reduce)');
const initialHostSettings=window.__geodecoderModuleHost?.settings||{};
const initial=MODEL_ORDER.includes(location.hash.slice(1))?location.hash.slice(1):'cube';
const state={shape:initial,learningView:'explore',progress:0,yaw:.55,pitch:.35,zoom:1,mode:'model',view:'front',auto:!reduced.matches&&initialHostSettings.autoRotate!==false,labels:initialHostSettings.showLabels===true,selected:null,playing:false,direction:1,kind:'cycle',hold:0,camera:null,manualOrbit:false,pausedAnimation:null,speed:1};
const primaryLearningShapes=['cube','cuboid','pyramid','cylinder','cone'];
const mainRenderer=new ModelRenderer(el('model-canvas'));
const navRenderers=new Map(),viewRenderers=new Map();
let raf=0,lastFrame=0,dirty=true,lastPercent=-1;
const element=uiNode;
function announce(text) {el('announcer').textContent=text;}
function wake() {dirty=true;if(!raf&&!document.hidden&&state.learningView==='explore')raf=requestAnimationFrame(frame);}
function stopAnimation() {state.playing=false;state.hold=0;state.pausedAnimation=null;}
function setAuto(value) {state.auto=Boolean(value)&&state.mode==='model';if(state.auto){stopAnimation();state.camera=null;}refreshControls();wake();}
function alignCamera(yaw,pitch) {
  if(reduced.matches){state.yaw=yaw;state.pitch=pitch;state.camera=null;}
  else {
    const delta=((yaw-state.yaw+Math.PI*3)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
    state.camera={time:performance.now(),fromYaw:state.yaw,fromPitch:state.pitch,toYaw:state.yaw+delta,toPitch:pitch};
  }
  wake();
}
function refreshControls() {
  el('auto-rotate').setAttribute('aria-pressed',String(state.auto));
  el('auto-rotate').disabled=state.mode==='views';
  el('auto-rotate').querySelector('span').textContent=state.auto?'Hentikan putaran':'Putaran automatik';
  playbackButton(el('play'),state.playing?'Jeda animasi':state.pausedAnimation?'Sambung animasi':'Main animasi',state.playing);
  const noNet=Boolean(MODEL_DATA[state.shape].noNet);el('animation-panel').hidden=state.mode!=='model'||noNet;el('no-net-note').hidden=!noNet||state.mode!=='model';el('no-net-note').textContent=noNet?MODEL_DATA[state.shape].net:'';el('guided-net').hidden=noNet;el('play').disabled=noNet;el('progress').disabled=noNet;el('replay').disabled=noNet;el('explore-next').disabled=noNet;el('explore-speed').disabled=noNet;
  el('open-net').disabled=noNet||state.progress>=1&&!state.playing;
  el('close-net').disabled=Boolean(MODEL_DATA[state.shape].noNet)||state.progress<=0&&!state.playing;
  el('labels').checked=state.labels;
  el('zoom-level').textContent=Math.round(state.zoom*100)+'%';
  el('zoom-in').disabled=state.zoom>=2.2;
  el('zoom-out').disabled=state.zoom<=.6;
  el('reduced-note').hidden=!reduced.matches;
  const percent=Math.round(state.progress*100);
  if(percent!==lastPercent){
    el('progress').value=String(Math.round(state.progress*1000));
    el('progress-value').textContent=percent+'% terbuka';
    el('progress').setAttribute('aria-valuetext',percent===0?'Bongkah tertutup, 0 peratus terbuka':percent===100?'Bentangan rata, 100 peratus terbuka':percent+' peratus terbuka');
    lastPercent=percent;
  }
  el('stage-label').textContent=state.mode==='views'?(state.progress>0?'Mencantum untuk pandangan':`Pandangan ${VIEWS[state.view].name.toLowerCase()} · Ortografik`):state.progress===0?'Bongkah 3D':state.progress===1?'Bentangan rata':state.playing?(state.direction>0?'Membuka bentangan…':'Mencantum bongkah…'):'Bentangan separa terbuka';
  const canvas=el('model-canvas');
  canvas.setAttribute('aria-label',MODEL_DATA[state.shape].name+', '+el('stage-label').textContent+'. '+(state.mode==='views'?'Pilih arah pada kad pandangan.':'Gunakan anak panah untuk putar dan tambah atau tolak untuk zum.'));
  el('canvas-help').firstChild.textContent=state.mode==='views'?'Pilih arah di bawah · Cubit atau roda tetikus untuk zum':'Seret untuk putar · Cubit atau roda tetikus untuk zum';
}
function renderLegend() {
  el('face-legend').replaceChildren(...MODEL_DATA[state.shape].labels.map((name,id)=>{
    const button=element('button',{class:'face-chip',type:'button','aria-pressed':String(state.selected===id),'data-face':id});
    const number=element('span',{class:'face-number','aria-hidden':'true'},String(id+1));number.style.backgroundColor=FACE_COLORS[id];
    button.append(number,document.createTextNode(name));button.addEventListener('click',()=>selectFace(id));return button;
  }));
}
function selectFace(id) {
  state.selected=state.selected===id?null:id;state.labels=true;state.auto=false;
  renderLegend();refreshControls();
  el('face-description').textContent=state.selected===null?'Pilih permukaan untuk melihatnya pada model.':`Permukaan ${id+1}: ${MODEL_DATA[state.shape].labels[id]}. Jika terlindung, putar bongkah untuk mencarinya.`;
  announce(el('face-description').textContent);wake();
}
function renderViews() {
  el('view-grid').replaceChildren();viewRenderers.clear();
  VIEW_ORDER.forEach((key,i)=>{
    const view=VIEWS[key],button=element('button',{class:'view-choice','data-view':key,'aria-pressed':String(state.view===key),'aria-label':'Pandangan '+view.name.toLowerCase()}),canvas=element('canvas',{'aria-hidden':'true'});
    button.append(canvas,element('b',{},view.name),element('small',{},MODEL_DATA[state.shape].views[i]));
    button.addEventListener('click',()=>selectView(key));el('view-grid').append(button);viewRenderers.set(key,new ModelRenderer(canvas));
  });
  drawViews();updateViewDescription();
}
function drawViews() {if(state.mode==='views')for(const [key,renderer] of viewRenderers)renderer.draw({shape:state.shape,...VIEWS[key],mini:true});}
function updateViewDescription() {
  const i=VIEW_ORDER.indexOf(state.view);
  el('view-description').textContent=VIEWS[state.view].name+': '+MODEL_DATA[state.shape].views[i]+'. Warna menunjukkan permukaan yang dilihat; warna tidak mengubah bentuk unjuran.';
}
function selectView(key) {
  state.view=key;state.auto=false;state.manualOrbit=false;
  if(state.progress>0){state.playing=true;state.direction=-1;state.kind='view-close';}
  else alignCamera(VIEWS[key].yaw,VIEWS[key].pitch);
  for(const button of el('view-grid').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.view===key));
  updateViewDescription();refreshControls();announce(`Pandangan ${VIEWS[key].name.toLowerCase()} dipilih. ${MODEL_DATA[state.shape].views[VIEW_ORDER.indexOf(key)]}.`);wake();
}
function switchMode(mode) {
  if(state.mode===mode)return;
  stopAnimation();state.mode=mode;state.auto=false;state.manualOrbit=false;
  el('mode-model').setAttribute('aria-pressed',String(mode==='model'));el('mode-views').setAttribute('aria-pressed',String(mode==='views'));
  el('animation-panel').hidden=mode!=='model';el('views-panel').hidden=mode!=='views';
  if(mode==='views'){drawViews();selectView(state.view);}
  else alignCamera(.55,.35);
  refreshControls();announce(mode==='views'?'Pandangan 2D: bongkah kekal tertutup, dilihat dari satu arah.':'Model dan bentangan. Seret untuk memutar bongkah.');wake();
}
function renderContent() {
  const data=MODEL_DATA[state.shape];
  document.title=(state.learningView==='notes'?'Nota ':'')+data.name+' — Modul GeoDecoder';
  el('model-title').textContent=data.name;el('notes-title').textContent=data.name;el('shape-tag').textContent=data.tag;
  el('shape-intro').textContent=data.intro;el('net-explanation').textContent=data.net;el('net-explore-title').textContent=data.noNet?'Fahami permukaan melengkung':'Dari bongkah ke bentangan';el('observation').textContent=data.observe;
  el('edge-note').hidden=!data.curvedEdges;
  const stats=[[data.flat+data.curved,data.curved?'permukaan':'muka rata',data.curved?`${data.flat} rata + ${data.curved} melengkung`:'semuanya rata'],[data.edges,'rusuk',data.edges===0?'tiada':data.curvedEdges?'melengkung':'lurus'],[data.vertices,'bucu',state.shape==='cone'?'puncak':state.shape==='pyramid'?'termasuk puncak':'']];
  el('properties').replaceChildren(...stats.map(([count,label,detail])=>{const box=element('div',{class:'property'});box.append(element('b',{},String(count)),element('span',{},label),element('small',{},detail));return box;}));
  el('think-title').textContent=data.question;el('think-feedback').textContent='Pilih satu jawapan untuk melihat penerangan.';el('think-feedback').className='think-feedback';
  el('think-options').replaceChildren(...data.options.map((text,i)=>{
    const button=element('button',{'aria-pressed':'false','data-answer':i},text);
    button.addEventListener('click',()=>{
      for(const b of el('think-options').children)b.setAttribute('aria-pressed',String(b===button));
      el('think-feedback').textContent=(i===data.answer?'Tepat! ':'Perhatikan semula. ')+data.feedback;
      el('think-feedback').className='think-feedback'+(i===data.answer?' correct':'');
    });return button;
  }));
  el('animation-caption').textContent=data.noNet?data.net:data.curved?'Tapak dibuka dahulu. '+(state.shape==='cone'?'Permukaan melengkung dibuka menjadi sektor bulatan; panjang lengkok kekal sepadan dengan lilitan tapak.':'Permukaan melengkung dibuka menjadi segi empat tepat; panjangnya kekal sama dengan lilitan tapak.'):'Muka kekal bersambung pada rusuk. Warna yang sama menandakan muka yang sama.';
  el('face-description').textContent='Pilih permukaan untuk melihatnya pada model.';
  for(const button of el('shape-picker').children)button.setAttribute('aria-pressed',String(button.dataset.shape===state.shape));
  el('extra-shape-select').value=primaryLearningShapes.includes(state.shape)?'':state.shape;renderLegend();renderViews();refreshControls();
  if(state.learningView==='notes')learningNotes.render(state.shape);
}
function selectShape(shape) {
  moduleAccess.stopSpeech();
  stopAnimation();state.shape=shape;state.progress=0;state.zoom=1;state.selected=null;state.camera=null;state.manualOrbit=false;state.yaw=.55;state.pitch=.35;
  state.auto=false;lastPercent=-1;
  try{history.replaceState(null,'','#'+shape);}catch{/* Some file-origin policies restrict history; learning still works. */}
  renderContent();moduleAccess.describe(MODEL_DATA[state.shape].intro+' '+MODEL_DATA[state.shape].net);if(state.mode==='views'&&state.learningView==='explore')selectView(state.view);
  announce(MODEL_DATA[shape].name+' dipilih. '+MODEL_DATA[shape].tag);wake();
}
function beginAnimation(target=null) {
  if(MODEL_DATA[state.shape].noNet){state.progress=0;stopAnimation();refreshControls();announce(MODEL_DATA[state.shape].net);wake();return;}
  if(state.mode!=='model')switchMode('model');
  state.auto=false;state.playing=true;state.hold=0;state.manualOrbit=false;state.pausedAnimation=null;
  state.kind=target===null?'cycle':'target';state.direction=target===null?(state.progress>=1?-1:1):(target>state.progress?1:-1);
  if(target!==null&&state.progress===target)stopAnimation();
  alignCamera(.48,.28);refreshControls();announce(state.direction>0?'Membuka bentangan.':'Mencantum semula bongkah.');wake();
}
function resetCamera() {
  stopAnimation();state.auto=false;state.zoom=1;state.manualOrbit=false;
  const view=state.mode==='views'?VIEWS[state.view]:state.progress===1?{yaw:0,pitch:0}:{yaw:.55,pitch:.35};
  alignCamera(view.yaw,view.pitch);refreshControls();announce('Kedudukan dan zum dikembalikan kepada asal.');wake();
}
function zoomBy(amount) {state.zoom=Math.max(.6,Math.min(2.2,Math.round((state.zoom+amount)*1000)/1000));refreshControls();wake();}
function drawMain() {
  mainRenderer.draw(state);
  const canvas=el('model-canvas');
  for(const key of ['shape','learningView','progress','yaw','pitch','zoom','mode','playing','auto'])canvas.dataset[key]=String(state[key]);
  canvas.dataset.reducedMotion=String(reduced.matches);
}
function frame(time) {
  raf=0;const dt=lastFrame?Math.max(0,time-lastFrame):0;lastFrame=time;
  if(document.hidden||state.learningView!=='explore'){lastFrame=0;return;}
  if(state.camera){
    const c=state.camera,t=clamp01((time-c.time)/UI_MOTION.camera),e=ease(t);
    state.yaw=c.fromYaw+(c.toYaw-c.fromYaw)*e;state.pitch=c.fromPitch+(c.toPitch-c.fromPitch)*e;
    if(t===1){state.yaw=c.toYaw;state.pitch=c.toPitch;state.camera=null;}
    dirty=true;
  }
  if(state.playing){
    if(state.hold>0){state.hold=Math.max(0,state.hold-dt*state.speed);if(state.hold===0&&!state.manualOrbit)alignCamera(.48,.28);}
    else {
      state.progress=clamp01(state.progress+state.direction*dt*state.speed/UI_MOTION.unfold);
      if((state.direction>0&&state.progress===1)||(state.direction<0&&state.progress===0)){
        if(state.mode==='model'&&!state.manualOrbit)alignCamera(state.progress===1?0:.55,state.progress===1?0:.35);
        if(state.kind==='cycle'&&state.direction>0){state.direction=-1;state.hold=UI_MOTION.hold;}
        else {stopAnimation();if(state.kind==='view-close')alignCamera(VIEWS[state.view].yaw,VIEWS[state.view].pitch);}
      }
      dirty=true;refreshControls();
    }
  }
  if(state.auto){state.yaw=(state.yaw+Math.min(dt,80)*.00011)%(Math.PI*2);dirty=true;}
  if(dirty){drawMain();dirty=false;}
  if(state.auto||state.playing||state.camera){if(!raf)raf=requestAnimationFrame(frame);}else lastFrame=0;
}
for(const shape of primaryLearningShapes){
  const button=element('button',{class:'shape-choice','data-shape':shape,'aria-pressed':String(shape===state.shape)}),canvas=element('canvas',{'aria-hidden':'true'});
  button.append(canvas,element('span',{class:'shape-name'},MODEL_DATA[shape].name),element('span',{class:'choice-dot','aria-hidden':'true'}));
  button.addEventListener('click',()=>selectShape(shape));el('shape-picker').append(button);navRenderers.set(shape,new ModelRenderer(canvas));
}
for(const shape of MODEL_ORDER.filter(s=>!primaryLearningShapes.includes(s)))el('extra-shape-select').append(element('option',{value:shape},MODEL_DATA[shape].name));
el('extra-shape-select').addEventListener('change',()=>{const shape=el('extra-shape-select').value;if(MODEL_ORDER.includes(shape))selectShape(shape);});
function switchLearningView(view) {
  moduleAccess.stopSpeech();
  if(state.learningView===view)return;
  stopAnimation();state.auto=false;state.camera=null;
  if(state.learningView==='labs')learningLabs.close();
  if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;state.learningView=view;
  refreshControls();drawMain();
  el('explore-panel').hidden=view!=='explore';el('study-panel').hidden=view!=='notes';el('labs-panel').hidden=view!=='labs';el('shape-picker').hidden=view==='labs';el('extra-shape-field').hidden=view==='labs';
  el('learn-explore').setAttribute('aria-pressed',String(view==='explore'));el('learn-notes').setAttribute('aria-pressed',String(view==='notes'));el('learn-labs').setAttribute('aria-pressed',String(view==='labs'));
  document.title=(view==='notes'?'Nota ':'')+MODEL_DATA[state.shape].name+' — Modul GeoDecoder';
  if(view!=='labs')moduleAccess.describe(MODEL_DATA[state.shape].intro+' '+MODEL_DATA[state.shape].net);
  if(view==='labs'){learningLabs.open();el('labs-title').focus({preventScroll:true});document.title='Makmal Interaktif — Modul GeoDecoder';}
  else if(view==='notes'){learningNotes.render(state.shape);el('study-title').focus({preventScroll:true});announce('Nota '+MODEL_DATA[state.shape].name.toLowerCase()+' dibuka.');}
  else {redrawSmallModels();el('model-title').focus({preventScroll:true});announce('Teroka 3D '+MODEL_DATA[state.shape].name.toLowerCase()+'.');}
}
const moduleAccess=new ModuleAccess({onTheme:()=>{redrawSmallModels();if(learningLabs.active)learningLabs.draw();},onFocus:()=>{redrawSmallModels();if(learningLabs.active)learningLabs.draw();const target=el(state.learningView==='labs'?'labs-canvas':'model-canvas');if(state.learningView!=='notes'){target.focus({preventScroll:true});target.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});}},onContext:(records,changed)=>{
 if(changed){learningLabs.lastProgressSent={};learningLabs.suspended.clear();learningLabs.touched.clear();for(const a of Object.values(learningLabs.guided)){a.retry();a.record={activity:a.activity,stage:'prediction',prediction:'',result:'',explanation:'',completed:false};}if(learningLabs.ready){learningLabs.stop();for(const id of ['guided-prediction','guided-explanation','guided-answer'])el(id).value='';}}
 learningLabs.restoreProgress(records);
}});
const learningLabs=new LearningLabs({announce,prefersReduced:()=>reduced.matches,onProgress:r=>moduleAccess.progress(r),onActivity:()=>moduleAccess.stopSpeech(),onDescribe:text=>moduleAccess.describe(text)});
const learningNotes=new LearningNotes({announce,prefersReduced:()=>reduced.matches,onExplore:mode=>{
  switchLearningView('explore');
  if(mode==='net')beginAnimation(1);
  else if(mode==='views'){switchMode('views');selectView('top');}
  else switchMode('model');
  el('stage').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});
}});
el('learn-explore').addEventListener('click',()=>switchLearningView('explore'));el('learn-notes').addEventListener('click',()=>switchLearningView('notes'));
el('learn-labs').addEventListener('click',()=>switchLearningView('labs'));
el('version').textContent='V'+MODULE_VERSION;
el('mode-model').addEventListener('click',()=>switchMode('model'));el('mode-views').addEventListener('click',()=>switchMode('views'));
el('open-net').addEventListener('click',()=>beginAnimation(1));el('close-net').addEventListener('click',()=>beginAnimation(0));
el('play').addEventListener('click',()=>{
  if(state.playing){const saved={direction:state.direction,kind:state.kind,hold:state.hold};stopAnimation();state.camera=null;lastFrame=0;state.pausedAnimation=saved;refreshControls();announce('Animasi dijeda.');wake();}
  else if(state.pausedAnimation){const saved=state.pausedAnimation;state.pausedAnimation=null;state.playing=true;state.direction=saved.direction;state.kind=saved.kind;state.hold=saved.hold;refreshControls();announce('Animasi disambung.');wake();}
  else beginAnimation();
});
el('explore-speed').addEventListener('change',()=>{state.speed=el('explore-speed').value==='0.5'?.5:1;lastFrame=0;});
el('explore-next').addEventListener('click',()=>{
 if(MODEL_DATA[state.shape].noNet)return;state.auto=false;state.camera=null;
 if(!state.playing&&!state.pausedAnimation){state.kind='target';state.direction=state.progress===1?-1:1;state.hold=0;}
 if(state.pausedAnimation){Object.assign(state,state.pausedAnimation);state.pausedAnimation=null;}
 state.playing=false;
 if(state.hold>0)state.hold=Math.max(0,state.hold-UI_MOTION.unfold/10);
 else{state.progress=clamp01(Math.round((state.progress+state.direction*.1)*1e10)/1e10);if(state.progress===1||state.progress===0){if(state.kind==='cycle'&&state.direction>0){state.direction=-1;state.hold=UI_MOTION.hold;}else state.kind='target';}}
 if((state.direction>0&&state.progress<1)||(state.direction<0&&state.progress>0)||state.hold>0)state.pausedAnimation={direction:state.direction,kind:state.kind,hold:state.hold};
 lastFrame=0;lastPercent=-1;refreshControls();wake();
});
el('replay').addEventListener('click',()=>{state.progress=0;lastPercent=-1;beginAnimation();});
el('guided-net').addEventListener('click',()=>{beginAnimation(1);el('stage').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});});
el('guided-view').addEventListener('click',()=>{switchMode('views');selectView(state.view==='top'?'front':'top');el('views-panel').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'nearest'});});
el('auto-rotate').addEventListener('click',()=>setAuto(!state.auto));
el('labels').addEventListener('change',()=>{state.labels=el('labels').checked;wake();});
el('zoom-in').addEventListener('click',()=>zoomBy(.15));el('zoom-out').addEventListener('click',()=>zoomBy(-.15));el('reset').addEventListener('click',resetCamera);
for(const [id,key,amount] of [['orbit-left','yaw',-.2],['orbit-right','yaw',.2],['orbit-up','pitch',.15],['orbit-down','pitch',-.15]])el(id).addEventListener('click',()=>{
  if(state.mode==='views')switchMode('model');state.auto=false;state.manualOrbit=true;state.camera=null;
  if(key==='yaw')state.yaw+=amount;else state.pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,state.pitch+amount));
  refreshControls();wake();
});
el('progress').addEventListener('input',()=>{
  stopAnimation();state.auto=false;state.progress=MODEL_DATA[state.shape].noNet?0:Number(el('progress').value)/1000;
  if(!state.manualOrbit)alignCamera(state.progress===1?0:state.progress===0?.55:.48,state.progress===1?0:state.progress===0?.35:.28);
  lastPercent=-1;refreshControls();wake();
});
const pointers=new Map();let dragStart=null,wasPinch=false,pinchDistance=0,pinchZoom=1,moved=false;
const canvas=el('model-canvas');
canvas.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  canvas.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  dragStart={x:event.clientX,y:event.clientY};moved=false;
  if(pointers.size===2){const [a,b]=[...pointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);pinchZoom=state.zoom;wasPinch=true;}
  else wasPinch=false;
  state.auto=false;state.camera=null;refreshControls();
});
canvas.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId))return;
  const before=pointers.get(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()];state.zoom=Math.max(.6,Math.min(2.2,pinchZoom*Math.hypot(a.x-b.x,a.y-b.y)/(pinchDistance||1)));moved=true;}
  else {
    const dx=event.clientX-before.x,dy=event.clientY-before.y;
    if(dragStart&&Math.hypot(event.clientX-dragStart.x,event.clientY-dragStart.y)>4)moved=true;
    if(moved){
      if(state.mode==='views')switchMode('model');
      state.camera=null;state.manualOrbit=true;state.yaw+=dx*.009;state.pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,state.pitch+dy*.009));
    }
  }
  refreshControls();wake();
});
function releasePointer(event) {
  if(!pointers.has(event.pointerId))return;
  if(event.type==='pointerup'&&!moved&&!wasPinch&&pointers.size===1){const box=canvas.getBoundingClientRect(),face=mainRenderer.pick(event.clientX-box.left,event.clientY-box.top);if(face!==null)selectFace(face);}
  pointers.delete(event.pointerId);if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  if(pointers.size===0){wasPinch=false;dragStart=null;}
}
canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',releasePointer);canvas.addEventListener('lostpointercapture',event=>pointers.delete(event.pointerId));
canvas.addEventListener('wheel',event=>{event.preventDefault();zoomBy(event.deltaY<0?.08:-.08);},{passive:false});
canvas.addEventListener('keydown',event=>{
  if(event.isComposing)return;
  if(event.key==='Home'){event.preventDefault();resetCamera();return;}
  if(['+','=','-','_'].includes(event.key)){event.preventDefault();zoomBy(event.key==='-'||event.key==='_'?-.1:.1);return;}
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
  event.preventDefault();state.auto=false;
  if(state.mode==='views')switchMode('model');
  state.camera=null;state.manualOrbit=true;
  if(event.key==='ArrowLeft')state.yaw-=.13;if(event.key==='ArrowRight')state.yaw+=.13;
  if(event.key==='ArrowUp')state.pitch=Math.min(Math.PI/2,state.pitch+.13);if(event.key==='ArrowDown')state.pitch=Math.max(-Math.PI/2,state.pitch-.13);
  refreshControls();wake();
});
reduced.addEventListener('change',()=>{if(learningLabs.ready)learningLabs.pause();state.auto=false;stopAnimation();state.camera=null;refreshControls();wake();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){
  const saved=state.playing?{direction:state.direction,kind:state.kind,hold:state.hold}:state.pausedAnimation;
  stopAnimation();state.pausedAnimation=saved;state.auto=false;state.camera=null;
  if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;refreshControls();
}else wake();});
function redrawSmallModels(){for(const [shape,r] of navRenderers)r.draw({shape,yaw:.55,pitch:.35,mini:true});drawViews();wake();}
if(typeof ResizeObserver!=='undefined'){const resize=new ResizeObserver(redrawSmallModels);resize.observe(el('shape-picker'));resize.observe(el('stage'));}else window.addEventListener('resize',redrawSmallModels);
renderContent();redrawSmallModels();moduleAccess.init();moduleAccess.describe(MODEL_DATA[state.shape].intro+' '+MODEL_DATA[state.shape].net);wake();
let lastHostSettings={};
/** Explicit host entry point: refresh presentation/preferences without replacing app source. */
function refreshModuleHost(settings={}){
 moduleAccess.stopSpeech();moduleAccess.voiceAvailability();
 if(typeof settings.showLabels==='boolean'&&settings.showLabels!==lastHostSettings.showLabels)state.labels=settings.showLabels;
 if(typeof settings.autoRotate==='boolean'&&settings.autoRotate!==lastHostSettings.autoRotate){state.auto=settings.autoRotate&&!reduced.matches&&state.mode==='model'&&state.learningView==='explore';if(state.auto){stopAnimation();state.camera=null;}}
 lastHostSettings={...settings};refreshControls();redrawSmallModels();
 if(learningLabs.active)learningLabs.render();else moduleAccess.describe(MODEL_DATA[state.shape].intro+' '+MODEL_DATA[state.shape].net);
}
window.__geodecoderModuleHost?.start(refreshModuleHost);
