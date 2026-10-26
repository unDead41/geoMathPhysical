-- Run after schema.sql as the database owner. This is a real PostgreSQL/RLS
-- integration suite: temporary Auth users, actual RPCs, actual role switching.
-- Every fixture and mutation is rolled back, including rate-limit counters.
begin;
set local plpgsql.check_asserts=on;
do $verification$
declare
  teacher1 uuid:=gen_random_uuid(); teacher2 uuid:=gen_random_uuid();
  student1 uuid:=gen_random_uuid(); student2 uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid();
  token text:=replace(gen_random_uuid()::text,'-','');
  cid uuid; rid uuid; aid uuid; second_aid uuid; invitation uuid;
  class_pin text; old_pin text; room_pin text; shape text; wrong_shape text;
  reply jsonb; state_json jsonb; first_questions jsonb; payload jsonb;
  wrong_event uuid:=gen_random_uuid(); advance_event uuid:=gen_random_uuid(); hint_event uuid:=gen_random_uuid();
  n integer; before_elapsed bigint; before_answers integer; temp_id uuid;
begin
  insert into auth.users(id,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    select fixture.user_id,fixture.user_id::text||'@accounts.geodecoder.invalid','',clock_timestamp(),
      '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,clock_timestamp(),clock_timestamp()
      from unnest(array[teacher1,teacher2,student1,student2,stranger]) as fixture(user_id);
  perform set_config('role','service_role',true);
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  reply:=public.geo_provision(teacher1,'t1_'||left(token,12),'Guru Satu','teacher',teacher1::text||'@accounts.geodecoder.invalid',repeat('a',64));
  assert reply#>>'{profile,role}'='teacher','teacher provision failed';
  reply:=public.geo_provision(teacher2,'t2_'||left(token,12),'Guru Dua','teacher',teacher2::text||'@accounts.geodecoder.invalid',repeat('b',64));
  assert reply#>>'{profile,role}'='teacher','second teacher provision failed';
  reply:=public.geo_provision(student1,'s1_'||left(token,12),'Murid Satu','student',student1::text||'@accounts.geodecoder.invalid',repeat('c',64));
  assert reply#>>'{profile,role}'='student','student provision failed';
  reply:=public.geo_provision(student2,'s2_'||left(token,12),'Murid Dua','student',student2::text||'@accounts.geodecoder.invalid',repeat('d',64));
  assert reply#>>'{profile,role}'='student','second student provision failed';
  reply:=public.geo_provision(stranger,'sx_'||left(token,12),'Murid Luar','student',stranger::text||'@accounts.geodecoder.invalid',repeat('e',64));
  assert reply#>>'{profile,role}'='student','stranger provision failed';
  reply:=public.geo_provision(teacher1,'new_'||left(token,12),'Nama Baru','student',teacher1::text||'@accounts.geodecoder.invalid',repeat('f',64));
  assert reply#>>'{error,code}'='username_taken','provision must not replace role';
  reply:=public.geo_identity('S1_'||upper(left(token,12)));
  assert (reply->>'user_id')::uuid=student1 and reply->>'recovery_hash'=repeat('c',64),'private identity lookup failed';
  assert public.geo_identity('missing_'||left(token,10)) is null,'missing identity should be null';
  assert public.geo_rate_guard('verify:'||token,2,60),'rate request one';
  assert public.geo_rate_guard('verify:'||token,2,60),'rate request two';
  assert not public.geo_rate_guard('verify:'||token,2,60),'persistent limiter must stop request three';

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',teacher1,'role','authenticated')::text,true);
  reply:=public.geo_action('create_class','{"name":"Kelas Integrasi"}');
  assert not(reply ? 'error'),'create class failed';
  cid:=(reply->>'class_id')::uuid; class_pin:=reply#>>'{classes,0,pin}';
  assert class_pin ~ '^[0-9]{6}$' and reply#>>'{classes,0,pin_expires_at}' is not null,'six digit expiring class PIN';
  reply:=public.geo_action('create_room',jsonb_build_object('class_id',cid,'name','Bilik Integrasi'));
  assert not(reply ? 'error'),'create room failed';
  rid:=(reply->>'room_id')::uuid; room_pin:=reply#>>'{room,pin}';
  assert room_pin ~ '^[0-9]{6}$','six digit room PIN';
  reply:=public.geo_action('invite',jsonb_build_object('class_id',cid,'username','s2_'||left(token,12)));
  invitation:=(reply->>'invite_id')::uuid;
  assert invitation is not null,'username invitation failed';

  -- Teacher B cannot view, modify or rotate Teacher A's class or room.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',teacher2,'role','authenticated')::text,true);
  reply:=public.geo_action('snapshot');
  assert jsonb_array_length(reply->'classes')=0 and jsonb_array_length(reply->'rooms')=0,'teacher tenant snapshot isolation';
  reply:=public.geo_action('snapshot',jsonb_build_object('room_id',rid));
  assert reply#>>'{error,code}'='forbidden','foreign room snapshot leaked';
  reply:=public.geo_action('create_room',jsonb_build_object('class_id',cid,'name','Bilik Terlarang'));
  assert reply#>>'{error,code}'='forbidden','foreign class mutation allowed';
  reply:=public.geo_action('rotate_pin',jsonb_build_object('kind','room','id',rid));
  assert reply#>>'{error,code}'='forbidden','foreign room PIN rotation allowed';
  select count(*) into n from public.room_progress progress where progress.room_id=rid;
  assert n=0,'foreign teacher can read leaderboard';

  -- User metadata is editable and must never grant the teacher role.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',student1,'role','authenticated',
    'user_metadata',jsonb_build_object('role','teacher'))::text,true);
  reply:=public.geo_action('create_class','{"name":"Spoofed Role"}');
  assert reply#>>'{error,code}'='forbidden','editable metadata escalated role';
  begin
    perform public.geo_identity('s1_'||left(token,12));
    raise exception 'authenticated caller reached service-only identity RPC';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from private.questions q;
    raise exception 'authenticated caller read answer bank directly';
  exception when insufficient_privilege then null; end;
  reply:=public.geo_action('join_pin',jsonb_build_object('pin',class_pin));
  assert not(reply ? 'error') and jsonb_array_length(reply->'classes')=1,'class PIN join failed';
  assert reply#>'{classes,0,pin}'='null'::jsonb,'student received class PIN';
  assert jsonb_array_length(reply#>'{classes,0,members}')=0,'student received private class roster';
  assert reply#>'{rooms,0,is_member}'='false'::jsonb,'unjoined room capability should be false';
  reply:=public.geo_action('snapshot',jsonb_build_object('room_id',rid));
  assert reply#>>'{error,code}'='forbidden','class membership must not expose unjoined room leaderboard';
  reply:=public.geo_action('join_room',jsonb_build_object('room_id',rid));
  assert not(reply ? 'error') and reply#>>'{room,players,0,status}'='waiting','class member room join failed';
  assert reply#>'{room,pin}'='null'::jsonb,'student received room PIN';
  assert reply#>'{rooms,0,is_member}'='true'::jsonb,'joined room capability should be true';
  reply:=public.geo_action('start_attempt',jsonb_build_object('room_id',rid));
  assert reply#>>'{error,code}'='room_not_playing','attempt started before teacher';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',student2,'role','authenticated')::text,true);
  reply:=public.geo_action('snapshot');
  assert (reply#>>'{invites,0,id}')::uuid=invitation,'student invitation missing';
  reply:=public.geo_action('accept_invite',jsonb_build_object('invite_id',invitation));
  assert jsonb_array_length(reply->'classes')=1,'accept invite failed';
  reply:=public.geo_action('join_pin',jsonb_build_object('pin',room_pin));
  assert (reply#>>'{room,id}')::uuid=rid and jsonb_array_length(reply#>'{room,players}')=2,'room PIN join failed';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',teacher1,'role','authenticated')::text,true);
  old_pin:=class_pin;
  reply:=public.geo_action('rotate_pin',jsonb_build_object('kind','class','id',cid));
  class_pin:=reply#>>'{classes,0,pin}';
  assert class_pin<>old_pin and class_pin ~ '^[0-9]{6}$','rotation must generate a different valid PIN';
  assert jsonb_array_length(reply#>'{classes,0,members}')=2,'teacher roster should contain only two enrolled students';
  reply:=public.geo_action('set_room',jsonb_build_object('room_id',rid,'status','playing'));
  assert reply#>>'{room,status}'='playing','teacher start failed';

  -- Expected errors are returned, not raised, so all failed guesses persist.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',stranger,'role','authenticated')::text,true);
  for n in 1..8 loop
    reply:=public.geo_action('join_pin',jsonb_build_object('pin',old_pin));
    assert reply#>>'{error,code}'='invalid_pin','rotated PIN accepted or unexpected limiter';
  end loop;
  reply:=public.geo_action('join_pin',jsonb_build_object('pin',class_pin));
  assert reply#>>'{error,code}'='rate_limited','failed PIN guesses not rate limited';
  reply:=public.geo_action('snapshot');
  assert jsonb_array_length(reply->'classes')=0,'failed PIN attempts enrolled stranger';
  select count(*) into n from public.room_progress progress where progress.room_id=rid;
  assert n=0,'unjoined student sees room progress';
  perform set_config('role','none',true);
  select bucket.hits into n from private.rate_buckets bucket where bucket.key='join:'||stranger::text;
  assert n=8,'failed PIN counter was rolled back';
  select count(*) into n from private.questions q;
  assert n=15,'question bank is not the canonical 15';
  select count(*) into n from (select q.shape from private.questions q group by q.shape having count(*)=3) five_shapes;
  assert n=5,'canonical bank must have three questions per shape';

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',student1,'role','authenticated')::text,true);
  reply:=public.geo_action('start_attempt',jsonb_build_object('room_id',rid));
  state_json:=reply->'state'; aid:=(state_json->>'attemptId')::uuid; first_questions:=state_json->'questions';
  assert jsonb_array_length(first_questions)=10 and state_json->>'status'='running','start state invalid';
  reply:=public.geo_action('start_attempt',jsonb_build_object('room_id',rid));
  assert (reply#>>'{state,attemptId}')::uuid=aid,'reload created a new attempt';
  perform set_config('role','none',true);
  select count(distinct q.id) into n from private.rooms r cross join unnest(r.question_ids) x(id)
    join private.questions q on q.id=x.id where r.id=rid;
  assert n=10,'room repeats a question';
  select count(*) into n from (select q.shape from private.rooms r cross join unnest(r.question_ids) x(id)
    join private.questions q on q.id=x.id where r.id=rid group by q.shape having count(*)=2) balanced;
  assert n=5,'room does not contain two questions per shape';
  select q.shape into shape from private.questions q where q.id=first_questions->>0;
  update private.attempts a set timer_started_at=clock_timestamp()-interval '10 seconds' where a.id=aid;
  perform set_config('role','authenticated',true);
  wrong_shape:=case when shape='cube' then 'cone' else 'cube' end;
  payload:=jsonb_build_object('attempt_id',aid,'kind','solid','shape',wrong_shape,'target','r1','index',0,'event_id',wrong_event,'score',999,'elapsed',0);
  reply:=public.geo_action('answer',payload);
  state_json:=reply->'state'; before_elapsed:=(state_json->>'elapsed')::bigint;
  assert reply#>>'{result,type}'='wrong' and state_json->>'status'='review','wrong answer did not end question';
  assert (state_json->>'score')::integer=0 and (state_json->>'mistakes')::integer=1,'wrong answer scoring';
  assert before_elapsed>=10000 and jsonb_array_length(state_json->'answers')=1,'server time or answer record missing';
  reply:=public.geo_action('answer',payload);
  assert reply#>>'{result,type}'='wrong' and (reply#>>'{state,mistakes}')::integer=1,'duplicate event counted twice';
  reply:=public.geo_action('answer',payload||jsonb_build_object('shape',shape));
  assert reply#>>'{error,code}'='event_conflict','event UUID reused with another request';
  reply:=public.geo_action('answer',jsonb_build_object('attempt_id',aid,'kind','solid','shape',shape,'target','r1','index',0,'event_id',gen_random_uuid()));
  assert reply#>>'{result,type}'='blocked' and (reply#>>'{state,score}')::integer=0,'wrong question allowed a retry';
  reply:=public.geo_action('advance',jsonb_build_object('attempt_id',aid,'index',0,'event_id',advance_event));
  assert reply#>>'{result,type}'='blocked' and (reply#>>'{state,readyInMs}')::integer>0,'review time gate bypassed';
  assert (reply#>>'{state,elapsed}')::bigint=before_elapsed,'review time counted as answering time';
  begin
    update public.room_progress progress set score=10,elapsed_ms=0 where progress.room_id=rid and progress.user_id=student1;
    raise exception 'student can tamper with leaderboard';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.room_progress(room_id,user_id,username,display_name) values(rid,stranger,'forged','Forged Player');
    raise exception 'student can forge leaderboard row';
  exception when insufficient_privilege then null; end;
  perform set_config('role','none',true);
  update private.attempts a set ready_at=clock_timestamp()-interval '1 millisecond' where a.id=aid;
  perform set_config('role','authenticated',true);
  reply:=public.geo_action('advance',jsonb_build_object('attempt_id',aid,'index',0,'event_id',advance_event));
  assert (reply#>>'{state,index}')::integer=1 and reply#>>'{state,status}'='running','review retry did not advance';

  -- Correct R1 only unlocks R2; an incorrect R2 still yields zero for the question.
  perform set_config('role','none',true);
  select q.shape into shape from private.questions q where q.id=first_questions->>1;
  perform set_config('role','authenticated',true);
  reply:=public.geo_action('answer',jsonb_build_object('attempt_id',aid,'kind','solid','shape',shape,'target','r2','index',1,'event_id',gen_random_uuid()));
  assert reply#>>'{result,type}'='stage' and reply#>>'{state,stage}'='solid','wrong reader was accepted';
  reply:=public.geo_action('answer',jsonb_build_object('attempt_id',aid,'kind','net','shape',shape,'target','r1','index',1,'event_id',gen_random_uuid()));
  assert reply#>>'{result,type}'='kind','wrong card kind accepted';
  reply:=public.geo_action('answer',jsonb_build_object('attempt_id',aid,'kind','solid','shape',shape,'target','r1','index',1,'event_id',gen_random_uuid()));
  assert reply#>>'{result,type}'='solid' and reply#>>'{state,stage}'='net' and (reply#>>'{state,score}')::integer=0,'R1 scored prematurely';
  wrong_shape:=case when shape='cube' then 'cone' else 'cube' end;
  reply:=public.geo_action('answer',jsonb_build_object('attempt_id',aid,'kind','net','shape',wrong_shape,'target','r2','index',1,'event_id',gen_random_uuid()));
  assert reply#>>'{result,type}'='wrong' and reply#>>'{state,answers,1,failedAt}'='net'
    and (reply#>>'{state,score}')::integer=0 and (reply#>>'{state,mistakes}')::integer=2,'incorrect R2 scoring';
  perform set_config('role','none',true);
  update private.attempts a set ready_at=clock_timestamp()-interval '1 millisecond' where a.id=aid;
  perform set_config('role','authenticated',true);
  reply:=public.geo_action('advance',jsonb_build_object('attempt_id',aid,'index',1,'event_id',gen_random_uuid()));

  -- The remaining eight questions: one skipped, seven correct, one counted hint.
  for n in 2..9 loop
    if n=2 then
      payload:=jsonb_build_object('attempt_id',aid,'index',n,'event_id',hint_event);
      reply:=public.geo_action('hint',payload);
      reply:=public.geo_action('hint',payload);
      assert (reply#>>'{state,hints}')::integer=1 and (reply#>>'{state,hintUsed}')::boolean,'hint duplicate counted twice';
    end if;
    if n=3 then
      reply:=public.geo_action('skip',jsonb_build_object('attempt_id',aid,'index',n,'event_id',gen_random_uuid()));
      assert reply#>>'{state,lastOutcome}'='skipped' and (reply#>>'{state,skipped}')::integer=1,'skip not recorded';
    else
      perform set_config('role','none',true);
      select q.shape into shape from private.questions q where q.id=first_questions->>n;
      perform set_config('role','authenticated',true);
      reply:=public.geo_action('answer',jsonb_build_object('attempt_id',aid,'kind','solid','shape',shape,'target','r1','index',n,'event_id',gen_random_uuid()));
      assert reply#>>'{result,type}'='solid','correct R1 rejected';
      reply:=public.geo_action('answer',jsonb_build_object('attempt_id',aid,'kind','net','shape',shape,'target','r2','index',n,'event_id',gen_random_uuid()));
      assert reply#>>'{result,type}'='correct' and reply#>>'{state,status}'='feedback','correct R2 did not score';
      if n=2 then
        assert (reply#>>'{state,score}')::integer=1 and (reply#>>'{state,readyInMs}')::integer>0
          and (reply#>>'{state,readyInMs}')::integer<=900,'correct score or feedback interval';
      end if;
    end if;
    before_elapsed:=(reply#>>'{state,elapsed}')::bigint;
    perform set_config('role','none',true);
    update private.attempts a set ready_at=clock_timestamp()-interval '1 millisecond' where a.id=aid;
    perform set_config('role','authenticated',true);
    reply:=public.geo_action('advance',jsonb_build_object('attempt_id',aid,'index',n,'event_id',gen_random_uuid()));
    if n=9 then assert (reply#>>'{state,elapsed}')::bigint=before_elapsed,'feedback counted towards final time'; end if;
  end loop;
  assert reply#>>'{state,status}'='finished' and (reply#>>'{state,score}')::integer=7
    and jsonb_array_length(reply#>'{state,answers}')=10,'completed attempt total is wrong';
  reply:=public.geo_action('start_attempt',jsonb_build_object('room_id',rid));
  assert reply#>>'{state,status}'='finished' and (reply#>>'{state,attemptId}')::uuid=aid,'completed attempt restarted';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',student2,'role','authenticated')::text,true);
  reply:=public.geo_action('start_attempt',jsonb_build_object('room_id',rid));
  second_aid:=(reply#>>'{state,attemptId}')::uuid;
  assert reply#>'{state,questions}'=first_questions,'students received different room question order';
  reply:=public.geo_action('answer',jsonb_build_object('attempt_id',aid,'kind','solid','shape','cube','target','r1','index',9,'event_id',gen_random_uuid()));
  assert reply#>>'{error,code}'='forbidden','student accessed another attempt';
  reply:=public.geo_action('heartbeat',jsonb_build_object('room_id',rid));
  assert jsonb_array_length(reply#>'{room,players}')=2,'member leaderboard read failed';
  select count(*) into n from public.room_progress progress where progress.room_id=rid;
  assert n=2,'member RLS leaderboard failed';

  -- Closing an unfinished attempt preserves its honest partial result.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',teacher1,'role','authenticated')::text,true);
  reply:=public.geo_action('set_room',jsonb_build_object('room_id',rid,'status','closed'));
  assert reply#>>'{room,status}'='closed','teacher close failed';
  reply:=public.geo_action('set_room',jsonb_build_object('room_id',rid,'status','playing'));
  assert reply#>>'{error,code}'='invalid_status','closed room reopened';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',student2,'role','authenticated')::text,true);
  reply:=public.geo_action('snapshot',jsonb_build_object('room_id',rid));
  assert reply#>>'{room,my_attempt,status}'='closed' and jsonb_array_length(reply#>'{room,my_attempt,answers}')=0,'close invented completed answers';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',student1,'role','authenticated')::text,true);
  reply:=public.geo_action('snapshot',jsonb_build_object('room_id',rid));
  assert reply#>>'{room,my_attempt,status}'='finished' and (reply#>>'{room,my_attempt,score}')::integer=7,'close changed completed result';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',teacher2,'role','authenticated')::text,true);
  select count(*) into n from public.room_progress progress where progress.room_id=rid;
  assert n=0,'cross-teacher RLS isolation failed after data exists';

  perform set_config('role','anon',true);
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  begin
    perform public.geo_action('snapshot');
    raise exception 'anonymous caller reached geo_action';
  exception when insufficient_privilege then null; end;
  perform set_config('role','none',true);
  assert not has_table_privilege('authenticated','public.room_progress','UPDATE'),'authenticated UPDATE privilege present';
  assert not has_function_privilege('authenticated','public.geo_identity(text)','EXECUTE'),'identity function exposed';
  assert exists(select 1 from pg_catalog.pg_class c where c.oid='public.room_progress'::regclass and c.relrowsecurity),'room_progress RLS missing';
  raise notice 'GeoDecoder verification passed: provisioning, isolation, PINs, invites, RLS, single attempts, authoritative scoring/time, idempotence, completion and room closure.';
end
$verification$;
rollback;
