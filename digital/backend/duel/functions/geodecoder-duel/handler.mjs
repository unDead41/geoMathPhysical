import {DUEL_QUESTIONS} from './questions.mjs';
// This module also runs under Node: the deployed Deno entry point only supplies env.
const ACTIONS = new Set(['create','join','state','ready','leave','hint','skip','scan','advance']);
const MUTATIONS = new Set(['ready','leave','hint','skip','scan','advance']);
const QUESTIONS = new Set(['hint','skip','scan','advance']);
const SHAPES = new Set(['cube','cuboid','pyramid','cylinder','cone']);
const STATUS = Object.freeze({invalid_request:400,invalid_token:401,room_unavailable:404,room_full:409,room_expired:410,not_started:409,not_ready:409,question_mismatch:409,stage_mismatch:409,sequence_mismatch:409,sequence_conflict:409,rate_limited:429,client_update_required:426,backend_update_required:503,server_error:500});
const CORS = Object.freeze({'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type, authorization, apikey, x-client-info','Access-Control-Expose-Headers':'X-GeoDecoder-Duel-Protocol','X-GeoDecoder-Duel-Protocol':'2','Access-Control-Max-Age':'86400','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
const MAX_BODY = 4096;
const encoder = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
const isObject = value => value!==null && typeof value==='object' && !Array.isArray(value);
const pick = (value, fields) => Object.fromEntries(fields.filter(key=>Object.hasOwn(value,key)).map(key=>[key,value[key]]));
const ROOM_FIELDS = ['id','code','status','startsAt','deadlineAt','lobbyExpiresAt','total','winnerId','reason'];
const SUMMARY_FIELDS = ['id','slot','name','ready','answered','stage','score','mistakes','skipped','hints','finishedAt','elapsed','forfeited','lastSeenAt'];
const ANSWER_FIELDS = ['id','shape','topic','outcome','hint','failedAt','elapsed','firstTry'];

function reply(value,status=200) {
  return new Response(JSON.stringify(value),{status,headers:{...CORS,'Content-Type':'application/json; charset=utf-8',...(status===429?{'Retry-After':'2'}:{}),...(status===405?{Allow:'POST, OPTIONS'}:{})}});
}
const error = (code,status=STATUS[code]??500) => reply({ok:false,error:code},status);

function validate(body) {
  if(!isObject(body) || !ACTIONS.has(body.action))return 'invalid_request';
  if(body.protocol!==2)return 'client_update_required';
  if(typeof body.token!=='string' || !/^[a-f0-9]{64}$/i.test(body.token))return 'invalid_token';
  const allowed = ['action','token','protocol'];
  if(body.action==='create'||body.action==='join'){
    allowed.push('name');
    if(typeof body.name!=='string' || /[\u0000-\u001f\u007f]/.test(body.name))return 'invalid_request';
    body.name=body.name.trim().replace(/\s+/gu,' ');
    if(body.name.length<2||body.name.length>60)return 'invalid_request';
    if(body.action==='join'){
      allowed.push('code');
      if(typeof body.code!=='string'||!/^\d{6}$/.test(body.code))return 'invalid_request';
    }
  }else{
    allowed.push('roomId');
    if(typeof body.roomId!=='string'||!/^\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b$/i.test(body.roomId))return 'invalid_request';
    body.roomId=body.roomId.toLowerCase();
  }
  if(MUTATIONS.has(body.action)){
    allowed.push('seq');
    if(!Number.isSafeInteger(body.seq)||body.seq<1||body.seq>2147483647)return 'invalid_request';
  }
  if(QUESTIONS.has(body.action)){
    allowed.push('questionIndex');
    if(!Number.isInteger(body.questionIndex)||body.questionIndex<0||body.questionIndex>9)return 'invalid_request';
  }
  if(body.action==='scan'){
    allowed.push('kind','shape','target');
    if(!['solid','net'].includes(body.kind)||!SHAPES.has(body.shape)||!['r1','r2'].includes(body.target))return 'invalid_request';
  }
  if(Object.keys(body).some(key=>!allowed.includes(key)))return 'invalid_request';
  body.token=body.token.toLowerCase();
  return null;
}

async function readBody(request) {
  const length=request.headers.get('content-length');
  if(length && (!/^\d+$/.test(length)||Number(length)>MAX_BODY))throw {status:413};
  if(!request.body)throw {status:400};
  const reader=request.body.getReader();
  const chunks=[];
  let size=0;
  try{
    for(;;){
      const {value,done}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>MAX_BODY){await reader.cancel();throw {status:413};}
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);
  let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}

function randomCode(crypto) {
  // Rejection sampling avoids modulo bias; all PINs are six non-leading-zero digits.
  const values=new Uint32Array(1);
  const limit=Math.floor(4294967296/900000)*900000;
  do{crypto.getRandomValues(values);}while(values[0]>=limit);
  return String(100000+values[0]%900000);
}

function publicQuestion(id,index,withHint=false,settled=false) {
  const q=DUEL_QUESTIONS[id];
  if(!q)throw new Error('Unknown server question');
  const copy=Object.fromEntries(['ms','en'].map(language=>[language,{
    prompt:q.copy[language].prompt,lines:[...q.copy[language].lines],
    ...(withHint?{hint:q.copy[language].hint}:{})
  }]));
  return {id:settled?id:`duel-${index}`,index,topic:q.topic,copy,
    ...(q.formulaKey?{formulaKey:{...q.formulaKey}}:{}),...(settled?{shape:q.shape}:{})};
}

export function projectDuelSnapshot(value) {
  if(!isObject(value)||value.ok!==true||!isObject(value.room)||!isObject(value.me)||!Array.isArray(value.me.answers)||!Number.isFinite(value.serverNow))return null;
  if(typeof value.me.reviewPending!=='boolean'||!Number.isFinite(value.room.lobbyExpiresAt))return null;
  const me=pick(value.me,[...SUMMARY_FIELDS,'hintUsed','seq','nextReadyAt','reviewPending']);
  me.attempts=isObject(value.me.attempts)?pick(value.me.attempts,['solid','net']):{solid:null,net:null};
  me.answers=value.me.answers.map((answer,index)=>({...pick(answer,ANSWER_FIELDS),question:publicQuestion(answer.id,index,true,true),attempts:isObject(answer.attempts)?pick(answer.attempts,['solid','net']):{solid:null,net:null}}));
  const actionResult=isObject(value.actionResult)?pick(value.actionResult,['type','target']):null;
  const currentQuestion=value.room.status==='playing'&&!me.reviewPending&&me.answered<value.room.total
    ?publicQuestion(value.room.questionIds[me.answered],me.answered,me.hintUsed):null;
  return {ok:true,protocol:2,serverNow:value.serverNow,room:pick(value.room,ROOM_FIELDS),me,currentQuestion,opponent:isObject(value.opponent)?pick(value.opponent,SUMMARY_FIELDS):null,actionResult};
}

export function createDuelHandler({fetch:fetchImpl=globalThis.fetch,env=name=>globalThis.Deno?.env.get(name),crypto=globalThis.crypto,rpcTimeoutMs=8000}={}) {
  return async function handle(request) {
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
    if(request.method!=='POST')return error('invalid_request',405);
    if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))return error('invalid_request',415);
    let body;
    try{body=await readBody(request);}catch(cause){return error('invalid_request',cause?.status??400);}
    const problem=validate(body);
    if(problem)return error(problem);
    try{
      const base=env('SUPABASE_URL');
      const serviceKey=env('SUPABASE_SERVICE_ROLE_KEY');
      if(!base||!serviceKey)return error('server_error');
      const url=new URL('/rest/v1/rpc/geodecoder_duel_gateway',base);
      if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))return error('server_error');
      const tokenHash=hex(await crypto.subtle.digest('SHA-256',encoder.encode(body.token)));
      // Best-effort address bucket only: this handler cannot independently verify
      // the host's forwarding-header provenance. Use its final entry consistently;
      // absent/invalid metadata shares one bucket. SQL also enforces global quotas
      // that do not depend on this header or the caller's rotating player tokens.
      const forwarded=(request.headers.get('x-forwarded-for')??'').split(',').at(-1).trim();
      const address=/^[0-9a-f:.]{1,80}$/i.test(forwarded)?forwarded:'unavailable';
      const hmac=await crypto.subtle.importKey('raw',encoder.encode(serviceKey),{name:'HMAC',hash:'SHA-256'},false,['sign']);
      const fingerprint=hex(await crypto.subtle.sign('HMAC',hmac,encoder.encode(`geodecoder-duel:v1:${address}`)));
      const {token:ignored,protocol:ignoredProtocol,...fields}=body;
      const payload={...fields,tokenHash,fingerprint};
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),rpcTimeoutMs);
      try{
        for(let attempt=0;attempt<(body.action==='create'?5:1);attempt++){
          if(body.action==='create')payload.code=randomCode(crypto);
          const upstream=await fetchImpl(url.href,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',apikey:serviceKey,Authorization:`Bearer ${serviceKey}`},body:JSON.stringify({payload}),signal:controller.signal});
          if(!upstream.ok)return error('server_error');
          const result=await upstream.json();
          if(result?.ok===false){
            if(result.error==='pin_collision'&&body.action==='create')continue;
            return error(Object.hasOwn(STATUS,result.error)?result.error:'server_error');
          }
          if(result?.ok!==true)return error('server_error');
          // Fail closed if code is deployed before its additive database migration.
          if(typeof result?.me?.reviewPending!=='boolean'||!Number.isFinite(result?.room?.lobbyExpiresAt))return error('backend_update_required');
          const snapshot=projectDuelSnapshot(result);
          return snapshot?reply(snapshot):error('server_error');
        }
        return error('server_error',503);
      }finally{clearTimeout(timeout);}
    }catch{return error('server_error');}
  };
}
