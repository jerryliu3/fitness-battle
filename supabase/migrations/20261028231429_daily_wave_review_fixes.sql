-- Corrections from the full daily-wave review; preserve earlier migration history.
-- A Crew may need several capacity-bounded fields at the same benchmark.
drop index public.week_fields_crew_wave_unique;
create index week_fields_crew_wave_idx on public.week_fields(crew_id,wave_start) where crew_id is not null;

create or replace function private.finalize_week_wave(p_sport text,p_start timestamptz,p_end timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare pool jsonb; head jsonb; roster uuid[]; assigned uuid[]:='{}'; crew uuid; cap integer; f uuid;
  target_elo numeric; label text; syn text[];
begin
  if p_start>clock_timestamp() then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_sport||extract(epoch from p_start)::text,61028));
  -- Existing (including legacy/admin) fields are immutable once started.
  if exists(select 1 from public.week_fields where sport=p_sport and wave_start=p_start and week_end=p_end and roster_locked_at is not null) then return; end if;
  if exists(select 1 from public.week_fields where sport=p_sport and wave_start=p_start and week_end=p_end) then
    update public.week_fields set roster_locked_at=statement_timestamp() where sport=p_sport and wave_start=p_start and week_end=p_end;
    return;
  end if;
  with latest as (
    select distinct on (e.user_id) e.* from public.wave_enrollments e
    where e.sport=p_sport and e.wave_start<=p_start order by e.user_id,e.wave_start desc
  ), candidates as (
    select e.user_id,e.capacity,e.registered_at,
      case when e.crew_id is not null and exists(select 1 from public.crew_members m where m.crew_id=e.crew_id and m.user_id=e.user_id and m.status='active') then e.crew_id end as crew_id,
      case when p_sport in ('running','cycling') then case when r.lock_period=p_start then r.lock_verified else r.verified_elo end else case when r.lock_period=p_start then r.lock_open else r.open_elo end end as elo
    from latest e join public.sport_ratings r on r.user_id=e.user_id and r.sport=e.sport and r.opted_in
    where e.registered_at<=p_start and (
      (e.wave_start=p_start and e.week_end=p_end) or
      (e.week_end<=p_start and e.auto_enroll_next and p_start=(date_trunc('week',p_start at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York')
    )
  ) select coalesce(jsonb_agg(to_jsonb(c) order by c.crew_id nulls last,c.elo,c.registered_at,c.user_id),'[]') into pool from candidates c;
  while jsonb_array_length(pool)>0 loop
    head:=pool->0; crew:=(head->>'crew_id')::uuid; cap:=(head->>'capacity')::integer;
    select array_agg((x->>'user_id')::uuid order by x->>'user_id'),percentile_disc(0.5) within group(order by (x->>'elo')::numeric)
      into roster,target_elo from (
        select x from jsonb_array_elements(pool) x where (x->>'crew_id')::uuid is not distinct from crew and (x->>'capacity')::integer=cap
          and (crew is not null or abs((x->>'elo')::numeric-(head->>'elo')::numeric)<=400)
        order by ((x->>'user_id')::uuid=(head->>'user_id')::uuid) desc,exists(
          select 1 from public.weekly_field_choices c join public.weekly_field_choices rev
            on rev.field_id=c.field_id and rev.actor_id=c.recipient_id and rev.recipient_id=c.actor_id and rev.track=c.track and rev.repeat
          join public.week_fields source on source.id=c.field_id and source.sport=p_sport and source.week_end<=p_start
          where c.actor_id=(head->>'user_id')::uuid and c.recipient_id=(x->>'user_id')::uuid and c.repeat
            and c.expires_at>p_start and rev.expires_at>p_start and c.attempted_wave is null and rev.attempted_wave is null
        ) desc,abs((x->>'elo')::numeric-(head->>'elo')::numeric),x->>'user_id' limit cap
      ) picks;
    f:=gen_random_uuid(); syn:=private.wave_synthetics(p_sport,target_elo,cap-cardinality(roster),f::text);
    label:=coalesce((select name from public.crews where id=crew),'Open Field');
    insert into public.week_fields(id,sport,wave_start,week_end,capacity,crew_id,name,member_ids,synthetic_ids,roster_locked_at)
      values(f,p_sport,p_start,p_end,cap,crew,label,roster,syn,statement_timestamp());
    update public.wave_enrollments e set field_id=f,crew_id=crew,
      peer_ids=array(select id::text from unnest(roster) id where id<>e.user_id),synthetic_ids=syn
      where e.user_id=any(roster) and e.sport=p_sport and e.wave_start=p_start and e.week_end=p_end;
    assigned:=assigned||roster;
    select coalesce(jsonb_agg(x),'[]') into pool from jsonb_array_elements(pool) x where not (x->>'user_id')::uuid=any(roster);
  end loop;
  update public.weekly_field_choices c set attempted_wave=p_start
    where c.actor_id=any(assigned) and c.repeat and c.attempted_wave is null and c.expires_at>p_start
      and exists(select 1 from public.week_fields source where source.id=c.field_id and source.sport=p_sport and source.week_end<=p_start)
      and exists(select 1 from public.weekly_field_choices rev where rev.field_id=c.field_id and rev.actor_id=c.recipient_id
        and rev.recipient_id=c.actor_id and rev.track=c.track and rev.repeat and rev.expires_at>p_start);
end; $$;

create or replace function public.save_compete_account(p_state jsonb,p_activities jsonb,p_readiness jsonb,p_expected_updated_at timestamptz) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); old public.wave_enrollments; r jsonb; prior jsonb; metadata jsonb:='[]'; clean jsonb:='[]'; renewal_start timestamptz;
  start_at timestamptz; end_at timestamptz; registered timestamptz; fid uuid; f public.week_fields; crew uuid;
  committed timestamptz; lock_key text; old_sleep public.health_ratings; at_time timestamptz;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  -- Fixed ordering makes a multi-sport save serialize safely with finalization.
  for lock_key in select distinct k from (
    select sport||extract(epoch from wave_start)::text as k from public.wave_enrollments where user_id=uid
    union select sport||extract(epoch from private.next_daily_wave(week_end))::text from public.wave_enrollments where user_id=uid and auto_enroll_next
    union select sport||extract(epoch from ((date_trunc('week',clock_timestamp() at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York'))::text from public.wave_enrollments where user_id=uid and auto_enroll_next
    union select (e->>'sport')||extract(epoch from (e->>'waveStart')::timestamptz)::text from jsonb_array_elements(p_state->'enrollments') e
  ) locks order by k loop perform pg_advisory_xact_lock(hashtextextended(lock_key,61028)); end loop;
  at_time:=clock_timestamp();
  for old in select * from public.wave_enrollments where user_id=uid loop
    -- A stale device cannot cancel an automatic renewal after Monday's start
    -- merely because its previous enrollment has not yet been rolled forward.
    renewal_start:=(date_trunc('week',at_time at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York';
    if old.auto_enroll_next and old.week_end<=renewal_start and renewal_start<=at_time and not exists(
      select 1 from jsonb_array_elements(p_state->'enrollments') e where e->>'sport'=old.sport
        and (e->>'waveStart')::timestamptz=renewal_start and (e->>'weekEnd')::timestamptz=private.wave_week_end(renewal_start)
    ) then raise exception 'week_still_open'; end if;
    if old.wave_start<=at_time and old.week_end>at_time and not exists(
      select 1 from jsonb_array_elements(p_state->'enrollments') e where e->>'sport'=old.sport
        and (e->>'waveStart')::timestamptz=old.wave_start and (e->>'weekEnd')::timestamptz=old.week_end
        and nullif(e->>'crewId','')::uuid is not distinct from old.crew_id
    ) then raise exception 'week_still_open'; end if;
  end loop;
  for r in select value from jsonb_array_elements(p_state->'enrollments') loop
    start_at:=(r->>'waveStart')::timestamptz; end_at:=(r->>'weekEnd')::timestamptz;
    if (r->>'capacity')::integer not between 2 and 16 then raise check_violation using message='invalid_capacity'; end if;
    crew:=case when r->>'crewId' ~ '^[0-9a-fA-F-]{36}$' then (r->>'crewId')::uuid else null end;
    select * into old from public.wave_enrollments where user_id=uid and sport=r->>'sport' order by wave_start desc limit 1;
    if old.wave_start is distinct from start_at or old.week_end is distinct from end_at then
      if old.week_end<=at_time and old.auto_enroll_next then
        if start_at<>private.next_daily_wave(old.week_end) and start_at<>(date_trunc('week',at_time at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York' then
          raise exception 'invalid_renewal_window';
        end if;
      elsif start_at<>private.next_daily_wave(at_time) then raise exception 'registration_window_changed';
      end if;
      if end_at<>private.wave_week_end(start_at) then raise exception 'invalid_wave_bounds'; end if;
    end if;
    if crew is not null and not exists(select 1 from public.crew_members m join public.crews c on c.id=m.crew_id
      where m.crew_id=crew and m.user_id=uid and m.status='active' and c.sport=r->>'sport')
      and not exists(select 1 from public.week_fields where crew_id=crew and sport=r->>'sport' and wave_start=start_at and week_end=end_at and uid=any(member_ids) and roster_locked_at is not null)
      then raise exception 'not_a_crew_member'; end if;
    r:=r||jsonb_build_object('capacity',case when old.wave_start=start_at and old.week_end=end_at or old.auto_enroll_next and old.week_end<=at_time then old.capacity else 8 end);
    registered:=case when old.wave_start=start_at or old.week_end<=at_time and old.auto_enroll_next then old.registered_at else at_time end;
    select * into f from public.week_fields where sport=r->>'sport' and wave_start=start_at and week_end=end_at and uid=any(member_ids) and crew_id is not distinct from crew limit 1;
    fid:=f.id;
    metadata:=metadata||jsonb_build_array(jsonb_build_object('sport',r->>'sport','start',start_at,'registered',registered,'field',fid));
    clean:=clean||jsonb_build_array(r||jsonb_build_object('peerIds',coalesce((select jsonb_agg(id::text) from unnest(f.member_ids) id where id<>uid),'[]'::jsonb),'syntheticIds',coalesce(to_jsonb(f.synthetic_ids),'[]'::jsonb)));
  end loop;
  select * into old_sleep from public.health_ratings where user_id=uid and metric='sleep';
  select value into prior from jsonb_array_elements(p_state->'healthRatings') where value->>'metric'='sleep';
  renewal_start:=(date_trunc('week',at_time at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York';
  if old_sleep.opted_in and old_sleep.auto_enroll_next and private.wave_week_end(old_sleep.lock_period)<=renewal_start and renewal_start<=at_time
    and (not coalesce((prior->>'optedIn')::boolean,false) or (prior->>'lockPeriod')::timestamptz is distinct from renewal_start) then
    raise exception 'week_still_open';
  end if;
  if old_sleep.opted_in and old_sleep.lock_period<=at_time and private.wave_week_end(old_sleep.lock_period)>at_time
    and (coalesce((prior->>'optedIn')::boolean,false)=false or (prior->>'lockPeriod')::timestamptz<>old_sleep.lock_period) then raise exception 'week_still_open'; end if;
  if (prior->>'optedIn')::boolean and not coalesce(old_sleep.opted_in,false)
    and (prior->>'lockPeriod')::timestamptz<>private.next_daily_wave(at_time) then raise exception 'registration_window_changed'; end if;
  if (prior->>'optedIn')::boolean and old_sleep.opted_in and (prior->>'lockPeriod')::timestamptz<>old_sleep.lock_period then
    if private.wave_week_end(old_sleep.lock_period)>at_time then raise exception 'invalid_wave_bounds'; end if;
    if (prior->>'lockPeriod')::timestamptz<>private.next_daily_wave(private.wave_week_end(old_sleep.lock_period))
      and (prior->>'lockPeriod')::timestamptz<>(date_trunc('week',at_time at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York' then raise exception 'invalid_renewal_window'; end if;
  end if;
  committed:=public.save_compete_account_before_daily_waves(jsonb_set(p_state,'{enrollments}',clean),p_activities,p_readiness,p_expected_updated_at);
  update public.wave_enrollments e set registered_at=(m->>'registered')::timestamptz,field_id=(m->>'field')::uuid
    from jsonb_array_elements(metadata) m where e.user_id=uid and e.sport=m->>'sport' and e.wave_start=(m->>'start')::timestamptz;
  return committed;
end; $$;
revoke all on function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) from public,anon;
grant execute on function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) to authenticated;

create or replace function public.leave_crew(p_crew_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  is_owner boolean;
  active_count integer;
  c_name text;
  leaver text;
  windows jsonb; w jsonb; at_time timestamptz:=clock_timestamp();
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if not private.is_active_crew_member(p_crew_id) then
    raise exception 'not_a_member';
  end if;

  -- Use the account/save lock order, then all affected wave locks, before
  -- changing membership. Materialize the rounds a returning account can settle
  -- plus its current renewal, so a departure cannot retroactively reseat it.
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  with entries as (
    select * from public.wave_enrollments where user_id=uid and crew_id=p_crew_id
  ), windows as (
    select sport,wave_start,week_end from entries
    union
    select e.sport,renewal.start_at,private.wave_week_end(renewal.start_at)
    from entries e cross join lateral (
      select d at time zone 'America/New_York' as start_at
      from generate_series((e.week_end at time zone 'America/New_York')+interval '6 hours',
        (at_time at time zone 'America/New_York')+interval '1 day',interval '7 days') d
      limit 12
    ) renewal where e.auto_enroll_next
    union
    select sport,(date_trunc('week',at_time at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York',
      private.wave_week_end((date_trunc('week',at_time at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York')
    from entries where auto_enroll_next
  ) select coalesce(jsonb_agg(to_jsonb(window_row) order by sport||extract(epoch from wave_start)::text),'[]'::jsonb) into windows from windows window_row;
  for w in select value from jsonb_array_elements(windows) loop
    perform pg_advisory_xact_lock(hashtextextended((w->>'sport')||extract(epoch from (w->>'wave_start')::timestamptz)::text,61028));
  end loop;
  at_time:=clock_timestamp();
  for w in select value from jsonb_array_elements(windows) loop
    if (w->>'wave_start')::timestamptz<=at_time then
      perform private.finalize_week_wave(w->>'sport',(w->>'wave_start')::timestamptz,(w->>'week_end')::timestamptz);
    end if;
  end loop;

  select name into c_name from public.crews where id = p_crew_id;
  select display_name into leaver from public.profiles where id = uid;

  delete from public.crew_members
  where crew_id = p_crew_id and user_id = uid;

  update public.wave_enrollments
  set crew_id = null
  where user_id = uid and crew_id = p_crew_id
    and wave_start > at_time and field_id is null;

  update public.week_fields
  set member_ids = array_remove(member_ids, uid)
  where crew_id = p_crew_id and wave_start > at_time;

  select count(*) into active_count
  from public.crew_members
  where crew_id = p_crew_id and status = 'active';

  select (created_by = uid) into is_owner
  from public.crews
  where id = p_crew_id;

  if is_owner and active_count > 0 then
    update public.crews
    set created_by = (
      select user_id
      from public.crew_members
      where crew_id = p_crew_id and status = 'active'
      limit 1
    )
    where id = p_crew_id;
  elsif active_count = 0 then
    delete from public.crews where id = p_crew_id;
  end if;

  if active_count > 0 then
    insert into public.crew_notices (user_id, crew_id, kind, body)
    select created_by, id, 'member_left', coalesce(leaver, 'A member') || ' left ' || c_name || '.'
    from public.crews
    where id = p_crew_id;
  end if;

  return true;
end;
$$;

revoke all on function public.leave_crew(uuid) from public, anon;
grant execute on function public.leave_crew(uuid) to authenticated;


-- Aggregate the same per-activity effort formula used by shared/activityEffort.
-- A summed duration with null HR loses weighted effort and makes a strength
-- athlete see a different place on their own device than on a peer's device.
create function private.field_activity_effort(p_sport text,p_distance numeric,p_moving numeric,p_hr numeric) returns double precision
language sql immutable set search_path='' as $$
  with effort_input as (select coalesce(p_distance,0)::double precision as distance,
    coalesce(p_moving,0)::double precision as moving,
    case when p_hr is null then 0::double precision else greatest(0::double precision,least(1::double precision,(p_hr::double precision-110)/70))*0.12 end as hr)
  select case when p_sport='strength' then moving/3600*8*(1+hr)
    when distance<=0 then 0::double precision
    else distance/1000*(1+hr+case when distance>500 and moving>0 then greatest(0::double precision,least(1::double precision,
      ((case when p_sport='running' then 6.5 when p_sport='cycling' then 3.0 else 12 end)-moving/60/(distance/1000))/(case when p_sport='running' then 6.5 when p_sport='cycling' then 3.0 else 12 end)))*0.08 else 0::double precision end) end from effort_input;
$$;
revoke all on function private.field_activity_effort(text,numeric,numeric,numeric) from public,anon,authenticated;
drop function public.week_field_roster(uuid);
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
  if field_rec.wave_start>statement_timestamp() then raise exception 'wave_not_started'; end if;

  return query
  select
    p.id,
    coalesce(cm.display_name, p.display_name),
    coalesce(r.open_elo, 1000)::numeric,
    coalesce(sum(a.distance_m), 0)::numeric,
    coalesce(sum(a.moving_sec), 0)::numeric,
    coalesce(r.verified_elo, 1000)::numeric,
    coalesce(sum(a.distance_m) filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling', 'walking')), 0)::numeric,
    coalesce(sum(a.moving_sec) filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling', 'walking')), 0)::numeric,
    coalesce(sum(private.field_activity_effort(field_rec.sport,a.distance_m,a.moving_sec,a.avg_hr)),0)::double precision,
    coalesce(sum(private.field_activity_effort(field_rec.sport,a.distance_m,a.moving_sec,a.avg_hr)) filter (where a.verified and a.provenance='recorded' and field_rec.sport in ('running','cycling','walking')),0)::double precision
  from unnest(field_rec.member_ids) as m(id)
  join public.profiles p on p.id = m.id
  left join public.sport_ratings r
    on r.user_id = m.id and r.sport = field_rec.sport
  left join public.crew_members cm
    on cm.crew_id = field_rec.crew_id and cm.user_id = m.id
  left join lateral (
    select activity.distance_m, activity.moving_sec, activity.avg_hr, activity.verified, activity.provenance
    from public.activities activity
    where activity.user_id = m.id
      and activity.disposition = 'counted'
      and activity.provenance <> 'demo'
      and coalesce(activity.source_label, activity.provider::text) <> 'history'
      and coalesce(activity.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
      and activity.sport = field_rec.sport
      and activity.started_at >= field_rec.wave_start
      and activity.started_at < field_rec.week_end
      and activity.started_at <= statement_timestamp()
  ) a on true
  group by p.id, cm.display_name, p.display_name, r.open_elo, r.verified_elo
  order by p.id;
end;
$$;

revoke all on function public.week_field_roster(uuid) from public, anon;
grant execute on function public.week_field_roster(uuid) to authenticated;



-- Keep admin settlement's existing transaction/audit and preserve daily-wave
-- metadata on untouched sports across its delete/reinsert.
create or replace function public.admin_commit_round_before_milestones(
  p_action_id uuid, p_actor_id uuid, p_target_id uuid, p_action text, p_reason text,
  p_expected_updated_at timestamptz, p_before jsonb, p_after jsonb
) returns timestamptz
language plpgsql security invoker set search_path = ''
as $$
declare
  version timestamptz;
  committed timestamptz := clock_timestamp();
  enrollment_metadata jsonb;
begin
  select updated_at into version from public.athlete_prefs where user_id = p_target_id for update;
  if not found then raise exception 'account_not_found'; end if;
  if version is distinct from p_expected_updated_at then raise exception 'account_changed_reload_preview'; end if;
  if p_after->>'demoNow' is not null then raise exception 'simulation_clock_not_allowed'; end if;
  if jsonb_typeof(p_after->'ratings') is distinct from 'array'
    or jsonb_typeof(p_after->'enrollments') is distinct from 'array'
    or jsonb_typeof(p_after->'periodResults') is distinct from 'array'
    or jsonb_typeof(p_after->'healthRatings') is distinct from 'array'
    or jsonb_typeof(p_after->'healthResults') is distinct from 'array' then raise exception 'invalid_state'; end if;

  insert into public.admin_compete_actions(id, actor_id, target_id, action, reason, outcome, before_state, after_state, completed_at)
    values(p_action_id, p_actor_id, p_target_id, p_action, p_reason, 'succeeded', p_before, p_after, committed);

  insert into public.sport_ratings(user_id,sport,verified_elo,open_elo,opted_in,lock_verified,lock_open,lock_period)
    select p_target_id,r->>'sport',(r->>'verifiedElo')::numeric,(r->>'openElo')::numeric,(r->>'optedIn')::boolean,
      (r->>'lockVerified')::numeric,(r->>'lockOpen')::numeric,(r->>'lockPeriod')::timestamptz
    from jsonb_array_elements(p_after->'ratings') r
    on conflict(user_id,sport) do update set verified_elo=excluded.verified_elo,open_elo=excluded.open_elo,opted_in=excluded.opted_in,
      lock_verified=excluded.lock_verified,lock_open=excluded.lock_open,lock_period=excluded.lock_period;
  insert into public.period_results(user_id,period_start,sport,track,period_end,place,field_size,effort,distance_m,moving_sec,elo_before,elo_after,frozen,settled_at,acknowledged_at)
    select p_target_id,(r->>'periodStart')::timestamptz,r->>'sport',r->>'track',(r->>'periodEnd')::timestamptz,
      (r->>'place')::integer,(r->>'fieldSize')::integer,(r->>'effort')::numeric,(r->>'distanceM')::numeric,(r->>'movingSec')::numeric,
      (r->>'eloBefore')::numeric,(r->>'eloAfter')::numeric,(r->>'frozen')::boolean,(r->>'settledAt')::timestamptz,(r->>'acknowledgedAt')::timestamptz
    from jsonb_array_elements(p_after->'periodResults') r
    on conflict(user_id,period_start,sport,track) do update set period_end=excluded.period_end,place=excluded.place,field_size=excluded.field_size,
      effort=excluded.effort,distance_m=excluded.distance_m,moving_sec=excluded.moving_sec,elo_before=excluded.elo_before,elo_after=excluded.elo_after,
      frozen=excluded.frozen,settled_at=excluded.settled_at,acknowledged_at=coalesce(public.period_results.acknowledged_at,excluded.acknowledged_at);

  select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) into enrollment_metadata from public.wave_enrollments e where user_id=p_target_id;
  delete from public.wave_enrollments where user_id=p_target_id;
  insert into public.wave_enrollments(user_id,sport,wave_start,week_end,capacity,peer_ids,synthetic_ids,auto_enroll_next,crew_id)
    select p_target_id,r->>'sport',(r->>'waveStart')::timestamptz,(r->>'weekEnd')::timestamptz,(r->>'capacity')::integer,
      array(select jsonb_array_elements_text(r->'peerIds')),array(select jsonb_array_elements_text(r->'syntheticIds')),
      (r->>'autoEnrollNext')::boolean,
      case when r->>'crewId' ~ '^[0-9a-fA-F-]{36}$' then (r->>'crewId')::uuid else null end
    from jsonb_array_elements(p_after->'enrollments') r;
  update public.wave_enrollments e set registered_at=coalesce(
    (select (m->>'registered_at')::timestamptz from jsonb_array_elements(enrollment_metadata) m
      where m->>'sport'=e.sport and ((m->>'wave_start')::timestamptz=e.wave_start or (m->>'auto_enroll_next')::boolean) limit 1),
    least(committed,e.wave_start)),
    field_id=(select f.id from public.week_fields f where f.sport=e.sport and f.wave_start=e.wave_start and f.week_end=e.week_end
      and f.crew_id is not distinct from e.crew_id and p_target_id=any(f.member_ids) order by f.created_at desc,f.id limit 1)
    where e.user_id=p_target_id;
  delete from public.health_ratings where user_id=p_target_id;
  insert into public.health_ratings(user_id,metric,elo,opted_in,lock_elo,lock_period,auto_enroll_next)
    select p_target_id,r->>'metric',(r->>'elo')::numeric,(r->>'optedIn')::boolean,(r->>'lockElo')::numeric,
      (r->>'lockPeriod')::timestamptz,(r->>'autoEnrollNext')::boolean from jsonb_array_elements(p_after->'healthRatings') r;
  insert into public.health_period_results(user_id,result_id,metric,period_start,period_end,place,field_size,score,elo_before,elo_after,settled_at)
    select p_target_id,r->>'id',r->>'metric',(r->>'periodStart')::timestamptz,(r->>'periodEnd')::timestamptz,
      (r->>'place')::integer,(r->>'fieldSize')::integer,(r->>'score')::numeric,(r->>'eloBefore')::numeric,(r->>'eloAfter')::numeric,(r->>'settledAt')::timestamptz
    from jsonb_array_elements(p_after->'healthResults') r on conflict(user_id,result_id) do nothing;
  update public.athlete_prefs set clock_period_start=(p_after->'clock'->>'periodStart')::timestamptz,updated_at=committed where user_id=p_target_id;
  return committed;
end;
$$;
revoke all on function public.admin_commit_round_before_milestones(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.admin_commit_round_before_milestones(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb) to service_role;

-- An audited admin move must clear its old pointer before changing bounds, then
-- point at the destination only after its frozen membership has been updated.
create or replace function public.admin_apply_compete_scenario(
  p_action_id uuid,p_actor_id uuid,p_target_id uuid,p_expected_updated_at timestamptz,
  p_action text,p_sport text,p_reason text,p_payload jsonb,p_before jsonb
) returns timestamptz language plpgsql security invoker set search_path='' as $$
declare
  version timestamptz;
  committed timestamptz;
  field public.week_fields;
  peer uuid := (p_payload->>'peerId')::uuid;
  enrollment jsonb := p_payload->'enrollment';
  rating jsonb := p_payload->'rating';
  activity uuid := gen_random_uuid();
  category uuid;
  verified boolean := coalesce((p_payload->>'verified')::boolean,false);
  distance numeric := (p_payload->>'distanceM')::numeric;
  duration numeric := (p_payload->>'movingSec')::numeric;
  starts timestamptz := (p_payload->>'startedAt')::timestamptz;
  provider text;
  external text := 'admin-lab-' || p_action_id::text;
begin
  if p_actor_id is null or p_action is null or p_action not in ('add-activity','register','stop-renewal','resume-renewal','remove-registration','join-field','overtake','reset-activities','replay-results')
    or p_sport is null or p_sport not in ('running','cycling','walking','strength')
    or p_reason is null or length(trim(p_reason)) < 8 or length(p_reason)>1000 then raise exception 'invalid_scenario'; end if;
  -- Match field settlement lock order: fields first, then accounts in UUID order.
  if p_action in ('join-field','overtake','remove-registration') then
    perform 1 from public.week_fields where sport=p_sport and week_end > statement_timestamp()
      and (p_target_id=any(member_ids) or id=(p_payload->>'fieldId')::uuid) order by id for update;
  end if;
  perform 1 from public.athlete_prefs where user_id=p_target_id or user_id=peer order by user_id for update;
  select updated_at into version from public.athlete_prefs where user_id=p_target_id;
  if not found then raise exception 'account_not_found'; end if;
  if version is distinct from p_expected_updated_at then raise exception 'account_changed_reload_preview'; end if;
  if peer is not null then
    select updated_at into version from public.athlete_prefs where user_id=peer;
    if not found or version is distinct from (p_payload->>'peerUpdatedAt')::timestamptz then raise exception 'opponent_changed_reload_preview'; end if;
  end if;
  committed := clock_timestamp();
  if p_action in ('join-field','overtake') then
    select * into field from public.week_fields where id=(p_payload->>'fieldId')::uuid;
    if peer is null or not found or field.sport<>p_sport or field.wave_start > statement_timestamp() or field.week_end <= statement_timestamp()
      or field.updated_at is distinct from (p_payload->>'fieldUpdatedAt')::timestamptz or not(peer=any(field.member_ids)) then raise exception 'field_changed_reload_preview'; end if;
  end if;
  insert into public.admin_compete_scenarios(id,actor_id,target_id,action,sport,reason,payload,before_state)
    values(p_action_id,p_actor_id,p_target_id,p_action,p_sport,p_reason,p_payload,p_before);

  if p_action in ('add-activity','overtake') then
    if distance is null or distance<0 or distance>1000000 or duration is null or duration<=0 or duration>604800
      or starts is null or starts>statement_timestamp() or starts<'2000-01-01'::timestamptz or (p_sport='strength' and verified) then raise exception 'invalid_activity'; end if;
    if p_action='overtake' then
      if not(p_target_id=any(field.member_ids)) or starts<field.wave_start or starts>=field.week_end then raise exception 'matching_active_field_required'; end if;
      if not exists(select 1 from public.wave_enrollments where user_id=p_target_id and sport=p_sport and wave_start=field.wave_start and week_end=field.week_end)
        or not exists(select 1 from public.wave_enrollments where user_id=peer and sport=p_sport and wave_start=field.wave_start and week_end=field.week_end) then raise exception 'matching_active_enrollments_required'; end if;
    end if;
    select id into category from public.categories where slug=p_sport;
    if not found then raise exception 'sport_category_missing'; end if;
    provider := case when verified then 'strava' else 'mock' end;
    insert into public.activities(id,user_id,provider,external_id,category_id,started_at,metric_value,moving_sec,raw_name,sport,distance_m,verified,provenance,disposition,compete_key,source_label)
      values(activity,p_target_id,provider::public.fitness_provider,external,category,starts,case when p_sport='strength' then duration else distance end,duration,
        case when verified then 'Admin scenario: simulated GPS' else 'Admin scenario: manual activity' end,p_sport,distance,verified,
        case when verified then 'recorded' else 'manual' end,'counted',case when verified then provider||'-'||external else external end,case when verified then 'strava' else 'manual' end);
    insert into public.admin_scenario_activities values(activity,p_action_id,p_target_id);
  elsif p_action='register' then
    if exists(select 1 from public.wave_enrollments where user_id=p_target_id and sport=p_sport) then raise exception 'already_registered'; end if;
    if enrollment is null or enrollment->>'sport' is distinct from p_sport or rating->>'sport' is distinct from p_sport then raise exception 'invalid_registration'; end if;
    insert into public.wave_enrollments(user_id,sport,wave_start,week_end,capacity,peer_ids,synthetic_ids,auto_enroll_next,crew_id)
      values(p_target_id,p_sport,(enrollment->>'waveStart')::timestamptz,(enrollment->>'weekEnd')::timestamptz,(enrollment->>'capacity')::integer,
        array(select jsonb_array_elements_text(enrollment->'peerIds')),array(select jsonb_array_elements_text(enrollment->'syntheticIds')),true,null);
    update public.sport_ratings set opted_in=true,lock_open=(rating->>'lockOpen')::numeric,lock_verified=(rating->>'lockVerified')::numeric,
      lock_period=(rating->>'lockPeriod')::timestamptz where user_id=p_target_id and sport=p_sport;
    if not found then raise exception 'sport_rating_missing'; end if;
  elsif p_action in ('stop-renewal','resume-renewal') then
    update public.wave_enrollments set auto_enroll_next=(p_action='resume-renewal') where user_id=p_target_id and sport=p_sport;
    if not found then raise exception 'registration_required'; end if;
  elsif p_action='remove-registration' then
    delete from public.wave_enrollments where user_id=p_target_id and sport=p_sport;
    update public.sport_ratings set opted_in=false where user_id=p_target_id and sport=p_sport;
    update public.week_fields set member_ids=array_remove(member_ids,p_target_id),updated_at=committed
      where sport=p_sport and week_end>statement_timestamp() and p_target_id=any(member_ids);
  elsif p_action='join-field' then
    if field.crew_id is not null and not exists(select 1 from public.crew_members where crew_id=field.crew_id and user_id=p_target_id and status='active') then raise exception 'join_crew_first'; end if;
    if not(p_target_id=any(field.member_ids)) and cardinality(field.member_ids)>=field.capacity then raise exception 'field_full'; end if;
    update public.wave_enrollments set field_id=null,wave_start=field.wave_start,week_end=field.week_end,capacity=field.capacity,
      peer_ids=array(select x::text from unnest(field.member_ids) x where x<>p_target_id),synthetic_ids=field.synthetic_ids,crew_id=field.crew_id
      where user_id=p_target_id and sport=p_sport;
    if not found then raise exception 'register_sport_first'; end if;
    update public.week_fields set member_ids=array_remove(member_ids,p_target_id),updated_at=committed
      where sport=p_sport and week_end>statement_timestamp() and p_target_id=any(member_ids) and id<>field.id;
    update public.week_fields set member_ids=case when p_target_id=any(member_ids) then member_ids else array_append(member_ids,p_target_id) end,
      updated_at=committed where id=field.id;
    update public.wave_enrollments set field_id=field.id,registered_at=least(registered_at,field.wave_start) where user_id=p_target_id and sport=p_sport;
    update public.sport_ratings set lock_period=field.wave_start,lock_open=open_elo,lock_verified=verified_elo where user_id=p_target_id and sport=p_sport;
  elsif p_action='reset-activities' then
    delete from public.activities a using public.admin_scenario_activities generated
      where a.id=generated.activity_id and generated.user_id=p_target_id and a.sport=p_sport;
  elsif p_action='replay-results' then
    update public.period_results set acknowledged_at=null where user_id=p_target_id and sport=p_sport
      and period_start=(select max(period_start) from public.period_results where user_id=p_target_id and sport=p_sport);
    if not found then raise exception 'settle_a_round_first'; end if;
  end if;
  update public.athlete_prefs set updated_at=committed where user_id=p_target_id;
  return committed;
end;
$$;
revoke all on function public.admin_apply_compete_scenario(uuid,uuid,uuid,timestamptz,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.admin_apply_compete_scenario(uuid,uuid,uuid,timestamptz,text,text,text,jsonb,jsonb) to service_role;
