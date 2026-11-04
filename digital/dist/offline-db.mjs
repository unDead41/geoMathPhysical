import {normalizeOfflineEvent,isAccount} from './offline-records.mjs';

// Credentials are owned exclusively by Auth. This database contains formative data.
export class OfflineDB {
 constructor({indexedDB=globalThis.indexedDB,name='geodecoder.offline.v1'}={}){this.indexedDB=indexedDB;this.name=name;this.connection=null;}
 open(){
  if(this.connection)return this.connection;
  const pending=new Promise((resolve,reject)=>{
   if(!this.indexedDB){reject(Error('Offline storage unavailable'));return;}
   let settled=false;const request=this.indexedDB.open(this.name,1);
   const fail=error=>{if(!settled){settled=true;clearTimeout(timer);reject(error);}};
   const timer=setTimeout(()=>fail(Error('Offline storage blocked')),5000);
   request.onupgradeneeded=()=>{
    const db=request.result;
    if(!db.objectStoreNames.contains('outbox')){
     const queue=db.createObjectStore('outbox',{keyPath:'seq',autoIncrement:true});
     queue.createIndex('owner','owner');queue.createIndex('event',['owner','id'],{unique:true});
    }
   };
   request.onerror=()=>fail(request.error||Error('Offline storage unavailable'));
   request.onsuccess=()=>{
    if(settled){request.result.close();return;}
    settled=true;clearTimeout(timer);const db=request.result;
    db.onversionchange=()=>{db.close();this.connection=null;};resolve(db);
   };
  });
  this.connection=pending;pending.catch(()=>{if(this.connection===pending)this.connection=null;});return pending;
 }
 async enqueue(value){
  const event=normalizeOfflineEvent(value);if(!event)throw Error('Invalid offline record');
  const db=await this.open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction('outbox','readwrite'),store=tx.objectStore('outbox');let error;
   const existing=store.index('event').get([event.owner,event.id]);
   existing.onsuccess=()=>{
    if(existing.result){
     const previous=normalizeOfflineEvent(existing.result);
     if(JSON.stringify(previous)!==JSON.stringify(event)){error=Error('Offline event ID already used');tx.abort();}
     return;
    }
    const count=store.index('owner').count(event.owner);
    count.onsuccess=()=>{if(count.result>=2000){error=Error('Offline queue full');tx.abort();}else store.add(event);};
   };
   tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(error||tx.error||Error('Offline save failed'));
  });
 }
 async list(owner){
  if(!isAccount(owner))return [];
  const db=await this.open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction('outbox'),request=tx.objectStore('outbox').index('owner').getAll(owner);
   let rows=[];request.onsuccess=()=>{rows=request.result.sort((a,b)=>a.seq-b.seq).map(normalizeOfflineEvent);};
   tx.oncomplete=()=>{if(rows.some(v=>!v))reject(Error('Damaged offline queue'));else resolve(rows);};
   tx.onabort=tx.onerror=()=>reject(tx.error||Error('Offline read failed'));
  });
 }
 async ack(owner,ids){
  if(!isAccount(owner)||!Array.isArray(ids)||ids.length>20)throw Error('Invalid acknowledgement');
  const db=await this.open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction('outbox','readwrite'),store=tx.objectStore('outbox');
   for(const id of ids){const key=store.index('event').getKey([owner,id]);key.onsuccess=()=>{if(key.result!==undefined)store.delete(key.result);};}
   tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(tx.error||Error('Offline acknowledgement failed'));
  });
 }
}
