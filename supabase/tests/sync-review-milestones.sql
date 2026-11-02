-- Local database only. Reproduces the production rejection and rolls back all fixtures.
begin;
do $$
declare
 athlete uuid:=gen_random_uuid();
 start_at timestamptz:=date_trunc('day',clock_timestamp())-interval '1 day';
 end_at timestamptz:=date_trunc('day',clock_timestamp())+interval '2 days';
 document jsonb;
 receipt jsonb;
 activity_id uuid;
begin
 insert into auth.users(id,email) values(athlete,athlete::text||'@test.invalid');
 insert into public.profiles(id,display_name) values(athlete,'Sync review fixture') on conflict(id) do nothing;
 insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,verified,provenance,disposition,compete_key,source_label)
 values(athlete,'apple_health','sync-review-fixture',(select id from public.categories where slug='running'),start_at+interval '1 hour',5000,'running',5000,1800,true,'recorded','excluded','apple_health-sync-review-fixture','apple_health') returning id into activity_id;
 receipt:=jsonb_build_object('sport','running','track','open','periodStart',start_at,'periodEnd',end_at,'step',1609.344,'earned',3);
 document:=jsonb_build_object('enrollments',jsonb_build_array(jsonb_build_object('sport','running','waveStart',start_at)),'effortMilestones',jsonb_build_array(receipt));
 -- The former API order awarded counted ingest before applying the exclusion.
 begin
  perform private.store_effort_receipts(athlete,document);
  raise exception 'excluded volume incorrectly earned milestones';
 exception when others then if sqlerrm<>'milestone_volume_mismatch' then raise; end if; end;
 -- Applying the review before calculating awards produces a valid, retryable save.
 document:=jsonb_set(document,'{effortMilestones,0,earned}','0');
 perform private.store_effort_receipts(athlete,document);
 perform private.store_effort_receipts(athlete,document);
 if (select earned from public.effort_milestones where user_id=athlete)<>0 then raise exception 'excluded activity awarded points'; end if;
 -- Awards that were already committed still survive a later exclusion.
 update public.activities set disposition='counted' where id=activity_id;
 document:=jsonb_set(document,'{effortMilestones,0,earned}','3');
 perform private.store_effort_receipts(athlete,document);
 update public.activities set disposition='excluded' where id=activity_id;
 perform private.store_effort_receipts(athlete,document);
 if (select earned from public.effort_milestones where user_id=athlete)<>3 then raise exception 'committed awards were lost'; end if;
end; $$;
rollback;
