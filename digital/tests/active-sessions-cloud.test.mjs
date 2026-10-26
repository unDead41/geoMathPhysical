import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,actor} from './active-sessions-test-utils.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('session listing uses the owner-bound RPC with no user or session selector',async()=>{
  const f=fixture();await f.init();
  assert.equal(typeof f.cloud.securitySessions,'function');
  const data=await f.cloud.securitySessions({user_id:'another-account'});
  assert.equal(data.sessions.length,2);assert.equal(data.sessions.filter(row=>row.is_current).length,1);
  const call=f.calls.find(call=>call.path.endsWith('/geo_security_sessions'));
  assert.deepEqual(call.body,{});assert.equal(call.authorization,'Bearer '+f.state.current.access_token);
});
test('session list errors are sanitized and missing deployment is distinguished from expired Auth',async()=>{
  for(const [mode,code] of [['network','network'],['expired','session-expired'],['unavailable','sessions-unavailable']]){
    const f=fixture();await f.init();f.state.mode=mode;
    await assert.rejects(f.cloud.securitySessions(),error=>error.code===code&&!error.message.includes('PROVIDER'));
  }
});
test('late session metadata is rejected after an account switch and duplicate reads are suppressed',async()=>{
  const f=fixture();await f.init();let release;f.state.hold=new Promise(resolve=>{release=resolve;});
  const request=f.cloud.securitySessions();while(!f.state.listCalls)await tick();
  await assert.rejects(f.cloud.securitySessions(),error=>error.code==='busy');
  await f.switchAccount();release();await assert.rejects(request,error=>error.code==='session-changed');
  assert.notEqual(f.cloud.session.user.id,actor);
});
test('others logout uses documented scope, preserves current session, and requires observed acknowledgement',async()=>{
  const f=fixture();await f.init();
  const result=await f.cloud.auth('logout-others');
  assert.equal(result.otherSessionsSignedOut,true);assert.equal(f.cloud.session.user.id,actor);
  assert.deepEqual(f.state.logouts,['others']);assert.equal((await f.cloud.securitySessions()).sessions.length,1);
  const denied=fixture();await denied.init();denied.state.mode='logout-denied';
  await assert.rejects(denied.cloud.auth('logout-others'),error=>error.code==='unconfirmed-logout');
  assert.ok(denied.cloud.session);
});
test('confirmed current-session logout clears only that local session',async()=>{
  const f=fixture();await f.init();
  const result=await f.cloud.auth('logout-current');
  assert.equal(result.localSignedOut,true);assert.equal(f.cloud.session,null);
  assert.ok(f.state.logouts.every(scope=>scope==='local'));
});
test('late others logout does not clear a newly installed account',async()=>{
  const f=fixture();await f.init();let release;f.state.hold=new Promise(resolve=>{release=resolve;});
  const request=f.cloud.auth('logout-others');while(!f.state.logouts.length)await tick();
  await f.switchAccount();release();await assert.rejects(request,error=>error.code==='session-changed');
  assert.notEqual(f.cloud.session.user.id,actor);assert.deepEqual(f.state.logouts,['others']);
});
test('logout rejects caller-supplied user or session selectors before any provider mutation',async()=>{
  const f=fixture();await f.init();
  for(const payload of [{user_id:'another-account'},{session_id:'another-session'}])await assert.rejects(f.cloud.auth('logout-others',payload),error=>error.code==='invalid-input');
  assert.deepEqual(f.state.logouts,[]);
});
