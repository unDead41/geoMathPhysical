import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';

// Execute the actual k6 entry point against local stubs: no hosted requests.
const stubs={
  k6:'export const check=globalThis.__k6.check;export const sleep=globalThis.__k6.sleep;',
  'k6/http':'export default globalThis.__k6.http;',
  'k6/crypto':'export default globalThis.__k6.crypto;',
  'k6/metrics':'export const Rate=globalThis.__k6.Rate;',
  'k6/data':'export const SharedArray=globalThis.__k6.SharedArray;',
  'k6/execution':'export default globalThis.__k6.execution;',
  'k6/encoding':'export default globalThis.__k6.encoding;'
};
const bundle=(await build({entryPoints:[new URL('../backend/scaling/k6.mjs',import.meta.url).pathname],bundle:true,write:false,format:'cjs',platform:'node',plugins:[{name:'local-k6',setup(builder){
  builder.onResolve({filter:/^k6(?:\/.*)?$/},args=>({path:args.path,namespace:'local-k6'}));
  builder.onLoad({filter:/.*/,namespace:'local-k6'},args=>({contents:stubs[args.path]}));
}}]})).outputFiles[0].text;
const token=(userId,claims={})=>'e30.'+Buffer.from(JSON.stringify({sub:userId,exp:4102444800,...claims})).toString('base64url')+'.signature';
const fixtures=(length=9)=>Array.from({length},(_,i)=>({userId:'account-'+(i+1),accessToken:token('account-'+(i+1))}));
const response=(status=200,data={ok:true},headers={})=>({status,headers,json:()=>data});
function harness({users=fixtures(),handle,env={},shared=new Map(),counts={opens:0,factories:0,itemReads:0},id=1,localId=1}={}){
  const requests=[],sleeps=[],aborts=[],metrics=new Map(),metricSamples=[];let sequence=0;
  const execution={vu:{idInTest:id},test:{abort(message){aborts.push(message);throw Error('TEST_ABORT: '+message);}}};
  const request=(method,url,body,params)=>{
    const entry={method,url,body:body?JSON.parse(body):null,params};requests.push(entry);
    if(handle)return handle(entry,requests.length);
    if(method==='GET')return response();
    const jwt=params.headers.Authorization?.slice(7);
    return response(200,{profile:{id:jwt?JSON.parse(Buffer.from(jwt.split('.')[1],'base64url')).sub:'none'}});
  };
  const mocks={execution,http:{get:(url,params)=>request('GET',url,null,params),post:(url,body,params)=>request('POST',url,body,params)},
    check:(value,checks)=>Object.values(checks).every(fn=>fn(value)),sleep:seconds=>sleeps.push(seconds),
    crypto:{randomBytes:()=>new Uint8Array(32),sha256:()=>String(++sequence).padStart(64,'a')},
    encoding:{b64decode:(value,encoding,format)=>{assert.equal(encoding,'rawurl');assert.equal(format,'s');return Buffer.from(value,'base64url').toString('utf8');}},
    Rate:class{constructor(name){this.name=name;this.values=[];metrics.set(name,this.values);}add(value,tags){this.values.push(Boolean(value));metricSamples.push({name:this.name,value:Boolean(value),tags});}},
    SharedArray:class{constructor(name,factory){if(!shared.has(name)){counts.factories++;shared.set(name,factory());}return new Proxy(shared.get(name),{get(target,key){
      if(typeof key==='string'&&/^\d+$/.test(key)){counts.itemReads++;return structuredClone(target[key]);}return Reflect.get(target,key);
    }});}}
  };
  const exported={};
  const context={__ENV:{ALLOW_STAGING_LOAD:'yes',TARGET_ORIGIN:'https://staging.example',STAGING_HOST:'staging.example',SUPABASE_PUBLISHABLE_KEY:'staging-public-key',STATIC_ORIGIN:'https://static.example',STATIC_STAGING_HOST:'static.example',LOAD_USERS:'10',...env},
    __VU:localId,__k6:mocks,module:{exports:exported},exports:exported,open:()=>{counts.opens++;return JSON.stringify(users);}};
  vm.runInNewContext(bundle,context);
  return {api:context.module.exports,requests,sleeps,aborts,metrics,metricSamples,counts,execution};
}
test('all staging requests disable redirects globally and per request, including setup and static entry',()=>{
  const h=harness();
  assert.equal(h.api.options.maxRedirects,0);
  assert.equal(typeof h.api.setup,'function');assert.equal(h.api.setup(),undefined);
  h.api.module();h.api.classroom();
  assert.ok(h.requests.some(r=>r.method==='GET'));assert.ok(h.requests.some(r=>r.method==='POST'));
  for(const request of h.requests)assert.equal(request.params.redirects,0);
});
test('mixed fixtures use one SharedArray parse and no full per-VU account copy at 5000 users',()=>{
  const shared=new Map(),counts={opens:0,factories:0,itemReads:0},users=fixtures(4750),env={LOAD_USERS:'5000'};
  harness({users,env,shared,counts,id:1});harness({users,env,shared,counts,id:4750});
  assert.equal(counts.factories,1);assert.equal(counts.opens,1);assert.equal(counts.itemReads,0);
});
test('all-Duel profiles need no private classroom fixtures or static frontend',()=>{
  const h=harness({env:{WORKLOAD:'duel',LOAD_USERS:'5000',STATIC_ORIGIN:'',CLASSROOM_USERS_FILE:''}});
  assert.equal(h.api.options.scenarios.duel.stages[0].target,2500);
  assert.equal(h.api.setup(),undefined);assert.equal(h.counts.opens,0);assert.equal(h.requests.length,0);
});
test('classroom selection uses globally unique IDs across scenario and generator boundaries',()=>{
  const h=harness({id:8,localId:1});h.api.classroom();
  assert.ok(h.requests.length>0);
  for(const request of h.requests)assert.equal(request.params.headers.Authorization,'Bearer '+token('account-8'));
  const missing=harness({id:10});assert.throws(()=>missing.api.classroom());
  assert.equal(missing.requests.length,0);assert.equal(missing.aborts.length,1);
});
test('fixture validation runs inside the shared callback before any HTTP request',()=>{
  for(const alter of [users=>{users[1].accessToken=users[0].accessToken;},users=>{users[0].accessToken=token('another-account');},users=>{users[0].accessToken=token(users[0].userId,{exp:1});}]){
    const users=fixtures();alter(users);assert.throws(()=>harness({users}));
  }
});
test('setup verifies every fixture identity authoritatively and returns no private data',()=>{
  const h=harness();assert.equal(typeof h.api.setup,'function');assert.equal(h.api.setup(),undefined);
  assert.equal(h.requests.length,9);
  for(const request of h.requests)assert.equal(request.body.action,'snapshot');
  const mismatch=harness({handle:()=>response(200,{profile:{id:'another-account'}})});
  assert.throws(()=>mismatch.api.setup());assert.equal(mismatch.aborts.length,1);assert.equal(mismatch.requests.length,1);
  assert.ok(mismatch.metrics.get('semantic_failures').includes(true));
  assert.doesNotMatch(mismatch.aborts.join(' '),/another-account|account-1|e30\./);
});
test('preflight successes cannot dilute HTTP or semantic SLOs for the measured load',()=>{
  const h=harness();h.api.setup();const preflightRequests=h.requests.length,preflightSamples=h.metricSamples.length;
  h.api.module();h.api.classroom();
  assert.ok(h.requests.slice(0,preflightRequests).every(request=>request.params.tags.phase==='setup'));
  assert.ok(h.requests.slice(preflightRequests).every(request=>request.params.tags.phase==='load'));
  assert.ok(h.metricSamples.slice(0,preflightSamples).every(sample=>sample.tags.phase==='setup'));
  assert.ok(h.metricSamples.slice(preflightSamples).every(sample=>sample.tags.phase==='load'));
  assert.deepEqual(Object.keys(h.api.options.thresholds).sort(),['http_req_duration{phase:load}','http_req_failed{phase:load}','semantic_failures{phase:load}']);
});
test('HTTP and semantic failures remain in metrics and every failed iteration is paced',()=>{
  for(const reply of [response(0,null),response(409,{error:'conflict'}),response(429,{error:'rate_limited'},{'Retry-After':'999999'}),response(500,{error:'server_error'}),response(200,{error:{code:'temporary_error'}})]){
    const h=harness({handle:()=>reply});assert.throws(()=>h.api.classroom());
    assert.ok(h.metrics.get('semantic_failures').includes(true));
    assert.ok(h.sleeps.some(seconds=>seconds>=1&&seconds<=60));
    assert.ok(h.sleeps.every(seconds=>Number.isFinite(seconds)&&seconds<=60));assert.equal(h.requests.length,1);
  }
  const scriptFailure=harness({handle:()=>response(200,{ok:true})});assert.throws(()=>scriptFailure.api.duel());
  assert.ok(scriptFailure.sleeps.some(seconds=>seconds>=1&&seconds<=60));
  assert.ok(scriptFailure.metrics.get('semantic_failures').includes(true));
});
test('credential and configuration failures abort without repeated requests or credential details',()=>{
  for(const status of [401,403,405])for(const scenario of ['classroom','module','setup']){
    const h=harness({handle:()=>response(status,{error:'do-not-log-private-credential'})});
    assert.throws(()=>h.api[scenario]());assert.equal(h.aborts.length,1);assert.equal(h.requests.length,1);
    assert.ok(h.metrics.get('semantic_failures').includes(true));
    assert.doesNotMatch(h.aborts.join(' '),/do-not-log-private-credential|e30\./);
  }
  const h=harness({handle:(_,index)=>index===1?response(200,{ok:true,room:{id:'room',code:'ABC123',status:'lobby'},me:{seq:0}}):response(401,{error:'invalid_token'})});
  assert.throws(()=>h.api.duel());assert.equal(h.aborts.length,1);assert.equal(h.requests.length,2);
});
test('remote redirects fail closed before any production host can be requested',()=>{
  const h=harness({handle:()=>response(302,null,{Location:'https://fkrlwzxvyufndavlpzbp.supabase.co'})});
  assert.throws(()=>h.api.module());assert.equal(h.requests.length,1);assert.equal(h.requests[0].params.redirects,0);
  assert.equal(h.aborts.length,1);assert.ok(h.metrics.get('semantic_failures').includes(true));
});
test('unexpected request exceptions are paced and rethrown without private response data',()=>{
  const h=harness({handle:()=>{throw Error('do-not-log-private-credential');}});
  assert.throws(()=>h.api.classroom(),error=>{assert.doesNotMatch(error.message,/do-not-log-private-credential/);return true;});
  assert.ok(h.sleeps.some(seconds=>seconds>=1&&seconds<=60));assert.ok(h.metrics.get('semantic_failures').includes(true));
});
