// Local-only browser QA entry. Build into ignored artifacts; never into the app.
import {createClient} from '@supabase/supabase-js';
import {ClassroomCloud} from '../dist/cloud.mjs';
import {createPortal} from '../dist/portal.mjs';
import {initTheme} from '../dist/theme.mjs';

const user={id:'00000000-0000-4000-8000-000000000041',email:'fixture@example.test',aud:'authenticated',role:'authenticated',created_at:'2026-10-26T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{}};
const encode=value=>btoa(JSON.stringify(value)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const jwt=sid=>encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,session_id:sid,exp:4102444800,iat:1792972800,aud:'authenticated'})+'.Zml4dHVyZQ';
const session=sid=>({access_token:jwt(sid),refresh_token:'fixture-refresh-'+sid,token_type:'bearer',expires_in:3600,expires_at:4102444800,user});
let scenario='success',updates=0,globalRequests=0,tokenRequests=0,otherSessions=true;
initTheme();
const counters=()=>{document.getElementById('qa-counts').textContent=`Permintaan ujian: pengesahan ${tokenRequests} · perubahan ${updates} · global ${globalRequests}`;};
document.getElementById('qa-scenario').addEventListener('change',event=>{scenario=event.target.value;});
const fetcher=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url),body=init.body?JSON.parse(init.body):{};
  if(scenario==='network')throw new TypeError('Controlled network failure');
  if(scenario==='slow')await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,1500);init.signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));},{once:true});});
  if(url.pathname==='/auth/v1/user') {
    if(scenario==='expired')return Response.json({code:'bad_jwt',msg:'Expired fixture'},{status:401});
    if(init.method==='PUT') { updates++;counters();if(scenario==='uncertain')throw new TypeError('Controlled lost update response'); }
    return Response.json(user);
  }
  if(url.pathname==='/auth/v1/token') {
    tokenRequests++;counters();
    if(scenario==='credentials'||body.password!=='Fixture Current#41')return Response.json({code:'invalid_credentials',msg:'Invalid fixture credentials'},{status:400});
    return Response.json(session('reauthenticated'));
  }
  if(url.pathname==='/auth/v1/logout') {
    if(url.searchParams.get('scope')==='global'){globalRequests++;counters();if(scenario==='global-denied')return Response.json({code:'bad_jwt',msg:'Rejected fixture'},{status:401});}
    if(url.searchParams.get('scope')==='others')otherSessions=false;
    return new Response(null,{status:204});
  }
  if(url.pathname==='/rest/v1/rpc/geo_security_sessions'){
    if(scenario==='expired')return Response.json({error:{code:'session-expired'}});
    return Response.json({server_now:new Date().toISOString(),capabilities:{revoke_individual:false},truncated:false,sessions:[
      {is_current:true,started_at:'2026-10-26T01:00:00Z',user_agent:'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36',status:'recorded'},
      ...(otherSessions?[{is_current:false,started_at:'2026-10-25T04:15:00Z',user_agent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile Safari/604.1',status:'recorded'}]:[])]});
  }
  if(url.pathname==='/rest/v1/rpc/geo_action')return Response.json({profile:{id:user.id,username:'pelajar_ujian',display_name:'Akaun Ujian',role:'student'},classes:[],rooms:[],invites:[],server_now:new Date().toISOString()});
  throw Error('Unexpected local fixture request');
};
const cloud=new ClassroomCloud({url:'https://fixture.supabase.co',publishableKey:'fixture-public-key'},{fetch:fetcher,location:{href:'http://localhost/'},recoveryStorage:null,createClient:(url,key,options)=>createClient(url,key,{...options,auth:{...options.auth,persistSession:false,autoRefreshToken:false,storageKey:'qa.fixture.'+crypto.randomUUID()},global:{...options.global,fetch:options.global?.fetch||fetcher}})});
cloud.startHeartbeat=()=>{};
await cloud.client.auth.setSession(session('original'));
const portal=createPortal({cloud,onExit:()=>{document.getElementById('qa-reopen').hidden=false;}});
document.getElementById('qa-reopen').addEventListener('click',async event=>{event.target.hidden=true;await portal.open();});
await portal.open({security:true});
