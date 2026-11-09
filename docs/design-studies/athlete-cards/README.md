# Athlete cards

Review route: `/design/athlete-cards` (existing design access gate).

Contender · Crest is now selected and implemented on Athlete. Production owns
the common optics and rotation in `apps/web/src/features/athlete-card/`; the study
reuses them. See [implementation notes](../../reviews/athlete-crest/README.md) for
live data, the exact Goalmaxxing alloy recipe and native hosting. Earlier scope
notes below describe the study, whose fixtures remain isolated from production.

Eight concepts in two collections share one CSS 3D renderer. The current
**Photo crops** collection extends the selected Contender and Club issue:

| Concept | Photo area | Character |
| --- | --- | --- |
| Contender · Window | Rounded rectangular window | Closest to the original player shield |
| Contender · Crest | Large circular portrait crop | A medallion inside the gold shield |
| Club · Portrait | Larger inset portrait | Compact credential, ordinary photo first |
| Club · Split | Full-height photo panel | More photographic presence, separate navy text area |

These layouts preserve the photo background using only `object-fit: cover`
and an adjustable `object-position`. No subject segmentation, CSS alpha mask,
fade, background removal or text over the photograph is used. Border radii crop
the image boundary. A prepared transparent portrait uses `contain` in the same
bounded area; no-photo uses initials. The original Contender's cutout and fade
remain only in the original collection for comparison.

Switch the photo between a square park portrait, a busy landscape race photo,
a prepared cutout or no photo. The **Photo & cutout** view compares the same card
with both image types. **Try your photo** decodes a local file into a temporary
blob URL, never uploads it, and releases it on replacement/unmount. Crop sliders
adjust the framing; the study does not save an edited image or profile changes.
Local-file URLs are never placed in the shareable query string.

The **Original four** collection preserves the first review:

| Concept | Shape and material | Focus |
| --- | --- | --- |
| Contender | Gold player shield | Percentile, portrait, three PBs, three usage stats |
| Photo finish | White satin trading card | Portrait, PBs, lifetime overtakes |
| Club issue | Navy landscape credential | Identity, Effort Score, active weeks, overtakes |
| Telemetry | Graphite performance card | Effort Score, running percentile, PB and streak |

Explore one card, compare a collection, or preview it inside Athlete. Examples:
`?concept=shield-window&view=compare&photo=park`,
`?concept=club-portrait&view=page&photo=race`, and
`?concept=shield-crest&view=photos&photo=park`.

The renderer adapts `card-optics.ts`, `use-card-pose.ts` and
`use-card-rotation.ts` from
`/Users/jerryliu/Documents/Goalmaxxing/src/features/goals/card-material/`.
It keeps the original frame-rate-independent easing, direct finger tracking,
unbounded drag angles, nearest-turn reset, fixed-light optics, pointer capture
cleanup and keyboard navigation. It adds a content-bearing reverse, hidden-face
accessibility, instant Reduced Motion flips and one outline for faces and solid
side planes. It uses no WebGL or additional dependencies.

Mouse: hover to tilt; drag to turn through either axis. Touch: drag the card;
scroll the page outside its surface. Keyboard: focus the card, arrow keys rotate,
Shift increases the angle, Enter flips, Home/Escape reset. Explicit turn/reset
buttons work with Reduced Motion. No idle animation; frames stop after settling
and on document hiding/unmount.

## Scope and decisions

All stats and identity live in study-local fixtures. Production does not import
the study. No account, tracker, rating, scoring or database writes are added.
Production Athlete is unchanged. The page-placement view is a composition study;
only its explicit profile links navigate to the existing Athlete page.

Before production integration, select:

- **Card direction:** Contender offers the strongest sports-card identity;
  Club issue fits the existing settings page most compactly.
- **Rating:** existing sport-specific Open Effort Score, a sport percentile,
  or a separately defined composite. The study proposes a running percentile
  alongside the existing score; it does not implement a new rating formula.
- **Percentile population:** the face's Running/Open percentile and reverse's
  All Open runners require explicit eligibility, ties, minimum history and update
  rules. Do not infer percentile from Elo or PBs in production.
- **Records:** athlete-selected showcase PBs versus automatically selected
  primary-sport records. Missing records must remain missing.
- **Portrait:** ordinary photo cropping is the default proposed behavior.
  Prepared transparency is supported but optional. Use the existing profile
  photo and initials fallback; no cutout service or production upload changes
  are part of this study. The crop preview is local to the design lab.

Existing production candidates include `clubLifetimeTotals`, personal record
history, authoritative Open ratings, counted active weeks and activity streaks.
Use the authoritative overtake total; do not reconstruct pass counts from local
replay. Confirm each data source and empty state before promotion.

Web and phone-width browser review are available here. A native implementation
would require an isolated WebView host, navigation/gesture integration and actual
iOS/Android verification; no native feature is implemented by this study.

## Run locally

```sh
cd /Users/jerryliu/.codex/worktrees/4f8f/fitness-battle
pnpm install --frozen-lockfile --filter @fitness-battle/web...
NEXT_PUBLIC_USE_DEMO_DATA=true pnpm --filter @fitness-battle/web exec next dev --hostname 127.0.0.1 --port 3014
```

Open `http://127.0.0.1:3014/design/athlete-cards`. Use the existing local sign-in flow if prompted.
The environment flag enables the repository's local auth; it does not connect a
tracker or backend.

## Verification

- `pnpm --filter @fitness-battle/web typecheck` passed.
- Browser review covered all four faces, shield/credential backs, keyboard
  rotation/flip/reset, pointer dragging and released capture, comparison and
  Athlete placement, and phone layouts down to a 321px content width with no
  document overflow. Reduced Motion behavior was code-reviewed; physical touch,
  native WebViews and iOS/Android rendering have not been verified.
- `comparison.png` captures all four directions. No production scoring or SQL
  behavior changed, so scoring/database suites were not run.

The second collection also received a web typecheck and browser review covering
local file selection/decoding, slider changes reflected in CSS, photo/cutout
comparison, phone layouts, no-photo fallback and preservation of the original
collection. `photo-crops.png` captures the four new directions.

## Portrait asset

`apps/web/public/design/athlete-cards/runner.png` was generated with the built-in
imagegen tool, with transparency preserved. Prompt:

> Use case: photorealistic-natural. Asset type: transparent cutout for an interactive sports trading card in the Overtaek fitness app. Create one fictional female recreational distance runner around 28 years old with East Asian features, dark hair tied in a ponytail, athletic build, a confident calm expression with a subtle smile, gazing at the camera. Waist-up portrait, entire head and shoulders and both arms inside the frame, relaxed hands on hips, body turned slightly three-quarter. Plain technical running singlet in deep navy #142b3b with a narrow golden yellow #f7c948 trim and no words or logos. Editorial sports photography with realistic skin texture, gentle bright key light from upper left, soft rim light, crisp authentic detail. Isolated person on genuinely transparent background, no scenery, no ground, no text, no props, no border, no card rendering. Portrait composition with small transparent margin above the head and shoulders. This is the person asset only; the card is built in code.

The built-in imagegen tool generated two opaque reference-photo fixtures from
the same portrait. They were saved as WebP assets for browser use:

- `apps/web/public/design/athlete-cards/park-photo.webp`
- `apps/web/public/design/athlete-cards/race-photo.webp`

Park prompt:

> Create an ordinary square profile photograph of the SAME fictional woman in the reference image, preserving her facial identity, age and dark ponytail. She wears the same simple navy running singlet with yellow trim. She is standing relaxed in a leafy city park after a run, facing the camera, slight smile, framed from chest up, entire head with comfortable space above. The background remains fully present: green leaves, warm brick wall and park path in natural soft focus. Natural overcast daylight, casual phone camera snapshot, realistic and unretouched. Subject roughly centered with enough surrounding scenery to test different rectangular crops. No text, no logos, no border, no card, no transparency, no subject cutout, no studio backdrop. This is a normal photograph asset for testing sports-card layouts that only crop an uploaded image.

Race prompt:

> Use case photorealistic-natural. A normal LANDSCAPE 3:2 phone photograph, showing the SAME fictional woman in the reference image with matching facial identity and dark ponytail, plain navy running singlet with yellow trim. She stands slightly RIGHT of center, framed from waist upward after a road race, smiling naturally at the camera. Keep plenty of space above her head. Busy realistic fully opaque race-day background: several distant runners, trees, a street, a blue barrier, colorful flags. Bright natural outdoor daylight, candid smartphone photo rather than a studio portrait. Background should be fully present and recognizable, not a transparent cutout or flat backdrop. No added text, no readable signs, no logos, no card frame. Intended for testing cropped profile photos with a busy background and off-center subject.
