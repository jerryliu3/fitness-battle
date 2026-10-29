# Compete scenario lab

## Access and deployment

Apply `20261021014247_admin_compete_scenarios.sql` after the migrations in PR #228, then deploy web. Sign in with an admin account (`3jerryliu@gmail.com` or `alice@example.com`) and visit `/admin` (also linked as **Round lab** from Athlete). Production actions require confirmed Supabase authentication and a server-only service-role key. Demo-mode cookies do not grant privileged access.

Enter the UUID of an existing Supabase athlete. Database-backed test/demo accounts work exactly like real athletes; the local sandbox at the top is separate and never changes the selected athlete. The scenario lab does not create accounts. Use a separate browser profile or Expo device signed into the test athlete to observe changes while keeping the owner session open in the admin browser.

Load the scenario preview, select a sport/action, enter a reason and the exact `SCENARIO <athlete UUID>` confirmation, then apply. Every action records its actor, target, reason, input and pre-action account snapshot in restricted audit storage, and atomically advances the affected account revision. Stale previews fail; reload before another action. No production scenario was run during development.

## Controls

| Scenario | Behavior |
| --- | --- |
| Add activity | Choose miles, duration and timestamp (browser timezone; blank means now). Manual sessions count in Open. Explicit simulated GPS sessions count in Open and Verified without creating a provider connection. Strength is Open only. |
| Register sport | Uses the ordinary shared registration defaults and Eastern weekly window. Open Compete as the athlete to seat their field. Existing or overdue enrollments are rejected; settle overdue rounds first. |
| Stop / resume renewal | Toggle the selected enrollment’s registration for the next wave while retaining the current round. |
| Remove registration now | Remove the sport enrollment and active field seats immediately, without settling. This is a test reset and can change a real athlete’s participation. Historical field rosters remain intact. |
| Join opponent’s field | Enter another athlete UUID. The selected athlete must already be registered. Move their enrollment into the opponent’s one active field, subject to capacity and existing private Crew membership. |
| Arrange an overtake | Choose “selected athlete passes opponent” or the reverse, and Open or Verified. Adds enough activity for the mover to pass the other athlete on volume and activity score. Both must be in the same active field/window; a tied or already-ahead mover is rejected. |
| Remove lab activities | Remove only tracked lab-generated activities for the selected athlete and sport. Original activities, registration, past settlement and ratings remain intact. Repeat separately for the other athlete after a “be passed” scenario. |
| Replay latest sport results | Mark only the latest settled round for the selected sport unseen. Normal refresh then exposes the results takeover. Other sports and older acknowledgments are retained. |

Existing **field-wide wave controls** remain below: close the whole selected field now and schedule next Monday, or close and open a new wave immediately until next Monday midnight Eastern. The separate single-athlete settlement panel is still available for due-round recovery.

## Overtake and return walkthrough

1. Create/sign in to two database-backed test athletes and register the desired sport. Open Compete as each athlete at least once so the backend seats their fields.
2. Load the observed athlete in the lab. If the athletes are not together, choose **Join opponent’s field**, enter the opponent UUID, and apply. Refresh both devices.
3. Ensure the intended mover is behind on the chosen track. Add an activity to the intended leader if needed. Reload the lab preview after each action.
4. On the observed device, open Compete and select the same sport/track to establish the before-state, then leave the tab/app.
5. Arrange the overtake in the lab and return to the observed device. Normal refresh delivers the changed activities and field. This exercises the app’s actual return/movement logic, including Expo, rather than calling an animation directly.
6. For repeated tests, remove generated activities from each affected athlete and refresh the observed device to establish the reset baseline before arranging another pass.

A fresh device has no previous field history. Animation baselines and “seen” history are stored on the observing device; an admin on another browser cannot erase them through SQL. New activity in a field does not guarantee a separate popup: the current product chooses its return experience based on field membership and prior device state. Test that behavior as implemented.

## Other repeatable cases

- Add multiple sessions on one day to exercise Home aggregation; set earlier timestamps for other days. Activity outside the active wave remains historical and does not affect its standings.
- Add simulated GPS versus manual activity to compare Verified/Open eligibility. Simulated GPS is test data that really affects scores; use test athletes when you do not want to alter real standings.
- Schedule a stop, then close the field to exercise opt-out and next-wave behavior.
- Close a wave, view/dismiss results on the observed device, then replay its latest sport results to repeat the takeover.
- Remove registration to exercise an unregistered sport, then register again. This does not reset onboarding, erase a real account’s training history, rewind settled Elo or change the global clock.

## Implementation boundary

All new orchestration lives in admin UI/API and a service-only SQL function. Registration and overtake sizing reuse existing shared registration/scoring functions. Product clock, animation and persistence implementations have no added admin switches or scenario branches. SQL locks fields before accounts in stable order, verifies affected account/field revisions, commits audit and mutation together, and rejects client access. Generated activities are tracked by database ID so cleanup cannot sweep up ordinary workouts. Scenario audit rows follow target-account deletion; they do not prevent deleting a test athlete.
