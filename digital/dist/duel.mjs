import {formatTime} from './core.mjs';
// Public endpoint only. Privileged keys and score validation remain on the server.
export const DUEL_ENDPOINT='https://fkrlwzxvyufndavlpzbp.supabase.co/functions/v1/geodecoder-duel';
// Publishable project identifier, not a privileged key or player credential.
export const DUEL_PUBLIC_KEY="sb_publishable_IxeJeTwOUh2zy-vnCvWRLQ_DDA4SqOd";
export const DUEL_SESSION_KEY='geodecoder.digital.duel.v1.session';
export const DUEL_PROTOCOL=2;
export function formatDuelTime(ms){const value=Number.isFinite(ms)?Math.max(0,Math.floor(ms)):0;return formatTime(value)+'.'+String(value%1000).padStart(3,'0');}
export function makeDuelToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),value=>value.toString(16).padStart(2,'0')).join('');}
export function duelVerdict(snapshot){
  if(snapshot?.room.status!=='complete')return 'duel.waitFinish';
  return !snapshot.room.winnerId?'duel.draw':snapshot.room.winnerId===snapshot.me.id?'duel.youWin':'duel.youLose';
}
export class DuelClient{
  constructor({storage=null,endpoint=DUEL_ENDPOINT,onChange=()=>{},requestTimeoutMs=25000}={}){
    this.storage=storage;this.endpoint=endpoint;this.onChange=onChange;
    this.requestTimeoutMs=requestTimeoutMs;
    this.session=null;this.snapshot=null;this.connected=false;this.error='';this.busy=false;this.timer=null;this.polling=false;this.generation=0;this.receivedAt=0;this.lastClock=0;
    this.pollEpoch=0;this.refreshInFlight=null;this.controllers=new Set();this.requestSerial=0;this.lastAcceptedSerial=0;
    try{const value=JSON.parse(storage?.getItem(DUEL_SESSION_KEY)||'null');if(value&&/^[a-f0-9]{64}$/.test(value.token)&&(!value.roomId||/^[\da-f-]{36}$/.test(value.roomId)))this.session=value;}catch{/* A denied session store does not block online play. */}
  }
  get hasSession(){return !!this.session;}
  get pending(){return !!this.session?.pending;}
  save(){try{if(this.session)this.storage?.setItem(DUEL_SESSION_KEY,JSON.stringify(this.session));else this.storage?.removeItem(DUEL_SESSION_KEY);}catch{/* Keep the live session in memory. */}}
  notify(){this.onChange(this.snapshot);}
  clock(){const value=(this.snapshot?.serverNow||0)+Math.max(0,performance.now()-this.receivedAt);this.lastClock=Math.max(this.lastClock,value);return this.lastClock;}
  elapsed(){const s=this.snapshot;return s?.me.finishedAt?s.me.elapsed:Math.max(0,this.clock()-(s?.room.startsAt||this.clock()));}
  isCurrent({generation,session}){return generation===this.generation&&session===this.session;}
  accept(snapshot,serial=0){
    if(snapshot?.protocol!==DUEL_PROTOCOL||!snapshot?.ok||!snapshot.room?.id||!snapshot.me?.id||!Number.isFinite(snapshot.serverNow))throw Object.assign(new Error('invalid_response'),{code:'invalid_response'});
    if(!this.session)throw Object.assign(new Error('stale_request'),{code:'stale_request'});
    if(this.session.roomId&&snapshot.room.id!==this.session.roomId||this.snapshot&&snapshot.me.id!==this.snapshot.me.id)throw Object.assign(new Error('invalid_response'),{code:'invalid_response'});
    if(this.snapshot&&(snapshot.me.seq<this.snapshot.me.seq||snapshot.serverNow<this.snapshot.serverNow))return false;
    this.snapshot=snapshot;this.receivedAt=performance.now();this.connected=true;this.error='';
    this.lastAcceptedSerial=Math.max(this.lastAcceptedSerial,serial);
    this.session.roomId=snapshot.room.id;this.save();this.notify();
    return true;
  }
  async request(body,context={generation:this.generation,session:this.session}){
    if(!this.isCurrent(context))throw Object.assign(new Error('stale_request'),{code:'stale_request'});
    const serial=++this.requestSerial,controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),this.requestTimeoutMs);
    this.controllers.add(controller);
    try{
      const response=await fetch(this.endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:DUEL_PUBLIC_KEY},body:JSON.stringify({...body,protocol:DUEL_PROTOCOL}),signal:controller.signal,credentials:'omit',cache:'no-store'});
      const data=await response.json();
      if(!this.isCurrent(context))throw Object.assign(new Error('stale_request'),{code:'stale_request'});
      if(response.status===400&&data.error==='invalid_request'&&response.headers.get('X-GeoDecoder-Duel-Protocol')!=='2')throw Object.assign(new Error('backend_update_required'),{code:'backend_update_required'});
      if(!response.ok||!data.ok)throw Object.assign(new Error(data.error||'server_error'),{code:data.error||'server_error'});
      this.accept(data,serial);return this.snapshot;
    }catch(error){
      const current=this.isCurrent(context);
      const code=!current?'stale_request':typeof error.code==='string'&&error.name!=='AbortError'&&error.name!=='TimeoutError'?error.code:'network_error';
      // A failed older poll must not override a newer confirmed answer.
      if(current&&serial>=this.lastAcceptedSerial){this.connected=false;this.error=code;this.notify();}
      throw Object.assign(new Error(code,{cause:error}),{code});
    }finally{clearTimeout(timeout);this.controllers.delete(controller);}
  }
  async mutate(body){
    if(this.busy)throw Object.assign(new Error('busy'),{code:'busy'});
    const context={generation:this.generation,session:this.session};
    if(!context.session)throw Object.assign(new Error('not_connected'),{code:'not_connected'});
    this.busy=true;this.session.pending=body;this.save();
    try{
      let result;
      for(let attempt=0;attempt<2;attempt++){
        try{result=await this.request(body,context);break;}catch(error){if(!['network_error','server_error'].includes(error.code)||attempt===1)throw error;await new Promise(r=>setTimeout(r,300));}
      }
      if(!this.isCurrent(context))throw Object.assign(new Error('stale_request'),{code:'stale_request'});
      if(this.session.pending===body){this.session.pending=null;this.save();}
      return result;
    }catch(error){
      if(this.isCurrent(context)&&this.session.pending===body&&!['network_error','server_error'].includes(error.code)){this.session.pending=null;this.save();}
      throw error;
    }finally{if(this.isCurrent(context)){this.busy=false;this.notify();}}
  }
  create(name){
    if(this.session?.roomId)throw Object.assign(new Error('active_room'),{code:'active_room'});
    this.session=this.session||{token:makeDuelToken(),roomId:null,pending:null};
    return this.mutate(this.session.pending||{action:'create',token:this.session.token,name});
  }
  join(name,code){
    if(this.session?.roomId)throw Object.assign(new Error('active_room'),{code:'active_room'});
    this.session=this.session||{token:makeDuelToken(),roomId:null,pending:null};
    return this.mutate(this.session.pending||{action:'join',token:this.session.token,name,code});
  }
  async resume(){
    if(!this.session)return null;
    if(this.session.pending)return this.mutate(this.session.pending);
    return this.refresh();
  }
  async refresh(){
    if(!this.session?.roomId)return null;
    const context={generation:this.generation,session:this.session};
    if(this.refreshInFlight&&this.isCurrent(this.refreshInFlight))return this.refreshInFlight.promise;
    const flight={...context,promise:null};
    flight.promise=(async()=>{
      const result=await this.request({action:'state',roomId:context.session.roomId,token:context.session.token},context);
      if(this.isCurrent(context)&&this.session.pending?.seq<=result.me.seq){this.session.pending=null;this.save();this.notify();}
      return result;
    })().finally(()=>{if(this.refreshInFlight===flight)this.refreshInFlight=null;});
    this.refreshInFlight=flight;return flight.promise;
  }
  act(action,details={}){
    if(this.pending)throw Object.assign(new Error('pending_action'),{code:'pending_action'});
    if(!this.snapshot)throw Object.assign(new Error('not_connected'),{code:'not_connected'});
    const body={action,roomId:this.session.roomId,token:this.session.token,seq:this.snapshot.me.seq+1};
    for(const key of ['questionIndex','kind','shape','target'])if(details[key]!==undefined)body[key]=details[key];
    return this.mutate(body);
  }
  startPolling(){
    if(this.polling)return;this.polling=true;const epoch=++this.pollEpoch;
    const poll=async()=>{
      if(!this.polling||epoch!==this.pollEpoch)return;
      try{if(!this.busy)await this.refresh();}catch{/* Status is visible; retry without clearing the session. */}
      if(this.polling&&epoch===this.pollEpoch)this.timer=setTimeout(poll,this.connected?2000:5000);
    };
    this.timer=setTimeout(poll,2000);
  }
  stopPolling(){this.polling=false;this.pollEpoch++;clearTimeout(this.timer);this.timer=null;}
  forget(){
    this.stopPolling();this.generation++;
    for(const controller of this.controllers)controller.abort();
    this.controllers.clear();this.refreshInFlight=null;this.busy=false;
    this.session=null;this.snapshot=null;this.connected=false;this.error='';this.lastClock=0;this.receivedAt=0;this.lastAcceptedSerial=0;this.save();this.notify();
  }
}
