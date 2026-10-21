-- Run inside a rollback transaction.
do $$
declare u uuid:=gen_random_uuid(); c uuid:=(select id from public.categories limit 1); a uuid;
begin
  insert into auth.users(id,email) values(u,u::text||'@test.invalid');
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,provenance,disposition,compete_key)
    values(u,'strava','record',c,statement_timestamp()-interval '1 day',5000,'running',5000,1500,'recorded','counted','record-test') returning id into a;
  if (select count(*) from public.personal_record_attempts where user_id=u)<>1 then raise exception 'record not captured'; end if;
  update public.activities set moving_sec=1450 where id=a;
  if (select seconds from public.personal_record_attempts where user_id=u)<>1450 then raise exception 'record not corrected'; end if;
  update public.activities set distance_m=15000 where id=a;
  if exists(select 1 from public.personal_record_attempts where user_id=u) then raise exception 'invented shorter splits'; end if;
  update public.activities set distance_m=5000,disposition='excluded' where id=a;
  if exists(select 1 from public.personal_record_attempts where user_id=u) then raise exception 'excluded record'; end if;
end; $$;
