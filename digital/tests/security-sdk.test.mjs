import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {runAccountSecurity,withAccountSessionLock} from '../dist/account-security.mjs';

const user={id:'00000000-0000-4000-8000-000000000041',email:'legacy@accounts.geodecoder.invalid',aud:'authenticated',role:'authenticated',created_at:'2026-10-26T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{}};
const jwt=sid=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,session_id:sid,exp:4102444800,iat:1792972800,aud:'authenticated',role:'authenticated'})).toString('base64url'),Buffer.from('fixture-signature').toString('base64url')].join('.');
const session=sid=>({access_token:jwt(sid),refresh_token:'fixture-refresh-'+sid,token_type:'bearer',expires_in:3600,expires_at:4102444800,user});
function fixture(status=204){
  const calls=[],original=session('original');
  const fetcher=async(input,init)=>{
    const url=new URL(typeof input==='string'?input:input.url),body=init?.body?JSON.parse(init.body):null;
    calls.push({path:url.pathname,scope:url.searchParams.get('scope'),method:init.method,body,authorization:new Headers(init.headers).get('Authorization')});
    if(url.pathname==='/auth/v1/user')return Response.json(user);
    if(url.pathname==='/auth/v1/token')return Response.json(session('reauthenticated'));
    if(url.pathname==='/auth/v1/logout')return status===204?new Response(null,{status}):Response.json({code:'bad_jwt',msg:'sensitive-provider-message'},{status});
    throw Error('Unexpected SDK request');
  };
  return {calls,context:{config:{url:'https://fixture.supabase.co',publishableKey:'fixture-public-key'},createClient,getSession:()=>original,fetcher}};
}
test('real pinned SDK changes a legacy account password on the newly verified token, then cleans its temporary session',async()=>{
  const f=fixture();const result=await runAccountSecurity(f.context,'change-password',{current_password:' Current#41 ',password:' New Pass#41 ',password_confirm:' New Pass#41 '});
  assert.equal(result.passwordChanged,true);
  const token=f.calls.find(c=>c.path==='/auth/v1/token');assert.deepEqual(token.body,{email:user.email,password:' Current#41 ',gotrue_meta_security:{}});
  const update=f.calls.find(c=>c.method==='PUT');assert.deepEqual(update.body,{password:' New Pass#41 ',current_password:' Current#41 ',code_challenge:null,code_challenge_method:null});
  assert.equal(update.authorization,'Bearer '+jwt('reauthenticated'));
  assert.ok(f.calls.some(c=>c.path==='/auth/v1/logout'&&c.scope==='local'));
});
test('real SDK swallowed invalid-token logout errors cannot become a successful global logout',async()=>{
  for(const status of [401,403,404]){
    const f=fixture(status);await assert.rejects(runAccountSecurity(f.context,'logout-all'),e=>e.code==='unconfirmed-logout');
    assert.equal(f.calls.filter(c=>c.scope==='global').length,1);
  }
  const f=fixture();assert.equal((await runAccountSecurity(f.context,'logout-all')).globalSignedOut,true);
});

test('leaving after reauthentication still gives verifier cleanup an independent live request signal',async()=>{
  const f=fixture(),controller=new AbortController(),fetcher=f.context.fetcher;
  let cleanupAborted;
  f.context.signal=controller.signal;
  f.context.fetcher=async(input,init)=>{
    const path=new URL(input).pathname;
    if(path==='/auth/v1/logout')cleanupAborted=init.signal.aborted;
    const response=await fetcher(input,init);
    if(path==='/auth/v1/token')controller.abort();
    return response;
  };
  await assert.rejects(runAccountSecurity(f.context,'change-password',{current_password:' Current#41 ',password:' New Pass#41 ',password_confirm:' New Pass#41 '}),e=>e.code==='cancelled');
  assert.equal(cleanupAborted,false);assert.ok(!f.calls.some(c=>c.method==='PUT'));
});

test('denied browser Locks falls back without replaying a task that already began',async()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');let calls=0;
  try{
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async()=>{throw new DOMException('Denied','SecurityError');}}}});
    assert.equal(await withAccountSessionLock(async()=>{calls++;return 'completed';}),'completed');assert.equal(calls,1);
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(_name,task)=>task()}}});
    await assert.rejects(withAccountSessionLock(async()=>{calls++;throw Error('Operation failed');}),/Operation failed/);
    assert.equal(calls,2);
  }finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});
