-- Bind staged import and acquisition run in one database transaction.

create or replace function public.acquisition_bind_staged_run(
  p_run_id bigint,
  p_owner text,
  p_source_slug text,
  p_external_event_id text,
  p_edition_year integer
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.acquisition_runs%rowtype;
  v_edition bigint;
  v_revision integer;
begin
  select *
  into v_run
  from public.acquisition_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'Unknown acquisition run %', p_run_id;
  end if;

  if v_run.lease_owner is distinct from p_owner then
    raise exception 'Run % is leased to another owner', p_run_id;
  end if;

  if v_run.status <> 'leased' then
    raise exception 'Run % is not leased', p_run_id;
  end if;

  if v_run.lease_until is not null and v_run.lease_until <= now() then
    raise exception 'Lease expired for run %', p_run_id;
  end if;

  select ee.id, ee.revision
  into v_edition, v_revision
  from public.event_editions ee
  join public.events e on e.id = ee.event_id
  join public.sources s on s.id = e.source_id
  where s.slug = p_source_slug
    and e.external_event_id = p_external_event_id
    and ee.edition_year = p_edition_year
    and ee.publication_state = 'staged'
  for update;

  if v_edition is null then
    raise exception 'Staged edition missing for source % event % year %', p_source_slug, p_external_event_id, p_edition_year;
  end if;

  update public.acquisition_runs
  set status = 'succeeded',
      publication_outcome = 'staged',
      staged_edition_id = v_edition,
      staged_revision = v_revision,
      finished_at = coalesce(finished_at, now())
  where id = p_run_id;
end;
$$;

revoke all on function public.acquisition_bind_staged_run(bigint, text, text, text, integer) from public;
grant execute on function public.acquisition_bind_staged_run(bigint, text, text, text, integer) to service_role;
