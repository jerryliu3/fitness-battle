# Centered trails and afterimage blending

The user keeps **Banked trail, Dotted route and Session tiles** and drops Waypoint cord and Revealed ground. All three earned traces now follow the racer directly, with no shoulder path, lateral detour or endpoint ornament.

## Two ways to join the wake

- **Faint underlay:** uniformly quiet paint throughout the earned path. The canonical afterimages are drawn over it.
- **Soft blend:** the record is clearer farther back, then gradually softens through the echo envelope. It remains faintly present under the echoes rather than ending at a blank clearance gap.

Banked trail keeps its narrow taper but now extends into the wake instead of stopping a fixed screen-space distance behind it. Dotted route retains world-anchored breadcrumbs with a very faint connecting trace. Session tiles retain real counted-session boundaries and quietly merge into the latest afterimages. No sourced history means no manufactured tiles.

The live capsule head uses its canonical rounded silhouette as the exclusion mask, with a small edge allowance. The rest of the wake is open to the trace. The SVG paint order is ground → earned trace → canonical racer/afterimages. This deliberately supersedes the earlier study rule that kept the entire echo corridor empty; it does not modify the production racer, its opacity or animation clock.

The same shared renderer paints all three options on straight, winding and closed-oval fields. The centerline stays physically consistent through curves and zoom; the trail never branches sideways. Only opacity and taper change near the racer, not the recorded distance. Counts, session inspection, fixed field landmarks, the bottom overview and selected Map lens remain.

Review `/design/boards?background=trail&progress=dots&wake=blend&zoom=map`, then switch between `dots`, `tiles` and `deposit`, and compare `wake=underlay` / `wake=blend`. The default is Meadow Trail + Banked trail + Soft blend + Map lens. Old `cord` and `reveal` links fall back to the default trace. Blend selection stays attached to the persistent field, including phones and expanded views, and restores from the URL.

The [Round 4 consumer reference review](../round-4/README.md) remains historical research. Its side-path implementations are superseded by this centered direction. These are presentation prototypes, with no production scoring, tracker or native changes.

## Review captures

| Trail | Faint underlay | Soft blend |
| --- | --- | --- |
| Dotted route | [View](round5-dots-underlay.png) | [View](round5-dots-blend.png) |
| Session tiles | [View](round5-tiles-underlay.png) | [View](round5-tiles-blend.png) |
| Banked trail | [View](round5-deposit-underlay.png) | [View](round5-deposit-blend.png) |

[Phone Dotted route](round5-phone-dots.png) · [Phone oval / mile loop](round5-phone-oval.png)

## Verification

Monorepo typecheck, all 18 study tests and `pnpm build:web` pass. The [browser report](round5-verification.json) covers 162 field/trace/blend/viewport combinations at 1440, 390 and 320 px: centered endpoints, canonical head-only masks and no page overflow. It also checks centerline dot placement, SVG paint order beneath the afterimages, source-session inspection, persistent expansion, gain to 21.4 km, oval/mile geometry and URL restoration. No browser runtime errors were reported.

The fade uses continuous gradient paint, avoiding horizontal seams from separately blended stroke pieces. Canonical afterimage motion remains unchanged, including reduced-motion behavior; all new scene paint is static at rest.
