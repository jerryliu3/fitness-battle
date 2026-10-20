-- Server-only recovery/audit records for explicitly requested admin settlement.
create table public.admin_compete_actions (
  id uuid primary key,
  actor_id uuid not null references auth.users(id),
  target_id uuid not null references auth.users(id),
  action text not null check (action in ('settle-due', 'close-round')),
  reason text not null,
  outcome text not null default 'started' check (outcome in ('started', 'succeeded', 'failed')),
  before_state jsonb not null,
  after_state jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.admin_compete_actions enable row level security;
revoke all on public.admin_compete_actions from public, anon, authenticated;
grant all on public.admin_compete_actions to service_role;
