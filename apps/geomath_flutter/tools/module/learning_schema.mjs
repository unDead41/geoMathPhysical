/** Private learning checkpoint/action schema. No native identity belongs here. */
export function createLearningSchema() {
  const sourceCommit='37bc2cd262cc0a54e8ee31339ea37471c1ecfda5',moduleVersion='1.6.2';
  const maxBytes=2097152;
  const models=['cube','cuboid','pyramid','cylinder','cone','triangular-prism','tetrahedron','pentagonal-prism','hexagonal-prism','sphere','hemisphere'];
  const sections=['explore','views','notes','calculator','net','volume','area','composite','projection','calculation'];
  const activities=['net','volume','area','composite'],views=['front','back','left','right','top','bottom'];
  const projectionShapes=['cube','cuboid','pyramid','cylinder','cone','assembly-step','assembly-recess'];
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const exact=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
  const allowed=(v,keys)=>object(v)&&Object.keys(v).every(k=>keys.includes(k));
  const number=(v,min=-1e6,max=1e6)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  const integer=(v,min,max)=>Number.isInteger(v)&&number(v,min,max);
  const text=(v,max=600)=>typeof v==='string'&&v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
  const bytes=v=>{const s=JSON.stringify(v);return typeof TextEncoder==='function'?new TextEncoder().encode(s).length:unescape(encodeURIComponent(s)).length;};
  function safe(value){
    let nodes=0;
    const visit=(v,depth)=>{
      if(++nodes>400000||depth>24)return false;
      if(v===null||typeof v==='boolean')return true;
      if(typeof v==='number')return number(v);
      if(typeof v==='string')return text(v,600);
      if(Array.isArray(v))return v.length<=200&&v.every(x=>visit(x,depth+1));
      return object(v)&&Object.keys(v).length<=64&&Object.entries(v).every(([k,x])=>
        /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(k)&&!['__proto__','prototype','constructor','owner','actor','access_token','refresh_token','jwt','bridgeSession','progressSession'].includes(k)&&visit(x,depth+1));
    };
    try{return visit(value,0)&&bytes(value)<=maxBytes;}catch{return false;}
  }
  const dimensions=(v,raw=false)=>object(v)&&Object.keys(v).length<=8&&Object.entries(v).every(([k,x])=>['a','p','l','t','j','u','v','c'].includes(k)&&(raw?text(x,80):number(x,.000001,1000)));
  const projectionDimensions=(shape,v)=>{
    const fields={cube:['a'],cuboid:['p','l','t'],pyramid:['a','t'],cylinder:['j','t'],cone:['j','t'],'assembly-step':['a'],'assembly-recess':['a']}[shape];
    return Boolean(fields)&&exact(v,fields)&&fields.every(k=>integer(v[k],1,20))&&(!shape.startsWith('assembly-')||v.a===1);
  };
  const camera=v=>exact(v,['yaw','pitch','zoom'])&&number(v.yaw,-100000,100000)&&number(v.pitch,-Math.PI/2,Math.PI/2)&&number(v.zoom,.4,3);
  const pair=(v,min=-100,max=100)=>Array.isArray(v)&&v.length===2&&v.every(n=>number(n,min,max));
  const primitive=v=>exact(v,v?.kind==='circle'?['kind','center','r','type']:['kind','a','b','type'])&&['visible','hidden','construction'].includes(v.type)&&(v.kind==='circle'?pair(v.center,0,100)&&number(v.r,.000001,100):v.kind==='line'&&pair(v.a,0,100)&&pair(v.b,0,100)&&Math.hypot(v.a[0]-v.b[0],v.a[1]-v.b[1])>1e-8);
  const drawings=v=>Array.isArray(v)&&v.length<=200&&v.every(primitive);
  function motion(v){
    if(v===null)return true;
    if(!exact(v,['type','from','to','duration','elapsed','baseDuration','compare'])||!['net','area','composite','unit','pour','compare-fill','compare-transfer'].includes(v.type)||!number(v.from,0,1000000)||!number(v.to,0,1000000)||!number(v.duration,1,1000000)||!number(v.elapsed,0,v.duration)||!number(v.baseDuration,.000001,1000000))return false;
    if(v.type.startsWith('compare-'))return exact(v.compare,['fromItems','toItems','fromSpill','toSpill','plan'])&&[v.compare.fromItems,v.compare.toItems].every(items=>Array.isArray(items)&&items.length===2&&items.every(x=>exact(x,['key','d','fill'])&&models.includes(x.key)&&dimensions(x.d)&&number(x.fill,0,1)))&&number(v.compare.fromSpill,0,1000000)&&number(v.compare.toSpill,0,1000000)&&(v.type==='compare-fill'?v.compare.plan===null:object(v.compare.plan));
    return v.compare===null;
  }
  function labSnapshot(v,kind){
    if(!object(v))return false;
    if(kind==='net'){
      if(!exact(v,['net','studio'])||!object(v.net))return false;
      const n=v.net;
      if(!allowed(n,['mode','preset','presetFace','cells','progress','selected','dirty','presetDirty','notice','challenge','manualRepair'])||!['gallery','editor','studio'].includes(n.mode)||!models.slice(0,9).includes(n.preset)||!number(n.progress,0,1)||!integer(n.selected,0,200)||!Array.isArray(n.cells)||n.cells.length>36||!n.cells.every(c=>pair(c,-50,50)&&c.every(Number.isInteger)))return false;
      if(v.studio!==null){const s=v.studio;if(!exact(s,['shape','parents','inside','dimensions','openFace'])||!models.filter(x=>!['cylinder','cone','sphere','hemisphere'].includes(x)).includes(s.shape)||!dimensions(s.dimensions)||!Array.isArray(s.parents)||s.parents.length<4||s.parents.length>8||!s.parents.every((x,i)=>i===0?x===null:integer(x,0,s.parents.length-1))||!Array.isArray(s.inside)||s.inside.length!==s.parents.length||!s.inside.every(x=>typeof x==='boolean')||!integer(s.openFace,0,s.parents.length-1))return false;}
      return true;
    }
    if(kind==='volume'){
      if(!exact(v,['volume','compare']))return false;
      const a=v.volume,c=v.compare;
      return allowed(a,['kind','units','d','size','height','pours','progress','full'])&&['compare','unit','cone','pyramid'].includes(a.kind)&&dimensions(a.d)&&number(a.units,0,1000000)&&number(a.size,.1,1000)&&number(a.height,.1,1000)&&integer(a.pours,0,3)&&number(a.progress,0,1)&&typeof a.full==='boolean'&&allowed(c,['count','transfer','included','amountRaw','unit','allowOverflow','spill','lastTransfer','feedback','items'])&&[1,2].includes(c.count)&&number(c.transfer,0,1)&&Array.isArray(c.included)&&c.included.length===2&&c.included.every(x=>typeof x==='boolean')&&text(c.amountRaw,80)&&['cm3','mL','L','ml','l'].includes(c.unit)&&typeof c.allowOverflow==='boolean'&&number(c.spill,0,1000000)&&Array.isArray(c.items)&&c.items.length===2&&c.items.every(x=>exact(x,['key','d','fill'])&&models.includes(x.key)&&dimensions(x.d)&&number(x.fill,0,1));
    }
    if(kind==='area')return exact(v,['area','workshop'])&&allowed(v.area,['mode','shape','d','progress','selected','focus','dirty','focusPending'])&&['closed','container','cavity'].includes(v.area.mode)&&models.includes(v.area.shape)&&dimensions(v.area.d)&&number(v.area.progress,0,1)&&Array.isArray(v.area.selected)&&v.area.selected.every(x=>integer(x,0,20))&&(v.workshop===null||exact(v.workshop,['mode','shape','closed','d','selected'])&&['closed','container','cavity'].includes(v.workshop.mode)&&['cylinder','cuboid'].includes(v.workshop.shape)&&typeof v.workshop.closed==='boolean'&&dimensions(v.workshop.d)&&Array.isArray(v.workshop.selected)&&v.workshop.selected.every(x=>text(x,40)));
    return exact(v,['comp'])&&allowed(v.comp,['kind','size','h','t','joined','selected','dirty','feedback','focusPending'])&&['roof','rocket'].includes(v.comp.kind)&&number(v.comp.size,.1,1000)&&number(v.comp.h,.1,1000)&&number(v.comp.t,.1,1000)&&number(v.comp.joined,0,1)&&Array.isArray(v.comp.selected)&&v.comp.selected.every(x=>text(x,40));
  }
  function checkpoint(v){
    if(!safe(v)||!exact(v,['schemaVersion','sourceCommit','moduleVersion','section','explore','notes','labs','projection','calculation'])||v.schemaVersion!==1||v.sourceCommit!==sourceCommit||v.moduleVersion!==moduleVersion||!sections.includes(v.section))return false;
    const e=v.explore;
    if(!exact(e,['shape','progress','yaw','pitch','zoom','mode','view','labels','selected','auto','direction','kind','hold','manualOrbit','pausedAnimation','speed'])||!models.includes(e.shape)||!number(e.progress,0,1)||!camera({yaw:e.yaw,pitch:e.pitch,zoom:e.zoom})||!['model','views'].includes(e.mode)||!views.includes(e.view)||typeof e.labels!=='boolean'||!(e.selected===null||integer(e.selected,0,20))||typeof e.auto!=='boolean'||![-1,1].includes(e.direction)||!['cycle','target','view-close'].includes(e.kind)||!number(e.hold,0,10000)||typeof e.manualOrbit!=='boolean'||![.5,1].includes(e.speed)||(e.pausedAnimation!==null&&(!exact(e.pausedAnimation,['direction','kind','hold'])||![-1,1].includes(e.pausedAnimation.direction)||!['cycle','target','view-close'].includes(e.pausedAnimation.kind)||!number(e.pausedAnimation.hold,0,10000))))return false;
    if(v.notes!==null&&(!exact(v.notes,['shape','piMode','dimensions'])||!models.includes(v.notes.shape)||!['22/7','3.142','full'].includes(v.notes.piMode)||!dimensions(v.notes.dimensions,true)))return false;
    if(v.labs!==null){const l=v.labs;if(!exact(l,['kind','showHub','camera','speed','snapshots','histories','drafts','surface','motion','suspended'])||!activities.includes(l.kind)||typeof l.showHub!=='boolean'||!camera(l.camera)||![.25,.5,1].includes(l.speed)||!motion(l.motion)||!allowed(l.suspended,activities)||!Object.values(l.suspended).every(motion)||!exact(l.snapshots,activities)||!exact(l.histories,activities)||!exact(l.drafts,activities)||!activities.every(k=>labSnapshot(l.snapshots[k],k)&&Array.isArray(l.histories[k])&&l.histories[k].length<=30&&l.histories[k].every(x=>labSnapshot(x,k))&&exact(l.drafts[k],['prediction','result','explanation','answer'])&&text(l.drafts[k].prediction,240)&&text(l.drafts[k].result)&&text(l.drafts[k].explanation)&&text(l.drafts[k].answer,80)))return false;}
    if(v.projection!==null){const p=v.projection,s=p.state;if(!exact(p,['state','camera','measurementDraft','coordinateDraft'])||!camera(p.camera)||!dimensions(p.measurementDraft,true)||!exact(p.coordinateDraft,['x1','y1','x2','y2','radius'])||!Object.values(p.coordinateDraft).every(x=>text(x,80))||!exact(s,['shape','scale','dimensions','mode','guideStep','activeView','tool','lineType','drawings','history','hints','selected','pending','cursor','showGuides'])||!projectionShapes.includes(s.shape)||![1,2].includes(s.scale)||!projectionDimensions(s.shape,s.dimensions)||!['guide','exercise'].includes(s.mode)||!integer(s.guideStep,0,3)||!['front','side','plan'].includes(s.activeView)||!['line','circle','select'].includes(s.tool)||!['visible','hidden','construction'].includes(s.lineType)||!pair(s.cursor,0,100)||typeof s.showGuides!=='boolean'||!['drawings','history','hints'].every(k=>exact(s[k],['front','side','plan']))||!['front','side','plan'].every(k=>drawings(s.drawings[k])&&Array.isArray(s.history[k])&&s.history[k].length<=30&&s.history[k].every(drawings)&&typeof s.hints[k]==='boolean'))return false;
      if(s.selected!==null&&(!exact(s.selected,['view','index'])||!['front','side','plan'].includes(s.selected.view)||!integer(s.selected.index,0,s.drawings[s.selected.view].length-1)))return false;
      if(s.pending!==null&&(!exact(s.pending,['view','point'])||!['front','side','plan'].includes(s.pending.view)||!pair(s.pending.point,0,100)))return false;
    }
    if(v.calculation!==null){const c=v.calculation,d=c.draft;if(!exact(c,['draft','activeStep','problemIndex'])||!integer(c.activeStep,0,3)||!integer(c.problemIndex,0,1000000)||!exact(d,['shape','quantity','context','given','piMode','targetUnit','dimensions','answers','hints','revealed','example'])||!models.includes(d.shape)||!['surface','volume'].includes(d.quantity)||!['closed','open','cube-pyramid','cylinder-cone'].includes(d.context)||!['radius','diameter'].includes(d.given)||!['22/7','3.142','full'].includes(d.piMode)||!text(d.targetUnit,12)||!dimensions(d.dimensions,true)||!exact(d.answers,['formula','substitution','calculation','unit','unitValue'])||!Object.values(d.answers).every(x=>text(x,480))||!Array.isArray(d.hints)||d.hints.length>4||!d.hints.every(x=>['formula','substitution','calculation','unit'].includes(x))||typeof d.revealed!=='boolean'||typeof d.example!=='boolean')return false;}
    return true;
  }
  function action(v){
    if(!object(v)||typeof v.action!=='string')return false;
    if(v.action==='restore')return exact(v,['action','checkpoint'])&&checkpoint(v.checkpoint);
    if(!safe(v)||bytes(v)>4096)return false;
    if(v.action==='launch')return allowed(v,['action','section','shape','mode'])&&sections.includes(v.section)&&(!Object.hasOwn(v,'shape')||models.includes(v.shape)||v.section==='projection'&&projectionShapes.includes(v.shape))&&(!Object.hasOwn(v,'mode')||({net:['gallery','editor','studio'],volume:['compare','unit','cone','pyramid'],area:['closed','container','cavity'],composite:['roof','rocket']}[v.section]||[]).includes(v.mode));
    if(v.action==='workflow')return exact(v,['action','target'])&&['calculation','projection'].includes(v.target);
    if(['checkpoint','reset','pause','resume','undo','export-net'].includes(v.action))return exact(v,['action']);
    if(v.action==='rotate')return exact(v,['action','yaw','pitch'])&&number(v.yaw,-1,1)&&number(v.pitch,-1,1);
    if(v.action==='zoom')return exact(v,['action','delta'])&&number(v.delta,-.5,.5);
    if(v.action==='fold')return exact(v,['action','value'])&&number(v.value,0,1);
    if(v.action==='view')return exact(v,['action','view'])&&views.includes(v.view);
    if(v.action==='selectFace')return exact(v,['action','id'])&&integer(v.id,0,20);
    return false;
  }
  return {sourceCommit,moduleVersion,maxBytes,models,sections,checkpoint,action,safe,bytes};
}

export const learningSchema=createLearningSchema();
