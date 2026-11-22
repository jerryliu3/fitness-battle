# Appearance foundation

This replaces the abandoned color-study integration with a small foundation based on current main. Medal Gold owns actions, primary chart series and progress; Polished Silver supports secondary accents, and Comparison Silver owns historical chart comparisons. `SHELL_COLORS` is a compatibility view of the canonical light appearance, not a second palette. Experimental alternate themes, diagnostic outlines and study pages are excluded.

## Contract

`packages/shared/src/appearance.ts` is platform-independent. `getAppColors(mode)` returns matching semantic roles, `resolveColorMode(preference, system)` resolves Light/Dark/System, and `appColorVariables(mode)` publishes only namespaced `--app-*` values. Existing static exports remain compatible for historical prototypes and pure presentation defaults. Supporting text and secondary brand accents are separate roles.

Native `AppThemeProvider` is mounted above navigation. `useAppTheme()` exposes preference, resolved mode and colors; `useThemeColors()` is the convenience hook. Preferences persist in AsyncStorage, with protection against a late storage read overwriting a new user selection. `createThemedStyles` caches both recipes and `useThemedStyles` selects one without remounting children. Expo permits system appearance.

Web reads the preference cookie on the server and publishes color variables before hydration. System uses CSS `light-dark()`; manual overrides and browser theme-color follow the resolved preference. `AppearanceProvider`, `useAppearance` and the reusable `AppearanceControl` provide persistence and selection. Inline/SVG consumers use `src/theme/app-colors.ts` instead of fixed shared hex exports.

## Application adoption

Production native routes and common UI now consume reactive palette hooks and cached light/dark style recipes. Navigation, text, sheets, charts, onboarding and settings follow the saved preference without remounting navigation. HeroUI/Uniwind control variables are synchronized from the same shared palette.

Production web CSS and SVG/inline consumers resolve the shared namespaced variables and legacy aliases. Athlete Preferences exposes System/Light/Dark on both platforms, with the appearance control also available on the guest web profile. Supporting text and brand accents retain independent roles. Fixed foregrounds on artwork and yellow actions use explicit on-surface tokens.

Geographic scenery, mascot artwork and categorical participant colors retain their distinct palettes. Historical design studies and native prototypes are not production routes and retain their reviewed study styling. The Gold and Silver roles are shared across both appearances; experimental alternate palettes and diagnostic outlines are excluded.

Define new native styles with `createThemedStyles(colors => ({ surface: { backgroundColor: colors.surfaceCard } }))` and select them with `useThemedStyles` in the component. Read inline colors with `useThemeColors`. On web use `--app-*` variables or the CSS-variable adapter; never import static light colors into reactive product UI.

Before shipping, check release-device native appearance and real connected-account states. Browser review and renderer tests do not establish device rendering parity.

Filter triggers, analytics time-range toggles and selected chips use the quiet soft surface, primary text and primary-text border in both apps. Selection is conveyed through the border and accessible state; yellow fills are reserved for primary actions and quantitative progress. Neutral checkbox marks use the foreground paired with their selected fill.

Chart-series roles (including the legacy `fieldTeal` alias) are for data marks, not control fills. Time-range selectors use the neutral control treatment in both apps, independently of the chart palette.

Navigation keeps neutral surfaces, icons and labels. Replay, avatar, rank and result surfaces retain their existing roles. Filled primary actions and progress use Medal Gold.

The [November 17 audit](reviews/appearance-audit/README.md) covers shared choice
controls, system pickers, switch thumbs, action/error foregrounds and web chart
controls. Native Appearance follows the saved preference; System clears the
native override. Filled error actions use `textOnError` with `statusError`, while
error text on a neutral surface continues to use `statusError`.

## Medal Gold

`packages/shared/src/brand-gold.json` defines Medal Gold Max Pop P3 as
`color(display-p3 1 0.735 0)` and its explicit sRGB fallback as `#FFB800`.
`#FFBB00` is the approximate P3 channel hex used in a P3-profiled design file.
The web shell selects P3 with CSS syntax and gamut queries before hydration.
Primary chart traces use the same Medal Gold in both appearances. Gold-filled actions use `#142B3B` text in both appearances.

The iOS config plugin generates a named UIKit color with sRGB and Display P3
variants. The shared native primary button, primary icon button, effort rail,
field timeline use it. A fresh iOS binary is needed
to include the color catalog. The controls retain an sRGB base fill if the
native named color is unavailable. Website CSS and SVG use the browser color path.

Expo web applies the same P3 syntax and gamut checks to its app palette.
On Android 10 and later, a rebuilt app opts into a wide-gamut window, and
its shared primary button, primary icon button, effort rail and field
timeline draw the Display P3 fill with a color-space-aware Android paint.
The sRGB fill stays underneath for older builds and unsupported displays.
Native SVG charts, Mapbox layers and native components that accept only
packed sRGB color values use the shared sRGB fallback.

## Polished Silver

Polished Silver replaces the existing secondary accent and matching focus ring
with `#626A74` in light mode and `#D7E3EC` in dark mode. Existing comparison
chart roles use `#79838D` in light mode and `#ACBFCC` in dark mode. Silver uses
ordinary sRGB values. The surface and navigation treatments retain their
previous recipes.
