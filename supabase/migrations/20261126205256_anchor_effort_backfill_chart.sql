-- Recover the original award from the score events written by the two production
-- backfill runs. A newly inserted rating has no change event, so use its
-- initial value while the starter week remains unsettled.
with reset_events as (
  select e.user_id, e.sport, max(e.occurred_at) as occurred_at, max(e.score_after) as score
  from public.effort_score_events e
  where (e.occurred_at >= '2026-11-26 19:49:00+00' and e.occurred_at < '2026-11-26 19:50:00+00')
     or (e.occurred_at >= '2026-11-26 20:26:00+00' and e.occurred_at < '2026-11-26 20:27:00+00')
  group by e.user_id, e.sport
), reset_accounts as (
  select user_id, max(occurred_at) as occurred_at from reset_events group by user_id
), anchored as (
  select p.user_id, jsonb_object_agg(entry.key,
    jsonb_build_object('historyAnchor', jsonb_build_object(
      'occurredAt', coalesce(e.occurred_at, a.occurred_at,
        case when p.updated_at >= '2026-11-26 19:49:00+00' and p.updated_at < '2026-11-26 20:27:00+00'
          then p.updated_at else '2026-11-26 19:49:00+00'::timestamptz end),
      'score', coalesce(e.score, case when entry.value->'state'->>'lastSettledWeekId' is null then r.open_elo end, 0)
    ))) as accounts
  from public.athlete_prefs p
  cross join lateral jsonb_each(p.effort_accounts) entry
  left join reset_events e on e.user_id = p.user_id and e.sport = entry.key
  left join reset_accounts a on a.user_id = p.user_id
  left join public.sport_ratings r on r.user_id = p.user_id and r.sport = entry.key
  where p.effort_backfilled_at = '2026-11-23 05:00:00+00'
    and not exists (
      select 1 from jsonb_each(p.effort_accounts) x where x.value ? 'historyAnchor'
    )
  group by p.user_id
)
update public.athlete_prefs p
set effort_accounts = (
  select jsonb_object_agg(entry.key, entry.value || coalesce(anchored.accounts->entry.key, '{}'::jsonb))
  from jsonb_each(p.effort_accounts) entry
), updated_at = clock_timestamp()
from anchored
where p.user_id = anchored.user_id;

-- The commit updates ratings before it marks the backfill complete. Date the
-- chart anchor after those score events, using the database commit clock.
create function private.date_effort_backfill_chart_anchor()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  select jsonb_object_agg(entry.key, case when entry.value ? 'historyAnchor'
    then jsonb_set(entry.value, '{historyAnchor,occurredAt}', to_jsonb(new.updated_at))
    else entry.value end)
  into new.effort_accounts
  from jsonb_each(new.effort_accounts) entry;
  return new;
end $$;

revoke all on function private.date_effort_backfill_chart_anchor() from public, anon, authenticated;
create trigger date_effort_backfill_chart_anchor
before update of effort_backfilled_at on public.athlete_prefs
for each row when (new.effort_backfilled_at is not null and new.effort_backfilled_at is distinct from old.effort_backfilled_at)
execute function private.date_effort_backfill_chart_anchor();
