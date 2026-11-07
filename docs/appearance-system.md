# Appearance foundation

This replaces the abandoned color-study integration with a small foundation based on current main. Light mode preserves every existing `SHELL_COLORS` value. No Slate/Steel theme, yellow-chart reinterpretation, diagnostic outlines or study pages are included.

## Contract

`packages/shared/src/appearance.ts` is platform-independent. `getAppColors(mode)` returns matching semantic roles, `resolveColorMode(preference, system)` resolves Light/Dark/System, and `appColorVariables(mode)` publishes only namespaced `--app-*` values. Existing static exports remain compatible and light-only. Supporting text and secondary brand accents are separate roles.

Native `AppThemeProvider` is mounted above navigation. `useAppTheme()` exposes preference, resolved mode and colors; `useThemeColors()` is the convenience hook. Preferences persist in AsyncStorage, with protection against a late storage read overwriting a new user selection. `createThemedStyles` caches both recipes and `useThemedStyles` selects one without remounting children. Expo permits system appearance.

Web reads the preference cookie on the server and publishes color variables before hydration. System uses CSS `light-dark()`; manual overrides and browser theme-color follow the resolved preference. `AppearanceProvider`, `useAppearance` and the reusable `AppearanceControl` provide persistence and selection. Inline/SVG consumers use `src/theme/app-colors.ts` instead of fixed shared hex exports.

## Adoption boundary

This is infrastructure, not a complete dark-mode product release. Existing static native styles and legacy CSS are deliberately not bulk rewritten. The reusable preference control is not yet exposed in product settings: add it when the destination and its common primitives have been migrated and visually checked. Do not claim all screens support dark mode merely because their provider does.

For an adopted native component, define recipes with `createThemedStyles(colors => ({ surface: { backgroundColor: colors.surfaceCard } }))` and select them in the component with `useThemedStyles`. For web, use `background: var(--app-surface-card); color: var(--app-text-primary)`. Yellow controls require `textOnAction`, not a foreground that flips to white in dark mode. Illustration, categorical series and status colors keep their distinct purposes.

Screen migrations should be separate small PRs against current main. Verify Light, Dark and System on real content and empty/error states before exposing a production switch. This separation avoids carrying old layouts across recent refactors.
