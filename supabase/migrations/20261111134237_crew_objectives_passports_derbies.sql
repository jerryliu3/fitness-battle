-- Cooperative objectives and durable passport receipts. Sport events remain the
-- authority for Derby dates, registration, scores and results.
create table public.crew_seasons (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 80),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  time_zone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  check (isfinite(starts_at) and isfinite(ends_at) and ends_at > starts_at),
  unique (id, crew_id)
);
create index crew_seasons_window_idx on public.crew_seasons(crew_id, starts_at, ends_at);

create table public.crew_contracts (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  season_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 80),
  sport text not null,
  metric text not null check (metric in ('distance_m', 'moving_sec', 'sessions', 'contributors')),
  target numeric not null check (target > 0 and target < 'Infinity'::numeric),
  period_kind public.period_kind not null default 'weekly',
  time_zone text not null default 'America/New_York',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  member_ids uuid[] not null check (cardinality(member_ids) between 1 and 8),
  rule_version smallint not null default 1 check (rule_version > 0),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  settled_at timestamptz,
  result_value numeric,
  result_contributors integer,
  foreign key (season_id, crew_id) references public.crew_seasons(id, crew_id),
  check (isfinite(starts_at) and isfinite(ends_at) and ends_at > starts_at),
  check ((settled_at is null and result_value is null and result_contributors is null)
    or (settled_at is not null and result_value is not null and result_contributors is not null
      and result_value >= 0 and result_value < 'Infinity'::numeric
      and result_contributors between 0 and cardinality(member_ids))),
  check (cancelled_at is null or settled_at is null)
);
create unique index crew_contracts_one_per_period on public.crew_contracts(crew_id, starts_at) where cancelled_at is null;
create index crew_contracts_season_idx on public.crew_contracts(season_id, crew_id);
create index crew_contracts_due_idx on public.crew_contracts(crew_id, ends_at) where settled_at is null and cancelled_at is null;

create table public.crew_passport_stamps (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.crew_contracts(id) on delete cascade,
  code text not null check (char_length(code) between 1 and 64),
  rule_version smallint not null default 1 check (rule_version > 0),
  earned_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (contract_id, code)
);

alter table public.crew_seasons enable row level security;
alter table public.crew_contracts enable row level security;
alter table public.crew_passport_stamps enable row level security;
revoke all on public.crew_seasons, public.crew_contracts, public.crew_passport_stamps from public, anon, authenticated;
grant select on public.crew_seasons, public.crew_contracts, public.crew_passport_stamps to authenticated;
create policy crew_seasons_read on public.crew_seasons for select to authenticated using (private.is_active_crew_member(crew_id));
create policy crew_contracts_read on public.crew_contracts for select to authenticated using (private.is_active_crew_member(crew_id));
create policy crew_passport_stamps_read on public.crew_passport_stamps for select to authenticated using (
  exists (select 1 from public.crew_contracts c where c.id = contract_id and private.is_active_crew_member(c.crew_id))
);

-- The existing immutable input history owns eligibility and exclusive deadlines.
-- The initial writer creates weekly contracts only; period_kind leaves room for
-- other cadences without introducing a competing period or activity ledger.
create function private.crew_contract_progress(p_contract public.crew_contracts)
returns table (value numeric, contributors integer)
language sql volatile security definer set search_path = '' as $$
  with totals as (
    select member_id, count(a.id) as sessions,
      coalesce(sum(a.distance_m), 0) as distance_m,
      coalesce(sum(a.moving_sec), 0) as moving_sec
    from unnest(p_contract.member_ids) as roster(member_id)
    left join lateral private.competition_activity_rows(p_contract.sport, p_contract.starts_at, p_contract.ends_at, member_id) a
      on a.disposition = 'counted' and a.provenance <> 'demo'
      and coalesce(a.source_label, a.provider::text) <> 'history'
      and coalesce(a.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
    group by member_id
  )
  select coalesce(sum(case p_contract.metric when 'distance_m' then distance_m when 'moving_sec' then moving_sec
    when 'sessions' then sessions when 'contributors' then case when sessions > 0 then 1 else 0 end end), 0),
    count(*) filter (where sessions > 0)::integer from totals;
$$;
revoke all on function private.crew_contract_progress(public.crew_contracts) from public, anon, authenticated;

create function private.settle_crew_contracts(p_crew_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare contract public.crew_contracts; score record;
begin
  -- All callers take this crew lock first, serializing replacement and settlement.
  for contract in select * from public.crew_contracts where crew_id = p_crew_id
    and cancelled_at is null and settled_at is null and ends_at <= clock_timestamp() order by ends_at, id for update loop
    select * into score from private.crew_contract_progress(contract);
    update public.crew_contracts set settled_at = clock_timestamp(), result_value = score.value,
      result_contributors = score.contributors where id = contract.id;
    if contract.season_id is not null then
      if score.value >= contract.target then
        insert into public.crew_passport_stamps(contract_id, code, earned_at)
        values (contract.id, 'contract_finish', contract.ends_at) on conflict do nothing;
      end if;
      if score.value >= contract.target and score.contributors = cardinality(contract.member_ids) then
        insert into public.crew_passport_stamps(contract_id, code, earned_at)
        values (contract.id, 'full_crew', contract.ends_at) on conflict do nothing;
      end if;
    end if;
  end loop;
end; $$;
revoke all on function private.settle_crew_contracts(uuid) from public, anon, authenticated;

create function public.create_crew_season(p_crew_id uuid, p_title text, p_starts_at timestamptz, p_ends_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare saved uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  perform 1 from public.crews where id = p_crew_id for update;
  if not private.is_active_crew_member(p_crew_id) then raise exception 'not_a_member'; end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 80
    or p_starts_at is null or p_ends_at is null or not isfinite(p_starts_at) or not isfinite(p_ends_at)
    or p_ends_at <= p_starts_at or p_ends_at <= clock_timestamp() then raise exception 'invalid_season'; end if;
  if exists (select 1 from public.crew_seasons where crew_id = p_crew_id and starts_at < p_ends_at and ends_at > p_starts_at)
    then raise exception 'season_overlap'; end if;
  insert into public.crew_seasons(crew_id, title, starts_at, ends_at)
    values (p_crew_id, trim(p_title), p_starts_at, p_ends_at) returning id into saved;
  -- A newly configured season may include an open contract, never rewrite an
  -- already settled result or fabricate historical awards.
  update public.crew_contracts set season_id = saved where crew_id = p_crew_id and season_id is null
    and cancelled_at is null and settled_at is null and ends_at > clock_timestamp() and starts_at >= p_starts_at and ends_at <= p_ends_at;
  return saved;
end; $$;

create function public.set_crew_contract(p_crew_id uuid, p_title text, p_metric text, p_target numeric, p_expected_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare saved uuid; current_id uuid; sport_id text; roster uuid[]; season uuid;
  starts timestamptz;
  ends timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select sport into sport_id from public.crews where id = p_crew_id for update;
  if not private.is_active_crew_member(p_crew_id) then raise exception 'not_a_member'; end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 80 or p_metric is null
    or p_metric not in ('distance_m', 'moving_sec', 'sessions', 'contributors') or p_target is null
    or p_target <= 0 or p_target >= 'Infinity'::numeric then raise exception 'invalid_contract'; end if;
  starts := date_trunc('week', clock_timestamp() at time zone 'America/New_York') at time zone 'America/New_York';
  ends := ((starts at time zone 'America/New_York') + interval '7 days') at time zone 'America/New_York';
  perform private.settle_crew_contracts(p_crew_id);
  select id into current_id from public.crew_contracts where crew_id = p_crew_id and starts_at = starts and cancelled_at is null;
  if current_id is distinct from p_expected_id then raise exception 'contract_changed'; end if;
  select array_agg(user_id order by user_id) into roster from public.crew_members where crew_id = p_crew_id and status = 'active';
  if sport_id = 'strength' and p_metric = 'distance_m' then raise exception 'invalid_contract'; end if;
  if p_metric in ('sessions', 'contributors') and p_target <> trunc(p_target) then raise exception 'invalid_contract'; end if;
  if p_metric = 'contributors' and p_target > cardinality(roster) then raise exception 'invalid_contract'; end if;
  select id into season from public.crew_seasons where crew_id = p_crew_id and starts_at <= starts and ends_at >= ends;
  update public.crew_contracts set cancelled_at = clock_timestamp() where id = current_id;
  insert into public.crew_contracts(crew_id, season_id, title, sport, metric, target, starts_at, ends_at, member_ids)
    values (p_crew_id, season, trim(p_title), sport_id, p_metric, p_target, starts, ends, roster) returning id into saved;
  return saved;
end; $$;

create function public.crew_passport(p_crew_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare current_contract public.crew_contracts; current_value numeric; current_contributors integer; result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  perform 1 from public.crews where id = p_crew_id for update;
  if not private.is_active_crew_member(p_crew_id) then raise exception 'not_a_member'; end if;
  perform private.settle_crew_contracts(p_crew_id);
  select * into current_contract from public.crew_contracts where crew_id = p_crew_id and cancelled_at is null
    and starts_at <= clock_timestamp() and ends_at > clock_timestamp();
  if current_contract.id is not null then select value, contributors into current_value, current_contributors from private.crew_contract_progress(current_contract); end if;
  select jsonb_build_object(
    'contract', case when current_contract.id is null then null else to_jsonb(current_contract) - 'member_ids'
      || jsonb_build_object('value', current_value, 'contributors', current_contributors, 'roster_size', cardinality(current_contract.member_ids)) end,
    'seasons', coalesce((select jsonb_agg(to_jsonb(s) order by s.starts_at desc) from public.crew_seasons s where s.crew_id = p_crew_id), '[]'::jsonb),
    'stamps', coalesce((select jsonb_agg(to_jsonb(s) || jsonb_build_object('crew_id', c.crew_id, 'season_id', c.season_id) order by s.earned_at desc, s.id)
      from public.crew_passport_stamps s join public.crew_contracts c on c.id = s.contract_id where c.crew_id = p_crew_id), '[]'::jsonb)
  ) into result;
  return result;
end; $$;

revoke all on function public.create_crew_season(uuid, text, timestamptz, timestamptz),
  public.set_crew_contract(uuid, text, text, numeric, uuid), public.crew_passport(uuid) from public, anon;
grant execute on function public.create_crew_season(uuid, text, timestamptz, timestamptz),
  public.set_crew_contract(uuid, text, text, numeric, uuid), public.crew_passport(uuid) to authenticated;
