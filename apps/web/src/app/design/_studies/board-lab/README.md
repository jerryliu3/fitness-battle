# Ground for your effort

October 20, 2026 · Coded presentation prototypes, not a production replacement

Open `/design/boards`. The existing design access gate applies: owner access in production, owner or supported demo account locally. The design index links to this study. All people, activity receipts and totals here are fictional local fixtures; the study does not connect a tracker, log a workout, change an enrollment or write a score.

Direct comparisons:

- `/design/boards?concept=tapestry&orientation=vertical&metric=distance&unit=km`
- `/design/boards?concept=ribbon&orientation=horizontal&metric=distance&unit=km`
- `/design/boards?concept=horizon&metric=distance&unit=km`
- `/design/boards?concept=tapestry&orientation=vertical&metric=effort`

## Decisions being explored

Session Tapestry and Distance Ribbon are the two 2D candidates. Both support **horizontal and vertical** layouts, so orientation can be compared independently of material. Their initial orientations are vertical and horizontal respectively. Both support kilometers, equivalent miles, and real effort points. An outdoor route metaphor is deliberately absent from non-GPS effort.

Horizon Pursuit is the **3D candidate**, reserved for the running-distance sample. It uses real Three.js geometry: a pale athletics course, sculpted trees, shrubs, benches, split signs, warm shadows, glass capsule meshes and quiet ground wakes. It is an illustrative course, not a map or live athlete location. Follow and overhead cameras share the athlete values and controlled viewport. Fit field chooses overhead so the full longitudinal range can be seen.

All three inherit Open Field's warm white/charcoal/gold identity. The 2D boards use the actual production `PolishedRacer` component and canonical capsule geometry, rather than re-drawing an approximation. The Three.js capsule material uses the canonical gold/platinum palette and a simple physical glass interpretation; it is not a pixel-identical SVG material.

## What to try

1. Pan the field: absolute marks move through the view instead of remaining screen-stationary with changing numbers. The vertical ruler stays pinned when scrolling sideways between lanes on a phone.
2. Select an athlete in the board or the complete field list. Lane identity never becomes rank; the list intentionally stays in stable lane order and labels its measure as distance or effort.
3. Select a woven session segment to inspect its actual fixture contribution. Use Fit field to see the week's whole construction from zero.
4. Preview +2.2 km or +8 points. The world moves under a following camera, the total changes, and a new proportional session strip remains. No official standing or Elo gain is claimed from a distance pass.
5. Expand and collapse: one persistent DOM/SVG/WebGL scene moves between its embedded host and a Radix dialog. Selection, camera and the existing renderer survive. Escape closes and restores focus; the background scroll is locked while open.
6. Compare both orientations and distance/effort units. Miles convert distance and contribution values together. Strength never becomes invented kilometers.
7. Compare Horizon Follow, From above and Fit field. If WebGL fails or loses its context, the same data and view fall back to Tapestry.

The sample gain is a finite 2.4-second presentation, not measured running speed. Reduced motion applies the end state directly. There is no decorative idle world animation or perpetual running. Programmatic 2D viewport changes interpolate center and span together; direct manipulation cancels interpolation. Compact vertical touch gestures preserve normal page scrolling; deliberate field exploration uses buttons or the expanded scene. Horizontal field dragging uses the horizontal axis and leaves page scrolling available.

## Files and data boundary

| File | Responsibility |
| --- | --- |
| `board-lab.tsx` | Study controls, local gain preview, viewport ownership and product-context frame |
| `board-2d.tsx` | Controlled SVG renderer for Tapestry/Ribbon and both orientations |
| `horizon.tsx` | Controlled, on-demand Three.js scene and projected athlete labels |
| `persistent-field.tsx` | Stable portal target, Radix expansion and focus return |
| `model.ts` | Presentation-only units, absolute ticks, camera geometry and interval clipping |
| `fixtures.ts` | Fictional athletes and session intervals; never import into production |
| `model.test.ts` | Moving absolute marks, equivalent unit spans, true interval clipping and outlier/ghost behavior |
| `board-lab.css` | Scoped study/product styling; no global shell overrides |

`Board2D` consumes `ArenaSceneLane[]`, `ArenaViewWindow`, a display unit, presentation state and optional `BoardSession[]`. Its callbacks return athlete selection, session selection and a camera center. `Horizon` consumes the same lane/view values and selection state. Neither renderer imports fixtures, auth, competition providers or storage, and neither makes network requests. They can be evaluated with an application data adapter without modifying backend rules.

Session intervals are expressed in the **same unit as the lane total**: an ID, athlete ID, label, timestamp, start and end value. An adapter must supply counted contributions from the canonical ledger in the matching period/score track. The renderer clips a known interval to the displayed total during replay. If a peer's session history is unavailable or not permitted, pass no intervals; their total still renders as a continuous band. Never infer session seams by dividing an aggregate total. This study has no new activity-read permission or production API.

The default running range is ±3 km, equivalently converted for miles; effort is ±10 points. Pan and zoom do not edit totals. The zero origin remains near the lower edge at the start, and out-of-window markers display arrows plus true totals. Past you is unranked. The global distance strip gives context when the start is offscreen. There is no arbitrary finish distance or completion percentage.

## Integration path

1. Review material and orientation at `/design/boards` before selecting a production default. No default has been chosen here.
2. Move the selected 2D renderer and pure presentation helpers into the existing production field modules; retain the fixture/control wrapper in `_studies`. Production must not import a study module. Adapt `FieldStage`'s existing `sceneLanes`, `view`, unit, selection and camera callbacks.
3. Feed real, authorized counted-session intervals only where canonical contribution data exists. Total-only peers remain supported. Wire session selection to the existing activity detail. Use the established overtake/reveal state instead of shipping this study's independent sample-gain controller.
4. Port the selected SVG material to native's existing lane component; keep the shared package platform-agnostic. This PR implements the web study, not native 2D parity.
5. For 3D adoption, move the approved scenery/camera treatment into `packages/pursuit`, retaining its existing lifecycle and presentation bridge. Native continues to host that DOM renderer through `/arena-scene`; this study does not introduce another native Three.js runtime or change WebView deployment requirements.
6. Integrate the persistent field with the existing production expansion owner rather than adding a second dialog or competing transform animation.

Remaining review questions: whether texture improves emotional appeal at small sizes; horizontal ribbon readability with narrow windows; how much peer activity history is available; final 3D capsule art; real-device rendering cost and native gesture parity. Browser software WebGL checks do not establish mobile GPU performance.

## Framework and verification

The installed Next.js is 15.5.27 and does not ship `node_modules/next/dist/docs/`. Before authoring, the official version-15 [server/client boundary guide](https://nextjs.org/docs/15/app/getting-started/server-and-client-components) and [lazy loading guide](https://nextjs.org/docs/15/app/guides/lazy-loading) were read. The route is a thin server wrapper; the interactive study is a client boundary; Three.js is loaded dynamically only when needed. No dependency or lockfile changes are required.

Verification results are recorded in `docs/design-studies/boards/README.md` after the final browser/build pass.
