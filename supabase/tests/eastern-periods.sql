-- Run in a rollback-only transaction after the Eastern migration.
do $$
declare
  starts timestamptz;
  ends timestamptz;
begin
  select starts_at, ends_at into starts, ends from public.period_bounds('weekly', '2026-03-04T12:00:00Z', null, null, 'America/New_York');
  if starts <> '2026-03-02T05:00:00Z'::timestamptz or ends <> '2026-03-09T04:00:00Z'::timestamptz or extract(epoch from ends - starts)/3600 <> 167 then raise exception 'Spring Eastern bounds incorrect'; end if;
  select starts_at, ends_at into starts, ends from public.period_bounds('weekly', '2026-10-28T12:00:00Z', null, null, 'America/New_York');
  if starts <> '2026-10-26T04:00:00Z'::timestamptz or ends <> '2026-11-02T05:00:00Z'::timestamptz or extract(epoch from ends - starts)/3600 <> 169 then raise exception 'Fall Eastern bounds incorrect'; end if;
  select starts_at, ends_at into starts, ends from public.period_bounds('weekly', '2026-10-19T03:59:59Z', null, null, 'America/New_York');
  if starts <> '2026-10-12T04:00:00Z'::timestamptz or ends <> '2026-10-19T04:00:00Z'::timestamptz then raise exception 'Eastern Sunday crossed a UTC boundary'; end if;
  select starts_at, ends_at into starts, ends from public.period_bounds('weekly', '2026-10-19T04:00:00Z', null, null, 'America/New_York');
  if starts <> '2026-10-19T04:00:00Z'::timestamptz then raise exception 'Eastern Monday boundary incorrect'; end if;
end;
$$;
