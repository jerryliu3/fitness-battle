-- Bind staged runs to exact edition revisions; serialize claims; unified run patches.

alter table public.acquisition_runs
  add column if not exists staged_edition_id bigint references public.event_editions (id),
  add column if not exists staged_revision integer check (staged_revision is null or staged_revision >= 1);

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
  v_active bigint;
begin
  if p_mapping_id is null or char_length(btrim(coalesce(p_owner, ''))) = 0 then
    raise exception 'mapping id and lease owner are required';
  end if;

  perform 1
  from public.acquisition_edition_mappings m
  where m.id = p_mapping_id
  for update;

  if not found then
    raise exception 'Unknown acquisition mapping %', p_mapping_id;
  end if;

  select ar.id
  into v_active
  from public.acquisition_runs ar
  where ar.mapping_id = p_mapping_id
    and ar.status = 'leased'
    and ar.lease_until is not null
    and ar.lease_until > now()
  limit 1;

  if v_active is not null then
    raise exception 'Mapping % already has active lease on run %', p_mapping_id, v_active;
  end if;

  update public.acquisition_runs
  set status = 'failed',
      error_summary = 'lease expired without completion',
      finished_at = coalesce(finished_at, now())
  where mapping_id = p_mapping_id
    and status = 'leased'
    and lease_until is not null
    and lease_until <= now();

  update public.acquisition_runs
  set status = 'leased',
      lease_owner = p_owner,
      lease_until = now() + make_interval(secs => greatest(p_lease_seconds, 60)),
      started_at = coalesce(started_at, now()),
      finished_at = null,
      error_summary = '',
      publication_outcome = '',
      staged_edition_id = null,
      staged_revision = null
  where id = (
    select ar.id
    from public.acquisition_runs ar
    where ar.mapping_id = p_mapping_id
      and ar.status = 'queued'
    order by ar.created_at asc
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

create or replace function public.acquisition_patch_run(
  p_run_id bigint,
  p_owner text,
  p_patch jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.acquisition_runs%rowtype;
  v_status text;
  v_terminal boolean := false;
begin
  select *
  into v_row
  from public.acquisition_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'Unknown acquisition run %', p_run_id;
  end if;

  if v_row.lease_owner is distinct from p_owner then
    raise exception 'Run % is leased to another owner', p_run_id;
  end if;

  if v_row.status <> 'leased' then
    raise exception 'Run % is not leased', p_run_id;
  end if;

  if v_row.lease_until is not null and v_row.lease_until <= now() then
    raise exception 'Lease expired for run %', p_run_id;
  end if;

  v_status := coalesce(p_patch->>'status', v_row.status);
  v_terminal := v_status in ('succeeded', 'failed', 'cancelled', 'blocked');

  update public.acquisition_runs
  set parser_version = coalesce(p_patch->>'parser_version', parser_version),
      artifact_dir = coalesce(p_patch->>'artifact_dir', artifact_dir),
      normalized_sha256 = coalesce(p_patch->>'normalized_sha256', normalized_sha256),
      raw_sha256 = coalesce(p_patch->>'raw_sha256', raw_sha256),
      counts = coalesce(p_patch->'counts', counts),
      warnings = case
        when p_patch ? 'warnings' then array(
          select jsonb_array_elements_text(p_patch->'warnings')
        )
        else warnings
      end,
      publication_outcome = coalesce(p_patch->>'publication_outcome', publication_outcome),
      error_summary = coalesce(p_patch->>'error_summary', error_summary),
      staged_edition_id = coalesce((p_patch->>'staged_edition_id')::bigint, staged_edition_id),
      staged_revision = coalesce((p_patch->>'staged_revision')::integer, staged_revision),
      status = v_status,
      finished_at = case when v_terminal then coalesce(finished_at, now()) else finished_at end
  where id = p_run_id;
end;
$$;

revoke all on function public.acquisition_patch_run(bigint, text, jsonb) from public;
grant execute on function public.acquisition_patch_run(bigint, text, jsonb) to service_role;

drop function if exists public.acquisition_update_run(bigint, text, text, text, text);

create or replace function public.acquisition_publish_staged_run(
  p_run_id bigint,
  p_owner text
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.acquisition_runs%rowtype;
  v_state text;
  v_revision integer;
begin
  select *
  into v_row
  from public.acquisition_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'Unknown acquisition run %', p_run_id;
  end if;

  if v_row.status <> 'succeeded' or v_row.publication_outcome <> 'staged' then
    raise exception 'Run % is not a completed staged import', p_run_id;
  end if;

  if v_row.staged_edition_id is null or v_row.staged_revision is null then
    raise exception 'Run % is missing staged edition binding', p_run_id;
  end if;

  if v_row.lease_owner is not null and v_row.lease_owner is distinct from p_owner then
    raise exception 'Run % publish reserved to lease owner', p_run_id;
  end if;

  select publication_state, revision
  into v_state, v_revision
  from public.event_editions
  where id = v_row.staged_edition_id
  for update;

  if v_state <> 'staged' then
    raise exception 'Edition % is no longer staged', v_row.staged_edition_id;
  end if;

  if v_revision <> v_row.staged_revision then
    raise exception 'Edition % revision % does not match staged run %', v_row.staged_edition_id, v_revision, v_row.staged_revision;
  end if;

  perform public.publish_event_edition(v_row.staged_edition_id);

  update public.acquisition_runs
  set publication_outcome = 'published',
      finished_at = coalesce(finished_at, now())
  where id = p_run_id;

  return v_row.staged_edition_id;
end;
$$;

revoke all on function public.acquisition_publish_staged_run(bigint, text) from public;
grant execute on function public.acquisition_publish_staged_run(bigint, text) to service_role;
