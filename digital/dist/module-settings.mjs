import {prepareModuleFrame,validateModuleSettings,MODULE_CHANNEL} from './module-frame.mjs';

/** Owns only the current iframe lifecycle and its preference messages. */
export function createModuleBridge({frame,getSettings,openSettings,hostWindow=window,createId=()=>globalThis.crypto?.randomUUID?.()||'module-'+Date.now()+'-'+Math.random().toString(36).slice(2)}){
  let instanceId='';
  function sync(){
    const settings=validateModuleSettings(getSettings());
    if(!instanceId||!settings||!frame.getAttribute('srcdoc'))return false;
    frame.contentWindow?.postMessage({channel:MODULE_CHANNEL,version:1,instanceId,type:'settings',settings},'*');
    return true;
  }
  function open(html){instanceId=createId();frame.srcdoc=prepareModuleFrame(html,{settings:getSettings(),instanceId});}
  function clear(){instanceId='';if(frame.getAttribute('srcdoc'))frame.removeAttribute('srcdoc');}
  frame.addEventListener('load',sync);
  hostWindow.addEventListener('message',event=>{
    const message=event.data;
    if(!instanceId||event.source!==frame.contentWindow||event.origin!=='null'||!message||message.channel!==MODULE_CHANNEL||message.version!==1||message.instanceId!==instanceId)return;
    if(message.type==='ready')sync();
    else if(message.type==='open-settings')openSettings();
  });
  return {open,sync,clear};
}
