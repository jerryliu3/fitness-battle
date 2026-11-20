-- Special events core backbone: composable 4-axis editions, frozen sides,
-- rounds, heats, entries (including spectators), daily relay legs, durable
-- receipts, Eastern midnight deadline locking, and registration RPCs.

create table public.special_event_editions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  series_key text not null check (series_key ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  sport text not null check (sport in ('running', 'cycling', 'walking', 'strength')),
  title text not null check (char_length(trim(title)) between 2 and 80),
  subtitle text not null default '' check (char_length(subtitle) <= 160),
  rules_version smallint not null default 1 check (rules_version >= 1),
  config jsonb not null,
  registration_opens_at timestamptz not null,
  registration_closes_at timestamptz not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  published boolean not null default false,
  finalized_at timestamptz,
  settled_at timestamptz,
  route_snapshot jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint special_event_editions_window_check check (
    registration_opens_at < registration_closes_at
    and registration_closes_at <= starts_at
    and starts_at < ends_at
  )
);
create index special_event_editions_published_idx on public.special_event_editions(published, starts_at desc);

create table public.special_event_sides (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.special_event_editions(id) on delete cascade,
  side_kind text not null check (side_kind in ('solo', 'crew', 'profile_group')),
  crew_id uuid references public.crews(id) on delete set null,
  group_attr text,
  group_value text,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  entry_rating numeric not null default 0,
  roster_locked_at timestamptz,
  final_place integer check (final_place is null or final_place >= 1),
  final_score numeric,
  created_at timestamptz not null default clock_timestamp()
);
create index special_event_sides_edition_idx on public.special_event_sides(edition_id, side_kind);

create table public.special_event_rounds (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.special_event_editions(id) on delete cascade,
  round_number smallint not null check (round_number >= 1),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  heat_size smallint not null check (heat_size between 2 and 16),
  advance_count smallint not null check (advance_count >= 1),
  score_mode text not null default 'round_window' check (score_mode in ('round_window', 'cumulative')),
  finalized_at timestamptz,
  settled_at timestamptz,
  constraint special_event_rounds_window_check check (starts_at < ends_at),
  unique (edition_id, round_number)
);

create table public.special_event_heats (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.special_event_rounds(id) on delete cascade,
  division_key text not null default 'open',
  heat_index smallint not null check (heat_index >= 1),
  bracket_slot smallint,
  side_ids uuid[] not null default '{}',
  advancing_side_ids uuid[] not null default '{}',
  parent_heat_ids uuid[] not null default '{}',
  created_at timestamptz not null default clock_timestamp(),
  unique (round_id, division_key, heat_index)
);

create table public.special_event_entries (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.special_event_editions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  side_id uuid references public.special_event_sides(id) on delete set null,
  spectate_heat_id uuid references public.special_event_heats(id) on delete set null,
  requested_crew_id uuid references public.crews(id) on delete set null,
  group_snapshot jsonb not null default '{}'::jsonb,
  entry_rating numeric not null default 0,
  registered_at timestamptz not null default clock_timestamp(),
  cancelled_at timestamptz,
  status text not null default 'registered'
    check (status in ('registered', 'active', 'eliminated', 'spectating', 'completed', 'cancelled')),
  eliminated_round smallint check (eliminated_round is null or eliminated_round >= 1),
  final_place integer check (final_place is null or final_place >= 1),
  final_score numeric,
  acknowledged_at timestamptz,
  unique (edition_id, user_id)
);
create index special_event_entries_user_idx on public.special_event_entries(user_id, status);
create index special_event_entries_side_idx on public.special_event_entries(side_id) where side_id is not null;

create table public.special_event_relay_legs (
  id uuid primary key default gen_random_uuid(),
  side_id uuid not null references public.special_event_sides(id) on delete cascade,
  leg_day date not null,
  slot_index smallint not null default 1 check (slot_index between 1 and 2),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  locked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique (side_id, leg_day, slot_index),
  unique (side_id, leg_day, user_id)
);

create table public.special_event_receipts (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.special_event_editions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  side_id uuid references public.special_event_sides(id) on delete set null,
  code text not null check (char_length(trim(code)) between 2 and 64),
  metadata jsonb not null default '{}'::jsonb,
  earned_at timestamptz not null default clock_timestamp(),
  unique (edition_id, user_id, code)
);
create index special_event_receipts_user_idx on public.special_event_receipts(user_id, earned_at desc);

alter table public.special_event_editions enable row level security;
alter table public.special_event_sides enable row level security;
alter table public.special_event_rounds enable row level security;
alter table public.special_event_heats enable row level security;
alter table public.special_event_entries enable row level security;
alter table public.special_event_relay_legs enable row level security;
alter table public.special_event_receipts enable row level security;

revoke all on
  public.special_event_editions, public.special_event_sides, public.special_event_rounds,
  public.special_event_heats, public.special_event_entries, public.special_event_relay_legs,
  public.special_event_receipts
from public, anon, authenticated;

grant select on public.special_event_editions, public.special_event_entries, public.special_event_receipts to authenticated;

create policy special_event_editions_read_published on public.special_event_editions
  for select to authenticated using (published = true);
create policy special_event_entries_read_own on public.special_event_entries
  for select to authenticated using (user_id = (select auth.uid()));
create policy special_event_receipts_read_own on public.special_event_receipts
  for select to authenticated using (user_id = (select auth.uid()));

-- Extend accepted-fact capture with Eastern midnight shared locks so daily
-- rounds ending at 00:00 ET freeze with zero-race deadline authority.
create or replace function private.capture_competition_fact()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  before_fact jsonb; after_fact jsonb; fact_kind text; owner uuid; record_id text; lock_key bigint;
begin
  fact_kind := case when tg_table_name = 'activities' then 'activity' else 'sleep' end;
  if fact_kind = 'activity' then
    if tg_op <> 'INSERT' then
      before_fact := jsonb_build_object(
        'id', old.id, 'user_id', old.user_id, 'sport', old.sport, 'started_at', old.started_at,
        'distance_m', old.distance_m, 'moving_sec', old.moving_sec, 'avg_hr', old.avg_hr,
        'verified', old.verified, 'provenance', old.provenance, 'disposition', old.disposition,
        'compete_key', old.compete_key, 'source_label', old.source_label, 'provider', old.provider,
        'journal_only', coalesce(old.journal_only, false)
      );
    end if;
    if tg_op <> 'DELETE' then
      after_fact := jsonb_build_object(
        'id', new.id, 'user_id', new.user_id, 'sport', new.sport, 'started_at', new.started_at,
        'distance_m', new.distance_m, 'moving_sec', new.moving_sec, 'avg_hr', new.avg_hr,
        'verified', new.verified, 'provenance', new.provenance, 'disposition', new.disposition,
        'compete_key', new.compete_key, 'source_label', new.source_label, 'provider', new.provider,
        'journal_only', coalesce(new.journal_only, false)
      );
    end if;
  else
    if tg_op <> 'INSERT' then before_fact := to_jsonb(old); end if;
    if tg_op <> 'DELETE' then after_fact := to_jsonb(new); end if;
  end if;
  if tg_op = 'UPDATE' and before_fact = after_fact then return new; end if;
  owner := (coalesce(after_fact, before_fact)->>'user_id')::uuid;
  record_id := case when fact_kind = 'activity' then coalesce(after_fact, before_fact)->>'id' else coalesce(after_fact, before_fact)->>'night_id' end;

  for lock_key in
    select distinct hashtextextended('competition-close:' || extract(epoch from finish)::text, 29001)
    from (
      select private.wave_week_end(
        case when fact_kind = 'activity' then (x->>'started_at')::timestamptz
          else ((x->>'day')::date + time '12:00') at time zone 'America/New_York' end
      ) as finish
      from jsonb_array_elements(jsonb_build_array(before_fact, after_fact)) x where x <> 'null'::jsonb
      union
      select (((x->>'started_at')::timestamptz at time zone 'America/New_York')::date + 1)::timestamp at time zone 'America/New_York' as finish
      from jsonb_array_elements(jsonb_build_array(before_fact, after_fact)) x where fact_kind = 'activity' and x <> 'null'::jsonb
      union
      select f.week_end from public.week_fields f
      where fact_kind = 'activity' and (f.sport = before_fact->>'sport' or f.sport = after_fact->>'sport') and owner = any(f.member_ids)
        and (((before_fact->>'started_at')::timestamptz >= f.wave_start and (before_fact->>'started_at')::timestamptz < f.week_end)
          or ((after_fact->>'started_at')::timestamptz >= f.wave_start and (after_fact->>'started_at')::timestamptz < f.week_end))
    ) ends order by 1
  loop
    perform pg_advisory_xact_lock_shared(lock_key);
  end loop;

  insert into private.competition_fact_versions(owner_id, kind, record_key, deleted, fact)
  values (owner, fact_kind, record_id, tg_op = 'DELETE', coalesce(after_fact, before_fact));
  if tg_op = 'DELETE' then return old; else return new; end if;
end; $$;
revoke all on function private.capture_competition_fact() from public, anon, authenticated;

-- Unified private heat scorer across total_volume and relay_handoff modes.
create function private.special_event_heat_scores(p_heat_id uuid)
returns table (
  side_id uuid, display_name text, side_kind text, entry_rating numeric,
  score numeric, reached_at timestamptz, best_session numeric, member_count integer
) language plpgsql security definer set search_path = '' as $$
declare
  heat_rec public.special_event_heats;
  round_rec public.special_event_rounds;
  edition_rec public.special_event_editions;
  score_start timestamptz;
  score_end timestamptz;
  is_relay boolean;
begin
  select * into heat_rec from public.special_event_heats where id = p_heat_id;
  if heat_rec.id is null then return; end if;
  select * into round_rec from public.special_event_rounds where id = heat_rec.round_id;
  select * into edition_rec from public.special_event_editions where id = round_rec.edition_id;
  score_start := case when round_rec.score_mode = 'cumulative' then edition_rec.starts_at else round_rec.starts_at end;
  score_end := round_rec.ends_at;
  is_relay := coalesce(edition_rec.config->'scoring'->>'mode', 'total_volume') = 'relay_handoff';

  return query
  with heat_sides as (
    select s.id, s.display_name, s.side_kind, s.entry_rating
    from unnest(heat_rec.side_ids) as sid(id)
    join public.special_event_sides s on s.id = sid.id
  ),
  members as (
    select e.side_id, e.user_id from public.special_event_entries e
    join heat_sides hs on hs.id = e.side_id
    where e.edition_id = edition_rec.id and e.status in ('active', 'eliminated', 'completed')
  ),
  activity_rows as (
    select m.side_id, a.started_at,
      case
        when edition_rec.sport in ('running', 'cycling') then case when a.verified and a.provenance = 'recorded' then coalesce(a.distance_m, 0)::numeric else 0::numeric end
        when edition_rec.sport = 'strength' then coalesce(a.moving_sec, 0)::numeric
        else 0::numeric
      end as vol
    from members m
    join lateral (
      select activity.started_at, activity.distance_m, activity.moving_sec, activity.verified, activity.provenance
      from private.competition_activity_rows(edition_rec.sport, score_start, score_end, m.user_id) activity
      where edition_rec.sport <> 'walking'
        and activity.user_id = m.user_id and activity.disposition = 'counted'
        and activity.provenance not in ('demo', 'manual') and coalesce(activity.journal_only, false) = false
        and coalesce(activity.source_label, activity.provider::text) <> 'history'
        and coalesce(activity.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
        and activity.sport = edition_rec.sport
        and activity.started_at >= score_start and activity.started_at < score_end and activity.started_at <= statement_timestamp()
        and (not is_relay or exists (
          select 1 from public.special_event_relay_legs l
          where l.side_id = m.side_id and l.user_id = m.user_id and l.leg_day = (activity.started_at at time zone 'America/New_York')::date
        ))
    ) a on true
  ),
  walking_rows as (
    select m.side_id, (d.day::timestamp at time zone 'America/New_York') as started_at, max(coalesce(d.steps, 0))::numeric as vol
    from members m join public.daily_health_readings d on d.user_id = m.user_id
    where edition_rec.sport = 'walking'
      and d.day >= (timezone('America/New_York', score_start))::date
      and d.day < (timezone('America/New_York', score_end))::date
      and d.day <= (timezone('America/New_York', statement_timestamp()))::date
      and (not is_relay or exists (
        select 1 from public.special_event_relay_legs l where l.side_id = m.side_id and l.user_id = m.user_id and l.leg_day = d.day
      ))
    group by m.side_id, m.user_id, d.day
  ),
  all_volumes as (
    select side_id, started_at, vol from activity_rows where vol > 0
    union all
    select side_id, started_at, vol from walking_rows where vol > 0
  ),
  agg as (
    select v.side_id, coalesce(sum(v.vol), 0)::numeric as total_vol, max(v.started_at) as last_at, coalesce(max(v.vol), 0)::numeric as top_vol
    from all_volumes v group by v.side_id
  ),
  counts as (select m.side_id, count(*)::integer as cnt from members m group by m.side_id)
  select
    hs.id, hs.display_name, hs.side_kind, hs.entry_rating,
    coalesce(agg.total_vol, 0)::numeric, agg.last_at, coalesce(agg.top_vol, 0)::numeric, coalesce(counts.cnt, 0)::integer
  from heat_sides hs
  left join agg on agg.side_id = hs.id
  left join counts on counts.side_id = hs.id
  order by coalesce(agg.total_vol, 0) desc, agg.last_at asc nulls last, coalesce(agg.top_vol, 0) desc, hs.entry_rating desc, md5(p_heat_id::text || hs.id::text);
end; $$;
revoke all on function private.special_event_heat_scores(uuid) from public, anon, authenticated;

create function public.list_special_events()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  result jsonb;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select coalesce(jsonb_agg(item order by sort_group, starts_at asc, id), '[]'::jsonb) into result
  from (
    select
      case when e.starts_at <= now_at and e.ends_at > now_at then 0
        when e.registration_opens_at <= now_at and e.registration_closes_at > now_at then 1
        when e.registration_opens_at > now_at then 2 else 3 end as sort_group,
      e.starts_at, e.id,
      jsonb_build_object(
        'id', e.id, 'slug', e.slug, 'seriesKey', e.series_key, 'sport', e.sport,
        'title', e.title, 'subtitle', e.subtitle, 'rulesVersion', e.rules_version, 'config', e.config,
        'registrationOpensAt', e.registration_opens_at, 'registrationClosesAt', e.registration_closes_at,
        'startsAt', e.starts_at, 'endsAt', e.ends_at, 'finalizedAt', e.finalized_at, 'settledAt', e.settled_at,
        'entrantCount', (select count(*)::integer from public.special_event_entries ent where ent.edition_id = e.id and ent.status <> 'cancelled'),
        'entry', (
          select case when ent.id is null or ent.status = 'cancelled' then null else jsonb_build_object(
            'id', ent.id, 'status', ent.status, 'sideId', ent.side_id, 'sideName', s.display_name,
            'spectateHeatId', ent.spectate_heat_id, 'requestedCrewId', ent.requested_crew_id,
            'groupSnapshot', ent.group_snapshot, 'entryRating', ent.entry_rating, 'registeredAt', ent.registered_at,
            'eliminatedRound', ent.eliminated_round, 'finalPlace', ent.final_place, 'finalScore', ent.final_score,
            'acknowledgedAt', ent.acknowledged_at
          ) end
          from public.special_event_entries ent
          left join public.special_event_sides s on s.id = ent.side_id
          where ent.edition_id = e.id and ent.user_id = uid
        ),
        'receipts', coalesce((
          select jsonb_agg(jsonb_build_object('code', r.code, 'metadata', r.metadata, 'earnedAt', r.earned_at) order by r.earned_at desc)
          from public.special_event_receipts r where r.edition_id = e.id and r.user_id = uid
        ), '[]'::jsonb)
      ) as item
    from public.special_event_editions e
    where e.published = true and (
      e.ends_at > now_at - interval '14 days'
      or exists (select 1 from public.special_event_entries mine where mine.edition_id = e.id and mine.user_id = uid and mine.status <> 'cancelled')
    )
  ) rows;
  return result;
end; $$;
revoke all on function public.list_special_events() from public, anon;
grant execute on function public.list_special_events() to authenticated;

create function public.register_special_event(p_edition_id uuid, p_crew_id uuid default null, p_group_value text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  edition public.special_event_editions;
  grouping_kind text; group_attr text; resolved_group text; resolved_crew uuid;
  rating numeric; prof public.profiles; saved public.special_event_entries;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('special-event:' || p_edition_id::text, 71001));

  select * into edition from public.special_event_editions where id = p_edition_id and published = true;
  if edition.id is null then raise exception 'edition_not_found'; end if;
  if now_at < edition.registration_opens_at then raise exception 'registration_not_open'; end if;
  if now_at >= edition.registration_closes_at or now_at >= edition.starts_at or edition.finalized_at is not null then
    raise exception 'registration_closed';
  end if;

  select * into prof from public.profiles where id = uid;
  if prof.id is null then raise exception 'profile_required'; end if;
  select case when edition.sport in ('running', 'cycling') then coalesce(r.verified_elo, 0) else coalesce(r.open_elo, 0) end
  into rating from public.sport_ratings r where r.user_id = uid and r.sport = edition.sport;
  rating := coalesce(rating, 0);

  grouping_kind := coalesce(edition.config->'grouping'->>'kind', 'solo');
  if grouping_kind = 'crew' then
    if p_crew_id is null then raise exception 'crew_required'; end if;
    if not exists (select 1 from public.crew_members cm where cm.crew_id = p_crew_id and cm.user_id = uid and cm.status = 'active') then
      raise exception 'not_a_crew_member';
    end if;
    resolved_crew := p_crew_id;
  elsif grouping_kind = 'profile_attr' then
    group_attr := edition.config->'grouping'->>'attr';
    if group_attr = 'country_code' then
      resolved_group := upper(nullif(trim(coalesce(p_group_value, prof.country_code, '')), ''));
      if resolved_group is null or resolved_group !~ '^[A-Z]{2}$' then raise exception 'country_required'; end if;
    elsif group_attr = 'gender' then
      resolved_group := lower(nullif(trim(coalesce(p_group_value, prof.gender, '')), ''));
      if resolved_group is null or resolved_group not in ('male', 'female', 'other') then raise exception 'profile_attribute_required'; end if;
    elsif group_attr = 'rank_tier' then
      resolved_group := 'tier_' || greatest(0, floor(rating / 1250))::integer::text;
    elsif group_attr = 'random' then
      resolved_group := 'random';
    else
      resolved_group := nullif(trim(coalesce(p_group_value, '')), '');
      if resolved_group is null then raise exception 'profile_attribute_required'; end if;
    end if;
  end if;

  insert into public.special_event_entries(edition_id, user_id, requested_crew_id, group_snapshot, entry_rating, registered_at, cancelled_at, status)
  values (
    edition.id, uid, resolved_crew,
    case when group_attr is not null then jsonb_build_object(group_attr, resolved_group) else '{}'::jsonb end,
    rating, now_at, null, 'registered'
  )
  on conflict (edition_id, user_id) do update set
    requested_crew_id = excluded.requested_crew_id,
    group_snapshot = excluded.group_snapshot,
    entry_rating = excluded.entry_rating,
    registered_at = case when public.special_event_entries.status = 'cancelled' then excluded.registered_at else public.special_event_entries.registered_at end,
    cancelled_at = null,
    status = 'registered'
  returning * into saved;

  return jsonb_build_object(
    'id', saved.id, 'editionId', saved.edition_id, 'status', saved.status,
    'requestedCrewId', saved.requested_crew_id, 'groupSnapshot', saved.group_snapshot,
    'entryRating', saved.entry_rating, 'registeredAt', saved.registered_at
  );
end; $$;
revoke all on function public.register_special_event(uuid, uuid, text) from public, anon;
grant execute on function public.register_special_event(uuid, uuid, text) to authenticated;

create function public.cancel_special_event(p_edition_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  edition public.special_event_editions;
  updated_id uuid;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('special-event:' || p_edition_id::text, 71001));
  select * into edition from public.special_event_editions where id = p_edition_id;
  if edition.id is null then raise exception 'edition_not_found'; end if;
  if now_at >= edition.registration_closes_at or now_at >= edition.starts_at or edition.finalized_at is not null then
    raise exception 'registration_closed';
  end if;
  update public.special_event_entries set status = 'cancelled', cancelled_at = now_at
  where edition_id = p_edition_id and user_id = uid and status = 'registered' returning id into updated_id;
  if updated_id is null then raise exception 'not_registered'; end if;
  return jsonb_build_object('id', updated_id, 'status', 'cancelled');
end; $$;
revoke all on function public.cancel_special_event(uuid) from public, anon;
grant execute on function public.cancel_special_event(uuid) to authenticated;

create function public.admin_save_special_event_edition(
  p_actor_id uuid, p_edition_id uuid, p_slug text, p_series_key text, p_sport text,
  p_title text, p_subtitle text, p_config jsonb,
  p_registration_opens_at timestamptz, p_registration_closes_at timestamptz,
  p_starts_at timestamptz, p_ends_at timestamptz, p_published boolean
) returns public.special_event_editions language plpgsql security invoker set search_path = '' as $$
declare
  previous public.special_event_editions;
  saved public.special_event_editions;
  now_at timestamptz := clock_timestamp();
begin
  if p_actor_id is null then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_edition_id is not null then
    select * into previous from public.special_event_editions where id = p_edition_id for update;
    if not found then raise exception 'edition_not_found'; end if;
    if (previous.finalized_at is not null or previous.starts_at <= now_at) and (
      previous.sport <> p_sport or previous.config <> p_config or previous.starts_at <> p_starts_at
      or previous.ends_at <> p_ends_at or previous.registration_closes_at <> p_registration_closes_at
    ) then raise exception 'edition_already_started'; end if;
    update public.special_event_editions
    set slug = p_slug, series_key = p_series_key, sport = p_sport, title = trim(p_title),
        subtitle = coalesce(trim(p_subtitle), ''), config = p_config,
        registration_opens_at = p_registration_opens_at, registration_closes_at = p_registration_closes_at,
        starts_at = p_starts_at, ends_at = p_ends_at, published = p_published, updated_at = now_at
    where id = p_edition_id returning * into saved;
  else
    insert into public.special_event_editions(
      slug, series_key, sport, title, subtitle, config,
      registration_opens_at, registration_closes_at, starts_at, ends_at, published, created_by
    ) values (
      p_slug, p_series_key, p_sport, trim(p_title), coalesce(trim(p_subtitle), ''), p_config,
      p_registration_opens_at, p_registration_closes_at, p_starts_at, p_ends_at, p_published, p_actor_id
    ) returning * into saved;
  end if;
  return saved;
end; $$;
revoke all on function public.admin_save_special_event_edition(uuid, uuid, text, text, text, text, text, jsonb, timestamptz, timestamptz, timestamptz, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.admin_save_special_event_edition(uuid, uuid, text, text, text, text, text, jsonb, timestamptz, timestamptz, timestamptz, timestamptz, boolean) to service_role;
