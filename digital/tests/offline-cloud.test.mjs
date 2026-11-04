import test from 'node:test';
import assert from 'node:assert/strict';
import {ClassroomCloud} from '../dist/cloud.mjs';
import {AuthRetryableFetchError} from '@supabase/supabase-js';
function fixture(response){
 const calls=[],cloud=new ClassroomCloud({url:'https://fixture.invalid',publishableKey:'public'});
 cloud._session={user:{id:'account-a'},access_token:'fixture-a',refresh_token:'fixture-refresh'};
 let started;const sending=new Promise(r=>started=r);
 cloud._client={auth:{async getSession(){return {data:{session:cloud.session},error:null};}},rpc(name,args){calls.push({name,args});return {setHeader(){return this;},abortSignal(){started();return response();}};}};
 return {cloud,calls,sending};
}
test('offline transport uses its dedicated owner-bound RPC and surfaces missing installation',async()=>{
 const f=fixture(async()=>({data:{accepted:['one'],records:[]},error:null}));
 await f.cloud.offlineSync('push',{events:[{id:'one'}]},{expectedUserId:'account-a'});
 assert.deepEqual(f.calls,[{name:'geo_offline_sync',args:{action:'push',payload:{events:[{id:'one'}]}}}]);
 await assert.rejects(f.cloud.offlineSync('history',{}, {expectedUserId:'account-b'}),e=>e.code==='session-changed');assert.equal(f.calls.length,1);
 const missing=fixture(async()=>({data:null,error:{code:'PGRST202'}}));await assert.rejects(missing.cloud.offlineSync('history'),e=>e.code==='service-unavailable');
});
test('offline transport rejects a delayed response after an account or session switch',async()=>{
 let release;const f=fixture(()=>new Promise(r=>release=r));const task=f.cloud.offlineSync('history',{}, {expectedUserId:'account-a'});
 await f.sending;f.cloud._session={user:{id:'account-b'},access_token:'fixture-b'};release({data:{accepted:['one']},error:null});
 await assert.rejects(task,e=>e.code==='session-changed');
});
test('PostgREST HTTP status and expired-JWT codes request sign-in instead of retrying',async()=>{
 for(const error of [{status:401,error:{code:'PGRST303'}},{status:401,error:{code:'unknown'}},{status:400,error:{code:'PGRST301'}}]){
  const f=fixture(async()=>({data:null,...error}));await assert.rejects(f.cloud.offlineSync('history'),e=>e.code==='session-expired');
 }
 for(const result of [{status:403,error:{code:'unknown'}},{status:400,error:{code:'42501'}}]){
  const forbidden=fixture(async()=>({data:null,...result}));await assert.rejects(forbidden.cloud.offlineSync('history'),e=>e.code==='forbidden');
 }
});
test('server failures remain transient even when their error code resembles a permanent rejection',async()=>{
 for(const code of ['invalid_payload','42501','PGRST202']){
  const f=fixture(async()=>({data:null,status:503,error:{code}}));await assert.rejects(f.cloud.offlineSync('history'),e=>e.code==='network');
 }
 const network=fixture(async()=>({data:null,status:0,error:{code:''}}));await assert.rejects(network.cloud.offlineSync('history'),e=>e.code==='network');
});
test('session listeners retain the session argument and may also read the SDK Auth event',async()=>{
 let notify;const cloud=new ClassroomCloud({url:'https://fixture.invalid',publishableKey:'public'},{recoveryStorage:null,createClient:()=>({auth:{onAuthStateChange(fn){notify=fn;}}})});
 const legacy=[],events=[];cloud.onSessionChange(session=>legacy.push(session));cloud.onSessionChange((session,event)=>events.push({session,event}));
 cloud.client;notify('INITIAL_SESSION',null);await new Promise(resolve=>setTimeout(resolve,0));
 assert.deepEqual(legacy,[null]);assert.deepEqual(events,[{session:null,event:'INITIAL_SESSION'}]);
});
test('offline session recovery accepts only the requested owner from SDK storage',async()=>{
 const same=fixture(async()=>({data:null,error:null})),session=same.cloud.session;same.cloud._setSession(null);
 same.cloud.client.auth.getSession=async()=>({data:{session},error:null});
 assert.equal(await same.cloud.recoverOfflineSession('account-a'),session);assert.equal(same.cloud.session.user.id,'account-a');
 const different=fixture(async()=>({data:null,error:null}));different.cloud._setSession(null);let reads=0;
 different.cloud.client.auth.getSession=async()=>{reads++;return {data:{session:{user:{id:'account-b'},access_token:'fixture-b'}},error:null};};
 assert.equal(await different.cloud.recoverOfflineSession('account-a'),null);assert.equal(different.cloud.session,null);assert.equal(reads,1);
 different.cloud._setSession({user:{id:'account-b'},access_token:'fixture-b'});
 assert.equal(await different.cloud.recoverOfflineSession('account-a'),null);assert.equal(reads,1);
});
test('a delayed SDK recovery cannot restore a session after explicit sign-out or an account switch',async()=>{
 for(const action of ['logout','switch']){
  const f=fixture(async()=>({data:null,error:null})),session=f.cloud.session;f.cloud._setSession(null);
  let release,entered;const started=new Promise(resolve=>{entered=resolve;});
  f.cloud.client.auth.getSession=()=>{entered();return new Promise(resolve=>{release=resolve;});};
  const recovering=f.cloud.recoverOfflineSession('account-a');await started;
  f.cloud._setSession(action==='logout'?null:{user:{id:'account-b'},access_token:'fixture-b'},action==='logout'?'SIGNED_OUT':'SIGNED_IN');
  release({data:{session},error:null});assert.equal(await recovering,null);assert.equal(f.cloud.session?.user?.id,action==='logout'?undefined:'account-b');
 }
});
test('an offline SDK refresh failure remains transient instead of asking the owner to sign in again',async()=>{
 const f=fixture(async()=>({data:null,error:null}));f.cloud._setSession(null);
 f.cloud.client.auth.getSession=async()=>({data:{session:null},error:new AuthRetryableFetchError('Fixture offline',503)});
 await assert.rejects(f.cloud.recoverOfflineSession('account-a'),error=>error.code==='network');assert.equal(f.cloud.session,null);
});
test('retryable SDK refresh failures with the cached owner remain network errors before or after an RPC',async()=>{
 for(const failureRead of [1,2]){
  const f=fixture(async()=>({data:{accepted:['one'],records:[]},error:null})),session=f.cloud.session;let reads=0;
  f.cloud.client.auth.getSession=async()=>++reads===failureRead?{data:{session:null},error:new AuthRetryableFetchError('Fixture offline',503)}:{data:{session},error:null};
  await assert.rejects(f.cloud.offlineSync('push',{events:[{id:'one'}]},{expectedUserId:'account-a'}),error=>error.code==='network');
  assert.equal(f.cloud.session,session);assert.equal(f.calls.length,failureRead-1);
 }
});
test('retryable SDK errors cannot disguise a changed account or session',async()=>{
 for(const source of ['cache','sdk'])for(const replacement of [{user:{id:'account-b'},access_token:'fixture-b'},{user:{id:'account-a'},access_token:'different-session'}]){
  const f=fixture(async()=>({data:{accepted:[]},error:null}));
  f.cloud.client.auth.getSession=async()=>{
   if(source==='cache')f.cloud._setSession(replacement);
   return {data:{session:source==='sdk'?replacement:null},error:new AuthRetryableFetchError('Fixture offline',503)};
  };
  await assert.rejects(f.cloud.offlineSync('history',{},{expectedUserId:'account-a'}),error=>error.code==='session-changed');assert.equal(f.calls.length,0);
 }
});
