# Competition replay

October 25, 2026.

Fullscreen Compete offers Replay on web and native. Both fullscreen dimensions use the same replay control in the race HUD. Settled-round recaps and expanded
Past weeks results can open the same viewer. Replay stays out of inline standings.

One event represents one eligible counted workout. Events are ordered by workout
start time, then athlete ID and event ID, so equal timestamps remain individual,
stable steps. This replays workout chronology, not the order trackers synchronized
or the server received corrections. GPS fields use distance and strength uses the
existing effort formula. Places match the field renderer, including shared places
at equal totals; replay never writes ratings, results or overtake receipts.

Playback interpolates only the athlete changing in that event, with 1×/2×/4×
speeds. Previous/next, start/latest-or-finish and an in-memory draggable timeline
allow seeking in either direction. The camera follows the event athlete by default;
Follow me switches to the viewer, and field panning/selection remains available.
Dimension changes retain the cursor. Reduced motion uses discrete steps. Playback
pauses in the background and stops when the viewer closes.

## Data contract

Apply `20261025143404_competition_replay.sql` before deploying the API. The new
read-only `competition_replay` RPC selects the viewer's exact persisted
`week_fields` sport and bounds, requires field membership and, for private fields,
current active crew membership. It applies the same counted/sample/history/GPS
filters as `week_field_roster`. No service-role reads or widened table policies
are introduced. Peer routes, provider identifiers and heart-rate samples are not
returned. The server strips even the viewer's heart rate after deriving effort.

The API returns one compact JSON ledger so PostgREST's 1000-row limit does not
truncate busy fields. Reads are lazy and private/no-store. Each open viewer loads
one coherent ledger; refresh explicitly reloads the latest eligible workouts.
There are no replay writes or duplicate ingestion/scoring paths. Existing activity
indexes support the field-member/time-window query. A per-athlete cumulative
index occupies O(events + athletes) memory and supports O(athletes × log events)
seeking; it does not store a full field snapshot for each event.

Simulated athletes use the same deterministic daily volume model as the current
field. Their daily steps are labeled simulated rather than invented workouts.
Offline and explicitly active Debug previews show only the viewer's eligible sessions and known simulated
athletes; they never interpolate a real peer's history from aggregate totals.
Authenticated errors stay explicit, with retry, rather than switching to fixtures.

Closed fields are reconstructed from retained counted activity and persisted
seating. An edit, exclusion, deletion or membership change can alter historical
reconstruction. This is not an immutable audit log or a frozen settlement snapshot.
Older results without retained field seating report that replay is unavailable.

## Verification and review

The web development server compiled the actual Arena and replay components.
The local walkthrough exercised next-event changes, latest totals, 2D/3D switching,
play/pause and seeking at desktop and 390×844. [Phone view](web-phone.png). The current offline preview contains only available
simulated peers, which is disclosed in the viewer.

Metro produced an iOS JavaScript bundle. The installed simulator app cannot run
this checkout reliably: it contains React Native 0.86.3 while the checkout uses
0.88.0, plus incompatible Worklets native code. No successful native interaction
walkthrough is claimed. A new native binary is required for that walkthrough.

Shared regression cases cover tie ordering, reverse seeking, interpolation,
unit conversion, eligibility, half-open bounds, strength and simulated totals.
API regression cases cover authentication, input bounds, the authorized RPC,
minimal responses and errors. A rolled-back SQL fixture covers membership,
private crew access, sample/future/track exclusions and a ledger over 1000 events.
Per the owner's request, type checks, automated
tests and production builds were not run. The local Docker database is not
running, so the migration has not been applied or runtime-verified here.

Manual code review checked the RPC's ownership/crew gates, privacy of the response,
eligibility and period parity, event ordering, tie places, reverse seeking, timer
cleanup and background pause. Review fixes aligned tied places with the scene,
kept the current event athlete visible on initial mount/dimension changes, added
a bounded web load/retry path, and let narrow-screen playback controls wrap. The
replay was rebased onto main's new full-arena HUD before final review. No remaining
actionable issue was identified in that static review; live database and native
binary limitations above remain.

### Debug preview data boundary

An authenticated Debug preview is still an in-memory practice field. Web and native
must use `localCompetitionReplay` while `debugActive` is true, rather than querying
production seating for the fixture's sport/round. The viewer reloads its source when
Debug is reset. Ordinary authenticated replay stays server-backed; a failed real
field lookup never silently falls back to practice data. Production diagnostics
confirmed `field_not_found` when the fixture did not have matching persisted field
membership.
No production seating or activity data was changed to address the preview error.

Web and native regression tests cover authenticated Debug opening without a network
request, resetting Debug while the viewer is open to reload from the server, and
real server failures staying visible rather than falling back to preview data.

### Multi-sport seating follow-up

A Crew field in one sport must not prevent another enrolled sport from receiving
persisted field membership. Hydration now processes every enrollment, reads Crew
fields without reseating, and uses the existing seating RPC for each open field.
Per-enrollment transient snapshots retain real roster totals for every sport while
keeping the preferred Crew board available to existing consumers. This fixes the
case of Crew cycling plus separate running where the running Replay lookup had
no field to read. The change applies equally to synthetic and ordinary accounts.
No migration is required; normal account load/refresh provisions missing open
seats through the authenticated RPC. No production seating was manually changed.

## October 27 fullscreen control follow-up

The Compete fullscreen view dropdown retains 2D/3D and the existing distance-only
4D course, and exposes labeled Zoom in/Zoom out actions for 2D/3D. Pinch and
existing web gesture handling remain; standalone fullscreen +/- clusters are
removed. Replay follows Behind in the quick-jump rail. Standings in the menu
returns to the inline standings card. Inline controls retain their zoom affordances.

The shared distance overview is now a separate bottom HUD element beneath the
athlete spotlight, independent of its expanded/collapsed state, in both 2D and 3D.
Dragging or keyboard/native adjustable actions navigate the actual camera window.
The spotlight moves up 56px; overview and panel clear the bottom safe area and
follow hold-to-hide. Focused native tests exercise overview navigation before and
after panel collapse and after switching 2D to 3D. Web dropdown/portrait tests and
JSX parsing cover the corresponding control change. No typecheck or expensive
suite was run at the owner's request.

Combined local browser review at 390×844 verified inline Standings/2D/3D switching,
fullscreen 2D/3D, Replay beneath Behind, replay opening, dropdown zoom and overview
keyboard navigation with the athlete panel collapsed and expanded. The walkthrough
caught and fixed a 3D direction row overlapping the overview; directions now sit
above the spotlight, including native's equivalent layout. The replay viewer also
retains labeled zoom actions in its dropdown. This was a web phone-viewport review,
not an installed native device validation. Three native and three web replay tests
passed after the shared-renderer follow-up.

Deep-review correction: the distance overview is shown only in 2D/3D. The 4D
geographic camera does not consume the distance-window state, so its fullscreen
HUD omits that slider instead of exposing an inert navigation control. Both
platform field tests now verify that the overview disappears in 4D, returns in
2D/3D, and leaves the selected course and athlete intact. Five native field tests
and the web 4D integration test passed; no typecheck or expensive suite was run.
