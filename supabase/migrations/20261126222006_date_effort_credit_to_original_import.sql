-- Credit belongs on the original import date. Keep occurredAt as the boundary
-- for filtering superseded score events and reconstructing live projections.
update public.athlete_prefs p
set effort_accounts = (
  select jsonb_object_agg(s.key, case
    when s.value ? 'historyAnchor'
      and (s.value->'starter'->>'startsAt')::timestamptz = p.effort_backfilled_at
    then jsonb_set(s.value, '{historyAnchor,displayAt}', to_jsonb(coalesce(
      case when h.completed_at <= (s.value->'historyAnchor'->>'occurredAt')::timestamptz then h.completed_at end,
      u.created_at
    )))
    else s.value end)
  from jsonb_each(p.effort_accounts) s
), updated_at = clock_timestamp()
from auth.users u
left join public.fitness_history_imports h on h.user_id = u.id
where p.user_id = u.id and p.effort_backfilled_at is not null and u.created_at is not null
  and exists (select 1 from jsonb_each(p.effort_accounts) s
    where s.value ? 'historyAnchor' and (s.value->'starter'->>'startsAt')::timestamptz = p.effort_backfilled_at);

create or replace function private.date_effort_backfill_chart_anchor()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  display_at timestamptz;
begin
  select coalesce(h.completed_at, u.created_at, new.updated_at) into display_at
  from auth.users u
  left join public.fitness_history_imports h on h.user_id = u.id and h.completed_at <= new.updated_at
  where u.id = new.user_id;

  select jsonb_object_agg(entry.key, case when entry.value ? 'historyAnchor'
    then jsonb_set(entry.value, '{historyAnchor}', (entry.value->'historyAnchor') || jsonb_build_object(
      'occurredAt', new.updated_at, 'displayAt', coalesce(display_at, new.updated_at)
    ))
    else entry.value end)
  into new.effort_accounts
  from jsonb_each(new.effort_accounts) entry;
  return new;
end $$;
