import {installModuleLanguage} from './module-language.mjs';
import {MODULE_COPY} from './module-copy.mjs';
import {MODULE_DESIGN_CSS} from './module-design.mjs';

export const MODULE_CHANNEL='geodecoder.module.preferences';
export function validateModuleSettings(value){
  const required=['language','textSize','motionPaused'],optional=['contrast','autoRotate','showLabels','resume','lastSection','audioEnabled'];
  if(!value||typeof value!=='object'||Array.isArray(value)||required.some(key=>!Object.hasOwn(value,key))||Object.keys(value).some(key=>!required.includes(key)&&!optional.includes(key))||!['ms','en'].includes(value.language)||![100,125,150].includes(value.textSize)||typeof value.motionPaused!=='boolean')return null;
  if(Object.hasOwn(value,'contrast')&&!['standard','strong'].includes(value.contrast)||Object.hasOwn(value,'lastSection')&&!['explore','notes','labs'].includes(value.lastSection))return null;
  if(['autoRotate','showLabels','resume','audioEnabled'].some(key=>Object.hasOwn(value,key)&&typeof value[key]!=='boolean'))return null;
  return {...value};
}

// Serialized into the opaque module document; it never reads parent DOM/storage.
// The canonical module calls this public bridge after its own runtime is ready.
export function installModulePreferences({initial,instanceId,channel,validate,localize,catalog}){
  let settings=initial,refresh=()=>{},started=false,applying=false;
  const events=new EventTarget(),language=localize({language:settings.language,catalog});
  const media={get matches(){return settings.motionPaused;},addEventListener:(...args)=>events.addEventListener(...args),removeEventListener:(...args)=>events.removeEventListener(...args)};
  function paint(){
    document.documentElement.dataset.textSize=String(settings.textSize);
    document.documentElement.style.setProperty('--geodecoder-text-scale',String(settings.textSize/100));
    document.documentElement.dataset.motionPaused=String(media.matches);
    document.documentElement.dataset.contrast=settings.contrast||'standard';
  }
  function notify(type,value){window.parent.postMessage({channel,version:1,instanceId,type,...(value?{value}:{})},'*');}
  function update(next){
    if(Object.keys(next).length===Object.keys(settings).length&&Object.keys(next).every(key=>next[key]===settings[key]))return;
    const old=settings;settings=next;paint();
    applying=true;
    try{
      if(old.language!==settings.language)language.setLanguage(settings.language);
      if(old.motionPaused!==settings.motionPaused)events.dispatchEvent(new Event('change'));
      if(started)refresh({...settings},old);
      language.refresh();
    }finally{applying=false;}
  }
  window.addEventListener('message',event=>{
    const message=event.data;
    if(event.source!==window.parent||!message||message.channel!==channel||message.version!==1||message.instanceId!==instanceId)return;
    if(message.type==='show-guide'){const guide=document.getElementById('panduan');if(guide){guide.setAttribute('tabindex','-1');guide.scrollIntoView({block:'start',behavior:'instant'});guide.focus({preventScroll:true});}return;}
    if(message.type!=='settings')return;
    const next=validate(message.settings);if(next)update(next);
  });
  paint();
  return {
    media,get language(){return settings.language;},get audioEnabled(){return settings.audioEnabled!==false;},get settings(){return {...settings};},translate:value=>language.translate(value),
    start(onRefresh){
      if(started)return;started=true;refresh=typeof onRefresh==='function'?onRefresh:()=>{};
      let button=document.getElementById('module-settings');
      if(!button){button=document.createElement('button');button.id='module-settings';button.type='button';button.className='help-link';button.textContent='Tetapan';button.setAttribute('aria-label','Tetapan permainan dan modul');document.querySelector('.header-meta')?.prepend(button);}
      button.addEventListener('click',()=>notify('open-settings'));
      const help=document.createElement('button');help.id='module-help';help.type='button';help.className='help-link';help.textContent='Pusat Bantuan';
      const originalGuide=document.querySelector('.header-meta a[href$="#panduan"]');
      if(originalGuide)originalGuide.replaceWith(help);else document.querySelector('.header-meta')?.prepend(help);
      help.addEventListener('click',()=>notify('open-help'));
      document.addEventListener('change',event=>{if(!applying&&event.target.id==='labels')notify('choice',{labels:event.target.checked});});
      document.addEventListener('click',event=>{
        if(applying)return;const id=event.target.closest?.('button')?.id;
        if(['learn-explore','learn-notes','learn-labs'].includes(id))notify('choice',{lastSection:id.slice(6)});
        if(id==='auto-rotate')notify('choice',{autoRotate:document.getElementById(id).getAttribute('aria-pressed')==='true'});
      });
      applying=true;try{refresh({...settings},{});if(settings.resume)document.getElementById('learn-'+settings.lastSection)?.click();}finally{applying=false;}
      language.refresh();notify('ready');
    }
  };
}
const inline=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');

export function scaleModuleTypography(css){
  return css.replace(/((?:font-size|font|--text-[\w-]+)\s*:\s*)([^;}]+)/g,(_,prefix,value)=>prefix+value.replace(/(-?(?:\d*\.)?\d+)(px|rem|vw|vh|vmin|vmax)\b/g,'calc($1$2 * var(--geodecoder-text-scale,1))'));
}

export function prepareModuleFrame(html,options){
  let source=html.replace(/href="#/g,'href="about:srcdoc#');
  if(!options)return source;
  const settings=validateModuleSettings(options.settings);
  if(!settings||typeof options.instanceId!=='string'||!/^[\w-]{1,100}$/.test(options.instanceId))throw new Error('Invalid module preferences');
  if(!source.includes('window.__geodecoderModuleHost'))throw new Error('The module does not implement the native host preference bridge');
  source=source.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,(_,open,css,close)=>open+scaleModuleTypography(css)+close);
  const bootstrap='window.__geodecoderModuleHost=('+installModulePreferences.toString()+')({initial:'+inline(settings)+',instanceId:'+inline(options.instanceId)+',channel:'+inline(MODULE_CHANNEL)+',validate:'+validateModuleSettings.toString()+',localize:'+installModuleLanguage.toString()+',catalog:'+inline(MODULE_COPY)+'});';
  if(!source.includes('</head>'))throw new Error('Invalid module document');
  return source.replace('</head>',()=>'<style>'+scaleModuleTypography(MODULE_DESIGN_CSS)+'</style><style>\nhtml[data-motion-paused="true"]{scroll-behavior:auto}html[data-motion-paused="true"] *,html[data-motion-paused="true"] *::before,html[data-motion-paused="true"] *::after{animation:none!important;transition:none!important}#module-settings,#module-help{font:inherit;border:0;background:transparent;color:inherit;cursor:pointer;min-height:40px;padding:5px 8px}.site-header,.header-meta,.workspace-top,.learning-navigation,.animation-actions{flex-wrap:wrap}main,.workspace,.info-panel,.learning-layout>*{min-width:0}h1,h2,h3,p,button,summary{overflow-wrap:anywhere}@media(max-width:560px){.stage-top,.stage-bottom,.mode-switch{flex-wrap:wrap;gap:8px}.learning-nav-button{white-space:normal}.learning-layout,.lab-choices{grid-template-columns:minmax(0,1fr)}.lab-choices button>b{flex:none;min-width:2ch;white-space:nowrap;overflow-wrap:normal;text-align:center}.lab-choices button>span{flex:1;min-width:0;overflow-wrap:normal}}\n</style><script>'+bootstrap+'</script></head>');
}
