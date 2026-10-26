// One device preference record accepts both historical ease and utility formats.
export const PREFERENCES_KEY='geodecoder.digital.preferences.v1';
export const DEFAULTS=Object.freeze({text:'normal',contrast:'standard',motion:'system',music:true,musicVolume:22,effects:false,effectsVolume:70,muted:false,autoRotate:true,labels:false,resume:false,lastSection:'explore',tutorialSeen:false});
export const textSize=value=>({normal:100,large:125,largest:150})[value]||100;
export function normalize(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value))value={};
  const p={...DEFAULTS};
  for(const key of Object.keys(p)){
    const v=value[key];
    if(typeof p[key]==='boolean'&&typeof v==='boolean')p[key]=v;
    else if(typeof p[key]==='number'&&Number.isFinite(v))p[key]=Math.round(Math.max(0,Math.min(100,v)));
  }
  for(const [key,values] of Object.entries({text:['normal','large','largest'],contrast:['standard','strong'],motion:['system','reduce','full'],lastSection:['explore','notes','labs']}))if(values.includes(value[key]))p[key]=value[key];
  if(typeof value.effects!=='boolean'&&typeof value.sound==='boolean')p.effects=value.sound;
  if(!['system','reduce','full'].includes(value.motion)&&typeof value.motionPaused==='boolean')p.motion=value.motionPaused?'reduce':'system';
  if(!['normal','large','largest'].includes(value.text)&&[100,125,150].includes(value.textSize))p.text=({100:'normal',125:'large',150:'largest'})[value.textSize];
  return p;
}
export function createPreferences(storage){
  let failed=false,p;
  try{
    const raw=storage?.getItem(PREFERENCES_KEY),legacyMusic=!['false','0'].includes(storage?.getItem('geodecoder.digital.music.enabled'));
    const value=raw?JSON.parse(raw):{};
    p=normalize({music:legacyMusic,...(value&&typeof value==='object'&&!Array.isArray(value)?value:{})});
    if(!storage)failed=true;
  }catch{p=normalize();failed=true;}
  const listeners=new Set(),notify=()=>{for(const fn of listeners)fn({...p});};
  return {
    get value(){return {...p};},get failed(){return failed;},
    set(patch){p=normalize({...p,...patch});try{if(!storage)throw Error('Storage unavailable');storage.setItem(PREFERENCES_KEY,JSON.stringify(p));failed=false;}catch{failed=true;}notify();},
    reset(){this.set(DEFAULTS);},
    subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
    reload(){try{p=normalize(JSON.parse(storage.getItem(PREFERENCES_KEY)||'{}'));failed=false;notify();}catch{failed=true;}}
  };
}
