-- Move the authoritative crew seating into the same store as open fields.
-- Keep the newer seating if a crew/week was written to both stores.
insert into public.week_fields (
  crew_id, wave_start, week_end, sport, capacity, name,
  member_ids, synthetic_ids, created_at, updated_at
)
select
  legacy.crew_id, legacy.wave_start, legacy.week_end, legacy.sport,
  legacy.capacity, crew.name, legacy.member_ids, legacy.synthetic_ids,
  legacy.updated_at, legacy.updated_at
from public.crew_week_fields legacy
join public.crews crew on crew.id = legacy.crew_id
on conflict (crew_id, wave_start) where crew_id is not null do update
set week_end = excluded.week_end,
    sport = excluded.sport,
    capacity = excluded.capacity,
    name = excluded.name,
    member_ids = excluded.member_ids,
    synthetic_ids = excluded.synthetic_ids,
    updated_at = excluded.updated_at
where excluded.updated_at >= public.week_fields.updated_at;

-- A departed crew member must not retain access through an old seating array.
drop policy if exists week_fields_select on public.week_fields;
create policy week_fields_select on public.week_fields
  for select to authenticated
  using (
    (select auth.uid()) = any(member_ids)
    and (crew_id is null or private.is_active_crew_member(crew_id))
  );
revoke all on public.week_fields from anon, authenticated;
grant select on public.week_fields to authenticated;

-- Both seating paths now write only week_fields. Validate crew sport and
-- capacity in the same authenticated RPC that owns solo seating.
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
  crew_sport text;
  syn_ids text[];
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;

  if p_sport is null or p_sport not in ('running', 'cycling', 'walking', 'strength') then
    raise exception 'invalid_sport';
  end if;

  if p_wave_start is null or p_week_end is null or p_week_end <= p_wave_start then
    raise exception 'invalid_bounds';
  end if;

  if p_capacity is null or p_capacity < 2 or p_capacity > 16 then
    raise exception 'invalid_capacity';
  end if;

  -- 1. Crew field seating
  if p_crew_id is not null then
    if not private.is_active_crew_member(p_crew_id) then
      raise exception 'not_a_crew_member';
    end if;

    select c.sport, c.name into crew_sport, field_name
    from public.crews c where c.id = p_crew_id;
    if p_sport is distinct from crew_sport then
      raise exception 'sport_mismatch';
    end if;

    select array_agg(member.user_id order by member.user_id)
    into roster
    from public.crew_members member
    where member.crew_id = p_crew_id
      and member.status = 'active';

    if roster is null or not (uid = any(roster)) then
      raise exception 'caller_not_on_roster';
    end if;
    if cardinality(roster) > p_capacity then
      raise exception 'roster_exceeds_capacity';
    end if;

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


-- One score reader for both field kinds. Crew scores retain the existing
-- sharing boundary: only sessions shared into that crew are visible/count.
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
  if not (uid = any(field_rec.member_ids)) then
    raise exception 'not_in_field';
  end if;
  if field_rec.crew_id is not null
     and not private.is_active_crew_member(field_rec.crew_id) then
    raise exception 'not_a_crew_member';
  end if;

  return query
  select
    p.id,
    coalesce(cm.display_name, p.display_name),
    coalesce(r.open_elo, 1000)::numeric,
    coalesce(sum(a.distance_m), 0)::numeric,
    coalesce(sum(a.moving_sec), 0)::numeric
  from unnest(field_rec.member_ids) as m(id)
  join public.profiles p on p.id = m.id
  left join public.sport_ratings r
    on r.user_id = m.id and r.sport = field_rec.sport
  left join public.crew_members cm
    on cm.crew_id = field_rec.crew_id and cm.user_id = m.id
  left join lateral (
    select activity.distance_m, activity.moving_sec
    from public.activities activity
    where field_rec.crew_id is null
      and activity.user_id = m.id
      and activity.disposition = 'counted'
      and activity.sport = field_rec.sport
      and activity.started_at >= field_rec.wave_start
      and activity.started_at < field_rec.week_end
    union all
    select entry.distance_m, entry.moving_sec
    from public.crew_entries entry
    where field_rec.crew_id is not null
      and entry.crew_id = field_rec.crew_id
      and entry.user_id = m.id
      and entry.disposition = 'counted'
      and entry.sport = field_rec.sport
      and entry.started_at >= field_rec.wave_start
      and entry.started_at < field_rec.week_end
  ) a on true
  where field_rec.crew_id is null or cm.status = 'active'
  group by p.id, cm.display_name, p.display_name, r.open_elo
  order by p.id;
end;
$$;

revoke all on function public.week_field_roster(uuid) from public, anon;
grant execute on function public.week_field_roster(uuid) to authenticated;

-- Copy first, retire second. No CASCADE: an unexpected dependency must fail
-- the migration rather than silently removing another product surface.
drop function public.upsert_crew_week_field(
  uuid, timestamptz, timestamptz, text, integer, uuid[], text[]
);
drop table public.crew_week_fields;
