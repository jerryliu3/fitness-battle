# Five mobile home concepts

Route: `/design/home?layout=trail|circuit|calendar|islands|today&source=sample|account`.

This is a working design route in the existing Next app. Its implementation lives in `apps/web/src/app/design/_studies/home-lab/`; `src/app/design/home/page.tsx` is the route wrapper. It uses CompeteState, counted activities, actual suggestions/lessons, Ace, the weekly board and the existing 3D Pursuit.

The production home (`/`) now uses the checkpoints layout from this study. `apps/web/src/features/home/product-home.tsx` keeps the same return reveal, with seen state under `fb-home:seen` so the lab does not clear it. A new counted gain opens Arena first. After that reveal, Arena shows the existing 2D lane track and 3D pursuit. Progress and Athlete stay the simplified views; matchups, move edits, history, and settings remain on `/board`, `/splits`, `/progress`, and `/you`. Sleep still uses the existing sleep panel when that focus is selected.

## Compositions

| Layout | Main object | Interaction |
| --- | --- | --- |
| Checkpoints (`trail`) | Winding, raised circular checkpoints | Past nodes open recorded sessions. Ace stands on today. Three future nodes are blank, unfocusable and inactive. |
| Circuit (`circuit`) | Oval athletic track | Actual activities sit around the track; today's recommendation is in its center and Ace occupies today's node. |
| Calendar (`calendar`) | Seven-day strip | Recorded days open their latest session. Today has Ace and an open recommendation. Future days are empty, not scheduled workouts. |
| Islands (`islands`) | Separate activity islands | Ace has today's island; completed activities are independent islands that open their receipts. |
| Card deck (`today`) | One large card with a visible stack | Today is already open. Swipe horizontally or use the arrows to review past activities, then tap a card for its receipt. |

Every concept shares four working app destinations: Today, Arena, Progress and Athlete. Selecting another lab concept returns to its home. Progress uses the existing progressionTrends helper; chart marks open recorded sessions. Athlete exposes rating, current identity, and tracker/settings links. The sample week remains isolated from account writes.

## Text and future-state rules

Home shows the recommendation title, duration, and past activity values. Slogans, explanations, repeated sport/date subtitles, instructions, sync banners, and the duplicated arena preview are removed. Ace opens the full recommendation and coaching in a native detail sheet. Tracker setup belongs on Athlete. Visible navigation retains its labels.

Future checkpoints are visual placeholders, not a training plan: they have no title, workout, score, promise, click handler or keyboard focus. Past markers derive only from the counted ledger. The same-day activity can appear in the past while today's real suggestion says Already covered.

## Return reveal

The previous prototype's progress detection remains shared by all five concepts. A versioned seen snapshot is scoped to browser account, primary sport, track and exact period bounds. Capture follows countsOnTrack/activityEffort, excluding pending, excluded, demo/calibration, future and other-sport activities.

A positive comparable counted effort plus distance/time gain opens Arena before Today. Its finite 2.2-second animation moves saved lane values to current values on one scale; total and rank follow the same interpolation. Reduced motion shows the final state. Acknowledgment occurs at completion or an explicit return to Today. Repeated syncs, rival movement, lesson completion, reductions, first visits, changed periods and failed account loads do not create an improvement reveal.

Arena copy is now limited to its name, totals, actual place changes, the gain and direct controls. Its nearby field expands to the full field and can switch to the existing 3D view.

Seen state remains browser-local. Cross-device acknowledgments and closed-period gains require a later production integration. This study follows the primary sport; sleep retains its existing product surface.

## Sample and actual data

Lab controls sit outside the product: five layout choices, three return scenarios, and a source toggle. The sample is pinned to October 14, 2026. Its manual fixture sessions exercise actual scoring without claiming tracker connectivity. The arrival scenario adds 5.1 km, taking the week from 7.8 to 12.9 km; the real suggestion engine then says Already covered.

Actual-data mode waits for CompeteProvider and reads the account/guest state. Only seen presentation snapshots are saved under the prototype key. Completing a coaching tip uses the existing complete-lesson action. Source/layout URL values are whitelisted and survive refresh. No tokens, scoring, migration, tracker API or production write path changes are introduced.

## Review

Images in `docs/home-reviews/`: `checkpoints-phone.jpg`, `circuit-phone.jpg`, `calendar-phone.jpg`, `islands-phone.jpg`, `deck-phone.jpg`, `progress-phone.jpg`, `athlete-phone.jpg`, and `arrival-phone.jpg`. Earlier `trail-phone.jpg` / `today-phone.jpg` captures record the first study.

Verification: monorepo typecheck, 31 web tests (including seven arrival tests), production web build; browser checks of all five layouts at 390 and 320 px, four tabs, inactive future markers, direct Ace/session details, card swipe, native Escape/focus return, field expansion and the finite arrival reveal. The circuit's narrow-screen Ace overflow was corrected. Layout changes do not override the initial arrival reveal under React Strict Mode.
