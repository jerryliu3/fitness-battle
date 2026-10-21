-- Run inside a rollback transaction after migrations.
do $$
declare u uuid:=gen_random_uuid(); c uuid:=(select id from public.categories limit 1); s timestamptz:=statement_timestamp()-interval '1 hour'; e timestamptz:=statement_timestamp()+interval '1 day'; doc jsonb;
begin
  insert into auth.users(id,email) values(u,u::text||'@test.invalid');
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,provenance,disposition,compete_key)
    values(u,'strava','milestone',c,statement_timestamp()-interval '1 minute',3218.688,'running',3218.688,1200,'recorded','counted','milestone-test');
  doc:=jsonb_build_object('enrollments',jsonb_build_array(jsonb_build_object('sport','running','waveStart',s)),
    'effortMilestones',jsonb_build_array(jsonb_build_object('sport','running','track','open','periodStart',s,'periodEnd',e,'step',1609.344,'earned',2)));
  perform private.store_effort_receipts(u,doc);
  perform private.store_effort_receipts(u,doc);
  if (select earned from public.effort_milestones where user_id=u)<>2 then raise exception 'receipt replay'; end if;
  begin
    perform private.store_effort_receipts(u,jsonb_set(doc,'{effortMilestones,0,earned}','3'));
    raise exception 'invalid credit accepted';
  exception when others then if sqlerrm<>'milestone_volume_mismatch' then raise; end if; end;
  begin
    perform private.store_effort_receipts(u,jsonb_set(doc,'{effortMilestones,0,earned}','0'));
    raise exception 'receipt decrease accepted';
  exception when others then if sqlerrm<>'milestone_receipt_changed' then raise; end if; end;
  if has_table_privilege('authenticated','public.effort_milestones','INSERT') then raise exception 'direct writes allowed'; end if;
end; $$;
