-- Operator-only rollback; use a transaction and review schema history first.
do $patch$
declare definition text;
begin
  if (select md5(prosrc) from pg_proc where oid='public.geodecoder_duel_gateway(jsonb)'::regprocedure)<>'bbe21cbd9ef66ea8f0e2a04ab6c84968' then
    raise exception 'Scaling migration: public.geodecoder_duel_gateway(jsonb) differs from the reviewed baseline; review current source first';
  end if;
  definition:=pg_get_functiondef('public.geodecoder_duel_gateway(jsonb)'::regprocedure);
  if position($before$  if action<>'state' or p.last_seen_at<=now_ms-10000 then
    update geodecoder_duel.players set last_seen_at=now_ms where id=p.id returning * into p;
  end if;$before$ in definition)=0 then raise exception 'Scaling migration patch precondition failed'; end if;
  definition:=replace(definition,$before$  if action<>'state' or p.last_seen_at<=now_ms-10000 then
    update geodecoder_duel.players set last_seen_at=now_ms where id=p.id returning * into p;
  end if;$before$,$after$  update geodecoder_duel.players set last_seen_at=now_ms where id=p.id returning * into p;$after$);
  if position($before$  now_ms:=geodecoder_duel.clock_ms();
  -- Validate an existing capability before allocating per-token counters.
  if action not in ('create','join') then
    select * into p from geodecoder_duel.players t where t.token_hash=v_token_hash;
    if p.id is null or p.room_id<>v_room_id then
      -- Rotating unknown tokens shares one rejection bucket per fingerprint/window.
      -- Its budget cannot consume the independent budget for valid school-IP polls.
      perform geodecoder_duel.cleanup(now_ms);
      select * into limits from geodecoder_duel.capacity_policy where singleton;
      if not found then return '{"ok":false,"error":"server_error"}'; end if;
      if not geodecoder_duel.take_rate('reject:'||fingerprint,limits.ip_rejects_per_min,60000,now_ms) then return '{"ok":false,"error":"rate_limited"}'; end if;
      if p.id is null then return '{"ok":false,"error":"invalid_token"}'; end if;
      return '{"ok":false,"error":"room_unavailable"}';
    end if;
  end if;
  -- Valid state polls use per-token budgets, avoiding one shared school-IP row.
  -- The exact requested-room TTL gate below remains authoritative on every poll.
  if action<>'state' then
    perform geodecoder_duel.cleanup(now_ms);
    select * into limits from geodecoder_duel.capacity_policy where singleton;
    if not found then return '{"ok":false,"error":"server_error"}'; end if;
    if action in ('create','join') then
      if not geodecoder_duel.take_rate('global:'||action,case when action='create' then limits.global_create_per_min else limits.global_join_per_min end,60000,now_ms) then
        return '{"ok":false,"error":"rate_limited"}';
      end if;
    end if;
    if not geodecoder_duel.take_rate('ip:'||fingerprint,limits.ip_mutations_per_min,60000,now_ms) then return '{"ok":false,"error":"rate_limited"}'; end if;
    if action in ('create','join') then
      if not geodecoder_duel.take_rate(action||':'||fingerprint,case when action='create' then limits.ip_create_per_min else limits.ip_join_per_min end,60000,now_ms)
        or not geodecoder_duel.take_rate(action||':long:'||fingerprint,case when action='create' then limits.ip_create_per_min*3 else limits.ip_join_per_min*4 end,600000,now_ms) then return '{"ok":false,"error":"rate_limited"}'; end if;
    end if;
  end if;
  if not geodecoder_duel.take_rate('token:'||v_token_hash,120,60000,now_ms) then return '{"ok":false,"error":"rate_limited"}'; end if;
$before$ in definition)=0 then raise exception 'Scaling migration patch precondition failed'; end if;
  definition:=replace(definition,$before$  now_ms:=geodecoder_duel.clock_ms();
  -- Validate an existing capability before allocating per-token counters.
  if action not in ('create','join') then
    select * into p from geodecoder_duel.players t where t.token_hash=v_token_hash;
    if p.id is null or p.room_id<>v_room_id then
      -- Rotating unknown tokens shares one rejection bucket per fingerprint/window.
      -- Its budget cannot consume the independent budget for valid school-IP polls.
      perform geodecoder_duel.cleanup(now_ms);
      select * into limits from geodecoder_duel.capacity_policy where singleton;
      if not found then return '{"ok":false,"error":"server_error"}'; end if;
      if not geodecoder_duel.take_rate('reject:'||fingerprint,limits.ip_rejects_per_min,60000,now_ms) then return '{"ok":false,"error":"rate_limited"}'; end if;
      if p.id is null then return '{"ok":false,"error":"invalid_token"}'; end if;
      return '{"ok":false,"error":"room_unavailable"}';
    end if;
  end if;
  -- Valid state polls use per-token budgets, avoiding one shared school-IP row.
  -- The exact requested-room TTL gate below remains authoritative on every poll.
  if action<>'state' then
    perform geodecoder_duel.cleanup(now_ms);
    select * into limits from geodecoder_duel.capacity_policy where singleton;
    if not found then return '{"ok":false,"error":"server_error"}'; end if;
    if action in ('create','join') then
      if not geodecoder_duel.take_rate('global:'||action,case when action='create' then limits.global_create_per_min else limits.global_join_per_min end,60000,now_ms) then
        return '{"ok":false,"error":"rate_limited"}';
      end if;
    end if;
    if not geodecoder_duel.take_rate('ip:'||fingerprint,limits.ip_mutations_per_min,60000,now_ms) then return '{"ok":false,"error":"rate_limited"}'; end if;
    if action in ('create','join') then
      if not geodecoder_duel.take_rate(action||':'||fingerprint,case when action='create' then limits.ip_create_per_min else limits.ip_join_per_min end,60000,now_ms)
        or not geodecoder_duel.take_rate(action||':long:'||fingerprint,case when action='create' then limits.ip_create_per_min*3 else limits.ip_join_per_min*4 end,600000,now_ms) then return '{"ok":false,"error":"rate_limited"}'; end if;
    end if;
  end if;
  if not geodecoder_duel.take_rate('token:'||v_token_hash,120,60000,now_ms) then return '{"ok":false,"error":"rate_limited"}'; end if;
$before$,$after$  now_ms:=geodecoder_duel.clock_ms();
  perform geodecoder_duel.cleanup(now_ms);
  -- A global quota is independent of source-address headers and player tokens.
  -- Fingerprints below are best-effort buckets; rotating them cannot bypass this
  -- shared create/join ceiling. No raw address or token is stored.
  if action in ('create','join') then
    if not geodecoder_duel.take_rate('global:'||action,case when action='create' then 120 else 300 end,60000,now_ms) then
      return '{"ok":false,"error":"rate_limited"}';
    end if;
  end if;
  if not geodecoder_duel.take_rate('ip:'||fingerprint,1200,60000,now_ms)
    or not geodecoder_duel.take_rate('token:'||v_token_hash,120,60000,now_ms) then return '{"ok":false,"error":"rate_limited"}'; end if;
  if action in ('create','join') then
    if not geodecoder_duel.take_rate(action||':'||fingerprint,case when action='create' then 20 else 30 end,60000,now_ms)
      or not geodecoder_duel.take_rate(action||':long:'||fingerprint,case when action='create' then 60 else 120 end,600000,now_ms) then return '{"ok":false,"error":"rate_limited"}'; end if;
  end if;
$after$);
  if position($before$  now_ms bigint; next_seq integer; question_index integer; canonical jsonb; result jsonb;
  limits geodecoder_duel.capacity_policy%rowtype;$before$ in definition)=0 then raise exception 'Scaling migration patch precondition failed'; end if;
  definition:=replace(definition,$before$  now_ms bigint; next_seq integer; question_index integer; canonical jsonb; result jsonb;
  limits geodecoder_duel.capacity_policy%rowtype;$before$,$after$  now_ms bigint; next_seq integer; question_index integer; canonical jsonb; result jsonb;$after$);
  execute definition;
  if (select md5(prosrc) from pg_proc where oid='public.geodecoder_duel_gateway(jsonb)'::regprocedure)<>'caf0544662583b5170b3ee62def008b7' then raise exception 'Scaling migration postcondition failed'; end if;
end $patch$;

do $patch$
declare definition text;
begin
  if (select md5(prosrc) from pg_proc where oid='private.geo_action(text,jsonb)'::regprocedure)<>'9325760e12030b1a9f16b9f55bf90180' then
    raise exception 'Scaling migration: private.geo_action(text,jsonb) differs from the reviewed baseline; review current source first';
  end if;
  definition:=pg_get_functiondef('private.geo_action(text,jsonb)'::regprocedure);
  if position($before$  -- Snapshot reads never write presence or take the account mutation lock.
  if p_action in ('snapshot','heartbeat') then
    select * into me from private.profiles where id=uid;
    if not found then return private.error('profile_missing','Profil akaun belum tersedia.'); end if;
    rid:=nullif(p_payload->>'room_id','')::uuid;
    if rid is not null and not private.can_view_room(rid) then return private.error('forbidden','Bilik ini tidak boleh diakses.'); end if;
    if p_action='heartbeat' then
      update private.profiles set last_seen=t where id=uid and last_seen<t-interval '15 seconds';
      update public.room_progress set last_seen=t where user_id=uid and (rid is null or room_id=rid) and last_seen<t-interval '15 seconds';
    end if;
    return private.snapshot(uid,rid);
  end if;
  -- Mutations retain their original account/attempt serialization and authority.
  select * into me from private.profiles where id=uid for update;
  if not found then return private.error('profile_missing','Profil akaun belum tersedia.'); end if;
  update private.profiles set last_seen=t where id=uid;

  if p_action='update_profile' then$before$ in definition)=0 then raise exception 'Scaling migration patch precondition failed'; end if;
  definition:=replace(definition,$before$  -- Snapshot reads never write presence or take the account mutation lock.
  if p_action in ('snapshot','heartbeat') then
    select * into me from private.profiles where id=uid;
    if not found then return private.error('profile_missing','Profil akaun belum tersedia.'); end if;
    rid:=nullif(p_payload->>'room_id','')::uuid;
    if rid is not null and not private.can_view_room(rid) then return private.error('forbidden','Bilik ini tidak boleh diakses.'); end if;
    if p_action='heartbeat' then
      update private.profiles set last_seen=t where id=uid and last_seen<t-interval '15 seconds';
      update public.room_progress set last_seen=t where user_id=uid and (rid is null or room_id=rid) and last_seen<t-interval '15 seconds';
    end if;
    return private.snapshot(uid,rid);
  end if;
  -- Mutations retain their original account/attempt serialization and authority.
  select * into me from private.profiles where id=uid for update;
  if not found then return private.error('profile_missing','Profil akaun belum tersedia.'); end if;
  update private.profiles set last_seen=t where id=uid;

  if p_action='update_profile' then$before$,$after$  -- Serializes a user's joins and events. Attempts are separately locked below.
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

  elsif p_action='update_profile' then$after$);
  execute definition;
  if (select md5(prosrc) from pg_proc where oid='private.geo_action(text,jsonb)'::regprocedure)<>'86c3208f176f29d2200e83115a2a92df' then raise exception 'Scaling migration postcondition failed'; end if;
end $patch$;

drop table geodecoder_duel.capacity_policy;
