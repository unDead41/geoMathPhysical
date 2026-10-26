begin;
-- profile_v2_3.sql
-- Apply after the classroom schema and email_v2_2.sql. Transactional and rerunnable.
-- Independent of module_progress_v2_4.sql: either migration order preserves both APIs.
-- The filename records the v2.3 base; the integrated frontend release is v2.6.

alter table private.profiles add column if not exists avatar text not null default 'initial' check (avatar in ('initial','cube','cuboid','pyramid','cylinder','cone'));
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


-- module_progress_v2_4.sql
-- GeoDecoder Digital v2.4: self-reported formative module progress.
-- Apply after schema.sql on deployment. This branch does not apply it live.

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

notify pgrst, 'reload schema';
commit;

