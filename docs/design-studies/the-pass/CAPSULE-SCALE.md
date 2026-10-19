# Fixed-center capsule scale study

Material is locked to **Polished glass, 80% face alpha, Solar Gold #ffc400 and Cool Platinum #c9d6e3**. This followup studies size only, before production rollout.

Open `review.html?view=capsule-scale` or `/design/pass?view=capsule-scale`.

| Option | Scale of original 40 × 58 capsule | Width × height | Horizontal gap |
| --- | --- | --- | --- |
| Current | 135% | 54 × 78.3 | 54 |
| Larger | 150% | 60 × 87 | 48 |
| Big | 175% | 70 × 101.5 | 38 |
| Maximum | 200% | 80 × 116 | 28 |

Both heads retain their own centers: rival **(74,145)**, leader **(182,93)** in a 256-unit viewBox. Only the local scale changes; the composition is not scaled or translated as a whole. A fixed-center guide toggle makes the anchors visible. The satin wake and curved head exclusion scale with each object; wakes can crop at the bottom, as requested. No extra bottom whitespace is reserved. The horizontal gap naturally narrows as heads grow around fixed centers.

Each option includes white/black backgrounds, 64/32/16px previews, a square 1024px SVG download and a matching field preview. Field markers grow by the same relative amount (scale / 1.35); lane x coordinates and distance y coordinates stay fixed. Distance labels move away from larger heads to remain readable. Passing, rank, ±3km viewport and the unranked past-self ghost retain their existing behavior. Replay, held positions and independent flowing trails remain available, with reduced-motion support.

`capsule-scale-board-white.png` and `capsule-scale-board-black.png` compare all four. Editable masters and field snapshots are in `capsule-scale-icons/{white,black}/`. Center guides are inspection-only and never exported.

Rebuild with `node apps/web/src/app/design/_studies/pass-lab/build-review.mjs`. Production icon assets and native app configuration are unchanged by this study; final size selection precedes the application rollout.

Validation: workspace typecheck, 168 web tests (four existing skips), production web build and portable review generation passed. Browser inspection confirmed the selected 80% Solar/Cool Polished material, all four exact fixed-center transforms, guide toggle, white/black switching, largest-scale field selection, replay and independently flowing wakes with positions held.
