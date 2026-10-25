-- A minimal field-scoped activity ledger, read lazily for replay. Existing
-- normalized activities remain the source of truth; no second scoring write path.
create or replace function public.competition_replay(
  p_sport text, p_start timestamptz, p_end timestamptz, p_track text
) returns jsonb
language plpgsql stable security definer set search_path = ''
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
  if f.crew_id is not null and not private.is_active_crew_member(f.crew_id) then
    raise exception 'not_a_crew_member' using errcode = '42501';
  end if;
  through_at := least(statement_timestamp(), f.week_end);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'name',coalesce(cm.display_name,p.display_name,'Athlete'), 'you',p.id=uid
  ) order by p.id),'[]'::jsonb) into roster
  from unnest(f.member_ids) m(id)
  join public.profiles p on p.id=m.id
  left join public.crew_members cm on cm.crew_id=f.crew_id and cm.user_id=m.id
  where f.crew_id is null or cm.status='active';

  -- Same eligibility and half-open bounds as week_field_roster. Peer sensor
  -- values are not disclosed. GPS presentation uses distance, strength uses time.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'athleteId',a.user_id,'at',a.started_at,
    'distanceM',coalesce(a.distance_m,0),'movingSec',coalesce(a.moving_sec,0),
    'avgHr',case when a.user_id=uid then a.avg_hr else null end
  ) order by a.started_at,a.user_id,a.id),'[]'::jsonb) into ledger
  from public.activities a
  where a.user_id=any(f.member_ids)
    and (f.crew_id is null or exists (
      select 1 from public.crew_members cm where cm.crew_id=f.crew_id and cm.user_id=a.user_id and cm.status='active'
    ))
    and a.sport=f.sport and a.disposition='counted' and a.provenance<>'demo'
    and coalesce(a.source_label,a.provider::text)<>'history'
    and coalesce(a.compete_key,'') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
    and a.started_at>=f.wave_start and a.started_at<f.week_end and a.started_at<through_at
    and (p_track='open' or (a.verified and a.provenance='recorded' and f.sport in ('running','cycling','walking')));
  -- One JSON result avoids PostgREST's row limit truncating a busy week's ledger.
  return jsonb_build_object('sport',f.sport,'track',p_track,
    'periodStart',f.wave_start,'periodEnd',f.week_end,'through',through_at,
    'athletes',roster,'events',ledger,'syntheticIds',f.synthetic_ids,'scope','field');
end;
$$;
revoke all on function public.competition_replay(text,timestamptz,timestamptz,text) from public, anon;
grant execute on function public.competition_replay(text,timestamptz,timestamptz,text) to authenticated;
