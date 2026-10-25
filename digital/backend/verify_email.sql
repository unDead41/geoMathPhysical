-- Run after email_v2_2.sql (or the current schema.sql) as the database owner.
-- Synthetic Auth rows exercise the actual trigger, constraints and role grants.
-- No Auth HTTP calls or emails are sent. Every fixture and mutation rolls back.
begin;
set local plpgsql.check_asserts=on;
do $email_verification$
declare
  teacher_id uuid:=gen_random_uuid(); student_id uuid:=gen_random_uuid();
  unrelated_id uuid:=gen_random_uuid(); legacy_id uuid:=gen_random_uuid();
  candidate_id uuid; invalid_case record; caller text; rejected boolean;
  token text:=replace(gen_random_uuid()::text,'-','');
  teacher_username text; student_username text; legacy_username text;
  teacher_email text; student_email text; changed_email text; candidate_email text;
  teacher_marker text; student_marker text; signup_fields jsonb; reply jsonb;
begin
  teacher_username:='em_t_'||left(token,16);
  student_username:='em_s_'||left(token,16);
  legacy_username:='em_l_'||left(token,16);
  teacher_email:='geo.verify.'||token||'.teacher@example.com';
  student_email:='geo.verify.'||token||'.student@example.com';
  changed_email:='geo.verify.'||token||'.changed@example.com';
  perform set_config('request.jwt.claims','{}',true);

  assert exists(select 1 from pg_catalog.pg_proc p
    where p.oid='private.handle_geodecoder_signup()'::regprocedure
      and p.prosecdef and p.proowner='postgres'::regrole
      and exists(select 1 from pg_catalog.unnest(p.proconfig) cfg(setting)
        where cfg.setting in ('search_path=','search_path=""'))),
    'signup trigger must run as owner with an empty search path';
  assert exists(select 1 from pg_catalog.pg_trigger t
    where t.tgrelid='auth.users'::regclass and t.tgname='on_geodecoder_auth_signup'
      and t.tgfoid='private.handle_geodecoder_signup()'::regprocedure
      and t.tgtype=5 and t.tgenabled='O' and not t.tgisinternal),
    'signup trigger must be enabled and fire only after each Auth insert';

  -- Public signup supplies only nested data. Profiles exist before confirmation,
  -- while the Auth email remains unconfirmed and no session is fabricated here.
  insert into auth.users(id,email,encrypted_password,email_confirmed_at,
      raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values
      (teacher_id,teacher_email,'',null,'{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('geodecoder',jsonb_build_object(
          'username','  '||upper(teacher_username)||'  ','display_name','  Guru E-mel  ','role','teacher')),
        clock_timestamp(),clock_timestamp()),
      (student_id,student_email,'',null,'{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('geodecoder',jsonb_build_object(
          'username',student_username,'display_name','  Murid E-mel  ','role','student')),
        clock_timestamp(),clock_timestamp());
  assert exists(select 1 from private.profiles p where p.id=teacher_id
      and p.username=teacher_username and p.display_name='Guru E-mel' and p.role='teacher'),
    'teacher signup did not atomically create a normalized profile';
  assert exists(select 1 from private.profiles p where p.id=student_id
      and p.username=student_username and p.display_name='Murid E-mel' and p.role='student'),
    'student signup did not atomically create a normalized profile';
  assert (select count(*)=2 from auth.users u
    where u.id in (teacher_id,student_id) and u.email_confirmed_at is null),
    'profile provisioning must not bypass email confirmation';
  select i.recovery_hash into teacher_marker from private.identities i
    where i.user_id=teacher_id and i.auth_email=lower(teacher_email);
  select i.recovery_hash into student_marker from private.identities i
    where i.user_id=student_id and i.auth_email=lower(student_email);
  assert teacher_marker ~ '^[a-f0-9]{64}$' and student_marker ~ '^[a-f0-9]{64}$'
      and teacher_marker<>student_marker,
    'email identities require independent random SHA-256 recovery markers';

  -- Shared Auth users without the GeoDecoder namespace are untouched, including
  -- accounts that happen to use the old top-level username/role field names.
  insert into auth.users(id,email,encrypted_password,email_confirmed_at,
      raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values(unrelated_id,'geo.verify.'||token||'.other@example.com','',null,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('application','duel','username','other_'||left(token,16),'role','teacher'),
      clock_timestamp(),clock_timestamp());
  assert not exists(select 1 from private.profiles p where p.id=unrelated_id)
      and not exists(select 1 from private.identities i where i.user_id=unrelated_id),
    'an unrelated Auth account received a GeoDecoder profile';

  signup_fields:=jsonb_build_object('username','bad_'||left(token,16),
    'display_name','Invalid Fixture','role','student');
  for invalid_case in select * from (values
      ('invalid role',signup_fields||'{"role":"admin"}'::jsonb,null::text),
      ('invalid username',signup_fields||'{"username":"not-a-username"}'::jsonb,null::text),
      ('short username',signup_fields||'{"username":"ab"}'::jsonb,null::text),
      ('long username',signup_fields||jsonb_build_object('username',repeat('a',25)),null::text),
      ('short display',signup_fields||'{"display_name":"x"}'::jsonb,null::text),
      ('long display',signup_fields||jsonb_build_object('display_name',repeat('a',61)),null::text),
      ('non-string username',signup_fields||'{"username":12345}'::jsonb,null::text),
      ('missing fields','{}'::jsonb,null::text),
      ('null metadata','null'::jsonb,null::text),
      ('array metadata','[]'::jsonb,null::text),
      ('string metadata','"geodecoder"'::jsonb,null::text),
      ('missing email',signup_fields,''::text),
      ('malformed email',signup_fields,'not-an-email'::text),
      ('long email',signup_fields,repeat('a',243)||'@example.com'),
      ('legacy email',signup_fields,gen_random_uuid()::text||'@accounts.geodecoder.invalid')
    ) as fixtures(label,metadata,email_override)
  loop
    candidate_id:=gen_random_uuid();
    candidate_email:=coalesce(invalid_case.email_override,
      'geo.verify.'||candidate_id::text||'@example.com');
    rejected:=false;
    begin
      insert into auth.users(id,email,encrypted_password,raw_app_meta_data,
          raw_user_meta_data,created_at,updated_at)
        values(candidate_id,candidate_email,'','{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('geodecoder',invalid_case.metadata),clock_timestamp(),clock_timestamp());
    exception when invalid_parameter_value then rejected:=true;
    end;
    assert rejected,'invalid signup accepted: '||invalid_case.label;
    assert not exists(select 1 from auth.users u where u.id=candidate_id)
        and not exists(select 1 from private.profiles p where p.id=candidate_id)
        and not exists(select 1 from private.identities i where i.user_id=candidate_id),
      'invalid signup left partial rows: '||invalid_case.label;
  end loop;

  -- A username conflict is enforced by the unique constraint in the same Auth
  -- transaction. It cannot overwrite the established teacher or leave an orphan.
  candidate_id:=gen_random_uuid();
  rejected:=false;
  begin
    insert into auth.users(id,email,encrypted_password,raw_app_meta_data,
        raw_user_meta_data,created_at,updated_at)
      values(candidate_id,'geo.verify.'||candidate_id::text||'@example.com','',
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('geodecoder',jsonb_build_object('username',upper(teacher_username),
          'display_name','Duplicate Fixture','role','student')),clock_timestamp(),clock_timestamp());
  exception when unique_violation then rejected:=true;
  end;
  assert rejected,'duplicate normalized username accepted';
  assert not exists(select 1 from auth.users u where u.id=candidate_id)
      and not exists(select 1 from private.profiles p where p.id=candidate_id)
      and not exists(select 1 from private.identities i where i.user_id=candidate_id),
    'duplicate username left a partial Auth/profile/identity account';
  assert exists(select 1 from private.profiles p where p.id=teacher_id
      and p.username=teacher_username and p.role='teacher' and p.display_name='Guru E-mel'),
    'duplicate signup replaced an existing profile';

  perform set_config('role','service_role',true);
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  reply:=public.geo_identity(upper(teacher_username));
  assert (reply->>'id')::uuid=teacher_id and (reply->>'user_id')::uuid=teacher_id
      and reply->>'username'=teacher_username and reply->>'auth_email'=teacher_email
      and reply->>'recovery_hash'=teacher_marker and reply->'email_confirmed'='false'::jsonb,
    'service-only identity lookup changed its existing contract or confirmation state';
  assert public.geo_identity('missing_'||left(token,16)) is null,'missing identity must stay null';
  perform set_config('role','none',true);
  perform set_config('request.jwt.claims','{}',true);

  -- Simulate the state Auth commits after a verified address change. The cached
  -- provisioning address is intentionally unchanged; username lookup must use Auth.
  update auth.users set email=changed_email,email_confirmed_at=clock_timestamp(),
    updated_at=clock_timestamp() where id=teacher_id;
  assert exists(select 1 from private.identities i
      where i.user_id=teacher_id and i.auth_email=teacher_email and i.recovery_hash=teacher_marker),
    'email lookup migration rewrote legacy identity data';
  perform set_config('role','service_role',true);
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  reply:=public.geo_identity(teacher_username);
  assert reply->>'auth_email'=changed_email and reply->'email_confirmed'='true'::jsonb
      and reply->>'recovery_hash'=teacher_marker,
    'username login retained a stale email or lost confirmation state';
  perform set_config('role','none',true);
  perform set_config('request.jwt.claims','{}',true);

  -- This address is free in Auth but still reserved in the legacy identity table.
  -- Its unique violation occurs after the new profile insert and must undo both.
  candidate_id:=gen_random_uuid();
  rejected:=false;
  begin
    insert into auth.users(id,email,encrypted_password,raw_app_meta_data,
        raw_user_meta_data,created_at,updated_at)
      values(candidate_id,teacher_email,'','{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('geodecoder',signup_fields),clock_timestamp(),clock_timestamp());
  exception when unique_violation then rejected:=true;
  end;
  assert rejected,'duplicate identity email accepted';
  assert not exists(select 1 from auth.users u where u.id=candidate_id)
      and not exists(select 1 from private.profiles p where p.id=candidate_id)
      and not exists(select 1 from private.identities i where i.user_id=candidate_id),
    'identity uniqueness failure did not roll back its prior profile insert';

  -- Auth metadata remains editable, but never updates immutable private identity.
  update auth.users set raw_user_meta_data=jsonb_build_object('geodecoder',
      jsonb_build_object('username',teacher_username,'display_name','Metadata Edit','role','teacher')),
    updated_at=clock_timestamp() where id=student_id;
  assert exists(select 1 from private.profiles p where p.id=student_id
      and p.username=student_username and p.display_name='Murid E-mel' and p.role='student')
      and exists(select 1 from private.identities i where i.user_id=student_id
        and i.auth_email=student_email and i.recovery_hash=student_marker),
    'editable Auth metadata changed the established private profile/identity';
  update auth.users set raw_user_meta_data=jsonb_build_object('geodecoder',signup_fields)
    where id=unrelated_id;
  assert not exists(select 1 from private.profiles p where p.id=unrelated_id),
    'metadata update unexpectedly provisioned an unrelated existing account';
  rejected:=false;
  begin
    update private.profiles set role='teacher' where id=student_id;
  exception when insufficient_privilege then rejected:=true;
  end;
  assert rejected and exists(select 1 from private.profiles p where p.id=student_id and p.role='student'),
    'the existing immutable-role guard stopped protecting profiles';

  -- Existing service-only provisioning still accepts legacy synthetic identities.
  insert into auth.users(id,email,encrypted_password,email_confirmed_at,
      raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values(legacy_id,legacy_id::text||'@accounts.geodecoder.invalid','',clock_timestamp(),
      '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,
      clock_timestamp(),clock_timestamp());
  assert not exists(select 1 from private.profiles p where p.id=legacy_id),
    'the email trigger intercepted an unrelated legacy Auth insert';
  perform set_config('role','service_role',true);
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  reply:=public.geo_provision(legacy_id,legacy_username,'Legacy Fixture','student',
    legacy_id::text||'@accounts.geodecoder.invalid',repeat('a',64));
  assert (reply#>>'{profile,id}')::uuid=legacy_id and reply#>>'{profile,role}'='student',
    'legacy geo_provision stopped working';
  reply:=public.geo_identity(legacy_username);
  assert (reply->>'user_id')::uuid=legacy_id
      and reply->>'auth_email'=legacy_id::text||'@accounts.geodecoder.invalid'
      and reply->>'recovery_hash'=repeat('a',64) and reply->'email_confirmed'='true'::jsonb,
    'legacy identity lookup stopped working';
  reply:=public.geo_provision(legacy_id,'new_'||left(token,16),'Replacement Fixture','teacher',
    legacy_id::text||'@accounts.geodecoder.invalid',repeat('b',64));
  assert reply#>>'{error,code}'='username_taken','legacy provisioning replaced a profile';
  perform set_config('role','none',true);
  perform set_config('request.jwt.claims','{}',true);

  assert has_function_privilege('service_role','private.identity(text)','EXECUTE')
      and has_function_privilege('service_role','public.geo_identity(text)','EXECUTE')
      and has_function_privilege('service_role','public.geo_provision(uuid,text,text,text,text,text)','EXECUTE'),
    'service-only legacy RPC access was removed';
  assert not has_function_privilege('service_role','private.handle_geodecoder_signup()','EXECUTE'),
    'service role may invoke the signup trigger function directly';
  for caller in select unnest(array['anon','authenticated']) loop
    assert not has_function_privilege(caller,'private.identity(text)','EXECUTE')
        and not has_function_privilege(caller,'public.geo_identity(text)','EXECUTE')
        and not has_function_privilege(caller,'private.handle_geodecoder_signup()','EXECUTE')
        and not has_function_privilege(caller,'private.provision(uuid,text,text,text,text,text)','EXECUTE')
        and not has_function_privilege(caller,'public.geo_provision(uuid,text,text,text,text,text)','EXECUTE'),
      caller||' received private identity/provisioning access';
    assert not has_table_privilege(caller,'private.profiles','SELECT')
        and not has_table_privilege(caller,'private.identities','SELECT'),
      caller||' received direct private profile/identity read access';
    perform set_config('role',caller,true);
    perform set_config('request.jwt.claims',jsonb_build_object('role',caller,'sub',student_id,
      'user_metadata',jsonb_build_object('geodecoder',jsonb_build_object('role','teacher')))::text,true);
    begin
      perform private.identity(student_username);
      raise exception '% executed private.identity',caller;
    exception when insufficient_privilege then null; end;
    begin
      perform public.geo_identity(student_username);
      raise exception '% executed public.geo_identity',caller;
    exception when insufficient_privilege then null; end;
    begin
      perform 1 from private.profiles;
      raise exception '% read private.profiles',caller;
    exception when insufficient_privilege then null; end;
    begin
      perform 1 from private.identities;
      raise exception '% read private.identities',caller;
    exception when insufficient_privilege then null; end;
    perform set_config('role','none',true);
    perform set_config('request.jwt.claims','{}',true);
  end loop;
  -- An owner can execute the function, but its explicit service-role guard must
  -- still reject a call with no service role in either the session or JWT.
  begin
    perform private.identity(student_username);
    raise exception 'identity lookup lost its explicit service-role guard';
  exception when insufficient_privilege then null; end;

  raise notice 'GeoDecoder V2.2 email verification passed: transactional signup, validation, uniqueness rollback, shared Auth isolation, canonical email lookup, immutable roles, private grants and legacy compatibility. All fixtures are rolled back.';
end
$email_verification$;
rollback;
