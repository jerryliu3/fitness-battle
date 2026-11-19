# Special events

Special events are scheduled, full-week competitions with a pre-registration window
the week before and a hard lock at Monday 06:00 America/New_York. Unlike recurring
daily-wave sports (`wave_enrollments` / `week_fields`), there are no partial-week
joins, no automatic renewal, and no `house-match-pool` fillers.

## Composable 4-axis model

Every edition is described by a versioned `config` jsonb across four orthogonal axes:

1. **Grouping (`grouping`)**: `solo`, `crew` (opt-in active crew members), or
   `profile_attr` (equal-size squads grouped by a profile attribute such as
   `country_code`, `random`, or future canonical `city_slug`).
2. **Match format (`match`)**: `single_round`, `survivor_heat` (e.g. 8-side heat
   eliminating 1+/round), or `knockout_1v1` (head-to-head bracket).
3. **Round cadence (`cadence`)**: `single_week`, `daily` (Eastern midnight
   `00:00 ET` cutoffs; Day 1 runs Monday `06:00 ET` → Tuesday `00:00 ET`), or
   `weekly` (multi-week rounds). `scoreMode` supports `round_window` (daily/round
   reset, default for daily eliminations) and `cumulative`.
4. **Scoring (`scoring`)**: `total_volume` (all members count every day) or
   `relay_handoff` (only designated baton-holders count on each Eastern calendar
   day, supporting `manual | random` assignment and `full_week | pre_day` locks).

## Persistence & authority

Seven additive relational tables live alongside weekly waves without mutating
`wave_enrollments`, `week_fields`, or Effort Score EWMA (`sport_ratings` /
`effort_accounts`):

| Table | Purpose |
| --- | --- |
| `special_event_editions` | Scheduled edition, bounds (`registration_opens_at`, `registration_closes_at <= starts_at`, `ends_at`), published flag, frozen route snapshot, and typed 4-axis `config`. |
| `special_event_sides` | Frozen solo or squad competitor unit (`solo`, `crew`, `profile_group`) with snapshotted `display_name` and `entry_rating`. |
| `special_event_rounds` | Timed scoring rounds (`starts_at`, `ends_at`, `heat_size`, `advance_count`, `score_mode`). |
| `special_event_heats` | Matchups of 2–8 `special_event_sides` per round/division. |
| `special_event_entries` | Athlete registration, frozen `side_id` or `spectate_heat_id` (when unseated under `leftoverPolicy = 'spectate'`), cancellation before cutoff, and reveal receipt. |
| `special_event_relay_legs` | Daily baton assignments (`side_id`, Eastern `leg_day`, `slot_index`, `user_id`). |
| `special_event_receipts` | Durable outcome/trophy receipts (`UNIQUE(edition_id, user_id, code)`). |

### Scoring & mid-week deadline locks

Workouts count toward both recurring weekly sports and active special events.
`private.special_event_heat_scores` reads exclusively from
`private.competition_activity_rows` (running/cycling GPS verified distance;
strength moving seconds) and `private.walking_steps_total` /
`daily_health_readings` (walking daily steps).

`private.capture_competition_fact` takes an additional shared advisory lock on
the Eastern midnight close of each activity's `started_at`, so daily elimination
rounds ending at `00:00 ET` have the exact same zero-race deadline freeze as
Monday closes without requiring a cron job.

### Security & rollout

- Direct client `INSERT`, `UPDATE`, and `DELETE` are revoked on all special-event
  tables.
- Public RPCs (`list_special_events`, `register_special_event`,
  `cancel_special_event`, `special_event_standings`,
  `acknowledge_special_event`) are `SECURITY DEFINER`
  with `SET search_path = ''` and explicit `auth.uid()` checks.
- Admin edition creation/updates use owner-only `/api/admin/special-events` and
  service-role `admin_save_special_event_edition` /
  `admin_advance_special_event`.
- Apply `20261119160000_special_events_core.sql` then
  `20261119170000_special_events_tournaments.sql` before deploying. Accompanying
  tests live in `supabase/tests/special-events-core.sql`,
  `supabase/tests/special-events-tournaments.sql`,
  `packages/shared/src/special-events.test.ts`, and API route tests.
