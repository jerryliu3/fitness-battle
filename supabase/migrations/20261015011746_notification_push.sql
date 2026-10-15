-- Notification preferences + push device registry.
-- Delivery providers (APNs / FCM / web-push) are not wired yet; devices may be
-- stub tokens so product code can treat push as available end-to-end.

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  enabled boolean not null default false,
  week_summary boolean not null default true,
  rival_moves boolean not null default true,
  lesson_reminder boolean not null default false,
  connection_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Account-scoped notification category switches. Device tokens live in push_devices.';

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('web', 'ios', 'android')),
  token text not null check (char_length(token) between 8 and 512),
  stub boolean not null default true,
  permission_status text not null default 'unknown'
    check (
      permission_status in (
        'unknown',
        'prompt',
        'granted',
        'denied',
        'unsupported',
        'stub'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, platform, token)
);

create index push_devices_user_idx
  on public.push_devices (user_id, updated_at desc);

comment on table public.push_devices is
  'Registered push endpoints. stub=true means local/demo token, not APNs/FCM.';

-- Audit of stub (and later real) delivery attempts.
create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null
    check (
      category in (
        'week_summary',
        'rival_moves',
        'lesson_reminder',
        'connection_alerts'
      )
    ),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 500),
  path text,
  status text not null default 'stubbed'
    check (status in ('stubbed', 'queued', 'sent', 'failed')),
  device_count integer not null default 0 check (device_count >= 0),
  created_at timestamptz not null default now()
);

create index notification_outbox_user_idx
  on public.notification_outbox (user_id, created_at desc);

alter table public.notification_preferences enable row level security;
alter table public.push_devices enable row level security;
alter table public.notification_outbox enable row level security;

create policy notification_preferences_own on public.notification_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy push_devices_own on public.push_devices
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notification_outbox_own_select on public.notification_outbox
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notification_outbox_own_insert on public.notification_outbox
  for insert to authenticated
  with check (user_id = (select auth.uid()));
