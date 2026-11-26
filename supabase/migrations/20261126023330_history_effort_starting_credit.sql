create or replace function public.confirm_fitness_history_with_boost(p_user uuid, p_lease uuid, p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  imported public.fitness_history_imports%rowtype;
  oldest timestamptz;
  training_days integer;
  coverage integer := 0;
  award jsonb;
  weekly_volumes jsonb;
  primary_sport text;
  staged_steps jsonb;
  weekly_steps numeric;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  select review_samples->'dailyHealth' into staged_steps
  from public.fitness_history_imports
  where user_id = p_user and lease = p_lease;
  if not public.confirm_fitness_history_review(p_user, p_lease, p_rows) then return null; end if;

  select * into strict imported from public.fitness_history_imports where user_id = p_user;
  select min(a.started_at), count(distinct (a.started_at at time zone 'America/New_York')::date)
  into oldest, training_days
  from public.activities a
  join public.profiles p on p.id = a.user_id and p.primary_sport::text = a.sport::text
  where a.user_id = p_user and a.provider = imported.provider
    and a.external_id in (select row->>'external_id' from jsonb_array_elements(p_rows) as selected(row))
    and a.disposition = 'counted' and a.provenance = 'recorded' and not a.journal_only
    and a.started_at < imported.started_at
    and a.started_at >= imported.started_at - make_interval(days => imported.days)
    and case when a.sport::text = 'strength' then a.moving_sec > 0 else a.distance_m > 0 end;

  select p.primary_sport::text into primary_sport from public.profiles p where p.id = p_user;
  if primary_sport = 'walking' then
    select min(day)::timestamp at time zone 'America/New_York', count(distinct day)
    into oldest, training_days
    from jsonb_to_recordset(coalesce(staged_steps, '[]'::jsonb)) as days(day date, steps numeric)
    where steps > 0
      and day >= (imported.started_at at time zone 'America/New_York')::date - imported.days
      and day < (imported.started_at at time zone 'America/New_York')::date;
  end if;

  if training_days >= 2 then
    coverage := least(imported.days, 90, ceil(extract(epoch from (imported.started_at - oldest)) / 86400)::integer);
    -- A rest period near the requested start still counts as covered history.
    if coverage >= imported.days - 7 then coverage := imported.days; end if;
  end if;

  if coverage > 0 then
    select jsonb_object_agg(sport, weekly_volume) into weekly_volumes
    from (
      select a.sport::text as sport,
        sum(case when a.sport::text = 'strength' then a.moving_sec else a.distance_m end)
          * 7.0 / coverage as weekly_volume
      from public.activities a
      where a.user_id = p_user and a.provider = imported.provider
        and a.external_id in (select row->>'external_id' from jsonb_array_elements(p_rows) as selected(row))
        and a.disposition = 'counted' and a.provenance = 'recorded' and not a.journal_only
        and a.started_at < imported.started_at
        and a.started_at >= imported.started_at - make_interval(days => coverage)
        and a.sport::text in ('running', 'cycling', 'strength')
      group by a.sport
    ) as volumes;
    select sum(steps) * 7.0 / coverage into weekly_steps
    from (
      select day, max(steps) as steps
      from jsonb_to_recordset(coalesce(staged_steps, '[]'::jsonb)) as days(day date, steps numeric)
      where steps > 0
        and day >= (imported.started_at at time zone 'America/New_York')::date - coverage
        and day < (imported.started_at at time zone 'America/New_York')::date
      group by day
    ) as daily;
    if weekly_steps > 0 then
      weekly_volumes := coalesce(weekly_volumes, '{}'::jsonb) || jsonb_build_object('walking', weekly_steps);
    end if;
  end if;

  award := jsonb_build_object(
    'coveredHistoryDays', coverage,
    'primarySport', primary_sport,
    'weeklyVolumes', coalesce(weekly_volumes, '{}'::jsonb),
    'multiplier', 1 + 2 * coverage / 90.0,
    'startsAt', imported.completed_at,
    'boostEndsAt', imported.completed_at + interval '720 hours'
  );
  update public.fitness_history_imports set effort_boost = award where user_id = p_user;
  return award;
end $$;
