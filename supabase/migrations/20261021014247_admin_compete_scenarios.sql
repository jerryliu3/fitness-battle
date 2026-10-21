-- Admin-only scenario orchestration. Product readers need no scenario modes.
create table public.admin_compete_scenarios (
  id uuid primary key,
  actor_id uuid references auth.users(id) on delete set null,
  target_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  sport text not null,
  reason text not null,
  payload jsonb not null,
  before_state jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);
create table public.admin_scenario_activities (
  activity_id uuid primary key references public.activities(id) on delete cascade,
  action_id uuid not null references public.admin_compete_scenarios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade
);
create index admin_scenario_activities_user_idx on public.admin_scenario_activities(user_id);
alter table public.admin_compete_scenarios enable row level security;
alter table public.admin_scenario_activities enable row level security;
revoke all on public.admin_compete_scenarios,public.admin_scenario_activities from public,anon,authenticated;
grant all on public.admin_compete_scenarios,public.admin_scenario_activities to service_role;

create function public.admin_apply_compete_scenario(
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
    update public.wave_enrollments set wave_start=field.wave_start,week_end=field.week_end,capacity=field.capacity,
      peer_ids=array(select x::text from unnest(field.member_ids) x where x<>p_target_id),synthetic_ids=field.synthetic_ids,crew_id=field.crew_id
      where user_id=p_target_id and sport=p_sport;
    if not found then raise exception 'register_sport_first'; end if;
    update public.week_fields set member_ids=array_remove(member_ids,p_target_id),updated_at=committed
      where sport=p_sport and week_end>statement_timestamp() and p_target_id=any(member_ids) and id<>field.id;
    update public.week_fields set member_ids=case when p_target_id=any(member_ids) then member_ids else array_append(member_ids,p_target_id) end,
      updated_at=committed where id=field.id;
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
