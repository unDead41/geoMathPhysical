import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
const read=n=>fs.readFileSync(new URL('../backend/'+n,import.meta.url),'utf8');
test('real PostgreSQL profile RPC enforces self ownership, validation and immutable permissions',async()=>{
 const db=new PGlite({extensions:{pgcrypto}});
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email text,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 grant usage on schema auth to authenticated,anon,service_role;
 grant execute on function auth.jwt(),auth.uid() to authenticated,anon,service_role;`);
 await db.exec(read('schema.sql'));
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
