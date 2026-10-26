import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAuthInput,makeAuthHandler,sha256} from '../backend/auth/index.ts';

const signup={action:'signup',username:' Student41 ',password:' Test Pass#41 ',display_name:'Nama Ujian',role:'student',email:' Student@Example.com '};
test('new signup requires a usable email and preserves the password verbatim',()=>{
  const value=validateAuthInput(signup);
  assert.equal(value.email,'student@example.com');assert.equal(value.username,'student41');assert.equal(value.password,signup.password);
  for(const email of [undefined,'','bad','a b@example.com','a@accounts.geodecoder.invalid','x'.repeat(255)+'@example.com'])assert.throws(()=>validateAuthInput({...signup,email}));
  assert.equal(validateAuthInput({action:'login',username:' Student@Example.com ',password:signup.password}).username,'student@example.com');
});
function fixture(identity=null){
  const calls=[];
  const handler=makeAuthHandler({url:'https://test',serviceKey:'private-test-key',publicKey:'public-test-key',fetcher:async(url,options)=>{
    const parsed=new URL(url),body=options.body?JSON.parse(options.body):null;
    calls.push({path:parsed.pathname,query:parsed.searchParams,body,headers:options.headers});
    let value;
    if(parsed.pathname.endsWith('/geo_rate_guard'))value=true;
    else if(parsed.pathname.endsWith('/geo_identity'))value=identity;
    else if(parsed.pathname.endsWith('/signup'))value={user:{id:'new-user'}};
    else if(parsed.pathname.endsWith('/token'))value={access_token:'test-session',refresh_token:'test-refresh'};
    else throw Error('Unexpected privileged operation '+parsed.pathname);
    return new Response(JSON.stringify(value),{status:200});
  }});
  return {handler,calls};
}
const request=input=>new Request('https://test',{method:'POST',body:JSON.stringify(input)});
test('signup uses normal email verification and atomic profile metadata, with no admin auto-confirm',async()=>{
  const {handler,calls}=fixture();const response=await handler(request(signup));const data=await response.json();
  assert.equal(response.status,200);assert.equal(data.confirmation_required,true);assert.equal(data.email,'student@example.com');
  const call=calls.find(c=>c.path.endsWith('/signup'));
  assert.equal(call.headers.apikey,'public-test-key');
  assert.equal(call.query.get('redirect_to'),'https://undead41.github.io/geodecoder-digital/');
  assert.deepEqual(call.body.data.geodecoder,{username:'student41',display_name:'Nama Ujian',role:'student'});
  assert.ok(!calls.some(c=>c.path.includes('/admin/')));assert.ok(!data.recovery_code);assert.ok(!data.session);
});
test('email login does not expose or enumerate private username identities',async()=>{
  const {handler,calls}=fixture();const response=await handler(request({action:'login',username:'Student@Example.com',password:signup.password}));
  assert.equal(response.status,200);assert.ok(!calls.some(c=>c.path.endsWith('/geo_identity')));
  assert.equal(calls.find(c=>c.path.endsWith('/token')).body.email,'student@example.com');
});
test('legacy recovery codes cannot reset an email account',async()=>{
  const code='a'.repeat(32);const {handler,calls}=fixture({user_id:'old-user',auth_email:'student@example.com',recovery_hash:await sha256(code)});
  const response=await handler(request({action:'recover',username:'student41',password:signup.password,recovery_code:code}));
  assert.equal(response.status,400);assert.ok(!calls.some(c=>c.path.includes('/admin/')));
});
