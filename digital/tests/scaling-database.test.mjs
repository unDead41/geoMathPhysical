import {test,before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const migrationDir=new URL('../backend/scaling/supabase/migrations/',import.meta.url);
const migration=()=>fs.readFileSync(new URL(fs.readdirSync(migrationDir).find(n=>n.endsWith('_geodecoder_scaling_v1.sql')),migrationDir),'utf8');
let db;
const hash=n=>n.toString(16).padStart(64,'0');
const rpc=async body=>(await db.query('select public.geodecoder_duel_gateway($1::jsonb) as result',[JSON.stringify({fingerprint:hash(99),...body})])).rows[0].result;
const clock=async value=>db.exec(`create or replace function geodecoder_duel.clock_ms() returns bigint language sql volatile security invoker set search_path='' as 'select ${value}::bigint'`);
before(async()=>{
  db=new PGlite({extensions:{pgcrypto}});
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
    create table auth.users(id uuid primary key,email text,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    grant usage on schema auth to authenticated,anon,service_role;grant execute on function auth.jwt(),auth.uid() to authenticated,anon,service_role;`);
  const history=JSON.parse(read('../../supabase/hosted-history.json'));
  for(const item of history.migrations)await db.exec(read('../../supabase/migrations/'+item.file));
});
after(async()=>db.close());
beforeEach(async()=>{await db.exec('begin');await db.exec(migration());});
afterEach(async()=>db.exec('rollback'));

test('snapshot reads do not update or lock the profile as a presence write',async()=>{
  const id='00000000-0000-4000-8000-000000000071';
  await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'scaling@example.test',$2::jsonb)",[id,JSON.stringify({geodecoder:{username:'scaling_reader',display_name:'Scaling Reader',role:'student'}})]);
  await db.query("update private.profiles set last_seen='2020-01-01Z' where id=$1",[id]);
  await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,role:'authenticated'})]);
  const before=(await db.query('select ctid::text as tuple from private.profiles where id=$1',[id])).rows[0].tuple;
  await db.exec('set local role authenticated');
  const result=(await db.query("select public.geo_action('snapshot','{}') as result")).rows[0].result;
  assert.equal(result.profile.id,id);await db.exec('reset role');
  assert.equal((await db.query('select ctid::text as tuple from private.profiles where id=$1',[id])).rows[0].tuple,before);
  await db.query("select public.geo_action('heartbeat','{}')");
  const seen=(await db.query('select ctid::text as tuple from private.profiles where id=$1',[id])).rows[0].tuple;
  assert.notEqual(seen,before);
  await db.query("select public.geo_action('heartbeat','{}')");
  assert.equal((await db.query('select ctid::text as tuple from private.profiles where id=$1',[id])).rows[0].tuple,seen);
});
test('valid Duel state reads behind one school IP do not contend on the IP rate bucket',async()=>{
  const room=await rpc({action:'create',tokenHash:hash(1),code:'123456',name:'Host'});assert.equal(room.ok,true);
  await db.exec('delete from geodecoder_duel.rate_limits');
  for(let i=0;i<3;i++)assert.equal((await rpc({action:'state',tokenHash:hash(1),roomId:room.room.id})).ok,true);
  assert.equal((await db.query("select count(*)::int as n from geodecoder_duel.rate_limits where bucket like 'ip:%'")).rows[0].n,0);
});
test('invalid Duel capabilities share one bounded fingerprint budget without allocating arbitrary token buckets',async()=>{
  await clock(1000000);
  const room=await rpc({action:'create',tokenHash:hash(1),code:'123456',name:'Host'});
  await db.exec('delete from geodecoder_duel.rate_limits');
  const otherRoom='00000000-0000-4000-8000-000000000081';
  for(let i=0;i<1200;i++){
    const mismatch=i%3===0;
    const result=await rpc({action:i%3===2?'ready':'state',seq:1,tokenHash:mismatch?hash(1):hash(800+i),roomId:mismatch?otherRoom:room.room.id});
    assert.equal(result.error,mismatch?'room_unavailable':'invalid_token');
  }
  assert.equal((await rpc({action:'state',tokenHash:hash(9999),roomId:room.room.id})).error,'rate_limited');
  assert.deepEqual((await db.query('select bucket,hits from geodecoder_duel.rate_limits')).rows,[{bucket:'reject:'+hash(99),hits:1201}]);
  assert.equal((await rpc({action:'state',tokenHash:hash(1),roomId:room.room.id})).ok,true);
  assert.equal((await db.query("select count(*)::int as n from geodecoder_duel.rate_limits where bucket like 'ip:%'")).rows[0].n,0);
  assert.equal((await db.query("select hits from geodecoder_duel.rate_limits where bucket=$1",['token:'+hash(1)])).rows[0].hits,1);
});
test('rejection budget is configurable and expired fingerprint windows are cleaned with bounded storage',async()=>{
  await clock(1000000);
  const room=await rpc({action:'create',tokenHash:hash(1),code:'123456',name:'Host'});
  await db.exec('delete from geodecoder_duel.rate_limits;update geodecoder_duel.capacity_policy set ip_rejects_per_min=2');
  for(let minute=0;minute<15;minute++){
    await clock(1000000+minute*60000);
    for(let attempt=0;attempt<3;attempt++){
      const result=await rpc({action:'state',tokenHash:hash(800+minute*3+attempt),roomId:room.room.id});
      assert.equal(result.error,attempt<2?'invalid_token':'rate_limited');
    }
    assert.ok((await db.query('select count(*)::int as n from geodecoder_duel.rate_limits')).rows[0].n<=11);
  }
  assert.equal((await rpc({action:'state',tokenHash:hash(1),roomId:room.room.id})).ok,true);
});
test('valid Duel state retains the 120 per-minute token guard without a shared-IP counter',async()=>{
  await clock(1000000);
  const room=await rpc({action:'create',tokenHash:hash(1),code:'123456',name:'Host'});
  await db.exec('delete from geodecoder_duel.rate_limits');
  for(let i=0;i<120;i++)assert.equal((await rpc({action:'state',tokenHash:hash(1),roomId:room.room.id})).ok,true);
  assert.equal((await rpc({action:'state',tokenHash:hash(1),roomId:room.room.id})).error,'rate_limited');
  assert.deepEqual((await db.query('select bucket,hits from geodecoder_duel.rate_limits')).rows,[{bucket:'token:'+hash(1),hits:121}]);
});
test('candidate SQL wakes after the real 900000ms deadline and settles once with stable score and sequence',async()=>{
  await clock(1000000);
  await db.exec(`create temporary table deadline_completions(room_id uuid);
    create function pg_temp.track_deadline_completion() returns trigger language plpgsql as $$begin insert into deadline_completions values(new.id);return new;end$$;
    create trigger track_deadline_completion after update of status on geodecoder_duel.rooms for each row when(new.status='complete') execute function pg_temp.track_deadline_completion();`);
  const created=await rpc({action:'create',tokenHash:hash(1),code:'123456',name:'Host'}),roomId=created.room.id;
  assert.equal((await rpc({action:'join',tokenHash:hash(2),code:'123456',name:'Guest'})).ok,true);
  assert.equal((await rpc({action:'ready',tokenHash:hash(1),roomId,seq:1})).ok,true);
  const countdown=await rpc({action:'ready',tokenHash:hash(2),roomId,seq:1});
  const {startsAt,deadlineAt}=countdown.room;
  assert.equal(deadlineAt-startsAt,900000);
  await clock(startsAt);
  assert.equal((await rpc({action:'state',tokenHash:hash(1),roomId})).room.status,'playing');
  const shape=(await db.query('select q.shape from geodecoder_duel.rooms r join geodecoder_duel.questions q on q.id=r.question_ids[1] where r.id=$1',[roomId])).rows[0].shape;
  assert.equal((await rpc({action:'scan',tokenHash:hash(1),roomId,seq:2,questionIndex:0,kind:'solid',target:'r1',shape})).ok,true);
  const net={action:'scan',tokenHash:hash(1),roomId,seq:3,questionIndex:0,kind:'net',target:'r2',shape};
  const scored=await rpc(net);
  assert.equal(scored.me.score,1);assert.equal(scored.me.reviewPending,true);
  // Advance only fixture time: the server's original starts/deadline rows remain untouched.
  await clock(deadlineAt+1234);
  const awake=await rpc({action:'state',tokenHash:hash(1),roomId,score:999,elapsed:0});
  assert.equal(awake.room.status,'complete');assert.equal(awake.room.winnerId,awake.me.id);assert.equal(awake.room.reason,'deadline');
  assert.equal(awake.me.score,1);assert.equal(awake.me.seq,3);assert.equal(awake.me.answered,10);assert.equal(awake.me.skipped,9);
  assert.equal(awake.me.finishedAt,deadlineAt);assert.equal(awake.me.elapsed,900000);assert.equal(awake.me.reviewPending,false);
  assert.deepEqual(awake.me.answers[0],scored.me.answers[0]);
  const guest=await rpc({action:'state',tokenHash:hash(2),roomId});
  assert.equal(guest.me.seq,1);assert.equal(guest.me.score,0);assert.equal(guest.me.skipped,10);assert.equal(guest.me.finishedAt,deadlineAt);
  const stored=async()=>(await db.query('select id,score,answered,skipped,seq,answers,finished_at,last_payload,last_result,review_pending from geodecoder_duel.players where room_id=$1 order by slot',[roomId])).rows;
  const tuples=async()=>(await db.query('select ctid::text as tuple from geodecoder_duel.players where room_id=$1 order by slot',[roomId])).rows;
  const settled=await stored(),playerTuples=await tuples(),roomTuple=(await db.query('select ctid::text as tuple from geodecoder_duel.rooms where id=$1',[roomId])).rows[0].tuple;
  await clock(deadlineAt+2234);
  for(let i=0;i<3;i++){
    const repeated=await rpc({action:'state',tokenHash:hash(i%2+1),roomId});
    assert.equal(repeated.room.status,'complete');assert.equal(repeated.room.winnerId,awake.me.id);
  }
  assert.deepEqual(await tuples(),playerTuples);
  const retried=await rpc(net);
  assert.equal(retried.me.score,1);assert.equal(retried.me.seq,3);assert.equal(retried.actionResult.type,'correct');
  assert.deepEqual(await stored(),settled);
  assert.equal((await db.query('select ctid::text as tuple from geodecoder_duel.rooms where id=$1',[roomId])).rows[0].tuple,roomTuple);
  assert.equal((await db.query('select count(*)::int as n from deadline_completions where room_id=$1',[roomId])).rows[0].n,1);
});
test('capacity configuration is private and existing data/scoring/ownership contracts still pass',async()=>{
  const row=(await db.query('select global_create_per_min,global_join_per_min from geodecoder_duel.capacity_policy')).rows[0];
  assert.deepEqual(row,{global_create_per_min:120,global_join_per_min:300});
  for(const role of ['anon','authenticated']){
    const access=(await db.query("select has_table_privilege($1,'geodecoder_duel.capacity_policy','select') as allowed",[role])).rows[0].allowed;
    assert.equal(access,false);
  }
  for(const name of ['verify.sql','verify_email.sql','verify_profile.sql','verify_module_progress.sql','duel/verify-v2.sql']){
    let sql=read('../backend/'+name).replace(/^begin;$/m,'savepoint check_contract;').replace(/^rollback;$/m,'rollback to savepoint check_contract;');
    if(name==='verify_module_progress.sql')sql='savepoint check_contract;\n'+sql;
    await db.exec(sql);
  }
});
test('capacity defaults can be explicitly raised or lowered without disabling global or token quotas',async()=>{
  await db.exec('update geodecoder_duel.capacity_policy set global_create_per_min=2,ip_create_per_min=2');
  for(let i=1;i<=3;i++){
    const result=await rpc({action:'create',tokenHash:hash(i),code:String(100000+i),name:'Capacity Fixture'});
    assert.equal(result.ok,i<=2);if(i===3)assert.equal(result.error,'rate_limited');
  }
  await db.exec('update geodecoder_duel.capacity_policy set global_create_per_min=4,ip_create_per_min=4');
  assert.equal((await rpc({action:'create',tokenHash:hash(4),code:'100004',name:'Capacity Fixture'})).ok,true);
});
test('rollback restores exact reviewed routines and removes only the new operator policy',async()=>{
  await db.exec(read('../backend/scaling/rollback.sql'));
  const fingerprints=JSON.parse(read('../backend/scaling/fingerprints.json'));
  for(const [signature,key] of [['private.geo_action(text,jsonb)','classroom'],['public.geodecoder_duel_gateway(jsonb)','duel']]){
    const actual=(await db.query('select md5(prosrc) as hash from pg_proc where oid=$1::regprocedure',[signature])).rows[0].hash;
    assert.equal(actual,fingerprints[key].before_md5);
  }
  assert.equal((await db.query("select to_regclass('geodecoder_duel.capacity_policy') as table_name")).rows[0].table_name,null);
});
