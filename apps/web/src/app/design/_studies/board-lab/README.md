# Compete field lab

October 20, 2026 · Coded presentation prototypes, not a production replacement

Open `/design/boards` through the existing design access gate. The design index links to it. All athletes, sessions and gain previews are fictional local data. The study does not connect trackers, log activity or write scores.

## Round 2: independent ground, progress and lens

The user selects **vertical** and asks to focus this round on **kilometers**. Tapestry and Ribbon established the material/viewport groundwork; the next question is the track environment independently of the earned trace. The first reviewed prototype is preserved in commit `7e0f710` on PR #216. Its horizontal, miles and effort comparisons remain history rather than cluttering this round's controls. The platform-agnostic unit helpers and their tests remain intact; no production unit/scoring behavior changed.

### Eight environments

| Environment | Spatial/material idea |
| --- | --- |
| Personal track | Individual mineral-blue athletics lanes, solid painted sidelines and whole-kilometer stencils |
| Road ribbons | Separate charcoal road surfaces with green shoulders and longitudinal markings; no vehicles |
| Parkland Passage | One shared promenade, trees, benches and small distance-fixed garden islands between athletes |
| Pool Deck | Aquatic light, lane ropes and floor T marks at whole kilometers; an illustrative unfolded surface, not actual swimming lengths |
| Boardwalk | Long timber grain and plank seams running with travel, without transverse striping |
| Meadow Trail | A softly winding shared field; racers and traces follow the same curve |
| Contour Atlas | Open topographic ground, contours and cairns without a road or rigid lane pavement |
| Night Meet | Charcoal athletics lanes, restrained light pools and kilometer beacons |

No environment draws a sub-kilometer horizontal distance rule. Most draw no cross-track rules at all. The fixed side axis uses integer kilometer posts; the only shared start line is at zero. Pool T marks are whole-kilometer surface references, not an inferred lap model. Decorative road dashes, water floats, wood grain and trees are distance-fixed objects, not additional distance gridlines.

### Five progress treatments

| Treatment | What stays behind |
| --- | --- |
| Edge lights | Twin rounded border rails; open middle for the capsule and echoes |
| Session thread | One offset thin line with knots from real counted-session boundaries |
| Kilometer stamps | Discrete paired steps at completed whole kilometers; no connecting bar |
| Banked trail | A slender taper that begins beyond the last afterimage, leaving an explicit clear gap |
| Session tokens | Detached contribution chips beside the visible portion of each sourced session interval |

No treatment fills the entire lane or draws a transverse progress cap through the capsule. All progress paint shares a curved exclusion mask around the displayed capsule and its full wake corridor, including viewport-edge markers. The mask reserves the maximum canonical echo envelope rather than tracking only one animation frame. Source-session hit regions are transparent and separate from visual paint, so inspection remains available without a colored bar.

The production `PolishedRacer` and wake clock are reused. Only the racer layer runs that clock; the background and earned traces stay still until values/camera change. Reduced motion, visibility and offscreen behavior follow the production clock. The bottom overview remains part of the persistent field, with a window clipped to actual field bounds even after exploring beyond the last athlete.

### Two map lenses, plus a comparison baseline

- **Map lens:** a single geometric zoom factor changes both longitudinal and lateral scale. Lane spacing, ground details and capsules shrink together; side whitespace appears as the field fits.
- **Atlas lens:** the world uses the same zoom in both axes, while capsules retain a small readable minimum size, like map pins. Header detail reduces when lane spacing becomes too narrow.
- **Distance only:** the previous vertical-range-only behavior remains explicitly labeled as a comparison, rather than being confused with map zoom.

Zoom is presentation-only. The same totals, stable athlete ordering, selected athlete and unranked past-you reference remain. Hit targets keep a usable minimum even when the drawn capsules shrink; the exact field list is always available. No rank or score improvement is inferred from a distance pass.

## Review links

- `/design/boards?concept=field&background=athletics&progress=rails&zoom=map`
- `/design/boards?concept=field&background=parkland&progress=thread&zoom=atlas`
- `/design/boards?concept=field&background=pool&progress=footsteps&zoom=map`
- `/design/boards?concept=horizon`

Choices restore from the URL and can be mixed independently. Desktop uses named visual catalogs; phones and expanded fields expose compact native selectors. Controls stay attached to the one persistent scene. Try a sample gain, pan, Center me, Fit field, expand/collapse and a session inspection. Reduced motion applies the gain directly; normal playback is finite and never claims live GPS speed.

Horizon remains a real, on-demand Three.js course with trees, benches, fixed signs, warm shadows and glass capsules. It is an illustrative distance world, not actual athlete location. Its existing overhead fit and 2D fallback are retained. In this distance-only review the fallback uses the selected 2D environment and trace.

## Code boundary and integration

| File | Responsibility |
| --- | --- |
| `board-lab.tsx` | Local study controls, sample gain, camera ownership and product-context shell |
| `field-directions.ts` | Independent environment, progress and zoom catalogs and validated URL IDs |
| `board-2d.tsx` | Controlled vertical SVG field, geometry, wake-safe mask, interactions and racer layer |
| `track-background.tsx` | Eight distance-fixed environments; no account or fixture dependency |
| `progress-traces.tsx` | Five earned traces and separate source-session inspection regions |
| `horizon.tsx` | On-demand Three.js scene; unchanged scenic 3D direction |
| `persistent-field.tsx` | Stable portal target, Radix expansion and focus return |
| `model.ts` | Absolute marks, zoom scales, bounded samples, interval clipping and overview geometry |
| `fixtures.ts` | Fictional athletes and session intervals; never import into production |

The renderers receive `ArenaSceneLane[]`, `ArenaViewWindow`, optional sourced `BoardSession[]` and callbacks. They import no auth, competition provider, storage or network client. Session values must use the lane's display unit and canonical counted contributions from the matching period/score track. Missing or unauthorized peer history stays unsegmented; never manufacture sessions from an aggregate total.

After selecting a direction, move approved renderers/helpers out of `_studies` into production field modules. Production must not import study files. Adapt `FieldStage`'s existing lane/view/selection state and established overtake controller; this study's independent preview controller stays here. Port approved SVG geometry to native's existing lane view, while keeping shared modules free of DOM/native imports. Move approved Horizon scenery into `packages/pursuit` and preserve the established `/arena-scene` WebView bridge. This PR does not ship those production/native integrations.

The default window remains ±3 km, with a fixed zero origin, stable lane identity, true offscreen totals and no arbitrary finish. The Trail's small lateral meander is illustrative: the vertical axis encodes accumulated distance, not a recorded geographic route or elevation. The existing production bounds/scoring/period rules are unchanged.

## Framework and verification

Installed Next.js 15.5.27 does not ship `node_modules/next/dist/docs/`. The official version-15 [server/client boundary](https://nextjs.org/docs/15/app/getting-started/server-and-client-components) and [lazy-loading](https://nextjs.org/docs/15/app/guides/lazy-loading) guidance were read before this study. The route remains a thin server wrapper with a client study and lazy Three.js boundary. No new package is needed.

See `docs/design-studies/boards/README.md` for captures and final verification. Browser software WebGL does not establish native gesture parity, mobile GPU performance or motivation outcomes from user testing.
