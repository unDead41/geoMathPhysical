import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DuelClient,DUEL_SESSION_KEY} from '../dist/duel.mjs';

const roomA='00000000-0000-4000-8000-000000000001';
const roomB='00000000-0000-4000-8000-000000000002';
const token='a'.repeat(64);
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const memory=()=>{const entries=new Map();return{getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};};
const state=(seq=0,serverNow=1000,id=roomA)=>({ok:true,protocol:2,serverNow,room:{id,code:'123456',status:'playing',startsAt:900,deadlineAt:900900,total:10,winnerId:null},me:{id:'player-'+id,seq,answered:0,score:0,hints:seq},opponent:null,actionResult:null});
const reply=value=>({ok:true,json:async()=>value});
function connectedClient(options={}){const client=new DuelClient(options);client.session={token,roomId:roomA,pending:null};client.accept(state());return client;}

test('forget cancels a pending mutation without resurrecting its session or throwing a null-session error',async t=>{
  const wire=deferred(),storage=memory();
  t.mock.method(globalThis,'fetch',()=>wire.promise);
  const client=new DuelClient({storage});
  const pending=client.create('Old player').catch(error=>error);
  client.forget();wire.resolve(reply(state()));
  const error=await pending;
  assert.equal(error.code,'stale_request');
  assert.equal(client.session,null);assert.equal(client.snapshot,null);assert.equal(client.busy,false);
  assert.equal(storage.getItem(DUEL_SESSION_KEY),null);
});

test('an abandoned mutation cannot clear the pending request or busy state of a new session',async t=>{
  const oldWire=deferred(),newWire=deferred(),bodies=[];
  t.mock.method(globalThis,'fetch',(_url,options)=>{bodies.push(JSON.parse(options.body));return bodies.length===1?oldWire.promise:newWire.promise;});
  const storage=memory(),client=new DuelClient({storage});
  const oldRequest=client.create('Old player').catch(error=>error);
  client.forget();
  const newRequest=client.create('New player').catch(error=>error);
  oldWire.resolve(reply(state()));await oldRequest;
  const pendingBefore=client.session?.pending;
  const busyBefore=client.busy;
  newWire.resolve(reply(state(0,2000,roomB)));
  const result=await newRequest;
  assert.equal(bodies.length,2,'a fresh session can start without waiting for the abandoned request');
  assert.equal(pendingBefore?.name,'New player');assert.equal(busyBefore,true);
  assert.equal(result.room?.id,roomB);assert.equal(client.session.roomId,roomB);
  assert.equal(client.pending,false);assert.equal(client.busy,false);
  assert.equal(JSON.parse(storage.getItem(DUEL_SESSION_KEY)).roomId,roomB);
  client.forget();
});

test('forget during retry backoff never sends the old command under the new generation',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  let requests=0;
  t.mock.method(globalThis,'fetch',async()=>{requests++;if(requests===1)throw new TypeError('connection lost');return reply(state());});
  const client=new DuelClient();
  const pending=client.create('Old player').catch(error=>error);
  await flush();client.forget();t.mock.timers.tick(300);
  const error=await pending;
  assert.equal(error.code,'stale_request');assert.equal(requests,1);
  assert.equal(client.session,null);assert.equal(client.snapshot,null);
});

test('stop and restart polling while a state request is in flight keeps one polling chain',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const firstWire=deferred();let requests=0;
  t.mock.method(globalThis,'fetch',async()=>{requests++;return requests===1?firstWire.promise:reply(state(0,1000+requests));});
  const client=connectedClient();
  client.startPolling();t.mock.timers.tick(2000);await flush();
  client.stopPolling();client.startPolling();firstWire.resolve(reply(state(0,1001)));await flush();
  t.mock.timers.tick(2000);await flush();client.stopPolling();
  assert.equal(requests,2,'only the restarted poll may schedule its next request');
  client.forget();
});

test('concurrent refresh callers share one state request and its authoritative result',async t=>{
  const wire=deferred();let requests=0;
  t.mock.method(globalThis,'fetch',()=>{requests++;return wire.promise;});
  const client=connectedClient();
  const a=client.refresh(),b=client.refresh();wire.resolve(reply(state(1,2000)));
  const [first,second]=await Promise.all([a,b]);
  assert.equal(requests,1);assert.equal(first.me.seq,1);assert.equal(second.me.seq,1);
  client.forget();
});

test('a delayed state failure cannot disconnect a later accepted answer acknowledgement',async t=>{
  const oldWire=deferred();
  t.mock.method(globalThis,'fetch',(_url,options)=>JSON.parse(options.body).action==='state'?oldWire.promise:Promise.resolve(reply(state(1,2000))));
  const client=connectedClient();
  const oldState=client.refresh().catch(error=>error);
  await client.act('hint',{questionIndex:0});oldWire.reject(new TypeError('old connection lost'));
  await oldState;
  assert.equal(client.connected,true);assert.equal(client.error,'');assert.equal(client.snapshot.me.seq,1);
  client.forget();
});

test('a delayed snapshot cannot roll back the return value or clear a newer pending command',async t=>{
  const oldWire=deferred(),newWire=deferred();let mutations=0;
  t.mock.method(globalThis,'fetch',(_url,options)=>{
    const body=JSON.parse(options.body);
    if(body.action==='state')return oldWire.promise;
    mutations++;
    return mutations===1?Promise.resolve(reply(state(1,2000))):newWire.promise;
  });
  const client=connectedClient();
  const oldState=client.refresh();await client.act('hint',{questionIndex:0});
  const next=client.act('scan',{questionIndex:0,kind:'solid',shape:'cube',target:'r1'});
  oldWire.resolve(reply(state(0,1100)));const returned=await oldState;
  const preserved=client.session.pending?.seq;
  newWire.resolve(reply(state(2,3000)));await next;
  assert.equal(returned.me.seq,1,'callers receive the latest accepted state rather than rejected stale data');
  assert.equal(preserved,2,'an old state response does not acknowledge a newer pending command');
  assert.equal(client.snapshot.me.seq,2);assert.equal(client.pending,false);
  client.forget();
});

test('the v2 wire protocol is added without changing the saved command or retry sequence',async t=>{
  const bodies=[];let attempts=0;
  t.mock.method(globalThis,'fetch',async(_url,options)=>{
    bodies.push(JSON.parse(options.body));attempts++;
    if(attempts===1)throw new TypeError('lost acknowledgement');
    return reply(state(1,2000));
  });
  const client=connectedClient();await client.act('hint',{questionIndex:0});
  assert.equal(bodies.length,2);assert.deepEqual(bodies[0],bodies[1]);
  assert.equal(bodies[0].protocol,2);assert.equal(bodies[0].seq,1);
  client.forget();
});

test('an old Edge rejects protocol 2 with a clear backend-update error while retaining the session',async t=>{
  t.mock.method(globalThis,'fetch',async()=>Response.json({ok:false,error:'invalid_request'},{status:400}));
  const client=connectedClient();await assert.rejects(client.act('hint',{questionIndex:0}),{code:'backend_update_required'});
  assert.equal(client.session.roomId,roomA);assert.equal(client.snapshot.me.seq,0);assert.equal(client.error,'backend_update_required');client.forget();
});
test('a v1 snapshot is rejected instead of accepting its future question list',()=>{
  const client=connectedClient(),old=state();delete old.protocol;old.room.questionIds=['K1'];
  assert.throws(()=>client.accept(old),{code:'invalid_response'});assert.equal(client.snapshot.room.questionIds,undefined);client.forget();
});
