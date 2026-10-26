import {createClient} from '@supabase/supabase-js';
import {ClassroomCloud} from '../../../dist/cloud.mjs';
import {CLOUD_CONFIG} from '../../../dist/cloud-config.mjs';
import {createPortal} from '../../../dist/portal.mjs';

const qaAddress=value=>/^qa-session-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}@accounts\.geodecoder\.invalid$/.test(value);
export function createQACloud(createSDK=createClient){
  const cloud=new ClassroomCloud(CLOUD_CONFIG,{recoveryStorage:null,createClient:(url,key,options)=>createSDK(url,key,{
    ...options,auth:{...options.auth,storageKey:'geodecoder.qa.'+Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join(''),persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{...options.global,fetch:options.global?.fetch||((input,init={})=>fetch(input,{...init,signal:init.signal?AbortSignal.any([init.signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)}))}
  })});
  cloud.startHeartbeat=()=>{};
  const auth=cloud.auth.bind(cloud);
  cloud.auth=(action,...args)=>{
    if(!['logout','logout-current','logout-others','logout-all'].includes(action)||!qaAddress(cloud.session?.user?.email||''))return Promise.reject(Object.assign(Error('Tindakan dibatalkan.'),{code:'unsupported'}));
    return auth(action,...args);
  };
  return cloud;
}

/** Test-only wrapper; production portal and Auth session service are reused. */
export function createLiveSessionQA({root,cloud=createQACloud(),portalFactory=createPortal}){
  const doc=root.ownerDocument,view=doc.defaultView,find=id=>root.querySelector('#'+id);
  const login=find('qa-login'),passwordInput=find('qa-password'),status=find('qa-status');
  let busy=false,destroyed=false,epoch=0,authenticated=false;
  const events=[];
  const results=()=>({kind:'manual-hosted-session-QA',profile:['A','B','C'].includes(find('qa-profile').value)?find('qa-profile').value:'A',allAcceptanceChecksVerified:false,events:events.map(event=>({...event}))});
  const message=text=>{if(!destroyed)status.textContent=text;};
  const record=(type,details={})=>{
    if(destroyed)return;
    events.push({time:new Date().toISOString(),type,...details});if(events.length>50)events.shift();
    find('qa-observations').textContent=JSON.stringify(results(),null,2);
  };
  function update(){
    login.hidden=authenticated;
    for(const control of login.querySelectorAll('input,button'))control.disabled=busy;
    for(const control of root.querySelectorAll('[data-qa-auth]'))control.disabled=busy||!authenticated;
  }
  const portal=portalFactory({cloud,onExit:()=>message('Paparan ditutup. Sesi QA masih log masuk; buka semula halaman keselamatan untuk log keluar.')});
  const stop=cloud.onSessionChange(()=>{
    if(authenticated&&!cloud.session){authenticated=false;passwordInput.value='';portal.close();record('auth-signed-out');update();}
  });
  async function signin(event){
    event.preventDefault();if(busy||destroyed)return;
    const email=find('qa-email').value.trim().toLowerCase();let password=passwordInput.value;
    passwordInput.value='';
    if(!qaAddress(email)||!password||password.length>128){password='';message('Masukkan email akaun QA khusus dan kata laluan yang sah. Akaun murid/guru tidak diterima.');return;}
    busy=true;const token=++epoch;update();message('Menghubungi Auth untuk akaun QA…');
    try{
      const {data,error}=await cloud.client.auth.signInWithPassword({email,password});
      if(destroyed||token!==epoch)return;
      if(error||!data?.session||data.user?.email?.toLowerCase()!==email)throw Error('qa-signin-failed');
      await cloud.init();if(destroyed||token!==epoch)return;
      authenticated=true;record('qa-signin-acknowledged');update();
      await portal.open({security:true});
      if(!destroyed&&token===epoch)message('Sesi QA log masuk. Semak senarai sebenar dalam halaman keselamatan di bawah.');
    }catch{
      if(!destroyed&&token===epoch){record('qa-signin-unconfirmed');message('Log masuk QA belum berjaya. Semak akaun, kata laluan dan sambungan Internet.');}
    }finally{password='';passwordInput.value='';if(!destroyed&&token===epoch){busy=false;update();}}
  }
  async function action(kind){
    if(busy||!authenticated||destroyed)return;
    busy=true;const token=epoch;update();
    try{
      if(kind==='open'){await portal.open({security:true});return;}
      if(kind==='inspect'){
        const data=await cloud.securitySessions();if(destroyed||token!==epoch||!authenticated)return;
        record('list-observed',{record_count:data.sessions.length,current_count:data.sessions.filter(row=>row.is_current).length,truncated:data.truncated});
        message('Permintaan senarai dijawab oleh RPC. Bilangan dan label sesi semasa direkodkan tanpa metadata peranti.');return;
      }
      const {data,error}=await cloud.client.auth.refreshSession();
      if(destroyed||token!==epoch)return;
      if(!error&&data?.session){record('refresh-accepted');message('Auth menerima pembaharuan sesi ini.');}
      else if(['refresh_token_not_found','session_not_found','session_expired','refresh_token_already_used'].includes(error?.code)){
        record('refresh-rejected',{provider_code:error.code});message('Auth menolak pembaharuan sesi ini. Pemerhatian ini perlu dibandingkan dengan tindakan pembatalan pada profil A.');
      }else{record('refresh-unconfirmed');message('Pembaharuan belum dapat disahkan. Semak Internet; ini belum membuktikan sesi dibatalkan.');}
    }catch{
      if(!destroyed&&token===epoch){record(kind+'-unconfirmed');message('Permintaan QA belum dapat disahkan. Semak sambungan dan sesi anda.');}
    }finally{if(!destroyed&&token===epoch){busy=false;update();}}
  }
  const handlers=[];
  function bind(id,event,handler){find(id).addEventListener(event,handler);handlers.push(()=>find(id).removeEventListener(event,handler));}
  bind('qa-login','submit',signin);
  for(const [id,kind] of [['qa-open','open'],['qa-inspect','inspect'],['qa-refresh-token','refresh']])bind(id,'click',()=>void action(kind));
  bind('qa-language','change',()=>{doc.documentElement.lang=find('qa-language').value==='en'?'en':'ms';portal.localize();});
  bind('qa-theme','click',()=>{doc.documentElement.dataset.theme=doc.documentElement.dataset.theme==='dark'?'light':'dark';});
  bind('qa-export','click',()=>{
    if(typeof view.URL.createObjectURL!=='function'){message('Eksport fail tidak tersedia dalam pelayar ini. Pemerhatian masih boleh disalin dari paparan.');return;}
    const url=view.URL.createObjectURL(new view.Blob([JSON.stringify(results(),null,2)],{type:'application/json'}));
    const link=doc.createElement('a');link.href=url;link.download='GeoDecoder_Session_QA_'+results().profile+'.json';link.click();view.URL.revokeObjectURL(url);
  });
  update();
  return {results,destroy(){destroyed=true;epoch++;passwordInput.value='';for(const remove of handlers)remove();stop();portal.destroy();cloud.stopHeartbeat?.();}};
}
