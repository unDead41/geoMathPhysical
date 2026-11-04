import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRetryAfter,retryDelay,duelPollDelay,ScopedRequestCache} from '../dist/network-policy.mjs';
test('retry policy handles HTTP dates, bad values and a server delay beyond its jitter cap',()=>{
  assert.equal(parseRetryAfter('7',1000),7000);assert.equal(parseRetryAfter('Thu, 01 Jan 1970 00:00:08 GMT',1000),7000);
  for(const value of [null,'','garbage','-5'])assert.equal(parseRetryAfter(value,1000),0);
  assert.equal(retryDelay(20,{random:()=>1,retryAfterMs:90000}),90000);
  assert.equal(duelPollDelay({room:{status:'complete'}}),null);
  assert.ok(duelPollDelay({room:{status:'playing'}},{hidden:true,random:()=>0})>=30000);
});
test('snapshot cache expires, bounds entries, isolates caller mutations and forgets rejected reads',async()=>{
  let now=0,calls=0;const cache=new ScopedRequestCache({ttlMs:1000,maxEntries:2,now:()=>now});
  const load=async()=>{calls++;return {profile:{id:'a'}};};
  const first=await cache.get('a',load);first.profile.id='tampered';assert.equal((await cache.get('a',load)).profile.id,'a');assert.equal(calls,1);
  now=1001;await cache.get('a',load);assert.equal(calls,2);
  await cache.get('b',load);await cache.get('c',load);assert.equal(cache.entries.size,2);
  await assert.rejects(cache.get('error',()=>Promise.reject(Error('offline'))));
  assert.equal(cache.entries.has('error'),false);
  cache.clear();assert.equal(cache.entries.size,0);
});
