-- Shared individual field for a private crew this week.
-- Members compete separately on one leaderboard; team-vs-team scoring is later.

create table public.crew_week_fields (
  crew_id uuid not null references public.crews (id) on delete cascade,
  wave_start timestamptz not null,
  week_end timestamptz not null,
  sport text not null,
  capacity integer not null default 8 check (capacity between 2 and 16),
  member_ids uuid[] not null,
  synthetic_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (crew_id, wave_start),
  constraint crew_week_fields_bounds check (week_end > wave_start),
  constraint crew_week_fields_roster check (
    cardinality(member_ids) >= 1
    and cardinality(member_ids) <= capacity
  )
);

create index crew_week_fields_wave_idx
  on public.crew_week_fields (wave_start);

alter table public.crew_week_fields enable row level security;

create policy crew_week_fields_member_select on public.crew_week_fields
  for select to authenticated
  using (private.is_active_crew_member(crew_id));

-- Members may write the shared seating plan for their crew.
create or replace function public.upsert_crew_week_field(
  p_crew_id uuid,
  p_wave_start timestamptz,
  p_week_end timestamptz,
  p_sport text,
  p_capacity integer,
  p_member_ids uuid[],
  p_synthetic_ids text[]
)
returns public.crew_week_fields
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  crew_sport text;
  saved public.crew_week_fields;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if not private.is_active_crew_member(p_crew_id) then
    raise exception 'not_a_member';
  end if;
  select sport into crew_sport from public.crews where id = p_crew_id;
  if crew_sport is null then
    raise exception 'crew_not_found';
  end if;
  if p_sport is distinct from crew_sport then
    raise exception 'sport_mismatch';
  end if;
  if p_capacity < 2 or p_capacity > 16 then
    raise exception 'invalid_capacity';
  end if;
  if p_week_end <= p_wave_start then
    raise exception 'invalid_bounds';
  end if;
  if p_member_ids is null or cardinality(p_member_ids) < 1 then
    raise exception 'members_required';
  end if;
  if cardinality(p_member_ids) > p_capacity then
    raise exception 'roster_exceeds_capacity';
  end if;
  -- Caller must be on the roster being written.
  if not (uid = any (p_member_ids)) then
    raise exception 'caller_not_on_roster';
  end if;

  insert into public.crew_week_fields (
    crew_id, wave_start, week_end, sport, capacity, member_ids, synthetic_ids, updated_at
  )
  values (
    p_crew_id,
    p_wave_start,
    p_week_end,
    p_sport,
    p_capacity,
    p_member_ids,
    coalesce(p_synthetic_ids, '{}'::text[]),
    statement_timestamp()
  )
  on conflict (crew_id, wave_start) do update
    set week_end = excluded.week_end,
        sport = excluded.sport,
        capacity = excluded.capacity,
        member_ids = excluded.member_ids,
        synthetic_ids = excluded.synthetic_ids,
        updated_at = statement_timestamp()
  returning * into saved;

  return saved;
end;
$$;

revoke all on function public.upsert_crew_week_field(
  uuid, timestamptz, timestamptz, text, integer, uuid[], text[]
) from public, anon;
grant execute on function public.upsert_crew_week_field(
  uuid, timestamptz, timestamptz, text, integer, uuid[], text[]
) to authenticated;

-- Roster for seating: display names plus open Elo from each mate's snapshot.
create or replace function public.crew_field_roster(p_crew_id uuid)
returns table (
  user_id uuid,
  display_name text,
  open_elo numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  crew_sport text;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not private.is_active_crew_member(p_crew_id) then
    raise exception 'not_a_member';
  end if;
  select sport into crew_sport from public.crews where id = p_crew_id;
  if crew_sport is null then
    raise exception 'crew_not_found';
  end if;

  return query
  select
    member.user_id,
    member.display_name,
    coalesce(
      (
        select (rating.item ->> 'openElo')::numeric
        from jsonb_array_elements(coalesce(snapshot.state -> 'ratings', '[]'::jsonb))
          with ordinality as rating(item, ord)
        where rating.item ->> 'sport' = crew_sport
        limit 1
      ),
      1000::numeric
    ) as open_elo
  from public.crew_members member
  left join public.compete_snapshots snapshot on snapshot.user_id = member.user_id
  where member.crew_id = p_crew_id
    and member.status = 'active'
  order by member.user_id;
end;
$$;

revoke all on function public.crew_field_roster(uuid) from public, anon;
grant execute on function public.crew_field_roster(uuid) to authenticated;
