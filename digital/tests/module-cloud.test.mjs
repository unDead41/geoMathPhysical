import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ClassroomCloud} from '../dist/cloud.mjs';
function fixture(response){
  const calls=[],cloud=new ClassroomCloud({url:'https://test',publishableKey:'public'});
  cloud._session={user:{id:'a'}};
  cloud._client={rpc(name,args){calls.push([name,args]);return {abortSignal:()=>response()};}};
  return {cloud,calls};
}
test('module records use the dedicated authenticated RPC without affecting game actions',async()=>{
  const {cloud,calls}=fixture(async()=>({data:{records:[]},error:null}));
  await cloud.moduleProgress('mine',{});assert.deepEqual(calls,[['geo_module_progress',{action:'mine',payload:{}}]]);
  cloud._session=null;await assert.rejects(()=>cloud.moduleProgress('mine',{}),/Log masuk/);assert.equal(calls.length,1);
});
test('a delayed module RPC is rejected after the account changes',async()=>{
  let finish;const {cloud}=fixture(()=>new Promise(resolve=>finish=resolve));
  const task=cloud.moduleProgress('mine',{});cloud._session={user:{id:'b'}};finish({data:{records:[]},error:null});
  await assert.rejects(()=>task,/Akaun sudah berubah/);
});
test('missing migration or denied class access has an actionable safe error',async()=>{
  const missing=fixture(async()=>({data:null,error:{code:'PGRST202'}}));
  await assert.rejects(()=>missing.cloud.moduleProgress('mine'),/peranti masih boleh digunakan/);
  const denied=fixture(async()=>({data:{error:{message:'Kelas ini tidak boleh diakses.'}},error:null}));
  await assert.rejects(()=>denied.cloud.moduleProgress('class'),/Kelas ini/);
});
