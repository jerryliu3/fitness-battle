-- Unmapped tracker workouts persist as journal-only strength sessions.

alter table public.activities
  add column if not exists journal_only boolean not null default false;

-- Exclude journal-only rows from field score activity joins (PR3 reader + filter).
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
      and coalesce(activity.journal_only, false) = false
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

-- Milestone volume ignores journal-only rows.
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
          and coalesce(a.journal_only, false) = false
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

create or replace function public.competition_replay(
  p_sport text, p_start timestamptz, p_end timestamptz, p_track text
) returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  f public.week_fields;
  through_at timestamptz;
  roster jsonb;
  ledger jsonb;
begin
  if uid is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_sport is null or p_track is null or p_sport not in ('running','cycling','walking','strength')
     or p_track not in ('open','verified') or p_start is null or p_end is null
     or p_end <= p_start then raise exception 'invalid_replay'; end if;
  select * into f from public.week_fields
    where sport=p_sport and wave_start=p_start and week_end=p_end
      and uid=any(member_ids)
    order by created_at desc, id limit 1;
  if f.id is null then raise exception 'field_not_found' using errcode = '42501'; end if;
  if f.wave_start>statement_timestamp() then raise exception 'wave_not_started' using errcode='42501'; end if;
  through_at := least(statement_timestamp(), f.week_end);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'name',coalesce(cm.display_name,p.display_name,'Athlete'), 'you',p.id=uid
  ) order by p.id),'[]'::jsonb) into roster
  from unnest(f.member_ids) m(id)
  join public.profiles p on p.id=m.id
  left join public.crew_members cm on cm.crew_id=f.crew_id and cm.user_id=m.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'athleteId',a.user_id,'at',a.started_at,
    'distanceM',coalesce(a.distance_m,0),'movingSec',coalesce(a.moving_sec,0),
    'avgHr',case when a.user_id=uid then a.avg_hr else null end
  ) order by a.started_at,a.user_id,a.id),'[]'::jsonb) into ledger
  from unnest(f.member_ids) replay_member cross join lateral private.competition_activity_rows(f.sport,f.wave_start,f.week_end,replay_member) a
  where a.user_id=any(f.member_ids)
    and a.sport=f.sport and a.disposition='counted'
    and a.provenance not in ('demo','manual')
    and coalesce(a.journal_only, false) = false
    and coalesce(a.source_label,a.provider::text)<>'history'
    and coalesce(a.compete_key,'') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
    and a.started_at>=f.wave_start and a.started_at<f.week_end and a.started_at<through_at
    and (p_track='open' or (a.verified and a.provenance='recorded' and f.sport in ('running','cycling')));
  return jsonb_build_object('sport',f.sport,'track',p_track,
    'periodStart',f.wave_start,'periodEnd',f.week_end,'through',through_at,
    'athletes',roster,'events',ledger,'syntheticIds',f.synthetic_ids,'scope','field');
end;
$$;

create or replace function private.crew_contract_progress(p_contract public.crew_contracts)
returns table (value numeric, contributors integer)
language sql volatile security definer set search_path = '' as $$
  with totals as (
    select member_id, count(a.id) as sessions,
      coalesce(sum(a.distance_m), 0) as distance_m,
      coalesce(sum(a.moving_sec), 0) as moving_sec
    from unnest(p_contract.member_ids) as roster(member_id)
    left join lateral private.competition_activity_rows(p_contract.sport, p_contract.starts_at, p_contract.ends_at, member_id) a
      on a.disposition = 'counted'
      and a.provenance not in ('demo', 'manual')
      and coalesce(a.journal_only, false) = false
      and coalesce(a.source_label, a.provider::text) <> 'history'
      and coalesce(a.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
    group by member_id
  )
  select coalesce(sum(case p_contract.metric when 'distance_m' then distance_m when 'moving_sec' then moving_sec
    when 'sessions' then sessions when 'contributors' then case when sessions > 0 then 1 else 0 end end), 0),
    count(*) filter (where sessions > 0)::integer from totals;
$$;