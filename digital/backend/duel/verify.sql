-- Run after schema.sql. Every fixture/change is rolled back, including rate buckets.
-- Intended for a local isolated Postgres or a reviewed transactional live check.
begin;
do $verify$
declare
  a text := repeat('a',64); b text := repeat('b',64); c text := repeat('c',64);
  f text := repeat('d',64); pin text; rid uuid; aid uuid; bid uuid;
  x jsonb; y jsonb; z jsonb; q text; expected text; wrong text;
  seq_a integer := 0; seq_b integer := 0; i integer; clock bigint;
begin
  if has_function_privilege('anon','public.geodecoder_duel_gateway(jsonb)','execute')
     or has_function_privilege('authenticated','public.geodecoder_duel_gateway(jsonb)','execute')
     or not has_function_privilege('service_role','public.geodecoder_duel_gateway(jsonb)','execute') then
    raise exception 'Gateway execution privileges are not isolated';
  end if;
  if exists(select 1 from pg_tables where schemaname='geodecoder_duel' and not rowsecurity) then
    raise exception 'Every duel table must enable RLS';
  end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where (n.nspname='geodecoder_duel' or (n.nspname='public' and p.proname='geodecoder_duel_gateway')) and p.prosecdef) then
    raise exception 'Duel functions must be SECURITY INVOKER';
  end if;
  loop
    pin := (100000+floor(random()*900000)::integer)::text;
    exit when not exists(select 1 from geodecoder_duel.rooms r where r.code=pin);
  end loop;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','create','tokenHash',a,'fingerprint',f,'code',pin,'name','Host'));
  if not coalesce((x->>'ok')::boolean,false) then raise exception 'Create failed: %',x; end if;
  rid := (x#>>'{room,id}')::uuid; aid := (x#>>'{me,id}')::uuid;
  y := public.geodecoder_duel_gateway(jsonb_build_object('action','create','tokenHash',a,'fingerprint',f,'code','100001','name','Changed'));
  if y#>>'{room,id}' is distinct from rid::text or y#>>'{me,name}' is distinct from 'Host' then raise exception 'Create was not idempotent'; end if;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','join','tokenHash',b,'fingerprint',f,'code',pin,'name','Guest'));
  if not coalesce((x->>'ok')::boolean,false) then raise exception 'Join failed: %',x; end if;
  bid := (x#>>'{me,id}')::uuid;
  y := public.geodecoder_duel_gateway(jsonb_build_object('action','join','tokenHash',b,'fingerprint',f,'code',pin,'name','Changed'));
  if y#>>'{me,id}' is distinct from bid::text then raise exception 'Join was not idempotent'; end if;
  y := public.geodecoder_duel_gateway(jsonb_build_object('action','join','tokenHash',c,'fingerprint',f,'code',pin,'name','Third'));
  if y->>'error' is distinct from 'room_full' then raise exception 'Third player not rejected: %',y; end if;
  if (x->'opponent') ?| array['answers','attempts','hintUsed','seq','token_hash'] then raise exception 'Opponent private data leaked'; end if;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','ready','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',1)); seq_a:=1;
  y := public.geodecoder_duel_gateway(jsonb_build_object('action','ready','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',1));
  if y->'actionResult' is distinct from x->'actionResult' or y#>>'{me,seq}' is distinct from '1' then raise exception 'Mutation retry changed result'; end if;
  y := public.geodecoder_duel_gateway(jsonb_build_object('action','leave','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',1));
  if y->>'error' is distinct from 'sequence_conflict' then raise exception 'Sequence conflict accepted: %',y; end if;
  y := public.geodecoder_duel_gateway(jsonb_build_object('action','ready','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',3));
  if y->>'error' is distinct from 'sequence_mismatch' then raise exception 'Out-of-order sequence accepted'; end if;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','ready','tokenHash',b,'fingerprint',f,'roomId',rid,'seq',1)); seq_b:=1;
  if x#>>'{room,status}' is distinct from 'countdown' or jsonb_array_length(x#>'{room,questionIds}') is distinct from 10 then raise exception 'Shared countdown/round missing'; end if;
  if exists(select 1 from unnest((select question_ids from geodecoder_duel.rooms where id=rid)) chosen(id) join geodecoder_duel.questions q on q.id=chosen.id group by q.shape having count(*) is distinct from 2)
    or (select count(distinct chosen.id) from unnest((select question_ids from geodecoder_duel.rooms where id=rid)) chosen(id)) is distinct from 10 then
    raise exception 'Round must have two unique questions per shape';
  end if;
  y := public.geodecoder_duel_gateway(jsonb_build_object('action','scan','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',2,'questionIndex',0,'kind','solid','shape','cube','target','r1'));
  if y->>'error' is distinct from 'not_started' then raise exception 'Countdown allowed a scan'; end if;
  clock:=geodecoder_duel.clock_ms();
  update geodecoder_duel.rooms set starts_at=clock-10000, deadline_at=clock+890000 where id=rid;
  update geodecoder_duel.players set next_ready_at=geodecoder_duel.clock_ms()-1,question_started_at=geodecoder_duel.clock_ms()-10000 where room_id=rid;
  select question_ids[1] into q from geodecoder_duel.rooms where id=rid;
  select shape into expected from geodecoder_duel.questions where id=q;
  wrong:=case when expected='cube' then 'cone' else 'cube' end;
  y := public.geodecoder_duel_gateway(jsonb_build_object('action','scan','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',2,'questionIndex',0,'kind','net','shape',expected,'target','r2'));
  if y->>'error' is distinct from 'stage_mismatch' then raise exception 'R2 before R1 was accepted'; end if;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','hint','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',2,'questionIndex',0)); seq_a:=2;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','hint','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',3,'questionIndex',0)); seq_a:=3;
  if x#>>'{me,hints}' is distinct from '1' then raise exception 'Hint counted more than once'; end if;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','scan','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',4,'questionIndex',0,'kind','solid','shape',expected,'target','r1')); seq_a:=4;
  if x#>>'{me,stage}' is distinct from 'net' or x#>>'{me,score}' is distinct from '0' then raise exception 'Solid stage improperly scored'; end if;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','scan','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',5,'questionIndex',0,'kind','net','shape',expected,'target','r2')); seq_a:=5;
  if x#>>'{me,score}' is distinct from '1' or x#>>'{me,answered}' is distinct from '1' or x#>>'{me,stage}' is distinct from 'solid' or x#>>'{me,answers,0,hint}' is distinct from 'true' then raise exception 'Correct pair was not scored/restored'; end if;
  y := public.geodecoder_duel_gateway(jsonb_build_object('action','skip','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',6,'questionIndex',1));
  if y->>'error' is distinct from 'not_ready' then raise exception 'Feedback pacing bypassed: %',y; end if;
  update geodecoder_duel.players set next_ready_at=geodecoder_duel.clock_ms()-1 where id=aid;
  select question_ids[2] into q from geodecoder_duel.rooms where id=rid;
  select shape into expected from geodecoder_duel.questions where id=q;
  wrong:=case when expected='cube' then 'cone' else 'cube' end;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','scan','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',6,'questionIndex',1,'kind','solid','shape',wrong,'target','r1')); seq_a:=6;
  if x#>>'{me,mistakes}' is distinct from '1' or x#>>'{me,score}' is distinct from '1' or x#>>'{me,answers,1,failedAt}' is distinct from 'solid' then raise exception 'Wrong attempt was not final'; end if;
  if (x#>>'{me,nextReadyAt}')::bigint-(x->>'serverNow')::bigint is distinct from 1800 then raise exception 'Wrong pacing is not 1800ms'; end if;
  for i in 2..9 loop
    update geodecoder_duel.players set next_ready_at=geodecoder_duel.clock_ms()-1 where id=aid;
    seq_a:=seq_a+1;
    x := public.geodecoder_duel_gateway(jsonb_build_object('action','skip','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',seq_a,'questionIndex',i));
    if x#>>'{actionResult,type}' is distinct from 'skipped' then raise exception 'Skip did not settle question: %',x; end if;
  end loop;
  if x#>>'{room,status}' is distinct from 'playing' or x#>>'{me,answered}' is distinct from '10' or x#>'{room,winnerId}' is distinct from 'null'::jsonb then raise exception 'Result announced before opponent finishes'; end if;
  seq_a:=seq_a+1;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','leave','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',seq_a));
  if x#>>'{me,forfeited}' is distinct from 'false' or x#>>'{room,status}' is distinct from 'playing' then raise exception 'Completed player incorrectly forfeited'; end if;
  clock:=geodecoder_duel.clock_ms();
  update geodecoder_duel.rooms set starts_at=clock-900001,deadline_at=clock-1 where id=rid;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','state','tokenHash',a,'fingerprint',f,'roomId',rid));
  if x#>>'{room,status}' is distinct from 'complete' or x#>>'{room,winnerId}' is distinct from aid::text or jsonb_array_length(x#>'{me,answers}') is distinct from 10 or x#>>'{me,skipped}' is distinct from '8' then raise exception 'Deadline did not settle/score round: %',x; end if;
  if x#>>'{opponent,answered}' is distinct from '10' or (x->'opponent')?'answers' then raise exception 'Deadline opponent/privacy failed'; end if;
  -- Equal scores use server finish time; exact equality is a tie.
  clock:=geodecoder_duel.clock_ms();
  update geodecoder_duel.rooms set status='playing',winner_id=null,reason=null,starts_at=clock-800000,deadline_at=clock+100000 where id=rid;
  update geodecoder_duel.players set score=0,mistakes=0,skipped=10,finished_at=clock-200 where room_id=rid;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','state','tokenHash',a,'fingerprint',f,'roomId',rid));
  if x#>>'{room,reason}' is distinct from 'tie' or x#>'{room,winnerId}' is distinct from 'null'::jsonb then raise exception 'Exact tie not preserved'; end if;
  update geodecoder_duel.rooms set status='playing',winner_id=null,reason=null where id=rid;
  update geodecoder_duel.players set finished_at=finished_at+1 where id=bid;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','state','tokenHash',a,'fingerprint',f,'roomId',rid));
  if x#>>'{room,winnerId}' is distinct from aid::text or x#>>'{room,reason}' is distinct from 'time' then raise exception 'Server finish tiebreak failed'; end if;
  -- Forfeit wins even when the leaving player previously had more points.
  update geodecoder_duel.rooms set status='playing',winner_id=null,reason=null where id=rid;
  update geodecoder_duel.players set answered=2,score=case when id=aid then 1 else 0 end,mistakes=case when id=aid then 1 else 0 end,skipped=case when id=aid then 0 else 2 end,answers=jsonb_path_query_array(answers,'$[0 to 1]'),finished_at=null where room_id=rid;
  seq_a:=seq_a+1;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','leave','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',seq_a));
  if x#>>'{room,winnerId}' is distinct from bid::text or x#>>'{room,reason}' is distinct from 'forfeit' or x#>>'{me,answered}' is distinct from '10' or x#>>'{opponent,answered}' is distinct from '10' then raise exception 'Forfeit did not settle both players: %',x; end if;
  -- Waiting leave and ten-minute lobby expiry cannot be used to start a match.
  delete from geodecoder_duel.rooms where id=rid;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','create','tokenHash',a,'fingerprint',f,'code',pin,'name','Host'));
  rid := (x#>>'{room,id}')::uuid;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','leave','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',1));
  if x#>>'{room,status}' is distinct from 'cancelled' then raise exception 'Waiting leave did not cancel'; end if;
  delete from geodecoder_duel.rooms where id=rid;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','create','tokenHash',a,'fingerprint',f,'code',pin,'name','Host'));
  rid := (x#>>'{room,id}')::uuid;
  clock:=geodecoder_duel.clock_ms();
  update geodecoder_duel.rooms set created_at=clock-600001,lobby_expires_at=clock-1,expires_at=clock-600001+86400000 where id=rid;
  x := public.geodecoder_duel_gateway(jsonb_build_object('action','join','tokenHash',b,'fingerprint',f,'code',pin,'name','Guest'));
  if x->>'error' is distinct from 'room_expired' or (select status from geodecoder_duel.rooms where id=rid) is distinct from 'expired' then raise exception 'Lobby expiration was not committed atomically'; end if;
  raise notice 'Duel transactional verification passed';
end
$verify$;
rollback;
