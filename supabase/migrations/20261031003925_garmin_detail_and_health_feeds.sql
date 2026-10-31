-- Full provider records stay private; only the owner can read a bounded page.
create table private.garmin_records (
  user_id uuid not null references public.profiles(id) on delete cascade,
  feed text not null,
  external_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key(user_id, feed, external_id)
);
alter table private.garmin_records enable row level security;
revoke all on private.garmin_records from public, anon, authenticated;
create index garmin_records_owner_updated on private.garmin_records(user_id, updated_at desc);

create function public.store_garmin_record(p_user_id uuid, p_feed text, p_external_id text, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  insert into private.garmin_records(user_id,feed,external_id,payload)
  values(p_user_id,p_feed,p_external_id,p_payload)
  on conflict(user_id,feed,external_id) do update set payload=excluded.payload,updated_at=now();
end $$;
create function public.load_garmin_record(p_user_id uuid, p_feed text, p_external_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  return (select payload from private.garmin_records where user_id=p_user_id and feed=p_feed and external_id=p_external_id);
end $$;
create function public.garmin_records_page(p_feed text, p_before timestamptz default null)
returns table(feed text, external_id text, payload jsonb, updated_at timestamptz)
language sql security definer set search_path = '' as $$
  select r.feed,r.external_id,r.payload,r.updated_at from private.garmin_records r
  where r.user_id=(select auth.uid()) and r.feed=p_feed and (p_before is null or r.updated_at<p_before)
  order by r.updated_at desc,r.external_id limit 10;
$$;
create function public.revoke_garmin_link(p_external_user_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  update public.fitness_connections c set status='disconnected',updated_at=now()
  where c.provider='garmin' and c.user_id in
    (select t.user_id from private.fitness_tokens t where t.provider='garmin' and t.athlete_external_id=p_external_user_id);
  delete from private.fitness_tokens where provider='garmin' and athlete_external_id=p_external_user_id;
end $$;

-- A summary and its detailed track can arrive in either order or concurrently.
create function private.preserve_garmin_route()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.provider='garmin' and new.provider='garmin' then
    new.summary_polyline=coalesce(new.summary_polyline,old.summary_polyline);
    new.detailed_polyline=coalesce(new.detailed_polyline,old.detailed_polyline);
    new.route_bounds=coalesce(new.route_bounds,old.route_bounds);
    new.route_replay=coalesce(new.route_replay,old.route_replay);
    new.elevation_gain_m=coalesce(new.elevation_gain_m,old.elevation_gain_m);
  end if;
  return new;
end $$;
create trigger preserve_garmin_route before update on public.activities
for each row execute function private.preserve_garmin_route();

revoke all on function public.store_garmin_record(uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.load_garmin_record(uuid,text,text) from public,anon,authenticated;
revoke all on function public.revoke_garmin_link(text) from public,anon,authenticated;
revoke all on function public.garmin_records_page(text,timestamptz) from public,anon;
grant execute on function public.store_garmin_record(uuid,text,text,jsonb) to service_role;
grant execute on function public.load_garmin_record(uuid,text,text) to service_role;
grant execute on function public.revoke_garmin_link(text) to service_role;
grant execute on function public.garmin_records_page(text,timestamptz) to authenticated;

create function public.apply_garmin_permissions(p_user_id uuid,p_permissions text[],p_changed_at double precision)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('garmin-permissions:'||p_user_id::text,0));
  if exists (select 1 from private.garmin_records r where r.user_id=p_user_id and r.feed='userPermissionsChange'
    and (r.payload->>'changeTimeInSeconds')::double precision>p_changed_at) then return; end if;
  update public.fitness_connections set
    status=case when p_permissions && array['ACTIVITY_EXPORT','HEALTH_EXPORT'] then 'connected' else 'disconnected' end,
    updated_at=now()
  where user_id=p_user_id and provider='garmin' and exists(select 1 from private.fitness_tokens t where t.user_id=p_user_id and t.provider='garmin');
end $$;
revoke all on function public.apply_garmin_permissions(uuid,text[],double precision) from public,anon,authenticated;
grant execute on function public.apply_garmin_permissions(uuid,text[],double precision) to service_role;

-- One record per leased job isolates a failed file/user and bounds worker duration.
-- The whole delivery is committed before the HTTP acknowledgement.
create function public.enqueue_garmin_batch(p_items jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>500 then raise exception 'invalid_batch'; end if;
  insert into private.garmin_push_inbox(payload_hash,payload)
  select item->>'hash',item->'payload' from jsonb_array_elements(p_items) item
  on conflict(payload_hash) do nothing;
end $$;
revoke all on function public.enqueue_garmin_batch(jsonb) from public,anon,authenticated;
grant execute on function public.enqueue_garmin_batch(jsonb) to service_role;

-- Queue retries, not athlete/provider polling. Vault URL configuration is per
-- environment; local databases without it never call the production app.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
create function public.authorize_garmin_retry(p_secret text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare expected text;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  select decrypted_secret into expected from vault.decrypted_secrets where name='garmin_inbox_retry_token';
  return coalesce(length(p_secret)>=32 and pg_catalog.sha256(convert_to(p_secret,'UTF8'))=pg_catalog.sha256(convert_to(expected,'UTF8')),false);
end $$;
revoke all on function public.authorize_garmin_retry(text) from public,anon,authenticated;
grant execute on function public.authorize_garmin_retry(text) to service_role;
create function private.wake_garmin_inbox()
returns void language plpgsql security definer set search_path = '' as $$
declare destination text; token text;
begin
  if not exists(select 1 from private.garmin_push_inbox where completed_at is null and available_at<=now() and (lease_until is null or lease_until<now())) then return; end if;
  select decrypted_secret into destination from vault.decrypted_secrets where name='garmin_inbox_retry_url';
  select decrypted_secret into token from vault.decrypted_secrets where name='garmin_inbox_retry_token';
  if destination is null or token is null then return; end if;
  perform net.http_get(url:=destination,headers:=jsonb_build_object('Authorization','Bearer '||token),timeout_milliseconds:=60000);
end $$;
revoke all on function private.wake_garmin_inbox() from public,anon,authenticated,service_role;
select cron.schedule('garmin-inbox-retry','* * * * *','select private.wake_garmin_inbox()');
