import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
test('archived hosted history replays in order and passes all five SQL contracts',async()=>{
 const db=new PGlite({extensions:{pgcrypto}});
 try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email text,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 grant usage on schema auth to authenticated,anon,service_role;
 grant execute on function auth.jwt(),auth.uid() to authenticated,anon,service_role;`);
 const dir=new URL('../../supabase/migrations/',import.meta.url);
 const files=fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort();
 assert.equal(files.length,9,'Review and update baseline when adding migrations');
 for(const f of files)await db.exec(fs.readFileSync(new URL(f,dir),'utf8'));
 for(const f of ['verify.sql','verify_email.sql','verify_profile.sql','verify_module_progress.sql','duel/verify.sql']) {
  let sql=fs.readFileSync(new URL('../backend/'+f,import.meta.url),'utf8');
  if(f==='verify_module_progress.sql')sql='begin;\n'+sql;
  await db.exec(sql);
 }
 assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,0,'fixtures must roll back');
 } finally {await db.close();}
});
