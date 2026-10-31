-- Run in a rollback transaction after the additive migration.
do $$
declare u uuid := gen_random_uuid(); other_user uuid := gen_random_uuid(); n integer;
begin
  insert into auth.users(id,email) values(u,u::text||'@test.invalid'),(other_user,other_user::text||'@test.invalid');
  insert into public.sport_ratings(user_id,sport,open_elo,verified_elo,lock_period)
    values(u,'running',1000,1000,now()),(other_user,'running',1000,1000,now());
  if exists(select 1 from public.effort_score_events where user_id=u) then raise exception 'invented initial award'; end if;
  update public.sport_ratings set open_elo=1001 where user_id=u;
  update public.sport_ratings set open_elo=1002,verified_elo=1001 where user_id=u;
  update public.sport_ratings set open_elo=1002,verified_elo=1001 where user_id=u;
  select count(*) into n from public.effort_score_events where user_id=u;
  if n<>3 then raise exception 'score changes missing or replay duplicated: %', n; end if;
  if not exists(select 1 from public.effort_score_events where user_id=u and track='open' and score_before=1001 and score_after=1002 and occurred_at between transaction_timestamp() and clock_timestamp()) then raise exception 'incorrect score event'; end if;
  begin
    update public.sport_ratings set open_elo=1003 where user_id=u;
    raise exception 'rollback_marker';
  exception when others then if sqlerrm<>'rollback_marker' then raise; end if; end;
  if (select count(*) from public.effort_score_events where user_id=u)<>3 then raise exception 'rolled-back event leaked'; end if;
  update public.sport_ratings set open_elo=999 where user_id=u;
  if not exists(select 1 from public.effort_score_events where user_id=u and score_before=1002 and score_after=999) then raise exception 'settlement loss missing'; end if;
  set local role service_role;
  update public.sport_ratings set open_elo=1000 where user_id=u;
  reset role;
  update public.sport_ratings set open_elo=1001 where user_id=other_user;
  if has_table_privilege('authenticated','public.effort_score_events','INSERT') or has_table_privilege('authenticated','public.effort_score_events','UPDATE') or has_table_privilege('authenticated','public.effort_score_events','DELETE') then raise exception 'athlete can forge history'; end if;
  perform set_config('request.jwt.claim.sub',u::text,true);
  set local role authenticated;
  if exists(select 1 from public.effort_score_events where user_id<>u) then raise exception 'another athlete history exposed'; end if;
  if (select count(*) from public.effort_score_events)<>5 then raise exception 'own history unavailable'; end if;
  reset role;
end; $$;
