import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DuelClient} from '../dist/duel.mjs';
import {ClassroomCloud} from '../dist/cloud.mjs';
import {createDuelHandler} from '../backend/duel/functions/geodecoder-duel/handler.mjs';

const room='00000000-0000-4000-8000-000000000001';
const token='a'.repeat(64);
const state=(now=1000,status='playing')=>({ok:true,protocol:2,serverNow:now,room:{id:room,status,startsAt:900,deadlineAt:900900},me:{id:'player',seq:0},opponent:null});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function duel(options={}){const client=new DuelClient({random:()=>0,...options});client.session={token,roomId:room,pending:null};client.accept(state());return client;}

test('Duel polling waits while the browser is offline and resumes one chain',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let online=false,calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json(state(1000+calls));});
  const client=duel({isOnline:()=>online});client.startPolling();
  t.mock.timers.tick(2000);await flush();assert.equal(calls,0);
  online=true;t.mock.timers.tick(30000);await flush();assert.equal(calls,1);
  client.forget();
});
test('Duel background polling is slower without changing the authoritative clock',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json(state(1000+calls));});
  const client=duel({isHidden:()=>true});client.startPolling();
  t.mock.timers.tick(2000);await flush();const before=calls;
  t.mock.timers.tick(10000);await flush();assert.equal(calls,before);
  assert.equal(client.snapshot.room.deadlineAt,900900);client.forget();
});
test('Duel observes Retry-After and keeps the exact pending command on HTTP429',async t=>{
  let now=1000,calls=0;const bodies=[];
  t.mock.method(globalThis,'fetch',async(_url,init)=>{calls++;bodies.push(JSON.parse(init.body));return calls===1?Response.json({ok:false,error:'rate_limited'},{status:429,headers:{'Retry-After':'7'}}):Response.json({...state(9000),me:{id:'player',seq:1}});});
  const client=duel({now:()=>now});
  await assert.rejects(client.act('hint',{questionIndex:0}),{code:'rate_limited'});
  assert.equal(client.pending,true);const pending=JSON.stringify(client.session.pending);
  await assert.rejects(client.resume(),{code:'rate_limited'});assert.equal(calls,1);
  now+=7001;await client.resume();assert.equal(client.pending,false);
  assert.equal(JSON.stringify({...bodies[1],protocol:undefined}),pending);
  assert.deepEqual(bodies[0],bodies[1]);client.forget();
});
test('Duel terminal results stop background requests while retaining review data',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json(state(2000,'complete'));});
  const client=duel();client.startPolling();t.mock.timers.tick(2000);await flush();
  t.mock.timers.tick(60000);await flush();assert.equal(calls,1);
  assert.equal(client.snapshot.room.status,'complete');client.forget();
});

function cloudFixture(){
  let calls=0,session={user:{id:'account-a'},access_token:'account-a',refresh_token:'refresh-a'};
  const cloud=new ClassroomCloud({url:'https://fixture.invalid',publishableKey:'public'});
  cloud._client={auth:{getSession:async()=>({data:{session},error:null})},rpc(_name,args){calls++;return {setHeader(){return this;},abortSignal(){return Promise.resolve({data:{profile:{id:session.user.id},classes:[],rooms:[],action:args.action},error:null});}};}};
  cloud._setSession(session);return {cloud,get calls(){return calls;},switchSdk(){session={user:{id:'account-b'},access_token:'account-b',refresh_token:'refresh-b'};}};
}
test('Classroom coalesces and briefly caches identical snapshots then invalidates on mutation',async()=>{
  const f=cloudFixture();await Promise.all([f.cloud.rpc('snapshot'),f.cloud.rpc('snapshot')]);assert.equal(f.calls,1);
  await f.cloud.rpc('snapshot');assert.equal(f.calls,1);
  await f.cloud.rpc('update_profile',{display_name:'Changed',avatar:'cube'});await f.cloud.rpc('snapshot');assert.equal(f.calls,3);
});
test('a cached Classroom response still checks the actual SDK account',async()=>{
  const f=cloudFixture();await f.cloud.rpc('snapshot');f.switchSdk();
  await assert.rejects(f.cloud.rpc('snapshot'),{code:'session-changed'});assert.equal(f.calls,1);
});
test('the Edge exposes Retry-After so real cross-origin browsers can respect the rate limit',async()=>{
  const handler=createDuelHandler({env:key=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-only'})[key],fetch:async()=>Response.json({ok:false,error:'rate_limited'})});
  const response=await handler(new Request('https://fixture.invalid/duel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocol:2,action:'state',token,roomId:room})}));
  assert.equal(response.status,429);
  assert.match(response.headers.get('Access-Control-Expose-Headers'),/Retry-After/i);
  assert.equal(response.headers.get('Retry-After'),'2');
});
test('an explicit backend-update HTTP503 is not retried or retained as a pending game action',async t=>{
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({ok:false,error:'backend_update_required'},{status:503});});
  const client=duel();await assert.rejects(client.act('hint',{questionIndex:0}),{code:'backend_update_required'});
  assert.equal(calls,1);assert.equal(client.pending,false);client.forget();
});
test('an older successful poll cannot erase a newer server cooldown',async t=>{
  let finish,calls=0,now=1000;
  t.mock.method(globalThis,'fetch',(_url,init)=>{calls++;return JSON.parse(init.body).action==='state'?new Promise(resolve=>finish=resolve):Promise.resolve(Response.json({ok:false,error:'rate_limited'},{status:429,headers:{'Retry-After':'30'}}));});
  const client=duel({now:()=>now});const old=client.refresh();await flush();
  await assert.rejects(client.act('hint',{questionIndex:0}),{code:'rate_limited'});
  const deadline=client.retryAt;finish(Response.json(state(1001)));await old;
  assert.equal(client.retryAt,deadline);await assert.rejects(client.resume(),{code:'rate_limited'});assert.equal(calls,2);client.forget();
});
test('terminal capability errors stop periodic polling without forgetting the explicit reset session',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({ok:false,error:'room_expired'},{status:410});});
  const client=duel();client.startPolling();t.mock.timers.tick(2000);await flush();t.mock.timers.tick(300000);await flush();
  assert.equal(calls,1);assert.equal(client.polling,false);assert.equal(client.session.roomId,room);client.forget();
});
test('a Realtime invalidation cannot let an older snapshot overwrite or return older account data',async()=>{
  const f=cloudFixture(),replies=[];let change;
  f.cloud._client.rpc=()=>({setHeader(){return this;},abortSignal(){return new Promise(resolve=>replies.push(resolve));}});
  f.cloud._client.channel=()=>({on(_type,_filter,fn){change=fn;return this;},subscribe(){return this;}});f.cloud._client.removeChannel=()=>{};
  const stop=f.cloud.watch(room,()=>{});const old=f.cloud.rpc('snapshot');await flush();change();
  const latest=f.cloud.rpc('snapshot');await flush();
  replies[1]({data:{profile:{id:'account-a',display_name:'New'}},error:null});await latest;
  replies[0]({data:{profile:{id:'account-a',display_name:'Old'}},error:null});
  assert.equal((await old).profile.display_name,'New');assert.equal(f.cloud.profile.display_name,'New');stop();
});
test('a snapshot cache hit rejects a rejected SDK session rather than returning the old profile',async()=>{
  const f=cloudFixture();await f.cloud.rpc('snapshot');
  f.cloud._client.auth.getSession=async()=>({data:{session:null},error:{code:'session_expired'}});
  await assert.rejects(f.cloud.rpc('snapshot'),{code:'session-changed'});assert.equal(f.calls,1);
});
test('a refreshed JWT with the same verified session may reuse a bounded snapshot cache',async()=>{
  const f=cloudFixture();const session=revision=>({user:{id:'account-a'},access_token:Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:'account-a',session_id:'same-session',iat:revision,exp:4102444800})).toString('base64url')+'.fixture'});
  let actual=session(1);f.cloud._setSession(actual);f.cloud._client.auth.getSession=async()=>({data:{session:actual},error:null});
  await f.cloud.rpc('snapshot');actual=session(2);f.cloud._setSession(actual);
  assert.equal((await f.cloud.rpc('snapshot')).profile.id,'account-a');assert.equal(f.calls,1);
});
