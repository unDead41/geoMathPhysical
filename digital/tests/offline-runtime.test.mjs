import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfflineRuntime,rememberedOfflineAccount} from '../dist/offline-runtime.mjs';
import {ModuleProgress} from '../dist/module-progress.mjs';
import {Game} from '../dist/core.mjs';
import {QUESTIONS} from '../dist/questions.mjs';
import {ClassroomCloud} from '../dist/cloud.mjs';
import {createClient,AuthRetryableFetchError} from '@supabase/supabase-js';

const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const reflection={activity:'net',stage:'prediction',prediction:'Enam muka',result:'',explanation:'',completed:false};
function fixture({id=owner,offline=true}={}){
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const rows=[],db={async enqueue(e){if(!rows.some(r=>r.id===e.id&&r.owner===e.owner))rows.push(structuredClone(e));},async list(id){return rows.filter(r=>r.owner===id);},async ack(id,ids){for(let i=rows.length-1;i>=0;i--)if(rows[i].owner===id&&ids.includes(rows[i].id))rows.splice(i,1);}};
 let listener;const cloud={session:id?{user:{id}}:null,profile:{role:'student'},onSessionChange(fn){listener=fn;},async offlineSync(action,{events}={}){return {accepted:events?.map(e=>e.id)||[],records:[]};},async moduleProgress(){return {records:[]};}};
 const runtime=createOfflineRuntime({cloud,storage,db,online:()=>!offline,autoStart:false,view:{update(){}}});
 return {runtime,cloud,storage,values,rows,db,setActor(id,event=id?'SIGNED_IN':'SIGNED_OUT'){cloud.session=id?{user:{id}}:null;listener(cloud.session,event);},connect(){offline=false;},cleanup(){runtime.stop();}};
}
function result(mode='quiz'){
 const g=new Game(QUESTIONS,{name:'QA',category:'Tetamu',className:''},0,()=>.4,{mode});
 for(let i=0;i<g.total;i++){g.skip(i*3000);g.advance(i*3000+2000);}
 return g.result('attempt-one');
}
test('module teaching events enter the durable queue through the real progress controller',async()=>{
 const f=fixture();try{
  const module=new ModuleProgress({storage:f.storage,cloud:f.cloud,syncAdapter:c=>f.runtime.syncModule(c),onRecord:(id,r)=>f.runtime.recordModule(id,r)});f.runtime.attachModule(module);
  const frame={postMessage(){}};module.open(frame);module.handleMessage({source:frame,data:{type:'geodecoder:module-ready',protocol:1}});
  module.handleMessage({source:frame,data:{type:'geodecoder:module-progress',protocol:1,session:module.session,...reflection}});
  await f.runtime.settle();assert.equal(f.rows.length,1);assert.equal(f.rows[0].owner,owner);assert.equal(f.rows[0].payload.prediction,'Enam muka');
  assert.equal(module.state.status,'pending');
 }finally{f.cleanup();}
});
test('completed solo histories queue once across a repeated finished-result rendering',async()=>{
 const f=fixture();try{
  assert.equal(await f.runtime.recordSolo(result()),true);await f.runtime.recordSolo({...result(),completedAt:Date.now()+10000});
  assert.equal(f.rows.length,1);assert.equal(f.rows[0].kind,'solo');assert.equal(f.rows[0].payload.score,0);assert.equal(JSON.stringify(f.rows).includes('QA'),false);
  assert.equal(await f.runtime.recordSolo({...result(),mode:'duel'}),false);assert.equal(await f.runtime.recordSolo(result(),{classroom:true}),false);
 }finally{f.cleanup();}
});
test('remembered ownership requires matching persisted Auth, while explicit logout returns to guest',()=>{
 const f=fixture();try{
  f.storage.setItem('geodecoder.cloud.auth',JSON.stringify({user:{id:owner},access_token:'secret'}));
  f.storage.setItem('geodecoder.offline.owner.v1',JSON.stringify({id:owner,role:'student'}));
  assert.equal(rememberedOfflineAccount(f.storage).id,owner);
  f.storage.setItem('geodecoder.cloud.auth',JSON.stringify({user:{id:other}}));assert.equal(rememberedOfflineAccount(f.storage).id,other);
  f.setActor(null);assert.equal(f.runtime.actor,'guest');assert.equal(f.values.get('geodecoder.offline.owner.v1'),undefined);
 }finally{f.cleanup();}
});
test('guest results remain local and a new account cannot send another account queue',async()=>{
 const guest=fixture({id:null});try{assert.equal(await guest.runtime.recordSolo(result()),false);assert.equal(guest.rows.length,0);}finally{guest.cleanup();}
 const f=fixture();try{
  await f.runtime.recordSolo(result());f.setActor(other);f.connect();await f.runtime.wake();
  assert.equal(f.rows.length,1);assert.equal(f.rows[0].owner,owner);
  f.setActor(owner);await f.runtime.wake({force:true});assert.equal(f.rows.length,0);
 }finally{f.cleanup();}
});
test('a transient null INITIAL_SESSION retains the persisted offline owner and new work',async()=>{
 const f=fixture();try{
  f.storage.setItem('geodecoder.cloud.auth',JSON.stringify({user:{id:owner},access_token:'expired-fixture'}));
  f.setActor(null,'INITIAL_SESSION');assert.equal(f.runtime.actor,owner);
  assert.equal(await f.runtime.recordSolo(result()),true);assert.equal(f.rows[0].owner,owner);
  f.setActor(null,'SIGNED_OUT');assert.equal(f.runtime.actor,'guest');
 }finally{f.cleanup();}
});
test('missing persisted Auth and explicit sign-out cannot resurrect remembered ownership',()=>{
 const f=fixture();try{
  f.setActor(null,'INITIAL_SESSION');assert.equal(f.runtime.actor,'guest');
  f.storage.setItem('geodecoder.cloud.auth',JSON.stringify({user:{id:owner}}));
  f.setActor(owner);f.setActor(null,'SIGNED_OUT');
  f.runtime.updateAccount(null,{remember:false});assert.equal(f.runtime.actor,'guest');
  f.setActor(null,'INITIAL_SESSION');assert.equal(f.runtime.actor,'guest');
 }finally{f.cleanup();}
});
test('account switches close the old module session and the rebuilt controller accepts the new owner edits',async()=>{
 const f=fixture();try{
  const module=new ModuleProgress({storage:f.storage,cloud:f.cloud,onRecord:(id,r)=>f.runtime.recordModule(id,r)});f.runtime.attachModule(module);
  const previousFrame={postMessage(){}},nextFrame={postMessage(){}};
  module.open(previousFrame);module.handleMessage({source:previousFrame,data:{type:'geodecoder:module-ready',protocol:1}});
  const previousSession=module.session;
  module.handleMessage({source:previousFrame,data:{type:'geodecoder:module-progress',protocol:1,session:previousSession,...reflection}});await f.runtime.settle();
  f.setActor(other);assert.equal(module.active,false);assert.equal(module.state.actor,other);assert.deepEqual(module.state.records,[]);
  assert.equal(module.handleMessage({source:previousFrame,data:{type:'geodecoder:module-progress',protocol:1,session:previousSession,...reflection,prediction:'Stale private draft'}}),false);
  module.open(nextFrame);module.handleMessage({source:nextFrame,data:{type:'geodecoder:module-ready',protocol:1}});
  assert.equal(module.handleMessage({source:nextFrame,data:{type:'geodecoder:module-progress',protocol:1,session:module.session,...reflection,prediction:'New owner draft'}}),true);
  await f.runtime.settle();assert.deepEqual(f.rows.map(r=>[r.owner,r.payload.prediction]),[[owner,'Enam muka'],[other,'New owner draft']]);
  f.setActor(null);assert.equal(module.active,false);assert.equal(module.state.actor,'guest');assert.deepEqual(module.state.records,[]);
 }finally{f.cleanup();}
});
test('an online wake recovers the same SDK owner once even when Auth notifies during recovery',async()=>{
 const f=fixture();try{
  f.storage.setItem('geodecoder.cloud.auth',JSON.stringify({user:{id:owner}}));f.setActor(null,'INITIAL_SESSION');
  await f.runtime.recordSolo(result());f.connect();f.runtime.autoStart=true;
  let recoveries=0,sends=0,release,entered;
  const started=new Promise(resolve=>{entered=resolve;}),gate=new Promise(resolve=>{release=resolve;});
  f.cloud.recoverOfflineSession=async expected=>{assert.equal(expected,owner);recoveries++;entered();await gate;f.setActor(owner,'TOKEN_REFRESHED');return f.cloud.session;};
  f.cloud.offlineSync=async(_,payload)=>{sends++;return {accepted:payload.events.map(e=>e.id),records:[]};};
  f.runtime.onOnline();await started;f.runtime.onOnline();f.runtime.onVisible();release();await f.runtime.wake();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(recoveries,1);assert.equal(sends,1);assert.equal(f.rows.length,0);assert.equal(f.runtime.sync.state.status,'synced');
 }finally{f.cleanup();}
});
test('a transient SDK recovery failure keeps the owner queue retrying until recovery succeeds',async()=>{
 const f=fixture();try{
  f.storage.setItem('geodecoder.cloud.auth',JSON.stringify({user:{id:owner}}));f.setActor(null,'INITIAL_SESSION');
  await f.runtime.recordSolo(result());f.connect();
  f.cloud.recoverOfflineSession=async()=>{throw Object.assign(Error('Fixture offline'),{code:'network'});};
  await f.runtime.wake();assert.equal(f.rows.length,1);assert.equal(f.runtime.sync.state.status,'pending');assert.ok(f.runtime.sync.state.nextRetry>Date.now());
  f.cloud.recoverOfflineSession=async expected=>{f.setActor(expected,'TOKEN_REFRESHED');return f.cloud.session;};
  await f.runtime.wake({force:true});assert.equal(f.rows.length,0);assert.equal(f.runtime.sync.state.status,'synced');
 }finally{f.cleanup();}
});
test('an expired SDK refresh keeps a matching cached owner pending with backoff until the network recovers',async()=>{
 const f=fixture();let runtime;try{
  f.cleanup();const cloud=new ClassroomCloud({url:'https://fixture.invalid',publishableKey:'public'},{recoveryStorage:null});
  cloud._setSession({user:{id:owner},access_token:'fixture-expired',refresh_token:'fixture-refresh'});
  let failing=true,sends=0;
  cloud._client={auth:{async getSession(){return failing?{data:{session:null},error:new AuthRetryableFetchError('Fixture offline',503)}:{data:{session:cloud.session},error:null};}},rpc(_,args){sends++;return {setHeader(){return this;},abortSignal(){return Promise.resolve({data:{accepted:args.payload.events.map(e=>e.id),records:[]},error:null});}};}};
  runtime=createOfflineRuntime({cloud,storage:f.storage,db:f.db,online:()=>true,autoStart:false,view:{update(){}}});
  await runtime.recordSolo(result());await runtime.wake();
  assert.equal(runtime.actor,owner);assert.equal(cloud.session.user.id,owner);assert.equal(runtime.sync.state.status,'pending');assert.ok(runtime.sync.state.nextRetry>Date.now());assert.equal(f.rows.length,1);assert.equal(sends,0);
  failing=false;await runtime.wake({force:true});assert.equal(runtime.sync.state.status,'synced');assert.equal(f.rows.length,0);assert.equal(sends,1);
 }finally{runtime?.stop();f.cleanup();}
});
test('a reopened online app automatically recovers persisted Auth through the real SDK and sends its owner queue',async()=>{
 const f=fixture();let client,reopened;try{
  await f.runtime.recordSolo(result());f.cleanup();
  const user={id:owner,email:'offline@example.test',aud:'authenticated',role:'authenticated',created_at:'2026-11-04T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{}};
  const token=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:owner,session_id:'persisted-session',exp:4102444800,aud:'authenticated',role:'authenticated'})).toString('base64url')+'.fixture';
  f.storage.setItem('geodecoder.cloud.auth',JSON.stringify({user,access_token:token,refresh_token:'fixture-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer'}));
  const requests=[];
  const cloud=new ClassroomCloud({url:'https://offline-fixture.supabase.co',publishableKey:'fixture-public'},{recoveryStorage:null,location:{href:'https://fixture.example/'},createClient(url,key,options){
   client=createClient(url,key,{...options,auth:{...options.auth,storage:f.storage,autoRefreshToken:false},global:{fetch:async(input,init)=>{
    const url=new URL(typeof input==='string'?input:input.url);assert.equal(url.pathname,'/rest/v1/rpc/geo_offline_sync');
    assert.equal(new Headers(init.headers).get('Authorization'),'Bearer '+token);
    const body=JSON.parse(init.body);requests.push(body);return Response.json({accepted:body.payload.events.map(e=>e.id),records:[]});
   }}});return client;
  }});
  assert.equal(cloud.session,null);
  reopened=createOfflineRuntime({cloud,storage:f.storage,db:f.db,online:()=>true,autoStart:true,view:{update(){}}});
  await reopened.wake();await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(reopened.actor,owner);assert.equal(cloud.session.user.id,owner);assert.equal(f.rows.length,0);assert.equal(requests.length,1);
  assert.equal(requests[0].payload.events[0].kind,'solo');assert.equal(cloud._initialization,null);assert.equal(cloud.heartbeatTimer,null);
 }finally{reopened?.stop();client?.auth.stopAutoRefresh();f.cleanup();}
});
test('the existing module retry action can recover after offline RPC installation',async()=>{
 const f=fixture({offline:false});try{
  const module=new ModuleProgress({storage:f.storage,cloud:f.cloud,syncAdapter:c=>f.runtime.syncModule(c),onRecord:(id,r)=>f.runtime.recordModule(id,r)});f.runtime.attachModule(module);
  module._records=[reflection];await f.runtime.recordModule(owner,reflection);
  f.cloud.offlineSync=async()=>{throw Object.assign(Error('not installed'),{code:'service-unavailable'});};await f.runtime.wake({force:true});assert.equal(f.runtime.sync.state.status,'unavailable');
  f.cloud.offlineSync=async(_,payload)=>({accepted:payload.events.map(e=>e.id),records:[reflection]});
  await module.sync();assert.equal(f.rows.length,0);assert.equal(f.runtime.sync.state.status,'synced');
 }finally{f.cleanup();}
});
