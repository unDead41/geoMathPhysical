import {normalizeOfflineEvent,isAccount} from './offline-records.mjs';

const halted=new Set(['needs-auth','unavailable','blocked','storage-failed']);
function failureStatus(error){
 if(['session-expired','session-changed','unauthenticated','session_required'].includes(error?.code))return 'needs-auth';
 if(['service-unavailable','PGRST202','42883'].includes(error?.code))return 'unavailable';
 if(['invalid_payload','invalid_progress','invalid_event','invalid_version','forbidden','id_conflict'].includes(error?.code))return 'blocked';
 return 'pending';
}
export class OfflineSync {
 constructor({db,send,onChange=()=>{},now=Date.now,random=Math.random,online=()=>globalThis.navigator?.onLine!==false}={}){
  this.db=db;this.send=send;this.onChange=onChange;this.now=now;this.random=random;this.online=online;
  this.state={actor:'guest',pending:0,status:'local',nextRetry:0,records:[]};this.epoch=0;this.attempts=0;this.flight=null;this.memory=new Map();
 }
 emit(){this.onChange({...this.state,records:[...this.state.records]});}
 queue(actor){if(!this.memory.has(actor))this.memory.set(actor,new Map());return this.memory.get(actor);}
 unsaved(actor){return [...(this.memory.get(actor)?.values()||[])].filter(entry=>!entry.persisted);}
 pending(actor,rows){return new Set([...rows.map(event=>event.id),...(this.memory.get(actor)?.keys()||[])]).size;}
 status(actor,status){return this.unsaved(actor).some(entry=>entry.failed)?'storage-failed':this.memory.get(actor)?.size&&status==='synced'?'pending':status;}
 async read(actor){
  const queue=this.queue(actor),before=[...queue].filter(([,entry])=>entry.persisted);let rows;
  try{rows=await this.db.list(actor);}catch(error){throw Object.assign(Error('Offline read failed'),{code:'storage-failed',cause:error});}
  const ids=new Set(rows.map(event=>event.id));
  // A different tab may have acknowledged durable rows. Only prune entries that
  // were already durable when the read started; newer saves may miss its snapshot.
  for(const [id,entry] of before)if(!ids.has(id)&&queue.get(id)===entry)queue.delete(id);
  for(const event of rows){const entry=queue.get(event.id);if(!entry||entry.failed&&JSON.stringify(entry.event)!==JSON.stringify(event))queue.set(event.id,{event,persisted:true,failed:false,promise:null});}
  return rows;
 }
 persist(entry){
  if(entry.persisted)return Promise.resolve(true);
  if(entry.promise)return entry.promise;
  entry.failed=false;
  const promise=(async()=>{try{await this.db.enqueue(entry.event);entry.persisted=true;return true;}catch{entry.failed=true;try{await this.read(entry.event.owner);}catch{}return false;}})();
  entry.promise=promise;promise.finally(()=>{if(entry.promise===promise)entry.promise=null;});return promise;
 }
 setActor(actor){
  const next=isAccount(actor)?actor:'guest';if(next===this.state.actor)return;
  const pending=this.memory.get(next)?.size||0;
  this.epoch++;this.attempts=0;this.state={actor:next,pending,status:this.status(next,pending?'pending':'local'),nextRetry:0,records:[]};this.emit();
 }
 async refresh(){
  const {actor}=this.state,epoch=this.epoch;
  if(actor==='guest')return this.state;
  try{const rows=await this.read(actor);if(epoch===this.epoch){this.state.pending=this.pending(actor,rows);this.state.status=this.status(actor,this.state.pending&&['local','synced','storage-failed'].includes(this.state.status)?'pending':this.state.status);this.emit();}}
  catch{if(epoch===this.epoch){this.state.status='storage-failed';this.emit();}}
  return this.state;
 }
 async enqueue(value){
  const event=normalizeOfflineEvent(value),epoch=this.epoch;
  if(!event||event.owner!==this.state.actor)return false;
  const queue=this.queue(event.owner);let entry=queue.get(event.id);
  if(entry&&JSON.stringify(entry.event)!==JSON.stringify(event))return false;
  if(!entry){entry={event,persisted:false,failed:false,promise:null};queue.set(event.id,entry);}
  this.state.pending=Math.max(this.state.pending,this.unsaved(event.owner).length);this.state.status=this.status(event.owner,'pending');this.emit();
  const saved=await this.persist(entry);
  if(epoch===this.epoch){const retained=queue.get(event.id)!==entry;this.state.pending=this.pending(event.owner,[]);this.state.status=this.status(event.owner,saved||retained?'pending':'storage-failed');if(saved||retained)await this.refresh();else this.emit();}return saved;
 }
 flush({force=false}={}){
  const {actor}=this.state,epoch=this.epoch;
  if(actor==='guest'||!this.online()||!force&&(halted.has(this.state.status)||this.now()<this.state.nextRetry))return Promise.resolve(this.state);
  if(this.flight?.epoch===epoch)return this.flight.promise;
  const current=()=>epoch===this.epoch&&actor===this.state.actor;
  const promise=(async()=>{
   // Keep unsaved canonical events for this owner until storage recovers. A send
   // must also wait for any original write, so it cannot finish after its ack.
   for(const entry of this.unsaved(actor)){
    const saved=await this.persist(entry);if(!current())return this.state;
    if(!saved&&this.queue(actor).get(entry.event.id)===entry){this.state.status='storage-failed';this.state.pending=this.pending(actor,[]);this.emit();return this.state;}
   }
   let rows;
   try{rows=(await this.read(actor)).slice(0,20);}catch{if(current()){this.state.status='storage-failed';this.emit();}return this.state;}
   if(!current())return this.state;
   const queue=this.queue(actor);
   for(const event of rows){
    const entry=queue.get(event.id);
    if(entry&&!entry.persisted){
     const saved=await this.persist(entry);if(!current())return this.state;
     if(!saved&&queue.get(entry.event.id)===entry){this.state.status='storage-failed';this.emit();return this.state;}
    }else if(!entry)queue.set(event.id,{event,persisted:true,failed:false,promise:null});
   }
   if(!rows.length){this.state.status=this.status(actor,'synced');this.state.pending=this.pending(actor,[]);this.emit();return this.state;}
   this.state.status='syncing';this.emit();
   try{
    const result=await this.send(actor,rows.map(({owner,...event})=>event));
    if(!current())return this.state;
    const ids=rows.map(r=>r.id),ack=result?.accepted;
    if(!Array.isArray(ack)||new Set(ack).size!==ack.length||ack.some(id=>!ids.includes(id)))throw Error('Invalid acknowledgement');
    try{await this.db.ack(actor,ack);}catch(error){throw Object.assign(Error('Offline acknowledgement failed'),{code:'storage-failed',cause:error});}
    for(const id of ack){const entry=queue.get(id);if(entry?.persisted&&JSON.stringify(entry.event)===JSON.stringify(rows.find(event=>event.id===id)))queue.delete(id);}if(!current())return this.state;
    const pending=await this.read(actor);if(!current())return this.state;
    this.state.pending=this.pending(actor,pending);this.state.records=Array.isArray(result.records)?result.records:[];
    if(result.rejected?.length)throw Object.assign(Error('Record rejected'),{code:result.rejected[0].code||'invalid_event'});
    if(!ack.length)throw Error('Delivery not acknowledged');
    this.attempts=0;this.state.status=this.status(actor,this.state.pending?'pending':'synced');
    this.state.nextRetry=this.state.status==='pending'?this.now()+1000+Math.floor(this.random()*1000):0;
   }catch(error){
    if(current()){
     this.state.status=this.status(actor,error?.code==='storage-failed'?'storage-failed':failureStatus(error));
     this.state.nextRetry=this.state.status==='pending'?this.now()+Math.min(300000,1000*2**Math.min(++this.attempts,8))+Math.floor(this.random()*1000):0;
    }
   }finally{if(current())this.emit();}
   return this.state;
  })();
  this.flight={epoch,promise};promise.finally(()=>{if(this.flight?.promise===promise)this.flight=null;});return promise;
 }
}
