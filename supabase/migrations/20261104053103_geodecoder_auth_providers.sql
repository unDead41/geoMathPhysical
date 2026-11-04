-- GeoMath Digital: finish the first verified Google or phone sign-in.
-- Existing email signup, classroom data and immutable profile roles are unchanged.
begin;

create or replace function private.complete_profile(p_username text,p_display_name text,p_role text)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  account auth.users%rowtype;
  uname text := pg_catalog.lower(pg_catalog.btrim(p_username));
  display text := pg_catalog.btrim(p_display_name);
  google_verified boolean;
  phone_verified boolean;
  account_email text;
  crypto_schema text;
  recovery_marker text;
  failed_constraint text;
begin
  if uid is null then
    return private.error('auth_required','Sila log masuk.');
  end if;

  -- All retries for this Auth UUID serialize here, including the first request
  -- before a profile exists. The caller can never supply another user's UUID.
  select * into account from auth.users u where u.id=uid for update;
  if not found then
    return private.error('auth_required','Sesi akaun tidak sah. Sila log masuk semula.');
  end if;
  if exists(select 1 from private.profiles p where p.id=uid) then
    return private.snapshot(uid);
  end if;

  -- Provider names and role claims in editable user_metadata are never trusted.
  -- Auth owns these canonical contacts, confirmation timestamps and identities.
  account_email := pg_catalog.lower(account.email);
  google_verified := account.email_confirmed_at is not null
    and account_email is not null
    and pg_catalog.char_length(account_email) between 5 and 254
    and account_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    and account_email not like '%@accounts.geodecoder.invalid'
    and exists(select 1 from auth.identities i where i.user_id=uid and i.provider='google'
      and pg_catalog.lower(i.identity_data->>'email')=account_email);
  phone_verified := account.phone_confirmed_at is not null
    and coalesce(account.phone,'')<>''
    and exists(select 1 from auth.identities i where i.user_id=uid and i.provider='phone'
      and pg_catalog.regexp_replace(i.identity_data->>'phone','^[+]','')
        =pg_catalog.regexp_replace(account.phone,'^[+]',''));
  if not coalesce(google_verified,false)
     and not coalesce(phone_verified,false) then
    return private.error('auth_identity','Sahkan akaun Google atau nombor telefon sebelum melengkapkan profil.');
  end if;

  if uname is null or uname !~ '^[a-z0-9_]{3,24}$'
     or display is null or pg_catalog.char_length(display) not between 2 and 60
     or display ~ '[[:cntrl:]]'
     or p_role is null or p_role not in ('teacher','student') then
    return private.error('invalid_account','Nama pengguna, nama atau peranan tidak sah.');
  end if;

  -- Keep both inserts in one subtransaction. Any constraint failure rolls back
  -- the profile too; a taken username never leaves a partially created account.
  begin
    insert into private.profiles(id,username,display_name,role)
      values(uid,uname,display,p_role);
    if google_verified then
      select ns.nspname into crypto_schema from pg_catalog.pg_extension e
        join pg_catalog.pg_namespace ns on ns.oid=e.extnamespace where e.extname='pgcrypto';
      if crypto_schema is null then raise exception 'pgcrypto is required'; end if;
      execute pg_catalog.format(
        'select pg_catalog.encode(%1$I.digest(%1$I.gen_random_bytes(32), ''sha256''), ''hex'')',
        crypto_schema) into recovery_marker;
      insert into private.identities(user_id,auth_email,recovery_hash)
        values(uid,account_email,recovery_marker);
    end if;
    -- Phone-only users need neither a synthetic email nor a legacy identity row.
  exception when unique_violation then
    get stacked diagnostics failed_constraint = constraint_name;
    if failed_constraint='profiles_username_key' then
      return private.error('username_taken','Nama pengguna telah digunakan.');
    end if;
    return private.error('auth_identity','Identiti akaun telah digunakan. Hubungi sokongan.');
  end;
  return private.snapshot(uid);
end $$;
alter function private.complete_profile(text,text,text) owner to postgres;

create or replace function public.geo_complete_profile(username text,display_name text,role text)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.complete_profile(username,display_name,role); $$;
alter function public.geo_complete_profile(text,text,text) owner to postgres;

revoke all on function private.complete_profile(text,text,text),
  public.geo_complete_profile(text,text,text) from public,anon,authenticated,service_role;
grant execute on function private.complete_profile(text,text,text),
  public.geo_complete_profile(text,text,text) to authenticated;

commit;
