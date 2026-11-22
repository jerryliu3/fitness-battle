-- Special events: track highest acknowledged settled round per entrant for daily cut/advancement ceremonies.

alter table public.special_event_entries
  add column if not exists acknowledged_round smallint not null default 0;

create or replace function public.list_special_events()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  allow_demo boolean;
  due_id uuid;
  result jsonb;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  allow_demo := private.is_demo_athlete(uid);

  perform private.materialize_special_event_templates(now_at);

  for due_id in
    select e.id from public.special_event_editions e
    where e.published = true and (not e.demo_only or allow_demo) and e.settled_at is null and e.starts_at <= now_at
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
            'acknowledgedAt', ent.acknowledged_at, 'acknowledgedRound', ent.acknowledged_round
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
    where e.published = true and (not e.demo_only or allow_demo) and (
      e.ends_at > now_at - interval '14 days'
      or exists (select 1 from public.special_event_entries mine where mine.edition_id = e.id and mine.user_id = uid and mine.status <> 'cancelled')
    )
  ) rows;
  return result;
end; $$;
revoke all on function public.list_special_events() from public, anon;
grant execute on function public.list_special_events() to authenticated;

create or replace function public.acknowledge_special_event(p_edition_id uuid, p_round_number smallint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  updated public.special_event_entries;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  update public.special_event_entries
  set acknowledged_at = now_at,
      acknowledged_round = greatest(acknowledged_round, coalesce(p_round_number, acknowledged_round))
  where edition_id = p_edition_id and user_id = uid and status <> 'cancelled'
  returning * into updated;

  if updated.id is null then raise exception 'not_registered'; end if;
  return jsonb_build_object(
    'id', updated.id,
    'acknowledgedAt', updated.acknowledged_at,
    'acknowledgedRound', updated.acknowledged_round
  );
end; $$;
revoke all on function public.acknowledge_special_event(uuid, smallint) from public, anon;
grant execute on function public.acknowledge_special_event(uuid, smallint) to authenticated;
