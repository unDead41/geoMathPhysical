import {createLearningSchema} from './learning_schema.mjs';

/** Pure preflight against canonical geometry, including every Undo entry. */
export function validateLearningGeometry(v,g){
  const fail=()=>{throw Error('checkpoint-invalid');};
  const exact=(value,keys)=>value&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
  const range=(n,min,max,step=1)=>Number.isFinite(n)&&n>=min&&n<=max&&Number.isInteger(n/step);
  const equal=(a,b)=>typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b)):Array.isArray(a)?Array.isArray(b)&&a.length===b.length&&a.every((n,i)=>equal(n,b[i])):a&&typeof a==='object'?b&&typeof b==='object'&&exact(b,Object.keys(a))&&Object.keys(a).every(k=>equal(a[k],b[k])):a===b;
  const dim=(value,keys,min,max,step=1)=>exact(value,keys)&&keys.every(k=>range(value[k],min,max,step));
  const item=x=>{if(!dim(x.d,g.fields[x.key],1,8))fail();g.volumeInfo(x.key,x.d);};
  const plan=p=>{
    if(!p||!Array.isArray(p.items)||p.items.length!==2)fail();p.items.forEach(item);
    const computed=g.transferPlan(p.items,p.from,p.requested,p.spilled>0,p.previousSpill);
    if(!equal(p,computed))fail();return computed;
  };
  if(v.explore.selected!==null&&v.explore.selected>=g.modelData[v.explore.shape].labels.length)fail();
  g.learningMesh(v.explore.shape,v.explore.progress,64);
  if(v.notes&&!exact(v.notes.dimensions,g.fields[v.notes.shape]))fail();
  if(v.labs){
    const l=v.labs;
    const surface=(a,c)=>({version:1,area:{mode:a.area.mode,shape:a.area.shape,dimensions:a.area.d,progress:a.area.progress,selected:a.area.selected},workshop:a.workshop&&{shape:a.workshop.shape,closed:a.workshop.closed,dimensions:a.workshop.d,selected:a.workshop.selected},composite:{kind:c.comp.kind,size:c.comp.size,h:c.comp.h,t:c.comp.t,joined:c.comp.joined,selected:c.comp.selected}});
    const validateSnapshot=(kind,s)=>{
      if(kind==='net'){
        const n=s.net;if(n.cells.length>6||n.cells.some(p=>p.some(x=>!range(x,0,5)))||new Set(n.cells.map(p=>p.join(','))).size!==n.cells.length||n.selected>Math.max(0,n.cells.length-1)||n.presetFace!==null&&!range(n.presetFace,0,g.modelData[n.preset].labels.length-1))fail();
        const t=s.studio;if(t){if(!dim(t.dimensions,g.studioFields(t.shape),.5,4,.5))fail();g.netStudioState(t.shape,t.parents,t.dimensions,t.inside);}
      }else if(kind==='volume'){
        const a=s.volume;if(!dim(a.d,['p','l','t'],1,6)||!range(a.units,0,a.d.p*a.d.l*a.d.t)||!range(a.size,1,8)||!range(a.height,1,8))fail();
        s.compare.items.forEach(item);if(s.compare.lastTransfer!==null)plan(s.compare.lastTransfer);
      }else if(kind==='area'){
        if(!s.workshop||!['closed','container','cavity'].includes(s.workshop.mode)||!g.surfaceValidate(surface(s,l.snapshots.composite)))fail();
      }else if(!g.surfaceValidate(surface(l.snapshots.area,s)))fail();
    };
    for(const kind of ['net','volume','area','composite'])for(const s of [l.snapshots[kind],...l.histories[kind]])validateSnapshot(kind,s);
    if(l.surface!==null&&!equal(l.surface,surface(l.snapshots.area,l.snapshots.composite)))fail();
    const motion=(kind,m)=>{
      if(!m)return;
      const a=l.snapshots.volume.volume,c=l.snapshots.volume.compare;
      const expected=kind==='volume'?(a.kind==='unit'?'unit':a.kind==='compare'?(m.type==='compare-transfer'?'compare-transfer':'compare-fill'):'pour'):kind;
      const max=m.type==='unit'?a.d.p*a.d.l*a.d.t:1;
      if(m.type!==expected||m.from>max||m.to>max||m.from===m.to||m.elapsed>=m.duration||!equal(m.duration,Math.max(1,m.baseDuration*Math.abs(m.to-m.from))))fail();
      const progress=m.from+(m.to-m.from)*g.ease(m.elapsed/m.duration);
      if(m.type.startsWith('compare-')){
        if(m.from!==0||m.to!==1)fail();m.compare.fromItems.forEach(item);m.compare.toItems.forEach(item);
        let current;
        if(m.type==='compare-transfer'){
          const p=plan(m.compare.plan),first=g.transferFrame(p,0),last=g.transferFrame(p,1);
          if(!equal(first.items,m.compare.fromItems)||!equal(last.items,m.compare.toItems)||!equal(first.spill,m.compare.fromSpill)||!equal(last.spill,m.compare.toSpill))fail();
          current=g.transferFrame(p,progress);
        }else{
          if(!equal(m.compare.fromSpill,m.compare.toSpill)||m.compare.fromItems.some((x,i)=>x.key!==m.compare.toItems[i].key||!equal(x.d,m.compare.toItems[i].d)))fail();
          current={items:m.compare.fromItems.map((x,i)=>({...x,fill:x.fill+(m.compare.toItems[i].fill-x.fill)*progress})),spill:m.compare.fromSpill};
        }
        if(!equal(c.transfer,progress)||!equal(c.items,current.items)||!equal(c.spill,current.spill))fail();
      }else{
        const current=m.type==='net'?l.snapshots.net.net.progress:m.type==='area'?l.snapshots.area.area.progress:m.type==='composite'?l.snapshots.composite.comp.joined:m.type==='unit'?a.units:a.progress;
        if(!equal(current,m.type==='unit'?Math.round(progress):progress))fail();
        if(m.type==='area'&&(l.snapshots.area.area.mode!=='closed'||g.modelData[l.snapshots.area.area.shape].noNet))fail();
      }
    };
    motion(l.kind,l.motion);for(const [kind,m] of Object.entries(l.suspended))motion(kind,m);
  }
  if(v.projection)g.projectionModel(v.projection.state.shape,v.projection.state.dimensions);
  if(v.calculation){const d=v.calculation.draft;if(!g.calculationContextOptions(d.shape).includes(d.context)||!g.calculationUnitOptions[d.quantity].includes(d.targetUnit)||!exact(d.dimensions,g.calculationFields(d.shape,d.context)))fail();}
}

/** Serialized inside the canonical runtime's closure; never exposes its objects. */
export function installLearningAdapter(env,schema) {
  const {state,labs,notes,projection,calculation,el}=env;
  const clone=value=>JSON.parse(JSON.stringify(value));
  let requestSequence=0,eventSequence=0,restoring=false,queued=false;
  let transitionCheckpoint=null,transitionDepth=0,hasLaunched=false;
  let labInputs={};
  const readLabInputs=()=>Object.fromEntries(['prediction','explanation','answer'].map(key=>[key,el('guided-'+key)?.value??'']));
  // The canonical chooser restores accepted reflection milestones. Keep raw
  // editing inputs separately so switching activities never discards typing or
  // promotes it into an observed, checked or completed reflection.
  const chooseLab=labs.choose;
  labs.choose=function(kind){
    const previous=this.kind;
    if(this.ready&&!restoring&&kind!==previous&&Object.hasOwn(this.guided,kind))labInputs[previous]=readLabInputs();
    const result=chooseLab.call(this,kind);
    if(this.ready&&!restoring&&this.kind!==previous&&labInputs[this.kind])for(const [key,value] of Object.entries(labInputs[this.kind]))el('guided-'+key).value=value;
    return result;
  };
  const section=()=>state.learningView==='explore'?(state.mode==='views'?'views':'explore'):state.learningView==='notes'?(state.studyMode==='calculator'?'calculator':'notes'):state.learningView==='labs'?labs.kind:state.learningView;
  function post(type,value={}){window.parent.postMessage({type,version:1,eventSequence:++eventSequence,...value},'*');}
  function transition(operation,suppress=false){
    const outer=transitionDepth++===0;
    let previous=null;
    if(outer&&!restoring&&!suppress){try{previous=capture();}catch{/* The normal state response reports invalid drafts. */}}
    try{return operation();}
    finally{
      transitionDepth--;
      if(previous&&section()!==previous.section){
        // Keep the original route's freshest state if the learner crosses more
        // than one source boundary before native polling catches up.
        if(transitionCheckpoint&&section()===transitionCheckpoint.section)transitionCheckpoint=null;
        else if(!transitionCheckpoint)transitionCheckpoint=previous;
      }
    }
  }
  function pause(){
    const saved=state.playing?{direction:state.direction,kind:state.kind,hold:state.hold}:state.pausedAnimation;
    env.stopAnimation();state.pausedAnimation=saved;state.auto=false;state.camera=null;
    if(labs.ready)labs.pause();env.access.stopSpeech();env.refresh();
  }
  function captureMotion(kind,a){
    if(!a||a.finished)return null;
    const type=kind!=='volume'?kind:labs.volume.kind==='unit'?'unit':labs.volume.kind==='compare'?(labs.compare.lastTransfer?'compare-transfer':'compare-fill'):'pour';
    let compare=null;
    if(type.startsWith('compare-')){
      const current=a.get();a.set(a.from);const fromItems=clone(labs.compare.items),fromSpill=labs.compare.spill;
      a.set(a.to);const toItems=clone(labs.compare.items),toSpill=labs.compare.spill;a.set(current);
      compare={fromItems,toItems,fromSpill,toSpill,plan:type==='compare-transfer'?clone(labs.compare.lastTransfer):null};
    }
    return {type,from:a.from,to:a.to,duration:a.duration,elapsed:a.elapsed,baseDuration:a.baseDuration,compare};
  }
  function restoreMotion(m){
    if(!m)return null;
    let get,set,done=null;
    if(['net','area','composite'].includes(m.type)){
      const target=m.type==='net'?labs.net:m.type==='area'?labs.area:labs.comp,key=m.type==='composite'?'joined':'progress';get=()=>target[key];set=v=>target[key]=v;
    }else if(m.type==='unit'){get=()=>labs.volume.units;set=v=>labs.volume.units=Math.round(v);}
    else if(m.type==='pour'){get=()=>labs.volume.progress;set=v=>labs.volume.progress=v;done=()=>{labs.volume.pours++;labs.volume.progress=0;labs.volume.full=false;};}
    else {
      get=()=>labs.compare.transfer;
      if(m.type==='compare-transfer')set=v=>{labs.compare.transfer=v;const frame=env.transferFrame(m.compare.plan,v);labs.compare.items=frame.items;labs.compare.spill=frame.spill;};
      else set=v=>{labs.compare.transfer=v;labs.compare.items=m.compare.fromItems.map((item,i)=>({...clone(item),fill:item.fill+(m.compare.toItems[i].fill-item.fill)*v}));labs.compare.spill=m.compare.fromSpill;};
    }
    const a=new env.LabMotion(get,set,m.to,m.duration,done,env.ease);Object.assign(a,{from:m.from,elapsed:m.elapsed,baseDuration:m.baseDuration});return a;
  }
  function captureLabs(){
    if(!labs.ready)return null;
    const kind=labs.kind,snapshots={},motion=captureMotion(kind,labs.anim||labs.paused),suspended=Object.fromEntries([...labs.suspended].map(([key,a])=>[key,captureMotion(key,a)]));
    for(const key of ['net','volume','area','composite']){labs.kind=key;snapshots[key]=labs.snapshot();}
    labs.kind=kind;
    const drafts=Object.fromEntries(Object.entries(labs.guided).map(([key,a])=>[key,{prediction:labInputs[key]?.prediction??a.draft.prediction,result:a.draft.result,explanation:labInputs[key]?.explanation??a.draft.explanation,answer:labInputs[key]?.answer??''}]));
    // Include unsent learner typing, as well as accepted teaching milestones.
    Object.assign(drafts[kind],readLabInputs());
    return {kind,showHub:labs.showHub,camera:{...labs.camera},speed:labs.speed,snapshots,histories:Object.fromEntries(Object.entries(labs.histories).map(([key,h])=>[key,clone(h.items)])),drafts,surface:env.surfaceSnapshot(),motion,suspended};
  }
  function capture(){
    const e={};for(const key of ['shape','progress','yaw','pitch','zoom','mode','view','labels','selected','auto','direction','kind','hold','manualOrbit','speed'])e[key]=state[key];
    e.pausedAnimation=state.playing?{direction:state.direction,kind:state.kind,hold:state.hold}:state.pausedAnimation?{...state.pausedAnimation}:null;
    const p=projection.initialized?{state:Object.fromEntries(['shape','scale','dimensions','mode','guideStep','activeView','tool','lineType','drawings','history','hints','selected','pending','cursor','showGuides'].map(k=>[k,clone(projection.state[k])])),camera:{...projection.camera},measurementDraft:{...projection.measurementDraft},coordinateDraft:Object.fromEntries(['x1','y1','x2','y2','radius'].map(k=>[k,el('projection-'+k).value]))}:null;
    let c=null;
    if(calculation.draft){const d=calculation.draft;c={draft:Object.fromEntries(['shape','quantity','context','given','piMode','targetUnit','dimensions','answers','revealed','example'].map(k=>[k,clone(d[k])])),activeStep:calculation.activeStep,problemIndex:calculation.problemIndex};c.draft.hints=[...d.hints];}
    const checkpoint={schemaVersion:1,sourceCommit:schema.sourceCommit,moduleVersion:schema.moduleVersion,section:section(),explore:e,notes:notes.ready?{shape:notes.shape,piMode:notes.piMode,dimensions:Object.fromEntries(env.fields[notes.shape].map(k=>[k,el('measure-'+k).value]))}:null,labs:captureLabs(),projection:p,calculation:c};
    if(!schema.checkpoint(checkpoint))throw Error('checkpoint-invalid');
    return checkpoint;
  }
  function diagnostics(){
    return {section:section(),shape:state.shape,modelCount:env.models.length,yaw:state.yaw,pitch:state.pitch,zoom:state.zoom,progress:state.progress,mode:state.mode,selected:state.selected,playing:state.playing,auto:state.auto,labKind:labs.ready?labs.kind:null,labMode:labs.ready?(labs.kind==='net'?labs.net.mode:labs.kind==='volume'?labs.volume.kind:labs.kind==='area'?labs.area.mode:labs.comp.kind):null,projectionShape:projection.state.shape,projectionScale:projection.state.scale,calculationShape:calculation.draft?.shape||null,faceColors:env.faceColors(state.shape),meshSource:'learning-mesh.mjs/studySolidMesh'};
  }
  function emit(result={ok:true},sequence=requestSequence){
    try{post('geomath:learning-state',{requestSequence:sequence,result,checkpoint:capture(),transitionCheckpoint,diagnostics:diagnostics()});}
    catch(error){post('geomath:learning-state',{requestSequence:sequence,result:{ok:false,error:error.message==='checkpoint-invalid'?'checkpoint-invalid':'checkpoint-unavailable'},checkpoint:null,transitionCheckpoint,diagnostics:diagnostics()});}
  }
  function launch(value){
    const {section:target,shape,mode}=value;
    if(shape&&env.models.includes(shape)&&state.shape!==shape)env.selectShape(shape);
    if(target==='explore'||target==='views'){
      env.switchView('explore');env.switchMode(target==='views'?'views':'model');
    }else if(target==='notes'||target==='calculator')env.switchView('notes',{studyMode:target==='calculator'?'calculator':'notes'});
    else if(target==='projection'){
      env.switchView('projection',{shape});if(shape&&projection.state.shape!==shape)projection.changeShape(shape);
    }else if(target==='calculation'){
      env.switchView('calculation',{shape});if(shape&&calculation.draft.shape!==shape)calculation.setShape(shape);
    }else{
      env.switchView('labs');labs.openActivity(target);
      if(target==='area'||target==='composite'){
        if(!env.surfaceLaunch(target,shape,mode))throw Error('surface-action-invalid');
      }else if(mode&&target==='net'&&labs.net.mode!==mode)el('net-mode-'+mode).click();
      else if(mode&&target==='volume'&&labs.volume.kind!==mode){el('volume-kind').value=mode;el('volume-kind').dispatchEvent(new Event('change',{bubbles:true}));}
      if(target==='net'&&shape&&mode==='studio'&&env.studioShapes.includes(shape)&&labs.studio.shape!==shape){el('studio-shape').value=shape;el('studio-shape').dispatchEvent(new Event('change',{bubbles:true}));}
      labs.render();
    }
    state.auto=false;env.refresh();
  }
  function preflight(checkpoint){
    if(!schema.checkpoint(checkpoint)||checkpoint.labs&&!env.surfaceValidate(checkpoint.labs.surface))return false;
    try{
      if(env.noNet(checkpoint.explore.shape)&&checkpoint.explore.progress!==0)return false;
      env.validateGeometry(checkpoint);
      return true;
    }catch{return false;}
  }
  function restore(value){
    if(!preflight(value))throw Error('checkpoint-invalid');
    const v=clone(value);restoring=true;
    try{
      pause();
      launch({section:v.section,shape:v.section==='projection'?v.projection?.state.shape:v.section==='calculation'?v.calculation?.draft.shape:v.explore.shape});
      if(v.notes){notes.render(v.notes.shape);notes.piMode=v.notes.piMode;for(const [key,raw] of Object.entries(v.notes.dimensions))el('measure-'+key).value=raw;notes.calculate();}
      if(v.labs){
        const l=v.labs;labs.init();labs.stop();labs.suspended.clear();labs.touched.clear();
        const n=l.snapshots.net;Object.assign(labs.net,n.net,{dirty:true,presetDirty:true,drag:null});if(n.studio)Object.assign(labs.studio,n.studio,{dirty:true});labs.printDirty=true;
        Object.assign(labs.volume,l.snapshots.volume.volume);Object.assign(labs.compare,l.snapshots.volume.compare);
        const a=l.snapshots.area;Object.assign(labs.area,a.area,{selected:new Set(a.area.selected),dirty:true});if(a.workshop)Object.assign(labs.workshop,a.workshop,{selected:new Set(a.workshop.selected)});
        const c=l.snapshots.composite.comp;Object.assign(labs.comp,c,{selected:new Set(c.selected),dirty:true});
        if(!env.surfaceRestore(l.surface))throw Error('surface-checkpoint-invalid');
        // Closed-area rendering keeps a separate last container/cavity mode.
        // The surface presentation helper uses the visible area mode instead.
        if(a.workshop)labs.workshop.mode=a.workshop.mode;
        Object.assign(labs,{kind:l.kind,showHub:l.showHub,camera:l.camera,speed:l.speed});
        labInputs={};
        for(const key of ['net','volume','area','composite']){
          labs.histories[key].items=clone(l.histories[key]);const d=l.drafts[key],activity=labs.guided[key];activity.retry();
          Object.assign(activity.draft,{prediction:d.prediction,result:d.result,explanation:d.explanation});
          // A checkpoint restores editing state, never a live checked/completed gate.
          activity.draft.stage='prediction';activity.draft.completed=false;labInputs[key]={prediction:d.prediction,explanation:d.explanation,answer:d.answer};
        }
        labs.paused=restoreMotion(l.motion);for(const [key,m] of Object.entries(l.suspended))if(m)labs.suspended.set(key,restoreMotion(m));
        el('guided-prediction').value=l.drafts[l.kind].prediction;el('guided-explanation').value=l.drafts[l.kind].explanation;el('guided-answer').value=l.drafts[l.kind].answer;labs.render();
      }
      if(v.projection){projection.open(v.projection.state.shape);projection.state={...clone(v.projection.state),results:{front:null,side:null,plan:null}};projection.camera={...v.projection.camera};projection.measurementDraft={...v.projection.measurementDraft};projection.rebuildGeometry();projection.render();for(const [key,raw] of Object.entries(v.projection.coordinateDraft))el('projection-'+key).value=raw;projection.visible=v.section==='projection';projection.root.hidden=!projection.visible;}
      if(v.calculation){calculation.init();calculation.draft={...clone(v.calculation.draft),hints:new Set(v.calculation.draft.hints),checks:{}};calculation.problemIndex=v.calculation.problemIndex;calculation.statusKey='';calculation.update(true);env.revalidateCalculation(calculation,v.calculation.activeStep);calculation.active=v.section==='calculation';calculation.root.hidden=!calculation.active;}
      Object.assign(state,v.explore,{playing:false,auto:false,camera:null});env.refresh();env.redraw();transitionCheckpoint=null;
    }finally{restoring=false;}
  }
  function control(value){
    const current=section();
    if(value.action==='launch')return launch(value);
    if(value.action==='workflow'){
      if(!['notes','calculator'].includes(current)||value.target==='projection'&&el('note-draw-projections').hidden)throw Error('workflow-unavailable');
      el(value.target==='calculation'?'note-check-steps':'note-draw-projections').click();
      if(section()!==value.target)throw Error('workflow-unavailable');return;
    }
    if(value.action==='restore')return restore(value.checkpoint);
    if(value.action==='checkpoint')return;
    if(value.action==='export-net')return exportNet();
    if(value.action==='pause')return pause();
    if(value.action==='resume'){if(state.learningView==='labs')labs.resume();else if(state.learningView==='explore'&&state.pausedAnimation)el('play').click();return;}
    if(value.action==='undo'){if(current==='projection')projection.undo();else if(state.learningView==='labs')labs.undo();else throw Error('undo-unavailable');return;}
    if(value.action==='rotate'||value.action==='zoom'||value.action==='reset'){
      if(current==='projection'){
        if(value.action==='reset')projection.camera={yaw:.55,pitch:.35,zoom:1};else projection.moveCamera(value.yaw||0,value.pitch||0,value.delta||0);projection.drawModel();
      }else if(state.learningView==='labs'){
        if(value.action==='reset')labs.camera={yaw:.48,pitch:.3,zoom:1};else {labs.camera.yaw+=value.yaw||0;labs.camera.pitch+=value.pitch||0;labs.camera.zoom+=value.delta||0;labs.boundCamera();}labs.render();
      }else{
        if(value.action==='reset')env.resetCamera();else {state.auto=false;state.camera=null;if(value.action==='rotate'){state.yaw+=value.yaw;state.pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,state.pitch+value.pitch));state.manualOrbit=true;}else env.zoomBy(value.delta);}env.refresh();env.redraw();
      }return;
    }
    if(value.action==='selectFace'){if(value.id>=env.surfaceCount(state.shape))throw Error('face-unavailable');env.selectFace(value.id);return;}
    if(value.action==='view'){env.switchView('explore');env.switchMode('views');env.selectView(value.view);return;}
    if(value.action==='fold'){
      if(state.learningView==='labs'){
        if(!['net','area','composite'].includes(labs.kind)||labs.kind==='area'&&(labs.area.mode!=='closed'||env.noNet(labs.area.shape)))throw Error('net-unavailable');
        labs.beginEdit();if(labs.kind==='net')labs.net.progress=value.value;else if(labs.kind==='area')labs.area.progress=value.value;else labs.comp.joined=value.value;labs.render();
      }else {if(env.noNet(state.shape))throw Error('net-unavailable');env.switchView('explore');env.switchMode('model');el('progress').value=String(Math.round(value.value*1000));el('progress').dispatchEvent(new Event('input',{bubbles:true}));}return;
    }
    throw Error('action-unavailable');
  }
  function exportNet(){
    if(section()!=='net'||!labs.printer?.plan?.valid||labs.printer.printButton.disabled)throw Error('net-export-unavailable');
    const plan=labs.printer.plan,svg=plan.svg;
    if(typeof svg!=='string'||svg.length>262144||!svg.startsWith('<svg ')||/<script|<foreignObject|<iframe|<object|<embed|<image|\bon[a-z]+\s*=|(?:href|src)\s*=/i.test(svg))throw Error('net-export-invalid');
    post('geomath:learning-export',{export:{format:'image/svg+xml',fileName:'GeoDecoder_Bentangan.svg',title:String(plan.title).slice(0,240),svg}});
  }
  const initLabs=labs.init;
  labs.init=function(){const initialized=this.ready;initLabs.call(this);if(initialized)return;
    this.printer.print=()=>{try{exportNet();}catch{this.printer.status.textContent=env.access.language()==='en'?'A valid flat net is required for SVG preview.':'Bentangan rata yang sah diperlukan untuk pratonton SVG.';}};
    this.printer.download=this.printer.print;
    this.printer.printButton.textContent='Pratonton SVG / SVG preview';this.printer.downloadButton.textContent='Salin SVG / Copy SVG';
    for(const id of ['area-mode','comp-kind']){const node=el(id);if(node?.parentElement)node.parentElement.hidden=true;}
  };
  const externalLinks=[
    'https://bpk.moe.gov.my/kurikulum/kssm/kssm-tingkatan-2/341-dskp-kssm-matematik-tingkatan-2/file',
    'https://sman.pahang.edu.my/system/documents/attachments/000/000/168/original/002_DSKP_KSSM_MATEMATIK_TINGKATAN_3.pdf?1544929347=',
  ];
  document.addEventListener('click',event=>{
    const anchor=event.target.closest?.('a[href]');if(!anchor)return;
    const href=anchor.getAttribute('href');if(!/^https?:/i.test(href||''))return;
    event.preventDefault();if(externalLinks.includes(href))post('geomath:learning-external-link',{url:href});
  });
  window.addEventListener('message',event=>{
    const m=event.data;
    if(event.source!==window.parent||!m||m.type!=='geomath:learning-action'||m.version!==1||!Number.isSafeInteger(m.sequence)||m.sequence<=requestSequence)return;
    requestSequence=m.sequence;
    if(!schema.action(m.value)){emit({ok:false,error:'action-invalid'});return;}
    const initialLaunch=m.value.action==='launch'&&!hasLaunched;
    if(initialLaunch)hasLaunched=true;
    try{transition(()=>control(m.value),initialLaunch||m.value.action==='restore');emit();}catch(error){emit({ok:false,error:['checkpoint-invalid','surface-checkpoint-invalid','face-unavailable','undo-unavailable','net-unavailable','net-export-unavailable','net-export-invalid','workflow-unavailable'].includes(error.message)?error.message:'action-failed'});}
  });
  const schedule=()=>{if(restoring||queued)return;queued=true;Promise.resolve().then(()=>{queued=false;if(!restoring)emit();});};
  for(const name of ['input','change','click','pointerup'])document.addEventListener(name,schedule);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();emit();}});
  env.installTransitions(transition);
  post('geomath:learning-ready');emit();
  return {progress(payload){post('geomath:learning-progress',{progress:payload});}};
}

export function learningAdapterSource(){
  return `\nconst geomathValidateLearningGeometry=(${validateLearningGeometry.toString()});\nconst geomathLearningSchema=(${createLearningSchema.toString()})();\nconst geomathLearningTransport=(${installLearningAdapter.toString()})({state,labs:learningLabs,notes:learningNotes,projection:projectionStudio,calculation:calculationWorkshop,access:moduleAccess,LabMotion,ease,transferFrame,el,models:MODEL_ORDER,fields:MEASURE_FIELDS,studioShapes:STUDIO_SHAPES.map(s=>s.key),noNet:shape=>Boolean(MODEL_DATA[shape].noNet),surfaceCount:shape=>MODEL_DATA[shape].labels.length,faceColors:shape=>MODEL_DATA[shape].labels.map((_,id)=>geomathFaceColor(shape,id)),surfaceLaunch:geomathSurfaceLaunch,surfaceSnapshot:geomathSurfaceSnapshot,surfaceRestore:geomathSurfaceRestore,surfaceValidate:geomathSurfaceValidate,selectShape,switchView:switchLearningView,switchMode,selectView,selectFace,stopAnimation,resetCamera,zoomBy,refresh:refreshControls,redraw:redrawSmallModels,installTransitions:wrap=>{const view=switchLearningView;switchLearningView=function(...args){return wrap(()=>view(...args));};const mode=switchMode;switchMode=function(...args){return wrap(()=>mode(...args));};const study=setStudyMode;setStudyMode=function(...args){return wrap(()=>study(...args));};const choose=learningLabs.choose;learningLabs.choose=function(...args){return wrap(()=>choose.apply(this,args));};},revalidateCalculation:(c,step)=>{if(c.problem.valid)for(let i=0;i<step;i++){const key=calcSteps[i],value=key==='unit'?{value:c.draft.answers.unitValue,unit:c.draft.answers.unit}:c.draft.answers[key],result=calculationCheckStep(c.problem,key,value);c.draft.checks[key]=result;if(!result.correct)break;}c.activeStep=step;c.updateSteps();},validateGeometry:v=>geomathValidateLearningGeometry(v,{modelData:MODEL_DATA,fields:MEASURE_FIELDS,studioFields,learningMesh,netStudioState,volumeInfo,transferPlan,transferFrame,ease,surfaceValidate:geomathSurfaceValidate,projectionModel,calculationContextOptions,calculationUnitOptions,calculationFields})},geomathLearningSchema);\n`;
}
