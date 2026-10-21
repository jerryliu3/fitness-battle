# Design studies

All presentation prototypes, sample data, study-only styles and prototype tests live under `src/app/design/_studies/`, alongside the thin route wrappers in `src/app/design/`. Next treats `_studies` as a private folder, so it creates no routes and existing `/design/*` links keep working. New studies should follow this boundary rather than adding prototype modules to `src/features/`.

- `smoothness-lab`: `/ux` — 18 interactive continuity prototypes with a visual mobile-haptic event monitor; fictional local state, no native vibration or backend writes.
- `design-lab`: the first interaction/layout study
- `spatial-lab`: spatial layouts and sample worlds
- `board-lab`: `/design/boards` — the vertical-kilometer field lab: nine environments, three centered trails, five independent materials and faint-underlay / soft-blend comparisons beneath the afterimages, plus map/distance lenses and scenic Three.js Horizon. The original Tapestry/Ribbon comparisons remain in the first review commit. Controlled renderers, source-session intervals, persistent expansion and local-only gains; see its README for integration boundaries.
- `evolution-lab`: identity and field exploration
- `worlds-lab`: five product worlds
- `rally-lab`: the focused Rally study
- `home-lab`: five adaptive mobile home concepts
- `mascot-studio`: Star Ember pose, expression and motion review at `/design/mascot`; reusable model/renderers stay in shared/components
- `brand-lab`: ten brand territories, current Ember, three neutral systems, and a cosmetic-only sample locker at `/design/brand`; all fixtures, finish previews and scoped styles stay inside this study
- `overtake-motion`: `/design/motion` — Round 2 combines every-pass Photo Finish + Combo, three staggered over/taek logo races, and three staggered afterimage/jetstream treatments. The original twelve concepts remain available. Fictional data; no scoring or tracker writes.
- `pass-lab`: `/design/pass` — 15 app icons (12 vertical symbol concepts + 3 type experiments), 8 lane fields, lead-swap previews, small-size/mask checks, local shortlisting and SVG exports. A portable review and outlined vector masters live in `docs/design-studies/the-pass/`. Fictional data; no production identity or competition changes.

Studies may reuse production modules under `src/features/`, `src/components/`, `src/theme/` and the platform-agnostic shared package. Production modules must not import study modules or sample fixtures from `src/app/design/_studies/`.

The branding components already used by production are in `src/features/brand/brand-art.tsx`. Shared Rally chrome is in `src/features/rally/rally-shell.css`; Rally reviewer controls remain in `rally-lab/rally-focus.css`. Static study assets retain their `/design/` paths under `public/design/`, including the Ace asset reused by production.

Tests remain discoverable through the existing `src/**/*.test.ts` Vitest pattern. This separation introduces no new routes, packages or write paths.
