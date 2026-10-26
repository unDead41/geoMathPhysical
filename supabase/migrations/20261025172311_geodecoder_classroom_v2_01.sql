-- GeoDecoder V2. Run as the project database owner on an empty Supabase project.
-- Only public.room_progress and the four public RPCs are exposed to the client.

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


