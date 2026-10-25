-- Optional recorded GPS observations; existing activities RLS is unchanged.
alter table public.activities add column if not exists route_replay jsonb;
alter table public.activities add constraint activities_route_replay_array
  check (route_replay is null or (jsonb_typeof(route_replay) = 'array' and jsonb_array_length(route_replay) <= 20000));
