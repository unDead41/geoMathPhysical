-- Run with the module migration in the same transaction and no HTTP/Auth emails.
-- This script always rolls back all synthetic users/classes/progress and schema.
set local plpgsql.check_asserts=on;
do $verify_module$
declare
  teacher uuid:=gen_random_uuid(); other_teacher uuid:=gen_random_uuid();
  student uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid();
  owned_class uuid:=gen_random_uuid(); foreign_class uuid:=gen_random_uuid();
  token text:=replace(gen_random_uuid()::text,'-',''); fixture record; reply jsonb; invalid jsonb; denied boolean;
  payload jsonb:='{"activity":"net","stage":"explanation","prediction":"Enam muka","result":"Tiada pertindihan","explanation":"Setiap sisi ditutup sekali.","completed":true}';
begin
  for fixture in select * from (values(teacher,'teacher','t'),(other_teacher,'teacher','o'),
    (student,'student','s'),(outsider,'student','x')) as f(id,role_name,suffix) loop
    insert into auth.users(id,email,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
      values(fixture.id,'module.verify.'||token||fixture.suffix||'@example.com','',
        '{"provider":"email","providers":["email"]}',jsonb_build_object('geodecoder',jsonb_build_object(
        'username','mod_'||fixture.suffix||'_'||left(token,15),'display_name','Module QA '||fixture.suffix,'role',fixture.role_name)),clock_timestamp(),clock_timestamp());
  end loop;
  insert into private.classes(id,teacher_id,name) values(owned_class,teacher,'Module QA'),(foreign_class,other_teacher,'Foreign QA');
  insert into private.class_members(class_id,user_id) values(owned_class,student),(foreign_class,outsider);
  assert not has_table_privilege('authenticated','private.module_progress','select,insert,update,delete');
  assert not has_function_privilege('anon','public.geo_module_progress(text,jsonb)','execute');
  assert not has_function_privilege('authenticated','private.module_records(uuid)','execute');
  perform set_config('request.jwt.claims','{}',true);
  assert public.geo_module_progress('mine','{}')#>>'{error,code}'='unauthenticated';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',student,'role','authenticated')::text,true);
  reply:=public.geo_module_progress('save',payload);
  assert jsonb_array_length(reply->'records')=1 and (reply#>>'{records,0,completed}')::boolean;
  assert exists(select 1 from private.module_progress where user_id=student and completed_at is not null);
  reply:=public.geo_module_progress('save',payload||'{"stage":"prediction","result":"","explanation":"","completed":false}'::jsonb);
  assert (reply#>>'{records,0,completed}')::boolean and reply#>>'{records,0,stage}'='explanation','late save erased achievement';
  foreach invalid in array array[
    payload||jsonb_build_object('user_id',outsider),payload||'{"activity":"invalid"}',
    payload||'{"stage":"prediction"}',payload||'{"prediction":""}',payload||'{"result":""}',
    payload||'{"explanation":""}',payload||'{"completed":"true"}',payload||jsonb_build_object('explanation',repeat('x',601))
  ] loop
    assert public.geo_module_progress('save',invalid)?'error','malformed progress accepted';
  end loop;
  assert public.geo_module_progress('class',jsonb_build_object('class_id',owned_class))#>>'{error,code}'='forbidden';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated')::text,true);
  assert jsonb_array_length(public.geo_module_progress('mine','{}')->'records')=0,'student read another student';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',teacher,'role','authenticated')::text,true);
  reply:=public.geo_module_progress('class',jsonb_build_object('class_id',owned_class));
  assert jsonb_array_length(reply->'students')=1 and reply#>>'{students,0,user_id}'=student::text;
  assert (reply#>>'{students,0,records,0,completed}')::boolean;
  assert public.geo_module_progress('class',jsonb_build_object('class_id',foreign_class))#>>'{error,code}'='forbidden';
  assert public.geo_module_progress('save',payload)#>>'{error,code}'='forbidden';
  assert public.geo_module_progress('class','{"class_id":"bad"}')#>>'{error,code}'='invalid_payload';
  execute 'set local role authenticated';
  reply:=public.geo_module_progress('class',jsonb_build_object('class_id',owned_class));
  execute 'reset role';
  assert jsonb_array_length(reply->'students')=1,'real authenticated role cannot use RPC';
  denied:=false;
  begin
    execute 'set local role authenticated';
    perform 1 from private.module_progress;
  exception when insufficient_privilege then denied:=true;
  end;
  execute 'reset role';
  assert denied,'authenticated role has direct table access';
  denied:=false;
  begin
    execute 'set local role anon';
    perform public.geo_module_progress('mine','{}');
  exception when insufficient_privilege then denied:=true;
  end;
  execute 'reset role';
  assert denied,'anon role can execute RPC';
end $verify_module$;
select 'PASS: module progress validation, role grants, identity isolation, owned-class authorization and monotonic upsert; rolled back' as verification;
rollback;
