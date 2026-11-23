-- Add activity_synced notification category preference and outbox support.

alter table public.notification_preferences
  add column if not exists activity_synced boolean not null default true;

alter table public.notification_outbox
  drop constraint if exists notification_outbox_category_check;

alter table public.notification_outbox
  add constraint notification_outbox_category_check
  check (
    category in (
      'week_summary',
      'rival_moves',
      'activity_synced',
      'lesson_reminder',
      'connection_alerts'
    )
  );
