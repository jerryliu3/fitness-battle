-- Server acceptance history freezes competition facts at the exclusive deadline.
-- Training rows stay editable; no cron or client clock chooses a closed score.
create table private.competition_fact_versions (
  version bigint generated always as identity primary key,
  owner_id uuid not null,
  kind text not null check(kind in ('activity','sleep')),
  record_key text not null,
  accepted_at timestamptz not null default clock_timestamp(),
  transaction_id xid8 not null default pg_current_xact_id(),
  deleted boolean not null default false,
  fact jsonb not null
);
create index competition_facts_owner_idx on private.competition_fact_versions(owner_id,kind,record_key,accepted_at desc,version desc);
create index competition_facts_kind_idx on private.competition_fact_versions(kind,accepted_at);
alter table private.competition_fact_versions enable row level security;
revoke all on private.competition_fact_versions from public,anon,authenticated;

create function private.capture_competition_fact() returns trigger language plpgsql security definer set search_path='' as $$
declare before_fact jsonb; after_fact jsonb; fact_kind text; owner uuid; record_id text; end_at timestamptz; lock_key bigint;
begin
  fact_kind:=case when tg_table_name='activities' then 'activity' else 'sleep' end;
  if fact_kind='activity' then
    if tg_op<>'INSERT' then before_fact:=jsonb_build_object('id',old.id,'user_id',old.user_id,'sport',old.sport,'started_at',old.started_at,'distance_m',old.distance_m,'moving_sec',old.moving_sec,'avg_hr',old.avg_hr,'verified',old.verified,'provenance',old.provenance,'disposition',old.disposition,'compete_key',old.compete_key,'source_label',old.source_label,'provider',old.provider); end if;
    if tg_op<>'DELETE' then after_fact:=jsonb_build_object('id',new.id,'user_id',new.user_id,'sport',new.sport,'started_at',new.started_at,'distance_m',new.distance_m,'moving_sec',new.moving_sec,'avg_hr',new.avg_hr,'verified',new.verified,'provenance',new.provenance,'disposition',new.disposition,'compete_key',new.compete_key,'source_label',new.source_label,'provider',new.provider); end if;
  else
    if tg_op<>'INSERT' then before_fact:=to_jsonb(old); end if;
    if tg_op<>'DELETE' then after_fact:=to_jsonb(new); end if;
  end if;
  if tg_op='UPDATE' and before_fact=after_fact then return new; end if;
  owner:=(coalesce(after_fact,before_fact)->>'user_id')::uuid;
  record_id:=case when fact_kind='activity' then coalesce(after_fact,before_fact)->>'id' else coalesce(after_fact,before_fact)->>'night_id' end;
  -- Serialize acceptance with a deadline read. Accepted in-flight writes finish
  -- before a closing reader; a write waiting beyond the cutoff receives no credit.
  for lock_key in select distinct hashtextextended('competition-close:'||extract(epoch from finish)::text,29001) from (
    select private.wave_week_end(case when fact_kind='activity' then (x->>'started_at')::timestamptz else ((x->>'day')::date+time '12:00') at time zone 'America/New_York' end) as finish
    from jsonb_array_elements(jsonb_build_array(before_fact,after_fact)) x where x<>'null'::jsonb
    union select f.week_end from public.week_fields f where fact_kind='activity' and (f.sport=before_fact->>'sport' or f.sport=after_fact->>'sport') and owner=any(f.member_ids)
      and ((before_fact->>'started_at')::timestamptz>=f.wave_start and (before_fact->>'started_at')::timestamptz<f.week_end or (after_fact->>'started_at')::timestamptz>=f.wave_start and (after_fact->>'started_at')::timestamptz<f.week_end)
  ) ends order by 1 loop perform pg_advisory_xact_lock_shared(lock_key); end loop;
  insert into private.competition_fact_versions(owner_id,kind,record_key,deleted,fact) values(owner,fact_kind,record_id,tg_op='DELETE',coalesce(after_fact,before_fact));
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;
revoke all on function private.capture_competition_fact() from public,anon,authenticated;
create trigger competition_activity_acceptance after insert or update or delete on public.activities for each row execute function private.capture_competition_fact();
create trigger competition_sleep_acceptance after insert or update or delete on public.sleep_nights for each row execute function private.capture_competition_fact();

-- Grandfather the currently stored facts. Earlier revisions cannot be recreated;
-- existing archived results are preserved rather than recomputed on upgrade.
insert into private.competition_fact_versions(owner_id,kind,record_key,accepted_at,fact)
select user_id,'activity',id::text,least(created_at,clock_timestamp()),to_jsonb(a)-array['summary_polyline','detailed_polyline','route_replay','route_bounds'] from public.activities a;
insert into private.competition_fact_versions(owner_id,kind,record_key,fact)
select user_id,'sleep',night_id,to_jsonb(n) from public.sleep_nights n;

create function private.competition_activity_rows_snapshot(p_sport text,p_start timestamptz,p_end timestamptz,p_owner uuid default null) returns setof public.activities
language sql volatile security definer set search_path='' as $$
with latest as (
    select distinct on(owner_id,record_key) * from private.competition_fact_versions
    where kind='activity' and (p_owner is null or owner_id=p_owner) and accepted_at<least(p_end,clock_timestamp())
    order by owner_id,record_key,accepted_at desc,version desc
  ) select a.* from latest v cross join lateral jsonb_populate_record(null::public.activities,v.fact) a
    where not v.deleted and a.sport=p_sport and a.started_at>=p_start and a.started_at<p_end and a.started_at<=clock_timestamp();
$$;
create function private.competition_activity_rows(p_sport text,p_start timestamptz,p_end timestamptz,p_owner uuid default null) returns setof public.activities
language plpgsql volatile security definer set search_path='' as $$
begin
  if p_end<=clock_timestamp() then perform pg_advisory_xact_lock(hashtextextended('competition-close:'||extract(epoch from p_end)::text,29001)); end if;
  return query select * from private.competition_activity_rows_snapshot(p_sport,p_start,p_end,p_owner);
end; $$;
create function private.competition_sleep_rows(p_owner uuid,p_start timestamptz,p_end timestamptz) returns setof public.sleep_nights
language plpgsql volatile security definer set search_path='' as $$
begin
  if p_end<=clock_timestamp() then perform pg_advisory_xact_lock(hashtextextended('competition-close:'||extract(epoch from p_end)::text,29001)); end if;
  return query with latest as (
    select distinct on(record_key) * from private.competition_fact_versions where owner_id=p_owner and kind='sleep' and accepted_at<least(p_end,clock_timestamp())
    order by record_key,accepted_at desc,version desc
  ) select n.* from latest v cross join lateral jsonb_populate_record(null::public.sleep_nights,v.fact) n
    where not v.deleted and n.day>=(p_start at time zone 'America/New_York')::date and n.day<(p_end at time zone 'America/New_York')::date;
end; $$;
revoke all on function private.competition_activity_rows(text,timestamptz,timestamptz,uuid),private.competition_sleep_rows(uuid,timestamptz,timestamptz) from public,anon,authenticated;

create function public.competition_own_facts(p_sport text,p_start timestamptz,p_end timestamptz) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_end<=p_start or p_end>p_start+interval '8 days' then raise exception 'invalid_bounds'; end if;
  if p_sport='sleep' then select coalesce(jsonb_agg(to_jsonb(n)),'[]'::jsonb) into result from private.competition_sleep_rows(uid,p_start,p_end) n;
  else select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) into result from private.competition_activity_rows(p_sport,p_start,p_end,uid) a; end if;
  return result;
end; $$;
create function public.competition_input_revision() returns bigint language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  return (select count(*) from private.competition_fact_versions where owner_id=auth.uid());
end; $$;
revoke all on function public.competition_own_facts(text,timestamptz,timestamptz),public.competition_input_revision() from public,anon;
grant execute on function public.competition_own_facts(text,timestamptz,timestamptz),public.competition_input_revision() to authenticated;

-- Opponent ratings used by settlement must not change when another account rolls.
alter table public.week_fields add column entry_ratings jsonb not null default '{}';
create function private.capture_field_entry_ratings() returns trigger language plpgsql security definer set search_path='' as $$
begin
  select coalesce(jsonb_object_agg(r.user_id::text,jsonb_build_object('open',case when r.lock_period=new.wave_start then r.lock_open else r.open_elo end,'verified',case when r.lock_period=new.wave_start then r.lock_verified else r.verified_elo end)),'{}'::jsonb)
  into new.entry_ratings from public.sport_ratings r where r.sport=new.sport and r.user_id=any(new.member_ids);
  return new;
end; $$;
revoke all on function private.capture_field_entry_ratings() from public,anon,authenticated;
create trigger week_field_entry_ratings before insert on public.week_fields for each row execute function private.capture_field_entry_ratings();
update public.week_fields f set entry_ratings=coalesce((select jsonb_object_agg(r.user_id::text,jsonb_build_object('open',r.open_elo,'verified',r.verified_elo)) from public.sport_ratings r where r.sport=f.sport and r.user_id=any(f.member_ids)),'{}'::jsonb);

-- Only the authenticated application server can commit derived score documents.
revoke all on public.sport_ratings,public.period_results,public.health_ratings,public.health_period_results,public.effort_milestones,public.period_freezes,public.athlete_prefs,public.activities,public.sleep_nights,public.readiness_marks from anon,authenticated;
grant select on public.sport_ratings,public.period_results,public.health_ratings,public.health_period_results,public.effort_milestones,public.period_freezes,public.athlete_prefs,public.activities,public.sleep_nights,public.readiness_marks to authenticated;
revoke all on function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) from authenticated;
grant execute on function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) to service_role;
create function public.save_compete_account_server(p_user_id uuid,p_state jsonb,p_activities jsonb,p_readiness jsonb,p_expected_updated_at timestamptz,p_expected_receipts bigint,p_computed_at timestamptz) returns timestamptz
language plpgsql security invoker set search_path='' as $$
declare committed timestamptz;
begin
  if current_user not in ('service_role','postgres') then raise exception 'server_required'; end if;
  if (select count(*) from private.competition_fact_versions where owner_id=p_user_id)<>p_expected_receipts then raise exception 'competition_inputs_changed'; end if;
  if p_computed_at is null or exists(select 1 from public.wave_enrollments where user_id=p_user_id and week_end>p_computed_at and week_end<=clock_timestamp())
    or exists(select 1 from public.health_ratings where user_id=p_user_id and opted_in and private.wave_week_end(lock_period)>p_computed_at and private.wave_week_end(lock_period)<=clock_timestamp()) then raise exception 'competition_clock_changed'; end if;
  perform set_config('request.jwt.claim.sub',p_user_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',p_user_id,'role','service_role')::text,true);
  committed:=public.save_compete_account(p_state,p_activities,p_readiness,p_expected_updated_at);
  if (select count(*) from private.competition_fact_versions where owner_id=p_user_id and transaction_id<>pg_current_xact_id())<>p_expected_receipts then raise exception 'competition_inputs_changed'; end if;
  return committed;
end; $$;
revoke all on function public.save_compete_account_server(uuid,jsonb,jsonb,jsonb,timestamptz,bigint,timestamptz) from public,anon,authenticated;
grant usage on schema private to service_role;
grant select on private.competition_fact_versions to service_role;
grant execute on function private.wave_week_end(timestamptz) to service_role;
grant execute on function public.save_compete_account_server(uuid,jsonb,jsonb,jsonb,timestamptz,bigint,timestamptz) to service_role;

create function private.remove_competition_facts_for_deleted_user() returns trigger language plpgsql security definer set search_path='' as $$begin delete from private.competition_fact_versions where owner_id=old.id; return old; end; $$;
revoke all on function private.remove_competition_facts_for_deleted_user() from public,anon,authenticated;
create trigger remove_competition_facts after delete on auth.users for each row execute function private.remove_competition_facts_for_deleted_user();

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
    coalesce((field_rec.entry_ratings->p.id::text->>'open')::numeric,r.open_elo,1000)::numeric,
    coalesce(sum(a.distance_m), 0)::numeric,
    coalesce(sum(a.moving_sec), 0)::numeric,
    coalesce((field_rec.entry_ratings->p.id::text->>'verified')::numeric,r.verified_elo,1000)::numeric,
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
    from private.competition_activity_rows(field_rec.sport,field_rec.wave_start,field_rec.week_end,m.id) activity
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
  left join public.crew_members cm on cm.crew_id=f.crew_id and cm.user_id=m.id
;

  -- Same eligibility and half-open bounds as week_field_roster. Peer sensor
  -- values are not disclosed. GPS presentation uses distance, strength uses time.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'athleteId',a.user_id,'at',a.started_at,
    'distanceM',coalesce(a.distance_m,0),'movingSec',coalesce(a.moving_sec,0),
    'avgHr',case when a.user_id=uid then a.avg_hr else null end
  ) order by a.started_at,a.user_id,a.id),'[]'::jsonb) into ledger
  from unnest(f.member_ids) replay_member cross join lateral private.competition_activity_rows(f.sport,f.wave_start,f.week_end,replay_member) a
  where a.user_id=any(f.member_ids)
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

-- Upsert unchanged sleep inputs instead of generating deletion/reinsertion receipts.
create or replace function public.save_compete_account_before_milestones(p_state jsonb, p_activities jsonb, p_readiness jsonb, p_expected_updated_at timestamptz)
returns timestamptz language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  version timestamptz;
  committed timestamptz := clock_timestamp();
begin
  if uid is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select updated_at into version from public.athlete_prefs where user_id=uid for update;
  if version is distinct from p_expected_updated_at then raise exception 'account_changed_reload'; end if;
  if p_state->>'demoNow' is not null then raise exception 'simulation_clock_not_allowed'; end if;
  if exists(select 1 from jsonb_array_elements(p_activities || p_readiness) r where r->>'user_id' is distinct from uid::text) then
    raise exception 'account_mismatch';
  end if;

  insert into public.profiles(id,display_name,city,primary_sport,avatar_url,updated_at)
    values(uid,coalesce(nullif(left(p_state->>'name',80),''),'Athlete'),left(p_state->>'city',80),p_state->>'primary',p_state->>'avatarUrl',committed)
    on conflict(id) do update set display_name=excluded.display_name,city=excluded.city,primary_sport=excluded.primary_sport,avatar_url=excluded.avatar_url,updated_at=excluded.updated_at;
  insert into public.athlete_prefs(user_id,freezes_left,calibrated,onboarding_completed,lesson_done_on,training_goal_distance,training_goal_deadline,clock_period_start,focus_family,focus_id,units,updated_at)
    values(uid,(p_state->>'freezesLeft')::integer,(p_state->>'calibrated')::boolean,(p_state->>'onboardingCompleted')::boolean,
      (p_state->>'lessonDoneOn')::date,p_state->'trainingGoal'->>'distance',(p_state->'trainingGoal'->>'deadline')::date,
      (p_state->'clock'->>'periodStart')::timestamptz,p_state->'focus'->>'family',p_state->'focus'->>'id',
      case when p_state->>'units'='metric' then 'metric' else 'us' end,committed)
    on conflict(user_id) do update set freezes_left=excluded.freezes_left,calibrated=excluded.calibrated,onboarding_completed=excluded.onboarding_completed,
      lesson_done_on=excluded.lesson_done_on,training_goal_distance=excluded.training_goal_distance,training_goal_deadline=excluded.training_goal_deadline,
      clock_period_start=excluded.clock_period_start,focus_family=excluded.focus_family,focus_id=excluded.focus_id,units=excluded.units,updated_at=excluded.updated_at;
  insert into public.sport_ratings(user_id,sport,verified_elo,open_elo,opted_in,lock_verified,lock_open,lock_period)
    select uid,r->>'sport',(r->>'verifiedElo')::numeric,(r->>'openElo')::numeric,(r->>'optedIn')::boolean,
      (r->>'lockVerified')::numeric,(r->>'lockOpen')::numeric,(r->>'lockPeriod')::timestamptz
    from jsonb_array_elements(p_state->'ratings') r
    on conflict(user_id,sport) do update set verified_elo=excluded.verified_elo,open_elo=excluded.open_elo,opted_in=excluded.opted_in,
      lock_verified=excluded.lock_verified,lock_open=excluded.lock_open,lock_period=excluded.lock_period;
  insert into public.period_results(user_id,period_start,sport,track,period_end,place,field_size,effort,distance_m,moving_sec,elo_before,elo_after,frozen,settled_at,acknowledged_at)
    select uid,(r->>'periodStart')::timestamptz,r->>'sport',r->>'track',(r->>'periodEnd')::timestamptz,
      (r->>'place')::integer,(r->>'fieldSize')::integer,(r->>'effort')::numeric,(r->>'distanceM')::numeric,(r->>'movingSec')::numeric,
      (r->>'eloBefore')::numeric,(r->>'eloAfter')::numeric,(r->>'frozen')::boolean,(r->>'settledAt')::timestamptz,(r->>'acknowledgedAt')::timestamptz
    from jsonb_array_elements(p_state->'periodResults') r
    on conflict(user_id,period_start,sport,track) do update set period_end=excluded.period_end,place=excluded.place,field_size=excluded.field_size,
      effort=excluded.effort,distance_m=excluded.distance_m,moving_sec=excluded.moving_sec,elo_before=excluded.elo_before,elo_after=excluded.elo_after,
      frozen=excluded.frozen,settled_at=excluded.settled_at,acknowledged_at=coalesce(public.period_results.acknowledged_at,excluded.acknowledged_at);

  delete from public.wave_enrollments where user_id=uid;
  insert into public.wave_enrollments(user_id,sport,wave_start,week_end,capacity,peer_ids,synthetic_ids,auto_enroll_next,crew_id)
    select uid,r->>'sport',(r->>'waveStart')::timestamptz,(r->>'weekEnd')::timestamptz,(r->>'capacity')::integer,
      array(select jsonb_array_elements_text(r->'peerIds')),array(select jsonb_array_elements_text(r->'syntheticIds')),
      (r->>'autoEnrollNext')::boolean,
      case when r->>'crewId' ~ '^[0-9a-fA-F-]{36}$' then (r->>'crewId')::uuid else null end
    from jsonb_array_elements(p_state->'enrollments') r;
  delete from public.health_ratings where user_id=uid;
  insert into public.health_ratings(user_id,metric,elo,opted_in,lock_elo,lock_period,auto_enroll_next)
    select uid,r->>'metric',(r->>'elo')::numeric,(r->>'optedIn')::boolean,(r->>'lockElo')::numeric,
      (r->>'lockPeriod')::timestamptz,(r->>'autoEnrollNext')::boolean from jsonb_array_elements(p_state->'healthRatings') r;
  insert into public.health_period_results(user_id,result_id,metric,period_start,period_end,place,field_size,score,elo_before,elo_after,settled_at)
    select uid,r->>'id',r->>'metric',(r->>'periodStart')::timestamptz,(r->>'periodEnd')::timestamptz,
      (r->>'place')::integer,(r->>'fieldSize')::integer,(r->>'score')::numeric,(r->>'eloBefore')::numeric,(r->>'eloAfter')::numeric,(r->>'settledAt')::timestamptz
    from jsonb_array_elements(p_state->'healthResults') r on conflict(user_id,result_id) do nothing;

  delete from public.period_freezes where user_id=uid;
  insert into public.period_freezes(user_id,period_start)
    select uid,value::timestamptz from jsonb_array_elements_text(p_state->'frozenPeriods');
  insert into public.sleep_nights(user_id,night_id,day,score,duration_min,efficiency,deep_min,rem_min,light_min,awake_min,source,verified)
    select uid,r->>'id',(r->>'day')::date,(r->>'score')::numeric,(r->>'durationMin')::numeric,(r->>'efficiency')::numeric,
      (r->>'deepMin')::numeric,(r->>'remMin')::numeric,(r->>'lightMin')::numeric,(r->>'awakeMin')::numeric,r->>'source',(r->>'verified')::boolean
      from jsonb_array_elements(p_state->'sleepNights') r
    on conflict(user_id,night_id) do update set day=excluded.day,score=excluded.score,duration_min=excluded.duration_min,efficiency=excluded.efficiency,
      deep_min=excluded.deep_min,rem_min=excluded.rem_min,light_min=excluded.light_min,awake_min=excluded.awake_min,source=excluded.source,verified=excluded.verified;
  delete from public.compete_duels where user_id=uid;
  insert into public.compete_duels(user_id,duel_id,sport,period_start,rival_id,rival_name,rival_elo,source)
    select uid,r->>'id',r->>'sport',(r->>'periodStart')::timestamptz,r->>'rivalId',r->>'rivalName',(r->>'rivalElo')::numeric,r->>'source'
      from jsonb_array_elements(p_state->'duels') r;

  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,moving_sec,avg_hr,raw_name,sport,distance_m,verified,provenance,disposition,disposition_reason,compete_key,source_label)
    select uid,r.provider,r.external_id,r.category_id,r.started_at,r.metric_value,r.moving_sec,r.avg_hr,r.raw_name,r.sport,r.distance_m,r.verified,r.provenance,r.disposition,r.disposition_reason,r.compete_key,r.source_label
      from jsonb_populate_recordset(null::public.activities,p_activities) r
    on conflict(user_id,provider,external_id) do update set category_id=excluded.category_id,started_at=excluded.started_at,metric_value=excluded.metric_value,
      moving_sec=excluded.moving_sec,avg_hr=excluded.avg_hr,raw_name=excluded.raw_name,sport=excluded.sport,distance_m=excluded.distance_m,
      verified=excluded.verified,provenance=excluded.provenance,disposition=excluded.disposition,disposition_reason=excluded.disposition_reason,
      compete_key=excluded.compete_key,source_label=excluded.source_label;
  insert into public.readiness_marks(user_id,provider,external_id,day,score)
    select uid,r.provider,r.external_id,r.day,r.score from jsonb_populate_recordset(null::public.readiness_marks,p_readiness) r
    on conflict(user_id,provider,external_id) do update set day=excluded.day,score=excluded.score;
  return committed;
end;
$$;

revoke all on function private.competition_activity_rows_snapshot(text,timestamptz,timestamptz,uuid) from public,anon,authenticated;
grant execute on function private.competition_activity_rows_snapshot(text,timestamptz,timestamptz,uuid) to service_role;

-- Receipt validation uses the same deadline facts as standings and settlement.
create or replace function private.store_effort_receipts(p_user uuid,p_state jsonb) returns void
language plpgsql set search_path='' as $$
declare r jsonb; prior public.effort_milestones; volume numeric; base numeric; price numeric;
begin
  for r in select value from jsonb_array_elements(coalesce(p_state->'effortMilestones','[]'::jsonb)) loop
    select * into prior from public.effort_milestones where user_id=p_user and sport=r->>'sport' and track=r->>'track' and period_start=(r->>'periodStart')::timestamptz;
    if found then
      if (r->>'step')::numeric <> prior.step or (r->>'periodEnd')::timestamptz <> prior.period_end or (r->>'earned')::integer < prior.earned then
        raise exception 'milestone_receipt_changed';
      end if;
      if (r->>'earned')::integer = prior.earned then continue; end if;
    elsif not exists(select 1 from jsonb_array_elements(coalesce(p_state->'enrollments','[]'::jsonb)) e where e->>'sport'=r->>'sport' and (e->>'waveStart')::timestamptz=(r->>'periodStart')::timestamptz)
      and not exists(select 1 from jsonb_array_elements(coalesce(p_state->'periodResults','[]'::jsonb)) e where e->>'sport'=r->>'sport' and (e->>'periodStart')::timestamptz=(r->>'periodStart')::timestamptz) then
      raise exception 'milestone_sport_not_active';
    end if;
    base := case r->>'sport' when 'cycling' then 8046.72 when 'strength' then 1800 else 1609.344 end;
    price := (r->>'step')::numeric/base;
    if price not in (1,1.5,2,2.5,3,4,5) or (r->>'sport'='strength' and r->>'track'='verified') then raise exception 'invalid_milestone_step'; end if;
    select coalesce(sum(case when r->>'sport'='strength' then a.moving_sec else a.distance_m end),0) into volume
      from private.competition_activity_rows_snapshot(r->>'sport',(r->>'periodStart')::timestamptz,(r->>'periodEnd')::timestamptz,p_user) a where a.user_id=p_user and a.sport=r->>'sport'
      and a.started_at >= (r->>'periodStart')::timestamptz and a.started_at < (r->>'periodEnd')::timestamptz and a.started_at <= statement_timestamp()
      and a.disposition='counted' and a.provenance<>'demo' and coalesce(a.source_label,a.provider::text)<>'history'
      and coalesce(a.compete_key,'') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
      and (r->>'track'='open' or (a.verified and a.provenance='recorded' and a.sport<>'strength'));
    if (r->>'earned')::integer > greatest(coalesce(prior.earned,0),floor(volume/(r->>'step')::numeric)) then raise exception 'milestone_volume_mismatch'; end if;
    insert into public.effort_milestones values(p_user,r->>'sport',r->>'track',(r->>'periodStart')::timestamptz,(r->>'periodEnd')::timestamptz,(r->>'step')::numeric,(r->>'earned')::integer)
      on conflict(user_id,sport,track,period_start) do update set earned=greatest(public.effort_milestones.earned,excluded.earned);
  end loop;
end; $$;
revoke all on function private.store_effort_receipts(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.store_effort_receipts(uuid,jsonb) to service_role;


-- Client writes are now closed; legitimate server-derived Elo losses must persist.
drop trigger sport_score_only_grows on public.sport_ratings;
