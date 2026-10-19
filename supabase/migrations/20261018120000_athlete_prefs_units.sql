-- Persist distance unit preference for signed-in accounts (compete state.units).

alter table public.athlete_prefs
  add column if not exists units text not null default 'us'
    check (units in ('us', 'metric'));
