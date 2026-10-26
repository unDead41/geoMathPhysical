-- Prepared verification for the backend owner. All fixture writes roll back.
-- Run after the v2 migration; never replace real player records as test material.
begin;
do $verify$
declare
  a text:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  b text:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  f text:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  pin text;rid uuid;aid uuid;x jsonb;y jsonb;expected text;clock bigint;
begin
  if has_function_privilege('anon','public.geodecoder_duel_gateway(jsonb)','execute')
    or has_function_privilege('authenticated','public.geodecoder_duel_gateway(jsonb)','execute')
    or not has_function_privilege('service_role','public.geodecoder_duel_gateway(jsonb)','execute') then
    raise exception 'Duel gateway privilege changed';
  end if;
  loop
    pin:=(100000+floor(random()*900000)::int)::text;
    exit when not exists(select 1 from geodecoder_duel.rooms where code=pin);
  end loop;
  x:=public.geodecoder_duel_gateway(jsonb_build_object('action','create','tokenHash',a,'fingerprint',f,'name','Duel rollback fixture','code',pin));
  if x->>'ok' is distinct from 'true' then raise exception 'Create fixture failed';end if;
  rid:=(x#>>'{room,id}')::uuid;aid:=(x#>>'{me,id}')::uuid;
  y:=public.geodecoder_duel_gateway(jsonb_build_object('action','join','tokenHash',b,'fingerprint',f,'name','Duel rollback guest','code',pin));
  if y->>'ok' is distinct from 'true' then raise exception 'Join fixture failed';end if;
  x:=public.geodecoder_duel_gateway(jsonb_build_object('action','ready','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',1));
  x:=public.geodecoder_duel_gateway(jsonb_build_object('action','ready','tokenHash',b,'fingerprint',f,'roomId',rid,'seq',1));
  clock:=geodecoder_duel.clock_ms();
  update geodecoder_duel.rooms set starts_at=clock-1,deadline_at=clock+899999 where id=rid;
  update geodecoder_duel.players set next_ready_at=clock-1,question_started_at=clock-1 where room_id=rid;
  select q.shape into expected from geodecoder_duel.rooms r join geodecoder_duel.questions q on q.id=r.question_ids[1] where r.id=rid;
  x:=public.geodecoder_duel_gateway(jsonb_build_object('action','scan','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',2,'questionIndex',0,'kind','solid','shape',expected,'target','r1'));
  x:=public.geodecoder_duel_gateway(jsonb_build_object('action','scan','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',3,'questionIndex',0,'kind','net','shape',expected,'target','r2'));
  if x#>>'{me,score}' is distinct from '1' or x#>>'{me,reviewPending}' is distinct from 'true' then raise exception 'Settled review was not persisted';end if;
  y:=public.geodecoder_duel_gateway(jsonb_build_object('action','scan','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',3,'questionIndex',0,'kind','net','shape',expected,'target','r2'));
  if y#>>'{me,score}' is distinct from '1' or y#>>'{me,seq}' is distinct from '3' then raise exception 'Duplicate scored twice';end if;
  y:=public.geodecoder_duel_gateway(jsonb_build_object('action','advance','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',4,'questionIndex',0));
  if y->>'error' is distinct from 'not_ready' then raise exception 'Minimum review pacing bypassed';end if;
  update geodecoder_duel.players set next_ready_at=geodecoder_duel.clock_ms()-1 where id=aid;
  x:=public.geodecoder_duel_gateway(jsonb_build_object('action','advance','tokenHash',a,'fingerprint',f,'roomId',rid,'seq',4,'questionIndex',0));
  if x#>>'{me,reviewPending}' is distinct from 'false' or x#>>'{me,answered}' is distinct from '1' then raise exception 'Advance changed the settled answer';end if;
  x:=public.geodecoder_duel_gateway(jsonb_build_object('action','leave','tokenHash',b,'fingerprint',f,'roomId',rid,'seq',2));
  if x#>>'{room,status}' is distinct from 'complete' or x#>>'{room,winnerId}' is distinct from aid::text then raise exception 'Forfeit result disagrees';end if;
  raise notice 'Duel v2 rollback verification passed';
end
$verify$;
rollback;
