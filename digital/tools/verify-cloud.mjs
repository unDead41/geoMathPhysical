// Opt-in integration test against the configured empty/test project. Creates only
// synthetic accounts; artifact credentials are temporary and must never be committed.
import {createClient} from '@supabase/supabase-js';
import {CLOUD_CONFIG} from '../dist/cloud-config.mjs';
import {QUESTIONS} from '../dist/questions.mjs';
import {randomUUID,randomBytes} from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';
if(process.env.GEODECODER_LIVE_TEST!=='yes')throw Error('Set GEODECODER_LIVE_TEST=yes for the dedicated test project.');
const suffix=Date.now().toString(36),accounts=[],checks=[];
async function account(role,label){
 const username=('gd_'+label+'_'+suffix).slice(0,24),password='T!'+randomBytes(12).toString('hex');
 const response=await fetch(CLOUD_CONFIG.url+'/functions/v1/geodecoder-auth',{method:'POST',headers:{apikey:CLOUD_CONFIG.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({action:'signup',username,password,role,display_name:'Ujian '+label}),signal:AbortSignal.timeout(25000)});
 const data=await response.json();assert.equal(response.status,200,data.error||'Signup failed');assert.ok(data.session?.access_token);assert.match(data.recovery_code,/^[a-f0-9]{32}$/);
 const client=createClient(CLOUD_CONFIG.url,CLOUD_CONFIG.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {error}=await client.auth.setSession(data.session);assert.equal(error,null);
 const a={username,password,role,client,id:data.session.user.id,recovery_code:data.recovery_code};accounts.push(a);
 fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/cloud-test-accounts.json',JSON.stringify(accounts.map(({client,...v})=>v)),{mode:0o600});
 return a;
}
async function rpc(a,action,payload={}){const {data,error}=await a.client.rpc('geo_action',{action,payload});if(error)throw Error(error.message);if(data?.error)throw Error(data.error.message);return data;}
async function event(a,action,state,extra={},eventId=randomUUID()){return rpc(a,action,{attempt_id:state.attemptId,index:state.index,event_id:eventId,...extra});}
const teacher=await account('teacher','guru'),student=await account('student','murid'),outsider=await account('teacher','asing');checks.push('real username signup and Supabase Auth sessions');
const classroom=await rpc(teacher,'create_class',{name:'Kelas Ujian Sistem'}),classId=classroom.class_id;
assert.ok(classId);assert.match(classroom.classes[0].pin,/^[0-9]{6}$/);checks.push('teacher-owned class and six-digit PIN');
await rpc(teacher,'invite',{class_id:classId,username:student.username});const invited=await rpc(student,'snapshot');assert.equal(invited.invites.length,1);
await rpc(student,'accept_invite',{invite_id:invited.invites[0].id});checks.push('exact-username invitation and student acceptance');
const created=await rpc(teacher,'create_room',{class_id:classId,name:'Room Ujian Sistem'}),roomId=created.room_id;
const room=(await rpc(teacher,'snapshot',{room_id:roomId})).room;assert.match(room.pin,/^[0-9]{6}$/);
await rpc(student,'join_pin',{pin:room.pin});await rpc(teacher,'set_room',{room_id:roomId,status:'playing'});checks.push('PIN room join and teacher start');
await assert.rejects(()=>rpc(outsider,'snapshot',{room_id:roomId}));await assert.rejects(()=>rpc(student,'create_class',{name:'Tidak dibenarkan'}));checks.push('unrelated teacher and student privilege isolation');
let state=(await rpc(student,'start_attempt',{room_id:roomId})).state;
assert.equal(state.questions.length,10);assert.equal(new Set(state.questions).size,10);
let connectedResolve,eventResolve;const connected=new Promise(r=>connectedResolve=r),changed=new Promise(r=>eventResolve=r);
const channel=teacher.client.channel('geo-test-'+suffix).on('postgres_changes',{event:'*',schema:'public',table:'room_progress',filter:'room_id=eq.'+roomId},()=>eventResolve(true)).subscribe(status=>{if(status==='SUBSCRIBED')connectedResolve(true);if(['CHANNEL_ERROR','TIMED_OUT'].includes(status))connectedResolve(false);});
const subscribed=await Promise.race([connected,new Promise(r=>setTimeout(()=>r(false),10000))]);assert.equal(subscribed,true,'Teacher realtime subscription');
const wrong=QUESTIONS.find(q=>q.shape!==QUESTIONS.find(q=>q.id===state.questions[0]).shape).shape;
const eventId=randomUUID(),payload={kind:'solid',shape:wrong,target:'r1'};
let outcome=await event(student,'answer',state,payload,eventId);state=outcome.state;assert.equal(state.mistakes,1);assert.equal(state.status,'review');
const duplicate=await event(student,'answer',state,payload,eventId);assert.equal(duplicate.state.mistakes,1);assert.equal(duplicate.state.score,0);
assert.equal(await Promise.race([changed,new Promise(r=>setTimeout(()=>r(false),10000))]),true,'Teacher receives actual realtime row change');await teacher.client.removeChannel(channel);checks.push('single attempt, duplicate event idempotence and actual teacher WebSocket update');
await new Promise(r=>setTimeout(r,state.readyInMs+80));state=(await event(student,'advance',state)).state;
const shape=QUESTIONS.find(q=>q.id===state.questions[state.index]).shape;
state=(await event(student,'answer',state,{kind:'solid',shape,target:'r1'})).state;assert.equal(state.stage,'net');
state=(await event(student,'answer',state,{kind:'net',shape,target:'r2'})).state;assert.equal(state.score,1);
const tamper=await student.client.from('room_progress').update({score:10}).eq('room_id',roomId);assert.ok(tamper.error);
const live=(await rpc(teacher,'snapshot',{room_id:roomId})).room.players.find(p=>p.user_id===student.id);assert.equal(live.score,1);assert.equal(live.status,'review');checks.push('server scoring/time and direct-score tamper rejection');
await rpc(teacher,'set_room',{room_id:roomId,status:'closed'});const stopped=(await rpc(student,'snapshot',{room_id:roomId})).room.my_attempt;assert.equal(stopped.status,'closed');assert.equal(stopped.answers.length,2);checks.push('teacher close preserves partial result without fabricated completion');
const evidence={at:new Date().toISOString(),project:'fkrlwzxvyufndavlpzbp',checks,roomId,accounts:accounts.map(a=>({id:a.id,username:a.username,role:a.role}))};
fs.writeFileSync('artifacts/cloud-live-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({passed:checks.length,checks,teacher:teacher.username,student:student.username}));
for(const account of accounts){await account.client.removeAllChannels();account.client.realtime.disconnect();account.client.auth.stopAutoRefresh();}
