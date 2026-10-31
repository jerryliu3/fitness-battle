-- Run after migrations inside a rollback transaction.
do $$ declare job record; begin
 perform set_config('request.jwt.claim.role','service_role',true);
 perform public.enqueue_garmin_push('test-diagnostics','{}');
 select * into job from public.claim_garmin_push();
 perform public.record_garmin_push_error(job.id,gen_random_uuid(),'wrong_lease');
 if exists(select 1 from private.garmin_push_inbox where id=job.id and last_error is not null) then raise exception 'wrong lease accepted'; end if;
 perform public.record_garmin_push_error(job.id,job.lease_id,'garmin_file_download_failed:401');
 if not exists(select 1 from private.garmin_push_inbox where id=job.id and last_error='garmin_file_download_failed:401') then raise exception 'error not recorded'; end if;
end $$;
