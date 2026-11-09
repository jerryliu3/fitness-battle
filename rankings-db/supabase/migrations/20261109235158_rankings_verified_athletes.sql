create table public.rankings_athletes (
  id bigint generated always as identity primary key,
  display_name text not null check(length(btrim(display_name)) between 1 and 300)
);
create table public.rankings_athlete_results (
  performance_id bigint primary key references public.performances(id) on delete cascade,
  athlete_id bigint not null references public.rankings_athletes(id),
  evidence_url text not null check(length(btrim(evidence_url))>0),
  evidence_notes text not null check(length(btrim(evidence_notes))>0),
  reviewed_at timestamptz not null default now(),
  performance_updated_at timestamptz not null
);
create index rankings_athlete_results_athlete_idx on public.rankings_athlete_results(athlete_id);
alter table public.rankings_athletes enable row level security;
alter table public.rankings_athlete_results enable row level security;
revoke all on public.rankings_athletes,public.rankings_athlete_results from public,anon,authenticated;
grant select,insert,update,delete on public.rankings_athletes,public.rankings_athlete_results to service_role;
grant usage,select on sequence public.rankings_athletes_id_seq to service_role;

create function public.rankings_athlete_page(p_athlete_id bigint,p_page integer default 1)
returns jsonb language sql stable security definer set search_path='' as $$
  with results as materialized (
    select p.id,p.athlete_name,p.distance_slug,p.rank_clock,p.rank_time_ms,p.result_date,ed.name as event_name,ed.edition_year
    from public.rankings_athlete_results l join public.performances p on p.id=l.performance_id and p.updated_at=l.performance_updated_at
    join public.source_records sr on sr.id=p.source_record_id join public.sources s on s.id=sr.source_id
    join public.event_editions ed on ed.id=p.event_edition_id
    where l.athlete_id=p_athlete_id and p.eligible and not p.unpublished and s.display_allowed
  ), totals as (
    select count(*) as total,greatest(1,least(greatest(1,coalesce(p_page,1)),ceil(count(*)/50.0)::integer)) as page from results
  ), rows as (
    select * from results order by result_date desc nulls last,edition_year desc,id desc limit 50 offset (select (page-1)::bigint*50 from totals)
  ), bests as (
    select distance_slug,rank_clock,min(rank_time_ms) as time_ms,count(*) as total from results group by distance_slug,rank_clock
  ) select jsonb_build_object('id',a.id,'name',a.display_name,'total',t.total,'page',t.page,'pageSize',50,
    'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.result_date desc nulls last,r.edition_year desc,r.id desc) from rows r),'[]'::jsonb),
    'bests',coalesce((select jsonb_agg(to_jsonb(b) order by b.distance_slug,b.rank_clock) from bests b),'[]'::jsonb))
  from public.rankings_athletes a cross join totals t where a.id=p_athlete_id and t.total>0;
$$;
revoke all on function public.rankings_athlete_page(bigint,integer) from public;
grant execute on function public.rankings_athlete_page(bigint,integer) to anon,authenticated,service_role;

create function public.rankings_result_with_identity(p_id bigint)
returns jsonb language sql stable security definer set search_path='' as $$
  with report as materialized(select public.rankings_result_with_coverage(p_id) as body)
  select body || jsonb_build_object('athleteId',(
    select l.athlete_id from public.rankings_athlete_results l where l.performance_id=p_id
      and l.performance_updated_at=(body->'result'->>'updated_at')::timestamptz
  )) from report where body is not null;
$$;
revoke all on function public.rankings_result_with_identity(bigint) from public;
grant execute on function public.rankings_result_with_identity(bigint) to anon,authenticated,service_role;
