// The parent owns storage/network. The opaque learning iframe owns teaching UI.
import {retryDelay} from './network-policy.mjs';
export const MODULE_PROGRESS_KEY='geodecoder.module.progress.v1.';
export const MODULE_ACTIVITIES=['net','volume','area','composite'];
export const MODULE_STAGES=['prediction','experiment','check','explanation'];
export const MODULE_NAMES={net:'Bina bentangan',volume:'Makmal isi padu',area:'Terbitkan rumus',composite:'Bongkah gabungan'};
export const MODULE_STAGE_NAMES={prediction:'Ramalan direkod',experiment:'Eksperimen dicuba',check:'Semakan selesai',explanation:'Selesai latihan'};
const textLimits={prediction:240,result:600,explanation:600};
export function normalizeModuleRecord(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||!MODULE_ACTIVITIES.includes(value.activity)||!MODULE_STAGES.includes(value.stage)||typeof value.completed!=='boolean')return null;
  const record={activity:value.activity,stage:value.stage};
  for(const [key,limit] of Object.entries(textLimits)){
    const text=value[key]??'';
    if(typeof text!=='string'||text.length>limit||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text))return null;
    record[key]=text.trim();
  }
  const rank=MODULE_STAGES.indexOf(record.stage);
  if(!record.prediction||(rank>=1&&!record.result)||(rank===3&&!record.explanation))return null;
  if(value.completed&&(rank!==3||!record.explanation))return null;
  record.completed=value.completed;
  return record;
}
export function mergeModuleProgress(...groups){
  const records=new Map();
  for(const values of groups)for(const value of Array.isArray(values)?values.slice(0,16):[]){
    const next=normalizeModuleRecord(value);if(!next)continue;
    const old=records.get(next.activity);
    if(!old||(!old.completed&&(next.completed||MODULE_STAGES.indexOf(next.stage)>=MODULE_STAGES.indexOf(old.stage)))||(old.completed&&next.completed))records.set(next.activity,next);
  }
  return MODULE_ACTIVITIES.filter(id=>records.has(id)).map(id=>records.get(id));
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function createModuleSession(crypto=globalThis.crypto){
  if(crypto?.randomUUID)return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export class ModuleProgress {
  constructor({storage=null,cloud=null,onChange=()=>{},token=createModuleSession,random=Math.random,isOnline=()=>globalThis.navigator?.onLine!==false,syncAdapter=null,onRecord=null}={}){
    this.syncAdapter=syncAdapter;this.onRecord=onRecord;
    this.storage=storage;this.cloud=cloud;this.onChange=onChange;this.token=token;
    this.account=null;this._actor='guest';this._epoch=0;this._memory=new Map();this._records=[];this._pending=new Map();this._syncPromise=null;
    this._syncTimer=null;this._syncFailures=0;this._random=random;this._isOnline=isOnline;
    this.status='local';this.storageFailed=false;this.frame=null;this.session='';this.active=false;this.ready=false;this.theme='light';
    this._readLocal();
  }
  get state(){return {actor:this._actor,records:this._records.map(v=>({...v})),completed:this._records.filter(v=>v.completed).length,status:this.status,storageFailed:this.storageFailed};}
  get key(){return MODULE_PROGRESS_KEY+encodeURIComponent(this._actor);}
  get canSync(){return Boolean(this.account?.id&&this.account.role==='student'&&typeof this.cloud?.moduleProgress==='function');}
  _emit(){this.onChange(this.state);}
  _readLocal(){
    this._records=this._memory.get(this._actor)||[];
    try{
      const raw=this.storage?.getItem(this.key);
      if(raw&&raw.length<=20000){const saved=JSON.parse(raw);if(saved?.version===1)this._records=mergeModuleProgress(this._records,saved.records);}
    }catch{this.storageFailed=true;}
    this._memory.set(this._actor,this._records);
  }
  _persist(){
    const changed=this._records;this._readLocal();this._records=mergeModuleProgress(this._records,changed);this._memory.set(this._actor,this._records);
    try{if(!this.storage)throw Error('Storage unavailable');this.storage.setItem(this.key,JSON.stringify({version:1,records:this._records}));}catch{this.storageFailed=true;}
  }
  setAccount(account){
    const next=account?.id?{id:String(account.id),role:account.role}:null,actor=next?.id||'guest';
    if(actor===this._actor&&next?.role===this.account?.role)return;
    this._clearSyncTimer();this.close();this._epoch++;this._syncPromise=null;this._pending.clear();this._syncFailures=0;this.account=next;this._actor=actor;
    this.status='local';this.storageFailed=false;this._readLocal();this._emit();
  }
  open(frame){this.close();this.frame=frame;this.session=this.token();this.active=true;this.ready=false;}
  close(){this.active=false;this.ready=false;this.frame=null;this.session='';}
  setTheme(theme){this.theme=theme==='dark'?'dark':'light';this._sendContext();}
  _sendContext(){
    if(this.active&&this.ready&&this.frame)this.frame.postMessage({type:'geodecoder:module-context',protocol:1,session:this.session,theme:this.theme,progress:this.state.records},'*');
  }
  refreshLocal(){this._readLocal();this._emit();this._sendContext();}
  handleMessage(event){
    const data=event?.data;
    if(!this.active||event.source!==this.frame||!data||typeof data!=='object'||data.protocol!==1)return false;
    if(data.type==='geodecoder:module-ready'){this.ready=true;this._sendContext();return true;}
    if(!this.ready||data.type!=='geodecoder:module-progress'||data.session!==this.session)return false;
    const record=normalizeModuleRecord(data);if(!record)return false;
    const merged=mergeModuleProgress(this._records,[record]);
    if(same(merged,this._records))return true;
    this._records=merged;this._persist();
    if(this.canSync){this._pending.set(record.activity,this._records.find(r=>r.activity===record.activity));this.status='pending';}
    this._emit();
    if(this.canSync){
      // Persist every teaching event to the owner-bound outbox immediately.
      // Direct RPC saves retain the debounce/backoff policy when no adapter owns sync.
      if(this.onRecord)void this.onRecord(this._actor,record);
      else if(this.syncAdapter)void this.sync();
      else if(!this._syncPromise)this._scheduleSync();
    }
    return true;
  }
  applyOfflineState({actor,records=[],status='pending'}){
    if(actor!==this._actor||!this.canSync)return;
    const merged=mergeModuleProgress(records,this._records);
    if(!same(merged,this._records)){this._records=merged;this._persist();this._sendContext();}
    this.status=['synced','syncing'].includes(status)?status:'pending';this._emit();
  }
  _clearSyncTimer(){if(this._syncTimer)clearTimeout(this._syncTimer);this._syncTimer=null;}
  _scheduleSync(delay=500){
    this._clearSyncTimer();const epoch=this._epoch;
    this._syncTimer=setTimeout(()=>{this._syncTimer=null;if(epoch===this._epoch)void this.sync();},delay);
    this._syncTimer?.unref?.();
  }
  sync(){
    this._clearSyncTimer();
    if(this.syncAdapter)return this.syncAdapter(this);
    if(!this.canSync)return Promise.resolve();
    if(this._syncPromise)return this._syncPromise;
    if(!this._isOnline()){this.status='pending';this._emit();if(this._syncFailures++<5)this._scheduleSync(30000);return Promise.resolve();}
    const epoch=this._epoch,actor=this._actor,current=()=>epoch===this._epoch&&actor===this._actor;
    const task=(async()=>{
      this.status='syncing';this._emit();
      try{
        const data=await this.cloud.moduleProgress('mine',{},{expectedUserId:actor});if(!current())return;
        const remote=mergeModuleProgress(data?.records),local=mergeModuleProgress(remote,this._records);
        this._records=local;this._persist();
        for(const record of this._records){const saved=remote.find(r=>r.activity===record.activity);if(!same(record,saved))this._pending.set(record.activity,record);}
        this._sendContext();
        while(this._pending.size){
          const [activity,record]=this._pending.entries().next().value;
          const saved=await this.cloud.moduleProgress('save',record,{expectedUserId:actor});if(!current())return;
          this._records=mergeModuleProgress(saved?.records,this._records);this._persist();
          if(this._pending.get(activity)===record)this._pending.delete(activity);
        }
        this.status='synced';this._syncFailures=0;
      }catch{if(current()){this.status='pending';this._syncFailures++;}}
      finally{if(current()){this._syncPromise=null;this._emit();this._sendContext();if(this.status==='pending'&&this._syncFailures<=5)this._scheduleSync(retryDelay(this._syncFailures-1,{baseMs:1000,maxMs:30000,random:this._random}));}}
    })();
    this._syncPromise=task;return task;
  }
}
