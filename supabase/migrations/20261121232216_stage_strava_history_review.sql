alter table public.fitness_history_imports add column review_samples jsonb;

revoke select on public.fitness_history_imports from authenticated;
grant select (user_id, provider, days, started_at, completed_at, lease, lease_until)
  on public.fitness_history_imports to authenticated;

create function public.clear_fitness_history_review()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.review_samples := null;
  return new;
end $$;

create trigger clear_fitness_history_review
  before update of lease on public.fitness_history_imports
  for each row when (old.lease is distinct from new.lease)
  execute function public.clear_fitness_history_review();

create function public.confirm_strava_history_review(p_user uuid, p_lease uuid, p_rows jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  update public.fitness_history_imports
  set completed_at = now(), lease = null, lease_until = null
  where user_id = p_user and provider = 'strava' and lease = p_lease
    and completed_at is null and lease_until > now() and review_samples is not null;
  if not found then return false; end if;

  insert into public.activities (
    user_id, provider, external_id, category_id, started_at, metric_value, moving_sec,
    avg_hr, raw_name, summary_polyline, detailed_polyline, route_replay, route_bounds,
    elevation_gain_m, sport, distance_m, verified, journal_only, provenance,
    disposition, disposition_reason, compete_key, source_label
  )
  select p_user, 'strava', r.external_id, r.category_id, r.started_at, r.metric_value,
    r.moving_sec, r.avg_hr, r.raw_name, r.summary_polyline, r.detailed_polyline, r.route_replay,
    r.route_bounds, r.elevation_gain_m, r.sport, r.distance_m, r.verified, r.journal_only,
    r.provenance, r.disposition, r.disposition_reason, r.compete_key, r.source_label
  from jsonb_populate_recordset(null::public.activities, p_rows) r
  on conflict (user_id, provider, external_id) do nothing;
  return true;
end $$;

revoke all on function public.confirm_strava_history_review(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_strava_history_review(uuid, uuid, jsonb) to service_role;
