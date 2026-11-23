-- Add daily_digest notification category and per-day check-in / summary tracking.

alter table public.notification_preferences
  add column if not exists daily_digest boolean not null default true,
  add column if not exists last_recovery_checkin_day date,
  add column if not exists last_daily_summary_day date;

alter table public.notification_outbox
  drop constraint if exists notification_outbox_category_check;

alter table public.notification_outbox
  add constraint notification_outbox_category_check
  check (
    category in (
      'week_summary',
      'rival_moves',
      'activity_synced',
      'daily_digest',
      'lesson_reminder',
      'connection_alerts'
    )
  );
