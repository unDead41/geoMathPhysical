import test from 'node:test';
import assert from 'node:assert/strict';
import {OfflineSync} from '../dist/offline-sync.mjs';
import {normalizeOfflineEvent} from '../dist/offline-records.mjs';

const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const reflection={activity:'net',stage:'prediction',prediction:'Enam muka',result:'',explanation:'',completed:false};
class DeviceDB {
  rows=[];
  async enqueue(event){const old=this.rows.find(r=>r.owner===event.owner&&r.id===event.id);if(old&&JSON.stringify(old)!==JSON.stringify(event))throw Error('Immutable event');if(!old)this.rows.push(structuredClone(event));}
  async list(actor){return structuredClone(this.rows.filter(r=>r.owner===actor));}
  async ack(actor,ids){this.rows=this.rows.filter(r=>r.owner!==actor||!ids.includes(r.id));}
}
const event=(id,actor=owner)=>({owner:actor,id,kind:'module',content_version:1,payload:reflection});
function fixture(send){const db=new DeviceDB();let now=1000;const sync=new OfflineSync({db,send,now:()=>now,random:()=>0,online:()=>true});sync.setActor(owner);return {db,sync,advance:()=>now+=300000};}

test('a missing server acknowledgement retains a durable event for replay',async()=>{
 const f=fixture(async()=>({accepted:[],records:[]}));await f.sync.enqueue(event('one'));
 await f.sync.flush();assert.equal((await f.db.list(owner)).length,1);assert.equal(f.sync.state.status,'pending');
 assert.ok(f.sync.state.nextRetry>1000);
});
test('a successful acknowledgement removes only named events, never another owner',async()=>{
 const f=fixture(async()=>({accepted:['one'],records:[]}));await f.sync.enqueue(event('one'));await f.db.enqueue(event('other',other));
 await f.sync.flush();assert.equal((await f.db.list(owner)).length,0);assert.equal((await f.db.list(other)).length,1);assert.equal(f.sync.state.status,'synced');
});
test('account switch during delivery cannot acknowledge the old request or apply old progress',async()=>{
 let release;const f=fixture(()=>new Promise(r=>release=r));await f.sync.enqueue(event('one'));
 const task=f.sync.flush();while(!release)await new Promise(r=>setImmediate(r));
 f.sync.setActor(other);release({accepted:['one'],records:[reflection]});await task;
 assert.equal(f.sync.state.actor,other);assert.equal(f.sync.state.records.length,0);assert.equal((await f.db.list(owner)).length,1);
});
test('delivery retries use the same ID and wait for backoff',async()=>{
 const ids=[];let fail=true;const f=fixture(async(_,events)=>{ids.push(events[0].id);if(fail)throw Error('connection lost');return {accepted:events.map(r=>r.id),records:[]};});
 await f.sync.enqueue(event('same'));await f.sync.flush();await f.sync.flush();assert.equal(ids.length,1);
 fail=false;f.advance();await f.sync.flush();assert.deepEqual(ids,['same','same']);assert.equal(f.sync.state.pending,0);
});
test('batching bounds each request and keeps the rest pending for the next turn',async()=>{
 const counts=[];const f=fixture(async(_,events)=>{counts.push(events.length);return {accepted:events.map(r=>r.id),records:[]};});
 for(let n=0;n<23;n++)await f.sync.enqueue(event('r'+n));
 await f.sync.flush();assert.deepEqual(counts,[20]);assert.equal(f.sync.state.pending,3);
 f.advance();await f.sync.flush();assert.deepEqual(counts,[20,3]);
});
test('expired sessions and a missing backend stop automatic retries without dropping records',async()=>{
 for(const code of ['session-expired','service-unavailable','invalid_payload']){
  let calls=0;const f=fixture(async()=>{calls++;throw Object.assign(Error(code),{code});});await f.sync.enqueue(event('one'));await f.sync.flush();f.advance();await f.sync.flush();
  assert.equal(calls,1);assert.equal((await f.db.list(owner)).length,1);
  assert.equal(f.sync.state.status,code==='session-expired'?'needs-auth':code==='service-unavailable'?'unavailable':'blocked');
 }
});
test('blocked storage never reports a durable save and guests never queue account data',async()=>{
 const f=fixture(async()=>assert.fail('must not send'));f.db.enqueue=async()=>{throw Error('quota');};
 assert.equal(await f.sync.enqueue(event('one')),false);assert.equal(f.sync.state.status,'storage-failed');
 assert.equal(normalizeOfflineEvent(event('guest','guest')),null);
});
test('payload normalization strips credentials and rejects malformed or official-game records',()=>{
 const value=normalizeOfflineEvent({...event('one'),access_token:'secret',payload:{...reflection,password:'secret'}});
 assert.equal(JSON.stringify(value).includes('secret'),false);
 assert.equal(normalizeOfflineEvent({...event('one'),kind:'duel'}),null);
 assert.equal(normalizeOfflineEvent({...event('one'),content_version:999}),null);
 assert.equal(normalizeOfflineEvent({...event('one'),payload:{...reflection,completed:true}}),null);
});
test('quota retry retains the unsaved event and cannot report success until persistence recovers',async()=>{
 const delivered=[],f=fixture(async(_,events)=>{delivered.push(...events.map(e=>e.id));return {accepted:events.map(e=>e.id),records:[]};});
 const persist=f.db.enqueue.bind(f.db);f.db.enqueue=async()=>{throw Error('quota');};
 assert.equal(await f.sync.enqueue(event('unsaved')),false);await f.sync.flush({force:true});
 assert.equal(f.sync.state.status,'storage-failed');assert.deepEqual(delivered,[]);
 f.db.enqueue=persist;await f.sync.flush({force:true});assert.deepEqual(delivered,['unsaved']);assert.equal(f.sync.state.status,'synced');
});
test('unsaved account queues survive switching owners and recover without crossing accounts',async()=>{
 const delivered=[],f=fixture(async(actor,events)=>{delivered.push([actor,...events.map(e=>e.id)]);return {accepted:events.map(e=>e.id),records:[]};});
 const persist=f.db.enqueue.bind(f.db);f.db.enqueue=async()=>{throw Error('quota');};
 assert.equal(await f.sync.enqueue(event('same')),false);
 f.sync.setActor(other);assert.equal(await f.sync.enqueue(event('same',other)),false);
 f.sync.setActor('guest');assert.equal(await f.sync.enqueue(event('guest',owner)),false);await f.sync.flush({force:true});assert.deepEqual(delivered,[]);
 f.sync.setActor(other);assert.equal(f.sync.state.status,'storage-failed');assert.equal(f.sync.state.pending,1);
 f.db.enqueue=persist;await f.sync.flush({force:true});assert.deepEqual(delivered,[[other,'same']]);
 f.sync.setActor(owner);assert.equal(f.sync.state.status,'storage-failed');assert.equal(f.sync.state.pending,1);
 await f.sync.flush({force:true});assert.deepEqual(delivered,[[other,'same'],[owner,'same']]);assert.equal(f.sync.state.status,'synced');
});
test('retrying an active save shares its write and waits for persistence before sending',async()=>{
 let release,writes=0;const delivered=[],f=fixture(async(_,events)=>{delivered.push(...events.map(e=>e.id));return {accepted:events.map(e=>e.id),records:[]};});
 const persist=f.db.enqueue.bind(f.db);f.db.enqueue=async value=>{writes++;await new Promise(resolve=>release=resolve);await persist(value);};
 const save=f.sync.enqueue(event('slow')),flush=f.sync.flush({force:true});
 assert.equal(writes,1);assert.deepEqual(delivered,[]);assert.notEqual(f.sync.state.status,'synced');
 release();assert.equal(await save,true);await flush;
 assert.equal(writes,1);assert.deepEqual(delivered,['slow']);assert.equal(f.sync.state.status,'synced');assert.equal((await f.db.list(owner)).length,0);
});
test('a late failed save remains visible after an older delivery is acknowledged',async()=>{
 let release;const delivered=[],f=fixture(async(_,events)=>{delivered.push(...events.map(e=>e.id));return new Promise(resolve=>release=()=>resolve({accepted:events.map(e=>e.id),records:[]}));});
 await f.sync.enqueue(event('first'));const flush=f.sync.flush();while(!release)await new Promise(resolve=>setImmediate(resolve));
 const persist=f.db.enqueue.bind(f.db);f.db.enqueue=async()=>{throw Error('quota');};
 assert.equal(await f.sync.enqueue(event('later')),false);release();await flush;await f.sync.refresh();
 assert.equal(f.sync.state.pending,1);assert.equal(f.sync.state.status,'storage-failed');
 f.advance();await f.sync.flush();assert.deepEqual(delivered,['first']);
 f.db.enqueue=persist;f.sync.send=async(_,events)=>{delivered.push(...events.map(e=>e.id));return {accepted:events.map(e=>e.id),records:[]};};
 await f.sync.flush({force:true});assert.deepEqual(delivered,['first','later']);assert.equal(f.sync.state.status,'synced');
});
test('an unsaved immutable ID keeps its original normalized event when a conflicting value is retried',async()=>{
 const delivered=[],f=fixture(async(_,events)=>{delivered.push(...events);return {accepted:events.map(e=>e.id),records:[]};});
 const persist=f.db.enqueue.bind(f.db);f.db.enqueue=async()=>{throw Error('quota');};
 const original={...event('same'),payload:{...reflection,password:'secret'}};assert.equal(await f.sync.enqueue(original),false);
 original.payload.prediction='Mutated';assert.equal(await f.sync.enqueue({...event('same'),payload:{...reflection,prediction:'Conflict'}}),false);
 f.db.enqueue=persist;await f.sync.flush({force:true});assert.equal(delivered.length,1);assert.equal(delivered[0].payload.prediction,reflection.prediction);assert.equal(JSON.stringify(delivered).includes('secret'),false);
});
test('a failed device acknowledgement retries the same durable event without claiming success',async()=>{
 const delivered=[],f=fixture(async(_,events)=>{delivered.push(...events.map(e=>e.id));return {accepted:events.map(e=>e.id),records:[]};});
 await f.sync.enqueue(event('same'));const ack=f.db.ack.bind(f.db);f.db.ack=async()=>{throw Error('blocked');};
 await f.sync.flush();assert.equal(f.sync.state.status,'storage-failed');assert.equal((await f.db.list(owner)).length,1);
 f.db.ack=ack;await f.sync.flush({force:true});assert.deepEqual(delivered,['same','same']);assert.equal(f.sync.state.status,'synced');
});
test('a stale empty queue read cannot hide a save that completed during the read',async()=>{
 let release;const f=fixture(async()=>assert.fail('the stale read has no batch')),list=f.db.list.bind(f.db);let reads=0;
 f.db.list=async actor=>{const rows=await list(actor);if(++reads===1)await new Promise(resolve=>release=resolve);return rows;};
 const flush=f.sync.flush();while(!release)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(await f.sync.enqueue(event('later')),true);release();await flush;
 assert.equal(f.sync.state.pending,1);assert.equal(f.sync.state.status,'pending');assert.equal((await list(owner)).length,1);
});
test('a delayed acknowledgement cannot delete a conflicting replacement or start another identical write',async()=>{
 let release,writes=0;const f=fixture(async(_,events)=>({accepted:events.map(e=>e.id),records:[]})),persist=f.db.enqueue.bind(f.db),ack=f.db.ack.bind(f.db);
 f.db.enqueue=async value=>{writes++;await persist(value);};await f.sync.enqueue(event('same'));
 f.db.ack=async(actor,ids)=>{await new Promise(resolve=>release=resolve);await ack(actor,ids);};
 const flush=f.sync.flush();while(!release)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(await f.sync.enqueue({...event('same'),payload:{...reflection,prediction:'Conflict'}}),false);
 assert.equal(await f.sync.enqueue(event('same')),true);assert.equal(writes,1);release();await flush;
 assert.equal(f.sync.state.pending,0);assert.equal(f.sync.state.status,'synced');assert.equal((await f.db.list(owner)).length,0);
});
test('a delayed save failure updates only its owner and remains recoverable after switching back',async()=>{
 let release;const delivered=[],f=fixture(async(actor,events)=>{delivered.push([actor,...events.map(e=>e.id)]);return {accepted:events.map(e=>e.id),records:[]};}),persist=f.db.enqueue.bind(f.db);
 f.db.enqueue=async value=>{if(value.owner===owner)await new Promise((_,reject)=>release=()=>reject(Error('quota')));else await persist(value);};
 const save=f.sync.enqueue(event('first'));f.sync.setActor(other);assert.equal(await f.sync.enqueue(event('second',other)),true);
 release();assert.equal(await save,false);assert.equal(f.sync.state.actor,other);assert.equal(f.sync.state.status,'pending');assert.equal(f.sync.state.pending,1);
 await f.sync.flush();f.sync.setActor(owner);assert.equal(f.sync.state.status,'storage-failed');assert.equal(f.sync.state.pending,1);
 f.db.enqueue=persist;await f.sync.flush({force:true});assert.deepEqual(delivered,[[other,'second'],[owner,'first']]);assert.equal(f.sync.state.status,'synced');
});
test('another tab can acknowledge durable rows without leaving a phantom pending event in memory',async()=>{
 const f=fixture(async()=>assert.fail('already acknowledged in the other tab'));await f.sync.enqueue(event('one'));
 const tab=new OfflineSync({db:f.db,send:async(_,events)=>({accepted:events.map(e=>e.id),records:[]}),online:()=>true});tab.setActor(owner);await tab.flush();
 await f.sync.flush();assert.equal(f.sync.state.pending,0);assert.equal(f.sync.state.status,'synced');
});
test('an ID conflict with a previously durable event cannot strand or replace the original queue entry',async()=>{
 const delivered=[],f=fixture(async(_,events)=>{delivered.push(...events);return {accepted:events.map(e=>e.id),records:[]};});
 await f.db.enqueue(event('same'));assert.equal(await f.sync.enqueue({...event('same'),payload:{...reflection,prediction:'Conflict'}}),false);
 await f.sync.flush({force:true});assert.equal(delivered.length,1);assert.equal(delivered[0].payload.prediction,reflection.prediction);assert.equal(f.sync.state.status,'synced');
});
