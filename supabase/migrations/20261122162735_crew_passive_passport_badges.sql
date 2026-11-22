-- Keep just enough roster history to settle missed weeks without replaying
-- membership changes in the product or requiring anyone to open Passport.
create table private.crew_passport_rosters (
  id bigint generated always as identity primary key,
  crew_id uuid not null references public.crews(id) on delete cascade,
  observed_at timestamptz not null default clock_timestamp(),
  user_id uuid,
  active boolean not null,
  sport text not null
);
create index crew_passport_rosters_lookup on private.crew_passport_rosters(crew_id, user_id, observed_at desc, id desc);
create table private.crew_passport_weeks (
  crew_id uuid not null references public.crews(id) on delete cascade,
  week_start date not null,
  roster_size integer not null,
  contributors integer not null check (contributors between 0 and roster_size),
  primary key (crew_id, week_start)
);
revoke all on private.crew_passport_rosters, private.crew_passport_weeks from public, anon, authenticated;

create function private.capture_crew_passport_roster() returns trigger
language plpgsql security definer set search_path = '' as $$
declare crew uuid; member uuid; is_active boolean := false;
begin
  if tg_table_name = 'crews' then
    crew := new.id;
  elsif tg_op = 'DELETE' then
    crew := old.crew_id;
    member := old.user_id;
  else
    crew := new.crew_id;
    member := new.user_id;
    is_active := new.status = 'active';
  end if;
  insert into private.crew_passport_rosters(crew_id, user_id, active, sport)
  select c.id, member, is_active, c.sport
  from public.crews c where c.id = crew;
  return null;
end;
$$;
revoke all on function private.capture_crew_passport_roster() from public, anon, authenticated;
create trigger capture_crew_passport_roster
after insert or delete or update of status on public.crew_members
for each row execute function private.capture_crew_passport_roster();

create trigger capture_crew_passport_sport
after update of sport on public.crews
for each row when (old.sport is distinct from new.sport)
execute function private.capture_crew_passport_roster();

insert into private.crew_passport_rosters(crew_id, user_id, active, sport)
select m.crew_id, m.user_id, true, c.sport from public.crew_members m
join public.crews c on c.id = m.crew_id where m.status = 'active';

create function private.settle_crew_passport_weeks(p_crew_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  first_observed timestamptz;
  next_week date;
  current_week date := date_trunc('week', statement_timestamp() at time zone 'America/New_York')::date;
  week_end timestamptz;
  scope public.crew_contracts;
  contribution_count integer;
begin
  -- Called under the same crew lock as contract settlement.
  select min(observed_at) into first_observed from private.crew_passport_rosters where crew_id = p_crew_id and active;
  select coalesce(max(week_start) + 7, date_trunc('week', first_observed at time zone 'America/New_York')::date)
    into next_week from private.crew_passport_weeks where crew_id = p_crew_id;
  scope.metric := 'contributors';
  while next_week < current_week loop
    week_end := (next_week + 7)::timestamp at time zone 'America/New_York';
    select sport into scope.sport from private.crew_passport_rosters
      where crew_id = p_crew_id and observed_at < week_end order by observed_at desc, id desc limit 1;
    select array(select roster.user_id from (
      select distinct on (user_id) user_id, active from private.crew_passport_rosters
      where crew_id = p_crew_id and user_id is not null and observed_at < week_end
      order by user_id, observed_at desc, id desc
    ) roster where roster.active) into scope.member_ids;
    scope.starts_at := greatest(next_week::timestamp at time zone 'America/New_York', first_observed);
    scope.ends_at := week_end;
    select contributors into contribution_count from private.crew_contract_progress(scope);
    insert into private.crew_passport_weeks(crew_id, week_start, roster_size, contributors)
      values (p_crew_id, next_week, coalesce(cardinality(scope.member_ids), 0), contribution_count);
    next_week := next_week + 7;
  end loop;
end;
$$;
revoke all on function private.settle_crew_passport_weeks(uuid) from public, anon, authenticated;

-- Retain the existing contract/season response for clients and add a collection
-- derived from durable week results and settled contracts.
create function public.crew_passport_collection(p_crew_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare passport jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.is_active_crew_member(p_crew_id) then raise exception 'not_a_member'; end if;
  passport := public.crew_passport(p_crew_id);
  perform private.settle_crew_passport_weeks(p_crew_id);
  return passport || jsonb_build_object('badges', coalesce((
    with weekly as (
      select week_start, contributors, roster_size,
        lag(contributors, 1) over (order by week_start) as prior,
        lag(contributors, 2) over (order by week_start) as earlier
      from private.crew_passport_weeks where crew_id = p_crew_id
    ), milestones as (
      select badge.code, (w.week_start + 7)::timestamp at time zone 'America/New_York' as earned_at,
        w.contributors, w.roster_size
      from weekly w cross join lateral (values
        ('first_week', w.contributors >= 2),
        ('full_crew', w.roster_size >= 2 and w.contributors = w.roster_size),
        ('three_week_streak', w.contributors >= 2 and w.prior >= 2 and w.earlier >= 2)
      ) badge(code, earned)
      where badge.earned
      union all
      select 'full_crew', s.earned_at, c.result_contributors, cardinality(c.member_ids)
      from public.crew_passport_stamps s join public.crew_contracts c on c.id = s.contract_id
      where c.crew_id = p_crew_id and s.code = 'full_crew' and cardinality(c.member_ids) >= 2
    ), earned as (
      select distinct on (code) code, earned_at, contributors, roster_size,
        null::text as metric, null::numeric as value, null::numeric as target
      from milestones order by code, earned_at
    ), finish as (
      select 'contract_finish' as code, ends_at as earned_at, result_contributors as contributors,
        cardinality(member_ids) as roster_size, metric, result_value as value, target
      from public.crew_contracts
      where crew_id = p_crew_id and settled_at is not null and result_value >= target
      order by ends_at, id limit 1
    )
    select jsonb_agg(to_jsonb(b) order by b.earned_at, b.code) from (select * from earned union all select * from finish) b
  ), '[]'::jsonb));
end;
$$;
revoke all on function public.crew_passport_collection(uuid) from public, anon;
grant execute on function public.crew_passport_collection(uuid) to authenticated;
