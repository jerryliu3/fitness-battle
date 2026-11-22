# Overtaek secondary color audit

This audit records the palette before the Gold and Silver token swap. The surface and card observations are review items. Contrast ratios compare the solid sRGB values and omit opacity and blur unless noted.

## Surfaces and Slate

| Role | Light | Dark | Observation |
| --- | --- | --- | --- |
| Canvas | `#F8F9F6` | `#111F29` | Dark canvas serves as the solid navigation base too. A near-black canvas is a separate appearance decision. |
| Card | `#FFFFFF` | `#1C2E38` | Dark card and canvas are only about 1.2:1 apart. Borders and spacing supply much of the separation. |
| Elevated control | `#E9EFF2` | `#33424A` | The dark soft control also supplies the selected tab pill and the effort track. Overlays and blur can change the visible result. |
| Feature surface | `#637580` | `#33424E` | Dark feature and soft-control colors are nearly identical. Light feature matches the light Slate accent exactly. |
| Slate accent | `#637580` | `#B7C7D4` | In light mode it is close to the supporting text and chart comparison roles, which both use `#637482`. |
| Comparison series | `#637482` | `#8C9EA8` | Keep a separate semantic role even where values coincide with text. Comparison needs to work in charts without changing general copy. |
| Border and divider | `#E3E9E7` / `#D0DAD7` | `#324954` / `#3C515C` | These are subtle structural colors. Essential focus and selected indicators need their own stronger treatment. |

Recommendation for the Slate work is to compare the current blue-ink canvas with a deeper canvas on Home, the session sheet, and glass navigation. Check card separation and disabled controls before changing the whole ladder. Consolidate soft and feature shades only if the intended hierarchy still reads.

## Home swipe deck

| Card | Light fill | Dark fill | Observation |
| --- | --- | --- | --- |
| Session and recovery recommendation | `#F48C72` | `#F48C72` | The large salmon surface can outweigh small gold accents. The shared `#1F1715` ink has about 7.4:1 contrast. The web Home preview shows a white dark-mode heading on salmon at about 2.3:1, below 3:1 even for large text. |
| Compete | `#16382C` | `#16382C` | Its `#D9F366` badge and CTA are the strongest competing hue. This green is specific to the deck. |
| Week route | `#EEF4F0` | `#1D312C` | Similar green family to Compete, with another lime CTA in dark mode. |
| Insight and momentum | `#DCD4FC` | `#2C2747` | Lavender is a distinct category color. It is much lighter in light mode and more subdued in dark mode. |

First, make the web recommendation title inherit the card’s intended ink. Then compare the current coral fill with a smaller coral treatment and compare the lime badges and CTAs with neutral controls. Review each card at the same position in the deck so differences in visual weight are easy to see.

## Status, achievements and contrast

- Keep success `#24765C` / `#8CCDAB`, error `#B93C3C` / `#F09C98` and the current native warning amber. These convey status. Recovery coral belongs to the recommendation category.
- Existing podium gold `#DFAD3C`, rank wreaths, app icon artwork and celebratory materials have their own roles. Review those separately if the achievement palette needs to align more closely with Medal Gold.
- Bright `#FFB800` has about 1.7:1 contrast against white. Dark action ink on Medal Gold is about 8.4:1. Thin gold marks on white should be reviewed if their geometry changes.
