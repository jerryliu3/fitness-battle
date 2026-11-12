-- Harden acquisition run claims, lease expiry, and owner-checked updates.

alter table public.acquisition_runs
  drop constraint if exists acquisition_runs_publication_outcome_check;

alter table public.acquisition_runs
  add constraint acquisition_runs_publication_outcome_check
  check (publication_outcome in ('', 'prepared', 'staged', 'published', 'skipped', 'failed'));

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

  select ar.id
  into v_active
  from public.acquisition_runs ar
  where ar.mapping_id = p_mapping_id
    and ar.status = 'leased'
    and ar.lease_until is not null
    and ar.lease_until > now()
  limit 1
  for update;

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
      error_summary = ''
  where id = (
    select ar.id
    from public.acquisition_runs ar
    where ar.mapping_id = p_mapping_id
      and ar.status in ('queued', 'failed')
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

create or replace function public.acquisition_update_run(
  p_run_id bigint,
  p_owner text,
  p_status text default null,
  p_publication_outcome text default null,
  p_error_summary text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.acquisition_runs%rowtype;
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

  if v_row.status = 'leased' and v_row.lease_until is not null and v_row.lease_until <= now() then
    raise exception 'Lease expired for run %', p_run_id;
  end if;

  update public.acquisition_runs
  set status = coalesce(p_status, status),
      publication_outcome = coalesce(p_publication_outcome, publication_outcome),
      error_summary = coalesce(p_error_summary, error_summary),
      finished_at = case
        when p_status in ('succeeded', 'failed', 'cancelled', 'blocked') then coalesce(finished_at, now())
        else finished_at
      end
  where id = p_run_id;
end;
$$;

revoke all on function public.acquisition_update_run(bigint, text, text, text, text) from public;
grant execute on function public.acquisition_update_run(bigint, text, text, text, text) to service_role;
