import {OfflineDB} from './offline-db.mjs';
import {OfflineSync} from './offline-sync.mjs';
import {isAccount,soloPracticePayload} from './offline-records.mjs';
import {createModuleSession,normalizeModuleRecord} from './module-progress.mjs';
import {createOfflineView} from './offline-view.mjs';
import {createOfflinePackageClient} from './offline-package-client.mjs';

const OWNER_KEY='geodecoder.offline.owner.v1';
export function rememberedOfflineAccount(storage){
 try{
  const auth=JSON.parse(storage.getItem('geodecoder.cloud.auth')||'null'),saved=JSON.parse(storage.getItem(OWNER_KEY)||'null');
  if(!isAccount(auth?.user?.id))return null;
  return {id:auth.user.id,role:saved?.id===auth.user.id&&['student','teacher'].includes(saved.role)?saved.role:undefined};
 }catch{return null;}
}
export function createOfflineRuntime(options){return new OfflineRuntime(options);}
class OfflineRuntime {
 constructor({cloud,storage,db=new OfflineDB(),online=()=>globalThis.navigator?.onLine!==false,autoStart=true,view}={}){
  this.cloud=cloud;this.storage=storage;this.db=db;this.online=online;this.autoStart=autoStart;this.writes=new Set();this.module=null;this.timer=null;this.stopped=false;this.signedOut=false;this.wakeFlight=null;
  this.account=rememberedOfflineAccount(storage);this.packageState={supported:false};
  this.view=view||createOfflineView({onRetry:()=>void this.wake({force:true}),onHistory:()=>void this.history(),onPrepare:()=>void this.prepareOffline?.(),onUpdate:()=>this.updateOffline?.()});
  this.sync=new OfflineSync({db,online,send:async(owner,events)=>{
   if(this.cloud.session?.user?.id!==owner&&typeof this.cloud.recoverOfflineSession==='function')await this.cloud.recoverOfflineSession(owner);
   if(this.cloud.session?.user?.id!==owner)throw Object.assign(Error('Sign in again'),{code:'session-expired'});
   return this.cloud.offlineSync('push',{events},{expectedUserId:owner});
  },onChange:state=>this.changed(state)});
  this.updateAccount(cloud.session,{remember:false});
  this.sessionStop=cloud.onSessionChange((session,event)=>{this.updateAccount(session,{event});if(this.autoStart)void this.wake({force:true});});
  this.onOnline=()=>void this.wake({force:true});this.onVisible=()=>{if(globalThis.document?.visibilityState!=='hidden')void this.wake();};this.onOffline=()=>this.changed(this.sync.state);
  if(autoStart){
   globalThis.addEventListener?.('online',this.onOnline);globalThis.addEventListener?.('offline',this.onOffline);globalThis.addEventListener?.('focus',this.onVisible);
   globalThis.document?.addEventListener('visibilitychange',this.onVisible);
   void this.wake();
   const pack=createOfflinePackageClient({onChange:state=>{this.packageState=state;this.changed(this.sync.state);}});
   this.prepareOffline=()=>pack.start();this.updateOffline=()=>pack.update();void pack.start();
  }
 }
 get actor(){return this.account?.id||'guest';}
 updateAccount(session,{remember=true,event}={}){
  const id=session?.user?.id;
  if(isAccount(id)){
   this.signedOut=false;
   const role=(!this.cloud.profile?.id||this.cloud.profile.id===id)?this.cloud.profile?.role:undefined;
   this.account={id,role:role||(this.account?.id===id?this.account.role:undefined)};
   try{this.storage.setItem(OWNER_KEY,JSON.stringify(this.account));}catch{}
  }else{
   // INITIAL_SESSION may be null after an offline refresh failure while the
   // SDK still owns its persisted session. That owner is local scope only.
   if(event==='SIGNED_OUT'||remember&&event!=='INITIAL_SESSION')this.signedOut=true;
   this.account=!this.signedOut&&(event==='INITIAL_SESSION'||!remember)?rememberedOfflineAccount(this.storage):null;
   if(!this.account)try{this.storage.removeItem(OWNER_KEY);}catch{}
  }
  this.sync.setActor(this.actor);
  if(this.module)this.module.setAccount(this.account);
 }
 attachModule(controller){this.module=controller;controller.setAccount(this.account);}
 changed(state){
  this.view.update({...state,online:this.online()},this.packageState);
  this.module?.applyOfflineState({...state,actor:state.actor});
  clearTimeout(this.timer);this.timer=null;
  if(this.autoStart&&!this.stopped&&this.online()&&state.pending&&state.status==='pending'){
   this.timer=setTimeout(()=>void this.wake(),Math.max(100,state.nextRetry-Date.now()));this.timer.unref?.();
  }
 }
 track(promise){this.writes.add(promise);promise.finally(()=>this.writes.delete(promise));return promise;}
 async settle(){await Promise.all([...this.writes]);}
 recordModule(owner,record){
  if(owner!==this.actor||this.account?.role!=='student')return Promise.resolve(false);
  return this.track(this.sync.enqueue({owner,id:'module:'+createModuleSession(),kind:'module',content_version:1,payload:record}));
 }
 recordSolo(result,{classroom=false}={}){
  const payload=soloPracticePayload(result);if(classroom||!payload||this.actor==='guest')return Promise.resolve(false);
  return this.track(this.sync.enqueue({owner:this.actor,id:'solo:'+payload.attempt_id,kind:'solo',content_version:1,payload}));
 }
 wake({force=false}={}){
  if(this.stopped)return Promise.resolve();
  const owner=this.actor;
  if(this.wakeFlight?.owner===owner){this.wakeFlight.force||=force;return this.wakeFlight.promise;}
  const flight={owner,force};
  flight.promise=(async()=>{
   await this.settle();await this.sync.refresh();if(this.stopped||!this.online()||owner!==this.actor)return;
   await this.sync.flush({force:flight.force});
  })();
  this.wakeFlight=flight;
  flight.promise.finally(()=>{if(this.wakeFlight===flight)this.wakeFlight=null;});
  return flight.promise;
 }
 async syncModule(controller){
  this.updateAccount(this.cloud.session,{remember:false});
  const owner=controller.state.actor;
  if(owner!==this.actor||!controller.canSync)return;
  let remote=[];
  if(this.online()&&this.cloud.session?.user?.id===owner){
   try{const response=await this.cloud.moduleProgress('mine',{},{expectedUserId:owner});if(owner!==this.actor)return;remote=response.records||[];controller.applyOfflineState({actor:owner,records:remote,status:'pending'});}catch{}
  }
  if(owner!==this.actor)return;
  try{
   const queued=await this.db.list(owner);
   for(const record of controller.state.records){
    const text=JSON.stringify(normalizeModuleRecord(record));
    if(!remote.some(r=>JSON.stringify(normalizeModuleRecord(r))===text)&&!queued.some(r=>r.kind==='module'&&JSON.stringify(r.payload)===text))await this.recordModule(owner,record);
   }
  }catch{this.sync.state.status='storage-failed';this.changed(this.sync.state);return;}
  await this.wake({force:true});
 }
 async history(){
  const owner=this.actor;
  try{const response=await this.cloud.offlineSync('history',{},{expectedUserId:owner});if(owner===this.actor)this.view.history?.(response.attempts);}
  catch{if(owner===this.actor)this.view.history?.(false);}
 }
 stop(){
  this.stopped=true;clearTimeout(this.timer);this.sessionStop?.();
  globalThis.removeEventListener?.('online',this.onOnline);globalThis.removeEventListener?.('offline',this.onOffline);globalThis.removeEventListener?.('focus',this.onVisible);globalThis.document?.removeEventListener('visibilitychange',this.onVisible);
 }
}
