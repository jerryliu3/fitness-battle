-- Align SQL compete scoring with walking daily steps and journal-only manual activities.

grant execute on function private.walking_steps_total(uuid, timestamptz, timestamptz, timestamptz) to service_role;

create or replace function private.week_field_scores(p_field_id uuid)
returns table (
  user_id uuid,
  display_name text,
  open_elo numeric,
  distance_m numeric,
  moving_sec numeric,
  verified_elo numeric,
  verified_distance_m numeric,
  verified_moving_sec numeric,
  effort double precision,
  verified_effort double precision
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  field_rec public.week_fields;
begin
  select * into field_rec from public.week_fields where id = p_field_id;
  return query
  select
    p.id,
    coalesce(cm.display_name, p.display_name),
    coalesce((field_rec.entry_ratings->p.id::text->>'open')::numeric, r.open_elo, 1000)::numeric,
    case
      when field_rec.sport = 'walking'
        then private.walking_steps_total(p.id, field_rec.wave_start, field_rec.week_end)::numeric
      else coalesce(sum(a.distance_m), 0)::numeric
    end,
    coalesce(sum(a.moving_sec), 0)::numeric,
    coalesce((field_rec.entry_ratings->p.id::text->>'verified')::numeric, r.verified_elo, 1000)::numeric,
    coalesce(sum(a.distance_m) filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling')), 0)::numeric,
    coalesce(sum(a.moving_sec) filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling')), 0)::numeric,
    case
      when field_rec.sport = 'walking'
        then private.walking_steps_total(p.id, field_rec.wave_start, field_rec.week_end)::double precision
      else coalesce(sum(private.field_activity_effort(field_rec.sport, a.distance_m, a.moving_sec, a.avg_hr)), 0)::double precision
    end,
    coalesce(sum(private.field_activity_effort(field_rec.sport, a.distance_m, a.moving_sec, a.avg_hr))
      filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling')), 0)::double precision
  from unnest(field_rec.member_ids) as m(id)
  join public.profiles p on p.id = m.id
  left join public.sport_ratings r
    on r.user_id = m.id and r.sport = field_rec.sport
  left join public.crew_members cm
    on cm.crew_id = field_rec.crew_id and cm.user_id = m.id
  left join lateral (
    select activity.distance_m, activity.moving_sec, activity.avg_hr, activity.verified, activity.provenance
    from private.competition_activity_rows(field_rec.sport, field_rec.wave_start, field_rec.week_end, m.id) activity
    where field_rec.sport <> 'walking'
      and activity.user_id = m.id
      and activity.disposition = 'counted'
      and activity.provenance not in ('demo', 'manual')
      and coalesce(activity.source_label, activity.provider::text) <> 'history'
      and coalesce(activity.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
      and activity.sport = field_rec.sport
      and activity.started_at >= field_rec.wave_start
      and activity.started_at < field_rec.week_end
      and activity.started_at <= statement_timestamp()
  ) a on true
  group by p.id, cm.display_name, p.display_name, r.open_elo, r.verified_elo, field_rec.sport, field_rec.wave_start, field_rec.week_end
  order by p.id;
end;
$$;

create or replace function public.week_field_roster(p_field_id uuid)
returns table (
  user_id uuid,
  display_name text,
  open_elo numeric,
  distance_m numeric,
  moving_sec numeric,
  verified_elo numeric,
  verified_distance_m numeric,
  verified_moving_sec numeric,
  effort double precision,
  verified_effort double precision
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  field_rec public.week_fields;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;

  select * into field_rec from public.week_fields where id = p_field_id;
  if field_rec.id is null then
    raise exception 'field_not_found';
  end if;
  if not (uid = any(field_rec.member_ids)) then
    raise exception 'not_in_field';
  end if;
  if field_rec.wave_start > statement_timestamp() then
    raise exception 'wave_not_started';
  end if;

  return query select * from private.week_field_scores(p_field_id);
end;
$$;

create or replace function private.store_effort_receipts(p_user uuid, p_state jsonb) returns void
language plpgsql
set search_path = ''
as $$
declare
  r jsonb;
  prior public.effort_milestones;
  volume numeric;
  base numeric;
  price numeric;
begin
  for r in select value from jsonb_array_elements(coalesce(p_state->'effortMilestones', '[]'::jsonb)) loop
    select * into prior from public.effort_milestones
      where user_id = p_user and sport = r->>'sport' and track = r->>'track'
        and period_start = (r->>'periodStart')::timestamptz;
    if found then
      if (r->>'step')::numeric <> prior.step or (r->>'periodEnd')::timestamptz <> prior.period_end
        or (r->>'earned')::integer < prior.earned then
        raise exception 'milestone_receipt_changed';
      end if;
      if (r->>'earned')::integer = prior.earned then
        continue;
      end if;
    elsif not exists(
        select 1 from jsonb_array_elements(coalesce(p_state->'enrollments', '[]'::jsonb)) e
        where e->>'sport' = r->>'sport' and (e->>'waveStart')::timestamptz = (r->>'periodStart')::timestamptz
      )
      and not exists(
        select 1 from jsonb_array_elements(coalesce(p_state->'periodResults', '[]'::jsonb)) e
        where e->>'sport' = r->>'sport' and (e->>'periodStart')::timestamptz = (r->>'periodStart')::timestamptz
      ) then
      raise exception 'milestone_sport_not_active';
    end if;
    base := case r->>'sport'
      when 'cycling' then 8046.72
      when 'strength' then 1800
      when 'walking' then 1000
      else 1609.344
    end;
    price := (r->>'step')::numeric / base;
    if price not in (1, 1.5, 2, 2.5, 3, 4, 5)
      or (r->>'sport' = 'strength' and r->>'track' = 'verified') then
      raise exception 'invalid_milestone_step';
    end if;
    if r->>'sport' = 'walking' then
      volume := private.walking_steps_total(
        p_user,
        (r->>'periodStart')::timestamptz,
        (r->>'periodEnd')::timestamptz
      )::numeric;
    else
      select coalesce(sum(case when r->>'sport' = 'strength' then a.moving_sec else a.distance_m end), 0) into volume
        from private.competition_activity_rows_snapshot(
          r->>'sport',
          (r->>'periodStart')::timestamptz,
          (r->>'periodEnd')::timestamptz,
          p_user
        ) a
        where a.user_id = p_user
          and a.sport = r->>'sport'
          and a.started_at >= (r->>'periodStart')::timestamptz
          and a.started_at < (r->>'periodEnd')::timestamptz
          and a.started_at <= statement_timestamp()
          and a.disposition = 'counted'
          and a.provenance not in ('demo', 'manual')
          and coalesce(a.source_label, a.provider::text) <> 'history'
          and coalesce(a.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
          and (r->>'track' = 'open' or (a.verified and a.provenance = 'recorded' and a.sport <> 'strength'));
    end if;
    if (r->>'earned')::integer > greatest(coalesce(prior.earned, 0), floor(volume / (r->>'step')::numeric)) then
      raise exception 'milestone_volume_mismatch';
    end if;
    insert into public.effort_milestones
      values (
        p_user,
        r->>'sport',
        r->>'track',
        (r->>'periodStart')::timestamptz,
        (r->>'periodEnd')::timestamptz,
        (r->>'step')::numeric,
        (r->>'earned')::integer
      )
      on conflict (user_id, sport, track, period_start)
      do update set earned = greatest(public.effort_milestones.earned, excluded.earned);
  end loop;
end;
$$;

revoke all on function private.store_effort_receipts(uuid, jsonb) from public, anon, authenticated;
grant execute on function private.store_effort_receipts(uuid, jsonb) to service_role;