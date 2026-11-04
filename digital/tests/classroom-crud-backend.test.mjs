import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database,ids} from './classroom-crud.fixture.mjs';
const migrationDir=new URL('../../supabase/migrations/',import.meta.url);
const migrationFiles=()=>fs.readdirSync(migrationDir).filter(f=>f.endsWith('_geodecoder_classroom_crud.sql'));

test('classroom CRUD is owner-only, validates exact fields and detects stale revisions',async()=>{
 const h=await database();try{
  const created=await h.call('teacher','create_class',{name:'Kelas Asal'}),id=created.class_id;
  const saved=await h.call('teacher','rename_class',{class_id:id,name:'  2 STEM  ',expected_revision:0});
  assert.equal(saved.classes?.find(c=>c.id===id)?.name,'2 STEM');
  assert.equal(saved.classroom_crud,1);
  const revision=saved.classes[0].revision;assert.equal(revision,1);
  for(const actor of ['student','other'])assert.equal((await h.call(actor,'rename_class',{class_id:id,name:'Hijack',expected_revision:revision})).error.code,'forbidden');
  assert.equal((await h.call('teacher','rename_class',{class_id:id,name:'Stale',expected_revision:0})).error.code,'conflict');
  for(const name of ['A','x'.repeat(61),'Nama\nBaru',42,null])assert.equal((await h.call('teacher','rename_class',{class_id:id,name,expected_revision:revision})).error.code,'invalid_name');
  for(const extra of [{teacher_id:ids.other},{score:10},{expected_revision:'1'},{expected_revision:-1}])assert.equal((await h.call('teacher','rename_class',{class_id:id,name:'Bad',expected_revision:revision,...extra})).error.code,'invalid_payload');
  const room=await h.call('teacher','create_room',{class_id:id,name:'Bilik Asal'});
  const renamed=await h.call('teacher','rename_room',{room_id:room.room_id,name:'Bilik Baru',expected_revision:0});
  assert.equal(renamed.room.name,'Bilik Baru');assert.equal(renamed.room.revision,1);
  await assert.rejects(h.db.query('select private.geo_action($1,$2::jsonb)',['snapshot','{}']),/permission denied/);
  await h.db.exec('reset role;set role anon');
  await assert.rejects(h.db.query('select public.geo_action($1,$2::jsonb)',['rename_class','{}']),/permission denied/);
 }finally{await h.db.close();}
});

test('removing a learner revokes room access and preserves authoritative attempts and scores',async()=>{
 const h=await database();try{
  const created=await h.call('teacher','create_class',{name:'Retention'}),cid=created.class_id;
  await h.call('student','join_pin',{pin:created.classes[0].pin});
  const room=await h.call('teacher','create_room',{class_id:cid,name:'Bilik Retention'}),rid=room.room_id;
  await h.call('student','join_pin',{pin:room.room.pin});
  await h.call('teacher','set_room',{room_id:rid,status:'playing'});
  const started=await h.call('student','start_attempt',{room_id:rid});
  const attempt=started.state.attemptId;
  assert.equal((await h.call('teacher','remove_member',{class_id:cid,user_id:ids.student,expected_revision:0})).error.code,'room_playing');
  await h.call('teacher','set_room',{room_id:rid,status:'closed'});
  const before=await h.raw('select id,score,answers,elapsed_ms,status from private.attempts where id=$1',[attempt]);
  assert.ok(!(await h.call('teacher','remove_member',{class_id:cid,user_id:ids.student,expected_revision:0})).error);
  assert.deepEqual(await h.raw('select id,score,answers,elapsed_ms,status from private.attempts where id=$1',[attempt]),before);
  assert.equal((await h.call('student','snapshot')).classes.length,0);
  const presence=(await h.raw('select last_seen from public.room_progress where room_id=$1',[rid]))[0];
  await h.call('student','heartbeat',{});
  assert.deepEqual((await h.raw('select last_seen from public.room_progress where room_id=$1',[rid]))[0],presence,'removed learner heartbeat must not refresh old room presence');
  assert.equal((await h.call('student','snapshot',{room_id:rid})).error.code,'forbidden');
  assert.equal((await h.call('student','start_attempt',{room_id:rid})).error.code,'forbidden');
  assert.equal((await h.call('student','skip',{attempt_id:attempt,index:0,event_id:crypto.randomUUID()})).error.code,'forbidden');
  assert.equal((await h.db.query('select count(*)::int n from public.room_progress where room_id=$1',[rid])).rows[0].n,0,'Realtime RLS revokes removed learner access');
  await h.call('student','join_pin',{pin:created.classes[0].pin});
  assert.equal((await h.call('student','snapshot',{room_id:rid})).room.my_attempt.attemptId,attempt,'deliberate re-enrollment restores the same attempt');
 }finally{await h.db.close();}
});

test('archive and restore retain results, revoke PINs, block activity and protect nonempty deletions',async()=>{
 const h=await database();try{
  let snap=await h.call('teacher','create_class',{name:'Archive'});const cid=snap.class_id;
  await h.call('student','join_pin',{pin:snap.classes[0].pin});
  const room=await h.call('teacher','create_room',{class_id:cid,name:'Room'}),rid=room.room_id;
  await h.call('student','join_pin',{pin:room.room.pin});
  await h.call('teacher','set_room',{room_id:rid,status:'playing'});
  assert.equal((await h.call('teacher','archive_class',{class_id:cid,expected_revision:0})).error.code,'room_playing');
  await h.call('teacher','set_room',{room_id:rid,status:'closed'});
  assert.equal((await h.call('teacher','delete_room',{room_id:rid,expected_revision:0})).error.code,'not_empty');
  snap=await h.call('teacher','archive_class',{class_id:cid,expected_revision:0});
  assert.ok(snap.classes[0].archived_at);assert.equal(snap.classes[0].pin,null);
  assert.equal((await h.call('other','create_room',{class_id:cid,name:'Probe'})).error.code,'forbidden');
  assert.equal((await h.call('teacher','create_room',{class_id:cid,name:'Forbidden'})).error.code,'archived');
  assert.equal((await h.call('teacher','rotate_pin',{kind:'class',id:cid})).error.code,'archived');
  assert.equal((await h.call('student','join_room',{room_id:rid})).error.code,'archived');
  assert.equal((await h.call('student','snapshot',{room_id:rid})).room.status,'closed');
  snap=await h.call('teacher','restore_class',{class_id:cid,expected_revision:snap.classes[0].revision});
  assert.equal(snap.classes[0].archived_at,null);assert.equal(snap.rooms[0].status,'closed');
  assert.equal((await h.call('teacher','delete_class',{class_id:cid,expected_revision:snap.classes[0].revision})).error.code,'not_empty');
  const archived=await h.call('teacher','archive_room',{room_id:rid,expected_revision:0});assert.ok(archived.room.archived_at);
  const restored=await h.call('teacher','restore_room',{room_id:rid,expected_revision:1});assert.equal(restored.room.archived_at,null);assert.equal(restored.room.status,'closed');
  const empty=await h.call('teacher','create_class',{name:'Empty'}),emptyId=empty.class_id;
  const emptyRoom=await h.call('teacher','create_room',{class_id:emptyId,name:'Empty Room'});
  assert.ok(!(await h.call('teacher','delete_room',{room_id:emptyRoom.room_id,expected_revision:0})).error);
  assert.ok(!(await h.call('teacher','delete_class',{class_id:emptyId,expected_revision:0})).error);
  assert.ok(!(await h.call('teacher','snapshot')).classes.some(c=>c.id===emptyId));
  for(const f of migrationFiles())await h.db.exec('reset role;'+fs.readFileSync(new URL(f,migrationDir),'utf8'));
  assert.equal((await h.call('student','snapshot',{room_id:rid})).room.status,'closed','migration is rerunnable');
 }finally{await h.db.close();}
});

test('teachers can cancel own pending invitations and students can decline only their own',async()=>{
 const h=await database();try{
  const created=await h.call('teacher','create_class',{name:'Invitations'}),cid=created.class_id;
  let s=await h.call('teacher','invite',{class_id:cid,username:'student'});
  const invite=s.invite_id;
  assert.equal(s.classes[0].pending_invites?.[0]?.id,invite);
  assert.equal((await h.call('other','cancel_invite',{invite_id:invite})).error.code,'forbidden');
  assert.ok(!(await h.call('teacher','cancel_invite',{invite_id:invite})).error);
  assert.equal((await h.call('student','snapshot')).invites.length,0);
  s=await h.call('teacher','invite',{class_id:cid,username:'student'});
  assert.equal((await h.call('other','decline_invite',{invite_id:s.invite_id})).error.code,'forbidden');
  assert.ok(!(await h.call('student','decline_invite',{invite_id:s.invite_id})).error);
  assert.equal((await h.call('teacher','snapshot')).classes[0].members.length,0);
 }finally{await h.db.close();}
});

test('stale invitation confirmations cannot consume a newly issued invitation',async()=>{
 const h=await database();try{
  const cid=(await h.call('teacher','create_class',{name:'Generation'})).class_id;
  const first=(await h.call('teacher','invite',{class_id:cid,username:'student'})).invite_id;
  await h.call('student','accept_invite',{invite_id:first});
  const second=(await h.call('teacher','invite',{class_id:cid,username:'student'})).invite_id;
  assert.notEqual(second,first);
  assert.ok((await h.call('student','decline_invite',{invite_id:first})).error);
  const third=(await h.call('teacher','invite',{class_id:cid,username:'student'})).invite_id;
  assert.notEqual(third,second);
  assert.ok((await h.call('teacher','cancel_invite',{invite_id:second})).error);
  assert.equal((await h.call('student','snapshot')).invites[0].id,third);
 }finally{await h.db.close();}
});

test('heartbeat respects its selected room and never rewrites game projection fields',async()=>{
 const h=await database();try{
  const c=await h.call('teacher','create_class',{name:'Presence'});await h.call('student','join_pin',{pin:c.classes[0].pin});
  const rooms=[];
  for(const name of ['Room A','Room B']){const r=await h.call('teacher','create_room',{class_id:c.class_id,name});rooms.push(r.room_id);await h.call('student','join_pin',{pin:r.room.pin});}
  await h.raw("update public.room_progress set last_seen='2000-01-01T00:00:00Z',score=6");
  const before=(await h.raw('select room_id,last_seen,score,status from public.room_progress order by room_id'));
  await h.call('student','heartbeat',{room_id:rooms[0]});
  const after=await h.raw('select room_id,last_seen,score,status from public.room_progress order by room_id');
  assert.notDeepEqual(after.find(r=>r.room_id===rooms[0]).last_seen,before.find(r=>r.room_id===rooms[0]).last_seen);
  assert.deepEqual(after.find(r=>r.room_id===rooms[1]),before.find(r=>r.room_id===rooms[1]));
  assert.equal(after.find(r=>r.room_id===rooms[0]).score,6,'presence must not sync a stale game projection');
 }finally{await h.db.close();}
});
