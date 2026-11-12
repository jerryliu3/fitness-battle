-- Provider-independent acquisition inbox, source review, edition mapping, and durable runs.

create table public.acquisition_candidates (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  event_name text not null check (char_length(event_name) between 1 and 300),
  official_website text,
  edition_year integer check (edition_year between 1900 and 2100),
  starts_on date,
  location_text text,
  distances text[] not null default '{}',
  results_urls text[] not null default '{}',
  discovery_source text not null default 'manual',
  discovered_at timestamptz not null default now(),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected', 'blocked')),
  unresolved_fields text[] not null default '{}',
  mapped_event_id bigint references public.events (id),
  mapped_edition_id bigint references public.event_editions (id),
  dedupe_key text not null unique
);

create index acquisition_candidates_review_status_idx on public.acquisition_candidates (review_status);

create table public.acquisition_source_decisions (
  id bigint generated always as identity primary key,
  candidate_id bigint references public.acquisition_candidates (id),
  source_slug text not null check (source_slug ~ '^[a-z0-9_]+$'),
  decision text not null default 'pending'
    check (decision in ('pending', 'permitted', 'blocked')),
  access_method text not null default '',
  storage_allowed boolean not null default false,
  display_allowed boolean not null default false,
  attribution text not null default '',
  reuse_notes text not null default '',
  evidence_url text,
  reviewer text,
  reviewed_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (source_slug)
);

create table public.acquisition_edition_mappings (
  id bigint generated always as identity primary key,
  candidate_id bigint not null references public.acquisition_candidates (id),
  source_decision_id bigint not null references public.acquisition_source_decisions (id),
  adapter text not null check (adapter in ('nyrr', 'mikatiming', 'csv', 'runsignup', 'opentrack')),
  population_key text not null unique check (char_length(population_key) > 0),
  external_event_id text,
  distance_slug text not null check (distance_slug in ('5k', '10k', 'half_marathon', 'marathon')),
  edition_year integer not null check (edition_year between 1900 and 2100),
  event_name text not null check (char_length(event_name) between 1 and 300),
  starts_on date,
  source_url text not null check (char_length(source_url) > 0),
  adapter_config jsonb not null default '{}',
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz not null default now(),
  unique (candidate_id, population_key)
);

create table public.acquisition_runs (
  id bigint generated always as identity primary key,
  mapping_id bigint not null references public.acquisition_edition_mappings (id),
  status text not null default 'queued'
    check (status in ('queued', 'leased', 'succeeded', 'failed', 'blocked', 'cancelled')),
  lease_owner text,
  lease_until timestamptz,
  parser_version text not null default '',
  artifact_dir text,
  normalized_sha256 text check (normalized_sha256 is null or normalized_sha256 ~ '^[a-f0-9]{64}$'),
  raw_sha256 text check (raw_sha256 is null or raw_sha256 ~ '^[a-f0-9]{64}$'),
  counts jsonb not null default '{}',
  warnings text[] not null default '{}',
  error_summary text not null default '',
  ingestion_run_id bigint references public.ingestion_runs (id),
  publication_outcome text not null default ''
    check (publication_outcome in ('', 'staged', 'published', 'skipped', 'failed')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index acquisition_runs_mapping_id_idx on public.acquisition_runs (mapping_id);
create index acquisition_runs_status_idx on public.acquisition_runs (status);

alter table public.acquisition_candidates enable row level security;
alter table public.acquisition_source_decisions enable row level security;
alter table public.acquisition_edition_mappings enable row level security;
alter table public.acquisition_runs enable row level security;

revoke all on public.acquisition_candidates from anon, authenticated;
revoke all on public.acquisition_source_decisions from anon, authenticated;
revoke all on public.acquisition_edition_mappings from anon, authenticated;
revoke all on public.acquisition_runs from anon, authenticated;

grant select, insert, update, delete on public.acquisition_candidates to service_role;
grant select, insert, update, delete on public.acquisition_source_decisions to service_role;
grant select, insert, update, delete on public.acquisition_edition_mappings to service_role;
grant select, insert, update, delete on public.acquisition_runs to service_role;

create or replace function public.acquisition_claim_run(
  p_mapping_id bigint,
  p_owner text,
  p_lease_seconds integer default 3600
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if p_mapping_id is null or char_length(btrim(coalesce(p_owner, ''))) = 0 then
    raise exception 'mapping id and lease owner are required';
  end if;
  update public.acquisition_runs
  set status = 'leased',
      lease_owner = p_owner,
      lease_until = now() + make_interval(secs => greatest(p_lease_seconds, 60)),
      started_at = coalesce(started_at, now())
  where id = (
    select ar.id
    from public.acquisition_runs ar
    where ar.mapping_id = p_mapping_id
      and ar.status in ('queued', 'failed')
      and (ar.lease_until is null or ar.lease_until < now())
    order by ar.created_at desc
    limit 1
    for update skip locked
  )
  returning id into v_id;

  if v_id is null then
    insert into public.acquisition_runs (mapping_id, status, lease_owner, lease_until, started_at)
    values (
      p_mapping_id,
      'leased',
      p_owner,
      now() + make_interval(secs => greatest(p_lease_seconds, 60)),
      now()
    )
  returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.acquisition_claim_run(bigint, text, integer) from public;
grant execute on function public.acquisition_claim_run(bigint, text, integer) to service_role;
