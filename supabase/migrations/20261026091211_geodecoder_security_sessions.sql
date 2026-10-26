-- Read-only metadata for the caller's real Supabase Auth session records.
-- No custom objects or writes in auth; no client grants on internal Auth tables.
begin;

create schema if not exists private;

create or replace function private.geo_security_sessions()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  current_session_id uuid;
  observed_at timestamptz := current_timestamp;
  result jsonb;
begin
  -- PostgREST verifies the JWT before installing these claims. Neither identity
  -- nor the current-session selector is accepted as a function argument.
  begin
    caller_id := auth.uid();
    current_session_id := nullif(auth.jwt()->>'session_id', '')::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('error', jsonb_build_object('code', 'session-expired'));
  end;

  if caller_id is null or current_session_id is null or not exists (
    select 1 from auth.sessions s
    where s.id = current_session_id and s.user_id = caller_id
      and (s.not_after is null or s.not_after > observed_at)
  ) then
    return jsonb_build_object('error', jsonb_build_object('code', 'session-expired'));
  end if;

  -- The 101st row supplies the bounded truncation indicator. The caller's
  -- current session is always first, even when it is older than every other row.
  with bounded as (
    select s.id = current_session_id as is_current, s.created_at as started_at,
      nullif(left(s.user_agent, 512), '') as user_agent,
      case when s.not_after <= observed_at then 'expired' else 'recorded' end as status,
      s.id as ordering_id
    from auth.sessions s
    where s.user_id = caller_id
    order by (s.id = current_session_id) desc, s.created_at desc nulls last, s.id
    limit 101
  ), visible as (
    select * from bounded
    order by is_current desc, started_at desc nulls last, ordering_id
    limit 100
  )
  select jsonb_build_object(
    'server_now', observed_at,
    'capabilities', jsonb_build_object('revoke_individual', false),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'is_current', v.is_current,
        'started_at', v.started_at,
        'user_agent', v.user_agent,
        'status', v.status
      ) order by v.is_current desc, v.started_at desc nulls last, v.ordering_id)
      from visible v
    ), '[]'::jsonb),
    'truncated', (select count(*) > 100 from bounded)
  ) into result;
  return result;
end;
$$;

-- Only this deliberately narrow invoker wrapper is exposed through the Data API.
create or replace function public.geo_security_sessions()
returns jsonb language sql stable security invoker
set search_path = ''
as $$ select private.geo_security_sessions(); $$;

revoke all on function private.geo_security_sessions() from public, anon;
revoke all on function public.geo_security_sessions() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.geo_security_sessions() to authenticated;
grant execute on function public.geo_security_sessions() to authenticated;

comment on function private.geo_security_sessions() is
  'Owner-bound Auth session metadata. Recorded is not proof of being online or refreshable; no individual revocation is provided.';
comment on function public.geo_security_sessions() is
  'Read only: own session records from verified JWT identity; no arguments and no tokens, IDs or IP addresses returned.';

notify pgrst, 'reload schema';
commit;
