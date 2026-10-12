# Five individual-first design directions

October 12, 2026 · Exploration, not a production design lock

The first study made two mistakes: it gave groups the emotional center of the app, and its visual comparison held the leaderboard layout constant. That was useful for inspecting fonts but inadequate for exploring different product experiences. This revision changes the **main object, comparison mechanism, navigation, layout, visual grammar, and vocabulary** together.

The brief is approximately **70% individual experience and 30% optional groups**. Individual includes comparing yourself with other athletes. Every direction opens on your performance; four main destinations cover your week, comparison, activity evidence, and history/identity. Groups are a secondary action in the header. The proportion is a design intention, not a measured engagement statistic.

The coded study is at **`/design`**, separate from the existing application. Use the top direction picker to compare five products. Each has five screens, plus activity, athlete, estimated-pace, source, and archive details. **Evaluate directions** compares interaction hypotheses and failure modes. URLs preserve the selected concept and view, for example `/design?concept=vector&view=compare`.

## What makes the alternatives genuinely different

| Direction  | Main object                                              | Primary gesture or action                                              | How comparison works                                                       | Brand grammar                                                                              |
| ---------- | -------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Split**  | A track with your current week and a previous-week ghost | Rewind score checkpoints; switch track lanes                           | Same-cutoff self-comparison or nearby rivals                               | Scarlet/black, condensed italic type, slash marks, timing-sheet language                   |
| **Bounce** | A winding trail of completed activity                    | Open a move along the trail; reveal the league or inspect a saved week | Personal accumulation first; explicit league placement second              | Violet/yellow, original Bo character, tactile tokens, friendly rounded lettering           |
| **Folio**  | Your weekly sporting edition                             | Read the record, change a comparison column, inspect a dated entry     | A precise side-by-side record with a chronological archive                 | Oxblood/white, editorial serif, rule lines, edition and ledger vocabulary                  |
| **Vector** | Your position in a selectable data field                 | Select a plotted athlete, isolate nearby peers, switch plot/list       | Effort points against counted activities; exact rank/evidence on selection | Cyan/petrol, crosshair mark, monospaced annotations, instrument-like precision             |
| **After**  | A finite personal highlight reel                         | Move directly between three moments; open the receipt                  | Your workout → your previous week → your field                             | Plum/coral/pink, original campaign photography, giant light/italic type, moment vocabulary |

The same fictional Thursday snapshot is used throughout: 96 effort points, three running activities, 19.2 km, 109 minutes, fourth of twelve, versus 80 points at the same previous-week cutoff. Holding **data** constant helps evaluate the changes in comprehension and interaction. Holding the **interface** constant would repeat the original mistake.

## Split — your next line is yours

**Positioning:** a sporting comparison tool for an ordinary athlete who likes a close contest. Personal improvement is the entry; nearby rivals add excitement. It is assertive without battle rhetoric.

**Distinctive assets:** the `SPLIT//` wordmark, scarlet `#FF493B`, near-black `#151515`, tightly set condensed italic display type, square runner markers, and parallel timing lanes. These elements recur in the activity log, athlete bib, comparison track, and result receipt. Primary vocabulary: **track, line, split, field, ghost**.

**Home:** the previous week's gray ghost and your scarlet current-week marker share an explicitly labeled effort-point axis. A range control rewinds Monday, Tuesday, and Thursday checkpoints. The statement beside it changes with the selected cutoff: +4, +12, or +16 points compared with the previous week.

**Comparison:** switch to Maya/You/Leo on adjacent lanes. The rank changes with the checkpoint, and each lane opens the matching checkpoint receipt. A full-field action reveals all twelve athletes' latest Thursday standings. The scale is a score visualization, never a live race route, distance prescription, or fitness rating.

**Activity:** a numbered split log shows each counted contribution and a clear total. The estimated 5 km benchmark remains separate from weekly effort. **Identity:** a racing-bib-style athlete record gives personal volume, time, place, and the previous-week reference. **Groups:** a secondary crew shelf and local join preview.

**Evaluation:** strongest starting hypothesis for the brief because the central comparison is comprehensible, individual-first, and engaging with few interactions. Risk: race imagery can imply speed, live tracking, or a goal. Test whether users can explain the score scale, cutoff, and gap without assuming those meanings.

## Bounce — one good move leads to another

**Positioning:** social comparison can feel friendly and expressive without turning exercise into a task list. Bounce celebrates movement that already happened.

**Distinctive assets:** violet `#7537D9`, yellow `#FFDB38`, light lavender ground, original asymmetrical Bo character, thick token outlines, tactile button bases, and colloquial short copy. Bo's irregular rounded silhouette is the underlying shape language for tokens and saved-week objects. Primary vocabulary: **moves, week, bounce, league, keeps**.

**Home:** a completed-activity trail winds through Monday's 30 cumulative points, Tuesday's 65, and Thursday's 96. Each token opens the imported activity receipt. No uncompleted/future nodes, prescribed workouts, streak threats, lives, currency, or character-care tasks are introduced.

**Comparison:** a league reveal leads with your fourth-place result and then the exact ordered roster. The character provides tone, while numerical standings provide evidence. **Activity:** completed moves become tangible sticker-like entries. **History:** saved-week objects form a collection; the current week is labeled in progress. **Groups:** optional friends/crew shelf rather than the home object.

**Evaluation:** strongest brand-recognition hypothesis because a character, repeated shape language, palette, and vocabulary work together. Biggest risk: people mistake the path for a training plan or daily obligation. Ask what the nodes represent before explaining them, and include users who dislike playful apps in testing.

## Folio — an ordinary week, worth keeping

**Positioning:** an athlete's personal record is meaningful even without a podium. Folio is a considered, grown-up sporting identity rather than a wellness dashboard.

**Distinctive assets:** oxblood `#5C1633` and `#812044` on clean white, expressive Georgia serif and italic, double rule lines, typographic edition numbers, generous margins, and sparse decoration. The record is the visual asset. Primary vocabulary: **edition, ledger, entry, record, archive**.

**Home:** a personal edition leads with a short factual account of the week, then an aligned effort/place/difference record. The newest dated entries are directly inspectable; the comparison action sits beside the ledger. No boxed metric grid or group cover card is needed.

**Comparison:** a selector replaces a column with your previous week or Maya Chen. It keeps effort points, counted activities, and current place distinct. A prior-week current-place cell is a dash rather than an invented equivalence. The complete field remains accessible through an explicit disclosure.

**Activity:** dated ledger entries add context while retaining source and score receipts. **History:** a chronological archive reads like collected editions. **Groups:** optional circles inherit the rule-line and monogram language without becoming the default membership identity.

**Evaluation:** best calm, mature alternative. The main tradeoff is competitive immediacy: reading can take longer than glancing at a track. Test time-to-find-position and whether the prose delays useful facts. The oxblood editorial identity is intentionally separate from the earlier forest/crew concept.

## Vector — know where you stand

**Positioning:** a clear perspective on your activity among peers, with evidence attached. It serves curious tracker users who want context more than cheerleading.

**Distinctive assets:** electric cyan `#52E5D8`, deep petrol `#071B24`, a crosshair/plus signature, monospaced labels, precise axes, and selectable points. Primary vocabulary: **position, field, signal, trace, evidence**. Cyan retains a specific identity for your point and meaningful selection; other athletes remain neutral.

**Home:** your 96 points, fourth-place standing, and previous-week difference orient the user before the plot. The plot's x axis is weekly effort points; y is counted activities. Neither axis claims fitness, ability, quality, or readiness. Height is explicitly not rank.

**Comparison:** choose a plotted person to update the adjacent evidence panel, restrict the plot to nearby peers, or switch to the exact ordered list. Pointer selection resolves the nearest point; keyboard users can select each athlete. The SVG measures its container so axis text does not shrink with a fixed desktop viewBox.

**Activity:** trace each input into its counted receipt. **History:** same-Thursday-cutoff effort bars avoid comparing a partial week with complete weeks. **Groups:** an optional second field, not the entry context.

**Evaluation:** most informative but hardest to learn. A cohort plot could be excellent as a comparison view and excessive as the default home. Test whether people correctly read both axes, distinguish rank from height, and use the list fallback when points are close together. If that fails, keep the instrument-style identity but move the plot to comparison.

## After — you did something for yourself

**Positioning:** capture the satisfaction after ordinary movement. Comparison remains available, but the athlete's experience is the emotional hero.

**Distinctive assets:** dark plum `#1D1120`, coral/pink campaign lighting, warm pale-coral controls, oversized light and italic display type, finite story indexes, and original sports photography. Primary vocabulary: **moment, after, week, versus, history**. Imagery is campaign art, not a photograph of the user's recorded workout.

**Home:** three finite moments: a counted workout, the difference from the previous week, and your current field position. All three are directly selectable with visible labels and previous/next controls. There is no autoplay or endless story/feed. A persistent summary keeps effort, activity count, and rank visible even before switching slides.

**Comparison:** a direct two-person poster switches past you with a nearby rival. Exact effort units stay attached to the values, and the complete field is available below. **Activity:** three visual moments open receipts. **History:** past-week covers open period details. **Groups:** optional Together shelf.

**Evaluation:** strongest lifestyle/campaign identity, with the greatest risk of putting spectacle ahead of facts. Test whether someone can reach their current rank and source receipt immediately, understands the reel has only three items, and can use the app with reduced motion. The prototype deliberately leaves every essential action visible and never advances a story on its own.

## Page-by-page interaction comparison

| Job                           | Split                                                | Bounce                                   | Folio                                | Vector                            | After                                               |
| ----------------------------- | ---------------------------------------------------- | ---------------------------------------- | ------------------------------------ | --------------------------------- | --------------------------------------------------- |
| Understand my week            | Rewind a personal ghost race                         | Inspect a completed-move trail           | Read my current edition              | Locate my point and status        | Choose one of three highlights                      |
| Compare against others        | Switch to adjacent rival lanes                       | Reveal the league roster                 | Replace a comparison column          | Select, isolate, or list peers    | Flip past-you versus a rival                        |
| Understand counted activity   | Open a numbered split receipt                        | Open a trail token or move sticker       | Inspect a dated ledger entry         | Trace a source input              | Open the evidence behind a moment                   |
| Remember past effort          | Inspect athlete/ghost record                         | Collect saved-week objects               | Browse chronological editions        | Compare same-cutoff history bars  | Open a past-week story cover                        |
| Connect a tracker             | Source receipt → permission preview → import preview | Same required steps in the playful brand | Same steps as an activity archive    | Same steps as a traceable source  | Same steps as the origin of a moment                |
| Join a group optionally       | Crew membership beside the individual field          | Optional friends beside league/history   | A circle beside the personal edition | An additional group field         | Together beside my moments                          |
| Inspect Pace                  | Estimated benchmark in the log                       | Estimated benchmark among moves          | Separate ledger benchmark            | Explicit evidence/estimate detail | Can use the existing published rankings destination |
| Inspect official race results | Existing `/rankings`, separate from effort           | Same                                     | Same                                 | Same                              | Same                                                |

The initial page concepts remain archived in [the first study](design-exploration-v1.md). The coded second study focuses on the five main experience jobs and their inspect/join/connect flows rather than creating a dozen main navigation destinations.

## What the research contributes

- Duolingo documents how its [shape language](https://blog.duolingo.com/shape-language-duolingos-art-style/) evolved into a recognizable system across illustrations and UI. The inference here is to make palette, shape, vocabulary, and feedback mutually reinforcing. Bounce explores that principle with an original character; it does not copy Duo or a workout-task model.
- Strava's [group challenges](https://support.strava.com/en-us/articles/15401736-how-do-group-challenges-work-on-strava) distinguish competition formats and shared goals. The inference here is to keep your individual comparison and optional private group comprehensible and separate, with visible scoring rules.
- Runna's [navigation guide](https://support.runna.com/en/articles/10473504-your-quick-guide-to-navigating-the-runna-app) distinguishes immediate work, history, and setup. We preserve clear destination jobs while exploring different objects for this simpler app.
- [Shameli et al.](https://arxiv.org/abs/1702.07437) found highly unequal participant composition weakened engagement in observed walking competitions. Split emphasizes nearby rivals, while Vector lets people inspect that context. This does not prove any of these layouts improves retention or activity.
- Goalmaxxing's prior design work supplies the discipline: separate navigation jobs from styling, lead with the relevant object, keep detail inspectable, and let interaction clarify evidence. Its calendar/goal architecture and cream palette are not transferred to this app.

## How to evaluate these concepts

The in-app evaluation panel is a reasoned design critique, **not** fabricated usability results or numeric quality scores. Current leading bets are **Split for comparison clarity** and **Bounce for distinctive consumer branding**. Folio, Vector, and After are intentionally substantial alternatives, not features to stack onto that same home screen.

Use identical data and rotate the order of concepts. Include competition-seeking tracker users, casual fitness users, and people who already use a tracker but do not want another demanding app. Ask users to:

1. Explain how their week is doing and locate their current place without guidance.
2. Compare with their previous week, then with a nearby competitor.
3. Find why a workout counted and identify the source.
4. Distinguish cumulative weekly effort from an estimated pace benchmark and an official race result.
5. Join an optional group, then return to their personal week.

Record task completion, hesitation, incorrect interpretations, perceived pressure, and which visual/name people remember after a delay. Assess preference after comprehension. A small directional study can identify friction; it cannot establish retention or health benefits.

## Implementation and validation

- `/design` is a public, non-indexed, presentation-only route with a small server page and a client interaction boundary. It reads local fixture data, not fitness APIs or production state.
- Five concept experiences, five views each, responsive desktop/phone layouts, native keyboard-accessible dialogs, manual story controls, reduced-motion support, and URL-restorable selections.
- Existing routes, CSS tokens, scoring, SQL, trackers, and the platform-agnostic shared package are unchanged. Alternate palettes are confined to this explicitly requested design exploration.
- The installed Next.js package is 15.5.27 and does not ship the charter's `node_modules/next/dist/docs/` directory. Relevant [version-15 routing](https://nextjs.org/docs/15/app/getting-started/layouts-and-pages) and [client/server](https://nextjs.org/docs/15/app/getting-started/server-and-client-components) documentation was checked instead.
- Monorepo typecheck, shared/rankings tests, production web build, browser layout checks, interaction checks, and screenshots are the verification gates. Browser evidence and final results are recorded in `docs/design-reviews/`.

## Original image asset

`apps/web/public/design/after-motion.png` was generated with the **built-in imagegen tool**, inspected, and copied into the project. It is an original campaign concept rather than a stock reference or screenshot. Bo and the plots are authored SVG, not raster stand-ins for app UI.

Final image prompt:

> Use case: ads-marketing. Asset type: original photographic background for a consumer fitness app design concept called AFTER; no written branding in the image. Create a sophisticated cinematic editorial sports photograph in a vertical 2:3 composition. A single adult runner in a minimal unbranded coral-red technical shirt, captured from behind at a slight side angle mid-stride at blue hour, with expressive but believable subtle motion blur. Subject occupies the right half of the frame, leaving the upper left and lower left as dark negative space suitable for large white typography overlaid by code. Urban track environment abstracted into streaks of hot coral, magenta, and amber light against deep plum-black shadows. Analog film texture, direct-flash highlight on fabric, authentic everyday athletic energy rather than bodybuilder or polished model. Mood is the satisfying feeling after getting outside and moving, expressive and premium contemporary campaign art. Dramatic dark scene with bright color tightly concentrated around the runner and motion streak. Avoid logos, text, watermarks, illustration, UI, faux charts, or extra people.

Names are working brand concepts. No name availability or trademark screening is implied.
