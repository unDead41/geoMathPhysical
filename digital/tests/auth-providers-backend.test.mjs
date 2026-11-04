import {after, before, beforeEach, test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

const migrationDir=new URL('../../supabase/migrations/',import.meta.url);
const migrations=fs.readdirSync(migrationDir).filter(name=>name.endsWith('_geodecoder_auth_providers.sql')).sort();
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
let db;

before(async()=>{
  assert.equal(migrations.length,1,'provider provisioning has one migration');
  db=new PGlite({extensions:{pgcrypto}});
  await db.exec(`
    create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users(
      id uuid primary key,email text,phone text,encrypted_password text,
      email_confirmed_at timestamptz,phone_confirmed_at timestamptz,
      raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz
    );
    create table auth.identities(
      id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
      provider text not null,identity_data jsonb not null
    );
    create function auth.jwt() returns jsonb language sql stable as
      $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant execute on function auth.jwt(),auth.uid() to anon,authenticated,service_role;
  `);
  await db.exec(fs.readFileSync(new URL('../backend/schema.sql',import.meta.url),'utf8'));
  for(const name of migrations)await db.exec(fs.readFileSync(new URL(name,migrationDir),'utf8'));
});
beforeEach(async()=>{
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims','{}',false)");
  await db.exec('truncate auth.users cascade');
});
after(async()=>{await db?.close();});

async function raw(sql,params=[]){
  await db.exec('reset role');
  return(await db.query(sql,params)).rows;
}
async function user(id,{email=null,phone=null,emailVerified=false,phoneVerified=false,metadata={},appMetadata={},identities=[]}={}){
  await raw(`insert into auth.users(id,email,phone,email_confirmed_at,phone_confirmed_at,raw_user_meta_data,raw_app_meta_data)
    values($1,$2,$3,case when $4 then now() end,case when $5 then now() end,$6::jsonb,$7::jsonb)`,
    [id,email,phone,emailVerified,phoneVerified,JSON.stringify(metadata),JSON.stringify(appMetadata)]);
  for(const identity of identities)await raw('insert into auth.identities(user_id,provider,identity_data) values($1,$2,$3::jsonb)',
    [id,identity.provider,JSON.stringify(identity.data??{})]);
}
const google=(email)=>({email,emailVerified:true,identities:[{provider:'google',data:{email,email_verified:true}}]});
const phone=(number)=>({phone:number,phoneVerified:true,identities:[{provider:'phone',data:{phone:number}}]});
async function asRole(id,role='authenticated'){
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({...(id?{sub:id}:{}),role})]);
  assert.ok(['authenticated','anon','service_role'].includes(role));
  await db.exec(`set role ${role}`);
}
async function complete(id,fields={},role='authenticated'){
  await asRole(id,role);
  return(await db.query('select public.geo_complete_profile($1,$2,$3) result',[
    Object.hasOwn(fields,'username')?fields.username:'new_user',
    Object.hasOwn(fields,'display_name')?fields.display_name:'New User',
    Object.hasOwn(fields,'role')?fields.role:'student'
  ])).rows[0].result;
}
async function count(table){return Number((await raw(`select count(*) as n from private.${table}`))[0].n);}

// Execute the migration's real functions with database roles; no JavaScript
// authorization mock stands in for Postgres privilege or identity checks.
test('provisioning requires a current Auth UUID and rejects a deleted or absent account',async()=>{
  assert.equal((await complete(null)).error.code,'auth_required');
  assert.equal((await complete(A)).error.code,'auth_required');
  assert.equal(await count('profiles'),0);
});

test('unconfirmed Google and phone identities cannot create a profile',async()=>{
  await user(A,{...google('google@example.test'),emailVerified:false});
  await user(B,{...phone('60123456789'),phoneVerified:false});
  for(const id of [A,B])assert.equal((await complete(id)).error.code,'auth_identity');
  assert.equal(await count('profiles'),0);
  assert.equal(await count('identities'),0);
});

test('metadata provider and role claims cannot impersonate a confirmed provider identity',async()=>{
  await user(A,{email:'spoof@example.test',emailVerified:true,phone:'60123456789',phoneVerified:true,
    metadata:{provider:'google',providers:['google','phone'],role:'teacher',email_verified:true,phone_verified:true},
    appMetadata:{provider:'google',providers:['google','phone']},
    identities:[{provider:'email',data:{email:'spoof@example.test'}}]});
  assert.equal((await complete(A,{role:'teacher'})).error.code,'auth_identity');
  assert.equal(await count('profiles'),0);
});

test('provider identities must belong to the current user and match the confirmed canonical contact',async()=>{
  await user(A,{email:'own@example.test',emailVerified:true,phone:'60111111111',phoneVerified:true,
    identities:[{provider:'google',data:{email:'different@example.test'}},{provider:'phone',data:{phone:'60222222222'}}]});
  await user(B,google('own@example.test'));
  assert.equal((await complete(A)).error.code,'auth_identity');
  assert.equal(await count('profiles'),0);
});

test('a verified phone-only user gets the full snapshot without an email or legacy identity',async()=>{
  await user(A,{...phone('60123456789'),metadata:{role:'teacher'}});
  const result=await complete(A,{username:' Phone_User ',display_name:' Pelajar Telefon ',role:'student'});
  assert.deepEqual({id:result.profile.id,username:result.profile.username,display_name:result.profile.display_name,role:result.profile.role},
    {id:A,username:'phone_user',display_name:'Pelajar Telefon',role:'student'});
  assert.equal(result.profile.email,null);
  assert.equal(result.profile.email_verified,false);
  for(const key of ['classes','invites','rooms'])assert.deepEqual(result[key],[]);
  assert.ok(result.server_now);
  assert.equal(await count('identities'),0);
  assert.equal((await raw('select email from auth.users where id=$1',[A]))[0].email,null);
  await asRole(A);
  const snapshot=(await db.query("select public.geo_action('snapshot','{}'::jsonb) result")).rows[0].result;
  assert.equal(snapshot.profile.id,A,'new phone account works in the existing classroom API');
});

test('verified Google users get a normalized profile and a private random recovery marker',async()=>{
  await user(A,google('Google.User@Example.test'));
  await user(B,google('another@example.test'));
  const result=await complete(A,{username:' Google_User ',display_name:' Guru Google ',role:'teacher'});
  assert.equal(result.profile.id,A);
  assert.equal(result.profile.username,'google_user');
  assert.equal(result.profile.role,'teacher');
  assert.equal(result.profile.email_verified,true);
  await complete(B,{username:'another_user'});
  const identities=await raw('select auth_email,recovery_hash from private.identities order by auth_email');
  assert.equal(identities.length,2);
  assert.equal(identities[1].auth_email,'google.user@example.test');
  assert.match(identities[0].recovery_hash,/^[0-9a-f]{64}$/);
  assert.match(identities[1].recovery_hash,/^[0-9a-f]{64}$/);
  assert.notEqual(identities[0].recovery_hash,identities[1].recovery_hash);
  assert.ok(!JSON.stringify(result).includes(identities[1].recovery_hash));
});

test('Google identities cannot provision a missing, malformed or synthetic email',async()=>{
  for(const [id,email] of [[A,null],[B,'invalid-email'],[C,'legacy@accounts.geodecoder.invalid']]){
    await user(id,{email,emailVerified:true,identities:[{provider:'google',data:{email}}]});
    assert.equal((await complete(id)).error.code,'auth_identity');
  }
  assert.equal(await count('profiles'),0);
});

test('first profile fields reject invalid names, controls and unsupported roles atomically',async()=>{
  await user(A,phone('60123456789'));
  const invalid=[{username:null},{username:'ab'},{username:'a'.repeat(25)},{username:'bad-name'},
    {display_name:null},{display_name:' '},{display_name:'a'.repeat(61)},{display_name:'Student\nName'},
    {display_name:'Student\tName'},{display_name:'Student\u007fName'},{role:null},{role:'admin'}];
  for(const fields of invalid){
    assert.equal((await complete(A,fields)).error.code,'invalid_account',JSON.stringify(fields));
    assert.equal(await count('profiles'),0);
  }
  assert.equal((await complete(A,{username:'abc',display_name:'Ab',role:'teacher'})).profile.role,'teacher');
});

test('retries return the existing snapshot and never replace identity, display name or role',async()=>{
  await user(A,google('retry@example.test'));
  const first=await complete(A,{username:'first_user',display_name:'First User',role:'student'});
  const marker=(await raw('select recovery_hash from private.identities where user_id=$1',[A]))[0].recovery_hash;
  await raw('update auth.users set raw_user_meta_data=$2::jsonb where id=$1',[A,JSON.stringify({role:'teacher',provider:'google'})]);
  const retry=await complete(A,{username:'replaced',display_name:'Replaced User',role:'teacher'});
  assert.deepEqual(retry.profile,first.profile);
  const invalidRetry=await complete(A,{username:null,display_name:null,role:'admin'});
  assert.deepEqual(invalidRetry.profile,first.profile);
  assert.equal(await count('profiles'),1);
  assert.equal(await count('identities'),1);
  assert.equal((await raw('select recovery_hash from private.identities where user_id=$1',[A]))[0].recovery_hash,marker);
  await assert.rejects(raw("update private.profiles set role='teacher' where id=$1",[A]),{code:'42501'});
});

test('existing email signup profiles retain their role and snapshot without changing their flow',async()=>{
  await user(A,{email:'email@example.test',metadata:{geodecoder:{username:'email_student',display_name:'Email Student',role:'student'}}});
  const result=await complete(A,{username:'changed',display_name:'Changed',role:'teacher'});
  assert.equal(result.profile.username,'email_student');
  assert.equal(result.profile.role,'student');
  assert.equal(await count('identities'),1);
});

test('username collisions do not create a partial profile and permit a subsequent valid retry',async()=>{
  await user(A,phone('60111111111'));
  await user(B,google('second@example.test'));
  await complete(A,{username:'shared_user'});
  assert.equal((await complete(B,{username:'SHARED_USER',role:'teacher'})).error.code,'username_taken');
  assert.equal(await count('profiles'),1);
  assert.equal(await count('identities'),0);
  assert.deepEqual(await raw('select id from private.profiles where id=$1',[B]),[]);
  const retry=await complete(B,{username:'available_user',role:'teacher'});
  assert.equal(retry.profile.id,B);
  assert.equal(retry.profile.role,'teacher');
  assert.equal(await count('profiles'),2);
  assert.equal(await count('identities'),1);
});

test('a legacy email-marker collision rolls back the newly inserted profile',async()=>{
  await user(A,google('shared@example.test'));
  await user(B,google('shared@example.test'));
  await complete(A,{username:'first_user'});
  assert.equal((await complete(B,{username:'second_user'})).error.code,'auth_identity');
  assert.equal(await count('profiles'),1);
  assert.equal(await count('identities'),1);
});

test('RPC grants deny anon and service-role callers and expose no writable private tables',async()=>{
  await user(A,phone('60123456789'));
  for(const role of ['anon','service_role'])await assert.rejects(complete(A,{},role),{code:'42501'});
  await asRole(A);
  await assert.rejects(db.query("insert into private.profiles(id,username,display_name,role) values($1,'bypass_user','Bypass User','teacher')",[A]),{code:'42501'});
  const definitions=await raw(`select n.nspname,p.prosecdef,p.proconfig,
    has_function_privilege('authenticated',p.oid,'execute') as authenticated,
    has_function_privilege('anon',p.oid,'execute') as anon,
    has_function_privilege('service_role',p.oid,'execute') as service_role
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where (n.nspname='private' and p.proname='complete_profile')
      or (n.nspname='public' and p.proname='geo_complete_profile') order by n.nspname`);
  assert.equal(definitions.length,2);
  for(const definition of definitions){
    assert.equal(definition.authenticated,true);
    assert.equal(definition.anon,false);
    assert.equal(definition.service_role,false);
    assert.deepEqual(definition.proconfig,['search_path=""']);
    assert.equal(definition.prosecdef,definition.nspname==='private');
  }
  await db.exec('reset role');
  const checks=await db.exec(fs.readFileSync(new URL('../backend/auth-providers/verification.sql',import.meta.url),'utf8'));
  assert.equal(checks.length,3);
  for(const check of checks)assert.equal(check.rows[0].checks_ok,true,check.rows[0].check_name);
});

test('random marker creation discovers pgcrypto when installed outside extensions',async()=>{
  await raw('create schema relocated_crypto');
  await raw('alter extension pgcrypto set schema relocated_crypto');
  try{
    await user(A,google('relocated@example.test'));
    assert.equal((await complete(A)).profile.id,A);
    assert.match((await raw('select recovery_hash from private.identities'))[0].recovery_hash,/^[0-9a-f]{64}$/);
  }finally{
    await raw('alter extension pgcrypto set schema extensions');
    await raw('drop schema relocated_crypto');
  }
});
