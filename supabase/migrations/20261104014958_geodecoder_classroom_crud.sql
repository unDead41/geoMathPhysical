-- GeoMath classroom management. Additive; apply AFTER the hosted v2.7 history.
-- Source-only candidate. No production deployment is implied by this file.
begin;
alter table private.classes add column if not exists revision bigint not null default 0 check(revision>=0);
alter table private.classes add column if not exists archived_at timestamptz;
alter table private.rooms add column if not exists revision bigint not null default 0 check(revision>=0);
alter table private.rooms add column if not exists archived_at timestamptz;

create or replace function private.can_view_room(p_room_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select (select auth.uid()) is not null and (
  exists(select 1 from private.rooms r where r.id=p_room_id and r.teacher_id=(select auth.uid()))
  or exists(select 1 from private.room_members rm join private.rooms r on r.id=rm.room_id
    join private.class_members cm on cm.class_id=r.class_id and cm.user_id=rm.user_id
    where rm.room_id=p_room_id and rm.user_id=(select auth.uid()))
 );
$$;
revoke all on function private.can_view_room(uuid) from public,anon,authenticated,service_role;
grant execute on function private.can_view_room(uuid) to authenticated;

create or replace function private.snapshot(p_user_id uuid,p_room_id uuid default null)
returns jsonb language plpgsql stable security invoker set search_path=''
as $$
declare s jsonb; room_json jsonb;
begin
  select jsonb_build_object(
    'classroom_crud',1,
    'profile',jsonb_build_object('id',p.id,'username',p.username,'display_name',p.display_name,'role',p.role,'last_seen',p.last_seen,'avatar',p.avatar,
      'email',(select u.email from auth.users u where u.id=p_user_id),
      'email_verified',(select u.email_confirmed_at is not null from auth.users u where u.id=p_user_id)),
    'classes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'teacher_id',c.teacher_id,'revision',c.revision,'archived_at',c.archived_at,
      'pending_invites',case when c.teacher_id=p_user_id then coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'username',ip.username,'display_name',ip.display_name) order by i.created_at) from private.invites i join private.profiles ip on ip.id=i.student_id where i.class_id=c.id and i.status='pending'),'[]'::jsonb) else '[]'::jsonb end,
      'teacher_name',(select teacher.display_name from private.profiles teacher where teacher.id=c.teacher_id),
      'pin',case when c.teacher_id=p_user_id then pin.pin end,
      'pin_expires_at',case when c.teacher_id=p_user_id then pin.expires_at end,
      'members',case when c.teacher_id=p_user_id then coalesce((select jsonb_agg(jsonb_build_object(
        'id',mp.id,'username',mp.username,'display_name',mp.display_name,'last_seen',mp.last_seen) order by mp.display_name)
        from private.class_members cm join private.profiles mp on mp.id=cm.user_id where cm.class_id=c.id),'[]'::jsonb) else '[]'::jsonb end)
      order by c.created_at desc) from private.classes c left join private.join_codes pin on pin.class_id=c.id and pin.expires_at>clock_timestamp()
      where c.teacher_id=p_user_id or exists(select 1 from private.class_members m where m.class_id=c.id and m.user_id=p_user_id)),'[]'::jsonb),
    'invites',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'class_id',i.class_id,'class_name',c.name,'teacher_name',t.display_name)
      order by i.created_at desc) from private.invites i join private.classes c on c.id=i.class_id
      join private.profiles t on t.id=c.teacher_id where i.student_id=p_user_id and i.status='pending' and c.archived_at is null),'[]'::jsonb),
    'rooms',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'class_id',r.class_id,'class_name',c.name,
      'name',r.name,'teacher_id',r.teacher_id,'status',r.status,'revision',r.revision,'archived_at',r.archived_at,'class_archived_at',c.archived_at,
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
    select jsonb_build_object('id',r.id,'class_id',r.class_id,'name',r.name,'class_name',c.name,'status',r.status,'revision',r.revision,'archived_at',r.archived_at,'class_archived_at',c.archived_at,
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


-- This gateway serializes management with the existing game dispatcher without
-- copying its scoring, retry, timing, signup or profile implementation.
create or replace function private.geo_classroom_action(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
  uid uuid:=(select auth.uid()); me private.profiles%rowtype;
  cid uuid; rid uuid; iid uuid; sid uuid; owner_id uuid;
  c private.classes%rowtype; r private.rooms%rowtype; inv private.invites%rowtype;
  manage boolean:=p_action in ('rename_class','archive_class','restore_class','delete_class','remove_member',
    'rename_room','archive_room','restore_room','delete_room','cancel_invite','decline_invite');
  room_action boolean:=p_action in ('rename_room','archive_room','restore_room','delete_room');
  keys text[]; expected bigint; current_revision bigint; new_name text; result jsonb;
begin
  if uid is null then return private.error('unauthenticated','Sila log masuk.'); end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8192 then
    return private.error('invalid_payload','Permintaan tidak sah.');
  end if;
  -- Keep the established user → class → room → attempt lock order.
  select * into me from private.profiles where id=uid for update;
  if not found then return private.error('profile_missing','Profil akaun belum tersedia.'); end if;

  if manage then
    keys:=case when room_action then array['room_id','expected_revision']
      when p_action in ('cancel_invite','decline_invite') then array['invite_id']
      else array['class_id','expected_revision'] end;
    if p_action in ('rename_class','rename_room') then keys:=keys||'name'::text; end if;
    if p_action='remove_member' then keys:=keys||'user_id'::text; end if;
    if exists(select 1 from jsonb_object_keys(p_payload) k where not k=any(keys))
      or exists(select 1 from unnest(keys) k where not p_payload ? k) then
      return private.error('invalid_payload','Permintaan tidak sah.');
    end if;
    if p_action in ('cancel_invite','decline_invite') then
      iid:=(p_payload->>'invite_id')::uuid;
      select * into inv from private.invites where id=iid;
      if not found then return private.error('forbidden','Jemputan ini tidak boleh diakses.'); end if;
      cid:=inv.class_id;
    elsif room_action then
      rid:=(p_payload->>'room_id')::uuid;
      select class_id into cid from private.rooms where id=rid;
    else cid:=(p_payload->>'class_id')::uuid;
    end if;
    -- Ownership is checked before disclosing archive state, revision or members.
    if p_action='decline_invite' then
      if me.role<>'student' or inv.student_id<>uid then return private.error('forbidden','Jemputan ini tidak boleh diakses.'); end if;
    elsif me.role<>'teacher' or not exists(select 1 from private.classes where id=cid and teacher_id=uid) then
      return private.error('forbidden','Kelas ini tidak boleh diakses.');
    end if;
    select * into c from private.classes where id=cid for update;
    if not found then return private.error('forbidden','Kelas ini tidak boleh diakses.'); end if;
    if p_action in ('cancel_invite','decline_invite') then
      delete from private.invites where id=iid and status='pending';
      if not found then return private.error('conflict','Rekod telah berubah. Muat semula dan cuba lagi.'); end if;
      return private.snapshot(uid);
    end if;
    if room_action then
      select * into r from private.rooms where id=rid and class_id=cid for update;
      if not found then return private.error('forbidden','Bilik ini tidak boleh diakses.'); end if;
      current_revision:=r.revision;
    else current_revision:=c.revision;
    end if;
    if jsonb_typeof(p_payload->'expected_revision') is distinct from 'number'
      or (p_payload->>'expected_revision') !~ '^[0-9]+$' then
      return private.error('invalid_payload','Permintaan tidak sah.');
    end if;
    expected:=(p_payload->>'expected_revision')::bigint;
    if expected<>current_revision then return private.error('conflict','Rekod telah berubah. Muat semula dan cuba lagi.'); end if;

    if p_action in ('rename_class','rename_room') then
      new_name:=btrim(p_payload->>'name');
      if jsonb_typeof(p_payload->'name') is distinct from 'string' or new_name is null
        or char_length(new_name) not between 2 and 60 or new_name ~ '[[:cntrl:]]' then
        return private.error('invalid_name','Nama mestilah 2 hingga 60 aksara tanpa aksara kawalan.');
      end if;
      if room_action then update private.rooms set name=new_name,revision=revision+1 where id=rid;
      else update private.classes set name=new_name,revision=revision+1 where id=cid; end if;

    elsif p_action in ('archive_class','restore_class') then
      if p_action='archive_class' and exists(select 1 from private.rooms where class_id=cid and status='playing') then
        return private.error('room_playing','Tutup bilik yang sedang bermain dahulu.');
      end if;
      update private.classes set archived_at=case when p_action='archive_class' then clock_timestamp() else null end,
        revision=revision+1 where id=cid;
      if p_action='archive_class' then
        delete from private.join_codes where class_id=cid or room_id in(select id from private.rooms where class_id=cid);
      end if;

    elsif p_action in ('archive_room','restore_room') then
      if c.archived_at is not null then return private.error('archived','Pulihkan kelas atau bilik daripada arkib dahulu.'); end if;
      if p_action='archive_room' and r.status='playing' then return private.error('room_playing','Tutup bilik yang sedang bermain dahulu.'); end if;
      update private.rooms set archived_at=case when p_action='archive_room' then clock_timestamp() else null end,
        revision=revision+1 where id=rid;
      if p_action='archive_room' then delete from private.join_codes where room_id=rid; end if;

    elsif p_action='delete_class' then
      if exists(select 1 from private.rooms where class_id=cid)
        or exists(select 1 from private.class_members where class_id=cid)
        or exists(select 1 from private.invites where class_id=cid) then
        return private.error('not_empty','Rekod ini masih mempunyai ahli atau rekod berkaitan. Gunakan arkib.');
      end if;
      delete from private.classes where id=cid;
      return private.snapshot(uid)||jsonb_build_object('deleted_class_id',cid);

    elsif p_action='delete_room' then
      if exists(select 1 from private.room_members where room_id=rid)
        or exists(select 1 from private.attempts where room_id=rid)
        or exists(select 1 from public.room_progress where room_id=rid) then
        return private.error('not_empty','Rekod ini masih mempunyai ahli atau rekod berkaitan. Gunakan arkib.');
      end if;
      if r.status='playing' then return private.error('room_playing','Tutup bilik yang sedang bermain dahulu.'); end if;
      delete from private.rooms where id=rid;
      return private.snapshot(uid)||jsonb_build_object('deleted_room_id',rid,'class_id',cid);

    elsif p_action='remove_member' then
      if exists(select 1 from private.rooms where class_id=cid and status='playing') then
        return private.error('room_playing','Tutup bilik yang sedang bermain dahulu.');
      end if;
      sid:=(p_payload->>'user_id')::uuid;
      delete from private.class_members where class_id=cid and user_id=sid;
      if not found then return private.error('conflict','Rekod telah berubah. Muat semula dan cuba lagi.'); end if;
      delete from private.invites where class_id=cid and student_id=sid;
      -- Never delete room_members: that FK cascades into attempts and scores.
      update private.classes set revision=revision+1 where id=cid;
    end if;
    return private.snapshot(uid,case when room_action then rid else null end);
  end if;

  -- Guard every legacy enrollment, game and PIN mutation. Do not expose the old
  -- gateway directly, otherwise callers could bypass these lifecycle checks.
  if p_action in ('create_room','invite') then cid:=(p_payload->>'class_id')::uuid;
  elsif p_action='accept_invite' then
    select class_id into cid from private.invites where id=(p_payload->>'invite_id')::uuid and student_id=uid;
  elsif p_action='rotate_pin' then
    if p_payload->>'kind'='class' then cid:=(p_payload->>'id')::uuid;
    else rid:=(p_payload->>'id')::uuid; end if;
  elsif p_action='join_pin' then
    select class_id,room_id into cid,rid from private.join_codes where pin=p_payload->>'pin' and expires_at>clock_timestamp();
  elsif p_action in ('join_room','set_room','start_attempt') then rid:=(p_payload->>'room_id')::uuid;
  elsif p_action in ('answer','hint','skip','advance') then
    select room_id into rid from private.attempts where id=(p_payload->>'attempt_id')::uuid and user_id=uid;
  end if;
  if rid is not null then select class_id into cid from private.rooms where id=rid; end if;
  if cid is not null then
    select * into c from private.classes where id=cid for share;
    if rid is not null then select * into r from private.rooms where id=rid for share; end if;
    if p_action in ('start_attempt','answer','hint','skip','advance')
      and not exists(select 1 from private.class_members where class_id=cid and user_id=uid) then
      return private.error('forbidden','Sertai kelas ini dahulu.');
    end if;
    if p_action in ('create_room','invite','rotate_pin','set_room') and (me.role<>'teacher' or c.teacher_id<>uid) then
      return private.error('forbidden','Kelas ini tidak boleh diakses.');
    end if;
    if p_action='join_room' and (me.role<>'student' or not exists(select 1 from private.class_members where class_id=cid and user_id=uid)) then
      return private.error('forbidden','Sertai kelas ini dahulu.');
    end if;
    if c.archived_at is not null or r.archived_at is not null then
      return private.error('archived','Pulihkan kelas atau bilik daripada arkib dahulu.');
    end if;
  end if;
  if p_action='heartbeat' then
    rid:=(p_payload->>'room_id')::uuid;
    if rid is not null and not private.can_view_room(rid) then return private.error('forbidden','Bilik ini tidak boleh diakses.'); end if;
    update private.profiles set last_seen=clock_timestamp() where id=uid;
    update public.room_progress progress set last_seen=clock_timestamp()
      where progress.user_id=uid and (rid is null or progress.room_id=rid) and exists(select 1 from private.rooms room join private.class_members member
        on member.class_id=room.class_id and member.user_id=uid where room.id=progress.room_id);
    return private.snapshot(uid,rid);
  end if;
  if p_action='invite' then
    if me.role<>'teacher' or cid is null or c.teacher_id is distinct from uid then return private.error('forbidden','Kelas ini tidak boleh diakses.'); end if;
    select id into sid from private.profiles where username=lower(btrim(p_payload->>'username')) and role='student';
    if sid is null then return private.error('student_missing','Nama pengguna murid tidak dijumpai.'); end if;
    -- Each issuance has its own capability ID. A stale Cancel/Decline/Accept
    -- cannot consume a later invitation, including a resend while pending.
    insert into private.invites(class_id,student_id,invited_by) values(cid,sid,uid)
      on conflict(class_id,student_id) do update set id=gen_random_uuid(),status='pending',created_at=clock_timestamp()
      returning id into iid;
    return private.snapshot(uid)||jsonb_build_object('invite_id',iid);
  end if;
  return private.geo_action(p_action,p_payload);
exception when invalid_text_representation or numeric_value_out_of_range then
  return private.error('invalid_payload','ID atau nilai permintaan tidak sah.');
end $$;

create or replace function public.geo_action(action text,payload jsonb default '{}'::jsonb)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.geo_classroom_action(action,payload); $$;
revoke all on function private.geo_action(text,jsonb) from public,anon,authenticated,service_role;
revoke all on function private.geo_classroom_action(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.geo_classroom_action(text,jsonb) to authenticated;
revoke all on function public.geo_action(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.geo_action(text,jsonb) to authenticated;

commit;
