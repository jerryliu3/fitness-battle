-- Preserve admin-closed history when ordinary clients request seating.
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

    -- An early-closed Crew wave is immutable. Route re-seating to its replacement.
    if exists(select 1 from public.week_fields
      where crew_id=p_crew_id and wave_start=p_wave_start and week_end <= statement_timestamp()) then
      select * into field_rec from public.week_fields
        where crew_id=p_crew_id and wave_start > p_wave_start and week_end > statement_timestamp()
        order by wave_start desc limit 1 for update;
      if not found then raise exception 'field_closed_reload'; end if;
      p_wave_start := field_rec.wave_start;
      p_week_end := field_rec.week_end;
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
      where public.week_fields.week_end = excluded.week_end
        and public.week_fields.week_end > statement_timestamp()
    returning * into field_rec;

    if not found then raise exception 'field_closed_reload'; end if;

    -- Remove athlete from any open solo field for this wave and sport
    update public.week_fields
    set member_ids = array_remove(member_ids, uid),
        updated_at = statement_timestamp()
    where wave_start = p_wave_start
      and week_end = p_week_end
      and week_end > statement_timestamp()
      and sport = p_sport
      and crew_id is null
      and uid = any (member_ids);

    delete from public.week_fields
    where wave_start = p_wave_start
      and week_end = p_week_end
      and week_end > statement_timestamp()
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
    and week_end = p_week_end
    and week_end > statement_timestamp()
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
    and week_end = p_week_end
    and week_end > statement_timestamp()
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
      and week_end = p_week_end
      and week_end > statement_timestamp()
      and sport = p_sport
      and crew_id is null
      and id <> field_rec.id
      and uid = any (member_ids);

    delete from public.week_fields
    where wave_start = p_wave_start
      and week_end = p_week_end
      and week_end > statement_timestamp()
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
