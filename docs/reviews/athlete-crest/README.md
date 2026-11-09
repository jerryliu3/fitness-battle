# Athlete Crest implementation

The selected Contender · Crest replaces the profile card at the top of Athlete
on web and native. Edit profile remains below it, using existing photo/name/city
editing. The portrait is an ordinary circular cover crop; no background removal.
Missing or failed photos use initials. Long names wrap within the card.

The November 8 proportion refinement changes the face from 320×448 to 320×368.
Straight side sections shorten from 318 to 216 units; the two lower diagonals
grow from 44/58 to 54/70 vertical units. The photo and name are more compact,
city and rank are removed, and the stat rows move upward and inward. Both header
values use the same smaller type recipe, with Effort Score / Primary sport labels.
PB labels are abbreviated to keep the rows clear of the lower outline. The
native/Expo web host shrinks to 390px alongside the shorter card.

## Material and interaction

The alloy background, grain, bevel, shine tint and reflection beam are copied
from Goalmaxxing's `src/features/ux-brand/card-materials/category-materials.module.css`,
using Overtaek gold as the pigment. This makes the finish lighter than the
original gold study. The selected Crest silhouette and photo placement remain.
The production `src/features/athlete-card/` owns the common Goalmaxxing-derived
optics and rotation hooks; studies now import these rather than owning a second
implementation. Lighting, connected side planes, pointer tilt, full drag turns,
keyboard rotation, flip/reset and Reduced Motion share one pose.

No idle frame loop. Hidden pages settle/cancel frames; native blur/inactivity
sends `active: false`, stops motion and releases touch ownership. Native touch
holds suspend the surrounding ScrollView until release/cancel. The native host
loads `/athlete-card-scene`, passing the presentation model and appearance only
through the existing WebView-style message bridge, never URLs. The route starts
blank and cannot read an athlete account by itself. It contains no fixture data.
Native rendering failures/process termination retain a native profile fallback
and offer Retry card. Expo web hosts the same renderer in an iframe with origin
and source checks.

## Data

`athleteCardModel` in the platform-agnostic shared package is read-only:

- Existing primary-sport Open Effort Score. The prototype's percentile
  has no production population/source and is not calculated or displayed.
- Latest best per supported distance for the primary sport, using existing
  personal-record history. No interpolated workout splits or missing records.
- Authoritative `lifetimeOvertakes`, completed primary-sport rounds from existing
  lifetime totals, and the existing counted weekly activity streak. A previous
  streak remains dimmed while the current week is inactive.
- Missing rating/records/photo remain unavailable; no constant sample values,
  generated portrait or fabricated membership date are promoted to production.

No scoring, database, provider, entitlement or upload write paths change.

## Local review

```sh
cd /Users/jerryliu/.codex/worktrees/4f8f/fitness-battle
NEXT_PUBLIC_USE_DEMO_DATA=true pnpm --filter @fitness-battle/web exec next dev --hostname 127.0.0.1 --port 3014
```

Open `http://127.0.0.1:3014/app/athlete`.

For iOS, keep that server running, then in a second terminal:

```sh
cd /Users/jerryliu/.codex/worktrees/4f8f/fitness-battle
EXPO_PUBLIC_API_URL=http://127.0.0.1:3014 pnpm --filter @fitness-battle/mobile dev
```

Press `i` to launch the simulator. Production mobile releases need the matching
web host deployed first; older hosts without the card route use the fallback.

Validation: shared/web/mobile typechecks; four shared model/bridge tests; two
native bridge lifecycle tests. Browser review covers live Athlete data, both
faces, pointer rotation, keyboard/reset, edit/cancel and narrow widths. Physical
iOS/Android touch/rendering still needs device verification.

Final refinement: smaller name, tighter name-to-stat spacing, and no visible turn/reset controls or gesture hint. Drag rotation and keyboard interaction remain available.

The UI typography contract treats only the Crest face component and stylesheet as
owner-approved scalable card artwork, alongside existing artwork exclusions.
Product chrome and both native host components remain subject to the contract.
