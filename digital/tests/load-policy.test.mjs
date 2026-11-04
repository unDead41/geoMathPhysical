import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stagingTarget,workloadCounts} from '../backend/scaling/load-policy.mjs';
import * as policy from '../backend/scaling/load-policy.mjs';
test('load target requires an exact isolated host and unconditionally rejects production',()=>{
  for(const target of ['https://fkrlwzxvyufndavlpzbp.supabase.co','https://undead41.github.io','https://fkrlwzxvyufndavlpzbp.supabase.co.','https://undead41.github.io.'])assert.throws(()=>stagingTarget(target,target.slice(8),'yes'));
  assert.throws(()=>stagingTarget('https://staging.example','staging.example','no'));
  for(const target of ['https://user:pass@staging.example','https://staging.example/secret','https://staging.example?token=x','https://wrong.example','http://staging.example'])assert.throws(()=>stagingTarget(target,'staging.example','yes'));
  assert.equal(stagingTarget('https://staging.example/','staging.example','yes'),'https://staging.example');
  assert.equal(stagingTarget('http://127.0.0.1:1234','','yes'),'http://127.0.0.1:1234');
});
test('capacity profiles count actual people rather than confusing two-player matches with users',()=>{
  assert.deepEqual(workloadCounts(5000,'mixed'),{module:3500,classroom:1000,duelPairs:250,users:5000});
  assert.deepEqual(workloadCounts(5000,'duel'),{module:0,classroom:0,duelPairs:2500,users:5000});
  for(const users of [-1,1,5001,NaN,2.5])assert.throws(()=>workloadCounts(users));
  assert.throws(()=>workloadCounts(101,'duel'));
});
const decode=value=>Buffer.from(value,'base64url').toString('utf8');
const fixture=(userId,claims={})=>({userId,accessToken:'e30.'+Buffer.from(JSON.stringify({sub:userId,exp:2000,...claims})).toString('base64url')+'.signature'});
test('classroom fixtures are checked once without copying the private account array',()=>{
  const users=[fixture('one'),fixture('two')];
  assert.equal(policy.validateClassroomFixtures(users,2,decode,1000),users);
  assert.throws(()=>policy.validateClassroomFixtures(users,3,decode,1000),/account per possible VU/);
  assert.throws(()=>policy.validateClassroomFixtures({},1,decode,1000),/array/);
});
test('classroom fixtures reject duplicated credentials, mislabeled identities and expired sessions',()=>{
  assert.equal(typeof policy.validateClassroomFixtures,'function');
  for(const users of [
    [fixture('one'),fixture('one',{exp:3000})],
    [fixture('one'),{...fixture('one'),userId:'two'}],
    [fixture('one',{sub:'another-account'})],
    [fixture('one',{exp:1000})],
    [fixture('one',{exp:'2000'})],
    [fixture('one',{exp:null})]
  ])assert.throws(()=>policy.validateClassroomFixtures(users,1,decode,1000));
  assert.throws(()=>policy.validateClassroomFixtures([{userId:'one',accessToken:'do-not-log-private-credential'}],1,decode,1000),error=>{
    assert.doesNotMatch(error.message,/do-not-log-private-credential/);return true;
  });
});
