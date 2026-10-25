import {createClient} from '@supabase/supabase-js';
import {CLOUD_CONFIG} from './cloud-config.mjs';

export class ClassroomCloud {
  constructor(config=CLOUD_CONFIG){this.config=config;this._client=null;this._session=null;this.listeners=new Set();this.roomId=null;this.roomScope=0;this.profile=null;this.room=null;this.heartbeatTimer=null;this.heartbeatPending=false;this.ready=!!config.url&&!!config.publishableKey;}
  get session(){return this._session;}
  _setSession(session){if(this._session?.user?.id!==session?.user?.id){this.profile=null;this.room=null;this.roomId=null;this.roomScope++;}this._session=session;if(!session)this.stopHeartbeat();}
  get client(){
    if(!this.ready)throw Error('Sambungan kelas belum dikonfigurasi. Latihan sendiri masih boleh dimainkan.');
    if(!this._client){
      this._client=createClient(this.config.url,this.config.publishableKey,{auth:{storageKey:'geodecoder.cloud.auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
      this._client.auth.onAuthStateChange((_event,session)=>{this._setSession(session);setTimeout(()=>{for(const listener of this.listeners)listener(session);},0);});
    }
    return this._client;
  }
  async init(){const {data,error}=await this.client.auth.getSession();if(error)throw Error('Sesi tidak dapat dibaca. Log masuk semula.');this._setSession(data.session);if(this._session)this.startHeartbeat();return this._session;}
  async auth(action,payload={}){
    if(action==='logout'){const {error}=await this.client.auth.signOut({scope:'local'});if(error)throw Error('Log keluar belum berjaya. Cuba lagi.');this._setSession(null);return {};}
    const response=await fetch(this.config.url+'/functions/v1/geodecoder-auth',{method:'POST',headers:{apikey:this.config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({...payload,action}),signal:AbortSignal.timeout(20000)}).catch(()=>{throw Error('Sambungan akaun gagal. Semak Internet dan cuba lagi.');});
    const data=await response.json().catch(()=>({error:'Respons akaun tidak sah.'}));
    if(!response.ok||data.error)throw Error(typeof data.error==='string'?data.error:data.error?.message||'Tindakan akaun gagal.');
    if(data.session){const {error}=await this.client.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});if(error)throw Error('Sesi tidak dapat disimpan. Cuba log masuk semula.');this._setSession(data.session);this.startHeartbeat();}
    return data;
  }
  async rpc(action,payload={}){
    const identity=this._session?.user?.id,scope=this.roomScope;
    const {data,error}=await this.client.rpc('geo_action',{action,payload}).abortSignal(AbortSignal.timeout(20000));
    if(error)throw Error(error.message==='JWT expired'?'Sesi tamat. Log masuk semula.':error.message||'Sambungan kelas terganggu. Cuba lagi.');
    if(data?.error)throw Error(data.error.message||data.error||'Tindakan tidak dibenarkan.');
    if(identity===this._session?.user?.id){if(data?.profile)this.profile=data.profile;if(data?.room&&scope===this.roomScope)this.room=data.room;}
    return data;
  }
  onSessionChange(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
  setRoom(roomId){const next=roomId||null;if(next!==this.roomId)this.roomScope++;this.roomId=next;}
  startHeartbeat(){
    if(this.heartbeatTimer)return;
    const beat=async()=>{if(this.heartbeatPending||!this._session)return;this.heartbeatPending=true;try{await this.rpc('heartbeat',this.roomId?{room_id:this.roomId}:{});}catch{}finally{this.heartbeatPending=false;}};
    beat();this.heartbeatTimer=setInterval(beat,20000);
  }
  stopHeartbeat(){if(this.heartbeatTimer)clearInterval(this.heartbeatTimer);this.heartbeatTimer=null;}
  watch(roomId,onChange,onStatus=()=>{}){
    if(!/^[a-f0-9-]{36}$/i.test(roomId))throw Error('Room tidak sah.');
    let timer=null,closed=false;
    const channel=this.client.channel('geo-room-'+roomId).on('postgres_changes',{event:'*',schema:'public',table:'room_progress',filter:'room_id=eq.'+roomId},()=>{if(timer||closed)return;timer=setTimeout(()=>{timer=null;if(!closed)onChange();},200);}).subscribe(status=>{if(!closed)onStatus(status);});
    return()=>{closed=true;if(timer)clearTimeout(timer);this.client.removeChannel(channel);};
  }
}
