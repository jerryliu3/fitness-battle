# Five spatial ways to compare a week

October 12, 2026 · Working prototype, not a production design lock

An ordered leaderboard answers “what place am I?” but gives the same visual space to a 0.9 km gap and a 2.8 km gap. This study makes accumulated activity determine position in a world. It follows the individual-first brief: your total, your nearby rival, your previous week, and the effect of your imports are the primary objects. Group activity can provide an optional field later.

Open **`/design/spatial`**. Every scene has a direct public route and uses local synthetic fixtures without requiring an account. **Compare the concepts** explains the five mechanisms, advantages, risks, and test tasks. The [brand study](design-directions-v2.md) remains separate: these five concepts explore comparison mechanics, rather than five new palettes for one leaderboard.

| Concept           | Direct route                       | Spatial encoding                                          | Distinct interaction                                                        | Main hypothesis                                         |
| ----------------- | ---------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Pursuit**       | `/design/spatial?scene=pursuit`    | Signed mileage gap sets 3D depth from you                 | Look ahead/behind, change camera, select a runner, preview a pass           | A nearby contest feels immediate                        |
| **Distance path** | `/design/spatial?scene=path`       | Mileage sets position on a calibrated axis                | Zoom around yourself, pan, switch horizontal/vertical, inspect a mark       | Unequal gaps become understandable                      |
| **Circuit**       | `/design/spatial?scene=circuit`    | Total becomes completed laps plus within-lap position     | Orbit a miniature track, inspect lap count, focus a runner                  | A sporting object feels playful and tangible            |
| **Switchback**    | `/design/spatial?scene=switchback` | Mileage sets arc-length progress along a curved 3D course | Orbit, zoom, view from above, focus a runner                                | A continuous landscape makes the whole field explorable |
| **Week replay**   | `/design/spatial?scene=replay`     | Cumulative mileage sets progress along parallel lanes     | Scrub imports or manually play the milestones; inspect the pass explanation | Comparison feels connected to automatic syncing         |

## Pursuit — the gap feels real

This is a real perspective scene with selectable 3D runner meshes. You occupy the camera position. Maya, 0.9 km ahead, appears close; Mina, 6 km ahead, appears smaller and farther away. Look behind to inspect trailing athletes or view the field from above. A what-if distance slider makes people move relative to your position, including crossing behind you when you pass their total.

The depth coordinate is the signed mileage gap multiplied by a constant visual scale. Perspective then naturally changes apparent size. This is a compressed virtual race, not a depiction of a 900-meter physical gap. Lateral lanes separate avatars and do not encode rank. Labels prioritize the selected person and your nearest comparison context; the exact field below remains available for everyone.

**Likely strength:** the closest rival is an emotionally useful object. **Failure mode:** people may assume the athletes are exercising simultaneously or that apparent size is an exact ruler. **Test:** identify the closest person ahead and read their mileage gap, then explain what the positions mean. Ask this before explaining that the scene summarizes a week.

## Distance path — a rank is not a gap

The horizontal path uses a single 0–30 km axis. Your 19.2 km, Maya's 20.1 km, and Leo's 16.4 km create visibly different intervals. Marker locations are proportional; label lanes only prevent collisions. All twelve people are selectable. Zoom around yourself uses a 10 km window; pan changes that window without changing any totals. A bird's-eye option rotates the primary distance axis into a vertical path.

This provides a precise alternative to the perspective view. It can also become the automatic fallback when 3D rendering is unavailable. Units convert the display consistently while the kilometer model and ranks stay unchanged.

**Likely strength:** clearest reading of relative gaps. **Failure mode:** close totals overlap, especially on phones. Zoom, selection, a detail panel, and the exact field address that limitation. **Test:** explain why third-to-fourth is closer than fourth-to-fifth and find both numerical gaps. Repeat with the zoomed and vertical views.

## Circuit — your week, on a loop

A real 3D miniature track translates each 5 km into one virtual lap. Runners occupy the corresponding position around the track; completed laps and full mileage stay attached to selected runners. You can orbit, zoom, inspect from either side, view from above, or focus a particular person. Lane offsets separate meshes; every runner uses the same 5 km conversion.

Unlike Pursuit, this is a shared object you inspect from outside. It creates a strong sporting metaphor without needing a large world. The exact list remains essential: Maya at 20.1 km is on her fifth lap while you at 19.2 km are near the end of your fourth. A position around a loop alone cannot communicate the full order.

**Likely strength:** compact, approachable, collectible-feeling representation. **Failure mode:** lap wrapping can reverse the apparent order. **Test:** distinguish someone across the start line from someone a full lap behind. If lap counts do not resolve this quickly, use Circuit as an optional playful view rather than the default standings.

## Switchback — see the shape of the field

This world uses a curved route over simple authored terraces. Runner placement follows distance along the curve's **arc length**, rather than equally spaced rank or equally spaced control points. You can explore the bends, inspect the field from above, and focus a runner. A synthetic 30 km reference course accommodates the fixture field and the what-if range.

Height is scenery and does not encode real elevation gain, grade, difficulty, or effort. The course is not GPS or a geographical map. Screen-space proximity around a bend is also not route distance; the selected mileage gap stays visible as the reliable comparison.

**Likely strength:** most exploratory overview of accumulated progress. **Failure mode:** curves and elevation can obscure who's actually near you. **Test:** find yourself and your nearest rival, then explain why two avatars that look close across a bend can be farther apart along the route.

## Week replay — how the picture changed

A bird's-eye lane replay connects weekly positions to imported activity. The fixture progresses from Monday to Tuesday to Thursday. Your Monday import is 5.9 km and fifth place. Tuesday's 7.1 km brings your total to 13 km and third place, 0.6 km ahead of Maya. On Thursday, Maya reaches 20.1 km; your 6.2 km import brings you to 19.2 km and fourth place, 0.9 km behind her.

The timeline has explicit milestone buttons and a range control. Playback starts only on request and stops after one eight-second replay. Intermediate frames are labeled **replay interpolation**. Reduced-motion playback uses the three discrete milestone states. Lanes identify people; horizontal progress encodes mileage, not rank.

**Likely strength:** best explanation of what syncing did to the comparison. **Failure mode:** animation can imply a live race or invented activity timestamps. **Test:** explain Tuesday's pass and Thursday's reversal from the imported totals. Verify that users understand the motion between checkpoints is presentation interpolation.

## Visual frame and common interactions

The working frame is **FIELD**: forest ink, acid lime for you, apricot for the selected rival, and lavender for past-you. A condensed wordmark and prominent mileage counter give the field a consumer sporting identity. Light miniature worlds and a dark POV world keep each representation legible. The frame is intentionally consistent so the study isolates the radically different spatial mechanisms. It can later inherit Split, Bounce, or another brand from the parent study.

Every concept supports the same useful evidence: a selected person's total and signed gap; the same-cutoff weekly context; km/mi; a previous-week ghost; milestone rewind; a distance receipt; a hypothetical extra-distance preview; and a full selectable field. The ghost is never included in standings. Tied totals share a competition rank. The what-if control is clearly marked and never logs a workout or edits a recorded total.

The UI uses the **weekly running-distance** comparison for this study. It does not turn production effort points or Elo into invented kilometers. Fictional athletes are presentation fixtures, and no provider is claimed to be connected. Weekly bounds remain Monday 00:00 to the next Monday 00:00 UTC.

## What Zwift contributes

Zwift's [cycling HUD guide](https://support.zwift.com/using-the-heads-up-display-when-cycling-rJepA4beS) combines spatial context, nearby riders, and numerical data. Its [Just Watch guide](https://support.zwift.com/en_us/just-watch-HJtUTLdVS) describes selecting another athlete and changing camera views. The design inference here is that **where you are, who is near you, and the exact gap** can reinforce each other. This prototype adapts that spatial relationship to asynchronous imported totals. It does not add live multiplayer, power telemetry, or a workout simulator.

The rendering implementation follows the primary Three.js documentation for [perspective cameras](https://threejs.org/manual/pages/cameras.html), [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [ray picking](https://threejs.org/manual/pages/picking.html), and [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html). [CatmullRomCurve3](https://threejs.org/docs/pages/CatmullRomCurve3.html) supplies the Switchback route. Geometry, lighting, runners, and scenery are authored in code; no downloaded game assets or raster screenshots stand in for the interaction.

## Evaluation before choosing a default

These are design hypotheses, not results from a user study. Use identical fixtures and rotate concept order. Measure correct nearest-rival identification, correct gap interpretation, time to inspect the source total, and confusion about real location, laps, elevation, or interpolation. Ask about visual preference only after comprehension tasks.

The leading combination is **Pursuit for immediacy**, **Distance path for precise comparison**, and **Week replay for the evidence behind a change**. That does not require three equally prominent navigation destinations: Pursuit could open the comparison, with Path as an explicit precision view and Replay attached to the latest import. Circuit and Switchback should earn their place by improving comprehension or enjoyment during testing.

## Implementation and verification

- Route `/design/spatial` is public and non-indexed. Scene URLs are restorable and require no tracker connection. The brand study links to this route.
- Three.js loads dynamically only for the spatial client boundary. Three actual 3D scenes use camera controls and mesh raycasting; DOM selection buttons and the exact list provide keyboard alternatives. The canvas itself is decorative for assistive technology.
- Rendering happens on changes, rather than an idle animation loop. Pixel ratio is capped at 2. Scene geometry, materials, observers, event listeners, controls, and WebGL contexts are disposed on unmount. Creation failure or context loss switches to the interactive Distance path.
- Five model tests verify unequal gaps, milestone pass/reversal, threshold ties, interpolation bounds and ghost separation, and unit conversion. This fixture module is separate from production/shared scoring.
- Final checks passed: `pnpm typecheck`, `pnpm test` (21 shared, 10 rankings, and 5 spatial-model tests), and `pnpm build:web`. `/design/spatial` is statically generated; its initial route payload is 9.39 kB plus shared chunks, with the 3D world loaded separately.
- Browser verification covers all five scenes at 1440, 390, and 320 px. It checks actual WebGL creation for all three worlds, camera pixel changes, orbit/focus, look-behind/aerial controls, what-if pass/reset, units, ghost, native receipt dismissal, path zoom/pan/orientation, replay milestones/play/pause, and reduced-motion mode. Screenshots and machine-readable results are in [spatial reviews](spatial-reviews/README.md).
- Next.js code uses a server page and client interaction boundary. The installed Next 15.5.27 package lacks `node_modules/next/dist/docs/`; the relevant [official version-15 routing](https://nextjs.org/docs/15/app/getting-started/layouts-and-pages) and [client/server documentation](https://nextjs.org/docs/15/app/getting-started/server-and-client-components) was read as the fallback.

This exploration does not establish performance on every mobile GPU or replace an accessibility audit. Large fields, live tracker integration, camera occlusion, and final character art need evaluation before shipping a production world. No database, tracker API, ranking ingestion, mobile app, or period/scoring semantics are changed by this prototype.
