-- Migration: Publication gate, publication state lifecycle, and provider namespace widening.
-- Slices B & C from docs/race-results-architecture.md.
-- Additive only: preserves existing records, views, and functions.

-- 1. Publication state and revision columns on event_editions
alter table public.event_editions
  add column if not exists publication_state text not null default 'draft'
    check (publication_state in ('draft', 'staged', 'published', 'frozen')),
  add column if not exists revision integer not null default 1
    check (revision >= 1),
  add column if not exists published_at timestamptz,
  add column if not exists frozen_at timestamptz;

-- Backfill legacy editions: editions with existing performances are published; others remain draft.
update public.event_editions ed
set publication_state = 'published',
    published_at = coalesce(ed.published_at, ed.created_at, now())
where ed.publication_state = 'draft'
  and exists (
    select 1 from public.performances p
    where p.event_edition_id = ed.id
  );

-- Index for publication state queries
create index if not exists event_editions_publication_state_idx
  on public.event_editions (publication_state, event_id, edition_year);

-- 2. Provider namespace widening: scope external_result_id uniqueness to (source, edition, external_result_id)
-- Legacy index scoped external IDs source-wide, preventing valid multi-year reuse and risking row relocation.
drop index if exists public.source_records_external_result_idx;
drop index if exists public.source_records_source_external_idx;

create unique index if not exists source_records_source_edition_external_idx
  on public.source_records (source_id, event_edition_id, external_result_id)
  where external_result_id is not null;

-- 3. Update private.upsert_source_record to match the widened namespace
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
    on conflict (source_id, event_edition_id, external_result_id)
      where external_result_id is not null
    do update set
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
grant execute on function private.upsert_source_record(bigint, bigint, text, text, text, text, bigint, bigint) to service_role;

-- 4. Publication management RPCs
create or replace function public.freeze_event_edition(p_edition_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.event_editions
  set publication_state = 'frozen',
      frozen_at = coalesce(frozen_at, now())
  where id = p_edition_id;
  if not found then
    raise exception 'Event edition % not found', p_edition_id;
  end if;
end;
$$;

revoke all on function public.freeze_event_edition(bigint) from public;
grant execute on function public.freeze_event_edition(bigint) to service_role;

create or replace function public.publish_event_edition(p_edition_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.event_editions
  set publication_state = 'published',
      published_at = coalesce(published_at, now())
  where id = p_edition_id;
  if not found then
    raise exception 'Event edition % not found', p_edition_id;
  end if;
end;
$$;

revoke all on function public.publish_event_edition(bigint) from public;
grant execute on function public.publish_event_edition(bigint) to service_role;
