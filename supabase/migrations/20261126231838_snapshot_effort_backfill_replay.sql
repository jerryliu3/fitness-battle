-- Keep the frozen opening state for the November rollout week. The chart uses
-- this snapshot with timestamped training facts. Official scores stay intact.
update public.athlete_prefs p
set effort_accounts = (
  select jsonb_object_agg(s.key, case
    when s.value ? 'historyAnchor'
      and not (s.value->'historyAnchor' ? 'replay')
      and (s.value->'starter'->>'startsAt')::timestamptz = p.effort_backfilled_at
      and s.value->'state'->>'lastSettledWeekId' is null
    then jsonb_set(s.value, '{historyAnchor,replay}', jsonb_build_object(
      'state', s.value->'state', 'starter', s.value->'starter'
    ), true)
    else s.value end)
  from jsonb_each(p.effort_accounts) s
), updated_at = clock_timestamp()
where p.effort_backfilled_at = '2026-11-23T05:00:00Z'
  and exists (select 1 from jsonb_each(p.effort_accounts) s
    where s.value ? 'historyAnchor'
      and not (s.value->'historyAnchor' ? 'replay')
      and (s.value->'starter'->>'startsAt')::timestamptz = p.effort_backfilled_at
      and s.value->'state'->>'lastSettledWeekId' is null);
