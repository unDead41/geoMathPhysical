-- GeoDecoder Duel v1. Only the new geodecoder_duel schema and uniquely named
-- public gateway are touched. Review/apply as one transaction before deploying
-- geodecoder-duel. No accounts, classroom schema or existing functions change.

create schema if not exists geodecoder_duel;
revoke all on schema geodecoder_duel from public, anon, authenticated;
grant usage on schema geodecoder_duel to service_role;
alter default privileges in schema geodecoder_duel revoke all on tables from public, anon, authenticated;
alter default privileges in schema geodecoder_duel revoke execute on functions from public, anon, authenticated;

create table geodecoder_duel.questions (
  id text primary key,
  shape text not null check (shape in ('cube','cuboid','pyramid','cylinder','cone')),
  topic text not null check (topic in ('properties','formula','net'))
);
-- Metadata only; prompts/translations remain in the offline question bank.
-- Verified against digital/dist/questions.mjs and core.questionTopic().
insert into geodecoder_duel.questions (id,shape,topic) values
 ('P1','pyramid','properties'),('P2','pyramid','formula'),('P3','pyramid','net'),
 ('S1','cylinder','properties'),('S2','cylinder','formula'),('S3','cylinder','net'),
 ('K1','cube','properties'),('K2','cube','formula'),('K3','cube','net'),
 ('C1','cone','formula'),('C2','cone','formula'),('C3','cone','net'),
 ('B1','cuboid','properties'),('B2','cuboid','formula'),('B3','cuboid','net');

create table geodecoder_duel.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9]{6}$'),
  status text not null default 'waiting' check (status in ('waiting','countdown','playing','complete','cancelled','expired')),
  created_at bigint not null,
  lobby_expires_at bigint not null,
  expires_at bigint not null,
  starts_at bigint,
  deadline_at bigint,
  question_ids text[] not null default '{}',
  winner_id uuid,
  reason text,
  check (cardinality(question_ids) in (0,10)),
  check (lobby_expires_at=created_at+600000 and expires_at=created_at+86400000),
  check ((starts_at is null and deadline_at is null) or deadline_at=starts_at+900000)
);
create index rooms_expiry_idx on geodecoder_duel.rooms (expires_at);

create table geodecoder_duel.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references geodecoder_duel.rooms(id) on delete cascade,
  slot smallint not null check (slot in (1,2)),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  name text not null check (char_length(name) between 2 and 60),
  ready boolean not null default false,
  last_seen_at bigint not null,
  answered smallint not null default 0 check (answered between 0 and 10),
  stage text not null default 'solid' check (stage in ('solid','net')),
  score smallint not null default 0 check (score between 0 and 10),
  mistakes smallint not null default 0 check (mistakes between 0 and 10),
  skipped smallint not null default 0 check (skipped between 0 and 10),
  hints smallint not null default 0 check (hints between 0 and 10),
  hint_used boolean not null default false,
  attempts jsonb not null default '{"solid":null,"net":null}',
  answers jsonb not null default '[]',
  seq integer not null default 0 check (seq>=0),
  last_payload jsonb,
  last_result jsonb,
  finished_at bigint,
  forfeited boolean not null default false,
  next_ready_at bigint,
  question_started_at bigint,
  unique (room_id,slot),
  check (score+mistakes+skipped=answered),
  check (jsonb_typeof(answers)='array' and jsonb_array_length(answers)=answered),
  check (jsonb_typeof(attempts)='object')
);

create table geodecoder_duel.rate_limits (
  bucket text not null,
  window_start bigint not null,
  hits integer not null check (hits>=1),
  expires_at bigint not null,
  primary key (bucket,window_start)
);
create index rate_limits_expiry_idx on geodecoder_duel.rate_limits (expires_at);

alter table geodecoder_duel.questions enable row level security;
alter table geodecoder_duel.questions force row level security;
alter table geodecoder_duel.rooms enable row level security;
alter table geodecoder_duel.rooms force row level security;
alter table geodecoder_duel.players enable row level security;
alter table geodecoder_duel.players force row level security;
alter table geodecoder_duel.rate_limits enable row level security;
alter table geodecoder_duel.rate_limits force row level security;
revoke all on all tables in schema geodecoder_duel from public, anon, authenticated;
grant select on geodecoder_duel.questions to service_role;
grant select,insert,update,delete on geodecoder_duel.rooms,geodecoder_duel.players,geodecoder_duel.rate_limits to service_role;

create function geodecoder_duel.clock_ms() returns bigint
language sql volatile security invoker set search_path = ''
as $$ select floor(extract(epoch from clock_timestamp())*1000)::bigint $$;

create function geodecoder_duel.take_rate(p_bucket text,p_limit integer,p_window bigint,p_now bigint) returns boolean
language plpgsql volatile security invoker set search_path = '' as $$
declare v_hits integer; v_start bigint := (p_now/p_window)*p_window;
begin
  insert into geodecoder_duel.rate_limits(bucket,window_start,hits,expires_at)
  values(p_bucket,v_start,1,v_start+p_window+600000)
  on conflict(bucket,window_start) do update set hits=least(geodecoder_duel.rate_limits.hits+1,1000000)
  returning hits into v_hits;
  return v_hits<=p_limit;
end $$;

create function geodecoder_duel.cleanup(p_now bigint) returns void
language plpgsql volatile security invoker set search_path = '' as $$
begin
  -- Each request has bounded cleanup work. SKIP LOCKED never waits for a game.
  delete from geodecoder_duel.rooms where id in
    (select id from geodecoder_duel.rooms where expires_at<=p_now order by expires_at limit 20 for update skip locked);
  delete from geodecoder_duel.rate_limits where (bucket,window_start) in
    (select bucket,window_start from geodecoder_duel.rate_limits where expires_at<=p_now order by expires_at limit 100 for update skip locked);
end $$;

create function geodecoder_duel.player_json(p geodecoder_duel.players,r geodecoder_duel.rooms,p_now bigint,p_private boolean) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  result := jsonb_build_object('id',p.id,'slot',p.slot,'name',p.name,'ready',p.ready,
    'answered',p.answered,'stage',p.stage,'score',p.score,'mistakes',p.mistakes,
    'skipped',p.skipped,'hints',p.hints,'finishedAt',p.finished_at,'forfeited',p.forfeited,
    'lastSeenAt',p.last_seen_at,'elapsed',greatest(0,
      least(coalesce(p.finished_at,p_now),coalesce(r.deadline_at,p_now))-coalesce(r.starts_at,p_now)));
  if p_private then
    result := result || jsonb_build_object('hintUsed',p.hint_used,'attempts',p.attempts,
      'answers',p.answers,'seq',p.seq,'nextReadyAt',p.next_ready_at);
  end if;
  return result;
end $$;

create function geodecoder_duel.snapshot(p_room uuid,p_player uuid,p_now bigint,p_result jsonb default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare r geodecoder_duel.rooms; p geodecoder_duel.players; o geodecoder_duel.players;
begin
  select * into strict r from geodecoder_duel.rooms where id=p_room;
  select * into strict p from geodecoder_duel.players where id=p_player and room_id=p_room;
  select * into o from geodecoder_duel.players where room_id=p_room and id<>p_player;
  return jsonb_build_object('ok',true,'serverNow',p_now,
    'room',jsonb_build_object('id',r.id,'code',r.code,'status',r.status,'startsAt',r.starts_at,
      'deadlineAt',r.deadline_at,'questionIds',to_jsonb(r.question_ids),'total',10,
      'winnerId',r.winner_id,'reason',r.reason),
    'me',geodecoder_duel.player_json(p,r,p_now,true),
    'opponent',case when o.id is null then null else geodecoder_duel.player_json(o,r,p_now,false) end,
    'actionResult',p_result);
end $$;

create function geodecoder_duel.finish_remaining(p_room uuid,p_finish bigint) returns void
language plpgsql volatile security invoker set search_path = '' as $$
declare r geodecoder_duel.rooms; p geodecoder_duel.players; q geodecoder_duel.questions; elapsed bigint;
begin
  select * into strict r from geodecoder_duel.rooms where id=p_room;
  for p in select * from geodecoder_duel.players where room_id=p_room order by slot for update loop
    while p.answered<10 loop
      select * into strict q from geodecoder_duel.questions where id=r.question_ids[p.answered+1];
      elapsed := greatest(0,p_finish-coalesce(p.question_started_at,r.starts_at,p_finish));
      p.answers := p.answers || jsonb_build_array(jsonb_build_object('id',q.id,'shape',q.shape,
        'topic',q.topic,'outcome','skipped','hint',p.hint_used,'failedAt',null,
        'attempts',p.attempts,'elapsed',elapsed,'firstTry',false));
      p.answered := p.answered+1; p.skipped := p.skipped+1;
      p.hint_used := false; p.attempts := '{"solid":null,"net":null}'; p.question_started_at:=p_finish;
    end loop;
    update geodecoder_duel.players set answered=p.answered,skipped=p.skipped,answers=p.answers,
      finished_at=coalesce(p.finished_at,p_finish),stage='solid',hint_used=false,
      attempts='{"solid":null,"net":null}',next_ready_at=null,question_started_at=p_finish where id=p.id;
  end loop;
end $$;

create function geodecoder_duel.tick(p_room uuid,p_now bigint) returns void
language plpgsql volatile security invoker set search_path = '' as $$
declare r geodecoder_duel.rooms; a geodecoder_duel.players; b geodecoder_duel.players;
  winner uuid; why text; timed_out boolean:=false;
begin
  -- Caller holds the room row lock; all room/player changes serialize here.
  select * into strict r from geodecoder_duel.rooms where id=p_room;
  if r.status='waiting' and p_now>=r.lobby_expires_at then
    update geodecoder_duel.rooms set status='expired',reason='lobby_expired' where id=p_room;
    return;
  end if;
  if r.status='countdown' and p_now>=r.starts_at then
    update geodecoder_duel.rooms set status='playing' where id=p_room; r.status:='playing';
  end if;
  if r.status not in ('countdown','playing') then return; end if;
  if p_now>=r.deadline_at then
    perform geodecoder_duel.finish_remaining(p_room,r.deadline_at); timed_out:=true;
  end if;
  select * into a from geodecoder_duel.players where room_id=p_room and slot=1;
  select * into b from geodecoder_duel.players where room_id=p_room and slot=2;
  if a.id is null or b.id is null or a.finished_at is null or b.finished_at is null then return; end if;
  if a.forfeited and b.forfeited then winner:=null; why:='tie';
  elsif a.forfeited then winner:=b.id; why:='forfeit';
  elsif b.forfeited then winner:=a.id; why:='forfeit';
  elsif a.score<>b.score then winner:=case when a.score>b.score then a.id else b.id end; why:='score';
  elsif a.finished_at<>b.finished_at then winner:=case when a.finished_at<b.finished_at then a.id else b.id end; why:='time';
  else winner:=null; why:='tie'; end if;
  if timed_out and why not in ('tie','forfeit') then why:='deadline'; end if;
  update geodecoder_duel.rooms set status='complete',winner_id=winner,reason=why where id=p_room;
end $$;

create function public.geodecoder_duel_gateway(payload jsonb) returns jsonb
language plpgsql volatile security invoker set search_path = '' set lock_timeout = '3s' as $$
declare
  action text; v_token_hash text; fingerprint text; v_alias text; v_code text; v_room_id uuid;
  r geodecoder_duel.rooms; p geodecoder_duel.players; q geodecoder_duel.questions;
  now_ms bigint; next_seq integer; question_index integer; canonical jsonb; result jsonb;
  selected_ids text[]; outcome text; failed_at text; delay_ms integer;
begin
  -- This RPC is service-role-only. Still validate its internal boundary so bad
  -- deployments cannot bypass gameplay or accidentally leak database errors.
  if jsonb_typeof(payload)<>'object' or payload is null then return '{"ok":false,"error":"invalid_request"}'; end if;
  action:=payload->>'action'; v_token_hash:=payload->>'tokenHash'; fingerprint:=payload->>'fingerprint';
  if action is null or action not in ('create','join','state','ready','leave','hint','skip','scan') then return '{"ok":false,"error":"invalid_request"}'; end if;
  if jsonb_typeof(payload->'tokenHash') is distinct from 'string' or v_token_hash!~'^[a-f0-9]{64}$' then return '{"ok":false,"error":"invalid_token"}'; end if;
  if jsonb_typeof(payload->'fingerprint') is distinct from 'string' or fingerprint!~'^[a-f0-9]{64}$' then return '{"ok":false,"error":"invalid_request"}'; end if;
  if action in ('create','join') then
    if jsonb_typeof(payload->'name') is distinct from 'string' or jsonb_typeof(payload->'code') is distinct from 'string' then return '{"ok":false,"error":"invalid_request"}'; end if;
    v_alias:=regexp_replace(btrim(payload->>'name'),'[[:space:]]+',' ','g'); v_code:=payload->>'code';
    if v_alias is null or char_length(v_alias) not between 2 and 60 or v_alias~'[[:cntrl:]]'
      or v_code is null or v_code!~'^[0-9]{6}$' then return '{"ok":false,"error":"invalid_request"}'; end if;
  else
    if coalesce(payload->>'roomId','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return '{"ok":false,"error":"invalid_request"}'; end if;
    v_room_id:=(payload->>'roomId')::uuid;
  end if;
  if action not in ('create','join','state') then
    if jsonb_typeof(payload->'seq') is distinct from 'number' or coalesce(payload->>'seq','')!~'^[0-9]{1,10}$'
      or (payload->>'seq')::numeric not between 1 and 2147483647 then return '{"ok":false,"error":"invalid_request"}'; end if;
    next_seq:=(payload->>'seq')::integer;
  end if;
  if action in ('hint','skip','scan') then
    if jsonb_typeof(payload->'questionIndex') is distinct from 'number' or coalesce(payload->>'questionIndex','')!~'^[0-9]$' then return '{"ok":false,"error":"invalid_request"}'; end if;
    question_index:=(payload->>'questionIndex')::integer;
  end if;
  if action='scan' and (coalesce(payload->>'kind','') not in ('solid','net')
    or coalesce(payload->>'target','') not in ('r1','r2') or coalesce(payload->>'shape','') not in ('cube','cuboid','pyramid','cylinder','cone')) then
    return '{"ok":false,"error":"invalid_request"}';
  end if;

  now_ms:=geodecoder_duel.clock_ms();
  perform geodecoder_duel.cleanup(now_ms);
  -- A global quota is independent of source-address headers and player tokens.
  -- Fingerprints below are best-effort buckets; rotating them cannot bypass this
  -- shared create/join ceiling. No raw address or token is stored.
  if action in ('create','join') then
    if not geodecoder_duel.take_rate('global:'||action,case when action='create' then 120 else 300 end,60000,now_ms) then
      return '{"ok":false,"error":"rate_limited"}';
    end if;
  end if;
  if not geodecoder_duel.take_rate('ip:'||fingerprint,1200,60000,now_ms)
    or not geodecoder_duel.take_rate('token:'||v_token_hash,120,60000,now_ms) then return '{"ok":false,"error":"rate_limited"}'; end if;
  if action in ('create','join') then
    if not geodecoder_duel.take_rate(action||':'||fingerprint,case when action='create' then 20 else 30 end,60000,now_ms)
      or not geodecoder_duel.take_rate(action||':long:'||fingerprint,case when action='create' then 60 else 120 end,600000,now_ms) then return '{"ok":false,"error":"rate_limited"}'; end if;
  end if;
  -- Same token cannot concurrently create or join different rooms. Then acquire
  -- the room lock before any player lock, consistently across every operation.
  perform pg_advisory_xact_lock(hashtextextended('geodecoder_duel:'||v_token_hash,0));
  select * into p from geodecoder_duel.players t where t.token_hash=v_token_hash;
  if action in ('create','join') and p.id is not null then
    select * into r from geodecoder_duel.rooms where id=p.room_id for update;
    if r.id is null then return '{"ok":false,"error":"room_expired"}'; end if;
    now_ms:=geodecoder_duel.clock_ms();
    if r.expires_at<=now_ms then
      delete from geodecoder_duel.rooms where id=r.id;
      return '{"ok":false,"error":"room_expired"}';
    end if;
    perform geodecoder_duel.tick(r.id,now_ms);
    if (action='create' and p.slot<>1) or (action='join' and r.code<>v_code) then return '{"ok":false,"error":"room_unavailable"}'; end if;
    update geodecoder_duel.players set last_seen_at=now_ms where id=p.id;
    return geodecoder_duel.snapshot(r.id,p.id,now_ms);
  end if;
  if action='create' then
    now_ms:=geodecoder_duel.clock_ms();
    insert into geodecoder_duel.rooms(code,created_at,lobby_expires_at,expires_at)
      values(v_code,now_ms,now_ms+600000,now_ms+86400000) on conflict(code) do nothing returning * into r;
    if r.id is null then return '{"ok":false,"error":"pin_collision"}'; end if;
    insert into geodecoder_duel.players(room_id,slot,token_hash,name,last_seen_at)
      values(r.id,1,v_token_hash,v_alias,now_ms) returning * into p;
    return geodecoder_duel.snapshot(r.id,p.id,now_ms);
  end if;
  if action='join' then
    select * into r from geodecoder_duel.rooms t where t.code=v_code for update;
    if r.id is null then return '{"ok":false,"error":"room_unavailable"}'; end if;
    now_ms:=geodecoder_duel.clock_ms();
    if r.expires_at<=now_ms then
      delete from geodecoder_duel.rooms where id=r.id;
      return '{"ok":false,"error":"room_expired"}';
    end if;
    perform geodecoder_duel.tick(r.id,now_ms);
    select * into r from geodecoder_duel.rooms where id=r.id;
    if r.status='expired' then return '{"ok":false,"error":"room_expired"}'; end if;
    if r.status<>'waiting' then return '{"ok":false,"error":"room_unavailable"}'; end if;
    if exists(select 1 from geodecoder_duel.players where room_id=r.id and slot=2) then return '{"ok":false,"error":"room_full"}'; end if;
    insert into geodecoder_duel.players(room_id,slot,token_hash,name,last_seen_at)
      values(r.id,2,v_token_hash,v_alias,now_ms) returning * into p;
    return geodecoder_duel.snapshot(r.id,p.id,now_ms);
  end if;
  if p.id is null then return '{"ok":false,"error":"invalid_token"}'; end if;
  if p.room_id<>v_room_id then return '{"ok":false,"error":"room_unavailable"}'; end if;
  select * into r from geodecoder_duel.rooms where id=v_room_id for update;
  if r.id is null then return '{"ok":false,"error":"room_expired"}'; end if;
  now_ms:=geodecoder_duel.clock_ms();
  if r.expires_at<=now_ms then
    delete from geodecoder_duel.rooms where id=r.id;
    return '{"ok":false,"error":"room_expired"}';
  end if;
  perform geodecoder_duel.tick(r.id,now_ms);
  update geodecoder_duel.players set last_seen_at=now_ms where id=p.id returning * into p;
  select * into r from geodecoder_duel.rooms where id=v_room_id;
  if action='state' then return geodecoder_duel.snapshot(r.id,p.id,now_ms); end if;
  canonical:=payload-array['tokenHash','fingerprint'];
  if next_seq=p.seq then
    if canonical=p.last_payload then return geodecoder_duel.snapshot(r.id,p.id,now_ms,p.last_result); end if;
    return '{"ok":false,"error":"sequence_conflict"}';
  end if;
  if next_seq<>p.seq+1 then return '{"ok":false,"error":"sequence_mismatch"}'; end if;
  if r.status='expired' then return '{"ok":false,"error":"room_expired"}'; end if;

  if action='leave' then
    result:='{"type":"left"}';
    if r.status='waiting' then
      update geodecoder_duel.players set forfeited=true where id=p.id;
      update geodecoder_duel.rooms set status='cancelled',reason='left' where id=r.id;
    elsif r.status in ('countdown','playing') and p.finished_at is null then
      update geodecoder_duel.players set forfeited=true where id=p.id;
      perform geodecoder_duel.finish_remaining(r.id,now_ms);
      perform geodecoder_duel.tick(r.id,now_ms);
    end if;
  elsif action='ready' then
    if r.status not in ('waiting','countdown') then return '{"ok":false,"error":"room_unavailable"}'; end if;
    update geodecoder_duel.players set ready=true where id=p.id;
    if r.status='waiting' and (select count(*) from geodecoder_duel.players where room_id=r.id and ready)=2 then
      select array_agg(id order by random()) into selected_ids from
        (select id,row_number() over(partition by shape order by random()) as rank from geodecoder_duel.questions) choices where rank<=2;
      update geodecoder_duel.rooms set status='countdown',starts_at=now_ms+3000,
        deadline_at=now_ms+903000,question_ids=selected_ids where id=r.id;
      update geodecoder_duel.players set next_ready_at=now_ms+3000,question_started_at=now_ms+3000 where room_id=r.id;
    end if;
    result:='{"type":"ready"}';
  else
    if r.status in ('waiting','countdown') then return '{"ok":false,"error":"not_started"}'; end if;
    if r.status<>'playing' then return '{"ok":false,"error":"room_unavailable"}'; end if;
    if question_index<>p.answered or p.answered>=10 then return '{"ok":false,"error":"question_mismatch"}'; end if;
    if now_ms<coalesce(p.next_ready_at,now_ms) then return '{"ok":false,"error":"not_ready"}'; end if;
    if action='hint' then
      update geodecoder_duel.players set hints=hints+case when hint_used then 0 else 1 end,hint_used=true where id=p.id;
      result:='{"type":"hint"}';
    else
      select * into strict q from geodecoder_duel.questions where id=r.question_ids[p.answered+1];
      if action='scan' then
        if payload->>'kind'<>p.stage or payload->>'target'<>(case when p.stage='solid' then 'r1' else 'r2' end) then return '{"ok":false,"error":"stage_mismatch"}'; end if;
        p.attempts:=jsonb_set(p.attempts,array[p.stage],payload->'shape');
        if payload->>'shape'<>q.shape then outcome:='wrong'; failed_at:=p.stage;
        elsif p.stage='solid' then
          update geodecoder_duel.players set attempts=p.attempts,stage='net' where id=p.id;
          result:='{"type":"solid"}';
        else outcome:='correct'; end if;
      else outcome:='skipped'; end if;
      if outcome is not null then
        delay_ms:=case when outcome='correct' then 900 else 1800 end;
        p.answers:=p.answers||jsonb_build_array(jsonb_build_object('id',q.id,'shape',q.shape,'topic',q.topic,
          'outcome',outcome,'hint',p.hint_used,'failedAt',failed_at,'attempts',p.attempts,
          'elapsed',greatest(0,now_ms-coalesce(p.question_started_at,r.starts_at)), 'firstTry',outcome='correct'));
        update geodecoder_duel.players set answered=p.answered+1,
          score=score+case when outcome='correct' then 1 else 0 end,
          mistakes=mistakes+case when outcome='wrong' then 1 else 0 end,
          skipped=skipped+case when outcome='skipped' then 1 else 0 end,
          stage='solid',hint_used=false,attempts='{"solid":null,"net":null}',answers=p.answers,
          next_ready_at=case when p.answered=9 then null else now_ms+delay_ms end,
          question_started_at=now_ms,finished_at=case when p.answered=9 then now_ms else null end where id=p.id;
        result:=jsonb_build_object('type',outcome,'target',case when failed_at='solid' then 'r1' when failed_at='net' then 'r2' else null end);
        perform geodecoder_duel.tick(r.id,now_ms);
      end if;
    end if;
  end if;
  update geodecoder_duel.players set seq=next_seq,last_payload=canonical,last_result=result where id=p.id;
  return geodecoder_duel.snapshot(r.id,p.id,now_ms,result);
exception when others then
  -- Unexpected failures roll this function's work back; callers never receive SQL
  -- text, constraint names or stored hashes. Expected errors above are RETURNS,
  -- preserving rate counters and any lazy expiration/deadline settlement.
  return '{"ok":false,"error":"server_error"}';
end $$;

revoke all on all functions in schema geodecoder_duel from public, anon, authenticated;
grant execute on all functions in schema geodecoder_duel to service_role;
revoke all on function public.geodecoder_duel_gateway(jsonb) from public, anon, authenticated;
grant execute on function public.geodecoder_duel_gateway(jsonb) to service_role;
comment on function public.geodecoder_duel_gateway(jsonb) is 'Service-role-only GeoDecoder Duel boundary; opaque token hashes are supplied only by geodecoder-duel Edge Function.';

