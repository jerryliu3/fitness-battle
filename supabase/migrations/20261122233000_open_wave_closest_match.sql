-- Open (solo) wave fields: drop the ±400 Elo gate and seat the closest athletes
-- by entry rating. Crew-pinned fields are unchanged.

create or replace function private.finalize_week_wave(p_sport text, p_start timestamptz, p_end timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  pool jsonb;
  head jsonb;
  roster uuid[];
  assigned uuid[] := '{}';
  crew uuid;
  cap integer;
  f uuid;
  target_elo numeric;
  label text;
  syn text[];
  existing_field public.week_fields;
begin
  if p_start > clock_timestamp() then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_sport || extract(epoch from p_start)::text, 61028));
  update public.week_fields set roster_locked_at = coalesce(roster_locked_at, statement_timestamp())
    where sport = p_sport and wave_start = p_start and week_end = p_end and roster_locked_at is null;
  with latest as (
    select distinct on (e.user_id) e.* from public.wave_enrollments e
    where e.sport = p_sport and e.wave_start <= p_start order by e.user_id, e.wave_start desc
  ), candidates as (
    select e.user_id, e.capacity, e.registered_at,
      case when e.crew_id is not null and exists(select 1 from public.crew_members m where m.crew_id = e.crew_id and m.user_id = e.user_id and m.status = 'active') then e.crew_id end as crew_id,
      case when p_sport in ('running', 'cycling') then case when r.lock_period = p_start then r.lock_verified else r.verified_elo end else case when r.lock_period = p_start then r.lock_open else r.open_elo end end as elo
    from latest e
    join auth.users u on u.id = e.user_id
    join public.sport_ratings r on r.user_id = e.user_id and r.sport = e.sport and r.opted_in
    where coalesce(u.raw_app_meta_data->>'fixture', '') <> 'house-match-pool'
      and e.registered_at <= p_start
      and not exists (
        select 1 from public.week_fields wf
        where wf.sport = p_sport
          and wf.wave_start = p_start
          and wf.week_end = p_end
          and e.user_id = any(wf.member_ids)
      )
      and (
        (e.wave_start = p_start and e.week_end = p_end) or
        (e.week_end <= p_start and e.auto_enroll_next and p_start = (date_trunc('week', p_start at time zone 'America/New_York') + interval '6 hours') at time zone 'America/New_York')
      )
  ) select coalesce(jsonb_agg(to_jsonb(c) order by c.crew_id nulls last, c.elo, c.registered_at, c.user_id), '[]') into pool from candidates c;
  while jsonb_array_length(pool) > 0 loop
    head := pool->0; crew := (head->>'crew_id')::uuid; cap := (head->>'capacity')::integer;
    select array_agg((x->>'user_id')::uuid order by x->>'user_id'), percentile_disc(0.5) within group(order by (x->>'elo')::numeric)
      into roster, target_elo from (
        select x from jsonb_array_elements(pool) x where (x->>'crew_id')::uuid is not distinct from crew and (x->>'capacity')::integer = cap
        order by ((x->>'user_id')::uuid = (head->>'user_id')::uuid) desc, exists(
          select 1 from public.weekly_field_choices c join public.weekly_field_choices rev
            on rev.field_id = c.field_id and rev.actor_id = c.recipient_id and rev.recipient_id = c.actor_id and rev.track = c.track and rev.repeat
          join public.week_fields source on source.id = c.field_id and source.sport = p_sport and source.week_end <= p_start
          where c.actor_id = (head->>'user_id')::uuid and c.recipient_id = (x->>'user_id')::uuid and c.repeat
            and c.expires_at > p_start and rev.expires_at > p_start and c.attempted_wave is null and rev.attempted_wave is null
        ) desc, abs((x->>'elo')::numeric - (head->>'elo')::numeric), x->>'user_id' limit cap
      ) picks;
    f := gen_random_uuid(); syn := private.wave_synthetics(p_sport, target_elo, cap - cardinality(roster), f::text);
    label := coalesce((select name from public.crews where id = crew), 'Open Field');
    insert into public.week_fields(id, sport, wave_start, week_end, capacity, crew_id, name, member_ids, synthetic_ids, roster_locked_at)
      values(f, p_sport, p_start, p_end, cap, crew, label, roster, syn, statement_timestamp());
    update public.wave_enrollments e set field_id = f, crew_id = crew,
      peer_ids = array(select id::text from unnest(roster) id where id <> e.user_id), synthetic_ids = syn
      where e.user_id = any(roster) and e.sport = p_sport and e.wave_start = p_start and e.week_end = p_end;
    assigned := assigned || roster;
    select coalesce(jsonb_agg(x), '[]') into pool from jsonb_array_elements(pool) x where not (x->>'user_id')::uuid = any(roster);
  end loop;
  for existing_field in
    select * from public.week_fields
    where sport = p_sport and wave_start = p_start and week_end = p_end and crew_id is null
    order by cardinality(member_ids), id
  loop
    perform private.seat_house_accounts(existing_field);
  end loop;
  if cardinality(assigned) > 0 then
    update public.weekly_field_choices c set attempted_wave = p_start
      where c.actor_id = any(assigned) and c.repeat and c.attempted_wave is null and c.expires_at > p_start
        and exists(select 1 from public.week_fields source where source.id = c.field_id and source.sport = p_sport and source.week_end <= p_start)
        and exists(select 1 from public.weekly_field_choices rev where rev.field_id = c.field_id and rev.actor_id = c.recipient_id
          and rev.recipient_id = c.actor_id and rev.track = c.track and rev.repeat and rev.expires_at > p_start);
  end if;
end; $$;