# Overtaek motion playground

Review at `/design/motion`. Round 2 contains one combined overtake direction, three staggered logo races, and three staggered afterimage treatments. The original twelve concepts remain under **Original 12**. This is an isolated web study under `apps/web/src/app/design/_studies/overtake-motion/`, using the Focus ink/tennis palette. It does not change the production loader, competition model, scoring, or tracker connections.

## Round 2 — user feedback

The user selected Photo Finish + Combo for the overtake moment, The Chase + Split Second’s afterimage for the logo, and Double Exposure for type. The refined identity studies keep “over” on the upper row and “taek” on a lower, rightward-staggered row with a **three-letter horizontal overlap** (`v-e-r` over `t-a-e`, leaving `o` leading on the upper left and `k` pulling ahead on the lower right) and four vertical height overlap prototypes (**35%, 40%, 45%, and 50%**).

- **Photo combo:** slow motion and camera focus around every actual pass, +1 overtake, a pass ripple on the crossed rival, and a cumulative combo. Only the afterburn speed trail follows behind your character (no trailing circles). The timeline builds a slower window around each crossed athlete, rather than applying a hard-coded slowdown only to the first crossing. Zero-pass runs retain simple forward progress.
- **Staggered chase · 40% / 35% / 45% / 50%:** four vertical overlap prototypes built on the same Staggered Chase choreography and three-letter horizontal offset. “over” enters the stage first by itself, then “taek” charges in from behind through a continuous three-stage lead swap with no mid-race pauses and no backward consolidation at the end:
  1. “taek” charges in from behind and edges past “over” by a tiny bit.
  2. “over” surges back on the upper row and retakes the lead by a little bit.
  3. “taek” accelerates and pulls away forward directly into the final three-letter overlap.
  Both words share consistent outline-free glyph styling, lean in dynamically with their velocity while trailing Double Exposure’s stepped tennis-green afterimages, and resolve into the exact Double Exposure final frame. A **Staggered / Single line** finish toggle allows either a lasting overlap or resolution into `overtaek`.
- **Double exposure:** stored in Type in Motion and folded directly into the logo race as the signature finish, with three distinct afterimage copies behind both staggered rows.
- **Liquid exposure:** a single stretched glyph silhouette per row, horizontally blurred and progressively faded.
- **Jetstream:** the continuous glyph-shaped wake transitions into a tapered abstract airflow shape.

The original round is documented below. All new brand treatments retain final-frame SVG export, reduced motion, scrubbing, light/dark comparison, and shortlisting.

The self-contained [offline review](overtake-motion/review.html) bundles the same React components and embedded fonts; open the file directly in a browser. Rebuild it after installing dependencies and running the web app/build:

```sh
node apps/web/src/app/design/_studies/overtake-motion/build-review.mjs
```

The builder reuses the bundler already installed with Vitest/Vite and adds no dependency. The app route retains the existing design access gate. The offline review contains only the fictional study and needs no account.

## 1. The return-from-run overtake

- **Afterburn:** charge, rapid dash, speed trails, and a brief shake/ripple on the passed circle.
- **Slipstream:** fluid acceleration and a wake that ripples through a passed lane.
- **Photo finish:** camera push-in and slower motion around the first crossing, followed by a clean field view.
- **Combo breaker:** collectible pass rings, per-pass feedback, and a running combo.

Switch between no pass (+0.8 mi), one pass (+2 mi), and two passes (+4.2 mi). The user starts at 12.4 mi, behind Mara (13.8), Jules (15.6), and Noor (19.2). Athlete lanes remain fixed; position changes only after crossing a rival’s distance. No-pass runs receive progress feedback without a pass celebration. The circle and existing Ember character can be compared.

The **Try the return moment** button presents the selected animation in a dismissible, focus-managed return panel. It simulates a run arriving; it makes no OAuth or sync request.

**Proposed fun metric:** overtakes this week. The fixture starts at seven and adds one for each pass in this sample run. It is an exploratory presentation metric, not an implemented counter or ranking input. Replays do not accumulate passes. Before a production implementation, define activity deduplication, historical corrections, ties, and repeat-pass rules.

## 2. The over / taek logo race

- **The chase:** direct horizontal acceleration and braking.
- **Lane switch:** parallel racing lanes converge into a single baseline.
- **Slingshot:** elastic pullback, an arc around the lead word, and a sharp landing.
- **Split second:** timing line, lead change, and a short exposure echo.

“over” leads first. “taek” comes from behind, passes it to the right, then holds in a readable **overtaek** lockup. Particle motion supplies speed without requiring the whole logo to leave the stage.

## 3. The wordmark’s movement language

- **Forward only:** forward slant and a rising underline.
- **Velocity cuts:** tapered speed lines and a sharp baseline.
- **Afterimage:** offset word echoes.
- **Aero ribbon:** curved passing line and an arrow around the word.

All identity concepts end on a usable static frame. The final-frame export is an SVG containing the background and live vector text, with the available Nunito Sans and DM Sans fonts embedded. If font access is unavailable, the export retains the specified system font fallback and reports that in the interface. It is a concept export rather than outlined production artwork.

## Review controls

Focus view, synchronized four-up comparison, pause/replay, timeline scrubbing and beat shortcuts, 0.25×/0.5×/1×/1.5× playback, light/dark canvases, and a browser-local shortlist. Selected family/concept is reflected in the URL. Playback runs once and pauses when the document is hidden. Reduced-motion preference shows completed frames and suppresses animated playback and camera effects.

This study proposes no change to the living design tokens or production domain rules.
