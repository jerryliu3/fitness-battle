-- Catalog entries are editable; each week's assignment snapshots its geometry so
-- a later catalog edit cannot move athletes during an active competition.
create function private.valid_race_route_coordinates(coordinates jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  coordinate jsonb;
  longitude double precision; latitude double precision;
  previous_longitude double precision; previous_latitude double precision;
  segment_metres double precision; total_metres double precision := 0;
begin
  if jsonb_typeof(coordinates) is distinct from 'array' then return false; end if;
  if jsonb_array_length(coordinates) not between 2 and 20000 then return false; end if;
  for coordinate in select value from jsonb_array_elements(coordinates) loop
    if jsonb_typeof(coordinate) is distinct from 'array' then return false; end if;
    if jsonb_array_length(coordinate) <> 2
       or jsonb_typeof(coordinate->0) is distinct from 'number'
       or jsonb_typeof(coordinate->1) is distinct from 'number' then return false; end if;
    if abs((coordinate->>0)::numeric) > 180 or abs((coordinate->>1)::numeric) > 85 then return false; end if;
    longitude := radians((coordinate->>0)::double precision);
    latitude := radians((coordinate->>1)::double precision);
    if previous_longitude is not null then
      segment_metres := 2 * 6371008.8 * asin(sqrt(least(1.0,
        power(sin((latitude - previous_latitude) / 2), 2)
        + cos(previous_latitude) * cos(latitude) * power(sin((longitude - previous_longitude) / 2), 2))));
      -- Match createRaceCourse: ignore sub-centimetre duplicate points.
      if segment_metres < 0.01 then continue; end if;
      total_metres := total_metres + segment_metres;
    end if;
    previous_longitude := longitude;
    previous_latitude := latitude;
  end loop;
  return total_metres >= 1;
end;
$$;
revoke all on function private.valid_race_route_coordinates(jsonb) from public, anon, authenticated;
grant execute on function private.valid_race_route_coordinates(jsonb) to service_role;

create table public.race_routes (
  id text primary key check (id ~ '^[a-z0-9-]{3,80}$'),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  location text not null default '',
  coordinates jsonb not null check (private.valid_race_route_coordinates(coordinates)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.race_routes enable row level security;
revoke all on public.race_routes from public, anon, authenticated;
grant select, insert, update, delete on public.race_routes to service_role;

insert into public.race_routes (id, name, location, coordinates) values
  ('marin-headlands-loop', 'Marin Headlands Coastal Ridge', 'Sausalito, CA',
   '[[-122.502,37.8285],[-122.5028,37.8292],[-122.5041,37.8304],[-122.5055,37.8315],[-122.5072,37.8324],[-122.509,37.8331],[-122.5112,37.8335],[-122.5135,37.834],[-122.5158,37.8348],[-122.518,37.8359],[-122.5198,37.8372],[-122.5212,37.8388],[-122.522,37.8405],[-122.5222,37.8423],[-122.5218,37.8441],[-122.5205,37.8458],[-122.5188,37.8472],[-122.5167,37.8482],[-122.5142,37.8489],[-122.5118,37.8493],[-122.5092,37.8491],[-122.5068,37.8483],[-122.5045,37.8471],[-122.5024,37.8456],[-122.5008,37.8438],[-122.4995,37.8418],[-122.4988,37.8396],[-122.4985,37.8374],[-122.4989,37.8352],[-122.4998,37.8331],[-122.5011,37.8308],[-122.502,37.8285]]'::jsonb),
  ('central-park-loop', 'Central Park Outer Loop', 'New York, NY',
   '[[-73.9731,40.7648],[-73.9745,40.768],[-73.976,40.7725],[-73.9774,40.777],[-73.9785,40.7815],[-73.9792,40.786],[-73.9775,40.791],[-73.973,40.796],[-73.966,40.8005],[-73.959,40.7995],[-73.9535,40.796],[-73.9515,40.7905],[-73.954,40.785],[-73.958,40.78],[-73.962,40.774],[-73.9665,40.769],[-73.9705,40.7655],[-73.9731,40.7648]]'::jsonb),
  ('alpine-chamonix-ridge', 'Chamonix Valley Alpine Loop', 'Haute-Savoie, France',
   '[[6.8652,45.9237],[6.8685,45.9255],[6.872,45.9278],[6.8765,45.9304],[6.8812,45.9332],[6.886,45.9355],[6.8915,45.9372],[6.897,45.9381],[6.9025,45.938],[6.9078,45.9368],[6.9125,45.9345],[6.916,45.9312],[6.918,45.9275],[6.9175,45.9235],[6.9145,45.9198],[6.9098,45.917],[6.9042,45.9152],[6.898,45.9145],[6.8918,45.9148],[6.8855,45.9162],[6.8795,45.9185],[6.874,45.9212],[6.8652,45.9237]]'::jsonb);

create table public.weekly_race_routes (
  wave_start timestamptz primary key,
  route_id text not null references public.race_routes(id) on delete restrict,
  route_name text not null,
  coordinates jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.weekly_race_routes enable row level security;
revoke all on public.weekly_race_routes from public, anon, authenticated;
grant select on public.weekly_race_routes to service_role;

-- Read through a membership checked RPC. Athletes have no table write grants.
create function public.competition_route(p_sport text, p_start timestamptz, p_end timestamptz)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); assignment public.weekly_race_routes;
begin
  if uid is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_sport is null or p_sport not in ('running', 'cycling', 'walking') or p_start is null or p_end is null or p_end <= p_start then
    raise exception 'invalid_competition_route';
  end if;
  if not exists (
    select 1 from public.week_fields f
    where f.sport = p_sport and f.wave_start = p_start and f.week_end = p_end
      and uid = any(f.member_ids)
      and (f.crew_id is null or private.is_active_crew_member(f.crew_id))
  ) then raise exception 'field_not_found' using errcode = '42501'; end if;
  select * into assignment from public.weekly_race_routes
    where wave_start = p_start;
  if assignment.route_id is null then
    -- Choose once on the first authorized 4D read. The single statement uses
    -- one catalog snapshot; concurrent readers converge on the primary key.
    insert into public.weekly_race_routes(wave_start, route_id, route_name, coordinates)
    select p_start, id, name, coordinates from public.race_routes where is_active order by id
      offset mod(floor(extract(epoch from p_start) / 604800)::bigint,
        greatest((select count(*) from public.race_routes where is_active), 1)) limit 1
    on conflict (wave_start) do nothing;
    select * into assignment from public.weekly_race_routes where wave_start = p_start;
  end if;
  if assignment.route_id is null then raise exception 'competition_route_unavailable'; end if;
  return jsonb_build_object('id', assignment.route_id, 'name', assignment.route_name,
    'coordinates', assignment.coordinates, 'periodStart', assignment.wave_start,
    'periodEnd', p_end);
end;
$$;
revoke all on function public.competition_route(text,timestamptz,timestamptz) from public, anon;
grant execute on function public.competition_route(text,timestamptz,timestamptz) to authenticated;
