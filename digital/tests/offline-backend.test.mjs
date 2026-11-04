import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
const read=name=>fs.readFileSync(new URL('../backend/'+name,import.meta.url),'utf8');
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',sid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const moduleEvent={id:'module:one',kind:'module',content_version:1,payload:{activity:'net',stage:'explanation',prediction:'Enam muka',result:'Tiada pertindihan',explanation:'Setiap sisi bertemu',completed:true}};
const solo={id:'solo:one',kind:'solo',content_version:1,payload:{attempt_id:'one',mode:'quiz',ruleset:'single-attempt-v1',total:10,score:7,mistakes:2,skipped:1,hints:3,elapsed_ms:10000}};
async function fixture(){
 const db=new PGlite({extensions:{pgcrypto}});
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email text,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 grant usage on schema auth to authenticated,anon;grant execute on function auth.jwt(),auth.uid() to authenticated,anon;`);
 await db.exec(read('schema.sql'));await db.exec(read('offline-sync.sql'));await db.exec(read('offline-sync.sql'));
 await db.exec(`insert into auth.users(id,email) values('${a}','a@example.test'),('${b}','b@example.test');
 insert into private.profiles(id,username,display_name,role) values('${a}','offline_a','Murid A','student'),('${b}','offline_b','Murid B','student');
 insert into auth.sessions values('${sid}','${a}',null);`);
 async function actor(id=a,session=sid){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,session_id:session,role:'authenticated'})]);await db.exec('set role authenticated');}
 const call=async(action,payload={})=>(await db.query('select public.geo_offline_sync($1,$2::jsonb) as value',[action,JSON.stringify(payload)])).rows[0].value;
 await actor();return {db,actor,call};
}
test('offline RPC deduplicates lost-response replays and preserves monotonic module progress',async()=>{
 const f=await fixture();try{
  const first=await f.call('push',{events:[solo,moduleEvent]});assert.deepEqual(first.accepted,['solo:one','module:one']);assert.equal(first.records[0].completed,true);
  const again=await f.call('push',{events:[solo,moduleEvent]});assert.deepEqual(again.accepted,first.accepted);
  const history=await f.call('history');assert.equal(history.attempts.length,1);assert.equal(history.attempts[0].source,'offline-self-study');assert.equal(history.attempts[0].verified,false);
  const stale={...moduleEvent,id:'module:older',payload:{...moduleEvent.payload,stage:'prediction',completed:false,result:'',explanation:''}};
  assert.equal((await f.call('push',{events:[stale]})).records[0].completed,true);
  await f.db.exec('reset role');assert.equal(Number((await f.db.query('select count(*) as n from private.offline_receipts')).rows[0].n),3);
  assert.equal(Number((await f.db.query('select count(*) as n from public.room_progress')).rows[0].n),0);
 }finally{await f.db.close();}
});
test('conflicting IDs and malformed records stay rejected while valid records in the batch succeed',async()=>{
 const f=await fixture();try{
  await f.call('push',{events:[solo]});const changed={...solo,payload:{...solo.payload,score:8,mistakes:1}};
  const result=await f.call('push',{events:[changed,{...solo,id:'bad',payload:{...solo.payload,score:100}},moduleEvent]});
  assert.deepEqual(result.accepted,['module:one']);assert.deepEqual(result.rejected.map(r=>r.code),['id_conflict','invalid_event']);
  assert.equal((await f.call('history')).attempts[0].payload.score,7);
  assert.equal((await f.call('push',{events:Array(21).fill(moduleEvent)})).error.code,'invalid_payload');
  assert.equal((await f.call('push',{events:[solo],user_id:b})).error.code,'invalid_payload');
  const malformed=await f.call('push',{events:[{...solo,id:'null-kind',kind:null},{...solo,id:'null-mode',payload:{...solo.payload,mode:null}}]});
  assert.equal(malformed.rejected.length,2);assert.equal(malformed.accepted.length,0);
  assert.deepEqual((await f.call('push',{events:[moduleEvent,moduleEvent]})).accepted,['module:one']);
 }finally{await f.db.close();}
});
test('offline data is owner-only and revoked or cross-account sessions cannot send',async()=>{
 const f=await fixture();try{
  await f.call('push',{events:[solo]});await assert.rejects(f.db.exec('select * from private.offline_receipts'),/permission denied/);
  await assert.rejects(f.db.exec('select * from private.self_study_attempts'),/permission denied/);
  await f.actor(b);assert.equal((await f.call('push',{events:[solo]})).error.code,'session-expired');
  await f.db.exec('reset role');await f.db.exec(`update auth.sessions set user_id='${b}' where id='${sid}'`);await f.actor(b);
  assert.equal((await f.call('history')).attempts.length,0);
  await f.db.exec('reset role');await f.db.exec(`delete from auth.sessions where id='${sid}'`);await f.actor(b);
  assert.equal((await f.call('history')).error.code,'session-expired');await f.db.exec('reset role;set role anon');
  await assert.rejects(f.call('history'),/permission denied/);
 }finally{await f.db.close();}
});
