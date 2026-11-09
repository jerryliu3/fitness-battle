-- A service-owned review refers to one edition/distance/category import.
-- Never infer completeness from the number of rows alone.
create table public.rankings_coverage_reviews (
  event_edition_id bigint not null references public.event_editions(id),
  distance_slug text not null check(distance_slug in ('5k','10k','half_marathon','marathon')),
  sex text not null check(sex in ('female','male','other','unknown')),
  expected_eligible_count bigint not null check(expected_eligible_count > 0),
  ingestion_run_id bigint not null references public.ingestion_runs(id),
  evidence_url text not null check(length(btrim(evidence_url)) > 0),
  review_notes text not null check(length(btrim(review_notes)) > 0),
  reviewed_at timestamptz not null default now(),
  primary key(event_edition_id,distance_slug,sex)
);
alter table public.rankings_coverage_reviews enable row level security;
revoke all on public.rankings_coverage_reviews from anon,authenticated;
grant select,insert,update,delete on public.rankings_coverage_reviews to service_role;

create or replace function public.rankings_coverage(p_distance text default null, p_edition_id bigint default null, p_sex text default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(c) order by c.edition_year desc,c.event_name,c.sex),'[]'::jsonb)
  from (
    select ed.id as edition_id,ed.name as event_name,ed.edition_year,p.distance_slug,p.sex,
      count(*) as published_count,count(*) filter(where p.result_date is null) as undated_count,
      r.expected_eligible_count,r.reviewed_at,r.evidence_url,
      coalesce(count(*)=r.expected_eligible_count
        and bool_and(sr.last_ingestion_run_id is not distinct from r.ingestion_run_id)
        and max(p.updated_at)<=r.reviewed_at and ir.status='succeeded',false) as complete
    from public.performances p
    join public.source_records sr on sr.id=p.source_record_id
    join public.sources s on s.id=sr.source_id
    join public.event_editions ed on ed.id=p.event_edition_id
    left join public.rankings_coverage_reviews r on r.event_edition_id=p.event_edition_id
      and r.distance_slug=p.distance_slug and r.sex=p.sex
    left join public.ingestion_runs ir on ir.id=r.ingestion_run_id and ir.source_id=sr.source_id
    where p.eligible and not p.unpublished and s.display_allowed
      and (p_distance is null or p.distance_slug=p_distance)
      and (p_edition_id is null or p.event_edition_id=p_edition_id)
      and (p_sex is null or p.sex=p_sex)
    group by ed.id,ed.name,ed.edition_year,p.distance_slug,p.sex,
      r.expected_eligible_count,r.reviewed_at,r.evidence_url,r.ingestion_run_id,ir.status
  ) c;
$$;
revoke all on function public.rankings_coverage(text,bigint,text) from public;
grant execute on function public.rankings_coverage(text,bigint,text) to anon,authenticated,service_role;

create or replace function public.rankings_result_with_coverage(p_id bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  with report as (select public.rankings_result(p_id) as body)
  select body || jsonb_build_object('coverage',(
    select c from jsonb_array_elements(public.rankings_coverage(body->'result'->>'distance_slug', (body->'result'->>'event_edition_id')::bigint, body->'result'->>'sex')) c
    where (c->>'edition_id')::bigint=(body->'result'->>'event_edition_id')::bigint
      and c->>'sex'=body->'result'->>'sex'
  )) from report where body is not null;
$$;
revoke all on function public.rankings_result_with_coverage(bigint) from public;
grant execute on function public.rankings_result_with_coverage(bigint) to anon,authenticated,service_role;
