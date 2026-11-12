# Vitals Lab 3D body — architecture

## Existing stack (Phase 0)

- **Monorepo**: pnpm; `apps/web` (Next.js), `apps/mobile` (Expo), `packages/pursuit` (Three.js DOM scenes), `packages/shared` (domain logic).
- **Prior 3D**: `packages/pursuit` procedural arena avatars (`avatar.ts`) — retained for Compete; **not** reused for Vitals anatomy.
- **Vitals product surface**: Analytics / telemetry lives in `packages/shared/src/analytics-lab.ts` and mobile/web matrix UIs; no prior full-body particle renderer existed.

## New components

```
body-pipeline/          Offline Python: MakeHuman-class meshes → particles
packages/pursuit/
  src/vitals-body/      VitalsBodyRenderer, loaders, shaders (Three.js)
apps/web/
  src/app/ux/vitals-body/   Comparison demo route (`/design/vitals-body` redirects here)
  public/bodies/                Synced runtime assets
```

## Rendering

- `THREE.Points` + custom `ShaderMaterial` (glow, rim/contour boost, region highlight).
- Modes: **outline** (surface class only visually emphasized) vs **cloud** (interior + surface, depth falloff).
- Quality presets map to `outline-{high|medium|low}.vbody`.

## Mobile

- Default `medium` preset; capped DPR; `prefers-reduced-motion` disables idle rotation.
- WebView embed path: export `VitalsBodyRenderer` from `@fitness-battle/pursuit/vitals-body` (same as arena scene pattern).

## Customization (follow-up)

- Anny / MPFB2 macro-detail sliders can drive regenerated assets (Option B) or morph targets at runtime (Option A). Demo ships male/female only.
