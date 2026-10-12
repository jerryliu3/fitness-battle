# Beyond Bounce: four coherent sporting identities

October 12, 2026 · Coded exploration on the merged PR #10 baseline

Open **`/design/evolution`**. This study keeps Split's practical structure — **My track, The field, Splits, Athlete** — and explores what made Bounce memorable: a recognizable silhouette, consistent component shapes, a deliberate type hierarchy, and a specific voice. The aim is a coherent identity with several emotional ranges, rather than a different color applied to the same generic component kit.

Four identities each have all four app screens, counted-activity receipts, optional group inspection, source inspection, archived weeks, and a week-close design preview. **Compare identities** shows the system behind each direction and its proposed evaluation task. These are design hypotheses, not fabricated user-study results.

Typography is distinct across the systems: VOLT uses Bebas Neue display with DM Sans controls; FORM uses Space Grotesk with monospaced evidence; EVEN uses Nunito Sans; CURRENT uses Manrope. The three additional variable fonts are scoped to the exploration and self-hosted through [Next's font optimization](https://nextjs.org/docs/15/app/getting-started/fonts).

| Direction   | Emotional range                 | Character / signature                        | Product grammar                                                                  | Best starting hypothesis                        |
| ----------- | ------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| **VOLT**    | Intense, competitive, assertive | Dash, an aerodynamic hare                    | Lightning cuts, clipped corners, angled figures, race-blue/acid-yellow contrasts | A user who likes a close contest                |
| **FORM**    | Serious, steady, composed       | Pillar, an architectural athlete emblem      | Structural rules, inset labels, square shoulders, graphite/signal-orange details | Quiet credibility and readable evidence         |
| **EVEN**    | Neutral, warm, grounded         | Eddy, a pebble runner                        | Soft squares, sturdy outlines, oval stamps, marigold/cocoa                       | Broad consumer appeal with less pressure        |
| **CURRENT** | Modern, clear, fluid            | Flux, a continuous ribbon with a subtle face | Open loops, circular anchors, sparse type, ultramarine/glacier/white             | A clean app with its own recognizable signature |

Direct links use `?brand=volt|form|even|current&view=track|field|splits|athlete`. For example, `/design/evolution?brand=even&view=field&mode=lanes` opens the 2D track. `mode=pursuit` opens the new third-person world. Routes are public, non-indexed, and require no tracker authorization.

## VOLT — your work, your edge

VOLT is the most intense consumer direction. Dash has long diagonal ears, a sharp silhouette, narrow eyes, and a forward posture. Those angles become cut corners on buttons, numbered entries, result stamps, and the active navigation item. The condensed wordmark, slanted large figures, and decisive blue/yellow contrast carry the same energy without depending on a large mascot.

**My track** uses a yellow sporting poster with a strong personal result. **The field** becomes a blue track with your yellow dot. **Splits** turns imports into clipped numbered marks and a “MOVE MADE” stamp. **Athlete** becomes a yellow identity plate; history retains the same numbered-cut vocabulary. Activity receipts use a blue CTA and a direct numerical result.

The voice is short and assertive: “Your work. Your edge.” “Enter the field.” “Move made.” It celebrates imported effort and never tells a fourth-place athlete they failed. There are no streak penalties, mascot-care obligations, currencies, or demands to exercise again.

**Evaluation:** does competitive energy motivate without adding pressure? Remove the wordmark from a receipt and ask which app it belongs to. Compare the emotional response to first and fourth place; the identity should survive both.

## FORM — a record of your effort

FORM explores seriousness without becoming a professional-only performance dashboard. Pillar is a compact architectural emblem: square shoulders, chamfers, a restrained expression, and no celebratory gestures. It appears as a quiet signature rather than a conversational companion. Its geometry becomes structural rules, inset numbering, and engraved athlete records.

**My track** is an open composition with an exposed baseline and a restrained charcoal character panel. **The field** uses graphite lanes and a clear orange marker. **Splits** is a numbered ledger with “RECORDED” evidence. **Athlete** is an identity plate and a chronological record. Typography combines tightly set heavy sans with small monospaced evidence; surfaces remain white and gray, with orange used deliberately.

The voice is factual: “Inspect your field.” “Effort / recorded.” “Compared at the same cutoff.” The character adds recognition but does not react to every action.

**Evaluation:** does this feel composed and credible while remaining approachable to someone who runs casually? Look for people interpreting the identity as an elite training product. Avoid shrinking essential facts into technical annotations.

## EVEN — keep your own rhythm

EVEN keeps the approachable part of Bounce while lowering the silliness. Eddy is a grounded pebble runner with a modest expression, soft-square body, and oval feet. It acts as a small acknowledgment of activity, rather than an exuberant sidekick. The outline, body shape, and foot shape repeat in soft panels, numbered imports, result stamps, and tactile buttons.

**My track** opens with “A good week, in the making,” a calm result, and a compact character. **The field** uses a pale running surface, cocoa mileage labels, and clear selected-person context. **Splits** says “That one counted” beside an inspectable receipt. **Athlete** gives your weeks a shelf-like record without inventing rewards or progress obligations.

The marigold/cocoa/pale-lemon palette is warm but clear. Substantial rounded lettering and short sentence-case copy keep the UI simple. The button base supplies a small amount of tactility, rather than exaggerated toy depth everywhere.

**Evaluation:** can the app feel friendly without being childish? Ask users to describe the emotion before explaining the intended audience. Then show a receipt without the character: the outline, typography, and vocabulary should still identify EVEN.

## CURRENT — movement, made clear

CURRENT explores a modern, clean identity with enough authorship to remain recognizable. Flux is a continuous ribbon with a subtle face. Its loop becomes a header signature, navigation ring, sync mark, circular score anchor, and archive stamp. Personality comes from a repeating kinetic shape, rather than a large human or animal cartoon.

**My track** uses white space, light figures, a ribbon illustration, and a single clear CTA. **The field** is a glacier-blue track with an ultramarine position marker. **Splits** uses circular identifiers and light flow stamps. **Athlete** is an open white record with circular week marks. Essential numbers stay prominent; sparse annotations remain secondary.

The voice is precise and lightly encouraging: “Find your forward.” “Your week, in view.” “See what changed.” The palette is ultramarine/glacier/white, with an original ribbon signature throughout.

**Evaluation:** does this retain recognition without becoming a generic clean blue app? Show the source row, active navigation, or history stamp in isolation. Test that pale surfaces and small annotations remain readable.

## Why these stay practical

All directions preserve the same navigation jobs and data. Your effort and same-cutoff previous-week comparison lead My track. The field uses running distance with an exact selected-person gap. Splits explains what counted. Athlete preserves closed weeks. Groups remain a secondary header action.

The shared structure is intentional in this study: the question is how four coherent identities change the emotional experience of a proven baseline. The [earlier spatial study](spatial-design-study.md) remains available for comparing radically different interaction mechanisms. This study does not introduce training plans, social feeds, pet care, or a new scoring system to support the characters.

Duolingo's [shape-language account](https://blog.duolingo.com/shape-language-duolingos-art-style/) describes a consistent visual vocabulary extending through illustration and interface, including shapes that remain readable on small screens. The inference here is to make **silhouette, typography, component geometry, voice, and feedback reinforce each other**. Bounce's exuberance is one emotional choice; coherence can also be intense, serious, neutral, or clean. All four characters here are original authored SVG.

## The 2D track — the initial shipping direction

The new field has **nine stable parallel lanes** on a straight vertical running track. A lane belongs to a runner; lane number is never rank. Cumulative kilometers determine vertical position, so a 0.9 km gap is visibly smaller than a 2.8 km gap. Your dot is prominent, selected rivals have a second color, and a past-week ghost can occupy your lane as a separate reference.

Every runner starts at the same zero origin. A checkered starting line sits at Monday 00:00 UTC. The default **Fit field** view keeps the latest sample extent fixed while replaying, so dots actually progress upward from the start. It shows the whole nine-person field. **Follow me** uses a closer moving distance window; calibrated mileage rules scroll below your dot as you advance. Zoom, forward/back arrows, and mouse dragging explore the track. On phones, vertical touch scrolling moves the page; arrows provide track exploration without trapping the user's scrolling gesture.

The track has no 30 km finish or arbitrary maximum. It renders the visible window mathematically instead of adding infinitely many DOM elements. A 39.2 km what-if total expands the overview to 40 km, and a later 119.2 km total can be viewed the same way. The top is a continuation, not a finish line. Chevrons explicitly indicate runners outside a close-up window; their exact mileage remains visible in the field list and inspector.

This is a realistic first product direction: a lightweight SVG, a precise comparison, an obvious self marker, and a small number of useful controls. It needs no game renderer, avatar asset pipeline, or idle animation. The source remains presentation-only in this PR; the merged product field can adopt the component and its existing real/demo data adapter after the design choice.

## Pursuit — third person, from a real starting line

The new Pursuit opens behind a visible articulated runner. Runners have faces, hair/headwear, jerseys, shorts, socks, shoes, and articulated arms and legs. Local skin, kit, and crop/bun/cap controls demonstrate customization; cosmetic choices never change distance, effort, or rank. A front-facing **My avatar** camera lets you inspect the character, while **From above** provides an overview.

The starting line is fixed at world coordinate zero. Each runner uses **absolute accumulated mileage**, with a constant compressed virtual scale. The follow camera moves through that same world alongside you; the origin recedes, kilometer markers pass, and nearby rivals move according to their own imported totals. The road and scenery are recycled around the viewing window so the course can extend without a finish cap. The default snapshot is still; an explicit **Play from start** control replays the week once over ten seconds. Limb poses follow distance during replay, rather than jogging forever while no activity changes.

The fixture is asynchronous weekly activity, not simultaneous racing or GPS. Intermediate movement is labeled interpolation. A zero-origin state precedes Monday's first import. Tuesday's 7.1 km puts your cumulative 13 km 0.6 km ahead of Maya. By Thursday she reaches 20.1 km; your latest 6.2 km brings you to 19.2 km, 0.9 km behind. Reduced-motion playback uses discrete milestones. The exact field and selected person's receipt remain the reliable comparison beneath the visual metaphor.

The implementation is actual Three.js geometry, lighting, shadows, picking, and camera movement. It renders on changes, following the [render-on-demand guidance](https://threejs.org/manual/pages/rendering-on-demand.html). The original character is an **art-direction prototype**, not a finished Fortnite-quality production avatar. The next art step should be a custom skinned character, authored run/idle transitions, a clear silhouette at phone size, controlled outfit variants, and appropriate lower-detail meshes. That work can proceed while the 2D field ships; it does not require adding cosmetic stores or other game systems.

## Evaluate recognition, clarity, and emotional tone separately

Rotate brand order and keep the task data identical. Ask users to find their current result, compare with past-you, inspect Maya's gap, explain a counted import, and retrieve a closed week. After comprehension, ask which emotion each direction conveys and which they would want to return to. Test recognition from a button, receipt, or icon without the wordmark or large character.

For the track, verify that people distinguish lane from rank, understand unequal gaps, recognize offscreen chevrons, and can return from a panned window. For Pursuit, test whether people understand the start is a weekly origin, notice their runner moving forward, identify the nearest rival, and avoid interpreting the replay as live location.

The leading hypotheses are **EVEN for broad consumer warmth**, **VOLT for competitive energy**, **CURRENT for a clean product**, and **FORM for quiet credibility**. Preference should not conceal wrong data interpretations or extra effort needed to find a fact.

## Scope and verification

The public prototype is isolated at `/design/evolution`, based on current main after PR #10. It reads existing design fixtures with a nine-person sample field. Effort and distance stay separate; what-if affects only presentation distance. Archived sample periods are full closed weeks, separate from same-Thursday self-comparison. Native dialogs have explicit close and Escape handling; essential selection is available through native controls and the exact field.

Four model tests cover the zero origin, absolute forward movement, stable lanes, pass/reversal, proportional gaps, unbounded windows, ties, and cosmetic separation. Browser checks cover 48 layouts across 1440/390/320 px, all four app views for all four identities, zero-origin dots, pointer/keyboard selection, panning/zoom, expanded mileage, receipts, optional groups, manual/reduced-motion replay, WebGL fallback, avatar changes, and the runner/camera world-coordinate translation. [Review captures and results](evolution-reviews/README.md) are retained alongside the source.

Verification passed: `pnpm typecheck`, `pnpm test` (33 shared, 10 rankings, and 9 web tests), and `pnpm build:web`. The new route is statically generated, with 17.5 kB of route JavaScript and a separate lazy-loaded 3D world. The final browser review runs against the production build and verifies four distinct font families after font loading.

The installed Next 15.5.27 package does not contain the charter's `node_modules/next/dist/docs/`. Relevant [official version-15 client/server documentation](https://nextjs.org/docs/15/app/getting-started/server-and-client-components) was read before adding the server route and client boundary. No new dependency is required; Three.js was already present. Production settlement, scoring, provider authorization, database writes, and mobile code are outside this exploration.

Names are working concepts, not screened trademarks. Browser rendering uses software WebGL for verification; it does not establish mobile GPU performance or replace accessibility and real-user evaluation.
