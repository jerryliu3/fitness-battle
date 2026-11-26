alter table public.athlete_prefs add column effort_backfilled_at timestamptz;

create function public.list_effort_backfill_accounts(p_start timestamptz, p_after uuid)
returns table(user_id uuid) language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  return query
    select p.user_id
    from public.athlete_prefs p
    join auth.users u on u.id = p.user_id
    where u.created_at < p_start and p.effort_backfilled_at is null
      and not (coalesce(u.raw_app_meta_data, '{}'::jsonb) ? 'fixture')
      and not exists (select 1 from public.fitness_history_imports h
        where h.user_id = p.user_id and h.completed_at >= p_start and h.effort_boost is not null)
      and (p_after is null or p.user_id > p_after)
    order by p.user_id
    limit 100;
end $$;

create function public.commit_effort_backfill(
  p_user uuid, p_start timestamptz, p_expected_updated_at timestamptz,
  p_effort_accounts jsonb, p_scores jsonb
) returns text language plpgsql security definer set search_path = '' as $$
declare
  prefs public.athlete_prefs%rowtype;
  sport_id text;
  points numeric;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  if p_start is distinct from (date_trunc('week', now() at time zone 'America/New_York') at time zone 'America/New_York') then
    raise exception 'effort_backfill_requires_current_week';
  end if;
  select * into prefs from public.athlete_prefs where user_id = p_user for update;
  if not found then return 'missing'; end if;
  if prefs.effort_backfilled_at is not null then return 'already_applied'; end if;
  if not exists (select 1 from auth.users where id = p_user and created_at < p_start
    and not (coalesce(raw_app_meta_data, '{}'::jsonb) ? 'fixture')) then return 'skipped'; end if;
  if prefs.updated_at is distinct from p_expected_updated_at then return 'conflict'; end if;

  -- An import confirmed since cutover already owns the athlete's starter state.
  if exists (select 1 from public.fitness_history_imports
    where user_id = p_user and completed_at >= p_start and effort_boost is not null) then
    return 'newer_import';
  end if;

  foreach sport_id in array array['running', 'cycling', 'walking', 'strength'] loop
    points := (p_scores->>sport_id)::numeric;
    if points is null or points < 0
      or jsonb_typeof(p_effort_accounts->sport_id) is distinct from 'object' then
      raise exception 'invalid_effort_backfill_state';
    end if;
    insert into public.sport_ratings(user_id, sport, open_elo, verified_elo, lock_open, lock_verified, lock_period)
    values (p_user, sport_id, points, points, points, points, p_start)
    on conflict (user_id, sport) do update set open_elo = excluded.open_elo, verified_elo = excluded.verified_elo;
  end loop;

  update public.athlete_prefs
  set effort_accounts = p_effort_accounts, effort_backfilled_at = p_start, updated_at = clock_timestamp()
  where user_id = p_user;
  return 'applied';
end $$;

revoke all on function public.list_effort_backfill_accounts(timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.commit_effort_backfill(uuid, timestamptz, timestamptz, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.list_effort_backfill_accounts(timestamptz, uuid) to service_role;
grant execute on function public.commit_effort_backfill(uuid, timestamptz, timestamptz, jsonb, jsonb) to service_role;
