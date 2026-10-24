# Mobile refinement — owner follow-up, October 23, 2026

Implementation and visual review completed October 24.

PR #308 is merged. The owner confirmed verification of the first pass, retained Debug, requested clearer section boundaries and selected an icon library instead of system emoji. This follow-up applies those decisions without a broad hierarchy redesign.

## Selected presentation

- **Header:** profile photo/fallback first, then effort score and progress, then the streak flame; Debug stays right aligned. The profile and effort remain independently accessible controls in one visual group. There is no new enclosing card. The profile cannot shrink; supporting score copy can shrink on narrow screens.
- **Section boundaries:** one full pixel in `mobileSurfaces.divider` (`#d0dad7`), replacing pale device hairlines. Latest activity and achievements now have explicit section boundaries. Crew summaries, member rows, standings and session sections use the same treatment. Artwork, achievement tiles and paired Compete summaries retain their meaningful surfaces.
- **Icons:** [Tabler Icons for React Native](https://github.com/tabler/tabler-icons/tree/main/packages/icons-react-native), version 3.49.0, via a mobile `AppIcon` catalog. Running, walking, cycling and strength use the library's dedicated Run, Walk, Bike and Barbell symbols. Header, bottom navigation, settings, Sync, Back, Add, Edit, Expand and large preview affordances use the same family. Outline stroke is 1.8; the streak uses a filled gold flame. This replaces both the temporary sport emoji and the custom utility paths. Provider logos and the app's illustrations are separate from utility iconography.
- **Hierarchy:** only a small wrapping fix: Competition has a separate date subtitle so the date range does not break the heading awkwardly beside the countdown. Typography and page order otherwise keep the selected direction.
- **Compete, after the shell pass:** inline 2D and 3D scenes adapt to phone height instead of using a fixed tall scene. The 3D landscape is capped at 180px and occupies at most 32% of its board; peer targets remain large even as projected markers shrink. Fullscreen still fills the available safe area. These are presentation dimensions; distance window, field values, scoring and capsule world footprint stay the same.

The library uses the existing `react-native-svg` runtime. Direct per-icon entry points avoid importing Tabler's entire icon barrel into Metro. Tabler 3.49's package exports those runtime entries but only supplies root declarations; the small `tabler-icons.d.ts` shim types those entries using the vendor's `Icon` type.

## Scope decisions

- Initial native verification: accepted as complete based on the owner's report. That is not an assertion that the follow-up was independently run on a physical device.
- Keep Debug available and right aligned.
- Keep the existing light Everyday Club palette, Ember identity and selected tab colors. Stronger separators supply structure without adding borders around every full-width block.
- No new map integration or route storage. The owner is handling Mapbox separately.
- No finer-grained effort-score history work.

## Validation

- `pnpm typecheck`: all workspaces passed.
- `pnpm test`: 763 tests passed (122 mobile); 5 existing web tests skipped.
- iOS production JavaScript/Hermes export: `pnpm --filter @fitness-battle/mobile exec expo export --platform ios --output-dir /private/tmp/fitness-refinement-ios` passed. This verifies native bundling of the per-icon package entries, not a new installed native binary.
- Added a header integration check for the independently navigable profile and effort grouping, streak placement and Debug outside the group. Extended field interaction coverage to check bounded inline scene height and preserved viewport through expansion.
- Expo browser review uses local debug fixtures; they do not represent a live tracker connection.
- Checked the header at 320px and 390px widths, plus populated Home and 2D/3D inline/fullscreen fields and return navigation. Review images: [Home](mobile-ui-2026-10-23/home-refinement.jpg), [fullscreen Compete](mobile-ui-2026-10-23/compete-refinement.jpg).
