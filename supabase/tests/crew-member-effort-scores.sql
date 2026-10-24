-- Run against a disposable migrated database; fixtures roll back.
begin;
do $$
declare
  viewer uuid := gen_random_uuid();
  peer uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  crew uuid := gen_random_uuid();
  total bigint;
begin
  insert into auth.users(id,email) values (viewer,viewer::text||'@test.invalid'),(peer,peer::text||'@test.invalid'),(outsider,outsider::text||'@test.invalid');
  insert into public.profiles(id,display_name) values (viewer,'Viewer'),(peer,'Peer'),(outsider,'Outsider') on conflict(id) do nothing;
  insert into public.crews(id,name,invite_code,sport,created_by) values (crew,'Badge test',substr(crew::text,1,8),'running',viewer);
  insert into public.crew_members(crew_id,user_id,display_name) values (crew,viewer,'Viewer'),(crew,peer,'Peer');
  insert into public.sport_ratings(user_id,sport,open_elo,verified_elo,opted_in,lock_period) values (peer,'running',1200,1600,true,statement_timestamp()) on conflict(user_id,sport) do update set open_elo=1200,verified_elo=1600;
  perform set_config('request.jwt.claim.sub',viewer::text,true);
  select count(*) into total from public.crew_member_effort_scores() r where r.crew_id=crew and r.user_id=peer and r.open_elo=1200 and r.verified_elo=1600;
  if total<>1 then raise exception 'Missing authorized peer score'; end if;
  update public.crew_members set status='declined' where crew_id=crew and user_id=peer;
  select count(*) into total from public.crew_member_effort_scores() r where r.user_id=peer;
  if total<>0 then raise exception 'Former peer score leaked'; end if;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  select count(*) into total from public.crew_member_effort_scores();
  if total<>0 then raise exception 'Outsider score leaked'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform * from public.crew_member_effort_scores();
    raise exception 'Anonymous was allowed';
  exception when others then if sqlerrm<>'authentication_required' then raise; end if; end;
end;
$$;
rollback;
