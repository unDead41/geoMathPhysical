import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {ClassroomCloud} from '../dist/cloud.mjs';

const origin='https://provider-fixture.supabase.co';
const canonical='https://undead41.github.io/geodecoder-digital/';
const authorization=origin+'/auth/v1/authorize?provider=google&redirect_to='+encodeURIComponent(canonical);
const storageKey='geodecoder.cloud.auth';
const phone='+60123456789',otherPhone='+60198765432',otp='739185';
const ids={a:'00000000-0000-4000-8000-000000000041',b:'00000000-0000-4000-8000-000000000042'};
const user=(name='a')=>({id:ids[name],phone:name==='a'?phone:otherPhone,aud:'authenticated',role:'authenticated',created_at:'2026-10-26T00:00:00Z',app_metadata:{provider:'google',providers:['google']},email:'person@example.test',user_metadata:{}});
const session=(name='a',sid=name)=>({user:user(name),access_token:Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:ids[name],session_id:sid,exp:4102444800,aud:'authenticated',role:'authenticated'})).toString('base64url')+'.fixture',refresh_token:'private-refresh-'+sid,token_type:'bearer',expires_in:3600,expires_at:4102444800});
const profile=(name='a')=>({id:ids[name],username:name==='a'?'ijamm_41':'other_42',display_name:name==='a'?'Ijamm Ahmad':'Other Account',role:'student'});
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const leak='private-provider-detail-'+otp;
const safeError=(code)=>error=>error.code===code&&!error.message.includes(leak)&&!error.message.includes(otp)&&!error.message.includes('private-refresh-')&&!error.message.includes('.fixture');

// Exercise the pinned SDK instead of substituting its OAuth URL generation,
// OTP JSON serialization, token validation or persistent-session installation.
function sdkFixture(t,{redirect=canonical,initialSession=null}={}){
  const requests=[],clients=[],assigned=[],values=new Map();
  if(initialSession)values.set(storageKey,JSON.stringify(initialSession));
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const remote={settings:{external:{google:true,phone:true}},settingsThrow:null,otpError:null,verifyError:null,verifySession:session(),verifyHold:null,verifyStarted:null,completeProfile:profile(),completeError:null,completeHold:null,completeStarted:null};
  const fetcher=async(input,init)=>{
    const url=new URL(typeof input==='string'?input:input.url),body=init?.body?JSON.parse(init.body):null;
    const request={path:url.pathname,method:init.method,body,authorization:new Headers(init.headers).get('Authorization')};
    requests.push(request);
    if(url.pathname==='/auth/v1/settings'){
      if(remote.settingsThrow)throw remote.settingsThrow;
      return Response.json(remote.settings);
    }
    if(url.pathname==='/auth/v1/otp')return remote.otpError?Response.json(remote.otpError,{status:remote.otpError.status,headers:{'x-supabase-api-version':'2024-01-01'}}):Response.json({message_id:'fixture-sms-message'});
    if(url.pathname==='/auth/v1/verify'){
      remote.verifyStarted?.resolve();await remote.verifyHold;
      return remote.verifyError?Response.json(remote.verifyError,{status:remote.verifyError.status,headers:{'x-supabase-api-version':'2024-01-01'}}):Response.json(remote.verifySession);
    }
    if(url.pathname==='/auth/v1/user'){
      const subject=JSON.parse(Buffer.from(request.authorization.slice(7).split('.')[1],'base64url')).sub;
      return Response.json(subject===ids.a?user():user('b'));
    }
    if(url.pathname==='/auth/v1/logout')return new Response(null,{status:204});
    if(url.pathname==='/rest/v1/rpc/geo_action')return Response.json({profile:profile(),classes:[],rooms:[],invites:[]});
    if(url.pathname==='/rest/v1/rpc/geo_complete_profile'){
      remote.completeStarted?.resolve();await remote.completeHold;
      return Response.json(remote.completeError?{error:remote.completeError}:{profile:remote.completeProfile});
    }
    throw Error('Unexpected SDK request: '+url.pathname);
  };
  const cloud=new ClassroomCloud({url:origin,publishableKey:'fixture-public-key',...(redirect?{authRedirectUrl:redirect}:{})},{
    createClient(url,key,options){
      const client=createClient(url,key,{...options,auth:{...options.auth,...(options.auth.persistSession===false?{}:{storage,autoRefreshToken:false})},global:{...options.global,fetch:options.global?.fetch||fetcher}});
      clients.push(client);return client;
    },fetch:fetcher,location:{href:canonical,assign:url=>assigned.push(url)},recoveryStorage:null
  });
  cloud.startHeartbeat=()=>{};
  t.after(()=>{for(const client of clients)client.auth.stopAutoRefresh();});
  return {cloud,requests,remote,assigned,values,storage,async switchStorage(name){
    const client=createClient(origin,'fixture-public-key',{auth:{storageKey,storage,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:fetcher}});
    clients.push(client);assert.equal((await client.auth.setSession(session(name))).error,null);
  }};
}

// Untrusted and delayed SDK responses require controllable providers. Keep
// temporary clients separate so their verification cannot emit a main login.
function controlledFixture(){
  let notify;const calls=[],assigned=[];
  const state={settings:{external:{google:true,phone:true}},sdkSession:null,readHold:null,readStarted:null,sendError:null,sendThrow:null,sendHold:null,sendStarted:null,verifyResult:{data:{session:session(),user:user()},error:null},verifyHold:null,verifyStarted:null,googleResult:{data:{provider:'google',url:authorization},error:null}};
  const main={
    onAuthStateChange(fn){notify=fn;return {data:{subscription:{unsubscribe(){}}}};},
    async initialize(){return {error:null};},
    async getSession(){const session=state.sdkSession;state.readStarted?.resolve();await state.readHold;return {data:{session},error:null};},
    async signInWithOAuth(payload){calls.push(['google',payload]);return state.googleResult;},
    async signInWithOtp(payload){calls.push(['send',payload]);state.sendStarted?.resolve();await state.sendHold;if(state.sendThrow)throw state.sendThrow;return {data:{session:null,user:null},error:state.sendError};},
    async setSession(payload){calls.push(['install',payload]);state.sdkSession=state.verifyResult.data.session;notify('SIGNED_IN',state.sdkSession);return {data:{session:state.sdkSession,user:state.sdkSession.user},error:null};},
    async signOut(payload){calls.push(['logout',payload]);state.sdkSession=null;notify('SIGNED_OUT',null);return {error:null};}
  };
  const temporary={
    async verifyOtp(payload){calls.push(['verify',payload]);state.verifyStarted?.resolve();await state.verifyHold;return state.verifyResult;},
    async getUser(){return {data:{user:state.verifyResult.data?.user},error:null};},
    async signOut(payload){calls.push(['temporary-logout',payload]);return {error:null};},
    stopAutoRefresh(){}
  };
  const cloud=new ClassroomCloud({url:origin,publishableKey:'fixture-public-key',authRedirectUrl:canonical},{createClient(_url,_key,options){calls.push(['client',options]);return {auth:options.auth.persistSession===false?temporary:main};},fetch:async()=>Response.json(state.settings),location:{href:canonical,assign:url=>assigned.push(url)},recoveryStorage:null});
  cloud.startHeartbeat=()=>{};
  return {cloud,state,calls,assigned,emit(event,value){state.sdkSession=value;notify(event,value);}};
}

test('Google uses the real SDK authorization URL and configured callback without extra scopes',async t=>{
  const callback='https://classroom.example/portal/';
  const f=sdkFixture(t,{redirect:callback});
  const result=await f.cloud.auth('google-login',{redirectTo:'https://untrusted.example/',scopes:'drive',provider:'github'});
  assert.equal(f.assigned.length,1);assert.equal(result.url,f.assigned[0]);
  const url=new URL(result.url);
  assert.equal(url.origin,origin);assert.equal(url.pathname,'/auth/v1/authorize');
  assert.equal(url.searchParams.get('provider'),'google');assert.equal(url.searchParams.get('redirect_to'),callback);
  assert.equal(url.searchParams.get('prompt'),'select_account');assert.equal(url.searchParams.has('scopes'),false);
  assert.deepEqual(f.requests.map(r=>r.path),['/auth/v1/settings']);assert.equal(f.cloud.session,null);assert.equal(f.values.has(storageKey),false);
});

test('Google defaults to the published canonical callback and asks the SDK to defer navigation',async()=>{
  const f=controlledFixture();delete f.cloud.config.authRedirectUrl;
  await f.cloud.auth('google-login',{});
  assert.deepEqual(f.calls.find(call=>call[0]==='google')[1],{provider:'google',options:{redirectTo:canonical,skipBrowserRedirect:true,queryParams:{prompt:'select_account'}}});
});

test('Google rejects provider failures and authorization URLs with untrusted destinations or URL credentials',async()=>{
  for(const url of [authorization.replace(origin,'https://untrusted.example'),authorization.replace('/auth/v1/authorize','/rest/v1/rpc/geo_action'),authorization.replace(encodeURIComponent(canonical),encodeURIComponent('https://untrusted.example/')),authorization.replace('https://','https://credential@'),authorization+'#private',authorization.replace('provider=google','provider=github'),origin+'/auth/v1/authorize?provider=google','javascript:alert(1)']){
    const f=controlledFixture();f.state.googleResult={data:{provider:'google',url},error:null};
    await assert.rejects(f.cloud.auth('google-login',{}));assert.deepEqual(f.assigned,[]);assert.equal(f.cloud.session,null);
  }
  const f=controlledFixture();f.state.googleResult={data:{url:null},error:{code:'provider_disabled',status:400,message:leak}};
  await assert.rejects(f.cloud.auth('google-login',{}),safeError('provider-unavailable'));
  assert.deepEqual(f.assigned,[]);
});

test('disabled or missing provider settings never navigate',async t=>{
  for(const settings of [{external:{google:false,phone:false}},{external:{}},{},{external:{google:'true',phone:'true'}}]){
    for(const action of ['google-login']){
      const f=sdkFixture(t);f.remote.settings=settings;
      await assert.rejects(f.cloud.auth(action,{phone}),safeError('provider-unavailable'));
      assert.deepEqual(f.assigned,[]);assert.equal(f.requests.filter(r=>r.path==='/auth/v1/otp').length,0);
      assert.equal(f.cloud.session,null);assert.equal(f.values.has(storageKey),false);
    }
  }
});

test('unreachable provider settings return a sanitized network error before provider actions',async t=>{
  for(const action of ['google-login']){
    const f=sdkFixture(t);f.remote.settingsThrow=new TypeError(leak);
    await assert.rejects(f.cloud.auth(action,{phone}),safeError('network'));
    assert.deepEqual(f.assigned,[]);assert.equal(f.requests.filter(r=>r.path==='/auth/v1/otp').length,0);assert.equal(f.cloud.session,null);
  }
});

test('provider startup never replaces an existing authenticated account',async()=>{
  for(const action of ['google-login']){
    const f=controlledFixture();await f.cloud.init();f.emit('SIGNED_IN',session('b'));
    await assert.rejects(f.cloud.auth(action,{phone,token:otp}),safeError('session-changed'));
    assert.equal(f.cloud.session.user.id,ids.b);assert.equal(f.calls.filter(call=>['google','send','verify','install'].includes(call[0])).length,0);
  }
});

test('profile completion sends only normalized self fields and invalidates the snapshot cache',async t=>{
  const f=sdkFixture(t,{initialSession:session()});await f.cloud.init();
  await f.cloud.rpc('snapshot');await f.cloud.rpc('snapshot');
  assert.equal(f.requests.filter(r=>r.path==='/rest/v1/rpc/geo_action').length,1);
  const result=await f.cloud.completeProfile({username:' Ijamm_41 ',display_name:' Ijamm Ahmad ',role:'student',id:ids.b,user_id:ids.b,access_token:'untrusted-token',is_admin:true});
  const request=f.requests.find(r=>r.path==='/rest/v1/rpc/geo_complete_profile');
  assert.deepEqual(request.body,{username:'ijamm_41',display_name:'Ijamm Ahmad',role:'student'});
  assert.equal(request.authorization,'Bearer '+session().access_token);assert.deepEqual(result.profile,profile());assert.deepEqual(f.cloud.profile,profile());
  await f.cloud.rpc('snapshot');assert.equal(f.requests.filter(r=>r.path==='/rest/v1/rpc/geo_action').length,2);
  assert.equal(f.cloud.session.user.id,ids.a);
});

test('profile completion rejects absent sessions and invalid fields before writing',async t=>{
  const anonymous=sdkFixture(t);
  await assert.rejects(anonymous.cloud.completeProfile({username:'ijamm_41',display_name:'Ijamm',role:'student'}),safeError('session-expired'));
  assert.equal(anonymous.requests.filter(r=>r.path.includes('/rpc/')).length,0);
  const f=sdkFixture(t,{initialSession:session()});await f.cloud.init();
  for(const [change,code] of [[{username:'x'},'username-invalid'],[{display_name:'   '},'display-name-invalid'],[{role:'admin'},'role-invalid']]){
    await assert.rejects(f.cloud.completeProfile({username:'ijamm_41',display_name:'Ijamm',role:'student',...change}),safeError(code));
  }
  assert.equal(f.requests.filter(r=>r.path.includes('/rpc/')).length,0);
});

test('profile completion rejects another returned profile without replacing the current cache',async t=>{
  const f=sdkFixture(t,{initialSession:session()});await f.cloud.init();await f.cloud.rpc('snapshot');
  const original=f.cloud.profile;f.remote.completeProfile=profile('b');
  await assert.rejects(f.cloud.completeProfile({username:'ijamm_41',display_name:'Ijamm',role:'student'}),safeError('session-changed'));
  assert.equal(f.cloud.profile,original);assert.equal(f.cloud.profile.id,ids.a);
});

test('profile completion sanitizes server validation errors without replacing the current profile',async t=>{
  const f=sdkFixture(t,{initialSession:session()});await f.cloud.init();await f.cloud.rpc('snapshot');
  const original=f.cloud.profile;f.remote.completeError={code:'username_taken',message:leak};
  await assert.rejects(f.cloud.completeProfile({username:'ijamm_41',display_name:'Ijamm',role:'student'}),safeError('username-taken'));
  assert.equal(f.cloud.profile,original);assert.equal(f.cloud.session.user.id,ids.a);
});

test('profile completion checks actual SDK storage ownership before submitting account fields',async t=>{
  const f=sdkFixture(t,{initialSession:session()});await f.cloud.init();await f.switchStorage('b');
  assert.equal(f.cloud.session.user.id,ids.a);
  await assert.rejects(f.cloud.completeProfile({username:'ijamm_41',display_name:'Account A draft',role:'student'}),safeError('session-changed'));
  assert.equal(f.requests.filter(r=>r.path==='/rest/v1/rpc/geo_complete_profile').length,0);
});

test('delayed profile completion cannot repopulate the next account profile',async t=>{
  const f=sdkFixture(t,{initialSession:session()});await f.cloud.init();
  const held=deferred();f.remote.completeHold=held.promise;f.remote.completeStarted=deferred();
  const completion=f.cloud.completeProfile({username:'ijamm_41',display_name:'Account A draft',role:'student'});await f.remote.completeStarted.promise;
  await assert.rejects(f.cloud.completeProfile({username:'ijamm_41',display_name:'Duplicate draft',role:'student'}),safeError('busy'));
  assert.equal(f.requests.filter(r=>r.path==='/rest/v1/rpc/geo_complete_profile').length,1);
  await f.cloud.client.auth.setSession(session('b'));f.cloud.profile=profile('b');held.resolve();
  await assert.rejects(completion,safeError('session-changed'));assert.deepEqual(f.cloud.profile,profile('b'));assert.equal(f.cloud.session.user.id,ids.b);
});

test('removed phone actions cannot request SMS, verify OTP or contact any service',async t=>{
  for(const action of ['phone-send','phone-verify']){
    const f=sdkFixture(t);
    await assert.rejects(f.cloud.auth(action,{phone,token:otp}),safeError('provider-unavailable'));
    assert.equal(f.requests.length,0);assert.equal(f.cloud.session,null);
  }
});

test('late Google settings cannot redirect after a login then logout',async()=>{
  const f=controlledFixture(),hold=deferred();
  f.cloud._securityFetch=async()=>{await hold.promise;return Response.json({external:{google:true}});};
  const opening=f.cloud.auth('google-login');
  await assert.rejects(f.cloud.auth('google-login'),safeError('busy'));
  f.cloud._setSession(session(),'SIGNED_IN');f.cloud._setSession(null,'SIGNED_OUT');
  hold.resolve();await assert.rejects(opening,safeError('session-changed'));
  assert.deepEqual(f.assigned,[]);
});

test('Google settings invoke browser fetch without binding it to the cloud object',async()=>{
  const f=controlledFixture();
  f.cloud._securityFetch=async function(){
    assert.equal(this,undefined,'native Window.fetch rejects a ClassroomCloud receiver');
    return Response.json(f.state.settings);
  };
  await f.cloud.auth('google-login');
  assert.equal(f.assigned.length,1);
});
