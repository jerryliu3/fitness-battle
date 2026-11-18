# Production appearance audit — November 17, 2026

The audit traces shared native controls through their consumers in onboarding,
Athlete, Settings, Home, Progress, Compete and Crew, and checks the corresponding
web controls. Source scans covered raw native Text and SVG labels, fixed color
literals, forced system appearances, static light-palette imports, selected
surfaces, and foreground/background pairings. Artwork, map scenery, participant
colors and historical design studies keep their intentional palettes.

## Findings and fixes

| Surface | Failure | Fix |
| --- | --- | --- |
| Gender, time zone and other choices | Labels and unselected options defaulted to black; fallback menu labels did too | Explicit reactive text colors, neutral selected/pressed surfaces and theme borders |
| UIKit choice menus and system dialogs | Manual app appearance did not reach native controls | Sync native Appearance; pass resolved appearance to the native choice view; System clears the override |
| Date and number pickers | Date spinner forced Light; wheel item typography did not carry its color | Resolved spinner appearance and explicit wheel text colors |
| Preference, freeze and notification switches | Dark-mode selected track and thumb were both near-white | Pair enabled tracks with a contrasting themed thumb |
| Your Effort Sync/Add | Primary yellow action needs its fixed dark foreground; secondary action needs the theme card/text pair | Covered by prerequisite #799, with both appearances now regression-tested |
| Toast actions and Effort Score gains | Theme text could become white on yellow | Explicit on-action foreground; progress remainder stays outside the variable fill |
| Destructive actions | Fixed dark-red text on dark cards; white text on the light-red dark-mode action fill | Reactive error text and a shared on-error foreground, including HeroUI variables and web confirmations |
| Route dialogs and errors | Default black labels or white text on unpainted fallback surfaces | Themed labels, foregrounds and fallback backgrounds |
| Glass dismiss/dialog chrome | Fixed light surfaces or bright white borders | Theme card/border/overlay roles |
| Event place chips | Theme-white text over fixed medal fills | Neutral badge surface with primary text |
| Web telemetry time ranges | White text on the yellow chart-series color | Neutral selected control roles and accessible pressed state |
| Web Units | Fixed white selected text over theme-primary fill | Matching inverse foreground |
| Web charts and leader panels | Hollow dots forced white; leader surface became white under white text | Themed chart surface; explicit inverse leader surface |

No production routes or shared feature/control components in the audited roots
still import static `SHELL_COLORS` or `HOME_HEALTH_COLORS`. Fixed white-on-dark map
controls, the athlete card's metallic face, custom recap scenery and paired Home
illustration palettes are intentional rather than missing theme conversions.

## Validation limits

Regression tests cover both appearances for choice labels/menus, picker wheels
and date spinners, Sync/Add icons, toast actions and enabled switch contrast.
Shared palette tests check action, error, feature and neutral control contrast.
Native navigation's separate theme boundary is addressed by #802. This PR is
stacked on #799 to avoid repeating its native back/icon-button fixes.

Automated renderers and source checks do not establish release-device parity.
Device review should switch System/Light/Dark, exercise each settings picker and
menu, inspect Your Effort actions and gains, show an error toast, and repeat the
Athlete/Settings navigation flow with #802 included.
