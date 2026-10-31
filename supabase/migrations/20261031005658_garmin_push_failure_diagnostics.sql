alter table private.garmin_push_inbox add column last_error text;
create function public.record_garmin_push_error(p_id bigint,p_lease uuid,p_error text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
 update private.garmin_push_inbox set last_error=left(p_error,120) where id=p_id and lease_id=p_lease;
end $$;
revoke all on function public.record_garmin_push_error(bigint,uuid,text) from public,anon,authenticated;
grant execute on function public.record_garmin_push_error(bigint,uuid,text) to service_role;
