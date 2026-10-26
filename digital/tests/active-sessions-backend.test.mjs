import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const directory = new URL('../backend/security/supabase/migrations/', import.meta.url);
const migrationFiles = fs.existsSync(directory) ? fs.readdirSync(directory).filter(name => name.endsWith('_geodecoder_security_sessions.sql')) : [];
const migration = migrationFiles.map(name => fs.readFileSync(new URL(name, directory), 'utf8')).join('\n');
const accountA = '11111111-1111-4111-8111-111111111111';
const accountB = '22222222-2222-4222-8222-222222222222';
const sessionA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const sessionA2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const sessionB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';

async function database() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create table auth.sessions(id uuid primary key, user_id uuid references auth.users(id),
      created_at timestamptz, not_after timestamptz, user_agent text, ip inet,
      updated_at timestamptz, refreshed_at timestamp);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    grant usage on schema auth to authenticated,anon,service_role;
    grant execute on function auth.jwt(),auth.uid() to authenticated,anon,service_role;
    insert into auth.users values('${accountA}'),('${accountB}');
    insert into auth.sessions(id,user_id,created_at,not_after,user_agent,ip) values
      ('${sessionA}','${accountA}',now()-interval '2 day',null,'Device A','192.0.2.1'),
      ('${sessionA2}','${accountA}',now()-interval '1 day',null,'Device A2','192.0.2.2'),
      ('${sessionB}','${accountB}',now(),null,'Device B','192.0.2.3');
  `);
  if (migration) await db.exec(migration);
  return db;
}
async function actor(db, id, sid) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({sub:id,role:'authenticated',session_id:sid})]);
  await db.exec('set role authenticated');
}
async function sessions(db) { return (await db.query('select public.geo_security_sessions() as result')).rows[0].result; }

test('session metadata is owner-bound, current-first and contains no identifiers, tokens, IP or fabricated activity', async () => {
  const db = await database();
  try {
    await actor(db,accountA,sessionA);
    const result = await sessions(db);
    assert.equal(result.sessions.length,2);
    assert.deepEqual(result.capabilities,{revoke_individual:false});
    assert.equal(result.truncated,false);
    assert.ok(Number.isFinite(Date.parse(result.server_now)));
    assert.deepEqual(result.sessions.map(row => row.user_agent),['Device A','Device A2']);
    assert.deepEqual(result.sessions.map(row => row.is_current),[true,false]);
    for (const row of result.sessions) {
      assert.deepEqual(Object.keys(row).sort(),['is_current','started_at','status','user_agent']);
      assert.equal(row.status,'recorded');
      assert.ok(Number.isFinite(Date.parse(row.started_at)));
    }
    const raw = JSON.stringify(result);
    for (const secret of [accountA,accountB,sessionA,sessionA2,sessionB,'192.0.2.','Device B']) assert.ok(!raw.includes(secret));
    await actor(db,accountB,sessionB);
    assert.deepEqual((await sessions(db)).sessions.map(row => row.user_agent),['Device B']);
  } finally { await db.close(); }
});

test('anon, cross-account current-session claims and missing, expired or malformed sessions are denied', async () => {
  const db = await database();
  try {
    await db.exec('set role anon');
    await assert.rejects(sessions(db),/permission denied/);
    await db.exec('reset role');
    for (const sid of [sessionB,null,'not-a-session',{},'cccccccc-cccc-4ccc-8ccc-cccccccccccc']) {
      await actor(db,accountA,sid);
      assert.equal((await sessions(db)).error.code,'session-expired');
    }
    await actor(db,null,sessionA);
    assert.equal((await sessions(db)).error.code,'session-expired');
    await db.exec('reset role');
    await db.exec(`update auth.sessions set not_after=now()-interval '1 second' where id='${sessionA}'`);
    await actor(db,accountA,sessionA);
    assert.equal((await sessions(db)).error.code,'session-expired');
    await db.exec('reset role');
    await db.exec(`delete from auth.sessions where id='${sessionA}'`);
    await actor(db,accountA,sessionA);
    assert.equal((await sessions(db)).error.code,'session-expired');
  } finally { await db.close(); }
});

test('frontend roles cannot read or mutate auth tables and RPC cannot accept a target account or session', async () => {
  const db = await database();
  try {
    await actor(db,accountA,sessionA);
    await assert.rejects(db.query('select * from auth.sessions'),/permission denied/);
    await assert.rejects(db.query('delete from auth.sessions where id=$1',[sessionB]),/permission denied/);
    await assert.rejects(db.query('select public.geo_security_sessions($1::uuid)',[accountB]),/does not exist/);
    await assert.rejects(db.query('select public.geo_security_sessions($1::jsonb)',[JSON.stringify({user_id:accountB,session_id:sessionB})]),/does not exist/);
    await db.exec('reset role');
    const privileges=(await db.query(`select p.proname,p.prosecdef,p.proconfig,has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname='geo_security_sessions' order by n.nspname`)).rows;
    assert.equal(privileges.length,2);
    assert.equal(privileges.filter(row=>row.prosecdef).length,1);
    assert.ok(privileges.every(row=>!row.anon_execute&&row.authenticated_execute&&row.proconfig.includes('search_path=""')));
  } finally { await db.close(); }
});

test('metadata remains bounded and status describes only the backend session record', async () => {
  const db = await database();
  try {
    await db.query('update auth.sessions set user_agent=$1 where id=$2',['x'.repeat(1000),sessionA]);
    await db.exec(`update auth.sessions set not_after=now()-interval '1 second' where id='${sessionA2}'`);
    await actor(db,accountA,sessionA);
    let result=await sessions(db);
    assert.equal(result.sessions[0].user_agent.length,512);
    assert.equal(result.sessions[1].status,'expired');
    await db.exec('reset role');
    await db.exec(`insert into auth.sessions(id,user_id,created_at,user_agent) select ('00000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid,'${accountA}',now()+g*interval '1 second','Extra '||g from generate_series(1,105) g`);
    await actor(db,accountA,sessionA);
    result=await sessions(db);
    assert.equal(result.sessions.length,100);
    assert.equal(result.sessions[0].is_current,true);
    assert.equal(result.sessions.filter(row=>row.is_current).length,1);
    assert.equal(result.truncated,true);
    assert.equal(result.sessions[1].user_agent,'Extra 105');
  } finally { await db.close(); }
});

test('migration can be applied twice without changing session rows or broadening caller access', async () => {
  const db = await database();
  try {
    if (migration) await db.exec(migration);
    await actor(db,accountA,sessionA);
    assert.equal((await sessions(db)).sessions.length,2);
    await db.exec('reset role');
    assert.equal(Number((await db.query('select count(*) as count from auth.sessions')).rows[0].count),3);
    await db.exec('set role anon');
    await assert.rejects(db.query('select private.geo_security_sessions()'),/permission denied/);
  } finally { await db.close(); }
});
