alter table public.performance_split_times add column start_at timestamptz;
create function private.valid_replay_course(p_points jsonb,p_distance text)
returns boolean language plpgsql immutable set search_path='' as $$
declare point jsonb; previous numeric:=-1; metres numeric; total numeric;
begin
  total:=case p_distance when '5k' then 5000 when '10k' then 10000 when 'half_marathon' then 21097.5 when 'marathon' then 42195 else null end;
  if total is null or jsonb_typeof(p_points)<>'array' then return false; end if;
  if jsonb_array_length(p_points) not between 2 and 20000 then return false; end if;
  for point in select value from jsonb_array_elements(p_points) loop
    if jsonb_typeof(point)<>'array' then return false; end if;
    if jsonb_array_length(point)<>3 or jsonb_typeof(point->0)<>'number' or jsonb_typeof(point->1)<>'number' or jsonb_typeof(point->2)<>'number'
      then return false; end if;
    metres:=(point->>2)::numeric;
    if abs((point->>0)::numeric)>180 or abs((point->>1)::numeric)>85 or metres<0 or metres<=previous
      or (previous=-1 and metres<>0) then return false; end if;
    previous:=metres;
  end loop;
  return previous=total;
end;
$$;
revoke all on function private.valid_replay_course(jsonb,text) from public;
grant execute on function private.valid_replay_course(jsonb,text) to service_role;
create table public.rankings_replay_courses (
  event_edition_id bigint not null references public.event_editions(id),
  distance_slug text not null check(distance_slug in ('5k','10k','half_marathon','marathon')),
  points jsonb not null, -- [longitude,latitude,reviewed distance along course in metres]
  source_url text not null check(length(btrim(source_url))>0),
  attribution text not null check(length(btrim(attribution))>0),
  review_notes text not null check(length(btrim(review_notes))>0),
  reviewed_at timestamptz not null,
  display_allowed boolean not null default false,
  primary key(event_edition_id,distance_slug),
  check(private.valid_replay_course(points,distance_slug))
);
alter table public.rankings_replay_courses enable row level security;
revoke all on public.rankings_replay_courses from public,anon,authenticated;
grant select,insert,update,delete on public.rankings_replay_courses to service_role;
create function public.rankings_replay_page(p_edition_id bigint,p_distance text,p_sex text,p_clock text,
  p_ids bigint[] default null,p_after bigint default 0)
returns jsonb language sql stable security definer set search_path='' as $$
  with course as materialized (
    select * from public.rankings_replay_courses c where c.event_edition_id=p_edition_id
      and c.distance_slug=p_distance and c.display_allowed
  ), candidates as materialized (
    select p.id from public.performances p join public.source_records sr on sr.id=p.source_record_id
    join public.sources s on s.id=sr.source_id join public.performance_split_times t on t.performance_id=p.id
      and t.performance_updated_at=p.updated_at and t.clock=p_clock
    join public.race_checkpoint_sets c on c.id=t.checkpoint_set_id and c.event_edition_id=p.event_edition_id and c.distance_slug=p.distance_slug
    where p.event_edition_id=p_edition_id and p.distance_slug=p_distance and (p_sex='all' or p.sex=p_sex)
      and p.eligible and not p.unpublished and s.display_allowed
  ), page_ids as (
    select id from candidates where id>greatest(coalesce(p_after,0),0) and (p_ids is null or (cardinality(p_ids)<=100 and id=any(p_ids))) order by id limit 1000
  ), runners as (
    select p.id,p.athlete_name as name,t.start_at as "startAt",jsonb_build_object('clock',t.clock,
      'sourceUrl',t.source_url,'finishMs',case t.clock when 'chip' then p.chip_time_ms else p.gun_time_ms end,
      'checkpoints',(select jsonb_agg(jsonb_build_object('distanceM',c.distances_m[i],'elapsedMs',t.elapsed_ms[i]) order by i)
        from generate_subscripts(c.distances_m,1) as checkpoints(i))) as splits
    from page_ids ids join public.performances p on p.id=ids.id
    join public.performance_split_times t on t.performance_id=p.id join public.race_checkpoint_sets c on c.id=t.checkpoint_set_id
  ) select jsonb_build_object('version',md5(c.points::text||extract(epoch from c.reviewed_at)::text),'course',case when coalesce(p_after,0)=0 then
    jsonb_build_object('points',c.points,'sourceUrl',c.source_url,'attribution',c.attribution) else null end,
    'totalAvailable',(select count(*) from candidates),
    'runners',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from runners r),'[]'::jsonb),
    'next',case when exists(select 1 from candidates where id>(select max(id) from page_ids)
      and (p_ids is null or (cardinality(p_ids)<=100 and id=any(p_ids)))) then (select max(id) from page_ids) else null end)
  from course c where exists(select 1 from candidates);
$$;
revoke all on function public.rankings_replay_page(bigint,text,text,text,bigint[],bigint) from public;
grant execute on function public.rankings_replay_page(bigint,text,text,text,bigint[],bigint) to anon,authenticated,service_role;
