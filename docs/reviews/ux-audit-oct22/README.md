# Everyday Club UX audit — October 22

Scope: the complete Everyday Club stack through #275, web and actual iPhone 17 Pro / iOS 26.5 native app. Prioritize direct interaction and visual checks; the owner explicitly waived expensive suites, typechecks and builds for this pass. Small pure-model/renderer checks support the changed behavior. Demo activity stays on this device; no production account, live tracker or health permission is changed.

## Findings and first-pass fixes

| Finding | Fix | Local evidence |
| --- | --- | --- |
| Past-self could be hidden and disappeared in perspective | Always show available past-self, never rank it; remove checkbox/switch | Native 2D/3D inspected, web checkbox absent |
| Perspective plane had a hard edge | Extended empty ground clipped to curved horizon, atmospheric blend | Native visual inspection |
| Portraits lacked clear ground position | Neon trail and elliptical position ring per athlete; dashed past-self | Native screenshot |
| Native lane buttons were the only reliable navigation | Real nested horizontal ScrollView with continuous projection; vertical page scroll retained | Drag changed visible athletes from Carla/Alice to Noah/Ava; event stayed Running, then Your lane restored Alice |
| 2D ruler overcrowded at wide zoom | Adaptive nice-number spacing, at most five distance marks | Web End key at widest range: 0, 10, 20, 30 miles |
| Earned traces faded across the viewport rather than distance | Fixed 1.5 distance-unit ramp, then stable 90% opacity back to start | Shared scene checks |
| Native board redrew decorative SVG continuously while idle | Wake clock runs during explicit Explore; static earned traces stay visible at rest | Native navigation/inspection responsive after change |

## Interaction ledger (updated with each follow-up)

- Native Home → latest activity → impact disclosure → Close returns Home: pass.
- Native Home → Compete, 2D → 3D → Standings: pass; place stays 3 / 8.
- Native perspective: direct lane drag, edge bounds, Your lane, zoom, always-visible past-self: pass.
- Native chooser → Cycling: selected; further carousel/registration checks in final sweep.
- Web: default 2D, past-self without checkbox, keyboard zoom, sparse ruler, 3D selection: pass.
- Progress, Crew, sync recap, secondary destinations and second sweep: recorded in subsequent stack entries below.

Field evidence: [native perspective](ios-field.jpg), [native direct swipe](ios-lane-swipe.jpg).
