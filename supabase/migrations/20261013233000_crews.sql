-- Private crews: invite code, shared counted sessions, cheers, and notices.
-- Membership changes go through create_crew / join_crew.

create table public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique check (char_length(invite_code) between 6 and 12),
  sport text not null,
  format text not null default 'volume' check (format in ('volume', 'personal_target', 'cooperative')),
  target_sessions integer not null default 3 check (target_sessions between 1 and 14),
  journey_km numeric not null default 40 check (journey_km > 0),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.crew_members (
  crew_id uuid not null references public.crews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'declined')),
  rest_week date,
  primary key (crew_id, user_id)
);

create table public.crew_entries (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_id text not null,
  started_at timestamptz not null,
  sport text not null,
  distance_m numeric not null default 0 check (distance_m >= 0),
  moving_sec numeric not null default 0 check (moving_sec >= 0),
  disposition text not null default 'counted' check (disposition in ('counted', 'pending', 'excluded')),
  provenance text not null default 'recorded',
  unique (crew_id, user_id, activity_id)
);

create table public.crew_cheers (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  activity_id text not null,
  created_at timestamptz not null default now(),
  unique (crew_id, from_user, activity_id)
);

create table public.crew_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  crew_id uuid references public.crews (id) on delete cascade,
  kind text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Membership checks must not query crew_members under that table's own policy.
create schema if not exists private;

create or replace function private.is_active_crew_member(p_crew_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.crew_members member
    where member.crew_id = p_crew_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
  );
$$;

revoke all on function private.is_active_crew_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_active_crew_member(uuid) to authenticated;

alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.crew_entries enable row level security;
alter table public.crew_cheers enable row level security;
alter table public.crew_notices enable row level security;

create policy crews_member_select on public.crews
  for select to authenticated
  using (private.is_active_crew_member(id));

create policy crew_members_select on public.crew_members
  for select to authenticated
  using (private.is_active_crew_member(crew_id));

create policy crew_entries_select on public.crew_entries
  for select to authenticated
  using (private.is_active_crew_member(crew_id));

create policy crew_entries_insert_own on public.crew_entries
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.is_active_crew_member(crew_id)
  );

create policy crew_entries_update_own on public.crew_entries
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and private.is_active_crew_member(crew_id)
  )
  with check (
    user_id = (select auth.uid())
    and private.is_active_crew_member(crew_id)
  );

create policy crew_cheers_select on public.crew_cheers
  for select to authenticated
  using (private.is_active_crew_member(crew_id));

create policy crew_notices_own on public.crew_notices
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy crew_notices_read on public.crew_notices
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.create_crew(
  p_name text,
  p_sport text,
  p_format text default 'volume',
  p_target_sessions integer default 3,
  p_journey_km numeric default 40
)
returns public.crews
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  created public.crews;
  code text;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if p_format not in ('volume', 'personal_target', 'cooperative') then
    raise exception 'invalid_format';
  end if;
  if char_length(trim(p_name)) < 1 then
    raise exception 'name_required';
  end if;
  code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.crews (name, invite_code, sport, format, target_sessions, journey_km, created_by)
  values (
    left(trim(p_name), 80),
    code,
    p_sport,
    p_format,
    least(14, greatest(1, p_target_sessions)),
    greatest(1, p_journey_km),
    uid
  )
  returning * into created;
  insert into public.crew_members (crew_id, user_id, display_name, status)
  select created.id, uid, p.display_name, 'active'
  from public.profiles p
  where p.id = uid;
  return created;
end;
$$;

create or replace function public.join_crew(p_code text)
returns public.crews
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  found public.crews;
  members integer;
  joiner text;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  select * into found
  from public.crews
  where invite_code = lower(trim(p_code));
  if found.id is null then
    raise exception 'invite_not_found';
  end if;
  if exists (
    select 1 from public.crew_members m
    where m.crew_id = found.id and m.user_id = uid and m.status = 'active'
  ) then
    return found;
  end if;
  select count(*) into members
  from public.crew_members m
  where m.crew_id = found.id and m.status = 'active';
  if members >= 8 then
    raise exception 'crew_full';
  end if;
  select display_name into joiner from public.profiles where id = uid;
  insert into public.crew_members (crew_id, user_id, display_name, status)
  values (found.id, uid, coalesce(joiner, 'Athlete'), 'active');
  insert into public.crew_notices (user_id, crew_id, kind, body)
  values (
    found.created_by,
    found.id,
    'invite_accepted',
    coalesce(joiner, 'Someone') || ' joined ' || found.name || '.'
  );
  return found;
end;
$$;

-- Rebuild this member's current Monday week from the account snapshot.
create or replace function public.share_crew_week(p_crew_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  crew_sport text;
  snapshot jsonb;
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
  select state into snapshot from public.compete_snapshots where user_id = uid;
  week_start := (date_trunc('week', (statement_timestamp() at time zone 'utc')) at time zone 'utc');
  week_end := week_start + interval '7 days';

  with incoming as (
    select
      activity.id,
      activity."startedAt" as started_at,
      activity.sport,
      coalesce(activity."distanceM", 0) as distance_m,
      coalesce(activity."movingSec", 0) as moving_sec,
      coalesce(activity.provenance, 'recorded') as provenance
    from jsonb_to_recordset(coalesce(snapshot -> 'activities', '[]'::jsonb))
      as activity(
        id text,
        "startedAt" timestamptz,
        sport text,
        "distanceM" numeric,
        "movingSec" numeric,
        disposition text,
        provenance text,
        source text
      )
    where activity.id is not null
      and activity.sport = crew_sport
      and coalesce(activity.disposition, 'counted') = 'counted'
      and coalesce(activity.source, '') <> 'history'
      and coalesce(activity.provenance, 'recorded') <> 'demo'
      and activity."startedAt" >= week_start
      and activity."startedAt" < week_end
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
  select
    coalesce((select count(*) from upserted), 0)::integer
    + coalesce((select count(*) from retired), 0) * 0
  into saved;

  return saved;
end;
$$;

revoke all on function public.create_crew(text, text, text, integer, numeric) from public, anon;
revoke all on function public.share_crew_week(uuid) from public, anon;
grant execute on function public.share_crew_week(uuid) to authenticated;
revoke all on function public.join_crew(text) from public, anon;
grant execute on function public.create_crew(text, text, text, integer, numeric) to authenticated;
grant execute on function public.join_crew(text) to authenticated;
