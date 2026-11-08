# Appearance foundation

This replaces the abandoned color-study integration with a small foundation based on current main. Yellow owns actions, charts and progress; Slate owns secondary accents. `SHELL_COLORS` is a compatibility view of the canonical light appearance, not a second palette. Experimental alternate themes, diagnostic outlines and study pages are excluded.

## Contract

`packages/shared/src/appearance.ts` is platform-independent. `getAppColors(mode)` returns matching semantic roles, `resolveColorMode(preference, system)` resolves Light/Dark/System, and `appColorVariables(mode)` publishes only namespaced `--app-*` values. Existing static exports remain compatible for historical prototypes and pure presentation defaults. Supporting text and secondary brand accents are separate roles.

Native `AppThemeProvider` is mounted above navigation. `useAppTheme()` exposes preference, resolved mode and colors; `useThemeColors()` is the convenience hook. Preferences persist in AsyncStorage, with protection against a late storage read overwriting a new user selection. `createThemedStyles` caches both recipes and `useThemedStyles` selects one without remounting children. Expo permits system appearance.

Web reads the preference cookie on the server and publishes color variables before hydration. System uses CSS `light-dark()`; manual overrides and browser theme-color follow the resolved preference. `AppearanceProvider`, `useAppearance` and the reusable `AppearanceControl` provide persistence and selection. Inline/SVG consumers use `src/theme/app-colors.ts` instead of fixed shared hex exports.

## Application adoption

Production native routes and common UI now consume reactive palette hooks and cached light/dark style recipes. Navigation, text, sheets, charts, onboarding and settings follow the saved preference without remounting navigation. HeroUI/Uniwind control variables are synchronized from the same shared palette.

Production web CSS and SVG/inline consumers resolve the shared namespaced variables and legacy aliases. Athlete Preferences exposes System/Light/Dark on both platforms, with the appearance control also available on the guest web profile. Supporting text and brand accents retain independent roles. Fixed foregrounds on artwork and yellow actions use explicit on-surface tokens.

Geographic scenery, mascot artwork and categorical participant colors retain their distinct palettes. Historical design studies and native prototypes are not production routes and retain their reviewed study styling. The chosen Slate/yellow roles are shared across both appearances; experimental alternate palettes and diagnostic outlines are excluded.

Define new native styles with `createThemedStyles(colors => ({ surface: { backgroundColor: colors.surfaceCard } }))` and select them with `useThemedStyles` in the component. Read inline colors with `useThemeColors`. On web use `--app-*` variables or the CSS-variable adapter; never import static light colors into reactive product UI.

Before shipping, check release-device native appearance and real connected-account states. Browser review and renderer tests do not establish device rendering parity.

Filter triggers and selected chips use the quiet soft surface, primary text and primary-text border in both apps. Selection is conveyed through the border and accessible state; yellow fills are reserved for primary actions and quantitative progress. Neutral checkbox marks use the foreground paired with their selected fill.
