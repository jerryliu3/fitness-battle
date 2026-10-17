# Design studies

All presentation prototypes, sample data, study-only styles and prototype tests live under `src/app/design/_studies/`, alongside the thin route wrappers in `src/app/design/`. Next treats `_studies` as a private folder, so it creates no routes and existing `/design/*` links keep working. New studies should follow this boundary rather than adding prototype modules to `src/features/`.

- `design-lab`: the first interaction/layout study
- `spatial-lab`: spatial layouts and sample worlds
- `evolution-lab`: identity and field exploration
- `worlds-lab`: five product worlds
- `rally-lab`: the focused Rally study
- `home-lab`: five adaptive mobile home concepts
- `mascot-studio`: Star Ember pose, expression and motion review at `/design/mascot`; reusable model/renderers stay in shared/components
- `brand-lab`: ten brand territories, current Ember, three neutral systems, and a cosmetic-only sample locker at `/design/brand`; all fixtures, finish previews and scoped styles stay inside this study

Studies may reuse production modules under `src/features/`, `src/components/`, `src/theme/` and the platform-agnostic shared package. Production modules must not import study modules or sample fixtures from `src/app/design/_studies/`.

The branding components already used by production are in `src/features/brand/brand-art.tsx`. Shared Rally chrome is in `src/features/rally/rally-shell.css`; Rally reviewer controls remain in `rally-lab/rally-focus.css`. Static study assets retain their `/design/` paths under `public/design/`, including the Ace asset reused by production.

Tests remain discoverable through the existing `src/**/*.test.ts` Vitest pattern. This separation introduces no new routes, packages or write paths.
