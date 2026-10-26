import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ClassroomCloud} from '../dist/cloud.mjs';

const jwt=(id,sid)=>'header.'+Buffer.from(JSON.stringify({sub:id,session_id:sid,exp:4102444800})).toString('base64url')+'.signature';
const values=()=>({current_password:' Current Pass#41 ',password:' New Password#41 ',password_confirm:' New Password#41 '});
function fixture(){
  const calls=[];
  const original={access_token:jwt('account-a','session-a'),refresh_token:'original-refresh',user:{id:'account-a',email:'canonical@example.com'}};
  let event,isolatedOptions;
  const remote={user:original.user,sdkSession:original,signInError:null,updateError:null,logoutStatus:204,network:false,hold:null};
  const mainAuth={onAuthStateChange(fn){event=fn;},async getSession(){return {data:{session:remote.sdkSession},error:null};},async signOut(){calls.push(['main-logout']);event('SIGNED_OUT',null);return {error:null};}};
  const isolated={
    async getUser(){calls.push(['verify']);if(remote.network)throw new TypeError('secret payload');return {data:{user:remote.user},error:null};},
    async signInWithPassword(payload){calls.push(['reauth',payload]);await remote.hold;return {data:{user:remote.user,session:{...original,user:remote.user,access_token:jwt(remote.user.id,'verification-session')}},error:remote.signInError};},
    async updateUser(payload){calls.push(['update',payload]);if(remote.network)throw new TypeError('secret payload');return {data:{user:remote.user},error:remote.updateError};},
    async setSession(){return {data:{session:original,user:remote.user},error:null};},
    async signOut({scope}){calls.push(['isolated-logout',scope]);if(scope==='global')await isolatedOptions.global.fetch('https://test.supabase.co/auth/v1/logout?scope=global',{method:'POST'});return {error:null};},
    stopAutoRefresh(){}
  };
  const cloud=new ClassroomCloud({url:'https://test.supabase.co',publishableKey:'public'},{createClient:(_url,_key,options)=>{if(options.auth.persistSession===false){isolatedOptions=options;return {auth:isolated};}return {auth:mainAuth};},fetch:async()=>{if(remote.network)throw new TypeError('secret payload');return new Response(null,{status:remote.logoutStatus});},location:{href:'https://example.com/'},recoveryStorage:null});
  cloud.startHeartbeat=()=>{};
  return {cloud,calls,remote,original,isolated,options:()=>isolatedOptions,emit:session=>event('SIGNED_IN',session)};
}

test('password change reauthenticates the canonical account without switching the persistent session',async()=>{
  const f=fixture();await f.cloud.init();
  const result=await f.cloud.auth('change-password',values());
  assert.equal(result.passwordChanged,true);
  assert.deepEqual(f.calls.find(x=>x[0]==='reauth'),['reauth',{email:'canonical@example.com',password:' Current Pass#41 '}]);
  assert.deepEqual(f.calls.find(x=>x[0]==='update'),['update',{password:' New Password#41 ',current_password:' Current Pass#41 '}]);
  assert.equal(f.cloud.session,f.original);
  assert.equal(f.options().auth.persistSession,false);
  assert.equal(f.options().auth.autoRefreshToken,false);
  assert.equal(f.options().auth.detectSessionInUrl,false);
  assert.ok(f.calls.some(x=>x[0]==='isolated-logout'&&x[1]==='local'));
});
test('mismatched passwords fail before any provider request',async()=>{
  const f=fixture();await f.cloud.init();
  await assert.rejects(f.cloud.auth('change-password',{...values(),password_confirm:'different'}),e=>e.field==='password_confirm');
  assert.deepEqual(f.calls,[]);
});
test('wrong current password is a field error and cannot update the password',async()=>{
  const f=fixture();await f.cloud.init();f.remote.signInError={code:'invalid_credentials',status:400,message:'secret payload'};
  await assert.rejects(f.cloud.auth('change-password',values()),e=>e.field==='current_password'&&!e.message.includes('secret'));
  assert.ok(!f.calls.some(x=>x[0]==='update'));
  assert.equal(f.cloud.session,f.original);
});
test('expired or missing sessions cannot run authenticated security actions',async()=>{
  const f=fixture();await assert.rejects(f.cloud.auth('logout-all'),e=>e.code==='session-expired');
  await f.cloud.init();f.isolated.getUser=async()=>({data:{user:null},error:{status:401,code:'bad_jwt'}});
  await assert.rejects(f.cloud.auth('change-password',values()),e=>e.code==='session-expired');
  assert.ok(!f.calls.some(x=>x[0]==='update'));
});
test('network failure is sanitized and does not claim password success',async()=>{
  const f=fixture();await f.cloud.init();f.remote.network=true;
  await assert.rejects(f.cloud.auth('change-password',values()),e=>e.code==='network'&&!e.message.includes('secret'));
});
test('lost update responses describe an uncertain outcome and are not automatically retried',async()=>{
  const f=fixture();await f.cloud.init();let updates=0;f.isolated.updateUser=async()=>{updates++;throw new TypeError('secret payload');};
  await assert.rejects(f.cloud.auth('change-password',values()),e=>e.code==='outcome-unknown'&&/baharu/.test(e.message));
  assert.equal(updates,1);
});
test('a new session of the same account cancels the pending password change',async()=>{
  const f=fixture();await f.cloud.init();let release;f.remote.hold=new Promise(resolve=>{release=resolve;});
  const changing=f.cloud.auth('change-password',values());
  while(!f.calls.some(x=>x[0]==='reauth'))await new Promise(resolve=>setImmediate(resolve));
  const next={...f.original,access_token:jwt('account-a','session-b')};f.emit(next);release();
  await assert.rejects(changing,e=>e.code==='session-changed');
  assert.equal(f.cloud.session,next);assert.ok(!f.calls.some(x=>x[0]==='update'));
});
test('untrusted or switched reauthentication identity cannot be updated',async()=>{
  const f=fixture();await f.cloud.init();
  f.isolated.signInWithPassword=async()=>({data:{user:{id:'account-b'},session:{...f.original,user:{id:'account-b'}}},error:null});
  await assert.rejects(f.cloud.auth('change-password',values()),e=>e.code==='session-changed');
  assert.ok(!f.calls.some(x=>x[0]==='update'));assert.equal(f.cloud.session,f.original);
});
test('global logout requires an actual successful global revocation response',async()=>{
  const f=fixture();await f.cloud.init();const result=await f.cloud.auth('logout-all');
  assert.equal(result.globalSignedOut,true);assert.equal(f.cloud.session,null);
  assert.ok(f.calls.some(x=>x[0]==='isolated-logout'&&x[1]==='global'));
});
test('SDK-suppressed 401, 403, 404 and missing logout requests never claim global success',async()=>{
  for(const status of [401,403,404]){
    const f=fixture();await f.cloud.init();f.remote.logoutStatus=status;
    await assert.rejects(f.cloud.auth('logout-all'));assert.equal(f.cloud.session,f.original);
  }
  const f=fixture();await f.cloud.init();f.isolated.signOut=async()=>({error:null});
  await assert.rejects(f.cloud.auth('logout-all'));assert.equal(f.cloud.session,f.original);
});
test('duplicate actions and leaving while reauthentication is pending cannot submit an update',async()=>{
  const f=fixture();await f.cloud.init();const controller=new AbortController();let release;
  f.remote.hold=new Promise(resolve=>{release=resolve;});
  const changing=f.cloud.auth('change-password',values(),{signal:controller.signal});
  await assert.rejects(f.cloud.auth('change-password',values()),e=>e.code==='busy');
  while(!f.calls.some(x=>x[0]==='reauth'))await new Promise(resolve=>setImmediate(resolve));
  controller.abort();release();await assert.rejects(changing);
  assert.ok(!f.calls.some(x=>x[0]==='update'));
});

test('stale cached identity is rejected before reauthentication when another account occupies SDK storage',async()=>{
  const f=fixture();await f.cloud.init();f.remote.sdkSession={...f.original,user:{id:'account-b'},access_token:jwt('account-b','session-b')};
  await assert.rejects(f.cloud.auth('change-password',values()),e=>e.code==='session-changed');
  assert.deepEqual(f.calls,[]);assert.equal(f.cloud.session,f.original);
});
