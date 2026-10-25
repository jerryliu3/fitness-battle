# Competition replay

October 25, 2026.

Fullscreen Compete offers Replay on web and native. The existing 3D perspective
view also has a fullscreen replay entry on web. Settled-round recaps and expanded
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
Offline previews show only the viewer's eligible sessions and known simulated
athletes; they never interpolate a real peer's history from aggregate totals.
Authenticated errors stay explicit, with retry, rather than switching to fixtures.

Closed fields are reconstructed from retained counted activity and persisted
seating. An edit, exclusion, deletion or membership change can alter historical
reconstruction. This is not an immutable audit log or a frozen settlement snapshot.
Older results without retained field seating report that replay is unavailable.

## Verification and review

The web development server compiled the actual Arena and replay components.
The local walkthrough exercised next-event changes, latest totals, 2D/3D switching,
play/pause and seeking. The current offline preview contains only available
simulated peers, which is disclosed in the viewer.

Metro produced an iOS JavaScript bundle. The installed simulator app cannot run
this checkout reliably: it contains React Native 0.86.3 while the checkout uses
0.88.0, plus incompatible Worklets native code. No successful native interaction
walkthrough is claimed. A new native binary is required for that walkthrough.

Shared regression cases cover tie ordering, reverse seeking, interpolation,
unit conversion, eligibility, half-open bounds, strength and simulated totals.
API regression cases cover authentication, input bounds, the authorized RPC,
minimal responses and errors. Per the owner's request, type checks, automated
tests and production builds were not run. The local Docker database is not
running, so the migration has not been applied or runtime-verified here.
