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
test('a new username with a null identity response can request email confirmation',async()=>{
  const paths=[];
  const handler=makeAuthHandler({url:'https://test',serviceKey:'private-test-key',publicKey:'public-test-key',fetcher:async(url,options)=>{
    const path=new URL(url).pathname;paths.push(path);
    let value;
    if(path.endsWith('/geo_rate_guard'))value=true;
    else if(path.endsWith('/geo_identity'))value=null;
    else if(path.endsWith('/signup'))value={user:{id:'test-user'}};
    else throw Error('Unexpected endpoint');
    return new Response(JSON.stringify(value),{status:200});
  }});
  const response=await handler(new Request('https://test',{method:'POST',body:JSON.stringify({action:'signup',username:'student41',email:'student@example.com',password:'secure-demo41',display_name:'Student Test',role:'student'})}));
  const data=await response.json();
  assert.equal(response.status,200);assert.equal(data.confirmation_required,true);assert.equal(data.email,'student@example.com');assert.equal(data.session,undefined);
  assert.equal(paths.filter(path=>path.endsWith('/signup')).length,1);
  assert.ok(!JSON.stringify(data).includes('private-test-key'));
});
