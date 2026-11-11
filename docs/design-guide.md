# Product design guide — Everyday Club

The [appearance foundation](appearance-system.md) adds shared light/dark roles and System preference infrastructure. Production web and native components adopt this contract and expose System/Light/Dark in Athlete Preferences; the chosen roles are yellow actions/charts/progress, Slate secondary accents, and independent neutral text. The canonical palette lives in `packages/shared/src/appearance.ts`; legacy shell names derive from it.

## Composition and copy principles — November 6, 2026

These principles apply to new screens and refinements on web and native. They
supplement the selected Everyday Club tokens and chart contracts. When historical
examples imply mandatory subtitles, nested introductions or explanatory cards,
these composition rules take precedence. Reference observations and the current
implementation comparison are in [the wellness app review](reviews/wellness-design-principles-2026-11-06.md).

### Give each screen a purpose and a focal point

Describe the user's immediate task before composing the screen. Choose a primary
reading, decision or action; subordinate the rest. Multiple sections may exist,
but they must not all demand equal attention. Use the existing semantic type roles
and spacing to establish meaningful differences in emphasis. Do not invent a new
font size for each feature or reduce readable text to squeeze in more content.

### Text must earn its space

Default to a concise title and the content. Subtitles, kickers, helper paragraphs,
badges and nested headings are optional, never a component-completeness checklist.
Every visible line must identify something, add necessary context, explain a
consequence or enable an action. Delete lines that repeat nearby text or describe
an obvious control. Do not add copy merely to make a screen feel designed.

- Avoid the stack: eyebrow → page title → subtitle → section title → card title →
  explanatory sentence before the user reaches the value or action.
- A chart may need a metric name, date and unit; it does not also need a slogan,
  a section introduction and a paragraph saying it shows progress.
- Prefer a direct action such as “Explore events” to an inspirational heading
  followed by an instruction that repeats the action.
- Omit “Tap to view” on recognizable interactive rows. Use a familiar affordance;
  provide an accessibility hint when it adds useful information.
- Do not label every visual boundary. Use proximity, alignment and spacing to
  communicate grouping. A named metric can introduce its own chart.
- Keep units, dates, comparison periods, data provenance, unavailable/error states,
  consequences and accurate sample disclosures where needed for understanding.
  Move optional methodology into contextual details; do not hide essential context.
- Keep accessible names and semantic structure even when visible copy is reduced.
  Do not replace text bloat with unexplained icon-only controls.

Before adding text, ask: what would the user misunderstand or be unable to do
without this line? If there is no specific answer, omit it. Fix unclear layout or
interaction before compensating with permanent instructions. Shortening copy
must not simply leave oversized empty wrappers and inherited introduction gaps.

### Make data interpretable with the minimum useful context

Lead with the selected reading and its time context. Provide real units,
comparison/reference meaning and inspectable values through the selected chart
system. Use one stable reading location rather than repeating the same value in
a KPI tile, chart heading, badge and inspection card. A range, baseline and target
must be distinguishable. Do not invent health judgments or progress goals from
recorded measurements. Quiet axes still need readable contrast.

### Use consistent rules with task-specific compositions

Reuse tokens, control behavior, chart inspection and spacing relationships.
A map, recommendation, form and recap need different compositions. Do not force
every task into the same title/subtitle/card template. Keep related information
close and separate different tasks with larger boundaries. Avoid nested cards
that add no meaningful grouping.

### Concentrate expression and show meaningful progress

Give illustration, maps, motion or a prominent number a clear role. Keep nearby
chrome quiet so expressive elements do not compete. Ember should support an
actual recommendation, event or outcome rather than decorate every section.
Show current position, next action and confirmed outcomes when relevant. Explain
what changed once; do not narrate the same progress across multiple banners.
Tone should fit the moment: direct during competition, supportive for recovery,
and precise during data inspection. Do not infer engagement or usability from
visual polish alone.

### Review the whole phone screen

Review first viewport and scrolled states at supported widths and large text.
Identify what draws attention first and how far the user travels before reaching
the main content. Check populated, empty and error states. Audit repeated dates,
values, instructions and heading levels. Remove unnecessary content before adding
another container, badge or explanation. Preserve honest missing-data states
without giving unavailable metrics the visual weight of a primary result.

The [product-derived native refinement](reviews/product-refinement/README.md) narrows the October 25 tab review to nine implementation candidates built from the current app. It preserves the selected production tokens and domain rules; layouts remain under review.

The selected production direction is **Everyday Club**, following the owner’s October 22 reference and implementation request. Retain yellow and Ember, Home / Compete / Progress / Crew, existing data behavior, geographic 3D default competition, no recording action and no social feed. See [audit](design/ui-audit.md) and [component decisions](design/component-guidelines.md).

The October 23 [mobile consumer audit](reviews/mobile-consumer-ui-audit-2026-10-23.md) refines native composition and interaction: open sections for continuous full-row content, consistent sport icons, inspectable charts, moving segment highlights and fullscreen field exploration. It preserves Everyday Club's palette and identity. Native fullscreen uses a root Modal with parent-owned viewport/selection and restored horizontal anchors; moving the scene host into the Modal remounts it, rather than providing a shared-element expansion.

The owner verified the first pass and selects the [follow-up refinements](reviews/mobile-refinement-2026-10-23.md): profile and effort grouped left with the flame beside them, Debug right, stronger full-pixel section separators, and Tabler library icons instead of emoji. Hierarchy changes stay light; field balance is refined after the shell changes. Mapbox and finer score history are outside this pass.

The October 26 [field navigation repair](reviews/field-navigation-2026-10-26/README.md)
gives fullscreen 2D and perspective fields ownership of two-axis dragging and
pinch zoom. Athlete selection eases from the displayed camera position; direct
touch interrupts it and repeat selection recenters the same athlete. Respect
Reduced Motion. Keep inline page scrolling available and paint nearby lanes with
overscan. Native touch surfaces own input above drawing-only SVG. Mobile wakes
are removed; completed routes use a fixed, opaque six-point line that remains
visible when the start or athlete is offscreen. Decorative hints pass touches
through. Renderer or
joystick replacements remain under discussion pending release-device profiling.

Use semantic shared tokens: navy `#142b3b`, yellow `#f7c948`, canvas `#f8f9f6`, white cards, muted `#637482`, border `#e3e9e7`, teal `#176c75`. Cards use quiet 20px corners. Yellow primary controls use dark labels. Historical decisions below describe earlier iterations; this selection supersedes their presentation rules.

### Home and Compete refinements — November 9

Home shows its dismissible update cards without a section heading or card-count indicators, with
an explicit Reset action when caught up. Historical chart comparisons use Slate.
Registered event previews open the immersive field; registration lists exclude
registered events. Strength and Recovery share the fullscreen time-series chart
and competition bottom sheet. Points previews show the current position and past day with readable axes,
all current field markers inside the plot, and a Slate surface distinct from the sheet.
Recorded effort appears at its activity timestamp. Aggregate-only real rivals
show current positions; omit historical scrubbing and overtake claims until
authorized history is available. Native charts honor the athlete block list. The minimized sheet clips standings below its
timeline; selected time and the latest available endpoint remain visible.
Competition sheets open minimized. Registration steps exit left; avatars enter
after the panel opens, and the event home remains frozen until it closes. Queued
athletes use numbered names without subtitles.
Debug deregistration uses the isolated preview state and can be reset.

### Compete event home and immersive fields — November 7

Compete is the home base for registered events, using the same app header and
bottom navigation as the other tabs. Each event shows a read-only preview from
its existing field data, position, volume, nearest available rival, and time
remaining. Queued events show their upcoming state without ranks or identities.
Registration, Recovery and result destinations remain on the home base.

Tap a sport event to enter its immersive field. App navigation disappears; Back
returns to the event home. Retain the selected field host and camera while closed,
and prepare the initial selected field during startup. Map options, athlete
selection and the current-positions overlay remain available inside the field.
Standings live in a bottom sheet that starts partially open and reaches the actual
bottom edge, including beneath the home indicator. Drag or tap its handle to
change height; retain accessible adjustment and web arrow-key support. Do not add
visible Minimize/Lower buttons. Moving the sheet never resizes the map. Respect
Reduced Motion and pause hidden presentation clocks.

This supersedes the November 6 map-as-tab composition and its separate overlaid
navigation. Distance fields remain geographic 3D; points remain 2D. See the
[implementation review](reviews/compete-event-home/README.md).

## Brand and character exploration

### Athlete Crest — November 8

Athlete begins with the selected Contender · Crest: a solid shield, circular
profile-photo crop and Goalmaxxing's alloy finish in the Overtaek gold tone.
The compact 320×368 outline shortens the vertical sides and extends the lower
diagonals. City/rank are omitted; inset stats keep clear of the taper. Effort
Score and sport names share a type recipe, with Primary sport beneath the sport.
Pointer tilt, drag rotation, keyboard controls, flip/reset and Reduced Motion
share one renderer on web and native. Edit profile follows the card. Use existing
Open Effort Score, primary-sport PBs, authoritative overtakes, completed rounds
and the counted weekly streak. No percentile is inferred from ratings. Missing
photos use initials; no cutout processing is required. See the
[implementation review](reviews/athlete-crest/README.md).

The [Brand & Ember study](brand-study/brand-and-ember-studio.md) is available at `/design/brand` under the existing design access gate. It preserves ten brand territories, adds the current Ember in a Chain Reaction-inspired setting, and explores Everyday Club, Open Field and Pocket Arena as calmer foundations for customizable star finishes. The October 17 review selects Open Field’s structure with Everyday Club’s warm white, charcoal and gold. Ember’s preferred art references are The Pass / Challenger, Marginal Gains and Higher Ground, with shared anatomy and adjustable finishes. The study locker uses local fictional ownership and proposed unlock examples; it does not establish production rewards, entitlement, scoring or storage rules.

## Shared visual language

### Afterglow week recap — November 9

The full-screen settled-week recap uses Afterglow's static gold-to-sage-to-ink
background, with a dark wash for readable light text. Shared presentation colors
live in `WEEK_RECAP_COLORS` in `packages/shared/src/shell.ts`. Result receipts,
replay controls and charts retain their selected light or dark appearance. A thin,
non-interactive segmented bar indicates the actual page. Both platforms use one
opening page followed by a result/training pair for each sport, in product sport
order. For example: opening, Running result, Running training, Cycling result,
Cycling training. Back never acknowledges results; only Done or the final
sport-settings action acknowledges the original complete result set.
The progress bar replaces the redundant “Round complete” text row. Primary CTAs
keep the shared yellow fill and dark labels, including in the web portal.
The rest of the application retains its selected Everyday Club presentation.

Recap pages fit the available viewport at natural size, scaling the central
reading only when needed. Headings, progress and navigation remain outside the
scaled reading. Short web landscape windows use two columns. Explicit larger
text settings retain readable scrolling rather than being scaled back down.
Replay controls and field choices open their existing focused details instead
of extending the main page. Web and native share Eastern date buckets through
`weekRecapTraining`; archived training must retain DST-safe half-open bounds.
See the [implementation review](reviews/afterglow-week-recap/review.md).

### Selected chart system — October 29

Home's hours chart and Progress's Effort Score use **Open line**: an unfilled
teal trace with quiet numeric Y references and dated X ticks, one date/range and large value above,
and compact 1W / 4W controls below (Effort Score also offers 1Y). Hover previews;
tap pins and horizontal dragging inspects. The reading contains no session list,
repeated date or explanatory paragraph. A dotted previous-week line remains on
Home; 4W compares the prior four weeks. Four weeks is exactly 28 Eastern dates,
not a relabeled calendar month. Score history and eligibility rules stay intact.

Training volume uses **Benchmark bars** on web and native: square-ended columns,
a dotted average reference, a stable selected date/value reading, and quiet
gridlines. Keep its existing calendar Week / Month / Year ranges, sport filters
and period navigation. Include recorded zero buckets in the average and exclude
future buckets from both inspection and the average. Training mix is deferred.
See the [source review](reviews/chart-system/reference-study.md).

Competition maps share the geographic renderer within each platform across live
fields, fullscreen exploration, competition replay, and week recaps. Camera,
geometry, compact-roster policy and playback speeds are shared pure logic.
Every replay uses the same viewer, including archived weeks and embedded recaps;
points fields normalize to 2D. Fixed holds the view through timeline rewinds;
gestures suspend following without corrective native camera writes. Fullscreen
card dismissal resets at the explicit session boundary even when web retains its
map instance. Replay's compact athlete rows can restore dismissed cards. Web
competition and recorded-route maps share compact upper-left attribution.
See the [stack review](reviews/map-ui-stack-review.md).

The timeline feature branch retains workout scrubbing for legacy inline and
fullscreen fields. The November 7 event-home immersive field retains its
existing course-position sheet and replay viewer while time/course dock
placements are evaluated. Do not overlay the legacy timeline card on that sheet.
See the [timeline rebase review](reviews/field-timeline/rebase-2026-11-07.md).

Sync receipts use one “Sync completed” heading and keep the sample-preview
notice when applicable. Activity metadata uses two columns of labeled values,
each above a thin grey track with a teal magnitude fill. Compare each metric
with its maximum across the previous 10 counted activities in the same sport,
within 90 days before that session; cap fill at 100%. Missing comparison history
leaves the track empty, and missing measurements omit the metric. These bars
describe recorded values, not fitness or competition credit. GPS/Open badges
are omitted from this receipt.

The palette is defined in `packages/shared/src/shell.ts`, consumed by native `src/theme.ts` and mirrored in web `features/focus/club.css` and HeroUI variables. Legacy plum/tennis keys remain compatibility aliases.

| Semantic role | Value | Usage |
| --- | --- | --- |
| Text primary / ink | `#142b3b` | Navy typography and selected segments |
| Action primary / tennis | `#f7c948` | Yellow primary buttons and personal progress |
| Canvas / paper | `#f8f9f6` | Neutral page canvas |
| Card | `#ffffff` | Grouped surfaces and sheets |
| Text secondary | `#637482` | Supporting copy |
| Border subtle | `#e3e9e7` | Quiet borders and dividers |
| Action soft | `#fff5d1` | Selected navigation and milestone backgrounds |
| Field teal / deep | `#176c75` / `#103e46` | Charts and alpine competition scenery |

Manrope, bold readable page titles, 20px cards, 12px controls, 24px sheets, 44px minimum controls, teal keyboard focus and reduced-motion support. Primary actions use yellow with dark labels; navigation rows use quiet text and a directional affordance. Radix manages web dialogs; native sheets preserve the parent and system Back. Full component decisions are in [component guidelines](design/component-guidelines.md).

Home leads with a personal greeting, weekly chart and real next-rival preview, then latest activity, effort progress and a weekly recap. The activity journey expands on demand. Progress leads with week/month/year training, then basic session/effort achievements and records; effort score and season history have separate views. Achievements are read-only milestones derived from currently available counted activity and the primary sport's Open rating, without reward entitlements or new scoring writes.

Compete presents one registration at a time in a horizontal carousel with previous/next buttons, page indicators and an explicit event chooser. Geographic 3D is the default for distance fields; points fields use 2D. Standings and optional alpine 3D use the same totals and viewport; native 3D remains the credential-free web renderer. Scenery is illustrative. Crew retains shared progress, standings, members, invitations and existing sessions; no feed or recording flow is added.

### Native overtake and standings refinement — October 31

Geographic **3D** is the default for distance fields, automatic overtake moments,
and GPS competition replays, including fields that begin queued. Points remain
2D. The internal `4d` renderer identifier is retained to distinguish the geographic
course from the legacy perspective renderer; all product labels say 3D.
Overtake playback waits for the map to load, frames the user and nearest rival,
and zooms toward the pair during each slow-motion crossing. A fading circular
pulse marks the passed athlete, with a screen +1 and a floating overtake count
only after the first pass. Reduced Motion shows final totals without these effects.
The replay's narrative text card and the late-upload reminder are removed.

Standings distance labels show two decimals. Bars use exact linear proportions
on equal-width tracks, including an empty bar for zero. Exact ties share a place
and bar length; display rounding does not change ranks. Places 1–3 use gold
`#dfad3c`, silver `#9fa5af`, bronze `#b87945`; other bars retain muted dark grey `#637482`, independently
of the user's row and whether the field has closed.

## Information architecture

The visible tabs are **Home / Compete / Progress / Crew**. Stable route IDs are `/today`, `/arena`, `/you`, and `/field`. The header profile circle opens **Athlete** at `/athlete`, with the shared muted person icon on white when no custom photo exists, matching web and native profile settings. Existing mobile tracker and settings links through `/you` redirect to Athlete.

- Home: an hours-only weekly chart, with Sync and Manual actions in its header, followed by the winding recent counted-session path. The Today recommendation opens detail without unmounting the parent screen (a sheet on native). Each activity day has one circle; multiple sessions on a day remain individually accessible and removable. The recommendation remains separate from recorded activity. Empty paths stay quiet — no invented activity and no “connect/sync” empty copy on the path itself.
- Compete (`/arena`): one field per registered sport, one shared Open/GPS score control, registration panel (join / eligible crew — never “solo” wording), current vertical lanes, prior-self ghost, awards, and benchmark links. Each field has independent lanes/standings controls. Standings shows full totals and effort scores; lanes shows relative distances.
- Crew: Trail-style club identity, shared week progress, standings, members, invites and existing supported crew actions. The activity feed and manual session-sharing controls are removed. Signed-out/demo states preview what crews unlock. Empty/live states remain honest.
- Progress: lifetime distance, sessions, settled weeks and overtakes; effort history with Open/GPS lenses, an hours-based training atlas with week/month/year charts, benchmarks and monthly chapters of past weeks with sport/track filters.
- Athlete: profile card with portrait, name, city and email, Edit profile, then Data Sync, Preferences, Notifications, How scoring works and Account destinations. Native uses the navigation stack to preserve the parent screen and normal Back behavior.

## Lane viewport contract

The October 26 width-lock selection applies to unfolded 2D fields on native and
web. Zoom both axes until the viewport is 3.9 times the gap between the outermost
athlete lane centers (a 25.6% minimum field width), then hold horizontal lane
spacing and scenery scale while longitudinal zoom continues. Zooming back in
restores two-axis scaling. Empty/single-athlete fields use a 25.6%-width ground
band. Distance positions, ruler values and GPS capsule distance remain linear;
the oval and perspective camera retain their existing behavior.

2D and 3D use the same athlete values and viewport. Lane identity stays fixed when standings change; the user's lane is centered among peers. Default longitudinal range is ±600 m (a 1.2 km window, converted exactly to miles; ±10 effort points for non-GPS) around the user, independently of the most distant competitor. Zoom and pan only change presentation. Center/Fit APIs remain available internally; their visible buttons and the redundant viewport caption were removed in #232. Out-of-range markers show arrow indicators and the unsigned distance from the nearest longitudinal viewport edge. The gap changes with pan/zoom and reaches zero at the same center boundary where the arrow disappears. Visible athlete nameplates retain their gaps relative to you. Fullscreen Live intervals and athlete panels slide independently into the side of the screen, leaving slim sheet-style grips with 44 px touch targets. Collapse/expand takes 320 ms; a stationary 450 ms hold fades overlays out and release fades them back over 160 ms, without taking over dragging or pinching. Keep content mounted during motion and respect Reduced Motion. Past you is never ranked.

Web retains the real Three.js renderer. Native 2D is SVG; native 3D embeds the same web renderer and receives bounded, credential-free presentation messages. It requires the corresponding web deployment and a configured `EXPO_PUBLIC_API_URL`. An unavailable renderer falls back to native 2D. New native binaries must include the Expo-supported `react-native-webview` dependency.

Account data, periods, scoring, and backend eligibility rules are not replaced by prototype fixtures. Existing live-connection and synthetic-peer disclosures must remain accurate.

Athlete's Account settings destination contains Sign out, Report an issue and Delete account on web and native. These actions belong inside Account rather than on the Athlete overview or in Preferences. Native's legacy Settings hub remains a compatible deep-link destination. Field zoom and past-self controls are hidden in standings. The [current mobile parity audit](reviews/mobile-parity-main-232.md) records the alignment through #232 and remaining native checks; the [initial audit](reviews/mobile-parity-2026-10-20.md) preserves the earlier repair evidence.

## Production motion implementation

One live lane canvas should change bounds when expanding, retaining its selection, zoom and horizontal anchor. Expanded web lanes live in a root dialog with attached controls, Escape, scroll locking and focus return. Embedded touch lanes allow page scrolling; vertical field exploration requires fullscreen web lanes or native's explicit Explore mode. Programmatic viewport changes interpolate center and span together; direct manipulation interrupts immediately. Center me restores following.

Give each transform one animation owner. Fade sheet scrims independently, retain surfaces through exit, preserve parent scroll behind settings, and respect reduced motion. Haptics follow deliberate actions or confirmed outcomes, not decorative animation callbacks. The [production repair review](reviews/motion-regressions-2026-10-19.md) tracks remaining gaps against the 18-flow prototype, including native fullscreen expansion and medal detail.

## Selected material and interaction exploration

The owner selects all three [activity context concepts](design-studies/activity-context/README.md) for the actual activity details. The [implementation review](reviews/activity-detail/README.md) records the full-screen session summary, route exploration, session scatterplot, five-session trajectory and seven-day volume contribution on native and web. A fixed-baseline Speed / HR index adds the requested pace/HR comparison over time; it describes recorded measurements rather than fitness or recovery. Median comparisons remain underneath as reference stats. Missing measurements remove unavailable lenses, and multi-session days select one session at a time. `/activity-lab` and `/activity-detail-preview` remain explicitly fictional review routes; the product reads account activities.

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

Selected production lane identity: **Polished glass at 80% alpha**, Solar Gold `#ffc400` and Cool Platinum `#c9d6e3`, with four fading echoes. Capsule heads are scaled to **162.5%**, with their centers held at the selected positions from the scale study. The capsule renderer replaces the former circle markers in the web and native 2D lanes. The wake flows backwards, is clipped at the capsule's curved outline, and pauses for reduced motion or inactive screens. Launcher, store, and web install icons use the arrowhead mark. See `assets/brand/README.md` for generated asset locations and regeneration instructions.

In-range capsule heads stay visible at viewport edges and during the persistent Lanes / Standings transition. Out-of-range athletes use arrow-only dotted indicators. Selecting an athlete centers the viewport on their value; there is no athlete popup below the field. Only first-place racers use gold, with all other racers platinum. Compete distance labels show the gap relative to the signed-in athlete. Clip only lane wakes in racer-local coordinates; standings shows compact capsule heads without wakes extending into adjacent rows.

Home offers Sync activities and Add activity. Manual entry records today only, with sport, mileage for GPS sports and duration, and counts in Open only. Onboarding selects at least one sport and queues every selected event for the next 6 a.m. Eastern wave on both platforms. Compete shows the shared start and Sunday 11:59 p.m. Eastern end, you plus seven unnamed competitors, and Cancel registration until the start. Identities and standings are revealed from the canonical field after the benchmark. A running wave offers Stop after this week / Keep playing next week; it cannot be cancelled. Primary sport remains a preference; changing it must not opt an athlete in or out. Existing legacy period helpers still reference primary, so removing that field requires a separate domain migration.

Closed rounds automatically open a full-screen, two-stage Compete takeover only after account data loads: animated sport results, then next-round timing and a direct link to Athlete sport preferences. Dismissal acknowledges both tracks for that round using account-persisted result acknowledgements. Returning activity remains integrated into the field with automatic progress animation and no Replay control.

Native parity: Lanes selection centers the chosen racer and no longer opens an athlete detail card. Out-of-range markers are dotted arrows; only first place is gold and gaps are relative to the athlete. The automatic two-stage round takeover is a full-screen native modal. Home adds today-only manual entry and tracker sync, shares the single-circle-per-day rule, and retains a separate suggestion action. Native Explore keeps its explicit pan mode; its Back control exits exploration and the disabled 3D teaser is only visible there.

Athlete’s main effort score uses the same gold badge treatment as Home accents on web and native, with charcoal numerals for legibility. Competition and training-history boundaries use America/New_York (Eastern, EST/EDT); earlier UTC wording in exploration history is superseded.

## Compete grounds and earned distance

The October 21 selection promotes **Liquid Glass / faint underlay / Banked trail** into the web and native 2D field, with **Map lens** zoom. The October 26 width-lock selection above supersedes uniform horizontal scaling at wide zoom. Meadow Trail and Club grounds are the defaults. Each event offers Personal track, Road ribbons, Parkland Passage, Pool Deck, Boardwalk, Meadow Trail, Club Straightaway, Club Oval and Night Meet. Open edges and Club grounds apply to every surface. Choices are local to the account/event on that device; they do not change units, scores, rankings or tracker data.

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

## October 22 — earned progress and personal representation

Selected directions from the [earned-and-personal exploration](https://github.com/jerryliu3/fitness-battle/pull/253), implemented on web and native. Brand/app-icon geometry is unchanged.

- **Score rail:** A compact persistent rail under the app header shows the primary sport's existing **Open Effort Score**, current rank and progress to the next +1 activity milestone. It is one existing score point per step, not a separate XP/level currency. Positive observed score changes animate with a brief star burst; first hydration, account/sport changes and decreases do not celebrate. Reduced motion uses a static change label. The rail links to Progress for trends, and save failures retain their disclosure. Durable previously earned points are explained when activity removal reduces the volume below its award high-water mark.
- **Sessions:** Session stage leads with moving hours, a restrained athletic track object and canonical Ember. Suggestions remain explicitly suggested; recorded days have a single total and individually expandable session rows. Source, distance, heart rate and removal live inside each row. Removing a session requires confirmation. “What this added” is optional, gives recorded hours and that sport's current weekly activity awards, and never fabricates an award attributable to that historical session. Web uses a parent-preserving sheet; native retains its sheet/back behavior and both dismiss on leaving Home.
- **Session comparisons:** A recorded session can be inspected against its own earlier counted same-sport history. A single session leads with the comparison when it has enough history; sparse sessions keep the moving-time stage. The activity sheet offers moving time and distance, plus pace when at least three prior distances are within 20% of the selected session. Strength shows moving time and 30-day session counts, with average heart rate when enough readings exist. Medians use at most ten earlier qualifying sessions; sample, excluded, pending and later sessions are not baselines. A multi-session day keeps each comparison inside its session. These are descriptive comparisons, not claims about workout quality or fitness.
- **Compete:** Personal pennants are fixed-screen photo/name plates with pointers to the athlete's real coordinate, shown for you and the selected rival. Missing portraits use the shared person fallback. Top headers show place and “You,” with stable lane order and shared places for ties. Leader-only floating Ember and repeated in-capsule initials are removed from the lane view. Standings retains compact capsule identity. Public portrait URLs flow from the authorized roster; the native 3D presentation bridge filters URLs and never carries credentials.
- **Map scale:** Unfolded distance capsules have a 300 m (metric) / 0.3 mi (imperial) longitudinal footprint at every zoom, with independent 44 px hit regions. The default local chase window is 1.2 km, with the existing whole-course overview beneath it. Portrait plates and ruler text stay readable while world geometry scales. Non-GPS effort remains points, with no physical-distance conversion. Oval rendering retains its camera projection and calibrates footprint around the focused lane's circuit; it does not claim every lane's curve has identical circumference.
- **Progress:** Past weeks form month-grouped chapters, using actual place/field size and signed score change, and expand into the existing dimensional result card. Counts are distinct weeks rather than result rows. Training atlas follows Goalmaxxing's selectable calendar pattern, adapted to counted Open moving time. Week charts show daily hours, month charts show weeks clipped to the month, and year charts show twelve months. The Monday-first month grid uses actual dated activity, shows no invented future progress and exposes sessions for the selected day.
- **Crew:** The relay is an extruded, shaded ribbon with proportionate member segments, a finish gate and direct selection connected to portrait cards. Stable member-ID order keeps color identity unchanged across refreshes. Distance crews use an existing configured journey goal when available, labeled as a target. Without one, a positive actual previous Eastern calendar-week total is labeled “Last week”; unavailable or zero history does not invent a finish. Actual overflow stays visible. Session-based formats keep their existing configured session target. Shared counted-activity RPCs remain authoritative; no new sharing write path is introduced.

Implementation and checks: [earned progress rollout](reviews/earned-progress-rollout.md). Live Crew prior-week comparison needs the additive `crew_previous_week_totals` migration. An existing configured goal still supplies a labeled finish when comparison data is unavailable.

Compete mounts only the selected registered sport, with a horizontal sport selector and a persistent “＋ Register” action, matching Crew navigation. Sleep & Recovery participates in the selector when registered. Switching sports unmounts the previous field; selection is scoped to the account, falls back safely when a registration disappears, and does not change the primary sport. Selected-sport controls and supporting content remain inline. Side rulers adapt their numeric interval to zoom, showing at most five readable marks.

## Portrait perspective follow-up — October 22

Compete's optional **3D field** now uses a separate locked-camera SVG perspective renderer on web and native: alpine backdrop, converging teal lanes, profile portraits with initials fallback, yellow You marker, top place/next-rival status and overlaid zoom/peer controls. The camera angle stays locked; horizontal lane swipes and lane arrows reach every peer. Real relative gaps and out-of-range arrows remain explicit. The earlier Three.js pursuit and native bridge remain available in code for later combination. The 2D map triples its underlying unfolded lane spacing, preserving capsule size and longitudinal distance scale. Its status/zoom controls also overlay the board.

Distance crews use their existing configured journey distance as the shared target; crews without a goal may use the actual positive last-week baseline. Crew's shared-week ribbon reserves runway beyond both actual contribution and the real target/baseline. A checkered stripe remains at the true finish, with unfilled track before it when below goal and member contributions crossing it when above. Missing history never invents a target. Progress uses slender teal bars and an actual prior-timeframe delta; partial periods explicitly compare against all of the prior period, and zero baselines never produce a fabricated percentage.

## UX audit refinements — October 22

Past-self is always visible when available and is never ranked; there is no visibility checkbox. The portrait field has a curved atmospheric horizon, position rings and neon earned traces. Native horizontal lane exploration uses a real nested horizontal scroll view, independent of the event carousel; keyboard/lane controls remain accessible. Ruler labels adapt to at most five readable marks. Unfolded earned traces fade over 1.5 displayed distance units (20 points for non-GPS), then retain 90% opacity back to the start. Native decorative capsule flow is active during explicit Explore, keeping the ordinary screen still and responsive. See the [interaction audit](reviews/ux-audit-oct22/README.md).

Crew's shared-week visual now places member markers above the colored contributions on a larger interactive track. Always expose an explicit labeled finish when the crew has an existing configured distance/session goal; configured distance goals are distinct from a last-week comparison. With no goal, a positive real previous-week distance may serve as the labeled baseline. Neither missing history nor zero activity fabricates a finish. Preserve visible empty runway before/after the finish and show member contributions passing it.


Today’s newly synced work gets an optional confirmation receipt, aggregated across the current sync. A deliberate right swipe, accessible confirm action or button reveals the updated event. Close/skip applies quietly. Older dates apply immediately without a recap backlog or historical overtake animation. Demo/sample previews are explicitly labeled and never claim live connection or score credit. The receipt is transient, not another navigation destination.


The native event header owns event switching (swipe, tap-to-choose, arrows and dots), while the board owns lane swipes. Render only the selected event; do not wrap the interactive field in a second horizontal pager that traps vertical page scrolling. Keep field status readable on a dark plate over bright scenery and reserve clearance above 2D lane headers. Native modal-to-modal handoffs wait for native dismissal; full-screen result replay provides its own safe-area provider and exposes the actual result in its accessibility label.

## October 23 cleanup

The owner selects Running/Cycling = GPS Tracked and Walking/Strength = Open. The schema retains both ledgers; product views use the sport default. The header shows progress toward the next whole effort-score point using existing milestone receipts. Home starts with its weekly chart, whose detail destination holds effort progress and weekly perspective. Remove introductory slogans from Home, Progress and Crew. Progress uses underline section navigation and shows history at the bottom of Overview; short mutually exclusive controls use rounded segments and sports use chips. Athlete and nested settings cover the shell header, with icon Back and centered titles. Primary sport is a separate picker, independent of Sports activation. Native iOS uses the system material tab bar; web and the fallback bar float above content. Profile photo commands and activity entry reuse platform components. See [implementation scope and held audit proposals](reviews/ux-cleanup-2026-10-23.md).

## Mobile cleanup follow-up — October 23

The header uses a bounded effort container with remaining volume inside its meter and a weekly activity flame. Streak weeks follow Eastern Monday–Monday periods; eligible counted activity in any sport activates the week, while freeze alone does not. An unfinished current week dims the prior streak. Effort history retains independent Open/GPS Tracked lenses without changing the sport's fixed product track.

Native choice controls overlay their parent; duration/distance use wheels and dates/times use platform pickers. Native Members uses a root stack destination. Default 2D geometry shows approximately five lanes while retaining its existing longitudinal distance scale. Place and next-rival status sit above the field as a plain text row. White competition date containers, Active Sports cards, sport/settings icons and distinct level symbols provide separation. iOS chrome stays light. See the [follow-up audit](reviews/mobile-bugfixes-2026-10-23/README.md) for changes, rollout and remaining device checks.

## Shared hierarchy implementation — October 24

The October 25 typography review supersedes the former five-style limit. Product
text uses Manrope on web and native, with semantic roles from
`packages/shared/src/shell.ts`: display 32/38/800, heading 20/26/700,
body 16/24/400, label (controls) 14/20/600, caption 13/18/500,
hero metric 48/54/800, secondary metric 28/34/700, row title 17/24/600,
row value 20/26/700, support 14/20/400, field label 13/18/600 and
navigation 12/18/500 (size/leading/weight). Shared tracking is expressed in em
and converted to logical pixels on native. Body copy stays readable; row titles,
metadata, values and actions no longer share a bold label recipe. Metrics use
real text, retaining font scaling and heading semantics only for actual headings.
Web self-hosts the variable font; native bundles static 400–800 weights.
Nunito Sans Black remains the Over / Taek racing wordmark. Historical artwork
and prototype font assets remain separate. Role changes must update both
platform adapters and the UI contract checker.

The contract applies across Home, Compete, Progress, Crew, Athlete/settings,
onboarding, notifications, authentication, history, awards, sleep/recovery,
rankings and supporting sheets. Shared divided boundaries use #d0dad7 at one
logical unit, with 16 before and 12 after; mobile page gutters remain 20.

The rendered-screen follow-up makes Home, Compete and Progress screen titles explicit display roles via `SectionHeader` / `Section` `titleRole`; subordinate sections retain heading. Achievement quantities use metric with separate caption units, personal-record heroes use hero, record receipts use value plus caption date, and standings use row names with value totals. See [rendered audit](reviews/typography-rendered-audit/README.md) for measured coverage and limitations.

## Full-screen activity and competition moments — October 24

The root account provider owns event presentation across Home / Compete / Progress / Crew. Browsing a field never consumes a rank-change event. A saved baseline is scoped by account, sport, competition track, period and display units; first loads seed quietly. Later own-volume passes and peer-driven passes open a full-screen scene regardless of the current tab. Each crossing slows the camera, names the actual competitor, increments the overtake total and builds the combo. Rival movement uses a neutral chase treatment. Final place and volume match the settled current field; confirmation returns to the parent application. Reduced motion shows the same result immediately. These are accumulated-effort replays, not live GPS races.

One modal stays mounted through review and movement, avoiding native modal handoff races. Sync review reuses the activity route explorer from #316; absent geometry or an unavailable map never blocks confirmation. Multiple sports queue separate moments. Historical activities can be reviewed without inventing passes in a past period. The inline field displays current stats and no longer owns replay timing.


### Launch animation — October 24

The default launch mark is the 35% clean staggered **over / taek** race, using
product ink/paper/tennis colors and the existing Nunito Sans Black face. It shares
3.78-second choreography across web and native SVG, with reduced-motion and
background pause support. The Ember wordmark animation remains selectable in
code and the web `/design/loading` review. Both use the same application-readiness
gate; animation completion alone does not dismiss the cover. See
[loading implementation](overtaek-loading-prototype.md).


Mobile performance update (October 26): retain the full launch animation even when
content is ready, per the owner's preference. Account loading, caching and prefetching
run underneath the cover so Home is ready when the animation finishes.

### Account controls and launch timing — October 27

Primary sport opts into an iOS UIButton/UIMenu anchored to the visible control,
with checked selection and VoiceOver labels. The local Expo `anchored-choice`
module requires a new native build; older binaries, Android and web retain the
existing accessible anchored choice list. Other pickers retain their current behavior.
The shared launch race now lasts 3.78 seconds (30% shorter), with a shorter opening,
zero initial velocity, sharper passes and a longer final ease. Readiness still owns dismissal.


### Home rival card — October 24

Home shows the athlete’s ordinal place (1st, 2nd, 3rd), without the field-size
fraction. Target the next ranked athlete ahead; when leading, show the closest
trailing athlete. Name that rival and label the gap as behind, ahead of, or level
with, using athlete distance units for GPS sports and effort points for strength.
Small positive gaps use meters/feet rather than rounding to zero. Keep simulated
athlete disclosure and the existing registration/solo fallbacks. This is shared
presentation on web and native; it does not change ranking or scoring.


### Athlete portraits

Use an available, authorized profile photo for identity in Crew, session attendees,
activity rows, standings and profile entries. Fall back only for absent/failed
images. Current-account photo edits/removal override stale roster copies. Keep
map thumbnails functional and race capsules as race markers. Reuse authorized
roster data for session portraits; never broaden profile reads for presentation.

### Daily suggested session — October 27

Home offers a floating, dismissible Today’s suggested session prompt on web and
native. It opens the same Today session and `buildTodayRoute` suggestion as the
journey, without a second recommendation engine. Viewing the suggestion from
either entry point or dismissing the prompt hides it through the current Eastern
calendar day. Dismissal is stored per account on the device; date rollover and
foreground wakeups renew it. Journey access remains available. The existing
home-lab prototype informed the Today/journey reuse; no separate floating prompt
prototype was found in this checkout. No score, training rule or sync write changes.


## Home chart and daily health — October 25 selection

Production Home on web/native now combines the Portfolio cumulative hours chart
(teal line, subtle fill, quiet previous-week comparison, endpoint dates, no weekday
picker) with Signal Room's four-tile daily health layout beneath it, rethemed to match the light chart. Current
week, session totals and activity actions remain. `HOME_HEALTH_COLORS` reuses the existing light tokens: canvas `#f8f9f6`, white tiles, border `#e3e9e7`, navy text `#142b3b`, muted captions `#637482`, teal accent `#176c75` and comparison `#668e91`. The chart and health section share an open canvas, typography and teal visual language. The selected Signal Fill treatment uses a teal arc from zero to the current reading, with the observed seven-day maximum defining the full scale. Units sit inside each ring (sleep keeps inline h/m), and the observed min/max followed by “(7 day range)” is the only caption below available readings. Missing current readings leave an empty track; no medical
ranges or targets are inferred. Only stored current sleep duration is available;
Steps, Resting HR and HRV show unavailable until their data feeds exist. See the
[implementation review](reviews/home-health-production/README.md).

### Distance-plane field — October 25

The optional **3D field** remains a lightweight SVG perspective renderer on web
and native. Its longitudinal coordinate is now the athlete's actual accumulated
value in the same distance/effort window as 2D. Survey lines and portrait anchors
share one invertible perspective projection; lane identity stays independent of
rank. Out-of-window athletes are culled rather than pinned at false positions.
Directional navigation below the board names the nearest offscreen athlete and
retains their actual gap relative to you. Past you remains unranked.

Horizontal swipes browse lanes. Explicit Explore enables simultaneous horizontal
and longitudinal dragging, preserving ordinary page scrolling when inactive;
native fullscreen enables exploration immediately. Web also supports arrow keys,
Home to return to you, and trackpad/wheel panning while Explore is active. The
five direction/You controls and zoom controls remain available without gestures.
Distance labels show accumulated values from the start, while athlete labels
show gaps relative to you. Navigation sits below the plane to avoid covering
athletes, including at the near/far bounds.

Scene work is bounded to nearby lanes, in-window portraits and roughly five
survey intervals. Gesture events coalesce to at most one React update per
animation frame; there is no idle render loop, running animation, WebGL context,
or native WebView needed for this selected field. The earlier Three.js pursuit
and bridge stay independent. See [implementation and local validation](reviews/distance-field-2026-10-25/README.md).


#### Infinite perspective correction

The measured window must never become the scenery's boundary. Lane ribbons now
converge at a fixed, visible vanishing point and continue below the viewport.
A bounded set of more distant survey lines and an atmospheric fade blend the
field into the alpine horizon. The measured athlete/ruler projection is
`perspective = 1 / (3 - 2 * depth)`; portraits have a minimum readable scale,
while their ground anchors retain the true projected distance. Gesture inversion
and lateral movement use the same camera scale on both platforms. Native SVG
owns its gesture responders, and the fullscreen Modal establishes its own safe
area so controls clear the Dynamic Island. See [follow-up review](reviews/infinite-field-horizon/README.md).

### Competition event replay — October 25

Fullscreen Compete and settled round recaps offer an event-by-event replay on web
and native, with 2D/3D views, play/pause, speed, stepping and a draggable in-memory
timeline. The camera follows the changing athlete with a Follow me alternative.
Workout chronology comes from counted activity; simulated rivals retain explicitly
labeled daily steps. Replay remains presentation-only and does not award overtakes
or alter standings writes. See [data and interaction contract](reviews/competition-replay/README.md),
including historical reconstruction and native walkthrough limitations.

### Web Full Arena viewport — October 25 follow-up

Expanded web fields reflow their persistent scene to the full browser viewport in
both 2D and 3D. Expansion animates a reveal clip; it does not freeze or scale the
inline field. The scene keeps its selection, distance window and horizontal lane
anchor across expansion and resize. Fullscreen zoom controls sit above the athlete
spotlight, matching the native fullscreen arrangement. Replay remains a control
inside Full Arena; recap/history entries open a fullscreen replay viewer. See the
[fullscreen review](reviews/web-fullscreen-field/README.md).

### Automatic movement replay — October 25 follow-up

Sync and debug overtake/passed-by moments now replay on the production 2D field,
edge to edge on web and native. Use the captured complete roster, canonical glass
capsules, course scenery and the account/event's saved ground
appearance. Preserve the slowed crossing timeline and a camera following the
athlete with a subtle close-up at each pass. Nearby live standings, overtake/combo
feedback and Skip/Continue are overlays; no field exploration, dimension, zoom,
customization or playback controls appear here. Native bypasses the receipt's
padded ScrollView and places only overlays inside safe-area bounds. Reduced motion
shows final totals immediately. This automatic movement moment is separate from
the browsable competition-history replay with timeline controls.

### 2D field performance — October 25

Production 2D preserves the original full-size capsule echoes, colors, masks,
spacing and gold/platinum animation timing. Inline/reduced-motion wakes keep the
original still pose; fullscreen/exploration animates them. Web CSS and native Reanimated animate the original SVG groups without publishing
React frame updates. Native keeps the original scene layering and uses two shared
UI-thread phases per field. Pause hidden web wakes and inactive native fields. Earned-distance ribbons stay removed.
Athlete movement must not rebuild scenery; replay owns marker position
interpolation, and gestures publish at most once per animation frame. Preserve
capsule identity, ground choices, distance scale, ghost and offscreen indicators.
See the [performance investigation and fidelity validation](reviews/2d-field-performance/README.md).

The optional geographic course view uses Mapbox Standard scenery and the same
competition totals. The database route catalog assigns one route snapshot to
every competition field sharing the same wave start. Live fields and historical
replays read that assignment through a membership-checked API, which stores the
choice on the first authorized 4D view. Athletes cannot
upload, request, or change 4D routes. The owner-only admin catalog supports
adding, editing and deactivating routes, GPX import and a route-shape preview.
Catalog edits apply to new assignments; saved competition snapshots stay fixed.
The dedicated screen
supports native map gestures, selectable athletes, 2D/chase views, discovered-ground
framing and recenter/follow. Manual exploration suspends follow; selecting an
athlete resumes it. Respect reduced motion and retain map attribution. Points
fields keep the existing field. Athletes retrace courses back and forth at each
endpoint while cumulative distance continues; the chase camera follows their direction and the covered trail stays
solid. Only local demo and debug previews use a bundled sample course; live
accounts require the stored assignment. Courses do not change scoring or import
an activity. See
[implementation and validation](reviews/geographic-course/README.md).


Geographic scenery is the default distance field option, labeled **3D** beside **2D** (internal renderer ID `4d`). The former perspective 3D option is hidden
on native and web, including fullscreen controls. Distance fields offer 2D and geographic 3D;
points fields retain 2D only. 4D uses the same inline/fullscreen field host,
selection, sliding broadcast panels, quick jumps and hold-to-hide overlays. Mode
changes retain fullscreen, collapsed panels and the assigned weekly course. Competition
replay also offers 4D, using timeline values for both dots and earned trails;
rewinding never reveals later effort. Mapbox supplies geography-specific camera
controls, while appearance/oval controls remain specific to the illustrative field.
The route ahead stays invisible. Each athlete reveals an individual narrow,
opaque trail (about 36 cm wide at close zoom) that ends exactly at their dot; no activity means no trail. The
viewer stays centered on the underlying route, with peers alternating left/right
in stable ID order at 42 cm spacing (ten lane centers span 3.78 m). Selection moves the camera without
rearranging lanes. The spacing toggle compares spaced/together layouts. Camera
follow uses the same displayed position as the trail. Race overview frames only
covered ground. Return trips preserve the full earned trail with geometry
bounded to two traversals, regardless of cumulative distance. Offsets remain
illustrative rather than measured road widths or collision avoidance; zoomed-out
markers can still overlap.
Crew shared-week finish checks are printed in the top plane of the progress block, without flags. The finish remains anchored to the configured target or available prior-week baseline.


4D reuses the 2D floating athlete nameplate and leader graphic. Keep the nameplate
146 × 46 screen points/pixels at every zoom, with the leader endpoint attached to
the racer's displayed lane coordinate. Show every real racer's nameplate in 4D; 2D keeps its existing visibility;
annotations sit above Mapbox scenery, without moving racers onto building roofs.
Mapbox positions native/DOM annotations; do not project camera frames through React.
Paths use a 36 cm stroke on 42 cm lane spacing (6 cm gap at close zoom), with a
3 px visibility floor at wider zooms. Hold-to-hide includes nameplates. See the
[racer-card follow-up](reviews/geographic-course/racer-callouts.md).

### In-field view selection — October 27

Compete owns one dropdown inside the inline field card for 2D map, 3D field,
Standings and the existing distance-only 4D course. Standings replaces the field
in that card; switching back retains the camera and lane selection. Athlete taps
in standings focus that athlete in the retained field. The redundant view row and
2D/3D toggle chips are removed. Event/sport selection remains separate.

### Mobile geographic field controls — October 29

The native 3D course preview opens by tapping the map, using the same
“Tap to open full screen” hint as 2D. The preview has no course toolbar or
fullscreen icon. Fullscreen places a compact **Options** dropdown below the dimension selector,
matching the existing HUD chips and anchored menus. It contains View replay, a Perspective view switch (off means flat), a Space racers
switch and See overview. Switches keep the menu open; actions close it. The
fullscreen athlete spotlight shows place and identity without an Elo label. Replay remains a chip in the preview. Course names, Following / Recenter and zoom
buttons are removed. The map engine owns pinch zoom; selecting an athlete resumes
following. Browser map gesture behavior is unchanged.

### Fullscreen controls and overview — October 27

Full Arena uses the same view dropdown. Replay is a chip beneath Behind for all
field dimensions. Visible +/- clusters are removed in fullscreen 2D/3D; pinch,
web wheel/keyboard field gestures and labeled Zoom in/Zoom out dropdown actions
remain available. Choosing Standings returns to the inline standings card.
Existing 4D map controls retain their geographic camera behavior.

The horizontal race overview sits beneath the expandable athlete panel, with
separate layout and touch handling so sliding the panel away never removes the
overview. The overview shows actual athlete positions and the retained camera
window in both 2D/3D, supports dragging, native adjustable accessibility actions,
and web keyboard arrows/Home/End. Selecting it cancels camera travel before
navigating. Both elements clear the bottom safe area; the panel reserves 56px
above the overview. Field hold-to-hide applies to both.

### 4D distance overview follow-up — October 27

With a course selected, Full Arena restores the horizontal overview in 4D beneath
the athlete panel, including when the panel is collapsed. It shows the real athlete
positions and a **Course distance target** cursor, rather than claiming that a
linear distance window represents the geographic viewport. Pointer/drag, native
adjustable actions and web arrow/Home/End controls seek along the same accumulated
distance and out-and-back mapping as racer positions, respecting mi/km units.

Seeking suspends automatic athlete following, preserves map zoom/pitch/bearing,
and moves immediately during scrubbing. Recenter or selecting an athlete resumes
following and restores the target cursor to that athlete's distance. Returning to
a course retains an explicit target; choosing another athlete clears it. Seeking
is presentation-only and never edits activity, athlete selection, scores or trails.
The earlier hide-only PR remains the fallback until this follow-up is applied.

## Guided setup and competition moments (October 29)

Production onboarding now follows eight illustrated steps: welcome, profile,
sports and primary sport, units, optional sleep tracking, tracker connections,
a sample field tutorial, and review. Draft choices are scoped to the account on
the device and survive a visit to Data Sync. Connections and history import use
the existing Athlete destination, which offers Continue setup for unfinished
accounts. Completing setup applies existing account actions once; the tutorial
never creates an activity. Debug → Onboarding replays the same UI without writes
or tracker actions.

Pass replays add a deliberate arrival prompt, the existing slow crossing, and a
landing message. The camera fits the active pair in both axes without reordering
lanes; passive oval replay fits the course. Round recaps reveal arrival, archived
finish, archived training time by field, and actual next registration separately.
Do not invent streaks, daily sessions or rewards from incomplete result history.
Debug’s existing pass and week-closing triggers exercise these production flows.

### Onboarding refinements (October 29)

Setup now has seven steps. Sports and primary sport share a page with a separate
Sleep & recovery section. Tracker options render inline using the same settings
controls and handlers; authorization returns to the account-scoped onboarding
draft automatically. Skip for now leaves connection setup optional. Debug
previews show disabled integration controls and never authorize or save.

The tutorial explicitly introduces the Overtake metric. It embeds the production
CompetitionMoment player with a fictional two-racer fixture, slower playback,
and the same crossing slowdown. A 2D field / 4D course toggle retains the same
playback clock, and Replay resets the demonstration. The 4D view uses the existing
geographic course renderer and requires the configured Mapbox token/native
Mapbox build; missing configuration is explained by that renderer. Tutorial
values use explicitly labeled sample kilometres and never affect account totals.

Setup has no close or skip-setup action. Previous step sits beside the forward
action at the bottom and is absent on the first step. Sleep tracking uses the
same selectable chip treatment as sports. The Overtake player owns its single
Watch / Replay action; the tutorial wrapper only supplies the view toggle.

The next refinement keeps Ember mounted above the changing step content at a
constant size. Units live under the sport chips and appear for running, cycling,
or walking; the primary selector appears only with multiple sports. Users can
choose sleep alone. Continue validates at least one sport or sleep selection;
sleep-only completion does not register a sport or change the primary sport.
The draft namespace is v3 because the step order changed.

Overtakes default to the 4D course with a binary 2D / 4D switch (native Switch on
iOS). The tutorial replay omits its sport/sample header. A new example standings
and score-chart step introduces weekly results and crew progress. The final
summary celebrates the selected sports, units and recovery with icon cards, and
derives its next-wave label from nextDailyWaveWindowAt and waveTimeLabel. It
refreshes the displayed scheduling clock while setup remains open.

The weekly introduction now stages an animated second-to-first standings move,
then reveals the score chart. Crew content and example captions are omitted.
Overtakes autoplay on entry and retain a replay action. Distance units use a
compact control on the label row. The final summary omits its redundant greeting
and kicker. Reduced Motion bypasses the standings and chart timing.

Sports has its own heading; distance units retain their compact size below the
label, aligned left. Navigation uses Back. The standings example counts You from
20.1 to 24.8 km over two seconds and keeps You highlighted through the rank swap.
Chart axes stay visible while the plot reveals. Summary cards fade in in order,
followed by the next-wave label, respecting Reduced Motion.

Onboarding is a full-screen surface without a progress bar. Finish preview exits
to Compete explicitly; signed-in setup ends with Finish. Debug sync and overtake
completion restore the pre-preview state; weekly recap dismissal hides locally
before removing the results URL. Weekly results omit the medal, embed a 4D-first
board replay with standings, and consolidate training charts, score change and
current-round settings on the final page. Archived charts use qualifying activity
history and explicitly report missing detail rather than inventing daily values.

Desktop web onboarding retains its centered 480px layout and normal control sizes;
native onboarding remains full-screen. Recap replay sits beside Follow me inside
the board. Weekly chart drawing starts immediately; onboarding keeps its staged
reveal delay. Debug Overtake exposes 2D / 4D switching on the same playback clock,
using the practice course for geographic previews.


## Mobile action refinement, October 29

Native primary and secondary action buttons use fully rounded pill corners with a 48px minimum height. Compact filters use stable label typography and at least 44px touch regions; selection uses a stronger border and pale fill. Picker triggers share the pill silhouette. Secondary destinations use quiet chevron rows. Keep 12px control geometry for text fields and settings rows, 20px cards and 24px sheets. Preserve the selected chart designs, palette and typography.

Native onboarding applies top and bottom modal safe areas. With multiple sports,
Primary sport uses the standard dropdown. The weekly introduction resets its
staged standings/chart reveal after the motion preference resolves; axes remain
visible while the trace draws and the panel fades in. Queued native registrations
show a live HH:MM:SS countdown beside their scheduled start, including sleep.
Native geographic replay follows frame positions directly rather than restarting
camera flights on each update; explicit athlete selection retains its flight.


### Native launch and sheet dismissal — October 30

Startup shows the canvas while bundled fonts load, followed by the launch animation.
Finish the animation before mounting native account providers and screens; keep the
same final logo frame with a spinner while that work settles underneath the cover.
The privacy read stays behind that cover; ordinary loading never shows safety-settings
copy. Privacy failures still expose Retry and Sign out. The launch gate remains mounted
across sign-in and foreground privacy refresh, so later reads do not replay startup.

Shared native bottom sheets dismiss with a downward drag from the grip/header or
from content at scroll position zero. Scrolled content retains vertical scrolling;
short drags return to rest and deliberate downward flicks dismiss. Full-screen route
sheets limit dismissal to the header to preserve map gestures. Side panels dismiss
rightward from their header or leading edge. Preserve backdrop tap, system Back and
accessibility escape, plus content through the existing dismissal/handoff lifecycle.
Bottom sheets omit the X row and size to their content up to 85% of the viewport, respecting the top safe area;
Your activity uses this shorter layout. Centered confirmation/picker dialogs and
required onboarding/result takeovers keep their own explicit actions.

### Sync feedback and activity actions — October 31

Native sync feedback uses a dismissible toast above the page without taking layout space or blocking page interaction. Suggested rest days omit activity actions; other suggestions place primary Sync activities and secondary Add activity together in one row.

### Settled recap — October 31

Settled recaps omit the standings list, retain a 360px map viewport, and identify podium finishers with names and available profile photos (initials when absent). Strength recaps use 2D. The recap training chart shows dated axes, cumulative minutes and scrubbable readings. Effort Score uses the same live endpoint indicator as Home.

### Chart references and event detail — October 31

Every full chart carries readable axis values, a metric/unit label and a dated or
named horizontal reference. Keep references quiet and avoid dense grids. Native
plot geometry and inspection overlays use the same full-width SVG transform;
chart captions retain their typography size as the plot resizes. Advanced
analytics, onboarding, training, record and recap charts follow this convention.

Home 1W shows every eligible positive-time activity at its recorded start time,
with equal-width Eastern days, including DST transitions. Cumulative lines stay
flat between events and extend to the current reading. Prior-week comparison uses
the same time placement; Home 4W retains daily totals. Effort Score uses actual
server-committed score changes, with individual date/time readings in 1W. A sync
batch that changes a score is one committed score event; do not invent separate
activity award times within that transaction. Older settlement boundaries remain
available, but earlier activity awards have no reconstructable timestamps.

### Personal health corridors

Home's seven-day chart uses a descriptive personal corridor: the 10th–90th
percentile of recorded values in the preceding 28 calendar days, excluding the
seven displayed days. Require at least seven readings; otherwise retain the
observations and show baseline unavailable without a band or out-of-range labels.
HRV comparisons retain one provider's measurements. These are personal history
comparisons, not clinical reference ranges or targets. Analytics range controls
filter one stable history; selecting another range must not change a day's value.

Native settings keep Haptic feedback in Preferences and Blocked athletes in Account.
Advanced Analytics tiles use axis-free sparklines; detail screens retain axes.
Full-screen native navigation and sync/replay modals fade, respecting Reduced
Motion; receipt-to-overtake transitions fade within their shared modal. Receipt
metric tracks expose their recent-maximum comparison in visible copy, including
missing history. Overtake counts flow below the dimension toggle. Native overtake
cameras ease position, heading and zoom through rival changes and the ending hold;
Follow athlete in competition timelines tracks the current event's athlete.

Native UX followups preserve ordinary stack, panel and sheet transitions. Fades
are limited to fullscreen experiences. Sheet dismissal drags start at the handle.
Sync metrics place label and value together and omit comparison subtitles.
Overtake scenes autoplay, emphasize crossings with stronger slowdown, and offer
Replay / Continue at completion. Getting-overtaken receipts wait for Compete.
Week recaps use intro / replay / result card / breakdown steps with fixed entry
positions. Course camera poses are retained in account-scoped process memory.

The next native refinement removes axis labels from Home and Effort Score charts.
Effort connections are solid yellow, including connections between readings with
unknown change times; source event timestamps remain unchanged. Daily-health
history labels omit units except on today's point, omit corridor prose/status
badges, and round counts with compact notation above five digits. Informational native toasts
expire after five seconds and dismiss upward without a close glyph.


### Account save notifications — November 1

Account save failures belong to one root-owned floating toast on web and native.
Pages, settings, onboarding and Effort Score captions do not reserve space for
save errors. A revision conflict replaces the generic save failure in that same
notification. Retry save / Saving… and Reload account retain their existing save
and recovery behavior; Dismiss only hides the notice and never clears a draft,
conflict or unsaved flag.

Native notifications render in the iOS full-window overlay above navigation
headers and sheets, inside top and horizontal safe areas. Empty overlay space
passes touches to the current screen. Informational sync toasts keep their
five-second lifetime and upward dismissal. Actionable save errors allow eight
seconds, pause expiry while saving, and offer a visible Dismiss action. Account
conflicts stay until acted on or dismissed and take precedence over informational
sync feedback. A failed retry can show the same error again. Web uses a fixed
portal with safe-area offsets and the same actions and dismissal policy.


### Compete event home and sheet controls — November 7, 2026

Compete is an event home with the shared app navigation. Tap a registered event
to reveal its retained immersive field; Back returns to the home. Geographic
event cards show noninteractive 3D snapshots centered on the user, retaining
map attribution. Cards contain ordinary images that scroll with their content.
Entering opens a separate prepared immersive scene. Queued events wait for course assignment, and points events use
an explicit points placeholder.

The immersive header omits the redundant sport pill and places native UIKit
glass Back at the top safe inset on supported iOS. The standings sheet keeps its
rows laid out below the viewport while minimized. Inside the sheet, the course
scrubber and its settings gear share a row directly above Standings; the gear
sits immediately to the right of the scrubber. The sheet starts partially open,
expands to the bottom edge, and adjusts through its handle without visible
minimize/lower buttons. See [implementation review](reviews/compete-event-home/README.md).

Compete geographic controls use a bare settings gear, Start–Leader scrubber
labels and a Current Leaders panel. Scrubbing follows the earned course heading
in perspective mode and cannot seek past the leader. Mapbox credits stay visible
at the lower-right map edge above the standings sheet. Athlete photos open
profiles; the rest of a standings row focuses the athlete on the map.

Snapshot credits may use a compact caption near the static image instead of an
embedded info button. Live map credits sit at the top-right safe-area edge.
The standings sheet has no repeated title, retains all rows during height
changes, and allows its last row to scroll fully above the visible bottom.
Racer selection travels along course distance, facing race-forward even when reversing;
reduced motion uses an immediate position change.

Compete home restores the shared competition date range beneath its title;
event cards omit repeated days-left labels. Snapshot previews use a landscape 1.6:1 aspect
ratio inside the horizontal event carousel. Utility map credits use the compact shared nav text recipe
with a feedback info glyph carrying its full accessible label. Live maps retain
the standard SDK wordmark and align a 14-point info control beside it; the info
sheet includes source links, feedback and the telemetry privacy choice.

Event cards place compact copyright links over the bottom-right of the snapshot,
with a contrast backing. They omit repeated distance and rival-gap text below
it. A full-width See race button is the entry action. Beside the header date,
a badge shows full days remaining, or hours when fewer than 24 hours remain.

Course settings group aligned switches before action rows. The 3D view switch
selects between the 2D and 3D renderers; the native menu and switch columns have
explicit widths. Only the selected racer's map card exposes its minus control;
snapshot captures omit interactive controls entirely.

Camera headings anticipate bends using nearby course points and ease toward the
forward race tangent over time. Racer travel backward retraces course distance
without turning the lens around. Automatic position updates use the same route
motion; reduced motion skips animation. Zoom and interruption behavior remain
consistent across native and web.

### Native time and course dock — November 7

The immersive standings sheet owns the time scrubber and circular Play/Pause
control. Its header measures its own content so date and time
remain visible at the minimized stop. A separate vertical Course position rail
sits beneath Current Leaders on the map: Start below, earned Leader above.
Both sliders are directly available; dragging either never drags the sheet.
The layers button opens existing course settings at the map's upper right,
below attribution and clear of the top safe area. One timeline provider drives
the retained map and sheet standings. Course seeking changes the camera only
and stays bounded by the leader at the selected time. Event snapshots stay live.

The immersive timeline always shows playback speed in a fixed 48px target, with tabular numerals. Its caption contains the date and time to minute precision, including at the live endpoint; omit local/simulated source labels. The course rail shares the leaders panel’s dark translucent surface and begins 12px below its measured bottom. The layers button has a visible dark translucent 44px target.

### Compete discovery layout — November 8, 2026

Native mobile is the design target; web follows the same composition. Compete
opens with a gold wreath, the existing event date and remaining-time badge.
Your events is a snapping horizontal carousel with landscape static course
snapshots, place, last-update/upcoming status and pagination dots. Last update and the event activity feed read the same membership-scoped replay
ledger; absent data remains Unavailable. The home cards omit a separate simulation label;
blocked athletes' events are omitted without changing field ranks.

Compact horizontal gold Crew event banners follow, linking to the existing Crew hub for
membership and shared individual fields. They do not claim limited availability,
relay rules or team-versus-team scoring. Explore follows in Distance, Time and
Recovery horizontal rows: neutral bordered tiles carry one outline icon, one title, and filled sport artwork
in the lower-right corner (track curves, a walking hill, strength bars and sleep
waves). All supported events remain visible in discovery for visual testing. Only supported events appear. Results & rankings finishes the page with
compact gold and silver metallic surfaces, recorded placements, the existing
rank tier, and history and ranking destinations; missing results have an honest first-finish state.

Compete discovery currently keeps all supported event tiles visible for visual
testing. Registered tiles open their existing event; unregistered tiles open
that event's entry package. Choosing a sport never registers it; Claim entry pass
is the explicit commitment. The general Register control still opens an event
chooser before the same package. Queued event details and Cancel registration
live in the foreground competition sheet, independently of map preparation;
Back and successful cancellation return to the event home.

Explore sport cards retain a fixed 158-point width even for a single event.
Category rows show only their icon and title. Registration packages use a gold
illustrated hero, tinted detail icons, and a metallic ticket with side cutouts;
scoring explanations and the explicit entry commitment remain unchanged. Native
AppIcon sport outlines and web sport icons consume the shared SVG artwork.

Registration hero, detail-icon tiles, and entry-pass artwork reuse the selected
event’s Explore artwork color. Gold remains the primary action color.

Compete discovery is titled Event registration and replaces the header Register
action. Category artwork uses green for Distance, blue for Time, and purple for
Recovery, including entry packages. Registered event previews are square with a
compact See race action. Last-update text uses the shared support recipe, actions
and Crew event use label, all in Manrope. A slow pulsing live dot accompanies
last update, pauses when inactive, and stays still with Reduced Motion.

Crew banners use a gold Special event badge with a vector star. Registration
tiles fade from their neutral surface at left to a 15% category tint at right.
Sport icons use the official Phosphor Regular family (MIT); shared filled path
geometry preserves the authored stroke weight across native and web sizes.
Other app utility icons retain the existing Tabler family.

Shared app controls, navigation, profile fallbacks, and competition utility icons
use Phosphor Regular. iOS native tabs use bundled template PNGs at 1x/2x/3x
from the same official SVGs, retaining system tint and native tab behavior.
Card tint layers extend 24 points beyond every edge and clip at the parent’s
rounded boundary so no internal gradient rectangle is visible.

The header flame uses Phosphor Fire Regular when inactive today and Fire Fill
when counted activity exists on the current Eastern day; the number retains its
weekly streak meaning. The custom Compete wreath is awaiting a replacement choice.

The immersive standings sheet identifies the meet with Back, sport, status and
dates. Race updates below standings includes every counted event returned by the
existing replay endpoint, newest first, with activity volume, chronological place
changes and Eastern timestamps. It reconstructs workout order from the current
counted ledger, not an immutable log of import/notification delivery. Native
privacy filters hide blocked activity while retaining the complete field for rank
calculation. Loading, empty and retry states do not substitute a preview for a
failed authenticated request. Native and web share the feed presentation model.

The event sheet shows Standings or Feed through one flip button. The timeline stays
outside the turning panel; there is no extra meet heading or back row below it.
The panel turns edge-on, switches its visible face, then turns back in 420 ms;
Reduced Motion switches immediately. Standings stays mounted to preserve its
selection. Both faces share the loaded timeline ledger, so switching to Feed
does not wait for another request. Closing resets
to Standings; event/account/wave changes create a fresh panel. Queued-event
registration cancellation stays directly accessible outside this presentation.

### Event replay feed refinements (November 8, 2026)

Native and web share the replay cursor between the field, standings and Feed.
Feed lists completed events newest first and reveals new rows from above as
playback advances; rewinding removes later entries. Logged activity uses the
athlete portrait; overtakes name the athletes passed and retain place changes.
Ties do not claim an outright overtake. Flip faces swap edge-on after committing
the incoming layout, respecting reduced motion. The overlay title is always
“Current Leaders” with the shared label typography. Product and debug builds
use the same user-facing copy, preserving provenance internally.

### Registration ticket — November 8

Registration retains its event introduction, schedule and expandable event details.
Only the ticket beneath those sections is redesigned. Claiming retains
that screen, flips the ticket to “You’re on the start list”, then lands a stamp
with the event icon, name, wave dates and year. The reverse has a live countdown
and an explicit View upcoming race action; dates derive from the actual enrollment
once registered, including server-rebased starts. Keep the ticket composition
consistent across events; its art and stamp identify the event/week. Reduced
Motion reveals the final state immediately. Renewal and end-time information
live in expandable Schedule & renewal details, rather than below the CTA.

Queued events open from See race into a full-height upcoming-event destination,
with Back, the start countdown, exact start/end times and Cancel registration.
Cancellation is absent from Compete home and from the live standings sheet.
The same navigation applies to Recovery. Keep cancellation limited to the queue;
a started wave waiting on its field reveals a waiting state without cancellation.
When its field arrives, the selected sport continues into the existing live field.
Native uses the retained experience host; web reuses the full-screen dialog with
its focus, Escape and Back behavior. No roster, scoring or registration-write
rules change.

The November 9 refinement removes the registration Crew toggle and promotional
ticket slogans. The ticket carries the event, start time, barcode and claim action;
its reverse carries the confirmation, countdown and sport/week stamp. Queued
distance previews show the assigned GPS course with anonymous mystery markers
at zero, both on Compete home and inside the upcoming event. The course API
authorizes the athlete’s exact saved registration independently of field
assignment. It reveals no roster and does not seat athletes. No queued-preview
migration or schema change is required.

Registration is now a three-step bottom sheet: Event (including anonymous field
placeholders), Details (Scoring & eligibility, Matched field, Entry tier), Ticket.
Only one detail expands at a time. Claiming flips and stamps the ticket, then
automatically dismisses registration and enters the full-screen selected field.
Queued sports use the same course host as live races, with mystery athletes at
zero and cancellation in the foreground standings sheet. Recovery retains its
full-height surface. This supersedes the separate queued-sport destination.

The registration polish retains one viewport-relative sheet height for all steps,
with no progress row, date range or backward step action. Continue fills the row
on steps one and two; the ticket owns the only primary action on step three.
Details are Scoring & eligibility, Schedule & renewal and Entry tier. The ticket
includes the entry league and a full-width decorative barcode. Claiming starts
a continuous two-face flip, then a firm stamp, and stays open on the countdown;
only explicit View race enters the event. Respect Reduced Motion. Queued field
sheets have no scrolling body: changing the sheet height reveals cancellation.
Mystery athletes appear on the map only, not in the queued text card.

Registration sizing uses a shared minimum across steps, reserving the measured
height of both ticket faces before step three opens. Expanded details contribute
to that reservation. Content remains in normal flow so Continue cannot overlap
longer text. On compact screens or with larger accessibility text, the outer
sheet's existing scrolling remains an accessibility fallback; ticket content is
never clipped or scaled down. Hidden ticket measurement does not run a countdown.

### Crew overview — November 11

Crew uses a compact name switcher, member count and invite/settings actions above
one shared weekly progress hero. The existing dimensional relay keeps member
colors and the checkered finish; Crew Ghost is explicitly last week's total,
not an inferred same-day pace. Replay reads all pages of the existing scoped
activity endpoint and interpolates through chronological activity events using
a fractional cursor, like competition replay. Equal timestamps remain distinct
events. Scale and member colors stay fixed; interpolation is presentation only.
Aggregate weekly totals remain the current reading.

The header contains the crew title, Invite and settings. The teammate lineup
orders weekly distance descending (sessions for strength), keeps four cards in
view and scrolls horizontally with View all when more members are present.
Highlights are non-interactive feed rows. The full-width weekly contract presents existing shared progress. Start Line
and Crew Passport form two action cards, with details kept in sheets. The passport
shows current-week milestones from recorded progress. Session scheduling and RSVPs
retain their existing writes. Highlights appear only for a shared finish or full
participation. Contracts and configurable season passports use the shared program data model
or isolated device storage for offline accounts. See [crew programs](crew-programs.md).
Derby shows aggregate scores from normal sport-event fields in the same wave
and opens team standings. Registration remains in the ordinary event flow.
