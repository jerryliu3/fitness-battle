-- Special events PR 5: Canonical city_slug grouping + cron-free repeating auto-schedule templates.

alter table public.profiles
  add column if not exists city_slug text
  check (city_slug is null or city_slug ~ '^[a-z]{2}:[a-z0-9-]{2,60}$');

create or replace function public.register_special_event(
  p_edition_id uuid, p_crew_id uuid default null, p_group_value text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
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
    elsif group_attr = 'city_slug' then
      resolved_group := lower(nullif(trim(coalesce(p_group_value, prof.city_slug, '')), ''));
      if resolved_group is null or resolved_group !~ '^[a-z]{2}:[a-z0-9-]{2,60}$' then raise exception 'city_required'; end if;
      if prof.city_slug is distinct from resolved_group then
        update public.profiles set city_slug = resolved_group where id = uid;
      end if;
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

create table if not exists public.special_event_templates (
  id uuid primary key default gen_random_uuid(),
  series_key text not null unique check (series_key ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  sport text not null check (sport in ('running', 'cycling', 'walking', 'strength')),
  title text not null check (char_length(trim(title)) between 2 and 80),
  subtitle text not null default '' check (char_length(subtitle) <= 160),
  config jsonb not null,
  cadence_weeks smallint not null default 1 check (cadence_weeks between 1 and 8),
  active boolean not null default true,
  next_start_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.special_event_templates enable row level security;
revoke all on public.special_event_templates from public, anon, authenticated;

-- Cron-free materializer: creates published editions once inside their pre-registration week
-- (7 days before next_start_at in America/New_York) and advances next_start_at DST-safely.
create or replace function private.materialize_special_event_templates(p_now timestamptz default clock_timestamp())
returns integer language plpgsql security definer set search_path = '' as $$
declare
  tpl public.special_event_templates;
  start_day date;
  reg_open timestamptz;
  starts timestamptz;
  ends timestamptz;
  duration_weeks integer;
  step_days integer;
  guard integer;
  inserted_id uuid;
  created_count integer := 0;
begin
  -- Fast path: avoid taking a lock when no active template is due.
  if not exists (
    select 1 from public.special_event_templates t
    where t.active = true
      and (((t.next_start_at at time zone 'America/New_York')::date - 7)::timestamp at time zone 'America/New_York') <= p_now
  ) then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('special-event-templates', 71005));

  for tpl in
    select * from public.special_event_templates t
    where t.active = true
      and (((t.next_start_at at time zone 'America/New_York')::date - 7)::timestamp at time zone 'America/New_York') <= p_now
    order by t.next_start_at asc, t.id
  loop
    start_day := (tpl.next_start_at at time zone 'America/New_York')::date;
    duration_weeks := case
      when tpl.config->'cadence'->>'unit' = 'weekly' then greatest(1, least(8, coalesce((tpl.config->'cadence'->>'roundCount')::integer, 1)))
      else 1
    end;
    step_days := greatest(tpl.cadence_weeks::integer, duration_weeks) * 7;
    guard := 0;

    loop
      guard := guard + 1;
      exit when guard > 52;
      reg_open := ((start_day - 7)::timestamp at time zone 'America/New_York');
      exit when reg_open > p_now;

      starts := ((start_day::timestamp + interval '6 hours') at time zone 'America/New_York');
      ends := ((start_day + duration_weeks * 7)::timestamp at time zone 'America/New_York');

      -- Only materialize editions whose registration cutoff has not yet passed.
      if starts > p_now then
        inserted_id := null;
        insert into public.special_event_editions(
          slug, series_key, sport, title, subtitle, config,
          registration_opens_at, registration_closes_at, starts_at, ends_at, published, created_by
        ) values (
          left(to_char(start_day, 'YYYY-MM-DD') || '-' || tpl.series_key, 80),
          tpl.series_key, tpl.sport, tpl.title, tpl.subtitle, tpl.config,
          reg_open, starts, starts, ends, true, tpl.created_by
        )
        on conflict (slug) do nothing
        returning id into inserted_id;
        if inserted_id is not null then
          created_count := created_count + 1;
        end if;
      end if;

      start_day := start_day + step_days;
    end loop;

    update public.special_event_templates
    set next_start_at = ((start_day::timestamp + interval '6 hours') at time zone 'America/New_York'),
        updated_at = p_now
    where id = tpl.id;
  end loop;

  return created_count;
end; $$;
revoke all on function private.materialize_special_event_templates(timestamptz) from public, anon, authenticated;

create or replace function public.list_special_events()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  due_id uuid;
  result jsonb;
begin
  if uid is null then raise exception 'authentication_required'; end if;

  perform private.materialize_special_event_templates(now_at);

  for due_id in
    select e.id from public.special_event_editions e
    where e.published = true and e.settled_at is null and e.starts_at <= now_at
      and exists (select 1 from public.special_event_entries ent where ent.edition_id = e.id and ent.user_id = uid and ent.status <> 'cancelled')
  loop
    perform private.settle_special_event_rounds(due_id, false);
  end loop;

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

create or replace function public.admin_save_special_event_template(
  p_actor_id uuid, p_template_id uuid, p_series_key text, p_sport text,
  p_title text, p_subtitle text, p_config jsonb,
  p_cadence_weeks smallint, p_active boolean, p_next_start_at timestamptz
) returns public.special_event_templates language plpgsql security invoker set search_path = '' as $$
declare
  saved public.special_event_templates;
  now_at timestamptz := clock_timestamp();
begin
  if p_actor_id is null then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_template_id is not null then
    update public.special_event_templates
    set series_key = p_series_key, sport = p_sport, title = trim(p_title),
        subtitle = coalesce(trim(p_subtitle), ''), config = p_config,
        cadence_weeks = p_cadence_weeks, active = p_active, next_start_at = p_next_start_at,
        updated_at = now_at
    where id = p_template_id returning * into saved;
    if not found then raise exception 'template_not_found'; end if;
  else
    insert into public.special_event_templates(
      series_key, sport, title, subtitle, config, cadence_weeks, active, next_start_at, created_by
    ) values (
      p_series_key, p_sport, trim(p_title), coalesce(trim(p_subtitle), ''), p_config,
      p_cadence_weeks, p_active, p_next_start_at, p_actor_id
    ) returning * into saved;
  end if;
  return saved;
end; $$;
revoke all on function public.admin_save_special_event_template(uuid, uuid, text, text, text, text, jsonb, smallint, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_save_special_event_template(uuid, uuid, text, text, text, text, jsonb, smallint, boolean, timestamptz) to service_role;

create or replace function public.admin_run_special_event_templates(p_actor_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
begin
  if p_actor_id is null then raise exception 'admin_required' using errcode = '42501'; end if;
  return private.materialize_special_event_templates(clock_timestamp());
end; $$;
revoke all on function public.admin_run_special_event_templates(uuid) from public, anon, authenticated;
grant execute on function public.admin_run_special_event_templates(uuid) to service_role;
