-- Unified week fields for solo and crew multiplayer.
-- Up to capacity (default 8) athletes compete individually on one leaderboard.
-- Synthetic rivals fill gaps deterministically when fewer real athletes are seated.

create table if not exists public.week_fields (
  id uuid primary key default gen_random_uuid(),
  sport text not null check (sport in ('running', 'cycling', 'walking', 'strength')),
  wave_start timestamptz not null,
  week_end timestamptz not null,
  capacity integer not null default 8 check (capacity between 2 and 16),
  crew_id uuid references public.crews (id) on delete cascade,
  name text not null default 'Open Field',
  member_ids uuid[] not null default '{}',
  synthetic_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint week_fields_bounds check (week_end > wave_start),
  constraint week_fields_capacity check (cardinality(member_ids) <= capacity)
);

create index if not exists week_fields_wave_sport_idx
  on public.week_fields (wave_start, sport);

create unique index if not exists week_fields_crew_wave_unique
  on public.week_fields (crew_id, wave_start)
  where crew_id is not null;

create index if not exists week_fields_members_gin
  on public.week_fields using gin (member_ids);

alter table public.week_fields enable row level security;

drop policy if exists week_fields_select on public.week_fields;
create policy week_fields_select on public.week_fields
  for select to authenticated
  using (auth.uid() = any(member_ids));

-- Seat an athlete into a week field (solo or crew).
-- For solo: groups real athletes into fields of up to capacity; drops synthetics as reals join.
-- For crew: seats all active crew members on a shared field.
create or replace function public.seat_athlete_week_field(
  p_sport text,
  p_wave_start timestamptz,
  p_week_end timestamptz,
  p_capacity integer default 8,
  p_crew_id uuid default null,
  p_crew_name text default null,
  p_synthetic_ids text[] default '{}'
)
returns public.week_fields
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  field_rec public.week_fields;
  roster uuid[];
  field_name text;
  syn_ids text[];
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;

  if p_sport not in ('running', 'cycling', 'walking', 'strength') then
    raise exception 'invalid_sport';
  end if;

  if p_week_end <= p_wave_start then
    raise exception 'invalid_bounds';
  end if;

  if p_capacity < 2 or p_capacity > 16 then
    raise exception 'invalid_capacity';
  end if;

  -- 1. Crew field seating
  if p_crew_id is not null then
    if not private.is_active_crew_member(p_crew_id) then
      raise exception 'not_a_crew_member';
    end if;

    select array_agg(member.user_id order by member.user_id)
    into roster
    from public.crew_members member
    where member.crew_id = p_crew_id
      and member.status = 'active';

    if roster is null or cardinality(roster) = 0 then
      roster := array[uid];
    end if;

    field_name := coalesce(
      p_crew_name,
      (select c.name from public.crews c where c.id = p_crew_id),
      'Crew Field'
    );

    insert into public.week_fields (
      sport, wave_start, week_end, capacity, crew_id, name, member_ids, synthetic_ids, updated_at
    )
    values (
      p_sport, p_wave_start, p_week_end, p_capacity, p_crew_id, field_name, roster,
      coalesce(p_synthetic_ids, '{}'::text[]), statement_timestamp()
    )
    on conflict (crew_id, wave_start) where crew_id is not null do update
      set week_end = excluded.week_end,
          sport = excluded.sport,
          capacity = excluded.capacity,
          name = excluded.name,
          member_ids = excluded.member_ids,
          synthetic_ids = excluded.synthetic_ids,
          updated_at = statement_timestamp()
    returning * into field_rec;

    -- Remove athlete from any open solo field for this wave and sport
    update public.week_fields
    set member_ids = array_remove(member_ids, uid),
        updated_at = statement_timestamp()
    where wave_start = p_wave_start
      and sport = p_sport
      and crew_id is null
      and uid = any (member_ids);

    delete from public.week_fields
    where wave_start = p_wave_start
      and sport = p_sport
      and crew_id is null
      and cardinality(member_ids) = 0;

    return field_rec;
  end if;

  -- 2. Solo athlete seating
  -- Check if already seated in a field for this wave and sport
  select * into field_rec
  from public.week_fields
  where wave_start = p_wave_start
    and sport = p_sport
    and crew_id is null
    and uid = any (member_ids)
  limit 1;

  if field_rec.id is not null then
    return field_rec;
  end if;

  -- Find an open solo field with room (row lock to prevent concurrent overflow)
  select * into field_rec
  from public.week_fields
  where wave_start = p_wave_start
    and sport = p_sport
    and crew_id is null
    and cardinality(member_ids) < capacity
  order by cardinality(member_ids) desc, created_at asc
  limit 1
  for update;

  if field_rec.id is not null then
    -- Add athlete and trim 1 synthetic filler
    syn_ids := field_rec.synthetic_ids;
    if cardinality(syn_ids) > 0 then
      syn_ids := syn_ids[1:cardinality(syn_ids) - 1];
    end if;

    update public.week_fields
    set member_ids = array_append(field_rec.member_ids, uid),
        synthetic_ids = syn_ids,
        updated_at = statement_timestamp()
    where id = field_rec.id
    returning * into field_rec;

    -- Ensure athlete is not left in any other solo field
    update public.week_fields
    set member_ids = array_remove(member_ids, uid),
        updated_at = statement_timestamp()
    where wave_start = p_wave_start
      and sport = p_sport
      and crew_id is null
      and id <> field_rec.id
      and uid = any (member_ids);

    delete from public.week_fields
    where wave_start = p_wave_start
      and sport = p_sport
      and crew_id is null
      and cardinality(member_ids) = 0;

    return field_rec;
  end if;

  -- Create a new open solo field
  insert into public.week_fields (
    sport, wave_start, week_end, capacity, crew_id, name, member_ids, synthetic_ids, updated_at
  )
  values (
    p_sport, p_wave_start, p_week_end, p_capacity, null, 'Open Field', array[uid],
    coalesce(p_synthetic_ids, '{}'::text[]), statement_timestamp()
  )
  returning * into field_rec;

  return field_rec;
end;
$$;

revoke all on function public.seat_athlete_week_field(
  text, timestamptz, timestamptz, integer, uuid, text, text[]
) from public, anon;
grant execute on function public.seat_athlete_week_field(
  text, timestamptz, timestamptz, integer, uuid, text, text[]
) to authenticated;

-- Roster with weekly counted volume for all real members in a week field.
-- Only accessible to athletes seated in the field.
create or replace function public.week_field_roster(p_field_id uuid)
returns table (
  user_id uuid,
  display_name text,
  open_elo numeric,
  distance_m numeric,
  moving_sec numeric
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

  if not (uid = any (field_rec.member_ids)) then
    raise exception 'not_in_field';
  end if;

  return query
  select
    p.id as user_id,
    p.display_name,
    coalesce(r.open_elo, 1000)::numeric as open_elo,
    coalesce(sum(a.distance_m), 0)::numeric as distance_m,
    coalesce(sum(a.moving_sec), 0)::numeric as moving_sec
  from unnest(field_rec.member_ids) as m(id)
  join public.profiles p on p.id = m.id
  left join public.sport_ratings r on r.user_id = m.id and r.sport = field_rec.sport
  left join public.activities a on a.user_id = m.id
    and a.disposition = 'counted'
    and a.sport = field_rec.sport
    and a.started_at >= field_rec.wave_start
    and a.started_at < field_rec.week_end
  group by p.id, p.display_name, r.open_elo
  order by p.display_name;
end;
$$;

revoke all on function public.week_field_roster(uuid) from public, anon;
grant execute on function public.week_field_roster(uuid) to authenticated;
