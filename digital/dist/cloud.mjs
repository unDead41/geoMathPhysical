import {createClient} from '@supabase/supabase-js';
import {CLOUD_CONFIG} from './cloud-config.mjs';

const AUTH_REDIRECT='https://undead41.github.io/geodecoder-digital/';
const CALLBACK_KEYS=['access_token','refresh_token','provider_token','provider_refresh_token','token_type','expires_in','expires_at','type','error','error_code','error_description','code','token_hash'];
const LINK_ERROR='Pautan ini tidak sah atau sudah tamat. Minta pautan email baharu.';
const RECOVERY_KEY='geodecoder.cloud.recovery.intent';
function defaultRecoveryStorage(){try{return globalThis.sessionStorage;}catch{return null;}}
function recoverySessionId(session){try{const part=session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const claims=JSON.parse(atob(part.padEnd(Math.ceil(part.length/4)*4,'=')));return claims.sub===session.user.id&&typeof claims.session_id==='string'?claims.session_id:null;}catch{return null;}}
export function inspectAuthCallback(href){
  let url;try{url=new URL(href);}catch{return {present:false,kind:'none'};}
  const hash=new URLSearchParams(url.hash.slice(1));
  const present=CALLBACK_KEYS.some(key=>hash.has(key))||['code','token_hash','error','error_code'].some(key=>url.searchParams.has(key));
  if(!present)return {present:false,kind:'none'};
  if(hash.has('error')||hash.has('error_code')||url.searchParams.has('error'))return {present:true,kind:'error'};
  const valid=hash.get('access_token')&&hash.get('refresh_token')&&hash.get('token_type')==='bearer'&&Number(hash.get('expires_in'))>0;
  return {present:true,kind:valid?hash.get('type')==='recovery'?'recovery':'confirmation':'invalid'};
}
export function cleanAuthCallbackUrl(href){
  const url=new URL(href),hash=new URLSearchParams(url.hash.slice(1));
  for(const key of CALLBACK_KEYS){url.searchParams.delete(key);hash.delete(key);}
  return url.pathname+url.search+(hash.size?'#'+hash.toString():'');
}
function emailAddress(value){
  const email=typeof value==='string'?value.trim().toLowerCase():'';
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.endsWith('@accounts.geodecoder.invalid'))throw Error('Masukkan alamat email yang sah.');
  return email;
}
function emailError(error){
  if(error?.status===429||['over_email_send_rate_limit','over_request_rate_limit'].includes(error?.code))return 'Terlalu banyak permintaan email. Tunggu sebentar sebelum mencuba lagi.';
  return 'Email belum dapat dihantar. Cuba lagi kemudian.';
}
export class ClassroomCloud {
  constructor(config=CLOUD_CONFIG,options={}){this.config=config;this._client=null;this._session=null;this.listeners=new Set();this.roomId=null;this.roomScope=0;this.profile=null;this.room=null;this.heartbeatTimer=null;this.heartbeatPending=false;this.ready=!!config.url&&!!config.publishableKey;this._createClient=options.createClient||createClient;this._location=options.location||globalThis.location;this._history=options.history||globalThis.history;this._callback=inspectAuthCallback(this._location?.href);this.hasAuthCallback=this._callback.present;this.authCallbackHandled=false;this.callbackError='';this.recoveryRequired=false;this._recoveryStorage=options.recoveryStorage===undefined?defaultRecoveryStorage():options.recoveryStorage;this.hasRecoveryIntent=false;try{this.hasRecoveryIntent=!!this._recoveryStorage?.getItem(RECOVERY_KEY);}catch{}this._restoredRecovery=false;this._initialization=null;this._callbackEvent=new Promise(resolve=>{this._resolveCallback=resolve;});}
  get session(){return this._session;}
  _setSession(session){if(this._session?.user?.id!==session?.user?.id){if(this._session?.user?.id)this._clearRecovery();this.profile=null;this.room=null;this.roomId=null;this.roomScope++;this.recoveryRequired=false;}this._session=session;if(!session){this._clearRecovery();this.stopHeartbeat();}}
  _clearRecovery(){this.recoveryRequired=false;this.hasRecoveryIntent=false;try{this._recoveryStorage?.removeItem(RECOVERY_KEY);}catch{}}
  _rememberRecovery(session){
    this.recoveryRequired=true;this.stopHeartbeat();const sessionId=recoverySessionId(session);
    if(sessionId)try{this._recoveryStorage?.setItem(RECOVERY_KEY,JSON.stringify({userId:session.user.id,sessionId,expiresAt:Date.now()+1800000}));this.hasRecoveryIntent=true;}catch{}
  }
  async _restoreRecovery(session){
    if(this._restoredRecovery||this.hasAuthCallback)return;this._restoredRecovery=true;
    let intent;try{intent=JSON.parse(this._recoveryStorage?.getItem(RECOVERY_KEY)||'null');}catch{}
    if(!intent)return;
    if(intent.userId!==session?.user?.id||intent.sessionId!==recoverySessionId(session)||!Number.isFinite(intent.expiresAt)||intent.expiresAt<=Date.now()){this._clearRecovery();return;}
    // Intent is navigation state, never authorization. Verify the persisted
    // Auth session with the server before offering password reset after reload.
    const {data,error}=await this.client.auth.getUser();
    if(this._session?.user?.id!==session.user.id||recoverySessionId(this._session)!==intent.sessionId)return;
    if(error||data.user?.id!==session.user.id){this.callbackError=LINK_ERROR;return;}
    this.recoveryRequired=true;this.stopHeartbeat();
  }
  get client(){
    if(!this.ready)throw Error('Sambungan kelas belum dikonfigurasi. Latihan sendiri masih boleh dimainkan.');
    if(!this._client){
      this._client=this._createClient(this.config.url,this.config.publishableKey,{auth:{storageKey:'geodecoder.cloud.auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:['recovery','confirmation'].includes(this._callback.kind),flowType:'implicit'}});
      this._client.auth.onAuthStateChange((event,session)=>{
        this._setSession(session);
        if(event==='PASSWORD_RECOVERY'&&session?.user?.id){this._rememberRecovery(session);this.callbackError='';this._resolveCallback();}
        else if(event==='SIGNED_IN'&&session?.user?.id){this._resolveCallback();}
        setTimeout(()=>{for(const listener of this.listeners)listener(session);},0);
      });
    }
    return this._client;
  }
  async init(){
    if(!this._initialization)this._initialization=this._initCallback();
    await this._initialization;
    const {data,error}=await this.client.auth.getSession();if(error)throw Error('Sesi tidak dapat dibaca. Log masuk semula.');this._setSession(data.session);await this._restoreRecovery(data.session);if(this._session&&!this.recoveryRequired&&!this.callbackError)this.startHeartbeat();return this._session;
  }
  async _initCallback(){
    if(!this.hasAuthCallback)return;
    try{
      if(!['recovery','confirmation'].includes(this._callback.kind)){this.callbackError=LINK_ERROR;return;}
      const {error}=await this.client.auth.initialize();
      if(error){this.callbackError=LINK_ERROR;return;}
      // Auth-js queues its validated callback notification after initialize().
      await this._callbackEvent;
      if(this._callback.kind==='recovery'&&!this.recoveryRequired)this.callbackError=LINK_ERROR;
    }catch{this.callbackError=LINK_ERROR;}
    finally{this.authCallbackHandled=true;try{this._history?.replaceState(null,'',cleanAuthCallbackUrl(this._location.href));}catch{/* File origins may prohibit history updates. */}}
  }
  async auth(action,payload={}){
    if(action==='logout'){const {error}=await this.client.auth.signOut({scope:'local'});if(error)throw Error('Log keluar belum berjaya. Cuba lagi.');this._setSession(null);return {};}
    if(action==='recover-email'||action==='resend-confirmation'){
      const email=emailAddress(payload.email),redirect=this.config.authRedirectUrl||AUTH_REDIRECT;
      const {error}=action==='recover-email'?await this.client.auth.resetPasswordForEmail(email,{redirectTo:redirect}):await this.client.auth.resend({type:'signup',email,options:{emailRedirectTo:redirect}});
      if(error)throw Error(emailError(error));
      this.callbackError='';
      return {message:action==='recover-email'?'Jika email ini berdaftar, pautan reset akan dihantar. Semak peti masuk dan folder spam.':'Jika akaun ini menunggu pengesahan, email pengesahan akan dihantar. Semak peti masuk dan folder spam.'};
    }
    if(action==='reset-password'){
      if(!this.recoveryRequired||!this._session?.user?.id)throw Error(LINK_ERROR);
      if(typeof payload.password!=='string'||payload.password.length<10||payload.password.length>128)throw Error('Gunakan kata laluan antara 10 hingga 128 aksara.');
      const {error}=await this.client.auth.updateUser({password:payload.password});
      if(error)throw Error(error.code==='same_password'?'Gunakan kata laluan baharu yang berbeza.':'Kata laluan belum dapat dikemas kini. Minta pautan baharu jika pautan sudah tamat.');
      this._clearRecovery();
      const signedOut=await this.client.auth.signOut({scope:'global'});
      if(signedOut.error)throw Error('Kata laluan sudah dikemas kini. Log keluar dan log masuk semula menggunakan kata laluan baharu.');
      this._setSession(null);this.callbackError='';return {message:'Kata laluan sudah dikemas kini. Log masuk menggunakan kata laluan baharu.'};
    }
    const response=await fetch(this.config.url+'/functions/v1/geodecoder-auth',{method:'POST',headers:{apikey:this.config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({...payload,action}),signal:AbortSignal.timeout(20000)}).catch(()=>{throw Error('Sambungan akaun gagal. Semak Internet dan cuba lagi.');});
    const data=await response.json().catch(()=>({error:'Respons akaun tidak sah.'}));
    if(!response.ok||data.error)throw Error(typeof data.error==='string'?data.error:data.error?.message||'Tindakan akaun gagal.');
    this.callbackError='';this._clearRecovery();
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
