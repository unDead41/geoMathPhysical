import {createClient} from '@supabase/supabase-js';
import {ClassroomCloud} from '../dist/cloud.mjs';
export const actor='00000000-0000-4000-8000-000000000041';
export const user={id:actor,email:'qa@example.test',aud:'authenticated',role:'authenticated',created_at:'2026-10-26T00:00:00Z',app_metadata:{},user_metadata:{}};
export const jwt=(id=actor,sid='current')=>[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:id,session_id:sid,exp:4102444800,aud:'authenticated',role:'authenticated'})).toString('base64url'),'fixture'].join('.');
export const session=(id=actor,sid='current')=>({access_token:jwt(id,sid),refresh_token:'fixture-refresh-'+sid,expires_in:3600,expires_at:4102444800,token_type:'bearer',user:{...user,id}});
export function fixture(){
  const calls=[];
  const state={mode:'success',hold:null,current:session(),listCalls:0,logouts:[],data:{server_now:'2026-10-26T08:00:00Z',capabilities:{revoke_individual:false},truncated:false,sessions:[
    {is_current:true,started_at:'2026-10-26T07:00:00Z',user_agent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36',status:'recorded'},
    {is_current:false,started_at:'2026-10-25T01:30:00Z',user_agent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile Safari/604.1',status:'recorded'}]}};
  const fetcher=async(input,init={})=>{
    const url=new URL(typeof input==='string'?input:input.url);
    calls.push({path:url.pathname,scope:url.searchParams.get('scope'),body:init.body?JSON.parse(init.body):null,authorization:new Headers(init.headers).get('authorization')});
    if(url.pathname==='/auth/v1/user')return Response.json(state.current.user);
    if(url.pathname==='/auth/v1/logout'){
      state.logouts.push(url.searchParams.get('scope'));await state.hold;
      if(state.mode==='logout-denied')return Response.json({code:'bad_jwt',msg:'DO NOT DISPLAY PROVIDER DETAILS'},{status:401});
      if(url.searchParams.get('scope')==='others')state.data.sessions=state.data.sessions.filter(row=>row.is_current);
      return new Response(null,{status:204});
    }
    if(url.pathname==='/rest/v1/rpc/geo_security_sessions'){
      state.listCalls++;await state.hold;
      if(state.mode==='network')throw new TypeError('DO NOT DISPLAY PROVIDER DETAILS');
      if(state.mode==='expired')return Response.json({code:'PGRST303',message:'JWT expired'},{status:401});
      if(state.mode==='unavailable')return Response.json({code:'PGRST202',message:'DO NOT DISPLAY PROVIDER DETAILS'},{status:404});
      return Response.json(state.data);
    }
    if(url.pathname==='/rest/v1/rpc/geo_action')return Response.json({profile:{id:actor,username:'qa_pelajar',display_name:'QA Pelajar',role:'student'},classes:[],rooms:[],invites:[]});
    throw Error('Unexpected controlled request '+url.pathname);
  };
  const cloud=new ClassroomCloud({url:'https://fixture.supabase.co',publishableKey:'fixture-public-key'},{fetch:fetcher,location:{href:'https://fixture.example/'},recoveryStorage:null,createClient:(url,key,options)=>createClient(url,key,{...options,auth:{...options.auth,persistSession:false,autoRefreshToken:false},global:{...options.global,fetch:options.global?.fetch||fetcher}})});
  cloud.startHeartbeat=()=>{};
  const init=async()=>{await cloud.client.auth.setSession(state.current);await cloud.init();};
  const switchAccount=async(id='00000000-0000-4000-8000-000000000042')=>{state.current=session(id,'replacement');await cloud.client.auth.setSession(state.current);};
  return {cloud,state,calls,init,switchAccount};
}
