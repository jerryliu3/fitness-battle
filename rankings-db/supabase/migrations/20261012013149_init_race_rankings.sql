-- Race rankings ledger. Separate from Fitness Battle.
-- A source record is one observation of a finisher. Re-imports update that row.
-- Finish time is never part of the uniqueness key.
-- Athlete linking across events is intentionally not in this migration.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

-- Length-prefixed so a delimiter inside a name cannot collide two keys.
-- Keep in sync with packages/rankings/src/fingerprint.ts.
create or replace function private.result_fingerprint(
  p_source_id bigint,
  p_event_edition_id bigint,
  p_normalized_name text,
  p_normalized_bib text,
  p_category_key text
) returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(
      convert_to(
        octet_length(convert_to(p_source_id::text, 'UTF8'))::text || ':' || p_source_id::text || '|'
        || octet_length(convert_to(p_event_edition_id::text, 'UTF8'))::text || ':' || p_event_edition_id::text || '|'
        || octet_length(convert_to(p_normalized_name, 'UTF8'))::text || ':' || p_normalized_name || '|'
        || octet_length(convert_to(coalesce(p_normalized_bib, ''), 'UTF8'))::text || ':' || coalesce(p_normalized_bib, '') || '|'
        || octet_length(convert_to(p_category_key, 'UTF8'))::text || ':' || p_category_key,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

revoke all on function private.result_fingerprint(bigint, bigint, text, text, text) from public;

create table public.sources (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9_]+$'),
  name text not null check (char_length(name) between 1 and 200),
  access_method text not null default '',
  reuse_notes text not null default '',
  attribution text not null default '',
  display_allowed boolean not null default false,
  audited_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sources_display_requires_audit check (
    not display_allowed
    or (
      audited_at is not null
      and char_length(reuse_notes) > 0
      and char_length(attribution) > 0
    )
  )
);

create table public.source_snapshots (
  id bigint generated always as identity primary key,
  source_id bigint not null references public.sources (id),
  storage_path text not null check (char_length(storage_path) > 0),
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  byte_size bigint not null check (byte_size >= 0),
  fetched_at timestamptz not null default now()
);

create index source_snapshots_source_id_idx on public.source_snapshots (source_id);

create table public.ingestion_runs (
  id bigint generated always as identity primary key,
  source_id bigint not null references public.sources (id),
  snapshot_id bigint references public.source_snapshots (id),
  status text not null check (status in ('running', 'succeeded', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  input_count integer not null default 0 check (input_count >= 0),
  insert_count integer not null default 0 check (insert_count >= 0),
  update_count integer not null default 0 check (update_count >= 0),
  skip_count integer not null default 0 check (skip_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  error_summary text not null default ''
);

create index ingestion_runs_source_id_idx on public.ingestion_runs (source_id);
create index ingestion_runs_snapshot_id_idx on public.ingestion_runs (snapshot_id);

create table public.events (
  id bigint generated always as identity primary key,
  source_id bigint not null references public.sources (id),
  external_event_id text,
  name text not null check (char_length(name) between 1 and 300),
  created_at timestamptz not null default now()
);

create index events_source_id_idx on public.events (source_id);

create unique index events_source_external_idx
  on public.events (source_id, external_event_id)
  where external_event_id is not null;

create table public.event_editions (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events (id),
  edition_year integer not null check (edition_year between 1900 and 2100),
  starts_on date,
  name text not null check (char_length(name) between 1 and 300),
  created_at timestamptz not null default now(),
  unique (event_id, edition_year)
);

create table public.source_records (
  id bigint generated always as identity primary key,
  source_id bigint not null references public.sources (id),
  event_edition_id bigint not null references public.event_editions (id),
  external_result_id text,
  normalized_name text not null check (char_length(normalized_name) > 0),
  normalized_bib text,
  category_key text not null check (
    category_key ~ '^(5k|10k|half_marathon|marathon):(female|male|other|unknown)$'
  ),
  result_fingerprint text generated always as (
    private.result_fingerprint(
      source_id,
      event_edition_id,
      normalized_name,
      normalized_bib,
      category_key
    )
  ) stored,
  snapshot_id bigint references public.source_snapshots (id),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_ingestion_run_id bigint references public.ingestion_runs (id)
);

comment on column public.source_records.result_fingerprint is
  'Identity of a source row. Built from source, edition, name, bib, and category. Finish time is excluded so a correction updates this row.';

create unique index source_records_external_result_idx
  on public.source_records (source_id, external_result_id)
  where external_result_id is not null;

create unique index source_records_fingerprint_idx
  on public.source_records (source_id, event_edition_id, result_fingerprint)
  where external_result_id is null;

create index source_records_source_id_idx on public.source_records (source_id);
create index source_records_event_edition_id_idx on public.source_records (event_edition_id);
create index source_records_snapshot_id_idx on public.source_records (snapshot_id);
create index source_records_ingestion_run_id_idx on public.source_records (last_ingestion_run_id);

create table public.performances (
  id bigint generated always as identity primary key,
  source_record_id bigint not null unique references public.source_records (id),
  event_edition_id bigint not null references public.event_editions (id),
  athlete_name text not null check (char_length(athlete_name) > 0),
  sex text not null check (sex in ('female', 'male', 'other', 'unknown')),
  distance_slug text not null check (distance_slug in ('5k', '10k', 'half_marathon', 'marathon')),
  age_years integer check (age_years is null or age_years between 18 and 120),
  chip_time_ms bigint check (chip_time_ms is null or chip_time_ms > 0),
  gun_time_ms bigint check (gun_time_ms is null or gun_time_ms > 0),
  rank_time_ms bigint check (rank_time_ms is null or rank_time_ms > 0),
  rank_clock text check (rank_clock in ('chip', 'gun')),
  finish_status text not null check (finish_status in ('finished', 'dnf', 'dns', 'dq', 'unknown')),
  result_date date,
  source_url text not null default '',
  unpublished boolean not null default false,
  eligible boolean generated always as (
    finish_status = 'finished' and rank_time_ms is not null
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint performances_rank_clock_matches check (
    (rank_time_ms is null and rank_clock is null)
    or (rank_clock = 'chip' and chip_time_ms = rank_time_ms)
    or (rank_clock = 'gun' and gun_time_ms = rank_time_ms)
  )
);

create index performances_event_edition_id_idx on public.performances (event_edition_id);

create index performances_leaderboard_idx
  on public.performances (distance_slug, sex, rank_time_ms)
  where eligible and not unpublished;

create or replace function private.leaderboard_rows()
returns table (
  id bigint,
  athlete_name text,
  sex text,
  distance_slug text,
  rank_time_ms bigint,
  rank_clock text,
  age_years integer,
  result_date date,
  event_name text,
  edition_year integer,
  attribution text,
  source_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.athlete_name,
    p.sex,
    p.distance_slug,
    p.rank_time_ms,
    p.rank_clock,
    p.age_years,
    p.result_date,
    e.name as event_name,
    ed.edition_year,
    s.attribution,
    p.source_url
  from public.performances p
  join public.source_records sr on sr.id = p.source_record_id
  join public.sources s on s.id = sr.source_id
  join public.event_editions ed on ed.id = p.event_edition_id
  join public.events e on e.id = ed.event_id
  where p.eligible
    and not p.unpublished
    and s.display_allowed;
$$;

revoke all on function private.leaderboard_rows() from public;

create view public.leaderboard_entries
with (security_invoker = true) as
select * from private.leaderboard_rows();

comment on view public.leaderboard_entries is
  'Public road leaderboard. One row per persisted result. Cross-event athlete merges are not applied.';

create or replace function private.upsert_source_record(
  p_source_id bigint,
  p_event_edition_id bigint,
  p_external_result_id text,
  p_normalized_name text,
  p_normalized_bib text,
  p_category_key text,
  p_ingestion_run_id bigint,
  p_snapshot_id bigint
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_external text := nullif(btrim(coalesce(p_external_result_id, '')), '');
  v_bib text := nullif(btrim(coalesce(p_normalized_bib, '')), '');
  v_name text := btrim(p_normalized_name);
  v_inserted boolean;
begin
  if v_name is null or v_name = '' then
    raise exception 'normalized_name is required';
  end if;

  if not exists (
    select 1
    from public.event_editions ed
    join public.events e on e.id = ed.event_id
    where ed.id = p_event_edition_id
      and e.source_id = p_source_id
  ) then
    raise exception 'event edition % does not belong to source %', p_event_edition_id, p_source_id;
  end if;

  if v_external is not null then
    insert into public.source_records (
      source_id,
      event_edition_id,
      external_result_id,
      normalized_name,
      normalized_bib,
      category_key,
      snapshot_id,
      last_ingestion_run_id
    ) values (
      p_source_id,
      p_event_edition_id,
      v_external,
      v_name,
      v_bib,
      p_category_key,
      p_snapshot_id,
      p_ingestion_run_id
    )
    on conflict (source_id, external_result_id) where external_result_id is not null
    do update set
      event_edition_id = excluded.event_edition_id,
      normalized_name = excluded.normalized_name,
      normalized_bib = excluded.normalized_bib,
      category_key = excluded.category_key,
      snapshot_id = excluded.snapshot_id,
      last_ingestion_run_id = excluded.last_ingestion_run_id,
      last_seen_at = now()
    returning (xmax = 0) into v_inserted;
  else
    insert into public.source_records (
      source_id,
      event_edition_id,
      external_result_id,
      normalized_name,
      normalized_bib,
      category_key,
      snapshot_id,
      last_ingestion_run_id
    ) values (
      p_source_id,
      p_event_edition_id,
      null,
      v_name,
      v_bib,
      p_category_key,
      p_snapshot_id,
      p_ingestion_run_id
    )
    on conflict (source_id, event_edition_id, result_fingerprint)
      where external_result_id is null
    do update set
      normalized_name = excluded.normalized_name,
      normalized_bib = excluded.normalized_bib,
      category_key = excluded.category_key,
      snapshot_id = excluded.snapshot_id,
      last_ingestion_run_id = excluded.last_ingestion_run_id,
      last_seen_at = now()
    returning (xmax = 0) into v_inserted;
  end if;

  if v_inserted then
    return 'inserted';
  end if;
  return 'updated';
end;
$$;

revoke all on function private.upsert_source_record(bigint, bigint, text, text, text, text, bigint, bigint) from public;

create or replace function private.upsert_performance(
  p_source_record_id bigint,
  p_athlete_name text,
  p_sex text,
  p_distance_slug text,
  p_age_years integer,
  p_chip_time_ms bigint,
  p_gun_time_ms bigint,
  p_finish_status text,
  p_result_date date,
  p_source_url text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_edition_id bigint;
  v_category_key text;
  v_rank_time bigint;
  v_rank_clock text;
  v_inserted boolean;
begin
  if p_age_years is not null and p_age_years < 18 then
    raise exception 'youth results are not stored';
  end if;

  select event_edition_id, category_key
  into v_edition_id, v_category_key
  from public.source_records
  where id = p_source_record_id;

  if v_edition_id is null then
    raise exception 'source record % not found', p_source_record_id;
  end if;

  if v_category_key <> p_distance_slug || ':' || p_sex then
    raise exception 'performance category does not match source record';
  end if;

  if p_chip_time_ms is not null then
    v_rank_time := p_chip_time_ms;
    v_rank_clock := 'chip';
  elsif p_gun_time_ms is not null then
    v_rank_time := p_gun_time_ms;
    v_rank_clock := 'gun';
  else
    v_rank_time := null;
    v_rank_clock := null;
  end if;

  insert into public.performances (
    source_record_id,
    event_edition_id,
    athlete_name,
    sex,
    distance_slug,
    age_years,
    chip_time_ms,
    gun_time_ms,
    rank_time_ms,
    rank_clock,
    finish_status,
    result_date,
    source_url
  ) values (
    p_source_record_id,
    v_edition_id,
    btrim(p_athlete_name),
    p_sex,
    p_distance_slug,
    p_age_years,
    p_chip_time_ms,
    p_gun_time_ms,
    v_rank_time,
    v_rank_clock,
    p_finish_status,
    p_result_date,
    coalesce(p_source_url, '')
  )
  on conflict (source_record_id)
  do update set
    athlete_name = excluded.athlete_name,
    sex = excluded.sex,
    distance_slug = excluded.distance_slug,
    age_years = excluded.age_years,
    chip_time_ms = excluded.chip_time_ms,
    gun_time_ms = excluded.gun_time_ms,
    rank_time_ms = excluded.rank_time_ms,
    rank_clock = excluded.rank_clock,
    finish_status = excluded.finish_status,
    result_date = excluded.result_date,
    source_url = excluded.source_url,
    updated_at = now()
  returning (xmax = 0) into v_inserted;

  if v_inserted then
    return 'inserted';
  end if;
  return 'updated';
end;
$$;

revoke all on function private.upsert_performance(bigint, text, text, text, integer, bigint, bigint, text, date, text) from public;

alter table public.sources enable row level security;
alter table public.source_snapshots enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.events enable row level security;
alter table public.event_editions enable row level security;
alter table public.source_records enable row level security;
alter table public.performances enable row level security;

revoke all on table public.sources from anon, authenticated;
revoke all on table public.source_snapshots from anon, authenticated;
revoke all on table public.ingestion_runs from anon, authenticated;
revoke all on table public.events from anon, authenticated;
revoke all on table public.event_editions from anon, authenticated;
revoke all on table public.source_records from anon, authenticated;
revoke all on table public.performances from anon, authenticated;

grant select, insert, update, delete on table
  public.sources,
  public.source_snapshots,
  public.ingestion_runs,
  public.events,
  public.event_editions,
  public.source_records,
  public.performances
to service_role;

grant usage, select on all sequences in schema public to service_role;
grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.leaderboard_rows() to anon, authenticated, service_role;
grant select on public.leaderboard_entries to anon, authenticated, service_role;
grant execute on function private.upsert_source_record(bigint, bigint, text, text, text, text, bigint, bigint) to service_role;
grant execute on function private.upsert_performance(bigint, text, text, text, integer, bigint, bigint, text, date, text) to service_role;
