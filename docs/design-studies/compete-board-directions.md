# Compete: ten ways to feel distance

October 19, 2026 · Research and concept scope · No production design selected

**October 20 review:** the user selects Session Tapestry and Distance Ribbon for detailed 2D prototypes, with both orientations still open, and reserves Horizon Pursuit for the 3D view with trees/scenery. Parkland is useful inspiration for GPS-distance surroundings but is not selected for non-GPS effort. The coded followup is at `/design/boards`; its [integration notes](../../apps/web/src/app/design/_studies/board-lab/README.md) describe controlled renderers, fixtures and the path to production adoption. The ten directions below remain exploration history, not ten production modes.

## The problem is the ground, not just the racer

Compete needs to answer three different questions at once: **How far have I gone? How far apart are we? What did my latest effort change?** An attractive capsule answers none of these by itself. The board must make distance visible even when the athlete stays centered.

There is a specific implementation issue behind the current impression. In `apps/web/src/features/focus/arena-lanes.tsx`, the seven grid values are generated as `bounds.min + bounds.span * i / 6`. Projecting those values back through the same bounds puts them at the same seven screen positions after every pan. Their numbers change, but the lines do not travel. `apps/mobile/src/ui/lane-track.tsx` uses the same pattern. The lane dividers and background gradient are also attached to the viewport. This is code inspection, not a claim of having reproduced every gesture in the running app.

The repair underneath any direction: generate marks at absolute distances such as 18.0, 18.5, 19.0 km, then project them through the camera window. An 18 km mark retains its identity as it enters, travels through, and leaves the screen. Surface texture and landmarks also belong to absolute coordinates. Pan moves that world; follow mode moves the camera through it. UI controls stay attached to the screen. Zoom can change tick density while preserving a clear distance anchor.

Movement alone is insufficient: identical repeating stripes communicate motion but little accumulated achievement. Combine **fine texture for travel, numbered marks for measurement, and memorable larger anchors for how far you have come**.

## Starting point and boundaries

Use the current Open Field shell: warm white, charcoal, restrained gold, DM Sans and floating field controls. Keep the new polished Solar Gold / Cool Platinum capsules as the constant across the study. This is a board exploration, not another character or app-shell redesign.

Existing work worth reusing:

- `docs/spatial-design-study.md` and `/design/spatial`: Distance Path, Circuit, Switchback, Pursuit and Week Replay already explore distinct spatial mechanisms. Circuit explicitly documents lap-order ambiguity.
- `docs/design-evolution.md` and `/design/evolution`: the fixed start, absolute distance, recycled scenery, follow camera and counted-import replay in Pursuit are particularly relevant.
- `docs/material-and-motion-concepts.md`: Glass Track supplies the floating controls/inspector; Finish-Line Moment supplies an integrated return reveal.
- `/design/pass` and `docs/design-studies/the-pass/`: capsule materials, size, wakes and Afterimage identity. These establish marker character; they do not yet establish a distance world. A decorative flowing wake must not be the only evidence of progress.

Keep stable athlete lane identity, own-lane centering, unranked prior-self comparison, truthful offscreen totals, explicit Center me and Fit field. Default distance view remains ±3 km around the athlete. Non-distance contests retain their actual units; no conversion of effort points into pretend kilometers. Some concepts below would deliberately replace the straight-lane geometry and need a separate design decision before implementation.

The following are original adaptations and design hypotheses. References establish the mechanism being borrowed, not proof that a concept will motivate Overtaek users.

## 1. Measured Track — distance as ground crossed

**Picture:** a beautiful straight athletics track seen from above. Quiet pale mineral or rubber surface, strong sideline calibration, thin lane rules, larger kilometer stamps and occasional transverse split lines. Gold and platinum capsules remain the focal points. The whole board has a physical sporting surface rather than a floating green grid.

**Progress:** calibrated marks and texture move beneath the camera. A new 2.2 km contribution visibly crosses two kilometer boundaries, with the last credited position briefly retained behind you. Passed distance stays lightly washed; untraveled ground stays quiet. Smaller ticks give even modest gains visible scale.

**Compact:** three to five nearby lanes, the next kilometer marker, true rival gap and a clear scale. **Expanded:** the same ground extends into a larger window; add the start-distance overview and more peers without resetting the camera or selection.

**Reference:** real athletics marking plans, especially their hierarchy of lane rules, transverse marks and start lines ([World Athletics technical documents](https://worldathletics.org/about-iaaf/documents/technical-information)). Borrow the sporting vocabulary, not staggered starts or an artificial finish for a weekly accumulating contest.

**Why explore:** strongest continuity with the product and clearest distance reading. **Tradeoff:** can still feel repetitive unless major markers and recorded progress leave distinctive evidence. **Scope:** small–medium; the world-coordinate repair benefits every later concept.

## 2. Parkland Passage — distance as places passed

**Picture:** a sunlit pedestrian promenade through an illustrated park. A broad path contains understated parallel athlete channels; trees, benches, bridges, planting beds and courts create recognizable surroundings. Sparse foreground detail moves more noticeably than distant scenery.

**Progress:** the 18 km bridge stays at 18 km. Next visit, you are beyond it near the 20 km courts. You can remember where you were without reading every number. Scenery has fixed spacing and seeded identity, so the world does not regenerate into a different park when panning back.

**Compact:** one recognizable landmark behind, one ahead, nearby peers on a straight readable path. **Expanded:** wider park edges, an optional tilted view and a course overview; the path still has a calibrated distance spine.

**Reference:** [The Conqueror's route progress](https://www.theconqueror.events/newyork/) ties workout distance to virtual places and postcards; [Alto's Odyssey](https://altosodyssey.com/press/) offers a landscape vocabulary worth studying. Our inference is to use recognizable surroundings and layered depth, without importing a challenge store or endless-runner game loop.

**Why explore:** likely the best combination of Open Field warmth and immersion. **Tradeoff:** scenery can crowd the comparison; fabricated places must read as a shared illustrated course, not anyone's GPS location. **Scope:** medium, with ongoing art work if many environments are wanted.

## 3. Pocket Stadium — distance as laps banked

**Picture:** a compact oval athletics stadium with an infield, lane curves, a timing stripe and capsule racers. The board becomes a sporting object you can look around, instead of an endless sheet.

**Progress:** each fixed distance circuit adds a completed-lap bead and increments a prominent total. A pass at the stripe produces a brief photographic split moment. The stadium makes repetition itself satisfying.

**Compact:** whole oval, you plus the nearest rivals, and unavoidable lap counts. **Expanded:** larger stadium, selectable athletes, completed-lap record and a linked unwrapped distance ruler for exact gaps. Every athlete uses the same distance conversion despite different drawn lane radii.

**Reference:** real athletics circuits and the existing `/design/spatial?scene=circuit` prototype. A 5 km display circuit could be used as in that study, but it must be labeled as a virtual scale rather than a regulation track.

**Why explore:** strongest immediate sporting recognition and a distinctive object. **Tradeoff:** someone behind on screen may be a lap ahead in total. This is a substantial comprehension risk, not a minor labeling issue. **Scope:** medium–large; likely an alternate view unless lap tests succeed.

## 4. Switchback Trail — distance as a journey through terrain

**Picture:** one winding course through a quiet topographic landscape. Parallel ribbons carry stable athlete identities around bends. The landscape is seen from above, with a little depth; the route already covered has a subtle gold trace.

**Progress:** kilometer cairns, switchback turns and named sections create a lasting shape to the week. Position follows measured distance along the route, not straight-line distance across the screen. A new import traverses a real section of that curve.

**Compact:** close crop around your current bend, with the nearest rival's along-route gap. **Expanded:** fit the course and the field, tap a distant athlete, or return to the close following crop. Keep the same course geometry between modes.

**Reference:** existing Switchback prototype; [Relive](https://www.relive.com/app) demonstrates activity stories through animated 3D routes. Overtaek's proposed course is illustrative and shared, rather than a reconstruction of each athlete's actual route.

**Why explore:** strongest explorable journey and weekly visual memory. **Tradeoff:** athletes on neighboring bends may look deceptively close. Terrain must not suggest that distance is elevation gain or that later sections count for more. **Scope:** large; existing prototype lowers exploration cost.

## 5. Pool Deck — distance as lengths completed

**Picture:** a crisp overhead aquatic field: tiled floor, lane ropes, end-wall T marks, faint caustics and small capsule wakes. Each athlete has a personal strip showing successive lengths, rather than all swimmers wrapping onto one ambiguous length.

**Progress:** each completed module stays behind as a filled length tile; the capsule advances within its current module. A turn touches a wall and begins the next length. For swimming, use actual pool-length semantics where supported. For running, any kilometer-sized module must be clearly abstract and would be a more controversial metaphor.

**Compact:** current length plus a short bank of completed lengths and explicit total. **Expanded:** unfold the stacked lengths into a tiled distance ledger, compare athletes and inspect a length's counted sessions. Never infer actual swimming splits from aggregate weekly totals.

**Reference:** physical pool markings and the prominent end/turn cues described in [British Swimming's referee notes](https://www.swimming.org/assets/uploads/library/BS_Referee_TrainingNotes2016v1.1.pdf). Borrow perceptual landmarks rather than treating older technical notes as current rules.

**Why explore:** strongest tactile lane-specific alternative and a natural home for glass capsules. **Tradeoff:** water can falsely imply a swimming contest. More promising as a future sport-specific environment than the universal running default. **Scope:** medium–large.

## 6. Ridgeline Steps — distance as height earned

**Picture:** an architectural hillside of shallow terraces or stadium steps. Each athlete's narrow staircase rises through equal distance bands, with their capsule resting on the current landing. Completed terraces remain visible beneath them.

**Progress:** every kilometer creates a solid step you have earned. Fractional distance advances continuously along the current riser/landing treatment; passing the next threshold lifts the capsule and camera one level. It should feel like building upward, not bobbing on a decorative staircase.

**Compact:** a close vertical slice with two or three adjacent stairways and numbered distance levels. **Expanded:** a wider isometric terrace model showing accumulated foundations and neighboring athletes. Keep an exact common scale alongside the perspective.

**Reference:** stadium stair training and physical climbing holds, plus the real-exercise-to-world-progression relationship in [Ring Fit Adventure](https://www.nintendo.com/us/store/products/ring-fit-adventure-switch/). The specific terraced board is an original proposal.

**Why explore:** makes accumulated work feel substantial even at a still snapshot. **Tradeoff:** people may read height as actual climbing or hierarchy of worth. Label distance, avoid mountain summits and arbitrary finish heights, and test that interpretation. **Scope:** medium–large; abstract effort-point contests may fit this better than running distance.

## 7. Distance Ribbon — distance as a tangible measure

**Picture:** a broad horizontal measuring ribbon running through the screen. Each athlete owns a thin parallel band; glass capsules sit at their exact totals. Large embossed kilometer numbers, small subdivisions and quiet paper-like surface detail make it feel like an object being unrolled.

**Progress:** your ribbon extends as distance is credited. In follow mode the tape travels sideways under the capsule; in overview the growing colored extent stays visible from zero. It makes a 0.9 km gap physically different from 2.8 km with minimal scenery.

**Compact:** sideways comparison with you and the nearest rivals, one exact gap bracket and the next numbered mark. **Expanded:** longer visible ribbon, all stable athlete rows, optional vertical orientation and a tiny zero-to-total overview. This deliberately explores replacing the current vertical orientation.

**Reference:** measuring tapes, athletics split boards and the existing Distance Path prototype. [Concept2's paceboat display](https://www.concept2.co.uk/service/monitors/pm3/how-to-use/using-monitor-display-options) is a useful precedent for combining a simple spatial comparison with precise data; Overtaek's gaps remain accumulated distance, not live pace.

**Why explore:** clearest minimal option and best transfer to effort-point units. **Tradeoff:** less immersive; may feel like a refined chart unless typography, surface and the advance interaction have character. **Scope:** medium.

## 8. Checkpoint Islands — distance as places reached

**Picture:** a chain of small athletic grounds or islands connected by a narrow continuous path. Each island marks a meaningful distance boundary; capsules can occupy any position on the connectors. Reached islands remain visibly stamped behind you.

**Progress:** a 400 m session still moves the capsule partway toward the next place. Crossing a checkpoint briefly activates it. Larger sections introduce a new landmark or scenery chapter, while precise progress never snaps to nodes.

**Compact:** current island, next island and the intervening rivals. **Expanded:** the connected chain becomes a navigable weekly atlas with course sections and exact totals. Stable small offsets separate athletes without equal-spacing them by rank.

**Reference:** [Duolingo's path](https://blog.duolingo.com/new-duolingo-home-screen-design/?region=central-and-eastern-europe) makes progress legible through sequential places; [The Conqueror](https://www.theconqueror.events/newyork/) links distance to destination milestones. Borrow chaptering and visible history, not compulsory lesson gates or artificial weekly completion.

**Why explore:** strongest broad consumer sense of arrival and anticipation. **Tradeoff:** can become a childish level map or imply an obligation to reach the next checkpoint. This also needs to remain distinct from Home's existing session path. **Scope:** medium–large.

## 9. Session Tapestry — distance as work that stays

**Picture:** each lane is built from translucent, fabric-like distance strips. One counted workout contributes one proportional segment. The capsule sits at the top of a growing stack; subtle seams show where individual efforts joined. Across the board, everyone has literally built their own track.

**Progress:** a 2.2 km workout lays down 2.2 km of new material, then the capsule traverses that segment. It remains visible after the reveal. At a glance you see both the total and the work that produced it, even when rank did not change.

**Compact:** common distance window, the most recent seam, your next rival, older strips continuing below. **Expanded:** zoom out toward the start to inspect the week's whole construction; tap a segment for the existing counted-session receipt. Compare on distance, never on equal-sized session blocks.

**Reference:** cumulative stacked measures and the project's counted-session/return-reveal work. [Nike Run Club](https://www.nike.com/nrc-app?es_p=801892) is a broader reference for making recorded running and progress central, not a claim that it already has this particular board.

**Why explore:** most direct answer to “celebrate people's efforts,” including weeks with no overtakes. **Tradeoff:** requires genuine per-session contributions for each visible athlete and suitable access; totals alone cannot invent seams. Many tiny workouts require aggregation. **Scope:** medium with authorized activity data, larger if the current field API lacks it.

## 10. Horizon Pursuit — distance as forward travel

**Picture:** a restrained 2.5D athletics corridor seen just above and behind your capsule. The track narrows toward the horizon. Split gates, track-side planting and light poles establish depth; rivals occupy stable channels ahead and behind. It should feel like a human-sport venue, with no vehicles, road traffic or motorsport chrome.

**Progress:** follow mode holds you in a comfortable screen location while track marks grow nearer and pass beneath you. A counted-distance reveal moves the world through the camera; scenery is still once the update is complete. A prior-self capsule is a quiet reference, never an endlessly racing opponent.

**Compact:** shallow perspective, few rivals, exact gap label and tiny linear field overview. **Expanded:** deeper venue, more surroundings, look ahead/behind and an overhead precision option. Camera change retains the same totals, world location and selected athlete.

**Reference:** the existing Pursuit world and [Zwift's running HUD](https://support.zwift.com/de/using-the-heads-up-display-when-running-rk7qR2zvr), which brings together spatial context, a minimap, nearby athletes and running data. This adapts that relationship to asynchronous totals.

**Why explore:** strongest feeling of moving through space. **Tradeoff:** perspective makes distant gaps hard to judge and increases rendering/gesture complexity. A 2.5D sketch can explore the sensation before committing to a new 3D art pipeline. **Scope:** large for production; lower for an isolated study.

## How I would narrow the field

These are editorial judgments, not measured scores or a user preference decision.

| Direction | Primary reward | Compact reading | Expanded payoff | Main uncertainty |
| --- | --- | --- | --- | --- |
| Measured Track | Ground crossed | Strong | More field and distance context | Repetition |
| Parkland Passage | Places passed | Strong if art stays peripheral | Rich surroundings | Scenery versus clarity |
| Pocket Stadium | Laps banked | Lap labels essential | Inspectable sporting object | False apparent order |
| Switchback Trail | Journey explored | Needs a close crop | Whole-course exploration | Along-route versus visual proximity |
| Pool Deck | Lengths completed | Strong within a swim context | Unfolded lengths | Sport mismatch |
| Ridgeline Steps | Height built | Strong levels, abstract meaning | Dimensional accumulated work | False elevation inference |
| Distance Ribbon | Measurable extent | Strong | Whole-week comparison | Emotional richness |
| Checkpoint Islands | Arrivals collected | Strong local chapter | Weekly atlas | Level-map and Home duplication |
| Session Tapestry | Work made permanent | Strong if seams stay quiet | Inspectable contribution history | Available session data |
| Horizon Pursuit | Forward travel | Exact gaps need support | Most immersive venue | Perspective and cost |

**First comparison: Measured Track, Parkland Passage, Session Tapestry and Horizon Pursuit.** They test four useful answers: precision, place, accumulated effort and immersion. Keep Distance Ribbon as the calm precision control. Retain the other five as real alternatives rather than quietly choosing a default now.

A promising eventual combination is Measured Track's calibration + Parkland Passage's sparse landmarks + Session Tapestry's most recent contribution. It should be considered only after the separate directions are compared; adding everything immediately would hide which mechanism actually helps. Horizon Pursuit can be the expanded or alternate view if users value its immersion enough to justify the extra complexity.

## Shared compact / expanded and motion requirements

- Compact is a useful local view, not a tiny full course. Preserve page scrolling on touch and make exploration deliberate through expansion or existing controls.
- Expansion grows one continuous scene. Keep the athlete location, selected rival, camera anchor and zoom intention; do not rebuild into a different world. Collapsing returns to the same local context.
- Pan moves fixed ground, numbers and landmarks together. Decorative distant layers may use mild parallax; metric marks and racers share the true distance transform.
- Follow mode may hold the athlete still on screen, but the ground must travel. A small global overview or distance-from-start cue preserves accumulated achievement when the start is offscreen.
- A credited contribution gets one finite reveal, a brief previous-position trace, the amount added and the actual result. Celebrate the distance when rank stays the same. Imported activity is asynchronous; animation is a compressed presentation, not measured live speed.
- Wakes can support the identity, but cannot imply ongoing distance accrual while the weekly total is unchanged. Reduced motion shows the same before/after facts without camera travel.
- There is no invented weekly finish, fixed maximum or “100% complete” state. Milestones are reference places along an extensible field. Outliers keep true totals and explicit offscreen indicators.
- Units and scales are always visible. Separate distance position from effort-based standing when those orders differ; do not label a distance overtake as an official rank improvement unless the competition rules support it.

## A useful next study

Prototype the four first-comparison boards with the same capsules and data, at 390 px and 320 px, in compact and expanded states. Use You 19.2 km, Maya 20.1 km and Leo 16.4 km, then a clearly fictional +2.2 km contribution. Include a smaller +0.2 km gain, zero activity, a tie, a much more distant athlete, mixed units and reduced motion. Add more peers to check density.

Ask people to find themselves, identify the nearest athlete by distance, explain the gap, pan away and return, then explain what the new workout changed. With numbers briefly hidden, ask what ground they passed and whether their location feels different. Separately check that they understand the weekly snapshot is asynchronous and that panning never changes their total.

Prefer the direction that makes both a small gain and a no-rank-change workout feel visible while retaining correct comparisons. Visual preference matters, but it cannot substitute for those tasks.

The companion in-chat sketches illustrate geometry and camera behavior with fictional data and simplified capsule rendering. They are not polished production proposals, live tracker connections or evidence of user-testing results.
