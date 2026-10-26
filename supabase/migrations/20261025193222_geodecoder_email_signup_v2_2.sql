-- GeoDecoder V2.2: transactional profiles for normal, verified-email signup.
-- Run after schema.sql as the project database owner. Existing accounts and
-- service-only legacy provisioning remain unchanged. This does not confirm email.
begin;

-- Metadata is accepted only when the account is first inserted. Authorization
-- thereafter uses the immutable private profile, never editable user metadata.
create or replace function private.handle_geodecoder_signup()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  signup jsonb; uname text; display text; signup_role text; account_email text;
  crypto_schema text; recovery_marker text;
begin
  -- Other applications share Auth. A missing GeoDecoder namespace is unrelated.
  if pg_catalog.jsonb_typeof(new.raw_user_meta_data) is distinct from 'object'
     or not (new.raw_user_meta_data ? 'geodecoder') then
    return new;
  end if;
  signup:=new.raw_user_meta_data->'geodecoder';
  if pg_catalog.jsonb_typeof(signup) is distinct from 'object'
     or pg_catalog.jsonb_typeof(signup->'username') is distinct from 'string'
     or pg_catalog.jsonb_typeof(signup->'display_name') is distinct from 'string'
     or pg_catalog.jsonb_typeof(signup->'role') is distinct from 'string' then
    raise exception 'Invalid GeoDecoder signup metadata' using errcode='22023';
  end if;
  uname:=pg_catalog.lower(pg_catalog.btrim(signup->>'username'));
  display:=pg_catalog.btrim(signup->>'display_name');
  signup_role:=signup->>'role';
  account_email:=pg_catalog.lower(new.email);
  if uname !~ '^[a-z0-9_]{3,24}$'
     or pg_catalog.char_length(display) not between 2 and 60
     or signup_role not in ('teacher','student') then
    raise exception 'Invalid GeoDecoder account fields' using errcode='22023';
  end if;
  -- Supabase Auth validates the address and handles verification. This additional
  -- guard prevents the legacy synthetic-email namespace entering the email flow.
  if account_email is null or pg_catalog.char_length(account_email) not between 5 and 254
     or account_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     or account_email like '%@accounts.geodecoder.invalid' then
    raise exception 'A real email address is required for GeoDecoder signup' using errcode='22023';
  end if;

  select ns.nspname into crypto_schema from pg_catalog.pg_extension e
    join pg_catalog.pg_namespace ns on ns.oid=e.extnamespace where e.extname='pgcrypto';
  if crypto_schema is null then raise exception 'pgcrypto is required'; end if;
  -- Email accounts use Auth recovery. No legacy recovery code is issued: the
  -- stored SHA-256 marker hashes 256 random bits and is never returned to clients.
  execute pg_catalog.format(
    'select pg_catalog.encode(%1$I.digest(%1$I.gen_random_bytes(32), ''sha256''), ''hex'')',
    crypto_schema) into recovery_marker;
  insert into private.profiles(id,username,display_name,role)
    values(new.id,uname,display,signup_role);
  insert into private.identities(user_id,auth_email,recovery_hash)
    values(new.id,account_email,recovery_marker);
  -- Constraint failures deliberately propagate, rolling back the Auth insert and
  -- both private inserts together. Existing profiles are never replaced.
  return new;
end $$;
alter function private.handle_geodecoder_signup() owner to postgres;
revoke all on function private.handle_geodecoder_signup() from public,anon,authenticated,service_role;

create or replace trigger on_geodecoder_auth_signup
  after insert on auth.users
  for each row
  when (pg_catalog.jsonb_typeof(new.raw_user_meta_data)='object'
    and new.raw_user_meta_data ? 'geodecoder')
  execute function private.handle_geodecoder_signup();

-- Keep this lookup service-only. Auth is the canonical email source after a
-- verified email change; identities.auth_email remains a legacy provisioning field.
create or replace function private.identity(p_username text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare found_identity jsonb;
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role'
     and current_setting('role',true) is distinct from 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  select jsonb_build_object('id',p.id,'user_id',p.id,'username',p.username,
    'auth_email',u.email,'recovery_hash',i.recovery_hash,
    'email_confirmed',u.email_confirmed_at is not null)
    into found_identity from private.profiles p join private.identities i on i.user_id=p.id
      join auth.users u on u.id=p.id
    where p.username=lower(btrim(p_username));
  return found_identity;
end $$;
revoke all on function private.identity(text) from public,anon,authenticated,service_role;
grant execute on function private.identity(text) to service_role;

commit;

