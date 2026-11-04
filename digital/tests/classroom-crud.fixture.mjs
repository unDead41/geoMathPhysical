import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
const migrationDir=new URL('../../supabase/migrations/',import.meta.url);
const migrationFiles=()=>fs.readdirSync(migrationDir).filter(f=>f.endsWith('_geodecoder_classroom_crud.sql'));
export const ids={teacher:'11111111-1111-4111-8111-111111111111',other:'22222222-2222-4222-8222-222222222222',student:'33333333-3333-4333-8333-333333333333'};
export async function database(){
 const db=new PGlite({extensions:{pgcrypto}});
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email text,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 grant usage on schema auth to authenticated,anon,service_role;
 grant execute on function auth.jwt(),auth.uid() to authenticated,anon,service_role;`);
 await db.exec(fs.readFileSync(new URL('../backend/schema.sql',import.meta.url),'utf8'));
 for(const f of migrationFiles())await db.exec(fs.readFileSync(new URL(f,migrationDir),'utf8'));
 for(const [role,id] of Object.entries(ids))await db.query('insert into auth.users(id,email) values($1,$2)',[id,role+'@example.test']);
 for(const [role,id] of Object.entries(ids))await db.query('insert into private.profiles(id,username,display_name,role) values($1,$2,$3,$4)',[id,role,role,role==='student'?'student':'teacher']);
 async function call(actor,action,payload={}){
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:ids[actor],role:'authenticated'})]);
  await db.exec('set role authenticated');
  return (await db.query('select public.geo_action($1,$2::jsonb) result',[action,JSON.stringify(payload)])).rows[0].result;
 }
 return {db,call,async raw(sql,params=[]){await db.exec('reset role');return(await db.query(sql,params)).rows;}};
}
