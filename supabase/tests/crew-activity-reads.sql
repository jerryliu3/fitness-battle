-- Run against a disposable migrated database. Fixtures always roll back.
begin;
do $$
declare
  athlete uuid := gen_random_uuid();
  peer uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  crew uuid := gen_random_uuid();
  category uuid := (select id from public.categories limit 1);
  total bigint;
  cursor_time timestamptz;
  cursor_id uuid;
begin
  insert into auth.users(id,email) values (athlete,athlete::text||'@test.invalid'),(peer,peer::text||'@test.invalid'),(outsider,outsider::text||'@test.invalid');
  insert into public.profiles(id,display_name) values (athlete,'Viewer'),(peer,'Peer'),(outsider,'Outsider') on conflict(id) do nothing;
  insert into public.crews(id,name,invite_code,sport,created_by) values (crew,'Activity test',substr(crew::text,1,8),'running',athlete);
  insert into public.crew_members(crew_id,user_id,display_name) values (crew,athlete,'Viewer'),(crew,peer,'Peer');
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,provenance,disposition,compete_key)
    select peer,'strava',crew::text||'-'||n,category,
      case when n=5 then statement_timestamp()+interval '1 day' else statement_timestamp()-n*interval '1 minute' end,
      1000,'cycling',1000,600,case when n=3 then 'demo' else 'recorded' end,
      case when n=4 then 'excluded' else 'counted' end,'crew-read-'||crew::text||'-'||n
    from generate_series(1,5) n;
  perform set_config('request.jwt.claim.sub',athlete::text,true);
  select count(*) into total from public.crew_activity_reads(crew);
  if total<>2 then raise exception 'Incorrect eligible activity count: %',total; end if;
  select count(*) into total from public.crew_activity_reads(crew,p_latest_per_member=>true);
  if total<>1 then raise exception 'Latest-per-member did not deduplicate'; end if;
  select r.started_at,r.activity_id into cursor_time,cursor_id from public.crew_activity_reads(crew,p_limit=>1) r;
  select count(*) into total from public.crew_activity_reads(crew,p_before=>cursor_time,p_before_id=>cursor_id);
  if total<>1 then raise exception 'Activity cursor skipped or repeated a row'; end if;
  update public.crew_members set status='declined' where crew_id=crew and user_id=peer;
  select count(*) into total from public.crew_activity_reads(crew);
  if total<>0 then raise exception 'Former member activity remained visible'; end if;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  begin
    perform * from public.crew_activity_reads(crew);
    raise exception 'Outsider was allowed';
  exception when others then if sqlerrm<>'not_a_member' then raise; end if; end;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform * from public.crew_activity_reads(crew);
    raise exception 'Anonymous was allowed';
  exception when others then if sqlerrm<>'authentication_required' then raise; end if; end;
end;
$$;

rollback;
