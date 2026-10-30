-- Garmin push deliveries are stored before acknowledgement. Only service_role can
-- enqueue or lease work; payloads are removed after successful processing.
create table private.garmin_push_inbox (
  id bigint generated always as identity primary key,
  payload_hash text not null unique,
  payload jsonb,
  received_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  lease_id uuid,
  lease_until timestamptz,
  attempts integer not null default 0,
  completed_at timestamptz
);
revoke all on private.garmin_push_inbox from public, anon, authenticated;

create function public.enqueue_garmin_push(p_hash text, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  insert into private.garmin_push_inbox(payload_hash, payload)
  values (p_hash, p_payload) on conflict (payload_hash) do nothing;
end $$;

create function public.claim_garmin_push()
returns table(id bigint, payload jsonb, lease_id uuid)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  return query
  with candidate as (
    select q.id from private.garmin_push_inbox q
    where q.completed_at is null and q.available_at <= now()
      and (q.lease_until is null or q.lease_until < now())
    order by q.received_at for update skip locked limit 1
  )
  update private.garmin_push_inbox q
  set lease_id = gen_random_uuid(), lease_until = now() + interval '5 minutes', attempts = q.attempts + 1
  from candidate c where q.id = c.id
  returning q.id, q.payload, q.lease_id;
end $$;

create function public.finish_garmin_push(p_id bigint, p_lease uuid, p_success boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  update private.garmin_push_inbox q
  set completed_at = case when p_success then now() else null end,
      payload = case when p_success then null else q.payload end,
      available_at = case when p_success then q.available_at else now() + interval '5 minutes' end,
      lease_id = null, lease_until = null
  where q.id = p_id and q.lease_id = p_lease;
end $$;
revoke all on function public.enqueue_garmin_push(text, jsonb) from public, anon, authenticated;
revoke all on function public.claim_garmin_push() from public, anon, authenticated;
revoke all on function public.finish_garmin_push(bigint, uuid, boolean) from public, anon, authenticated;
grant execute on function public.enqueue_garmin_push(text, jsonb) to service_role;
grant execute on function public.claim_garmin_push() to service_role;
grant execute on function public.finish_garmin_push(bigint, uuid, boolean) to service_role;
