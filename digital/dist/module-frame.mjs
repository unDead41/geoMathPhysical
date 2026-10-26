import {installModuleLanguage} from './module-language.mjs';
import {MODULE_COPY} from './module-copy.mjs';

export const MODULE_CHANNEL='geodecoder.module.preferences';
export function validateModuleSettings(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3||
    !['ms','en'].includes(value.language)||![100,125,150].includes(value.textSize)||typeof value.motionPaused!=='boolean')return null;
  return {language:value.language,textSize:value.textSize,motionPaused:value.motionPaused};
}

// Self-contained: serialized into the opaque srcdoc, never reads parent DOM/storage.
function installModulePreferences({initial,instanceId,channel,validate,localize,catalog}){
  let settings=initial,refresh=()=>{};
  const native=window.matchMedia('(prefers-reduced-motion: reduce)'),events=new EventTarget();
  const language=localize({language:settings.language,catalog});
  const media={get matches(){return native.matches||settings.motionPaused;},addEventListener:(...args)=>events.addEventListener(...args)};
  function paint(){
    document.documentElement.dataset.textSize=String(settings.textSize);
    document.documentElement.style.setProperty('--geodecoder-text-scale',String(settings.textSize/100));
    document.documentElement.dataset.motionPaused=String(media.matches);
  }
  function notify(type){window.parent.postMessage({channel,version:1,instanceId,type},'*');}
  native.addEventListener('change',()=>{paint();events.dispatchEvent(new Event('change'));});
  window.addEventListener('message',event=>{
    const message=event.data;
    if(event.source!==window.parent||!message||message.channel!==channel||message.version!==1||message.instanceId!==instanceId||message.type!=='settings')return;
    const next=validate(message.settings);if(!next)return;
    const oldMotion=media.matches,oldLanguage=settings.language;
    settings=next;paint();
    if(oldLanguage!==settings.language){language.setLanguage(settings.language);refresh();}
    if(oldMotion!==media.matches)events.dispatchEvent(new Event('change'));
  });
  paint();
  return {media,start(onRefresh){refresh=onRefresh;const button=document.getElementById('module-settings');button.addEventListener('click',()=>notify('open-settings'));language.refresh();notify('ready');}};
}

const inline=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
function replaceHook(source,needle,replacement){
  if(source.split(needle).length!==2)throw new Error('Pinned module preference hook changed');
  return source.replace(needle,()=>replacement);
}

// Fragment links must explicitly use about:srcdoc; otherwise Guide/Skip reload Home.
// Adapt a verified module pin in memory, keeping its original bytes/provenance intact.
export function prepareModuleFrame(html,options){
  let source=html.replace(/href="#/g,'href="about:srcdoc#');
  if(!options)return source;
  const settings=validateModuleSettings(options.settings);
  if(!settings||typeof options.instanceId!=='string'||!/^[\w-]{1,100}$/.test(options.instanceId))throw new Error('Invalid module preferences');
  source=source.replace(/<style>([\s\S]*?)<\/style>/,(_,css)=>'<style>'+css.replace(/(font-size\s*:\s*)([^;}]+)/g,(_,prefix,value)=>prefix+value.replace(/([\d.]+)(px|vw|rem)/g,'calc($1$2 * var(--geodecoder-text-scale,1))')).replace(/(font\s*:\s*)(\d+(?:\.\d+)?px)/g,'$1calc($2 * var(--geodecoder-text-scale,1))')+`\nhtml[data-motion-paused="true"]{scroll-behavior:auto}html[data-motion-paused="true"] *,html[data-motion-paused="true"] *::before,html[data-motion-paused="true"] *::after{animation:none!important;transition:none!important}#module-settings{font:inherit;border:0;background:transparent;cursor:pointer;min-height:36px;padding:5px 8px}.site-header,.header-meta,.workspace-top,.learning-navigation,.animation-actions{flex-wrap:wrap}main,.intro>*,.workspace,.info-panel,.learning-layout>*{min-width:0}h1,h2,h3,p,button,summary{overflow-wrap:anywhere}@media(max-width:560px){.stage-top,.stage-bottom{flex-wrap:wrap;gap:8px}.mode-switch{flex-wrap:wrap}.learning-nav-button{white-space:normal}.learning-layout{grid-template-columns:minmax(0,1fr)}.lab-choices{grid-template-columns:minmax(0,1fr)}.lab-choices button>b{flex:none;min-width:2ch;white-space:nowrap;overflow-wrap:normal;text-align:center}.lab-choices button>span{flex:1;min-width:0;overflow-wrap:normal}#labs-title,#study-title,#lab-title{font-size:calc(21px * var(--geodecoder-text-scale,1))}}\n</style>`);
  source=replaceHook(source,'<div class="header-meta">','<div class="header-meta"><button id="module-settings" class="help-link" type="button" aria-label="Tetapan permainan dan modul">Tetapan</button>');
  const bootstrap='const modulePreferences=('+installModulePreferences.toString()+')({initial:'+inline(settings)+',instanceId:'+inline(options.instanceId)+',channel:'+inline(MODULE_CHANNEL)+',validate:'+validateModuleSettings.toString()+',localize:'+installModuleLanguage.toString()+',catalog:'+inline(MODULE_COPY)+'});';
  source=replaceHook(source,"'use strict';\n(()=>{","'use strict';\n(()=>{\n"+bootstrap+'\n');
  source=replaceHook(source,"const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');",'const reduced=modulePreferences.media;');
  source=replaceHook(source,"el('auto-rotate').disabled=state.mode==='views';","el('auto-rotate').disabled=state.mode==='views'||reduced.matches;");
  source=replaceHook(source,'renderContent();redrawSmallModels();wake();','renderContent();redrawSmallModels();wake();\nmodulePreferences.start(()=>{redrawSmallModels();if(learningLabs.ready&&learningLabs.active)learningLabs.draw();});');
  return source;
}
