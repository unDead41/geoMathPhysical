-- Run as database owner after the profile and module-progress migrations.
-- All synthetic Auth/classroom/practice fixtures are rolled back. No emails are sent.
begin;
set local plpgsql.check_asserts=on;
do $verify_profile$
declare
  teacher uuid:=gen_random_uuid(); student uuid:=gen_random_uuid();
  other uuid:=gen_random_uuid(); classroom uuid:=gen_random_uuid(); room uuid:=gen_random_uuid();
  token text:=replace(gen_random_uuid()::text,'-',''); fixture record;
  reply jsonb; denied boolean; extra jsonb;
  progress jsonb:='{"activity":"net","stage":"explanation","prediction":"Enam muka","result":"Tiada pertindihan","explanation":"Sisi bertemu sekali.","completed":true}';
begin
  for fixture in select * from (values(teacher,'teacher','t'),(student,'student','s'),(other,'student','o')) as f(id,role_name,suffix) loop
    insert into auth.users(id,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
      values(fixture.id,'profile.verify.'||token||fixture.suffix||'@example.test','',clock_timestamp(),
        '{"provider":"email","providers":["email"]}',jsonb_build_object('geodecoder',jsonb_build_object(
          'username','pf_'||fixture.suffix||'_'||left(token,15),'display_name','Profile QA '||fixture.suffix,'role',fixture.role_name)),clock_timestamp(),clock_timestamp());
  end loop;
  insert into private.classes(id,teacher_id,name) values(classroom,teacher,'Profile QA');
  insert into private.class_members(class_id,user_id) values(classroom,student);
  insert into private.rooms(id,class_id,teacher_id,name,question_ids)
    values(room,classroom,teacher,'Profile room',array(select q.id from private.questions q order by q.id limit 10));
  insert into private.room_members(room_id,user_id) values(room,student);
  insert into public.room_progress(room_id,user_id,username,display_name,score,elapsed_ms)
    select room,p.id,p.username,p.display_name,7,12345 from private.profiles p where p.id=student;

  assert not has_function_privilege('anon','public.geo_action(text,jsonb)','execute');
  assert not has_table_privilege('authenticated','private.profiles','insert,update,delete');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',student,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  reply:=public.geo_module_progress('save',progress);
  assert (reply#>>'{records,0,completed}')::boolean;
  reply:=public.geo_action('update_profile','{"display_name":"  Nama Profil Baharu  ","avatar":"cone"}');
  assert reply#>>'{profile,id}'=student::text and reply#>>'{profile,display_name}'='Nama Profil Baharu';
  assert reply#>>'{profile,avatar}'='cone' and reply#>>'{profile,role}'='student';
  assert (reply#>>'{profile,email_verified}')::boolean;
  foreach extra in array array[
    jsonb_build_object('id',other),jsonb_build_object('user_id',other),'{"role":"teacher"}'::jsonb,
    '{"username":"forged"}'::jsonb,'{"email":"forged@example.test"}'::jsonb,'{"score":10}'::jsonb
  ] loop
    reply:=public.geo_action('update_profile','{"display_name":"Serangan","avatar":"cube"}'::jsonb||extra);
    assert reply#>>'{error,code}'='invalid_profile','profile accepted a forbidden field';
  end loop;
  reply:=public.geo_action('update_profile','{"display_name":"A","avatar":"cube"}');
  assert reply#>>'{error,code}'='invalid_name';
  reply:=public.geo_module_progress('mine','{}');
  assert (reply#>>'{records,0,completed}')::boolean,'profile update erased practice';
  execute 'reset role';
  assert exists(select 1 from public.room_progress p where p.user_id=student and p.display_name='Nama Profil Baharu' and p.score=7 and p.elapsed_ms=12345),'profile changed room metrics';
  assert exists(select 1 from private.profiles p where p.id=other and p.display_name='Profile QA o' and p.avatar='initial'),'profile changed another account';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',teacher,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  reply:=public.geo_module_progress('class',jsonb_build_object('class_id',classroom));
  assert reply#>>'{students,0,display_name}'='Nama Profil Baharu' and (reply#>>'{students,0,records,0,completed}')::boolean;
  execute 'reset role';
  denied:=false;
  begin
    execute 'set local role anon';
    perform public.geo_action('update_profile','{"display_name":"Anon","avatar":"cube"}');
  exception when insufficient_privilege then denied:=true;
  end;
  execute 'reset role';
  assert denied,'anonymous profile mutation was allowed';
end $verify_profile$;
select 'PASS: own-profile updates, immutable permissions, room-metric preservation and independent module records; fixtures rolled back' as verification;
rollback;
