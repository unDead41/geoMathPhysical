// Opt-in hosted Auth test. Credentials are read from an external mode-0600 file,
// never CLI arguments, output, source control or a real learner's account.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {ClassroomCloud} from '../../dist/cloud.mjs';
import {CLOUD_CONFIG} from '../../dist/cloud-config.mjs';

if(process.env.GEODECODER_LIVE_SESSION_TEST!=='temporary-fixtures-only')throw Error('Explicit temporary-fixtures-only opt-in required');
const file=process.env.GEODECODER_SESSION_FIXTURES_FILE;
if(!file||(fs.statSync(file).mode&0o077)!==0)throw Error('External private fixture file required');
const fixtures=JSON.parse(fs.readFileSync(file,'utf8'));
if(!Array.isArray(fixtures)||fixtures.length!==2||fixtures.some(f=>!/^qa-session-[a-f0-9-]+@accounts\.geodecoder\.invalid$/.test(f.email)))throw Error('Only dedicated synthetic session-test accounts are allowed');
const evidence={type:'hosted Supabase Auth with dedicated temporary QA accounts; three isolated SDK clients, not browser profiles',checks:[]};
const clients=[];
function mark(name,detail=true){evidence.checks.push({name,passed:true,detail});}
async function login(fixture,label){
  const cloud=new ClassroomCloud(CLOUD_CONFIG,{recoveryStorage:null,location:{href:'https://session-test.invalid/'},createClient:(url,key,options)=>createClient(url,key,{...options,auth:{...options.auth,persistSession:false,autoRefreshToken:false},global:{...options.global,headers:{'User-Agent':'GeoDecoder-Session-QA/'+label},fetch:options.global?.fetch||fetch}})});
  cloud.startHeartbeat=()=>{};clients.push(cloud);
  const {data,error}=await cloud.client.auth.signInWithPassword({email:fixture.email,password:fixture.password});
  assert.equal(error,null,'QA sign-in failed');assert.equal(data.user.id,fixture.id);await cloud.init();return cloud;
}
try{
  const a=await login(fixtures[0],'A'),b=await login(fixtures[0],'B'),c=await login(fixtures[1],'C');
  const beforeA=await a.securitySessions(),beforeB=await b.securitySessions(),beforeC=await c.securitySessions();
  assert.equal(beforeA.sessions.length,2);assert.equal(beforeB.sessions.length,2);assert.equal(beforeC.sessions.length,1);
  assert.ok(beforeA.sessions.find(r=>r.is_current).user_agent.includes('/A'));assert.ok(beforeB.sessions.find(r=>r.is_current).user_agent.includes('/B'));
  assert.ok(beforeC.sessions.every(r=>r.user_agent.includes('/C')));
  mark('two real Auth sessions listed with correct current labels');mark('other account sees only its own session');
  const foreignRead=await c.client.rpc('geo_security_sessions',{user_id:fixtures[0].id});
  assert.ok(foreignRead.error);mark('foreign account selector rejected by RPC signature');
  await assert.rejects(c.auth('logout-others',{user_id:fixtures[0].id}),e=>e.code==='invalid-input');
  assert.equal((await a.securitySessions()).sessions.length,2);mark('foreign revocation selector rejected without changing A or B');
  const revoked=await a.auth('logout-others');assert.equal(revoked.otherSessionsSignedOut,true);
  assert.equal((await a.securitySessions()).sessions.length,1);assert.equal((await c.securitySessions()).sessions.length,1);
  mark('documented others logout acknowledged; current A and unrelated C remain usable');
  const oldAccess=b.session.access_token;
  const rejected=await b.client.rpc('geo_security_sessions');
  assert.equal(rejected.data?.error?.code,'session-expired');mark('revoked B denied by session-aware RPC');
  const claims=JSON.parse(Buffer.from(oldAccess.split('.')[1],'base64url').toString('utf8'));
  mark('revoked access JWT still has unelapsed exp claim',{secondsUntilExpiry:Math.max(0,claims.exp-Math.floor(Date.now()/1000)),note:'Unelapsed exp does not establish authorization on other APIs.'});
  const refresh=await b.client.auth.refreshSession();assert.ok(refresh.error);assert.equal(refresh.data.session,null);
  mark('B refresh denied by hosted Auth',{providerCode:refresh.error.code});
  const anonymous=createClient(CLOUD_CONFIG.url,CLOUD_CONFIG.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const denied=await anonymous.rpc('geo_security_sessions');assert.ok(denied.error);mark('anonymous RPC rejected');
  await a.auth('logout-current');assert.equal(a.session,null);assert.equal((await c.securitySessions()).sessions.length,1);
  mark('current-only logout leaves other account C usable');
}catch(error){
  evidence.failure={name:error.name,code:error.code||'assertion',message:'Hosted check failed; no provider or credential payload is included.'};process.exitCode=1;
}finally{
  for(const cloud of clients){try{await cloud.client.auth.signOut({scope:'local'});}catch{}cloud.client.auth.stopAutoRefresh();}
  console.log(JSON.stringify(evidence,null,2));
}
