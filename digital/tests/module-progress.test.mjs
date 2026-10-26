import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeModuleRecord,mergeModuleProgress,createModuleSession,ModuleProgress,MODULE_PROGRESS_KEY} from '../dist/module-progress.mjs';

const record=(activity='net',stage='explanation')=>({activity,stage,prediction:'Enam muka akan menutup kubus.',result:'Enam muka berbeza, tiada pertindihan.',explanation:stage==='explanation'?'Setiap muka menutup satu sisi kubus.':'',completed:stage==='explanation'});
test('HTTP preview can create an unpredictable module session without secure-context randomUUID',()=>{
  let entropyReads=0;
  const crypto={getRandomValues(bytes){entropyReads++;bytes.fill(entropyReads);return bytes;}};
  const first=createModuleSession(crypto),second=createModuleSession(crypto);
  assert.match(first,/^[a-f0-9]{32}$/);assert.notEqual(first,second);assert.equal(entropyReads,2);
  assert.equal(createModuleSession({randomUUID:()=> 'secure-context-uuid'}),'secure-context-uuid');
});
function setup(cloud=null,storageOverride){
  const values=new Map(),storage=storageOverride||{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
  const sent=[],frame={postMessage:(message,target)=>sent.push({message,target})};
  const controller=new ModuleProgress({storage,cloud,token:()=>`session-${sent.length}-${values.size}`,onChange:()=>{}});
  function ready(){controller.open(frame);controller.handleMessage({source:frame,data:{type:'geodecoder:module-ready',protocol:1}});return sent.at(-1).message.session;}
  function send(value,session=sent.at(-1)?.message.session,source=frame){return controller.handleMessage({source,data:{type:'geodecoder:module-progress',protocol:1,session,...value}});}
  return {controller,values,sent,frame,ready,send};
}
test('progress rejects malformed records and cannot complete from opening or prediction alone',()=>{
  assert.equal(normalizeModuleRecord({activity:'net',stage:'prediction',prediction:'',completed:false}),null);
  assert.equal(normalizeModuleRecord({...record(),activity:'constructor'}),null);
  assert.equal(normalizeModuleRecord({...record(),prediction:'x'.repeat(241)}),null);
  assert.equal(normalizeModuleRecord({...record(),stage:'experiment',completed:true}),null);
  assert.equal(normalizeModuleRecord({...record(),result:''}),null);
  assert.equal(normalizeModuleRecord({...record(),explanation:''}),null);
  assert.equal(normalizeModuleRecord(record()).completed,true);
});
test('merging out-of-order saves retains the highest milestone and completed evidence',()=>{
  const completed=record(),early={...record('net','prediction'),result:'',explanation:'',completed:false};
  assert.deepEqual(mergeModuleProgress([completed],[early]),[completed]);
  assert.deepEqual(mergeModuleProgress([early],[completed]),[completed]);
  assert.equal(mergeModuleProgress([completed,record('volume')],[{broken:true}]).length,2);
});
test('only the current iframe and nonce can save; ready/open never award completion',()=>{
  const f=setup();const session=f.ready();assert.equal(f.controller.state.completed,0);
  assert.equal(f.send(record(),session,{}),false);
  assert.equal(f.send(record(),'old-session'),false);
  assert.equal(f.send({...record(),protocol:2},session),false);
  assert.equal(f.send(record(),session),true);assert.equal(f.controller.state.completed,1);
  f.controller.close();assert.equal(f.send(record('area'),session),false);
  f.ready();assert.equal(f.send(record('area'),session),false);
});
test('guest records and accounts are isolated, including storage-denied session memory',()=>{
  for(const storage of [undefined,{getItem(){throw Error('denied');},setItem(){throw Error('quota');}}]){
    const f=setup(null,storage);f.ready();f.send(record());
    f.controller.setAccount({id:'student-a',role:'student'});f.ready();assert.equal(f.controller.state.completed,0);
    f.send(record('volume'));assert.equal(f.controller.state.completed,1);
    f.controller.setAccount({id:'student-b',role:'student'});f.ready();assert.equal(f.controller.state.completed,0);
    f.controller.setAccount({id:'student-a',role:'student'});assert.equal(f.controller.state.records[0].activity,'volume');
    f.controller.setAccount(null);assert.equal(f.controller.state.records[0].activity,'net');
  }
});
test('tampered stored records are bounded and unavailable storage keeps activity usable',()=>{
  const f=setup();f.values.set(MODULE_PROGRESS_KEY+'guest',JSON.stringify({version:1,records:[record(),{...record('area'),explanation:'x'.repeat(601)}]}));
  f.controller.setAccount({id:'other'});f.controller.setAccount(null);assert.equal(f.controller.state.completed,1);
  const blocked=setup(null,{getItem(){throw Error('denied');},setItem(){throw Error('denied');}});
  blocked.ready();assert.equal(blocked.send(record()),true);assert.equal(blocked.controller.state.storageFailed,true);
});
test('delayed cloud reads cannot copy the previous account progress into a new account',async()=>{
  let finish;const cloud={moduleProgress:()=>new Promise(resolve=>finish=resolve)};
  const f=setup(cloud);f.controller.setAccount({id:'student-a',role:'student'});
  const loading=f.controller.sync();f.controller.setAccount({id:'student-b',role:'student'});
  finish({records:[record()]});await loading;
  assert.equal(f.controller.state.completed,0);assert.ok(!f.values.get(MODULE_PROGRESS_KEY+'student-b')?.includes('Enam muka'));
});
test('failed cloud saves retain local progress and retry without duplicating milestones',async()=>{
  const calls=[];let fail=true;
  const cloud={async moduleProgress(action,payload){calls.push([action,payload]);if(action==='mine')return {records:[]};if(fail)throw Error('offline');return {records:[payload]};}};
  const f=setup(cloud);f.controller.setAccount({id:'student-a',role:'student'});f.ready();f.send(record());
  await f.controller.sync();assert.equal(f.controller.state.completed,1);assert.equal(f.controller.state.status,'pending');
  fail=false;await f.controller.sync();assert.equal(f.controller.state.status,'synced');
  assert.equal(f.controller.state.records.length,1);assert.equal(calls.filter(c=>c[0]==='save').length,2);
});
test('serial cloud saves keep a newer edit queued while an older save is in flight',async()=>{
  let finish,started;const saving=new Promise(resolve=>started=resolve),calls=[];
  const cloud={async moduleProgress(action,payload){if(action==='mine')return {records:[]};calls.push(payload);if(calls.length===1){started();return new Promise(resolve=>finish=resolve);}return {records:[payload]};}};
  const f=setup(cloud);f.controller.setAccount({id:'student-a',role:'student'});f.ready();
  f.send(record('net','prediction'));const task=f.controller.sync();await saving;
  f.send(record());finish({records:[calls[0]]});await task;
  assert.equal(calls.length,2);assert.equal(calls[1].completed,true);assert.equal(f.controller.state.status,'synced');
});
test('teachers and guests never send their practice records to the student save RPC',async()=>{
  let calls=0;const f=setup({async moduleProgress(){calls++;return {records:[]};}});
  f.ready();f.send(record());await f.controller.sync();
  f.controller.setAccount({id:'teacher-a',role:'teacher'});f.ready();f.send(record('volume'));await f.controller.sync();
  assert.equal(calls,0);assert.equal(f.controller.state.status,'local');
});
