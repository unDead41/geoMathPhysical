import test from 'node:test';
import assert from 'node:assert/strict';
import {AuthRetryableFetchError} from '@supabase/supabase-js';
import {ClassroomCloud} from '../dist/cloud.mjs';
import {ModuleProgress,MODULE_PROGRESS_KEY} from '../dist/module-progress.mjs';
import {createOfflineRuntime} from '../dist/offline-runtime.mjs';

const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const account=id=>({user:{id},access_token:'fixture-'+id,refresh_token:'refresh-'+id});
const offlineError=()=>new AuthRetryableFetchError('Fixture offline',503);
function cloudFixture(){
  const cloud=new ClassroomCloud({url:'https://fixture.invalid',publishableKey:'public'},{recoveryStorage:null});
  let calls=0,response={profile:{id:owner},classes:[]};
  cloud._setSession(account(owner));
  cloud._client={auth:{async getSession(){return {data:{session:cloud.session},error:null};}},rpc(){calls++;return {setHeader(){return this;},abortSignal(){return Promise.resolve({data:response,error:null});}};}};
  return {cloud,get calls(){return calls;},set response(value){response=value;}};
}

test('snapshot cache checks keep a retryable SDK refresh failure transient before and after a hit',async()=>{
  for(const failureRead of [1,2]){
    const f=cloudFixture();await f.cloud.rpc('snapshot');
    const session=f.cloud.session,profile=f.cloud.profile;let reads=0;
    f.cloud.client.auth.getSession=async()=>++reads===failureRead?{data:{session:null},error:offlineError()}:{data:{session},error:null};
    await assert.rejects(f.cloud.rpc('snapshot'),{code:'network'});
    assert.equal(f.cloud.session,session);assert.equal(f.cloud.profile,profile);assert.equal(f.calls,1);
    f.cloud.client.auth.getSession=async()=>({data:{session},error:null});
    assert.equal((await f.cloud.rpc('snapshot')).profile.id,owner);assert.equal(f.calls,1);
  }
});

test('a retryable SDK error cannot authorize a cached snapshot after the owner or session changes',async()=>{
  for(const replacement of [account(other),{...account(owner),access_token:'different-session'}]){
    const f=cloudFixture();await f.cloud.rpc('snapshot');
    f.cloud.client.auth.getSession=async()=>({data:{session:replacement},error:offlineError()});
    await assert.rejects(f.cloud.rpc('snapshot'),{code:'session-changed'});assert.equal(f.calls,1);
  }
});

test('coalesced classroom reads preserve CRUD errors and allow a new read after access is restored',async()=>{
  const f=cloudFixture();f.response={error:{code:'forbidden',message:'Bilik ini tidak boleh diakses.'}};
  const results=await Promise.allSettled([f.cloud.rpc('snapshot'),f.cloud.rpc('snapshot')]);
  assert.equal(f.calls,1);
  for(const result of results){assert.equal(result.status,'rejected');assert.equal(result.reason.code,'forbidden');assert.equal(result.reason.message,'Bilik ini tidak boleh diakses.');}
  f.response={profile:{id:owner},classes:[]};
  assert.equal((await f.cloud.rpc('snapshot')).profile.id,owner);assert.equal(f.calls,2);
});

test('offline module edits enter the durable outbox immediately without scheduling the direct RPC debounce',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=cloudFixture(),values=new Map(),rows=[],calls=[];let online=false;
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const db={
    async enqueue(event){rows.push(structuredClone(event));},
    async list(id){return structuredClone(rows.filter(row=>row.owner===id));},
    async ack(id,ids){for(let index=rows.length-1;index>=0;index--)if(rows[index].owner===id&&ids.includes(rows[index].id))rows.splice(index,1);}
  };
  f.cloud.profile={id:owner,role:'student'};
  f.cloud._client.rpc=(name,args)=>{let authorization;return {setHeader(_name,value){authorization=value;return this;},abortSignal(){calls.push({name,args,authorization});return Promise.resolve({data:{accepted:args.payload.events.map(event=>event.id),records:[]},error:null});}};};
  const runtime=createOfflineRuntime({cloud:f.cloud,storage,db,online:()=>online,autoStart:false,view:{update(){}}});
  const progress=new ModuleProgress({storage,cloud:f.cloud,random:()=>0,isOnline:()=>online,syncAdapter:controller=>runtime.syncModule(controller),onRecord:(id,record)=>runtime.recordModule(id,record)});
  runtime.attachModule(progress);
  try{
    const frame={postMessage(){}};progress.open(frame);
    progress.handleMessage({source:frame,data:{type:'geodecoder:module-ready',protocol:1}});
    for(const prediction of ['First prediction','Second prediction','Final prediction'])progress.handleMessage({source:frame,data:{type:'geodecoder:module-progress',protocol:1,session:progress.session,activity:'net',stage:'prediction',prediction,result:'',explanation:'',completed:false}});
    await runtime.settle();
    assert.deepEqual(rows.map(row=>row.payload.prediction),['First prediction','Second prediction','Final prediction']);
    assert.equal(progress._syncTimer,null);assert.match(values.get(MODULE_PROGRESS_KEY+owner),/Final prediction/);
    t.mock.timers.tick(30000);assert.deepEqual(calls,[]);
    f.cloud._setSession(account(other));f.cloud.profile={id:other,role:'student'};runtime.updateAccount(f.cloud.session);
    online=true;await runtime.wake({force:true});assert.deepEqual(calls,[]);assert.equal(rows.length,3);
    f.cloud._setSession(account(owner));f.cloud.profile={id:owner,role:'student'};runtime.updateAccount(f.cloud.session);
    await runtime.wake({force:true});
    assert.equal(rows.length,0);assert.equal(calls.length,1);assert.equal(calls[0].name,'geo_offline_sync');
    assert.equal(calls[0].authorization,'Bearer '+account(owner).access_token);
    assert.ok(calls[0].args.payload.events.every(event=>event.owner===undefined));
    assert.equal(progress.state.records[0].prediction,'Final prediction');assert.equal(progress.state.status,'synced');
  }finally{runtime.stop();}
});
