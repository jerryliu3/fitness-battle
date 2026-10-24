-- GPS route visualization schema: enrich activities with summary and detailed polylines, elevation, and bounds.

alter table public.activities
  add column if not exists summary_polyline text,
  add column if not exists detailed_polyline text,
  add column if not exists route_bounds jsonb,
  add column if not exists elevation_gain_m numeric;

create index if not exists activities_summary_polyline_idx
  on public.activities (user_id, started_at desc)
  where summary_polyline is not null;
