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
    'auth_email',i.auth_email,'recovery_hash',i.recovery_hash)
    into found_identity from private.profiles p join private.identities i on i.user_id=p.id
    where p.username=lower(btrim(p_username));
  return found_identity;
end $$;

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
    'profile',jsonb_build_object('id',p.id,'username',p.username,'display_name',p.display_name,'role',p.role,'last_seen',p.last_seen),
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


