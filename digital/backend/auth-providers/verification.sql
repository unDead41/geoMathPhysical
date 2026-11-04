-- Read-only post-migration checks. Every checks_ok value must be true.
-- Behavioral coverage is in digital/tests/auth-providers-backend.test.mjs.
with functions as (
  select n.nspname,p.proname,p.prosecdef,p.proconfig,p.proowner,p.oid
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where p.oid in (
    pg_catalog.to_regprocedure('private.complete_profile(text,text,text)'),
    pg_catalog.to_regprocedure('public.geo_complete_profile(text,text,text)')
  )
)
select 'function_security' as check_name,
  count(*)=2
    and bool_and(prosecdef=(nspname='private'))
    and bool_and(proconfig @> array['search_path=""'])
    and bool_and(pg_catalog.pg_get_userbyid(proowner)='postgres') as checks_ok
from functions;

with functions as (
  select p.oid,p.proacl from pg_catalog.pg_proc p
  where p.oid in (
    pg_catalog.to_regprocedure('private.complete_profile(text,text,text)'),
    pg_catalog.to_regprocedure('public.geo_complete_profile(text,text,text)')
  )
)
select 'function_privileges' as check_name,
  count(*)=2
    and bool_and(pg_catalog.has_function_privilege('authenticated',oid,'EXECUTE'))
    and bool_and(not pg_catalog.has_function_privilege('anon',oid,'EXECUTE'))
    and bool_and(not pg_catalog.has_function_privilege('service_role',oid,'EXECUTE'))
    and bool_and(not exists(
      select 1 from pg_catalog.aclexplode(proacl) a
      where a.grantee=0 and a.privilege_type='EXECUTE'
    )) as checks_ok
from functions;

select 'profile_table_security' as check_name,
  c.relrowsecurity
    and not pg_catalog.has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE')
    and not pg_catalog.has_table_privilege('anon',c.oid,'INSERT,UPDATE,DELETE')
    and exists(select 1 from pg_catalog.pg_trigger t
      where t.tgrelid=c.oid and t.tgname='protect_profile_identity' and t.tgenabled<>'D') as checks_ok
from pg_catalog.pg_class c where c.oid='private.profiles'::regclass;
