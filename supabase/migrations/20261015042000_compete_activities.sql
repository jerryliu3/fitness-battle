-- Compete normalize P3: enrich activities for compete SoT; crew share reads them.

alter table public.activities
  add column if not exists sport text
    check (sport is null or sport in ('running', 'cycling', 'walking', 'strength')),
  add column if not exists distance_m numeric,
  add column if not exists verified boolean not null default false,
  add column if not exists provenance text not null default 'recorded'
    check (provenance in ('recorded', 'imported', 'manual', 'demo')),
  add column if not exists disposition text not null default 'counted'
    check (disposition in ('counted', 'pending', 'excluded')),
  add column if not exists disposition_reason text,
  add column if not exists compete_key text,
  add column if not exists source_label text;

update public.activities
set compete_key = provider::text || '-' || external_id
where compete_key is null;

update public.activities
set source_label = provider::text
where source_label is null;

-- Only enforce NOT NULL when every row has a key (empty table is fine).
do $$
begin
  if not exists (
    select 1 from public.activities where compete_key is null
  ) then
    alter table public.activities alter column compete_key set not null;
  end if;
end $$;

create unique index if not exists activities_user_compete_key_uidx
  on public.activities (user_id, compete_key);

create index if not exists activities_user_started_compete_idx
  on public.activities (user_id, started_at desc);

drop policy if exists activities_own_insert on public.activities;
drop policy if exists activities_own_update on public.activities;
drop policy if exists activities_own_delete on public.activities;

create policy activities_own_insert on public.activities
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy activities_own_update on public.activities
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy activities_own_delete on public.activities
  for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.share_crew_week(p_crew_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  crew_sport text;
  week_start timestamptz;
  week_end timestamptz;
  saved integer := 0;
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

  week_start := (date_trunc('week', (statement_timestamp() at time zone 'utc')) at time zone 'utc');
  week_end := week_start + interval '7 days';

  with incoming as (
    select
      a.compete_key as id,
      a.started_at,
      coalesce(a.sport, crew_sport) as sport,
      coalesce(
        a.distance_m,
        case
          when coalesce(a.sport, crew_sport) in ('running', 'cycling', 'walking')
            then a.metric_value
          else 0
        end,
        0
      ) as distance_m,
      coalesce(a.moving_sec, 0) as moving_sec,
      coalesce(a.provenance, 'recorded') as provenance
    from public.activities a
    where a.user_id = uid
      and coalesce(a.sport, crew_sport) = crew_sport
      and a.disposition = 'counted'
      and a.provenance <> 'demo'
      and coalesce(a.source_label, a.provider::text) <> 'history'
      and a.started_at >= week_start
      and a.started_at < week_end
      and a.compete_key is not null
  ),
  upserted as (
    insert into public.crew_entries (
      crew_id, user_id, activity_id, started_at, sport, distance_m, moving_sec, disposition, provenance
    )
    select p_crew_id, uid, id, started_at, sport, distance_m, moving_sec, 'counted', provenance
    from incoming
    on conflict (crew_id, user_id, activity_id) do update
      set started_at = excluded.started_at,
          sport = excluded.sport,
          distance_m = excluded.distance_m,
          moving_sec = excluded.moving_sec,
          disposition = 'counted',
          provenance = excluded.provenance
    returning 1
  ),
  retired as (
    update public.crew_entries entry
    set disposition = 'excluded'
    where entry.crew_id = p_crew_id
      and entry.user_id = uid
      and entry.started_at >= week_start
      and entry.started_at < week_end
      and not exists (
        select 1 from incoming where incoming.id = entry.activity_id
      )
    returning 1
  )
  select coalesce((select count(*) from upserted), 0)::integer into saved;

  return saved;
end;
$$;

revoke all on function public.share_crew_week(uuid) from public, anon;
grant execute on function public.share_crew_week(uuid) to authenticated;
