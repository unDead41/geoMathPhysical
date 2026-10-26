import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
const read=n=>fs.readFileSync(new URL('../backend/'+n,import.meta.url),'utf8');
async function database(){
 const db=new PGlite({extensions:{pgcrypto}});
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email text,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 grant usage on schema auth to authenticated,anon,service_role;
 grant execute on function auth.jwt(),auth.uid() to authenticated,anon,service_role;`);
 await db.exec(read('schema.sql'));
 return db;
}
test('real PostgreSQL profile RPC enforces self ownership, validation and immutable permissions',async()=>{
 const db=await database();
 try{
 await db.exec(read('profile_v2_3.sql')); // rerunnable upgrade on current schema
 await db.exec(read('profile_v2_3.sql'));
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
 await db.exec(`insert into auth.users(id,email,email_confirmed_at) values('${a}','murid@example.test',now()),('${b}','guru@example.test',null);
 insert into private.profiles(id,username,display_name,role) values('${a}','murid','Murid Asal','student'),('${b}','guru','Guru Asal','teacher');`);
 const c='33333333-3333-4333-8333-333333333333',r='44444444-4444-4444-8444-444444444444';
 await db.exec(`insert into private.classes(id,teacher_id,name) values('${c}','${b}','Kelas QA');
 insert into private.rooms(id,class_id,teacher_id,name,question_ids) values('${r}','${c}','${b}','Bilik QA',array(select id from private.questions limit 10));
 insert into private.room_members(room_id,user_id) values('${r}','${a}');
 insert into public.room_progress(room_id,user_id,username,display_name,score,elapsed_ms) values('${r}','${a}','murid','Murid Asal',7,12345);`);
 async function as(id,action,payload){await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(id?{sub:id,role:'authenticated'}:{role:'authenticated'})]);return (await db.query('select public.geo_action($1,$2::jsonb) as result',[action,JSON.stringify(payload)])).rows[0].result;}
 await db.exec('set role anon');
 await assert.rejects(db.query('select public.geo_action($1,$2::jsonb)',['update_profile','{}']),/permission denied/);
 await db.exec('reset role;set role authenticated');
 assert.equal((await as(null,'update_profile',{display_name:'Anon',avatar:'cube'})).error.code,'unauthenticated');
 const ok=await as(a,'update_profile',{display_name:'  Nama Baharu  ',avatar:'cone'});
 assert.equal(ok.profile.display_name,'Nama Baharu');assert.equal(ok.profile.avatar,'cone');assert.equal(ok.profile.role,'student');assert.equal(ok.profile.email,'murid@example.test');assert.equal(ok.profile.email_verified,true);
 for(const extra of [{id:b},{user_id:b},{role:'teacher'},{username:'guru'},{email:'x@test.invalid'},{email_verified:true},{score:10}])assert.equal((await as(a,'update_profile',{display_name:'Serangan',avatar:'cube',...extra})).error.code,'invalid_profile');
 for(const payload of [{display_name:'A',avatar:'cube'},{display_name:'x'.repeat(61),avatar:'cube'},{display_name:'Nama\nBaru',avatar:'cube'},{display_name:null,avatar:'cube'},{display_name:42,avatar:'cube'},{display_name:'Nama',avatar:null},{display_name:'Nama',avatar:'url'},{display_name:'Nama'}])assert.ok((await as(a,'update_profile',payload)).error,JSON.stringify(payload));
 assert.equal((await as(a,'create_class',{name:'Kelas Terlarang'})).error.code,'forbidden');
 const other=await as(b,'snapshot',{});assert.equal(other.profile.display_name,'Guru Asal');assert.equal(other.profile.avatar,'initial');assert.equal(other.profile.email_verified,false);
 await assert.rejects(db.exec(`update private.profiles set role='teacher' where id='${a}'`),/permission denied/);
 await db.exec('reset role');
 const projection=(await db.query('select display_name,score,elapsed_ms from public.room_progress where user_id=$1',[a])).rows[0];
 assert.equal(projection.display_name,'Nama Baharu');assert.equal(projection.score,7);assert.equal(projection.elapsed_ms,12345);
 await assert.rejects(db.exec(`update private.profiles set role='teacher' where id='${a}'`),/immutable/);
 const current=await as(a,'snapshot',{});assert.equal(current.profile.display_name,'Nama Baharu');
 }finally{await db.close();}
});

test('profile and module migrations are additive in both orders and preserve existing records',async()=>{
 const db=await database();
 try{
  const student='55555555-5555-4555-8555-555555555555';
  await db.exec(`insert into auth.users(id,email,email_confirmed_at) values('${student}','additive@example.test',now());
    insert into private.profiles(id,username,display_name,role) values('${student}','additive','Nama Asal','student');`);
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:student,role:'authenticated'})]);
  const record={activity:'net',stage:'explanation',prediction:'Enam muka',result:'Tiada pertindihan',explanation:'Setiap sisi bertemu.',completed:true};
  await db.exec('set role authenticated');
  const call=async(rpc,action,payload)=>{
    assert.ok(['geo_action','geo_module_progress'].includes(rpc));
    return (await db.query(`select public.${rpc}($1,$2::jsonb) as result`,[action,JSON.stringify(payload)])).rows[0].result;
  };
  assert.equal((await call('geo_action','update_profile',{display_name:'Nama Kekal',avatar:'cylinder'})).profile.avatar,'cylinder');
  assert.equal((await call('geo_module_progress','save',record)).records[0].completed,true);
  for(const order of [['profile_v2_3.sql','module_progress_v2_4.sql'],['module_progress_v2_4.sql','profile_v2_3.sql']]){
    await db.exec('reset role');
    for(const filename of order)await db.exec(read(filename));
    await db.exec('set role authenticated');
    const profile=(await call('geo_action','snapshot',{})).profile;
    assert.equal(profile.display_name,'Nama Kekal');assert.equal(profile.avatar,'cylinder');assert.equal(profile.role,'student');
    assert.equal((await call('geo_action','update_profile',{display_name:'Serangan',avatar:'cube',role:'teacher'})).error.code,'invalid_profile');
    const progress=(await call('geo_module_progress','mine',{})).records;
    assert.equal(progress.length,1);assert.equal(progress[0].completed,true);assert.equal(progress[0].explanation,record.explanation);
    const stale=await call('geo_module_progress','save',{...record,stage:'prediction',result:'',explanation:'',completed:false});
    assert.equal(stale.records[0].completed,true);
    await assert.rejects(db.exec('select * from private.module_progress'),/permission denied/);
  }
  await db.exec('reset role');
  const before=(await db.query('select count(*) as count from auth.users')).rows[0].count;
  await db.exec(read('verify_profile.sql'));
  assert.equal((await db.query('select count(*) as count from auth.users')).rows[0].count,before,'verification fixtures must roll back');
 }finally{await db.close();}
});

test('merged classroom, email and module SQL verification suites retain their rollback guarantees',async()=>{
 const db=await database();
 try{
  for(const filename of ['verify.sql','verify_email.sql','verify_module_progress.sql']){
    // The module verifier is designed to run inside its migration transaction.
    if(filename==='verify_module_progress.sql')await db.exec('begin');
    await db.exec(read(filename));
    for(const table of ['auth.users','private.classes','private.module_progress']){
      assert.equal(Number((await db.query(`select count(*) as count from ${table}`)).rows[0].count),0,filename+' retained a fixture in '+table);
    }
  }
 }finally{await db.close();}
});
