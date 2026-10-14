-- Account-scoped compete document. The play UI hydrates this row so a
-- second browser and a second account do not share one localStorage blob.

create table public.compete_snapshots (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.compete_snapshots enable row level security;

create policy compete_snapshots_select_own on public.compete_snapshots
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy compete_snapshots_insert_own on public.compete_snapshots
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy compete_snapshots_update_own on public.compete_snapshots
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
