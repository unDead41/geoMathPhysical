import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const history=JSON.parse(read('../../supabase/hosted-history.json'));
const fingerprints=JSON.parse(read('../backend/scaling/fingerprints.json'));
const candidates={
  scaling:'../backend/scaling/supabase/migrations/20261104014211_geodecoder_scaling_v1.sql',
  crud:'../../supabase/migrations/20261104014958_geodecoder_classroom_crud.sql',
  offline:'../backend/offline-sync.sql'
};
const people={
  teacher:{id:'11111111-1111-4111-8111-111111111111',session:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',role:'teacher'},
  other:{id:'22222222-2222-4222-8222-222222222222',session:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',role:'teacher'},
  student:{id:'33333333-3333-4333-8333-333333333333',session:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',role:'student'}
};

async function database(order){
  const db=new PGlite({extensions:{pgcrypto}});
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
      create table auth.users(id uuid primary key,email text,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz);
      create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz,created_at timestamptz default clock_timestamp(),user_agent text);
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
      grant usage on schema auth to authenticated,anon,service_role;
      grant execute on function auth.jwt(),auth.uid() to authenticated,anon,service_role;`);
    assert.equal(history.migrations.length,12,'pending candidates must not become hosted receipts');
    for(const migration of history.migrations){
      const sql=read('../../supabase/migrations/'+migration.file);
      assert.equal(createHash('sha256').update(sql).digest('hex'),migration.file_sha256,migration.file+' must remain immutable');
      await db.exec(sql);
    }
    for(const candidate of order){
      const sql=read(candidates[candidate]);
      // The guarded scaling patch has no transaction of its own. Its policy
      // table and both fingerprint checks must succeed or roll back together.
      await db.exec(candidate==='scaling'?'begin;\n'+sql+'\ncommit;':sql);
    }
    for(const [name,person] of Object.entries(people)){
      await db.query('insert into auth.users(id,email) values($1,$2)',[person.id,name+'@example.test']);
      await db.query('insert into private.profiles(id,username,display_name,role) values($1,$2,$2,$3)',[person.id,name,person.role]);
      await db.query('insert into auth.sessions(id,user_id,user_agent) values($1,$2,$3)',[person.session,person.id,'Integration fixture '+name]);
    }
    const actor=async(name='student',claims={})=>{
      await db.exec('reset role');
      const person=people[name];
      await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:person?.id,session_id:person?.session,role:'authenticated',...claims})]);
      await db.exec('set role authenticated');
    };
    const rpc=async(action,payload={})=>(await db.query('select public.geo_action($1,$2::jsonb) as result',[action,JSON.stringify(payload)])).rows[0].result;
    const call=async(name,action,payload={})=>{await actor(name);return rpc(action,payload);};
    const raw=async(sql,parameters=[])=>{await db.exec('reset role');return(await db.query(sql,parameters)).rows;};
    const offline=async(action,payload={})=>(await db.query('select public.geo_offline_sync($1,$2::jsonb) as result',[action,JSON.stringify(payload)])).rows[0].result;
    return {db,actor,rpc,call,raw,offline};
  }catch(error){await db.close();throw error;}
}

async function classroom(h){
  const created=await h.call('teacher','create_class',{name:'Integration class'});
  assert.ok(created.class_id);
  assert.ok(!(await h.call('student','join_pin',{pin:created.classes[0].pin})).error);
  const rooms=[];
  for(const name of ['Integration A','Integration B']){
    const room=await h.call('teacher','create_room',{class_id:created.class_id,name});
    assert.ok(room.room_id);
    assert.ok(!(await h.call('student','join_pin',{pin:room.room.pin})).error);
    rooms.push(room.room_id);
  }
  return {classId:created.class_id,rooms};
}

const profileTuple=async h=>(await h.raw('select ctid::text as tuple,last_seen from private.profiles where id=$1',[people.student.id]))[0];
const progressRows=h=>h.raw(`select room_id,ctid::text as tuple,last_seen,to_jsonb(progress)-'last_seen' as game
  from public.room_progress progress where user_id=$1 order by room_id`,[people.student.id]);
const authoritativeRows=h=>h.raw(`select 'attempt' as kind,id::text as id,ctid::text as tuple,to_jsonb(a) as body from private.attempts a
  union all select 'progress',room_id::text||':'||user_id::text,ctid::text,to_jsonb(p) from public.room_progress p order by kind,id`);

async function presenceContract(h,world){
  await h.raw("update private.profiles set last_seen='2000-01-01Z' where id=$1",[people.student.id]);
  await h.raw("update public.room_progress set last_seen='2000-01-01Z',score=6 where user_id=$1",[people.student.id]);
  const profileBefore=await profileTuple(h),progressBefore=await progressRows(h);

  // PostgreSQL rejects SELECT FOR UPDATE and writes in READ ONLY transactions.
  // Exercise this oracle first so a snapshot PASS also excludes the old lock.
  await h.db.exec('begin read only');
  try{
    await assert.rejects(h.db.query('select id from private.profiles where id=$1 for update',[people.student.id]),/SELECT FOR UPDATE.*read-only transaction/);
  }finally{await h.db.exec('rollback');}
  await h.actor('student');
  await h.db.exec('begin read only');
  try{
    assert.equal((await h.rpc('snapshot')).profile.id,people.student.id);
    const selected=await h.rpc('snapshot',{room_id:world.rooms[0]});
    assert.equal(selected.room.id,world.rooms[0]);
    assert.equal(selected.classroom_crud,1);
  }finally{await h.db.exec('rollback');}
  assert.deepEqual(await profileTuple(h),profileBefore,'snapshot must not change profile presence or tuple');
  assert.deepEqual(await progressRows(h),progressBefore,'snapshot must not change room presence or projection');

  assert.ok(!(await h.call('student','heartbeat',{room_id:world.rooms[0]})).error);
  const seenProfile=await profileTuple(h),seenProgress=await progressRows(h);
  assert.notEqual(seenProfile.tuple,profileBefore.tuple,'stale profile presence is refreshed');
  for(const before of progressBefore){
    const after=seenProgress.find(row=>row.room_id===before.room_id);
    assert.deepEqual(after.game,before.game,'heartbeat cannot project stale scores or gameplay');
    if(before.room_id===world.rooms[0])assert.notEqual(after.tuple,before.tuple);
    else assert.deepEqual(after,before,'selected room excludes every other room');
  }
  await h.call('student','heartbeat',{room_id:world.rooms[0]});
  assert.deepEqual(await profileTuple(h),seenProfile,'back-to-back heartbeat is coalesced for the profile');
  assert.deepEqual(await progressRows(h),seenProgress,'back-to-back heartbeat is coalesced for the room');

  await h.raw("update private.profiles set last_seen=clock_timestamp()-interval '16 seconds' where id=$1",[people.student.id]);
  await h.raw("update public.room_progress set last_seen=clock_timestamp()-interval '16 seconds' where user_id=$1 and room_id=$2",[people.student.id,world.rooms[0]]);
  const expiredProfile=await profileTuple(h),expiredProgress=await progressRows(h);
  await h.call('student','heartbeat',{room_id:world.rooms[0]});
  assert.notEqual((await profileTuple(h)).tuple,expiredProfile.tuple,'presence can refresh after the 15-second window');
  const refreshed=await progressRows(h);
  assert.notEqual(refreshed.find(row=>row.room_id===world.rooms[0]).tuple,expiredProgress.find(row=>row.room_id===world.rooms[0]).tuple);
  assert.deepEqual(refreshed.find(row=>row.room_id===world.rooms[1]),expiredProgress.find(row=>row.room_id===world.rooms[1]));
  await h.call('student','heartbeat');
  const allRooms=await progressRows(h);
  assert.notEqual(allRooms.find(row=>row.room_id===world.rooms[1]).tuple,refreshed.find(row=>row.room_id===world.rooms[1]).tuple,'unscoped heartbeat can refresh other current memberships');
  assert.deepEqual(allRooms.find(row=>row.room_id===world.rooms[0]),refreshed.find(row=>row.room_id===world.rooms[0]),'already fresh room remains coalesced');
}

for(const order of [['scaling','crud','offline'],['crud','offline','scaling']]){
  test('archived history + '+order.join(' → '),async t=>{
    const h=await database(order);
    try{
      const world=await classroom(h);
      await t.test('reviewed fingerprints, wrapper ACLs and input guards survive composition',async()=>{
        for(const [signature,key] of [['private.geo_action(text,jsonb)','classroom'],['public.geodecoder_duel_gateway(jsonb)','duel']]){
          assert.equal((await h.raw('select md5(prosrc) as hash from pg_proc where oid=$1::regprocedure',[signature]))[0].hash,fingerprints[key].after_md5);
        }
        const grants=(await h.raw(`select
          has_function_privilege('authenticated','public.geo_action(text,jsonb)','execute') as gateway,
          has_function_privilege('authenticated','private.geo_action(text,jsonb)','execute') as legacy,
          has_function_privilege('anon','public.geo_action(text,jsonb)','execute') as anonymous,
          has_table_privilege('authenticated','geodecoder_duel.capacity_policy','select') as policy`))[0];
        assert.deepEqual(grants,{gateway:true,legacy:false,anonymous:false,policy:false});
        await h.actor('student');
        await assert.rejects(h.db.query("select private.geo_action('snapshot','{}')"),/permission denied/);
        assert.equal((await h.rpc('snapshot',null)).error.code,'invalid_payload');
        assert.equal((await h.rpc('heartbeat',{room_id:'invalid-uuid'})).error.code,'invalid_payload');
        await h.actor('student',{sub:null});
        assert.equal((await h.rpc('snapshot')).error.code,'unauthenticated');
        await h.actor('student',{sub:'99999999-9999-4999-8999-999999999999'});
        assert.equal((await h.rpc('snapshot')).error.code,'profile_missing');
        await h.db.exec('reset role;set role anon');
        await assert.rejects(h.rpc('snapshot'),/permission denied/);
      });

      await t.test('public snapshots take no row lock and heartbeat writes coalesce with room scoping',()=>presenceContract(h,world));

      await t.test('owner, revision, archive and removed-membership guards retain authoritative history',async()=>{
        const {classId,rooms}=world,roomId=rooms[0];
        for(const name of ['other','student'])assert.equal((await h.call(name,'rename_class',{class_id:classId,name:'Hijack',expected_revision:0})).error.code,'forbidden');
        assert.equal((await h.call('teacher','rename_class',{class_id:classId,name:'Renamed integration',expected_revision:0})).classes[0].revision,1);
        assert.equal((await h.call('teacher','rename_class',{class_id:classId,name:'Stale name',expected_revision:0})).error.code,'conflict');
        assert.equal((await h.call('teacher','rename_class',{class_id:classId,name:'Invalid owner',expected_revision:1,teacher_id:people.other.id})).error.code,'invalid_payload');
        await h.call('teacher','set_room',{room_id:roomId,status:'playing'});
        const started=await h.call('student','start_attempt',{room_id:roomId});
        const attemptId=started.state?.attemptId;assert.ok(attemptId);
        assert.equal((await h.call('teacher','remove_member',{class_id:classId,user_id:people.student.id,expected_revision:1})).error.code,'room_playing');
        assert.equal((await h.call('teacher','archive_room',{room_id:roomId,expected_revision:0})).error.code,'room_playing');
        await h.call('teacher','set_room',{room_id:roomId,status:'closed'});
        const retained=await authoritativeRows(h);
        assert.equal((await h.call('teacher','delete_room',{room_id:roomId,expected_revision:0})).error.code,'not_empty');
        assert.ok((await h.call('teacher','archive_room',{room_id:roomId,expected_revision:0})).room.archived_at);
        assert.equal((await h.call('student','start_attempt',{room_id:roomId})).error.code,'archived');
        assert.equal((await h.call('teacher','rotate_pin',{kind:'room',id:roomId})).error.code,'archived');
        assert.ok(!(await h.call('teacher','restore_room',{room_id:roomId,expected_revision:1})).error);
        const archived=await h.call('teacher','archive_class',{class_id:classId,expected_revision:1});
        assert.ok(archived.classes[0].archived_at);assert.equal(archived.classes[0].pin,null);
        assert.equal((await h.call('other','create_room',{class_id:classId,name:'Owner probe'})).error.code,'forbidden');
        assert.equal((await h.call('teacher','create_room',{class_id:classId,name:'Archived probe'})).error.code,'archived');
        assert.equal((await h.call('teacher','invite',{class_id:classId,username:'student'})).error.code,'archived');
        assert.equal((await h.call('teacher','rotate_pin',{kind:'class',id:classId})).error.code,'archived');
        assert.equal((await h.call('student','join_room',{room_id:rooms[1]})).error.code,'archived');
        await h.call('teacher','restore_class',{class_id:classId,expected_revision:2});
        const renewed=await h.call('teacher','rotate_pin',{kind:'class',id:classId});
        const classPin=renewed.classes[0].pin;assert.ok(classPin);
        assert.ok(!(await h.call('teacher','remove_member',{class_id:classId,user_id:people.student.id,expected_revision:3})).error);
        assert.deepEqual(await authoritativeRows(h),retained,'management retains attempt, score and room-member history');
        await h.raw("update public.room_progress set last_seen='2000-01-01Z' where user_id=$1",[people.student.id]);
        const removedPresence=await progressRows(h);
        assert.equal((await h.call('student','heartbeat',{room_id:roomId})).error.code,'forbidden');
        await h.call('student','heartbeat');
        assert.deepEqual(await progressRows(h),removedPresence,'an unscoped heartbeat cannot refresh a removed membership');
        assert.equal((await h.call('student','snapshot',{room_id:roomId})).error.code,'forbidden');
        assert.equal((await h.call('student','skip',{attempt_id:attemptId,index:0,event_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'})).error.code,'forbidden');
        assert.equal((await h.db.query('select count(*)::int as n from public.room_progress')).rows[0].n,0,'Realtime SELECT RLS excludes removed room memberships');
        await h.call('student','join_pin',{pin:classPin});
        assert.equal((await h.call('student','snapshot',{room_id:roomId})).room.my_attempt.attemptId,attemptId,'deliberate re-enrollment restores the retained attempt');
      });

      await t.test('offline replay and history remain owner-bound, session-bound and separate from live scores',async()=>{
        const solo={id:'solo:integration',kind:'solo',content_version:1,payload:{attempt_id:'integration',mode:'quiz',ruleset:'single-attempt-v1',total:10,score:7,mistakes:2,skipped:1,hints:3,elapsed_ms:10000}};
        const module={id:'module:integration',kind:'module',content_version:1,payload:{activity:'net',stage:'explanation',prediction:'Six faces',result:'No overlap',explanation:'Edges meet',completed:true}};
        const liveBefore=await authoritativeRows(h);
        await h.actor('student');
        const first=await h.offline('push',{events:[solo,module]});
        assert.deepEqual(first.accepted,[solo.id,module.id]);assert.deepEqual(first.rejected,[]);
        assert.equal(first.records[0].completed,true);
        assert.deepEqual((await h.offline('push',{events:[solo,module]})).accepted,first.accepted,'lost responses can replay safely');
        const stale={...module,id:'module:older',payload:{...module.payload,stage:'prediction',completed:false,result:'',explanation:''}};
        assert.equal((await h.offline('push',{events:[stale]})).records[0].completed,true,'offline replay cannot lower completed module progress');
        const changed={...solo,payload:{...solo.payload,score:8,mistakes:1}};
        assert.equal((await h.offline('push',{events:[changed]})).rejected[0].code,'id_conflict');
        assert.equal((await h.offline('push',{events:[solo],user_id:people.other.id})).error.code,'invalid_payload');
        const own=await h.offline('history');
        assert.equal(own.attempts.length,1);assert.equal(own.attempts[0].payload.score,7);
        assert.equal(own.attempts[0].source,'offline-self-study');assert.equal(own.attempts[0].verified,false);
        for(const table of ['private.offline_receipts','private.self_study_attempts'])await assert.rejects(h.db.exec('select * from '+table),/permission denied/);
        assert.equal((await h.raw('select count(*)::int as n from private.offline_receipts'))[0].n,3);
        assert.deepEqual(await authoritativeRows(h),liveBefore,'self-study cannot write classroom attempts or projections');
        await h.actor('other');
        assert.equal((await h.offline('history')).attempts.length,0,'another valid owner sees no student history');
        await h.actor('other',{session_id:people.student.session});
        assert.equal((await h.offline('history')).error.code,'session-expired','JWT subject cannot borrow another account session');
        await h.actor('student',{session_id:'invalid-session'});
        assert.equal((await h.offline('history')).error.code,'session-expired');
        await h.raw("update auth.sessions set not_after=clock_timestamp()-interval '1 minute' where id=$1",[people.student.session]);
        await h.actor('student');
        assert.equal((await h.offline('history')).error.code,'session-expired');
        assert.equal((await h.db.query('select public.geo_security_sessions() as result')).rows[0].result.error.code,'session-expired','the archived session-security API retains its expiry guard');
        await h.raw('delete from auth.sessions where id=$1',[people.student.session]);
        await h.actor('student');
        assert.equal((await h.offline('push',{events:[solo]})).error.code,'session-expired','revoked sessions cannot replay');
        await h.db.exec('reset role;set role anon');
        await assert.rejects(h.offline('history'),/permission denied/);
      });
    }finally{await h.db.close();}
  });
}

test('CRUD presence contract remains standalone before scaling or offline SQL is installed',async()=>{
  const h=await database(['crud']);
  try{await presenceContract(h,await classroom(h));}
  finally{await h.db.close();}
});
