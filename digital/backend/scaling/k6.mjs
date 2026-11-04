// Staging only. Each Duel VU represents TWO independent player capabilities.
import http from 'k6/http';
import {check,sleep} from 'k6';
import crypto from 'k6/crypto';
import {Rate} from 'k6/metrics';
import {SharedArray} from 'k6/data';
import execution from 'k6/execution';
import encoding from 'k6/encoding';
import {stagingTarget,workloadCounts,validateClassroomFixtures} from './load-policy.mjs';
const origin=stagingTarget(__ENV.TARGET_ORIGIN,__ENV.STAGING_HOST,__ENV.ALLOW_STAGING_LOAD);
const counts=workloadCounts(Number(__ENV.LOAD_USERS||100),__ENV.WORKLOAD||'mixed');
const key=__ENV.SUPABASE_PUBLISHABLE_KEY;
if(!key)throw Error('A staging publishable key is required. Never supply a service-role key.');
const maxVus=counts.module+counts.classroom+counts.duelPairs;
const users=counts.classroom?new SharedArray('disposable staging classroom accounts',()=>{
  let fixtures;
  try{fixtures=JSON.parse(open(__ENV.CLASSROOM_USERS_FILE||'./classroom-users.local.json'));}
  catch{throw Error('The private classroom fixture file must contain a JSON array.');}
  return validateClassroomFixtures(fixtures,maxVus,value=>encoding.b64decode(value,'rawurl','s'));
}):[];
const staticOrigin=counts.module?stagingTarget(__ENV.STATIC_ORIGIN,__ENV.STATIC_STAGING_HOST,__ENV.ALLOW_STAGING_LOAD):null;
const failures=new Rate('semantic_failures');
const scenarios={};
for(const [name,n] of Object.entries({module:counts.module,classroom:counts.classroom,duel:counts.duelPairs}))if(n){
  scenarios[name]={executor:'ramping-vus',exec:name,startVUs:0,gracefulRampDown:'60s',stages:[{duration:__ENV.RAMP||'2m',target:n},{duration:__ENV.HOLD||'5m',target:n},{duration:'30s',target:0}]};
}
export const options={scenarios,maxRedirects:0,setupTimeout:'30m',thresholds:{'http_req_failed{phase:load}':[{threshold:'rate<0.01',abortOnFail:true,delayAbortEval:'30s'}],'http_req_duration{phase:load}':['p(95)<1000','p(99)<2500'],'semantic_failures{phase:load}':['rate<0.001']},systemTags:['status','method','name','scenario','expected_response']};
const httpParams={redirects:0,timeout:'20s'};
let aborted=false,phase='load';
const recordFailure=value=>failures.add(value,{phase});
function abortLoad(message){
  aborted=true;execution.test.abort(message);
  throw Error(message); // Fail closed even if an embedding stub returns.
}
function requestFailure(response,data){
  const code=typeof data?.error==='string'?data.error:data?.error?.code;
  if([401,403,405].includes(response.status)||(response.status>=300&&response.status<400)||['unauthenticated','forbidden','invalid_token'].includes(code))abortLoad('Staging authentication or endpoint configuration failed; load aborted.');
  const seconds=Number(response.headers?.['Retry-After']);
  sleep(Number.isFinite(seconds)&&seconds>0?Math.min(60,Math.max(1,seconds)):5);
  const error=Error('Staging request failed; inspect aggregate metrics and server logs.');error.loadFailureRecorded=true;throw error;
}
function iteration(work){
  if(aborted)throw Error('Staging load has been aborted.');
  try{return work();}catch(error){
    if(aborted)throw error;
    if(!error?.loadFailureRecorded){recordFailure(true);sleep(5);}
    // Do not print response bodies, fixture identities or credential values.
    throw Error('Staging iteration failed; inspect aggregate metrics and server logs.');
  }
}
function post(path,body,jwt){
  const response=http.post(origin+path,JSON.stringify(body),{...httpParams,headers:{apikey:key,'Content-Type':'application/json',...(jwt?{Authorization:'Bearer '+jwt}:{})},tags:{name:path,phase}});
  let data;try{data=response.json();}catch{data=null;}
  const ok=check(response,{'HTTP and semantic acknowledgement':r=>r.status===200&&data&&!data.error&&data.ok!==false});recordFailure(!ok);
  if(!ok)requestFailure(response,data);
  return data;
}
export function setup(){
  phase='setup';
  try{
    // The server authenticates the JWT: decoding its claims alone proves no
    // identity. Never return credentials from setup (k6 copies setup data).
    for(let index=0;index<users.length;index++){
      const user=users[index],snapshot=post('/rest/v1/rpc/geo_action',{action:'snapshot',payload:user.roomId?{room_id:user.roomId}:{}},user.accessToken);
      if(snapshot.profile?.id!==user.userId){recordFailure(true);abortLoad('Staging fixture identity preflight failed; load aborted.');}
      sleep(0.02);
    }
  }catch(error){
    if(aborted)throw error;
    if(!error?.loadFailureRecorded){recordFailure(true);sleep(5);}
    abortLoad('Staging fixture preflight failed; ramp was not started.');
  }finally{phase='load';}
}
const wire=body=>post('/functions/v1/geodecoder-duel',{protocol:2,...body});
function act(player,action,fields={}){player.s=wire({action,token:player.token,roomId:player.s.room.id,seq:player.s.me.seq+1,...fields});}
function waitForPlayers(players,seconds){
  const until=Date.now()+seconds*1000;
  while(Date.now()<until){
    sleep(Math.min(4+Math.random(),(until-Date.now())/1000));
    if(Date.now()<until)for(const player of players)if(!['complete','cancelled','expired'].includes(player.s.room.status))player.s=wire({action:'state',token:player.token,roomId:player.s.room.id});
  }
}
let moduleLoaded=false;
export function module(){
  return iteration(()=>{
    if(!moduleLoaded){
      const r=http.get(staticOrigin+'/',{...httpParams,tags:{name:'static_app',phase}}),ok=check(r,{'static entry':r=>r.status===200});
      recordFailure(!ok);if(!ok)requestFailure(r,null);moduleLoaded=true;
    }
    sleep(10+Math.random()*10); // Local geometry work adds no periodic API request.
  });
}
export function classroom(){
  return iteration(()=>{
    const id=execution.vu.idInTest;
    if(!Number.isInteger(id)||id<1||id>users.length){recordFailure(true);abortLoad('Supply a distinct staging fixture for every global VU ID; load aborted.');}
    const user=users[id-1];
    for(let second=0;second<60;second+=5){
      if(second%15===0)post('/rest/v1/rpc/geo_action',{action:'snapshot',payload:user.roomId?{room_id:user.roomId}:{}},user.accessToken);
      if(second%20===0)post('/rest/v1/rpc/geo_action',{action:'heartbeat',payload:user.roomId?{room_id:user.roomId}:{}},user.accessToken);
      sleep(5);
    }
  });
}
export function duel(){
  return iteration(()=>{
    const a={token:crypto.sha256(crypto.randomBytes(32),'hex')},b={token:crypto.sha256(crypto.randomBytes(32),'hex')};
    try{
      a.s=wire({action:'create',token:a.token,name:'Load host'});
      b.s=wire({action:'join',token:b.token,code:a.s.room.code,name:'Load guest'});
      act(a,'ready');act(b,'ready');sleep(3.2);
      for(let index=0;index<10;index++){
        for(const player of [a,b]){
          player.s=wire({action:'state',token:player.token,roomId:player.s.room.id});
          const shapes=['cube','cuboid','pyramid','cone','cylinder'];
          act(player,'scan',{questionIndex:index,kind:'solid',target:'r1',shape:shapes[Math.floor(Math.random()*5)]});
          if(player.s.me.answered===index)act(player,'scan',{questionIndex:index,kind:'net',target:'r2',shape:shapes[Math.floor(Math.random()*5)]});
        }
        waitForPlayers([a,b],2+Math.random()*3);
        for(const player of [a,b])act(player,'advance',{questionIndex:index});
        waitForPlayers([a,b],4+Math.random()*4);
      }
      for(const player of [a,b]){
        player.s=wire({action:'state',token:player.token,roomId:player.s.room.id});
        recordFailure(!check(player.s,{'ten answers persisted':s=>s.me.answers.length===10&&s.room.status==='complete'}));
      }
    }finally{
      if(!aborted)for(const player of [a,b])if(player.s&&!['complete','cancelled','expired'].includes(player.s.room.status))try{
        player.s=wire({action:'state',token:player.token,roomId:player.s.room.id});act(player,'leave');
      }catch(error){
        if(aborted)throw error;
        if(!error?.loadFailureRecorded){recordFailure(true);sleep(5);}
        // Staging TTL cleanup remains bounded; no production data is touched.
      }
    }
  });
}
