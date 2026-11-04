-- Additive formative offline sync. Run after schema.sql; never changes live scores.
begin;
create table if not exists private.offline_receipts (
 user_id uuid not null references private.profiles(id) on delete cascade,
 event_id text not null check(event_id ~ '^[A-Za-z0-9:_.-]{1,160}$'),
 body jsonb not null,
 received_at timestamptz not null default clock_timestamp(),
 primary key(user_id,event_id)
);
create table if not exists private.self_study_attempts (
 user_id uuid not null references private.profiles(id) on delete cascade,
 attempt_id text not null,
 payload jsonb not null,
 received_at timestamptz not null default clock_timestamp(),
 primary key(user_id,attempt_id)
);
create index if not exists self_study_history_owner_time
 on private.self_study_attempts(user_id,received_at desc,attempt_id);
alter table private.offline_receipts enable row level security;
alter table private.self_study_attempts enable row level security;
revoke all on private.offline_receipts,private.self_study_attempts from public,anon,authenticated,service_role;
comment on table private.self_study_attempts is
 'Unverified self-reported solo practice only. Never Duel, classroom marks, TP or verified mastery.';

create or replace function private.offline_solo_valid(p jsonb)
returns boolean language plpgsql immutable security invoker set search_path=''
as $$
declare n integer; v numeric; k text;
begin
 if jsonb_typeof(p) is distinct from 'object'
  or not (p ?& array['attempt_id','mode','ruleset','total','score','mistakes','hints','skipped','elapsed_ms'])
  or exists(select 1 from jsonb_object_keys(p) key where key not in
   ('attempt_id','mode','ruleset','total','score','mistakes','hints','skipped','elapsed_ms'))
  or jsonb_typeof(p->'attempt_id') is distinct from 'string'
  or jsonb_typeof(p->'mode') is distinct from 'string'
  or (p->>'attempt_id') !~ '^[A-Za-z0-9:_.-]{1,160}$'
  or p->>'mode' not in ('quiz','practice','review')
  or p->>'ruleset' is distinct from 'single-attempt-v1' then return false; end if;
 foreach k in array array['total','score','mistakes','hints','skipped','elapsed_ms'] loop
  if jsonb_typeof(p->k) is distinct from 'number' then return false; end if;
  v:=(p->>k)::numeric;
  if v<>trunc(v) or v<0 or v>604800000 then return false; end if;
 end loop;
 n:=(p->>'total')::integer;
 if n not between 1 and 15 or (p->>'mode'='quiz' and n<>10)
  or (p->>'mode'='practice' and n<>15) then return false; end if;
 foreach k in array array['score','mistakes','hints','skipped'] loop
  if (p->>k)::integer>n then return false; end if;
 end loop;
 return (p->>'score')::integer+(p->>'mistakes')::integer+(p->>'skipped')::integer=n;
exception when others then return false;
end $$;

create or replace function private.geo_offline_sync(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
 uid uuid; sid uuid; role_name text; event jsonb; eid text; inserted text;
 old_body jsonb; outcome jsonb; accepted jsonb:='[]'::jsonb; rejected jsonb:='[]'::jsonb;
 history jsonb; event_kind text;
begin
 begin
  uid:=auth.uid();sid:=nullif(auth.jwt()->>'session_id','')::uuid;
 exception when invalid_text_representation then return private.error('session-expired','Log masuk semula.'); end;
 if uid is null or sid is null or not exists(select 1 from auth.sessions s
  where s.id=sid and s.user_id=uid and (s.not_after is null or s.not_after>clock_timestamp())) then
  return private.error('session-expired','Log masuk semula untuk menyelaraskan rekod.');
 end if;
 select p.role into role_name from private.profiles p where p.id=uid;
 if role_name is null then return private.error('forbidden','Profil akaun tidak tersedia.'); end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>131072 then
  return private.error('invalid_payload','Permintaan tidak sah.');
 end if;
 if p_action='history' then
  if p_payload<>'{}'::jsonb then return private.error('invalid_payload','Permintaan tidak sah.'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('payload',h.payload,'received_at',h.received_at,
    'source','offline-self-study','verified',false) order by h.received_at desc,h.attempt_id),'[]'::jsonb)
   into history from (select s.attempt_id,s.payload,s.received_at from private.self_study_attempts s
    where s.user_id=uid order by s.received_at desc,s.attempt_id limit 50) h;
  return jsonb_build_object('attempts',history,'records',private.module_records(uid),'server_now',clock_timestamp());
 end if;
 if p_action is distinct from 'push' or exists(select 1 from jsonb_object_keys(p_payload) k where k<>'events')
  or jsonb_typeof(p_payload->'events') is distinct from 'array' then
  return private.error('invalid_payload','Permintaan tidak sah.');
 end if;
 if jsonb_array_length(p_payload->'events') not between 1 and 20 then
  return private.error('invalid_payload','Hantar sehingga 20 rekod setiap kelompok.');
 end if;
 for event in select value from jsonb_array_elements(p_payload->'events') loop
  eid:=left(coalesce(event->>'id',''),160);
  begin
   if jsonb_typeof(event) is distinct from 'object' or octet_length(event::text)>8192
    or not (event ?& array['id','kind','content_version','payload'])
    or exists(select 1 from jsonb_object_keys(event) k where k not in ('id','kind','content_version','payload'))
    or jsonb_typeof(event->'id') is distinct from 'string'
    or jsonb_typeof(event->'kind') is distinct from 'string'
    or (event->>'id') !~ '^[A-Za-z0-9:_.-]{1,160}$'
    or event->'content_version' is distinct from '1'::jsonb
    or jsonb_typeof(event->'payload') is distinct from 'object'
    or event->>'kind' not in ('module','solo') then
    raise exception using message='invalid_event',errcode='22023';
   end if;
   event_kind:=event->>'kind';
   if event_kind='solo' and not private.offline_solo_valid(event->'payload') then
    raise exception using message='invalid_event',errcode='22023';
   end if;
   inserted:=null;
   insert into private.offline_receipts(user_id,event_id,body) values(uid,eid,event)
    on conflict(user_id,event_id) do nothing returning offline_receipts.event_id into inserted;
   if inserted is null then
    select r.body into old_body from private.offline_receipts r where r.user_id=uid and r.event_id=eid;
    if old_body is distinct from event then raise exception using message='id_conflict',errcode='22023'; end if;
   elsif event_kind='module' then
    outcome:=private.geo_module_progress('save',event->'payload');
    if outcome?'error' then raise exception using message='invalid_event',errcode='22023'; end if;
   else
    insert into private.self_study_attempts(user_id,attempt_id,payload)
     values(uid,event->'payload'->>'attempt_id',event->'payload') on conflict(user_id,attempt_id) do nothing;
    select s.payload into old_body from private.self_study_attempts s
     where s.user_id=uid and s.attempt_id=event->'payload'->>'attempt_id';
    if old_body is distinct from event->'payload' then raise exception using message='id_conflict',errcode='22023'; end if;
   end if;
   if not accepted @> jsonb_build_array(eid) then accepted:=accepted||jsonb_build_array(eid); end if;
  exception when invalid_parameter_value then
   rejected:=rejected||jsonb_build_array(jsonb_build_object('id',eid,
    'code',case when sqlerrm='id_conflict' then 'id_conflict' else 'invalid_event' end));
  end;
 end loop;
 return jsonb_build_object('accepted',accepted,'rejected',rejected,'records',private.module_records(uid),'server_now',clock_timestamp());
end $$;

create or replace function public.geo_offline_sync(action text,payload jsonb default '{}'::jsonb)
returns jsonb language sql volatile security invoker set search_path=''
as $$select private.geo_offline_sync(action,payload);$$;
revoke all on function private.offline_solo_valid(jsonb),private.geo_offline_sync(text,jsonb),public.geo_offline_sync(text,jsonb)
 from public,anon,authenticated,service_role;
grant usage on schema private to authenticated;
grant execute on function private.geo_offline_sync(text,jsonb),public.geo_offline_sync(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
