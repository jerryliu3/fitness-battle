-- Directed blocks remain private to the blocker and disappear when either account is deleted.
create table public.athlete_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index athlete_blocks_reverse_idx on public.athlete_blocks(blocked_id, blocker_id);
alter table public.athlete_blocks enable row level security;
revoke all on public.athlete_blocks from anon, authenticated;
grant select, insert, delete on public.athlete_blocks to authenticated;
create policy athlete_blocks_select_own on public.athlete_blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy athlete_blocks_insert_own on public.athlete_blocks for insert to authenticated with check (blocker_id = (select auth.uid()) and blocked_id <> (select auth.uid()));
create policy athlete_blocks_delete_own on public.athlete_blocks for delete to authenticated using (blocker_id = (select auth.uid()));

-- Serialize block changes with seating to avoid a race against new placement.
create function private.lock_athlete_block_change() returns trigger language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(7265128904);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
revoke all on function private.lock_athlete_block_change() from public, anon, authenticated;
create trigger athlete_block_lock before insert or delete on public.athlete_blocks
for each row execute function private.lock_athlete_block_change();

-- Keep the original seating behavior and retain already seated fields.
create or replace function public.seat_athlete_week_field_before_repeat(
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

    if exists (
      select 1 from public.athlete_blocks b
      where b.blocker_id = any(roster) and b.blocked_id = any(roster)
      and not exists (select 1 from public.week_fields existing
        where existing.crew_id = p_crew_id and existing.wave_start = p_wave_start
        and b.blocker_id = any(existing.member_ids) and b.blocked_id = any(existing.member_ids))
    ) then raise exception 'field_unavailable'; end if;

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
    and not exists (select 1 from public.athlete_blocks b
      where (b.blocker_id = uid and b.blocked_id = any(member_ids))
         or (b.blocked_id = uid and b.blocker_id = any(member_ids)))
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


create or replace function public.seat_athlete_week_field(p_sport text,p_wave_start timestamptz,p_week_end timestamptz,p_capacity integer default 8,p_crew_id uuid default null,p_crew_name text default null,p_synthetic_ids text[] default '{}') returns public.week_fields
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); f public.week_fields; new_seat boolean:=false;
begin
  if uid is null then raise exception 'authentication_required';end if;
  perform pg_advisory_xact_lock(7265128904);
  if p_sport is null or p_sport not in ('running','cycling','walking','strength') then raise exception 'invalid_sport';end if;
  if p_wave_start is null or p_week_end is null or p_week_end<=p_wave_start then raise exception 'invalid_bounds';end if;
  if p_capacity is null or p_capacity<2 or p_capacity>16 then raise exception 'invalid_capacity';end if;
  if p_crew_id is null then
    perform pg_advisory_xact_lock(hashtextextended(p_sport||p_wave_start::text||p_week_end::text,73));
    if not exists(select 1 from public.week_fields where sport=p_sport and wave_start=p_wave_start and week_end=p_week_end and week_end>statement_timestamp() and uid=any(member_ids)) then
      new_seat:=true;
      select future.* into f from public.week_fields future
        where future.sport=p_sport and future.wave_start=p_wave_start and future.week_end=p_week_end and future.week_end>statement_timestamp()
        and future.crew_id is null and cardinality(future.member_ids)<future.capacity
        and not exists(select 1 from public.athlete_blocks b where
          (b.blocker_id=uid and b.blocked_id=any(future.member_ids)) or
          (b.blocked_id=uid and b.blocker_id=any(future.member_ids)))
        and exists(select 1 from public.weekly_field_choices c
          join public.weekly_field_choices reverse on reverse.field_id=c.field_id and reverse.actor_id=c.recipient_id and reverse.recipient_id=c.actor_id and reverse.track=c.track and reverse.repeat
          join public.week_fields source on source.id=c.field_id and source.sport=p_sport and source.week_end<=p_wave_start
          join public.sport_ratings mine on mine.user_id=uid and mine.sport=p_sport and mine.opted_in
          join public.sport_ratings theirs on theirs.user_id=c.recipient_id and theirs.sport=p_sport and theirs.opted_in
          where c.actor_id=uid and c.repeat and c.expires_at>statement_timestamp() and reverse.expires_at>statement_timestamp()
          and p_wave_start<c.expires_at and c.recipient_id=any(future.member_ids)
          and (c.attempted_wave is null or c.attempted_wave=p_wave_start) and (reverse.attempted_wave is null or reverse.attempted_wave=p_wave_start)
          and abs(case when c.track='verified' then mine.verified_elo-theirs.verified_elo else mine.open_elo-theirs.open_elo end)<=400)
        order by cardinality(future.member_ids) desc,future.created_at,future.id limit 1 for update;
      if found then
        update public.week_fields set member_ids=array_append(member_ids,uid),synthetic_ids=case when cardinality(synthetic_ids)>0 then synthetic_ids[1:cardinality(synthetic_ids)-1] else synthetic_ids end,updated_at=statement_timestamp() where id=f.id returning * into f;
      end if;
    end if;
  end if;
  if f.id is null then
    f:=public.seat_athlete_week_field_before_repeat(p_sport,p_wave_start,p_week_end,p_capacity,p_crew_id,p_crew_name,p_synthetic_ids);
  end if;
  if new_seat then
    update public.weekly_field_choices c set attempted_wave=p_wave_start
      where (c.actor_id=uid or c.recipient_id=uid) and c.repeat and c.attempted_wave is null and c.expires_at>statement_timestamp()
      and exists(select 1 from public.week_fields source where source.id=c.field_id and source.sport=p_sport and source.week_end<=p_wave_start)
      and exists(select 1 from public.weekly_field_choices reverse where reverse.field_id=c.field_id and reverse.actor_id=c.recipient_id and reverse.recipient_id=c.actor_id and reverse.track=c.track and reverse.repeat and (reverse.attempted_wave is null or reverse.attempted_wave=p_wave_start));
  end if;
  return f;
end; $$;
