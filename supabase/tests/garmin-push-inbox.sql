-- Run inside a rollback transaction after applying migrations.
do $$
declare job record; second_job record;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform public.enqueue_garmin_push('inbox-test-hash', '{"activities":[]}'::jsonb);
  perform public.enqueue_garmin_push('inbox-test-hash', '{"activities":[]}'::jsonb);
  if (select count(*) from private.garmin_push_inbox where payload_hash = 'inbox-test-hash') <> 1 then
    raise exception 'duplicate push was not deduplicated';
  end if;
  select * into job from public.claim_garmin_push();
  if job.id is null then raise exception 'job was not claimed'; end if;
  select * into second_job from public.claim_garmin_push();
  if second_job.id is not null then raise exception 'leased job was claimed twice'; end if;
  perform public.finish_garmin_push(job.id, gen_random_uuid(), true);
  if (select completed_at from private.garmin_push_inbox where id = job.id) is not null then
    raise exception 'wrong lease completed a job';
  end if;
  perform public.finish_garmin_push(job.id, job.lease_id, false);
  if (select payload from private.garmin_push_inbox where id = job.id) is null then
    raise exception 'failed payload was lost';
  end if;
  update private.garmin_push_inbox set available_at = now() where id = job.id;
  select * into job from public.claim_garmin_push();
  perform public.finish_garmin_push(job.id, job.lease_id, true);
  if (select completed_at is null or payload is not null from private.garmin_push_inbox where id = job.id) then
    raise exception 'successful payload was not cleared';
  end if;
end $$;
