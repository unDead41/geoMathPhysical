import {prepareModuleFrame,validateModuleSettings,MODULE_CHANNEL} from './module-frame.mjs';

/** Owns only the current iframe lifecycle and its preference messages. */
export function createModuleBridge({frame,getSettings,openSettings,openHelp=()=>{},onChoice=()=>{},hostWindow=window,createId=()=>globalThis.crypto?.randomUUID?.()||'module-'+Date.now()+'-'+Math.random().toString(36).slice(2)}){
  let instanceId='';
  function sync(){
    const settings=validateModuleSettings(getSettings());
    if(!instanceId||!settings||!frame.getAttribute('srcdoc'))return false;
    frame.contentWindow?.postMessage({channel:MODULE_CHANNEL,version:1,instanceId,type:'settings',settings},'*');
    return true;
  }
  function open(html){instanceId=createId();frame.srcdoc=prepareModuleFrame(html,{settings:getSettings(),instanceId});}
  function clear(){instanceId='';if(frame.getAttribute('srcdoc'))frame.removeAttribute('srcdoc');}
  function showGuide(){if(!instanceId||!frame.getAttribute('srcdoc'))return false;frame.contentWindow?.postMessage({channel:MODULE_CHANNEL,version:1,instanceId,type:'show-guide'},'*');return true;}
  frame.addEventListener('load',sync);
  hostWindow.addEventListener('message',event=>{
    const message=event.data;
    if(!instanceId||event.source!==frame.contentWindow||event.origin!=='null'||!message||message.channel!==MODULE_CHANNEL||message.version!==1||message.instanceId!==instanceId)return;
    if(message.type==='ready')sync();
    else if(message.type==='open-settings')openSettings();
    else if(message.type==='open-help')openHelp();
    else if(message.type==='choice'){const value=message.value;if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1)return;if(typeof value.labels==='boolean')onChoice({labels:value.labels});else if(typeof value.autoRotate==='boolean')onChoice({autoRotate:value.autoRotate});else if(['explore','notes','labs'].includes(value.lastSection))onChoice({lastSection:value.lastSection});}
  });
  return {open,sync,clear,showGuide};
}
