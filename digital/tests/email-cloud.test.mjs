import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ClassroomCloud,inspectAuthCallback,cleanAuthCallbackUrl} from '../dist/cloud.mjs';

const base='https://undead41.github.io/geodecoder-digital/';
test('callback inspection never exposes tokens or authorizes recovery by URL alone',()=>{
  assert.deepEqual(inspectAuthCallback(base),{present:false,kind:'none'});
  assert.deepEqual(inspectAuthCallback(base+'#type=recovery'),{present:true,kind:'invalid'});
  assert.deepEqual(inspectAuthCallback(base+'#access_token=secret&refresh_token=hidden&type=recovery&expires_in=3600&token_type=bearer'),{present:true,kind:'recovery'});
  assert.equal(inspectAuthCallback(base+'#error=access_denied&error_description=expired').kind,'error');
  assert.ok(!JSON.stringify(inspectAuthCallback(base+'#access_token=secret')).includes('secret'));
  assert.equal(cleanAuthCallbackUrl(base+'?keep=yes&code=secret#access_token=hidden&error_description=bad'),'/geodecoder-digital/?keep=yes');
});
function fixture(callbackKind='none',recoveryStorage=null){
  let callback;const calls=[];
  const session={access_token:'header.'+Buffer.from(JSON.stringify({sub:'account-a',session_id:'session-a'})).toString('base64url')+'.signature',refresh_token:'test-refresh',user:{id:'account-a',email:'student@example.com'}};
  const auth={
    onAuthStateChange(fn){callback=fn;},
    async initialize(){if(callbackKind!=='none')setTimeout(()=>callback(callbackKind==='recovery'?'PASSWORD_RECOVERY':'SIGNED_IN',session),0);return {error:null};},
    async getSession(){return {data:{session},error:null};},
    async getUser(){calls.push(['verifyUser']);return {data:{user:session.user},error:null};},
    async updateUser(payload){calls.push(['update',payload]);return {data:{user:session.user},error:null};},
    async signOut(payload){calls.push(['signOut',payload]);callback('SIGNED_OUT',null);return {error:null};},
    async resetPasswordForEmail(email,options){calls.push(['recover',email,options]);return {error:null};},
    async resend(payload){calls.push(['resend',payload]);return {error:null};}
  };
  const location={href:base+(callbackKind==='none'?'':'#access_token=secret&refresh_token=hidden&type='+ (callbackKind==='recovery'?'recovery':'signup')+'&expires_in=3600&token_type=bearer')};
  const history={replaceState(...args){calls.push(['clean',args[2]]);}};
  const cloud=new ClassroomCloud({url:'https://test',publishableKey:'public',authRedirectUrl:base},{createClient:()=>({auth}),location,history,recoveryStorage});
  cloud.startHeartbeat=()=>{};
  return {cloud,calls,session,auth,emit:(event,value=session)=>callback(event,value)};
}
test('only a validated recovery event opens reset; completing it revokes sessions',async()=>{
  const {cloud,calls}=fixture('recovery');assert.equal(cloud.recoveryRequired,false);
  await cloud.init();assert.equal(cloud.recoveryRequired,true);assert.equal(cloud.authCallbackHandled,true);
  await cloud.auth('reset-password',{password:' Example Pass#41 '});
  assert.deepEqual(calls.find(c=>c[0]==='update'),['update',{password:' Example Pass#41 '}]);
  assert.deepEqual(calls.find(c=>c[0]==='signOut'),['signOut',{scope:'global'}]);
  assert.equal(cloud.recoveryRequired,false);assert.equal(cloud.session,null);
});
test('ordinary sign-in cannot submit the recovery form',async()=>{
  const {cloud,calls}=fixture();await cloud.init();
  await assert.rejects(()=>cloud.auth('reset-password',{password:' Example Pass#41 '}));
  assert.ok(!calls.some(c=>c[0]==='update'));
});
test('recovery and confirmation email links always return to the canonical website',async()=>{
  const {cloud,calls}=fixture();
  await cloud.auth('recover-email',{email:'Student@Example.com'});
  await cloud.auth('resend-confirmation',{email:'Student@Example.com'});
  assert.deepEqual(calls.find(c=>c[0]==='recover'),['recover','student@example.com',{redirectTo:base}]);
  assert.equal(calls.find(c=>c[0]==='resend')[1].options.emailRedirectTo,base);
});
test('reloading the same recovery session keeps the reset form after server verification and clears intent on success',async()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const first=fixture('recovery',storage);await first.cloud.init();assert.equal(first.cloud.recoveryRequired,true);
  assert.equal(values.size,1);assert.ok(![...values.values()].join('').includes('signature'),'Intent must never store an access token');
  const reloaded=fixture('none',storage);assert.equal(reloaded.cloud.hasRecoveryIntent,true);assert.equal(reloaded.cloud.recoveryRequired,false);
  await reloaded.cloud.init();assert.equal(reloaded.cloud.recoveryRequired,true);assert.ok(reloaded.calls.some(c=>c[0]==='verifyUser'));
  await reloaded.cloud.auth('reset-password',{password:'Reload Pass#41'});assert.equal(values.size,0);
});
test('a recovery intent cannot carry into a different server-verified session',async()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const first=fixture('recovery',storage);await first.cloud.init();
  const different=fixture('none',storage);different.session.access_token='header.'+Buffer.from(JSON.stringify({sub:'account-a',session_id:'session-b'})).toString('base64url')+'.signature';
  await different.cloud.init();assert.equal(different.cloud.recoveryRequired,false);assert.equal(values.size,0);
  await assert.rejects(()=>different.cloud.auth('reset-password',{password:'Different Pass#41'}));
});
test('a delayed recovery verification cannot enable reset after an account switch',async()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const first=fixture('recovery',storage);await first.cloud.init();
  const reloaded=fixture('none',storage);let complete,entered;
  const started=new Promise(resolve=>{entered=resolve;});
  reloaded.auth.getUser=()=>{entered();return new Promise(resolve=>{complete=resolve;});};
  const opening=reloaded.cloud.init();await started;
  reloaded.emit('SIGNED_IN',{...reloaded.session,user:{id:'account-b'}});
  complete({data:{user:reloaded.session.user},error:null});await opening;
  assert.equal(reloaded.cloud.session.user.id,'account-b');assert.equal(reloaded.cloud.recoveryRequired,false);
});
