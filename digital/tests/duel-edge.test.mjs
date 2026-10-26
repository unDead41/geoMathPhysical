import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createDuelHandler } from '../backend/duel/functions/geodecoder-duel/handler.mjs';
import { QUESTIONS } from '../dist/questions.mjs';
import { questionTopic } from '../dist/core.mjs';

const token = 'ab'.repeat(32);
const roomId = '12345678-1234-4234-8234-123456789abc';
const config = {SUPABASE_URL:'https://duel.example.test', SUPABASE_SERVICE_ROLE_KEY:'test-server-key'};
const snapshot = () => ({ok:true,serverNow:1000,room:{id:roomId,code:'123456',status:'waiting',startsAt:null,deadlineAt:null,questionIds:[],total:10,winnerId:null,reason:null},me:{id:'me',slot:1,name:'Alias',ready:false,answered:0,stage:'solid',score:0,mistakes:0,skipped:0,hints:0,hintUsed:false,attempts:{solid:null,net:null},answers:[],seq:0,finishedAt:null,elapsed:0,forfeited:false,lastSeenAt:1000,nextReadyAt:null},opponent:null,actionResult:null});
function setup(rpc = () => snapshot(), options = {}) {
  const calls = [];
  const handler = createDuelHandler({env:name=>config[name],crypto:webcrypto,fetch:async (url,init)=>{
    calls.push({url,init,payload:JSON.parse(init.body).payload});
    const result = await rpc(calls.at(-1), calls.length);
    return result instanceof Response ? result : Response.json(result);
  },...options});
  return {handler,calls};
}
function post(body, headers = {}) {
  return new Request('https://duel.example.test/functions/v1/geodecoder-duel',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
}

test('authoritative SQL question metadata matches the actual offline bank',()=>{
  const sql=readFileSync(new URL('../backend/duel/schema.sql',import.meta.url),'utf8');
  const rows=[...sql.matchAll(/\('([PSKCB][123])','([a-z]+)','(properties|formula|net)'\)/g)]
    .map(([,id,shape,topic])=>({id,shape,topic})).sort((a,b)=>a.id.localeCompare(b.id));
  const bank=QUESTIONS.map(q=>({id:q.id,shape:q.shape,topic:questionTopic(q)})).sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(rows,bank);
});

test('offline file origins receive CORS without cookies; only POST is accepted',async()=>{
  const {handler,calls} = setup();
  const preflight = await handler(new Request('https://duel.example.test',{method:'OPTIONS',headers:{Origin:'null','Access-Control-Request-Method':'POST'}}));
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'*');
  assert.equal(preflight.headers.get('Access-Control-Allow-Credentials'),null);
  const get = await handler(new Request('https://duel.example.test'));
  assert.equal(get.status,405);
  assert.deepEqual(await get.json(),{ok:false,error:'invalid_request'});
  assert.equal(calls.length,0);
});

test('invalid JSON, arrays, missing tokens and unexpected client score/time/class never reach RPC',async()=>{
  const {handler,calls} = setup();
  const invalid = [null,[],{}, {action:'state',token:'a',roomId}, {action:'state',token,roomId,score:10}, {action:'create',token,name:'Alias',className:'Secret'}, {action:'create',token,name:'Alias',elapsed:1}];
  for (const body of invalid) assert.equal((await handler(post(body))).status,body?.token==='a'?401:400);
  const broken = new Request('https://duel.example.test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});
  assert.equal((await handler(broken)).status,400);
  assert.equal(calls.length,0);
});

test('body limit applies to declared lengths and streamed bodies',async()=>{
  const {handler,calls} = setup();
  const tooLarge = post({action:'create',token,name:'a'.repeat(5000)});
  assert.equal((await handler(tooLarge)).status,413);
  assert.equal((await handler(post({action:'create',token,name:'Alias'},{'Content-Length':'999999'}))).status,413);
  assert.equal(calls.length,0);
});

test('content type and action-specific fields are validated before RPC',async()=>{
  const {handler,calls} = setup();
  assert.equal((await handler(new Request('https://duel.example.test',{method:'POST',body:'{}'}))).status,415);
  for(const body of [
    {action:'join',token,name:'Alias',code:123456},
    {action:'join',token,name:'Alias',code:'12345'},
    {action:'create',token,name:'A'},
    {action:'state',token,roomId:'not-uuid'},
    {action:'ready',token,roomId,seq:0},
    {action:'ready',token,roomId,seq:1.5},
    {action:'skip',token,roomId,seq:1,questionIndex:10},
    {action:'scan',token,roomId,seq:1,questionIndex:0,kind:'solid',shape:'sphere',target:'r1'},
    {action:'scan',token,roomId,seq:1,questionIndex:0,kind:'solid',shape:'cube',target:'r3'}
  ]) assert.equal((await handler(post(body))).status,400,JSON.stringify(body));
  assert.equal(calls.length,0);
});

test('create uses SHA256 token, keyed fingerprint, cryptographic PIN and service-role-only RPC',async()=>{
  const {handler,calls} = setup();
  const response = await handler(post({action:'create',token:token.toUpperCase(),name:'  Ali   Bin  '},{'X-Forwarded-For':'203.0.113.5'}));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  const {payload,url,init} = calls[0];
  assert.equal(url,'https://duel.example.test/rest/v1/rpc/geodecoder_duel_gateway');
  assert.equal(init.headers.apikey,config.SUPABASE_SERVICE_ROLE_KEY);
  assert.equal(init.headers.Authorization,`Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`);
  assert.match(payload.code,/^[1-9]\d{5}$/);
  assert.equal(payload.name,'Ali Bin');
  assert.equal(payload.token,undefined);
  assert.equal(payload.tokenHash,Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex'));
  assert.match(payload.fingerprint,/^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(payload).includes('203.0.113.5'));
  assert.ok(!JSON.stringify(await response.json()).includes(config.SUPABASE_SERVICE_ROLE_KEY));
});

test('best-effort fingerprint consistently uses the final forwarding entry',async()=>{
  const {handler,calls} = setup();
  await handler(post({action:'state',token,roomId},{'X-Forwarded-For':'1.1.1.1, 203.0.113.9'}));
  await handler(post({action:'state',token,roomId},{'X-Forwarded-For':'2.2.2.2, 203.0.113.9'}));
  assert.equal(calls[0].payload.fingerprint,calls[1].payload.fingerprint);
});

test('PIN collisions are retried without changing player identity',async()=>{
  const {handler,calls} = setup((_,count)=>count<3?{ok:false,error:'pin_collision'}:snapshot());
  assert.equal((await handler(post({action:'create',token,name:'Alias'}))).status,200);
  assert.equal(calls.length,3);
  assert.equal(new Set(calls.map(c=>c.payload.tokenHash)).size,1);
  const failed = setup(()=>({ok:false,error:'pin_collision'}));
  assert.equal((await failed.handler(post({action:'create',token,name:'Alias'}))).status,503);
  assert.equal(failed.calls.length,5);
});

test('mutations preserve exact sequence/question/scan fields and never add client clock',async()=>{
  const {handler,calls} = setup();
  const body={action:'scan',token,roomId,seq:2,questionIndex:3,kind:'net',shape:'cone',target:'r2'};
  assert.equal((await handler(post(body))).status,200);
  const {token:ignored,...expected}=body;
  for(const [key,value] of Object.entries(expected))assert.equal(calls[0].payload[key],value);
  assert.equal(calls[0].payload.now,undefined);
});

test('known business errors map to deliberate HTTP statuses',async()=>{
  for(const [error,status] of Object.entries({invalid_request:400,invalid_token:401,room_unavailable:404,room_full:409,room_expired:410,not_started:409,not_ready:409,question_mismatch:409,stage_mismatch:409,sequence_mismatch:409,sequence_conflict:409,rate_limited:429,server_error:500})){
    const {handler}=setup(()=>({ok:false,error}));
    const response=await handler(post({action:'state',token,roomId}));
    assert.equal(response.status,status,error);
    assert.deepEqual(await response.json(),{ok:false,error});
  }
});

test('upstream failures and arbitrary database messages stay private',async()=>{
  for(const value of [Response.json({message:'sensitive database failure'},{status:500}),{ok:false,error:'SELECT secret FROM private.accounts'}, {unexpected:'database token hash'},null]){
    const {handler}=setup(()=>value);
    const response=await handler(post({action:'state',token,roomId}));
    assert.equal(response.status,500);
    assert.deepEqual(await response.json(),{ok:false,error:'server_error'});
  }
  const {handler}=setup(()=>{throw new Error('secret connection string');});
  assert.deepEqual(await (await handler(post({action:'state',token,roomId}))).json(),{ok:false,error:'server_error'});
});

test('snapshot response whitelist strips private token/sequence/answer data from opponent',async()=>{
  const value=snapshot();
  value.tokenHash='private';value.room.secret='private';value.me.tokenHash='private';
  value.opponent={...value.me,id:'other',answers:[{id:'P1'}],seq:5,attempts:{solid:'cube',net:null},hintUsed:true,tokenHash:'private'};
  const {handler}=setup(()=>value);
  const result=await (await handler(post({action:'state',token,roomId}))).json();
  assert.ok(!JSON.stringify(result).includes('private'));
  for(const field of ['answers','seq','attempts','hintUsed'])assert.equal(result.opponent[field],undefined);
  assert.equal(result.me.seq,0);
  assert.equal(result.me.nextReadyAt,null);
});

test('unconfigured functions return a sanitized error without calling upstream',async()=>{
  const {handler,calls}=setup(undefined,{env:()=>undefined});
  assert.equal((await handler(post({action:'state',token,roomId}))).status,500);
  assert.equal(calls.length,0);
});

test('RPC timeout is bounded and sanitized',async()=>{
  const {handler}=setup(undefined,{rpcTimeoutMs:10,fetch:async(_,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('timeout')),{once:true}))});
  const response=await handler(post({action:'state',token,roomId}));
  assert.equal(response.status,500);
  assert.deepEqual(await response.json(),{ok:false,error:'server_error'});
});
