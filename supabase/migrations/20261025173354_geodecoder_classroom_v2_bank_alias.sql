-- GeoDecoder V2: qualify question-bank columns against PL/pgSQL variables.
-- CREATE OR REPLACE preserves the existing RPC grants and ownership.
begin;

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

commit;

