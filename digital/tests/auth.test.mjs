import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAuthInput,makeAuthHandler,sha256} from '../backend/auth/index.ts';
test('username auth validates normalized handles, password, role and recovery shape',()=>{
  assert.equal(validateAuthInput({action:'login',username:' Ijamm_41 ',password:'secure-demo41'}).username,'ijamm_41');
  for(const input of [{username:'ab'}, {password:'short'}, {username:'a<script>'}, {action:'signup',role:'admin'}, {action:'recover',recovery_code:'wrong'}])assert.throws(()=>validateAuthInput({action:'login',username:'student41',password:'secure-demo41',...input}));
});
test('SHA256 recovery verification is deterministic and does not store the code',async()=>{
  assert.equal((await sha256('abc')).length,64);assert.equal(await sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('public endpoint handles CORS, unsupported methods and missing configuration without privileged calls',async()=>{
  let calls=0;const handler=makeAuthHandler({url:'',serviceKey:'',publicKey:'',fetcher:()=>{calls++;}});
  assert.equal((await handler(new Request('https://test',{method:'OPTIONS'}))).status,204);
  assert.equal((await handler(new Request('https://test'))).status,405);
  assert.equal((await handler(new Request('https://test',{method:'POST',body:'{}'}))).status,503);assert.equal(calls,0);
});
test('invalid login input is rejected before network/database access',async()=>{
  let calls=0;const handler=makeAuthHandler({url:'https://test',serviceKey:'secret',publicKey:'public',fetcher:()=>{calls++;}});
  const r=await handler(new Request('https://test',{method:'POST',body:JSON.stringify({action:'login',username:'bad',password:'1'})}));
  assert.equal(r.status,400);assert.equal(calls,0);assert.ok(!(await r.text()).includes('secret'));
});
test('a new username with a null identity response can complete signup',async()=>{
  const paths=[];
  const handler=makeAuthHandler({url:'https://test',serviceKey:'private-test-key',publicKey:'public-test-key',fetcher:async(url,options)=>{
    const path=new URL(url).pathname;paths.push(path);
    let value;
    if(path.endsWith('/geo_rate_guard'))value=true;
    else if(path.endsWith('/geo_identity'))value=null;
    else if(path.endsWith('/admin/users'))value={id:'test-user'};
    else if(path.endsWith('/geo_provision'))value={profile:{username:'student41',role:'student'}};
    else if(path.endsWith('/token'))value={access_token:'test-session',refresh_token:'test-refresh'};
    else throw Error('Unexpected endpoint');
    return new Response(JSON.stringify(value),{status:200});
  }});
  const response=await handler(new Request('https://test',{method:'POST',body:JSON.stringify({action:'signup',username:'student41',password:'secure-demo41',display_name:'Student Test',role:'student'})}));
  const data=await response.json();
  assert.equal(response.status,200);assert.equal(data.session.access_token,'test-session');assert.equal(data.profile.username,'student41');assert.match(data.recovery_code,/^[a-f0-9]{32}$/);
  assert.equal(paths.filter(path=>path.endsWith('/admin/users')).length,1);
  assert.ok(!JSON.stringify(data).includes('private-test-key'));
});
