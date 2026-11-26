alter table public.fitness_history_imports add column effort_boost jsonb;
grant select (effort_boost) on public.fitness_history_imports to authenticated;

create function public.confirm_fitness_history_with_boost(p_user uuid, p_lease uuid, p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  imported public.fitness_history_imports%rowtype;
  oldest timestamptz;
  training_days integer;
  coverage integer := 0;
  award jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
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

  if training_days >= 2 then
    coverage := least(imported.days, 90, ceil(extract(epoch from (imported.started_at - oldest)) / 86400)::integer);
    -- A rest period near the requested start still counts as covered history.
    if coverage >= imported.days - 7 then coverage := imported.days; end if;
  end if;

  award := jsonb_build_object(
    'multiplier', 1 + 2 * coverage / 90.0,
    'startsAt', imported.completed_at,
    'boostEndsAt', imported.completed_at + interval '720 hours'
  );
  update public.fitness_history_imports set effort_boost = award where user_id = p_user;
  return award;
end $$;

revoke all on function public.confirm_fitness_history_with_boost(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_fitness_history_with_boost(uuid, uuid, jsonb) to service_role;
