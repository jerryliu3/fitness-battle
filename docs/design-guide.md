# Product design guide — Open Field

The selected production direction is **Open Field** (with Everyday Club's warm neutral palette and Focus IA, user decision October 17, 2026).

## Brand and character exploration

The [Brand & Ember study](brand-study/brand-and-ember-studio.md) is available at `/design/brand` under the existing design access gate. It preserves ten brand territories, adds the current Ember in a Chain Reaction-inspired setting, and explores Everyday Club, Open Field and Pocket Arena as calmer foundations for customizable star finishes. The October 17 review selects Open Field’s structure with Everyday Club’s warm white, charcoal and gold. Ember’s preferred art references are The Pass / Challenger, Marginal Gains and Higher Ground, with shared anatomy and adjustable finishes. The study locker uses local fictional ownership and proposed unlock examples; it does not establish production rewards, entitlement, scoring or storage rules.

## Shared visual language

The palette lives in `packages/shared/src/shell.ts`, is exported to native `src/theme.ts`, and is mirrored in web Focus CSS and native HeroUI variables. Legacy token keys remain compatible with existing components:

| Token | Value | Role |
| --- | --- | --- |
| ink / plum | `#282f2c` | Charcoal typography and primary actions |
| tennis / gold | `#f1c75b` | Selected navigation, own lane, live indicator, and warm gold accents |
| paper | `#fafaf7` | Warm white page background |
| card | `#ffffff` | Controls, sheets, cards |
| muted | `#616c63` | Calmer secondary labels |
| line | `#e0e5dc` | Quiet borders and separators |
| starEmber | `#f1c75b` | Canonical warm gold Ember artwork |
| secondary | `#819486` | Historical comparisons / baseline |
| soft | `#eef0e9` | Subtle highlights, badges, and pill backgrounds |

Use DM Sans for product UI, restrained display sizes, readable supporting copy, 44px+ touch controls, and generous spacing. Cards have clean 16px corners with 3px bottom borders; primary buttons have a 3px tactile base. Secondary buttons use a flat one-pixel border, tertiary actions use quiet text controls, and mutually exclusive score/view choices share a segmented container rather than separate outlined action buttons. Respect reduced motion. Browser dialogs use Radix focus management; native detail panels support back/dismiss and keyboard avoidance.

## Information architecture

The visible tabs are **Home / Compete / Progress / Crew**. Stable route IDs are `/today`, `/arena`, `/you`, and `/field`. The header profile circle opens **Athlete** at `/athlete`, with the shared muted person icon on white when no custom photo exists, matching web and native profile settings. Existing mobile tracker and settings links through `/you` redirect to Athlete.

- Home: an hours-only weekly chart, with Sync and Manual actions in its header, followed by the winding recent counted-session path. The Today recommendation opens detail without unmounting the parent screen (a sheet on native). Each activity day has one circle; multiple sessions on a day remain individually accessible and removable. The recommendation remains separate from recorded activity. Empty paths stay quiet — no invented activity and no “connect/sync” empty copy on the path itself.
- Compete (`/arena`): one field per registered sport, one shared Open/GPS score control, registration panel (join / eligible crew — never “solo” wording), current vertical lanes, prior-self ghost, awards, and benchmark links. Each field has independent lanes/standings controls. Standings shows full totals and effort scores; lanes shows relative distances. The **1v1 · Coming soon** teaser has no redundant disabled action; no live 1v1 yet.
- Crew: Trail-style club identity, shared week progress, standings, members, invites and existing supported crew actions. The activity feed and manual session-sharing controls are removed. Signed-out/demo states preview what crews unlock. Empty/live states remain honest.
- Progress: lifetime distance, sessions, settled weeks and overtakes; effort history with Open/GPS lenses, weekly records, benchmarks and season history with sport/track filters.
- Athlete: profile card with portrait, name, city and email, Edit profile, then Data Sync, Preferences, Notifications, How scoring works and Account destinations. Native uses the navigation stack to preserve the parent screen and normal Back behavior.

## Lane viewport contract

2D and 3D use the same athlete values and viewport. Lane identity stays fixed when standings change; the user's lane is centered among peers. Default longitudinal range is ±3 km (±10 effort points for non-GPS) around the user, independently of the most distant competitor. Zoom and pan only change presentation. Center/Fit APIs remain available internally; their visible buttons and the redundant viewport caption were removed in #232. Out-of-range 2D markers show dotted arrow indicators and distances relative to the athlete rather than pretending those athletes sit at the edge distance. Past you is never ranked.

Web retains the real Three.js renderer. Native 2D is SVG; native 3D embeds the same web renderer and receives bounded, credential-free presentation messages. It requires the corresponding web deployment and a configured `EXPO_PUBLIC_API_URL`. An unavailable renderer falls back to native 2D. New native binaries must include the Expo-supported `react-native-webview` dependency.

Account data, periods, scoring, and backend eligibility rules are not replaced by prototype fixtures. Existing live-connection and synthetic-peer disclosures must remain accurate.

Athlete's Account settings destination contains Sign out, Report an issue and Delete account on web and native. These actions belong inside Account rather than on the Athlete overview or in Preferences. Native's legacy Settings hub remains a compatible deep-link destination. Field zoom and past-self controls are hidden in standings. The [current mobile parity audit](reviews/mobile-parity-main-232.md) records the alignment through #232 and remaining native checks; the [initial audit](reviews/mobile-parity-2026-10-20.md) preserves the earlier repair evidence.

## Production motion implementation

One live lane canvas should change bounds when expanding, retaining its selection, zoom and horizontal anchor. Expanded web lanes live in a root dialog with attached controls, Escape, scroll locking and focus return. Embedded touch lanes allow page scrolling; vertical field exploration requires fullscreen web lanes or native's explicit Explore mode. Programmatic viewport changes interpolate center and span together; direct manipulation interrupts immediately. Center me restores following.

Give each transform one animation owner. Fade sheet scrims independently, retain surfaces through exit, preserve parent scroll behind settings, and respect reduced motion. Haptics follow deliberate actions or confirmed outcomes, not decorative animation callbacks. The [production repair review](reviews/motion-regressions-2026-10-19.md) tracks remaining gaps against the 18-flow prototype, including native fullscreen expansion and medal detail.

## Selected material and interaction exploration

The [material and motion study](material-and-motion-concepts.md) records the October 16 user review: Glass Track, dimensional weekly results, PR history, cooperative crew goals, weekly training history, a conditional daily clock, and a return moment integrated into Compete. Its [standalone review](design-studies/material-motion/review.html) uses fictional data. These are candidates for later implementation; Focus remains the production direction. Personal Home targets are a separate optional feature proposal and do not define competition completion or alter scoring.

The [overtake motion study](design-studies/overtake-motion.md) records the user’s selected motion direction: Photo Finish on every pass combined with combo/+1 overtake feedback; The Chase logo arrival with Split Second’s afterimage; and Afterimage typography. Round 2 explores staggered over / taek rows and continuous glyph-to-jetstream trails. These remain presentation prototypes; production scoring, tracker behavior, and brand assets are unchanged.

The [Art of the Pass study](design-studies/the-pass/README.md) at `/design/pass` explores 15 app icons and 8 vertical lane treatments. It connects the moment of overtaking to a small, text-free symbol, alongside three typographic alternatives, with ten trail/wake directions, small-size comparisons and a browser-local shortlist. Everyday Club’s neutral product shell remains the backdrop. These are candidates for review, not a selected production icon or a change to the lane viewport contract.

The next review narrows the candidates to **Twin trails, Afterimage and Open Track**, with the user leaning toward Afterimage and Open Track. Round 2 adds eight Afterimage variants, four Open Track variants, matching icon/field geometry, and independently flowing backward wakes on all three shortlisted fields. Dense slower-racer echoes, no-rival-wake, gold, canonical Ember, lane-marker and light/charcoal treatments remain presentation alternatives. Continuous flow is illustrative rather than a live speed measurement; reduced motion and a manual trail pause are preserved.

The user selects **Afterimage as the identity direction** in Round 3 and drops lane lines from the logo. The remaining form decision is hollow versus solid circles, with filled Ember (always showing its canonical face) and an outlined Ember as the only character alternatives. The study compares eight yellow/gold pairings across white, grey and black, plus equal wakes and a subtly slower rival wake. These controls update the icon and sample field together. This locks the design territory; final head treatment, colors and production asset integration remain open.

The October 18 decision settles **hollow circles on white, no lane rules in the logo, and the subtly slower rival wake**. Gold/silver is the working palette, with rich gold/silver retained as the immediate alternative; the exact gold shade remains under consideration. The review defaults to this selection, preserves the earlier gold/violet favourite and all exploration history, and records the decision in the study README. Production icon packaging and integration are not part of this documentation PR.

The finalized production icon is **rich gold (#dfad3c) / silver (#9fa5af)** on white with hollow circles and the subtly slower rival. The production mark is now **Shared Start**: six gold echoes extending to the endpoint of the silver racer’s four-echo wake. Both circles stay hollow. The canonical master and platform packaging are documented in `assets/brand/README.md`; the other wake treatments remain exploration history.

The followup [material objects study](design-studies/the-pass/MATERIALS.md) explores eight finishes and five silhouettes on the bold 135% geometry, paired with matching animated fields. It is a presentation study stacked on the background/scale comparisons; Shared Start remains the production icon and no material has been selected for rollout.

The [Round 6 glass exploration](design-studies/the-pass/GLASS.md) narrows the new forms to capsules and open loops and follows the supplied Photos reference through uniform tinted faces, polished edges and alpha overlap. Eight variations retain Amber Capsule, Glazed Ceramic and Frosted Pebble as comparison options. This remains a study; production Shared Start assets are unchanged.

The focused followup at `/design/pass?view=finishes` compares standard capsule and fine loop across uniform glass, original Amber tinted glass, satin glass and fired glaze. Uniform glass defaults to matched 50% alpha for gold/silver, with 38% and 64% presets on a fixed palette. Earlier favorites and study rounds remain available; this does not change production icon selection.

The identity exploration now selects the standard 40×58 capsule as its form. The active color lab retains all four finishes, offers 26/38/50% uniform glass, excludes wakes from live heads, and provides 10 independent gold and silver/platinum choices each. Material and color selection remain open; production app-icon packaging follows that final selection.

The Pass capsule study (`?view=finishes`, October 19) adds three Photos-inspired perimeter-lighting options alongside its four existing finishes. All use the satin wake and curved head exclusion in icon and lane previews. Materials and palette remain exploratory; see `docs/design-studies/the-pass/GLASS.md`.

The active finalist comparison is now Satin glass, Fired glaze, Rolled glass and Polished glass. Rolled/Polished face opacity spans 26%, 38%, 50%, 60%, 70%, 80% and 90%; their shared satin wake is independent of face opacity.

Selected production identity: **Polished glass at 80% alpha**, Solar Gold `#ffc400` and Cool Platinum `#c9d6e3`, with four fading echoes. Capsule heads are scaled to **162.5%**, with their centers held at the selected positions from the scale study. The same icon identity now appears in web metadata, install icons and native app icons, and the same capsule renderer replaces the former circle markers in the web and native 2D lanes. The wake flows backwards, is clipped at the capsule's curved outline, and pauses for reduced motion or inactive screens. See `assets/brand/README.md` for generated asset locations and regeneration instructions.

In-range capsule heads stay visible at viewport edges and during the persistent Lanes / Standings transition. Out-of-range athletes use arrow-only dotted indicators. Selecting an athlete centers the viewport on their value; there is no athlete popup below the field. Only first-place racers use gold, with all other racers platinum. Compete distance labels show the gap relative to the signed-in athlete. Clip only lane wakes in racer-local coordinates; standings shows compact capsule heads without wakes extending into adjacent rows.

Home offers Sync activities and Add activity. Manual entry records today only, with sport, mileage for GPS sports and duration, and counts in Open only. Onboarding selects at least one sport and immediately registers all selected sports on both platforms. Primary sport remains a preference; changing it must not opt an athlete in or out. Existing legacy period helpers still reference primary, so removing that field requires a separate domain migration.

Closed rounds automatically open a full-screen, two-stage Compete takeover only after account data loads: animated sport results, then next-round timing and a direct link to Athlete sport preferences. Dismissal acknowledges both tracks for that round using account-persisted result acknowledgements. Returning activity remains integrated into the field with automatic progress animation and no Replay control.

Native parity: Lanes selection centers the chosen racer and no longer opens an athlete detail card. Out-of-range markers are dotted arrows; only first place is gold and gaps are relative to the athlete. The automatic two-stage round takeover is a full-screen native modal. Home adds today-only manual entry and tracker sync, shares the single-circle-per-day rule, and retains a separate suggestion action. Native Explore keeps its explicit pan mode; its Back control exits exploration and the disabled 3D teaser is only visible there.

Athlete’s main effort score uses the same gold badge treatment as Home accents on web and native, with charcoal numerals for legibility. Competition and training-history boundaries use America/New_York (Eastern, EST/EDT); earlier UTC wording in exploration history is superseded.

## Compete grounds and earned distance

The October 21 selection promotes **Liquid Glass / faint underlay / Banked trail** into the web and native 2D field, with **Map lens** zoom: world details, lane spacing and capsules scale together. Meadow Trail and Club grounds are the defaults. Each event offers Personal track, Road ribbons, Parkland Passage, Pool Deck, Boardwalk, Meadow Trail, Club Straightaway, Club Oval and Night Meet. Open edges and Club grounds apply to every surface. Choices are local to the account/event on that device; they do not change units, scores, rankings or tracker data.

The narrow earned trace follows each racer directly beneath its canonical afterimages. Only live heads are excluded. One fixed side scale replaces repeated lane labels; red straightaway splits use whole displayed units, with lane numbers behind the start. Scenery stays anchored to accumulated distance. Grounds are illustrative rather than GPS locations. The oval normalizes a loop to 1 km, 1 mile or 20 effort points, with completed laps and accumulated totals explicit.

A clickable/tappable overview sits beneath the field. Its window shows the visible accumulated-distance interval; click, drag or use accessibility adjustments to navigate without changing the zoom on unfolded grounds. On the oval, navigation focuses the corresponding circuit position at a closer scale. The shared course scene is platform-agnostic and painted by DOM SVG / native SVG adapters; production never imports study fixtures. PR #234’s event composition, score controls, standings and native navigation remain in place. See the [implementation and review record](reviews/compete-configurable-grounds.md).
## Earlier board exploration (history)

These entries preserve the earlier study decisions. The production selection above supersedes their unselected material defaults and study-only rollout boundaries.

The October 20 board exploration narrows the next prototypes to **Session Tapestry** and **Distance Ribbon** for 2D, and **Horizon Pursuit** for 3D. Both 2D treatments compare horizontal and vertical orientations with distance or actual effort-point units. Outdoor scenery belongs to the GPS-distance exploration, not the non-GPS effort field. `/design/boards` contains the coded study with fictional athletes, counted-session segments, fixed world marks, persistent expansion and a scenic Three.js course. These are review candidates; they do not replace production Compete or select a final orientation. See [the integration notes](../apps/web/src/app/design/_studies/board-lab/README.md).

The next October 20 review **locks vertical for the next prototype round and focuses it on kilometers**. `/design/boards` now separates eight background environments from five progress treatments and compares Map/Atlas lenses against the prior distance-only zoom. No 2D distance grid subdivides below 1 km, and most backgrounds have no cross-track rules. Earned progress leaves the capsule and complete afterimage corridor clear; it must not fill the whole lane or end in a straight cap through the racer. The bottom field overview is retained. Road markings, parkland and pool surfaces are design studies for distance, not new sport/score semantics. The first-round unit/orientation comparisons remain documented history; production Compete and the 3D/native boundary are unchanged.

The following October 20 review accepts a **multi-field direction**, retaining Personal track, Road ribbons, Parkland Passage, Pool Deck, Boardwalk, Meadow Trail and Night Meet, and retiring Contour Atlas. **Meadow Trail + Banked trail + Map lens** is the current default. Distance-only zoom remains an alternative. The follow-up adds red Club Straightaway and Club Oval, each with Open edges or green Club grounds. The oval normalizes each circuit to 1 km or 1 mile and explicitly separates repeating position from completed laps and true accumulated totals; it is not a regulation 400m course or GPS route. Custom fields are an intended future extension, not a shipped editor. These accepted design directions remain inside the protected study until a separate production/native integration. See the [Round 3 review](design-studies/boards/round-3/README.md).

The final board adjustment puts lane numbers behind the athletics start line and removes repeated numeric distance markers from field surfaces, retaining the shared side scale and athlete totals. Banked trail stays as a comparison; **Dotted route, Waypoint cord, Session tiles and Revealed ground** replace the other four trace options. Each new option reaches the actual athlete coordinate beside the wake rather than ending at an arbitrary clearance distance. The [Round 4 reference review](design-studies/boards/round-4/README.md) documents consumer app/game research and the proposed adaptations. These remain presentation choices rather than changes to distance, scoring or GPS location semantics.

The next review explicitly requires progress **directly behind the racer**, and retains only Banked trail, Dotted route and Session tiles. Waypoint cord and Revealed ground are retired. Faint underlay and Soft blend compare quiet centered paint beneath the canonical afterimages; only the live capsule head remains excluded. This supersedes the study’s earlier whole-wake-clearance rule and lateral detours. Banked trail now tapers into the wake without an artificial longitudinal cutoff; all three still encode true accumulated distance. See [Round 5](design-studies/boards/round-5/README.md).

The material follow-up explores **Route Enamel, Pop Rubber, Signal Neon, Porcelain Inlay and Liquid Glass** independently across all three centered trails. Soft blend keeps stronger solid color farther back and fades the entire finish beneath the afterimages; Faint underlay remains available. Route Enamel is the study default, with no final material selection yet. Trail palettes are presentation experiments and do not change the canonical polished capsule, production rank colors or theme tokens. See the [Round 6 references and comparisons](design-studies/boards/round-6/README.md).

Progress adds a twelve-week Eastern training chart with direct week inspection; current weeks are partial. Personal records appear only for supported distances with qualifying data (running 5K/10K/half/marathon, cycling 50K/100K/150K/180K). The staircase carries the standing record between dated improvements, including a horizontal standing line when only one record exists. Time-axis labels and dated selectable points make the progression explicit; faster times step downward as in the reviewed prototype. Distance tabs remain compact. Receipts retain provenance and whole-session moving time; only sessions covering the distance within 2% qualify. Longer workouts are never scaled into fictional best splits. No weekly medal or body clock is added.

Completed lane distance uses a broad transparent-to-translucent progress wash along the actual course, capped at 23% alpha. It sits below the existing racer wake and head-clear mask, carries no outline, ignores pointer events, and follows the same portable SVG scene on web and native. No extra motion or glass track redesign is introduced.

Crew's shared-week number is accompanied by a dimensional, angled, woven SVG relay tape with each active member's contribution and inspectable share. The finish gate remains at the actual target even over goal. Zero-contribution members remain inspectable. Personal-target and strength crews use session counts; distance crews use counted distance. The relay reads existing authorized crew aggregates and never introduces a separate scoring or sharing write.

Week close leads with a dimensional gold result card: actual place, field size, volume and effort score, with a tap-through receipt for the settled period/track. A short second step describes the actual enrollment and renewal state. No medal is implied, no new recap screens are required, and reduced motion keeps the result static. Web uses a subtle pointer tilt; native uses a tactile press tilt.

The lane progress wash is darkest near the start line and fades to transparent at the athlete, preserving the afterimage at the moving edge.

### October 21 interaction repairs

Compete opens directly to lanes. Activity progress stays in the lane presentation; it never redirects another tab or asks for a “Got it” acknowledgement. Week-close results open deliberately through “Latest week results”; closing removes the replay query and ordinary revisits do not reopen an overlay.

Sheets initially focus their heading, keeping keyboards and select menus closed until requested. Start Line uses an empty, clearly named session field, duration chips, and inline validation for name, valid Eastern date/time, future start, and 15–240 minutes. Demo scheduling is explicitly local to the account and crew; RSVP never logs training.

Crew rest status follows the current Eastern week and offers a clear action in the same sheet. Home exposes sync progress and outcomes; session removal has an immediate Undo that restores the original disposition. Progress shows the real field size, invite copy/share confirms success, and renewal state is stated beside its reversible control. The legacy /compete route redirects to /arena. Race tables indicate horizontal overflow on small screens.
