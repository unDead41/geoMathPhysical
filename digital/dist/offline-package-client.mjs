export function createOfflinePackageClient({onChange=()=>{},document=globalThis.document,navigator=globalThis.navigator}={}){
 const enabled=Boolean(document?.querySelector('meta[name="geomath-pwa"][content="enabled"]')&&navigator?.serviceWorker);
 const state={supported:enabled,ready:false,preparing:false,error:false,update:false};let registration;
 const emit=()=>onChange({...state});
 function ask(worker,type){
  return new Promise((resolve,reject)=>{
   if(!worker){reject(Error('Worker unavailable'));return;}
   const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(Error('Offline preparation timed out'));},30000);
   channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data);};
   worker.postMessage({type},[channel.port2]);
  });
 }
 async function active(){
  if(registration.active)return registration.active;
  const worker=registration.installing||registration.waiting;if(!worker)throw Error('Worker unavailable');
  if(worker.state==='activated')return worker;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{worker.removeEventListener('statechange',check);reject(Error('Worker install timed out'));},30000);
   function check(){if(worker.state==='activated'){clearTimeout(timer);worker.removeEventListener('statechange',check);resolve(worker);}else if(worker.state==='redundant'){clearTimeout(timer);worker.removeEventListener('statechange',check);reject(Error('Offline install incomplete'));}}
   worker.addEventListener('statechange',check);check();
  });
 }
 async function start(){
  if(!enabled){emit();return state;}
  state.preparing=true;state.error=false;emit();
  try{
   registration=await navigator.serviceWorker.register(new URL('./sw.js',document.baseURI).href,{scope:new URL('./',document.baseURI).href,updateViaCache:'none'});
   const watch=()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&registration.active){state.update=true;emit();}});};
   registration.addEventListener('updatefound',watch);watch();
   const result=await ask(await active(),'GEOMATH_PREPARE');state.ready=result.ready===true;state.error=!state.ready;state.update=Boolean(registration.waiting);
  }catch{state.ready=false;state.error=true;}
  finally{state.preparing=false;emit();}
  return state;
 }
 function update(){
  if(!registration?.waiting)return;
  navigator.serviceWorker.addEventListener('controllerchange',()=>globalThis.location.reload(),{once:true});
  registration.waiting.postMessage({type:'GEOMATH_ACTIVATE'});
 }
 return {state,start,update};
}
