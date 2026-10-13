-- Maps Fitness Battle users to Open Wearables user ids (WHOOP pilot and later providers).
create table if not exists public.open_wearables_links (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  ow_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists open_wearables_links_ow_user_id_uidx
  on public.open_wearables_links (ow_user_id);

alter table public.open_wearables_links enable row level security;

drop policy if exists open_wearables_links_select on public.open_wearables_links;
create policy open_wearables_links_select on public.open_wearables_links
  for select to authenticated
  using (user_id = auth.uid());

-- Writes go through the service role from the web API only.
revoke insert, update, delete on public.open_wearables_links from anon, authenticated;
grant select on public.open_wearables_links to authenticated;
grant all on public.open_wearables_links to service_role;
