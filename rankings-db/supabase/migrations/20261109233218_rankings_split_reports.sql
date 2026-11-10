-- Versioned checkpoint definitions are shared by an edition's results.
create function private.valid_race_checkpoints(p_distances numeric[],p_distance text)
returns boolean language sql immutable set search_path='' as $$
  select coalesce(array_ndims(p_distances)=1 and array_lower(p_distances,1)=1
    and cardinality(p_distances) between 1 and 100
    and not exists (
      select 1 from (
        select d,lag(d) over(order by i) as previous
        from unnest(p_distances) with ordinality v(d,i)
      ) points where d is null or d<=0 or d<=previous or d>
        case p_distance when '5k' then 5000 when '10k' then 10000
          when 'half_marathon' then 21097.5 when 'marathon' then 42195 else 0 end
    ),false);
$$;
revoke all on function private.valid_race_checkpoints(numeric[],text) from public;
grant execute on function private.valid_race_checkpoints(numeric[],text) to service_role;
create table public.race_checkpoint_sets (
  id bigint generated always as identity primary key,
  event_edition_id bigint not null references public.event_editions(id),
  distance_slug text not null check(distance_slug in ('5k','10k','half_marathon','marathon')),
  distances_m numeric[] not null,
  check(private.valid_race_checkpoints(distances_m,distance_slug))
);
create table public.performance_split_times (
  performance_id bigint primary key references public.performances(id) on delete cascade,
  checkpoint_set_id bigint not null references public.race_checkpoint_sets(id),
  clock text not null check(clock in ('chip','gun')),
  elapsed_ms integer[] not null,
  source_url text not null check(length(btrim(source_url))>0),
  performance_updated_at timestamptz not null
);
alter table public.race_checkpoint_sets enable row level security;
alter table public.performance_split_times enable row level security;
revoke all on public.race_checkpoint_sets,public.performance_split_times from public,anon,authenticated,service_role;
grant select,insert,delete on public.race_checkpoint_sets to service_role;
grant select,insert,update,delete on public.performance_split_times to service_role;
grant usage,select on sequence public.race_checkpoint_sets_id_seq to service_role;
-- No UPDATE privilege on checkpoint sets: changed distances require a new version.
create function private.validate_performance_splits()
returns trigger language plpgsql set search_path='' as $$
declare p public.performances; c public.race_checkpoint_sets; finish_ms bigint; total_m numeric;
begin
  select * into strict p from public.performances where id=new.performance_id;
  select * into strict c from public.race_checkpoint_sets where id=new.checkpoint_set_id;
  finish_ms:=case new.clock when 'chip' then p.chip_time_ms else p.gun_time_ms end;
  total_m:=case p.distance_slug when '5k' then 5000 when '10k' then 10000 when 'half_marathon' then 21097.5 else 42195 end;
  if c.event_edition_id<>p.event_edition_id or c.distance_slug<>p.distance_slug
    or new.performance_updated_at is distinct from p.updated_at or finish_ms is null
    or array_ndims(new.elapsed_ms) is distinct from 1 or array_lower(new.elapsed_ms,1) is distinct from 1
    or cardinality(new.elapsed_ms)<>cardinality(c.distances_m) then
    raise exception 'Split definition, clock or result revision mismatch';
  end if;
  if exists (
    select 1 from (
      select ms,lag(ms) over(order by i) as previous,i
      from unnest(new.elapsed_ms) with ordinality v(ms,i) where ms is not null
    ) points where ms<=0 or ms<=previous or ms>finish_ms
      or (c.distances_m[i::integer]<total_m and ms>=finish_ms)
      or (c.distances_m[i::integer]=total_m and ms<>finish_ms)
  ) then raise exception 'Invalid cumulative split times'; end if;
  return new;
end;
$$;
revoke all on function private.validate_performance_splits() from public;
create trigger validate_performance_splits before insert or update on public.performance_split_times
for each row execute function private.validate_performance_splits();

-- Keep the existing report endpoint and its source/eligibility gate.
create or replace function public.rankings_result_with_coverage(p_id bigint)
returns jsonb language sql stable security definer set search_path='' as $$
  with report as materialized (select public.rankings_result(p_id) as body)
  select body || jsonb_build_object('coverage',(
    select c from jsonb_array_elements(public.rankings_coverage(body->'result'->>'distance_slug',
      (body->'result'->>'event_edition_id')::bigint,body->'result'->>'sex')) c
    where (c->>'edition_id')::bigint=(body->'result'->>'event_edition_id')::bigint
      and c->>'sex'=body->'result'->>'sex'
  ),'splits',(
    select jsonb_build_object('clock',t.clock,'finishMs',case t.clock when 'chip' then p.chip_time_ms else p.gun_time_ms end,
      'sourceUrl',t.source_url,'checkpoints',(
        select jsonb_agg(jsonb_build_object('distanceM',c.distances_m[i],'elapsedMs',t.elapsed_ms[i]) order by i)
        from generate_subscripts(c.distances_m,1) as checkpoints(i)
      ))
    from public.performance_split_times t
    join public.performances p on p.id=t.performance_id
    join public.race_checkpoint_sets c on c.id=t.checkpoint_set_id
      and c.event_edition_id=p.event_edition_id and c.distance_slug=p.distance_slug
    where t.performance_id=p_id and t.performance_updated_at=p.updated_at
  )) from report where body is not null;
$$;
