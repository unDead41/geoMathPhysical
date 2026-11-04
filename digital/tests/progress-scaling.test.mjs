import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ModuleProgress,MODULE_PROGRESS_KEY} from '../dist/module-progress.mjs';
const record=explanation=>({activity:'net',stage:'explanation',prediction:'Prediction',result:'Observed',explanation,completed:true});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(cloud,options={}){
  const values=new Map(),frame={postMessage(){}};
  const progress=new ModuleProgress({cloud,random:()=>0,...options,storage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}});
  progress.setAccount({id:'student-a',role:'student'});progress.open(frame);
  progress.handleMessage({source:frame,data:{type:'geodecoder:module-ready',protocol:1}});
  const send=text=>progress.handleMessage({source:frame,data:{type:'geodecoder:module-progress',protocol:1,session:progress.session,...record(text)}});
  return {progress,values,send};
}
test('successive reflections persist immediately but coalesce into one cloud read/save',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});const calls=[];
  const f=fixture({async moduleProgress(action,payload){calls.push([action,payload]);return {records:action==='save'?[payload]:[]};}});
  f.send('First');f.send('Second');f.send('Final');await flush();
  assert.equal(calls.length,0);assert.match(f.values.get(MODULE_PROGRESS_KEY+'student-a'),/Final/);
  t.mock.timers.tick(500);await flush();assert.equal(calls.length,2);
  assert.equal(calls[1][1].explanation,'Final');assert.equal(f.progress.state.status,'synced');
});
test('a failed progress save retries without another UI event and preserves the newer record',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let fail=true,writes=0;
  const f=fixture({async moduleProgress(action,payload){if(action==='mine')return {records:[]};writes++;if(fail)throw Error('offline');return {records:[payload]};}});
  f.send('Keep this');await f.progress.sync();assert.equal(f.progress.state.status,'pending');fail=false;
  t.mock.timers.tick(1000);await flush();assert.equal(writes,2);assert.equal(f.progress.state.status,'synced');
});
test('queued progress cannot send an old actor after switching accounts',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});const calls=[];
  const f=fixture({async moduleProgress(action,payload,options){calls.push(options.expectedUserId);return {records:[]};}});
  f.send('Private A');f.progress.setAccount({id:'student-b',role:'student'});
  t.mock.timers.tick(30000);await flush();assert.deepEqual(calls,[]);
  assert.equal(f.progress.state.records.length,0);assert.match(f.values.get(MODULE_PROGRESS_KEY+'student-a'),/Private A/);
});
test('offline progress keeps pending records without issuing doomed requests',async()=>{
  let calls=0;const f=fixture({async moduleProgress(){calls++;throw Error('offline');}},{isOnline:()=>false});
  f.send('Offline');await f.progress.sync();assert.equal(calls,0);assert.equal(f.progress.state.status,'pending');
});
