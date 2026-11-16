-- Walking replay shares field membership authorization and max-per-day step totals.
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

  if f.sport = 'walking' and p_track = 'open' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', 'walking:' || d.user_id::text || ':' || d.day::text,
      'athleteId', d.user_id, 'at', greatest(f.wave_start, d.day::timestamp at time zone 'America/New_York'),
      'distanceM', 0, 'movingSec', 0, 'effort', d.steps
    ) order by d.day, d.user_id), '[]'::jsonb) into ledger
    from (
      select h.user_id, h.day, max(coalesce(h.steps, 0))::bigint as steps
      from public.daily_health_readings h
      where h.user_id = any(f.member_ids)
        and h.day >= (f.wave_start at time zone 'America/New_York')::date
        and h.day < (f.week_end at time zone 'America/New_York')::date
        and h.day <= (through_at at time zone 'America/New_York')::date
      group by h.user_id, h.day
    ) d where d.steps > 0;
  else
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
  end if;
  return jsonb_build_object('sport',f.sport,'track',p_track,
    'periodStart',f.wave_start,'periodEnd',f.week_end,'through',through_at,
    'athletes',roster,'events',ledger,'syntheticIds',f.synthetic_ids,'scope','field');
end;
$$;
