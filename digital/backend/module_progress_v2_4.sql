-- GeoDecoder Digital v2.4: self-reported formative module progress.
-- Apply after schema.sql on deployment. This branch does not apply it live.
begin;
create table if not exists private.module_progress (
  user_id uuid not null references private.profiles(id) on delete cascade,
  activity text not null check(activity in ('net','volume','area','composite')),
  stage text not null check(stage in ('prediction','experiment','check','explanation')),
  prediction text not null check(char_length(prediction) between 1 and 240),
  result text not null default '' check(char_length(result)<=600),
  explanation text not null default '' check(char_length(explanation)<=600),
  completed boolean not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  primary key(user_id,activity),
  check(stage='prediction' or char_length(result)>0),
  check(stage<>'explanation' or char_length(explanation)>0),
  check(not completed or (stage='explanation' and completed_at is not null))
);
alter table private.module_progress enable row level security;
revoke all on private.module_progress from public,anon,authenticated,service_role;
comment on table private.module_progress is 'Student self-report for practice. Never assessment marks, TP or verified mastery.';

create or replace function private.module_records(p_user_id uuid)
returns jsonb language sql stable security invoker set search_path=''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('activity',m.activity,'stage',m.stage,
    'prediction',m.prediction,'result',m.result,'explanation',m.explanation,
    'completed',m.completed,'updated_at',m.updated_at,'completed_at',m.completed_at)
    order by m.activity),'[]'::jsonb) from private.module_progress m where m.user_id=p_user_id;
$$;

create or replace function private.geo_module_progress(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
  uid uuid:=(select auth.uid()); role_name text; cid uuid; activity_name text;
  stage_name text; predicted text; observed text; explained text; finished boolean;
  levels text[]:=array['prediction','experiment','check','explanation'];
  recorded_at timestamptz:=clock_timestamp(); answer jsonb;
begin
  if uid is null then return private.error('unauthenticated','Sila log masuk.'); end if;
  select p.role into role_name from private.profiles p where p.id=uid;
  if role_name is null then return private.error('profile_missing','Profil akaun belum tersedia.'); end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8192 then
    return private.error('invalid_payload','Rekod latihan tidak sah.');
  end if;
  if p_action='mine' then
    if p_payload<>'{}'::jsonb then return private.error('invalid_payload','Permintaan tidak sah.'); end if;
    return jsonb_build_object('records',private.module_records(uid),'server_now',recorded_at);
  elsif p_action='class' then
    if role_name<>'teacher' then return private.error('forbidden','Hanya guru boleh melihat kemajuan kelas.'); end if;
    if exists(select 1 from jsonb_object_keys(p_payload) k where k<>'class_id') then
      return private.error('invalid_payload','Permintaan kelas tidak sah.');
    end if;
    cid:=(p_payload->>'class_id')::uuid;
    if not exists(select 1 from private.classes c where c.id=cid and c.teacher_id=uid) then
      return private.error('forbidden','Kelas ini tidak boleh diakses.');
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('user_id',p.id,'display_name',p.display_name,
      'username',p.username,'records',private.module_records(p.id)) order by p.display_name,p.id),'[]'::jsonb)
      into answer from private.class_members cm join private.profiles p on p.id=cm.user_id
      where cm.class_id=cid and p.role='student';
    return jsonb_build_object('class_id',cid,'students',answer,'server_now',recorded_at);
  elsif p_action='save' then
    if role_name<>'student' then return private.error('forbidden','Rekod awan ini untuk latihan pelajar.'); end if;
    if exists(select 1 from jsonb_object_keys(p_payload) k where k not in
      ('activity','stage','prediction','result','explanation','completed')) then
      return private.error('invalid_payload','Medan rekod latihan tidak sah.');
    end if;
    if jsonb_typeof(p_payload->'activity') is distinct from 'string'
      or jsonb_typeof(p_payload->'stage') is distinct from 'string'
      or jsonb_typeof(p_payload->'prediction') is distinct from 'string'
      or jsonb_typeof(p_payload->'completed') is distinct from 'boolean'
      or (p_payload?'result' and jsonb_typeof(p_payload->'result') is distinct from 'string')
      or (p_payload?'explanation' and jsonb_typeof(p_payload->'explanation') is distinct from 'string') then
      return private.error('invalid_payload','Jenis rekod latihan tidak sah.');
    end if;
    activity_name:=p_payload->>'activity'; stage_name:=p_payload->>'stage';
    predicted:=btrim(p_payload->>'prediction'); observed:=btrim(coalesce(p_payload->>'result',''));
    explained:=btrim(coalesce(p_payload->>'explanation','')); finished:=(p_payload->>'completed')::boolean;
    if activity_name not in ('net','volume','area','composite') or not (stage_name=any(levels))
      or char_length(predicted) not between 1 and 240 or char_length(observed)>600 or char_length(explained)>600
      or (stage_name<>'prediction' and observed='') or (stage_name='explanation' and explained='')
      or (finished and stage_name<>'explanation') then
      return private.error('invalid_progress','Lengkapkan ramalan, eksperimen, semakan dan penerangan latihan.');
    end if;
    -- Identity is always auth.uid(); a browser can never nominate a different user.
    -- Atomic monotonic upsert prevents retries/out-of-order tabs erasing achievements.
    insert into private.module_progress as previous(user_id,activity,stage,prediction,result,explanation,completed,updated_at,completed_at)
      values(uid,activity_name,stage_name,predicted,observed,explained,finished,recorded_at,
        case when finished then recorded_at end)
      on conflict(user_id,activity) do update set stage=excluded.stage,prediction=excluded.prediction,
        result=excluded.result,explanation=excluded.explanation,completed=excluded.completed,
        updated_at=excluded.updated_at,completed_at=coalesce(previous.completed_at,excluded.completed_at)
      where (not previous.completed or excluded.completed)
        and array_position(levels,excluded.stage)>=array_position(levels,previous.stage)
        and (previous.stage,previous.prediction,previous.result,previous.explanation,previous.completed)
          is distinct from (excluded.stage,excluded.prediction,excluded.result,excluded.explanation,excluded.completed);
    return jsonb_build_object('records',private.module_records(uid),'server_now',recorded_at);
  end if;
  return private.error('unknown_action','Tindakan latihan tidak sah.');
exception when invalid_text_representation then
  return private.error('invalid_payload','Permintaan tidak sah.');
end $$;

create or replace function public.geo_module_progress(action text,payload jsonb default '{}'::jsonb)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.geo_module_progress(action,payload); $$;
revoke all on function private.module_records(uuid),private.geo_module_progress(text,jsonb),
  public.geo_module_progress(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.geo_module_progress(text,jsonb),public.geo_module_progress(text,jsonb) to authenticated;
commit;
