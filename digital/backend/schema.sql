-- GeoDecoder V2.2. Run as the project database owner on an empty Supabase project.
-- Only public.room_progress and authenticated geo_action are client-facing.
-- Provisioning, identity and rate-limit RPCs are reserved for the Edge service role.
begin;

create schema if not exists private;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;

create table if not exists private.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 2 and 60),
  role text not null check (role in ('teacher','student')),
  created_at timestamptz not null default clock_timestamp(),
  last_seen timestamptz not null default clock_timestamp()
);
alter table private.profiles add column if not exists avatar text not null default 'initial' check (avatar in ('initial','cube','cuboid','pyramid','cylinder','cone'));
create table if not exists private.identities (
  user_id uuid primary key references private.profiles(id) on delete cascade,
  auth_email text not null unique check (char_length(auth_email) between 5 and 254),
  recovery_hash text not null check (char_length(recovery_hash) between 32 and 512)
);
create table if not exists private.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references private.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  created_at timestamptz not null default clock_timestamp(),
  unique (id,teacher_id)
);
create index if not exists classes_teacher_idx on private.classes(teacher_id);
create table if not exists private.class_members (
  class_id uuid not null references private.classes(id) on delete cascade,
  user_id uuid not null references private.profiles(id) on delete cascade,
  joined_at timestamptz not null default clock_timestamp(),
  primary key(class_id,user_id)
);
create index if not exists class_members_user_idx on private.class_members(user_id,class_id);
create table if not exists private.invites (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references private.classes(id) on delete cascade,
  student_id uuid not null references private.profiles(id) on delete cascade,
  invited_by uuid not null references private.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default clock_timestamp(),
  unique(class_id,student_id)
);
create index if not exists invites_student_idx on private.invites(student_id,status);
create index if not exists invites_sender_idx on private.invites(invited_by);
create table if not exists private.questions (
  id text primary key,
  shape text not null check(shape in ('cube','cuboid','pyramid','cylinder','cone')),
  topic text not null check(topic in ('properties','formula','net')),
  prompt text not null,
  hint text not null
);
create table if not exists private.rooms (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  teacher_id uuid not null,
  name text not null check (char_length(name) between 2 and 60),
  status text not null default 'open' check(status in ('open','playing','closed')),
  question_ids text[] not null check (cardinality(question_ids)=10),
  created_at timestamptz not null default clock_timestamp(),
  closed_at timestamptz,
  foreign key(class_id,teacher_id) references private.classes(id,teacher_id) on delete cascade
);
create index if not exists rooms_class_owner_idx on private.rooms(class_id,teacher_id);
create index if not exists rooms_teacher_idx on private.rooms(teacher_id);
create table if not exists private.room_members (
  room_id uuid not null references private.rooms(id) on delete cascade,
  user_id uuid not null references private.profiles(id) on delete cascade,
  joined_at timestamptz not null default clock_timestamp(),
  primary key(room_id,user_id)
);
create index if not exists room_members_user_idx on private.room_members(user_id,room_id);
create table if not exists private.join_codes (
  pin text primary key check(pin ~ '^[0-9]{6}$'),
  kind text not null check(kind in ('class','room')),
  class_id uuid unique references private.classes(id) on delete cascade,
  room_id uuid unique references private.rooms(id) on delete cascade,
  expires_at timestamptz not null,
  check ((kind='class' and class_id is not null and room_id is null)
      or (kind='room' and room_id is not null and class_id is null))
);
create index if not exists join_codes_expiry_idx on private.join_codes(expires_at);
create table if not exists private.rate_buckets (
  key text primary key check(char_length(key) between 1 and 256),
  started_at timestamptz not null,
  hits integer not null check(hits>=0)
);
create index if not exists rate_buckets_expiry_idx on private.rate_buckets(started_at);
create table if not exists private.attempts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references private.rooms(id) on delete cascade,
  user_id uuid not null references private.profiles(id) on delete cascade,
  question_index integer not null default 0 check(question_index between 0 and 9),
  stage text not null default 'solid' check(stage in ('solid','net')),
  status text not null default 'running' check(status in ('running','review','feedback','finished','closed')),
  score integer not null default 0 check(score between 0 and 10),
  mistakes integer not null default 0 check(mistakes between 0 and 10),
  hints integer not null default 0 check(hints between 0 and 10),
  skipped integer not null default 0 check(skipped between 0 and 10),
  elapsed_ms bigint not null default 0 check(elapsed_ms>=0),
  timer_started_at timestamptz default clock_timestamp(),
  ready_at timestamptz,
  hint_used boolean not null default false,
  selections jsonb not null default '{"solid":null,"net":null}'::jsonb,
  last_outcome text check(last_outcome in ('wrong','correct','skipped')),
  wrong_reader text check(wrong_reader in ('r1','r2')),
  answers jsonb not null default '[]'::jsonb check(jsonb_typeof(answers)='array' and jsonb_array_length(answers)<=10),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(room_id,user_id),
  foreign key(room_id,user_id) references private.room_members(room_id,user_id) on delete cascade,
  check ((status='running' and timer_started_at is not null) or (status<>'running' and timer_started_at is null))
);
create index if not exists attempts_user_idx on private.attempts(user_id,room_id);
create table if not exists private.attempt_events (
  attempt_id uuid not null references private.attempts(id) on delete cascade,
  event_id uuid not null,
  request_key text not null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key(attempt_id,event_id)
);

create table if not exists public.room_progress (
  room_id uuid not null references private.rooms(id) on delete cascade,
  user_id uuid not null references private.profiles(id) on delete cascade,
  username text not null,
  display_name text not null,
  status text not null default 'waiting' check(status in ('waiting','playing','review','finished','closed')),
  question_index integer not null default 0 check(question_index between 0 and 9),
  score integer not null default 0 check(score between 0 and 10),
  total integer not null default 10 check(total=10),
  mistakes integer not null default 0 check(mistakes between 0 and 10),
  hints integer not null default 0 check(hints between 0 and 10),
  skipped integer not null default 0 check(skipped between 0 and 10),
  elapsed_ms bigint not null default 0 check(elapsed_ms>=0),
  timer_started_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  last_seen timestamptz not null default clock_timestamp(),
  primary key(room_id,user_id),
  foreign key(room_id,user_id) references private.room_members(room_id,user_id) on delete cascade
);
create index if not exists room_progress_user_idx on public.room_progress(user_id);

-- Defense in depth: private tables remain inaccessible even if schema exposure changes.
do $rls$
declare t record;
begin
  for t in select tablename from pg_catalog.pg_tables where schemaname='private' loop
    execute format('alter table private.%I enable row level security',t.tablename);
  end loop;
end
$rls$;
alter table public.room_progress enable row level security;
revoke all on all tables in schema private from public, anon, authenticated, service_role;
revoke all on public.room_progress from public, anon, authenticated;
grant select on public.room_progress to authenticated;

-- RLS helper never accepts a user ID from a caller.
create or replace function private.can_view_room(p_room_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select (select auth.uid()) is not null and (
    exists(select 1 from private.rooms r where r.id=p_room_id and r.teacher_id=(select auth.uid()))
    or exists(select 1 from private.room_members m where m.room_id=p_room_id and m.user_id=(select auth.uid()))
  );
$$;
revoke all on function private.can_view_room(uuid) from public, anon, authenticated;
grant execute on function private.can_view_room(uuid) to authenticated;
drop policy if exists room_members_read on public.room_progress;
create policy room_members_read on public.room_progress for select to authenticated
  using (private.can_view_room(room_id));

-- Immutable authorization role, independent of editable Auth user_metadata.
create or replace function private.protect_profile_identity()
returns trigger language plpgsql security invoker set search_path=''
as $$ begin
  if new.role is distinct from old.role or new.id is distinct from old.id
     or new.username is distinct from old.username then
    raise exception 'Account identity and role are immutable' using errcode='42501';
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_identity on private.profiles;
create trigger protect_profile_identity before update on private.profiles
  for each row execute function private.protect_profile_identity();

-- Uniform six-digit codes from pgcrypto, including leading zeros. Rejection sampling
-- avoids modulo bias; installation discovers pgcrypto's actual extension schema.
create or replace function private.random_pin()
returns text language plpgsql volatile security invoker set search_path=''
as $$
declare b bytea; n integer; crypto_schema text;
begin
  select ns.nspname into crypto_schema from pg_catalog.pg_extension e
    join pg_catalog.pg_namespace ns on ns.oid=e.extnamespace where e.extname='pgcrypto';
  if crypto_schema is null then raise exception 'pgcrypto is required'; end if;
  loop
    execute format('select %I.gen_random_bytes(3)',crypto_schema) into b;
    n := get_byte(b,0)*65536 + get_byte(b,1)*256 + get_byte(b,2);
    if n < 16000000 then return lpad((n % 1000000)::text,6,'0'); end if;
  end loop;
end $$;

create or replace function private.issue_pin(p_kind text,p_id uuid)
returns text language plpgsql security invoker set search_path=''
as $$
declare candidate text; old_pin text; tries integer:=0;
begin
  select pin into old_pin from private.join_codes
    where (p_kind='class' and class_id=p_id) or (p_kind='room' and room_id=p_id);
  delete from private.join_codes where (p_kind='class' and class_id=p_id) or (p_kind='room' and room_id=p_id);
  -- Expired codes are not kept indefinitely; never reissue this target's old PIN.
  delete from private.join_codes where expires_at<clock_timestamp();
  loop
    tries:=tries+1;
    if tries>100 then raise exception 'PIN capacity reached'; end if;
    candidate:=private.random_pin();
    if candidate is not distinct from old_pin then continue; end if;
    begin
      insert into private.join_codes(pin,kind,class_id,room_id,expires_at)
        values(candidate,p_kind,case when p_kind='class' then p_id end,
          case when p_kind='room' then p_id end,clock_timestamp()+interval '24 hours');
      return candidate;
    exception when unique_violation then null;
    end;
  end loop;
end $$;

create or replace function private.error(p_code text,p_message text)
returns jsonb language sql immutable security invoker set search_path=''
as $$ select jsonb_build_object('error',jsonb_build_object('code',p_code,'message',p_message)); $$;

create or replace function private.consume_limit(p_key text,p_limit integer,p_window integer)
returns boolean language plpgsql volatile security invoker set search_path=''
as $$
declare n integer; t timestamptz:=clock_timestamp();
begin
  if char_length(p_key) not between 1 and 256 or p_limit not between 1 and 10000
      or p_window not between 1 and 86400 then raise exception 'Invalid rate limit'; end if;
  insert into private.rate_buckets as b(key,started_at,hits) values(p_key,t,1)
    on conflict(key) do update set
      hits=case when b.started_at<=t-make_interval(secs=>p_window) then 1 else b.hits+1 end,
      started_at=case when b.started_at<=t-make_interval(secs=>p_window) then t else b.started_at end
    returning hits into n;
  return n<=p_limit;
end $$;

create or replace function private.provision(p_user_id uuid,p_username text,p_display_name text,p_role text,p_auth_email text,p_recovery_hash text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uname text:=lower(btrim(p_username)); display text:=btrim(p_display_name);
begin
  -- Auth.uid is deliberately not substituted for the provisioned account. Only the
  -- server's signed service-role token may create a profile for this Auth UUID.
  if (select auth.jwt()->>'role') is distinct from 'service_role'
     and current_setting('role',true) is distinct from 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if uname is null or uname !~ '^[a-z0-9_]{3,24}$'
     or display is null or char_length(display) not between 2 and 60
     or p_role is null or p_role not in ('teacher','student') then
    return private.error('invalid_account','Nama pengguna, nama atau peranan tidak sah.');
  end if;
  if not exists(select 1 from auth.users u where u.id=p_user_id and lower(u.email)=lower(p_auth_email)) then
    return private.error('auth_identity','Identiti akaun tidak sepadan.');
  end if;
  if exists(select 1 from private.profiles where id=p_user_id or username=uname) then
    return private.error('username_taken','Nama pengguna telah digunakan.');
  end if;
  insert into private.profiles(id,username,display_name,role) values(p_user_id,uname,display,p_role);
  insert into private.identities(user_id,auth_email,recovery_hash) values(p_user_id,lower(p_auth_email),p_recovery_hash);
  return jsonb_build_object('profile',jsonb_build_object('id',p_user_id,'username',uname,'display_name',display,'role',p_role));
end $$;

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

create or replace function private.rate_guard(p_key text,p_limit integer,p_window integer)
returns boolean language plpgsql security definer set search_path=''
as $$ begin
  if (select auth.jwt()->>'role') is distinct from 'service_role'
     and current_setting('role',true) is distinct from 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  return private.consume_limit('edge:'||p_key,p_limit,p_window);
end $$;

create or replace function private.state(p_attempt_id uuid,p_now timestamptz)
returns jsonb language sql stable security invoker set search_path=''
as $$
  select jsonb_build_object('attemptId',a.id,'roomId',a.room_id,'questions',to_jsonb(r.question_ids),
    'index',a.question_index,'stage',a.stage,'status',a.status,'score',a.score,
    'mistakes',a.mistakes,'hints',a.hints,'skipped',a.skipped,
    'elapsed',a.elapsed_ms+case when a.status='running' then greatest(0,floor(extract(epoch from (p_now-a.timer_started_at))*1000)::bigint) else 0 end,
    'hintUsed',a.hint_used,'attempts',a.selections,'lastOutcome',a.last_outcome,
    'wrongReader',a.wrong_reader,'answers',a.answers,
    'readyInMs',case when a.status in ('review','feedback') then greatest(0,ceil(extract(epoch from(a.ready_at-p_now))*1000)::integer) else 0 end)
  from private.attempts a join private.rooms r on r.id=a.room_id where a.id=p_attempt_id;
$$;

-- A projection only: the caller cannot supply score, elapsed time or identity.
create or replace function private.sync_progress(p_room_id uuid,p_user_id uuid,p_now timestamptz)
returns void language plpgsql security invoker set search_path=''
as $$ begin
  insert into public.room_progress(room_id,user_id,username,display_name,status,question_index,score,
      mistakes,hints,skipped,elapsed_ms,timer_started_at,updated_at,last_seen)
    select m.room_id,p.id,p.username,p.display_name,
      case when r.status='closed' and coalesce(a.status,'')<>'finished' then 'closed'
        when a.status='running' then 'playing' when a.status in ('review','feedback') then 'review'
        when a.status in ('finished','closed') then a.status else 'waiting' end,
      coalesce(a.question_index,0),coalesce(a.score,0),coalesce(a.mistakes,0),coalesce(a.hints,0),
      coalesce(a.skipped,0),coalesce(a.elapsed_ms,0),a.timer_started_at,p_now,p.last_seen
    from private.room_members m join private.rooms r on r.id=m.room_id
      join private.profiles p on p.id=m.user_id left join private.attempts a on a.room_id=m.room_id and a.user_id=m.user_id
    where m.room_id=p_room_id and m.user_id=p_user_id
    on conflict(room_id,user_id) do update set username=excluded.username,display_name=excluded.display_name,
      status=excluded.status,question_index=excluded.question_index,score=excluded.score,mistakes=excluded.mistakes,
      hints=excluded.hints,skipped=excluded.skipped,elapsed_ms=excluded.elapsed_ms,
      timer_started_at=excluded.timer_started_at,updated_at=excluded.updated_at,last_seen=excluded.last_seen;
end $$;

create or replace function private.snapshot(p_user_id uuid,p_room_id uuid default null)
returns jsonb language plpgsql stable security invoker set search_path=''
as $$
declare s jsonb; room_json jsonb;
begin
  select jsonb_build_object(
    'profile',jsonb_build_object('id',p.id,'username',p.username,'display_name',p.display_name,'role',p.role,'last_seen',p.last_seen,'avatar',p.avatar,
      'email',(select u.email from auth.users u where u.id=p_user_id),
      'email_verified',(select u.email_confirmed_at is not null from auth.users u where u.id=p_user_id)),
    'classes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'teacher_id',c.teacher_id,
      'pin',case when c.teacher_id=p_user_id then pin.pin end,
      'pin_expires_at',case when c.teacher_id=p_user_id then pin.expires_at end,
      'members',case when c.teacher_id=p_user_id then coalesce((select jsonb_agg(jsonb_build_object(
        'id',mp.id,'username',mp.username,'display_name',mp.display_name,'last_seen',mp.last_seen) order by mp.display_name)
        from private.class_members cm join private.profiles mp on mp.id=cm.user_id where cm.class_id=c.id),'[]'::jsonb) else '[]'::jsonb end)
      order by c.created_at desc) from private.classes c left join private.join_codes pin on pin.class_id=c.id and pin.expires_at>clock_timestamp()
      where c.teacher_id=p_user_id or exists(select 1 from private.class_members m where m.class_id=c.id and m.user_id=p_user_id)),'[]'::jsonb),
    'invites',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'class_id',i.class_id,'class_name',c.name,'teacher_name',t.display_name)
      order by i.created_at desc) from private.invites i join private.classes c on c.id=i.class_id
      join private.profiles t on t.id=c.teacher_id where i.student_id=p_user_id and i.status='pending'),'[]'::jsonb),
    'rooms',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'class_id',r.class_id,'class_name',c.name,
      'name',r.name,'teacher_id',r.teacher_id,'status',r.status,
      'is_member',exists(select 1 from private.room_members membership where membership.room_id=r.id and membership.user_id=p_user_id),
      'pin',case when r.teacher_id=p_user_id then pin.pin end,
      'pin_expires_at',case when r.teacher_id=p_user_id then pin.expires_at end,
      'members_count',(select count(*) from private.room_members m where m.room_id=r.id)) order by r.created_at desc)
      from private.rooms r join private.classes c on c.id=r.class_id
      left join private.join_codes pin on pin.room_id=r.id and pin.expires_at>clock_timestamp()
      where r.teacher_id=p_user_id or exists(select 1 from private.class_members m where m.class_id=r.class_id and m.user_id=p_user_id)),'[]'::jsonb),
    'server_now',clock_timestamp()) into s from private.profiles p where p.id=p_user_id;
  if p_room_id is not null then
    if not private.can_view_room(p_room_id) then return private.error('forbidden','Bilik ini tidak boleh diakses.'); end if;
    select jsonb_build_object('id',r.id,'name',r.name,'class_name',c.name,'status',r.status,
      'pin',case when r.teacher_id=p_user_id then pin.pin end,
      'pin_expires_at',case when r.teacher_id=p_user_id then pin.expires_at end,
      'players',coalesce((select jsonb_agg(to_jsonb(progress) order by progress.score desc,
        progress.elapsed_ms,progress.display_name) from public.room_progress progress where progress.room_id=r.id),'[]'::jsonb),
      'my_attempt',(select private.state(a.id,clock_timestamp()) from private.attempts a where a.room_id=r.id and a.user_id=p_user_id))
      into room_json from private.rooms r join private.classes c on c.id=r.class_id
      left join private.join_codes pin on pin.room_id=r.id and pin.expires_at>clock_timestamp() where r.id=p_room_id;
    s:=s||jsonb_build_object('room',room_json);
  end if;
  return s;
end $$;

create or replace function private.geo_action(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
  uid uuid:=(select auth.uid()); me private.profiles%rowtype;
  rid uuid; cid uuid; aid uuid; iid uuid; sid uuid; eid uuid;
  room_row private.rooms%rowtype; attempt_row private.attempts%rowtype;
  code_row private.join_codes%rowtype; question_row private.questions%rowtype;
  saved_event private.attempt_events%rowtype;
  t timestamptz:=clock_timestamp(); delta_ms bigint; chosen text[];
  outcome text; target text; kind text; shape text; name_input text;
  result_json jsonb; request_key text; err boolean; old_status text; member_row record;
begin
  if uid is null then return private.error('unauthenticated','Sila log masuk.'); end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8192 then
    return private.error('invalid_payload','Permintaan tidak sah.');
  end if;
  -- Serializes a user's joins and events. Attempts are separately locked below.
  select * into me from private.profiles where id=uid for update;
  if not found then return private.error('profile_missing','Profil akaun belum tersedia.'); end if;
  update private.profiles set last_seen=t where id=uid;

  if p_action in ('snapshot','heartbeat') then
    rid:=nullif(p_payload->>'room_id','')::uuid;
    if rid is not null and not private.can_view_room(rid) then return private.error('forbidden','Bilik ini tidak boleh diakses.'); end if;
    if p_action='heartbeat' then
      update public.room_progress set last_seen=t where user_id=uid and (rid is null or room_id=rid);
    end if;
    return private.snapshot(uid,rid);

  elsif p_action='update_profile' then
    -- Strict allowlist: identity, role and target UUID can never come from a client.
    if (p_payload - array['display_name','avatar']) <> '{}'::jsonb
       or jsonb_typeof(p_payload->'display_name') is distinct from 'string'
       or jsonb_typeof(p_payload->'avatar') is distinct from 'string' then
      return private.error('invalid_profile','Hanya nama paparan dan avatar boleh diubah.');
    end if;
    name_input:=btrim(p_payload->>'display_name');
    if char_length(name_input) not between 2 and 60 or name_input ~ '[[:cntrl:]]' then
      return private.error('invalid_name','Nama paparan mestilah 2 hingga 60 aksara tanpa aksara kawalan.');
    end if;
    if p_payload->>'avatar' not in ('initial','cube','cuboid','pyramid','cylinder','cone') then
      return private.error('invalid_avatar','Pilih avatar yang tersedia.');
    end if;
    update private.profiles set display_name=name_input,avatar=p_payload->>'avatar' where id=uid;
    -- Refresh only the public name; gameplay metrics remain server-owned and unchanged.
    update public.room_progress set display_name=name_input where user_id=uid;
    return private.snapshot(uid);

  elsif p_action='create_class' then
    if me.role<>'teacher' then return private.error('forbidden','Hanya guru boleh mencipta kelas.'); end if;
    name_input:=btrim(p_payload->>'name');
    if name_input is null or char_length(name_input) not between 2 and 60 then return private.error('invalid_name','Nama kelas mestilah 2 hingga 60 aksara.'); end if;
    insert into private.classes(teacher_id,name) values(uid,name_input) returning id into cid;
    perform private.issue_pin('class',cid);
    return private.snapshot(uid)||jsonb_build_object('class_id',cid);

  elsif p_action='invite' then
    cid:=(p_payload->>'class_id')::uuid;
    if me.role<>'teacher' or not exists(select 1 from private.classes where id=cid and teacher_id=uid) then return private.error('forbidden','Kelas ini tidak boleh diakses.'); end if;
    select id into sid from private.profiles where username=lower(btrim(p_payload->>'username')) and role='student';
    if sid is null then return private.error('student_missing','Nama pengguna murid tidak dijumpai.'); end if;
    insert into private.invites(class_id,student_id,invited_by) values(cid,sid,uid)
      on conflict(class_id,student_id) do update set status='pending',created_at=t returning id into iid;
    return private.snapshot(uid)||jsonb_build_object('invite_id',iid);

  elsif p_action='accept_invite' then
    iid:=(p_payload->>'invite_id')::uuid;
    select class_id into cid from private.invites where id=iid and student_id=uid for update;
    if me.role<>'student' or cid is null then return private.error('forbidden','Jemputan ini tidak boleh diterima.'); end if;
    insert into private.class_members(class_id,user_id) values(cid,uid) on conflict do nothing;
    update private.invites set status='accepted' where id=iid;
    return private.snapshot(uid)||jsonb_build_object('class_id',cid);

  elsif p_action='create_room' then
    cid:=(p_payload->>'class_id')::uuid;
    if me.role<>'teacher' or not exists(select 1 from private.classes where id=cid and teacher_id=uid) then return private.error('forbidden','Kelas ini tidak boleh diakses.'); end if;
    name_input:=btrim(p_payload->>'name');
    if name_input is null or char_length(name_input) not between 2 and 60 then return private.error('invalid_name','Nama bilik mestilah 2 hingga 60 aksara.'); end if;
    select array_agg(q.id order by random()) into chosen from
      (select bank.id,row_number() over(partition by bank.shape order by random()) as n from private.questions bank) q where q.n<=2;
    if cardinality(chosen)<>10 then return private.error('bank_invalid','Bank soalan tidak lengkap.'); end if;
    insert into private.rooms(class_id,teacher_id,name,question_ids) values(cid,uid,name_input,chosen) returning id into rid;
    perform private.issue_pin('room',rid);
    return private.snapshot(uid,rid)||jsonb_build_object('room_id',rid);

  elsif p_action='rotate_pin' then
    kind:=p_payload->>'kind';
    iid:=(p_payload->>'id')::uuid;
    if me.role<>'teacher' then return private.error('forbidden','Hanya guru boleh menukar PIN.'); end if;
    if kind='class' then
      perform 1 from private.classes where id=iid and teacher_id=uid for update;
    elsif kind='room' then
      perform 1 from private.rooms where id=iid and teacher_id=uid and status<>'closed' for update;
    else return private.error('invalid_kind','Jenis PIN tidak sah.'); end if;
    if not found then return private.error('forbidden','PIN ini tidak boleh diubah.'); end if;
    perform private.issue_pin(kind,iid);
    return private.snapshot(uid,case when kind='room' then iid else null end);

  elsif p_action='join_pin' then
    if me.role<>'student' then return private.error('forbidden','Hanya murid boleh menyertai dengan PIN.'); end if;
    if exists(select 1 from private.rate_buckets where key='join:'||uid::text and started_at>t-interval '15 minutes' and hits>=8) then
      return private.error('rate_limited','Terlalu banyak PIN tidak sah. Cuba lagi dalam 15 minit.');
    end if;
    select * into code_row from private.join_codes where pin=p_payload->>'pin' and expires_at>t;
    if not found or coalesce(p_payload->>'pin','') !~ '^[0-9]{6}$' then
      perform private.consume_limit('join:'||uid::text,8,900);
      return private.error('invalid_pin','PIN tidak sah atau telah tamat tempoh.');
    end if;
    if code_row.kind='class' then
      cid:=code_row.class_id;
      perform 1 from private.classes where id=cid for share;
    else
      rid:=code_row.room_id;
      select * into room_row from private.rooms where id=rid for share;
      if room_row.status='closed' then return private.error('room_closed','Bilik ini telah ditutup.'); end if;
      cid:=room_row.class_id;
    end if;
    -- Use the same target-first lock order as rotation. Recheck after waiting
    -- so a PIN rotated during this request cannot enroll a new member.
    if not exists(select 1 from private.join_codes where pin=code_row.pin and expires_at>clock_timestamp()) then
      perform private.consume_limit('join:'||uid::text,8,900);
      return private.error('invalid_pin','PIN tidak sah atau telah tamat tempoh.');
    end if;
    insert into private.class_members(class_id,user_id) values(cid,uid) on conflict do nothing;
    update private.invites set status='accepted' where class_id=cid and student_id=uid;
    if rid is not null then
      insert into private.room_members(room_id,user_id) values(rid,uid) on conflict do nothing;
      perform private.sync_progress(rid,uid,t);
    end if;
    return private.snapshot(uid,rid)||jsonb_build_object('class_id',cid,'room_id',rid);

  elsif p_action='join_room' then
    rid:=(p_payload->>'room_id')::uuid;
    select * into room_row from private.rooms where id=rid for share;
    if me.role<>'student' or not found or not exists(select 1 from private.class_members where class_id=room_row.class_id and user_id=uid) then return private.error('forbidden','Sertai kelas ini dahulu.'); end if;
    if room_row.status='closed' then return private.error('room_closed','Bilik ini telah ditutup.'); end if;
    insert into private.room_members(room_id,user_id) values(rid,uid) on conflict do nothing;
    perform private.sync_progress(rid,uid,t);
    return private.snapshot(uid,rid)||jsonb_build_object('room_id',rid);

  elsif p_action='set_room' then
    rid:=(p_payload->>'room_id')::uuid;
    select * into room_row from private.rooms where id=rid and teacher_id=uid for update;
    if me.role<>'teacher' or not found then return private.error('forbidden','Bilik ini tidak boleh diubah.'); end if;
    old_status:=room_row.status;
    outcome:=p_payload->>'status';
    if outcome is null or outcome not in ('open','playing','closed') or (old_status='closed' and outcome<>'closed')
       or (old_status='playing' and outcome='open') then return private.error('invalid_status','Peralihan status bilik tidak sah.'); end if;
    update private.rooms set status=outcome,closed_at=case when outcome='closed' then coalesce(closed_at,t) end where id=rid;
    if outcome='closed' then
      -- Room lock is always taken before attempt lock, including student actions.
      perform 1 from private.attempts where room_id=rid order by id for update;
      update private.attempts set elapsed_ms=elapsed_ms+case when status='running' then greatest(0,floor(extract(epoch from(t-timer_started_at))*1000)::bigint) else 0 end,
        timer_started_at=null,ready_at=null,status='closed',updated_at=t where room_id=rid and status not in ('finished','closed');
      for member_row in select user_id from private.room_members where room_id=rid loop
        perform private.sync_progress(rid,member_row.user_id,t);
      end loop;
    end if;
    return private.snapshot(uid,rid);

  elsif p_action='start_attempt' then
    rid:=(p_payload->>'room_id')::uuid;
    select * into room_row from private.rooms where id=rid for share;
    if me.role<>'student' or not found or not exists(select 1 from private.room_members where room_id=rid and user_id=uid) then return private.error('forbidden','Sertai bilik ini dahulu.'); end if;
    select * into attempt_row from private.attempts where room_id=rid and user_id=uid for update;
    if found then return jsonb_build_object('state',private.state(attempt_row.id,t)); end if;
    if room_row.status<>'playing' then return private.error('room_not_playing','Tunggu guru memulakan bilik.'); end if;
    insert into private.attempts(room_id,user_id,timer_started_at) values(rid,uid,t) returning id into aid;
    perform private.sync_progress(rid,uid,t);
    return jsonb_build_object('state',private.state(aid,t));

  elsif p_action in ('answer','hint','skip','advance') then
    aid:=(p_payload->>'attempt_id')::uuid;
    select room_id into rid from private.attempts where id=aid and user_id=uid;
    if rid is null then return private.error('forbidden','Percubaan ini tidak boleh diakses.'); end if;
    select * into room_row from private.rooms where id=rid for share;
    select * into attempt_row from private.attempts where id=aid and user_id=uid for update;
    eid:=(p_payload->>'event_id')::uuid;
    if eid is null then return private.error('event_required','ID tindakan diperlukan.'); end if;
    request_key:=p_action||':'||(p_payload-'event_id')::text;
    select * into saved_event from private.attempt_events where attempt_id=aid and event_id=eid;
    if found then
      if saved_event.request_key<>request_key then return private.error('event_conflict','ID tindakan telah digunakan.'); end if;
      return jsonb_build_object('state',private.state(aid,t),'result',saved_event.result);
    end if;
    if (p_payload->>'index') is null or (p_payload->>'index') !~ '^[0-9]$'
       or (p_payload->>'index')::integer<>attempt_row.question_index then
      return jsonb_build_object('state',private.state(aid,t),'result',jsonb_build_object('type','blocked'));
    end if;
    if room_row.status='closed' or attempt_row.status in ('finished','closed') then
      result_json:=jsonb_build_object('type','blocked');
    elsif p_action='advance' then
      if attempt_row.status not in ('review','feedback') or t<attempt_row.ready_at then
        result_json:=jsonb_build_object('type','blocked');
      else
        if attempt_row.question_index=9 then
          update private.attempts set status='finished',ready_at=null,updated_at=t where id=aid;
        else
          update private.attempts set question_index=question_index+1,stage='solid',status='running',
            timer_started_at=t,ready_at=null,hint_used=false,selections='{"solid":null,"net":null}',
            wrong_reader=null,updated_at=t where id=aid;
        end if;
        result_json:=jsonb_build_object('type','correct');
      end if;
    elsif attempt_row.status<>'running' then
      result_json:=jsonb_build_object('type','blocked');
    elsif p_action='hint' then
      update private.attempts set hints=hints+case when hint_used then 0 else 1 end,hint_used=true,updated_at=t where id=aid;
      result_json:=jsonb_build_object('type','correct');
    else
      outcome:=null;
      select * into question_row from private.questions where id=room_row.question_ids[attempt_row.question_index+1];
      if p_action='skip' then
        outcome:='skipped';
        result_json:=jsonb_build_object('type','correct');
      else
        target:=case when attempt_row.stage='solid' then 'r1' else 'r2' end;
        kind:=p_payload->>'kind'; shape:=p_payload->>'shape';
        if p_payload->>'target' is distinct from target then result_json:=jsonb_build_object('type','stage','target',target);
        elsif kind is distinct from attempt_row.stage or shape is null or shape not in ('cube','cuboid','pyramid','cylinder','cone') then
          result_json:=jsonb_build_object('type','kind','kind',attempt_row.stage);
        else
          attempt_row.selections:=jsonb_set(attempt_row.selections,array[attempt_row.stage],to_jsonb(shape));
          if shape<>question_row.shape then
            outcome:='wrong'; result_json:=jsonb_build_object('type','wrong','target',target);
          elsif attempt_row.stage='solid' then
            update private.attempts set stage='net',selections=attempt_row.selections,wrong_reader=null,updated_at=t where id=aid;
            result_json:=jsonb_build_object('type','solid');
          else outcome:='correct'; result_json:=jsonb_build_object('type','correct'); end if;
        end if;
      end if;
      if outcome is not null then
        delta_ms:=greatest(0,floor(extract(epoch from(t-attempt_row.timer_started_at))*1000)::bigint);
        update private.attempts set score=score+case when outcome='correct' then 1 else 0 end,
          mistakes=mistakes+case when outcome='wrong' then 1 else 0 end,
          skipped=skipped+case when outcome='skipped' then 1 else 0 end,
          elapsed_ms=elapsed_ms+delta_ms,timer_started_at=null,
          status=case when outcome='correct' then 'feedback' else 'review' end,
          ready_at=t+case when outcome='correct' then interval '900 milliseconds' else interval '1800 milliseconds' end,
          selections=attempt_row.selections,last_outcome=outcome,
          wrong_reader=case when outcome='wrong' then target end,
          answers=answers||jsonb_build_array(jsonb_build_object('id',question_row.id,'shape',question_row.shape,'topic',question_row.topic,
            'outcome',outcome,'hint',attempt_row.hint_used,'failedAt',case when outcome='wrong' then attempt_row.stage end,
            'attempts',attempt_row.selections,'elapsed',delta_ms,'firstTry',outcome='correct')),updated_at=t where id=aid;
      end if;
    end if;
    -- Do not cache a too-early advance. A queued retry of that event must be able
    -- to advance after the server-enforced feedback/review interval expires.
    if not (p_action='advance' and result_json->>'type'='blocked') then
      insert into private.attempt_events(attempt_id,event_id,request_key,result) values(aid,eid,request_key,result_json);
    end if;
    perform private.sync_progress(rid,uid,t);
    return jsonb_build_object('state',private.state(aid,t),'result',result_json);
  end if;
  return private.error('unknown_action','Tindakan tidak dikenali.');
exception when invalid_text_representation or numeric_value_out_of_range then
  return private.error('invalid_payload','ID atau nilai permintaan tidak sah.');
end $$;

-- Invoker wrappers keep definer entry points outside exposed schemas.
create or replace function public.geo_action(action text,payload jsonb default '{}'::jsonb)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.geo_action(action,payload); $$;
create or replace function public.geo_provision(p_user_id uuid,p_username text,p_display_name text,p_role text,p_auth_email text,p_recovery_hash text)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.provision(p_user_id,p_username,p_display_name,p_role,p_auth_email,p_recovery_hash); $$;
create or replace function public.geo_identity(p_username text)
returns jsonb language sql stable security invoker set search_path=''
as $$ select private.identity(p_username); $$;
create or replace function public.geo_rate_guard(p_key text,p_limit integer,p_window integer)
returns boolean language sql volatile security invoker set search_path=''
as $$ select private.rate_guard(p_key,p_limit,p_window); $$;

revoke execute on all functions in schema private from public, anon, authenticated, service_role;
grant execute on function private.geo_action(text,jsonb),private.can_view_room(uuid) to authenticated;
grant execute on function private.provision(uuid,text,text,text,text,text),private.identity(text),private.rate_guard(text,integer,integer) to service_role;
revoke all on function public.geo_action(text,jsonb),public.geo_provision(uuid,text,text,text,text,text),
  public.geo_identity(text),public.geo_rate_guard(text,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.geo_action(text,jsonb) to authenticated;
grant execute on function public.geo_provision(uuid,text,text,text,text,text),public.geo_identity(text),
  public.geo_rate_guard(text,integer,integer) to service_role;

-- Realtime delivers only sanitized rows and applies the SELECT policy per subscriber.
do $publication$
begin
  if exists(select 1 from pg_catalog.pg_publication where pubname='supabase_realtime')
    and not exists(select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime'
      and schemaname='public' and tablename='room_progress') then
    alter publication supabase_realtime add table public.room_progress;
  end if;
end
$publication$;

-- Bank is inserted below from dist/questions.mjs by the source preparation step.

insert into private.questions(id,shape,topic,prompt,hint) values
  ('P1','pyramid','properties','Bongkah apakah ini? Tapak persegi dengan 4 muka segi tiga.','Muka sisi akan bertemu pada puncak apabila dilipat.'),
  ('P2','pyramid','formula','V=a^2*t/3; t=tinggi a=sisi tapak persegi Bongkah apakah ini?','a^2 ialah luas tapak. Fikir bentuk muka sisi bongkah.'),
  ('P3','pyramid','net','Pilih bentangan bagi 1 segi empat sama dan 4 segi tiga.','Lipat sisinya di sisi petak hingga bertemu di 1 puncak.'),
  ('S1','cylinder','properties','Tin minuman ada dua tapak bulatan sama. Bongkah apakah ini?','2 tapak bulat sama saiz disambung oleh sisi melengkung'),
  ('S2','cylinder','formula','V=pi*j^2*t L=2*pi*j*(j+t) Bongkah apakah ini?','j=jejari dan t=tinggi. Tapak atas dan bawah sama saiz.'),
  ('S3','cylinder','net','Pilih bentangan: 2 bulatan sama saiz, 1 segi empat tepat.','Lengkungkan segi empat itu; dua bulatan jadi tapak.'),
  ('K1','cube','properties','Enam muka berbentuk segi empat sama. Bongkah apakah ini?','12 rusuk sama panjang. Setiap muka sama bentuk dan saiz'),
  ('K2','cube','formula','V=a^3; L=6*a^2 a=panjang rusuk Bongkah apakah ini?','Panjang, lebar serta tinggi sama bagi bongkah ini.'),
  ('K3','cube','net','Pilih bentangan: 6 segi empat sama, semuanya sama saiz.','Bayangkan muka dilipat jadi kotak tanpa muka bertindih'),
  ('C1','cone','formula','V=pi*j^2*t/3 j=jejari; t=tinggi. Bongkah apakah ini?','Lihat tapaknya yang bulat. Sisinya mengecil ke puncak.'),
  ('C2','cone','formula','L=pi*j*(j+s) j=jejari; s=tinggi sendeng. Bentuk apa?','Tinggi sendeng diukur ikut sisi dari tapak ke puncak'),
  ('C3','cone','net','Pilih bentangan yang ada 1 sektor bulatan dan 1 bulatan.','Rapatkan sisi lurus pada sektor. Bulatan jadi tapak.'),
  ('B1','cuboid','properties','Kotak ini mempunyai 3 ukuran berbeza. Bongkah apakah ini?','Lihat panjang, lebar serta tinggi. Muka berhadapan sama'),
  ('B2','cuboid','formula','V=p*l*t; p,l,t ialah 3 ukuran berbeza. Bongkah apakah ini?','p=panjang, l=lebar, t=tinggi. Lihat kotak kasut.'),
  ('B3','cuboid','net','Kotak: 6cm x 4cm dengan tinggi 3cm. Pilih bentangannya.','Padankan muka yang sama saiz, lalu lipat menjadi kotak.')
on conflict(id) do update set shape=excluded.shape,topic=excluded.topic,prompt=excluded.prompt,hint=excluded.hint;

commit;
