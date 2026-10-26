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

