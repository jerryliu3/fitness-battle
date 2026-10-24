# Mobile consumer UI audit — October 23, 2026

Owner follow-up: the initial pass was verified by the owner after PR #308. The [follow-up decisions](mobile-refinement-2026-10-23.md) supersede this report's temporary emoji choice, header recommendation and faint divider treatment. Mapbox and finer score history are excluded from the current UI work. The original findings and implementation record below remain as history.

## Assessment

The app has enough functionality to feel like a carefully designed consumer product. The larger gap is coherence: screen composition, information hierarchy, illustration, and touch behavior have accumulated independently. Adding features would create more places to resolve these problems.

Venmo, Instagram and Strava have different aesthetics. The useful common reference is their confidence about what matters on each screen, consistent visual assets, and predictable response to touch. A screen should work as a composition before individual cards are decorated. Mobile also needs to feel good between screenshots: finger tracking, interrupted animations, scrolling, dismissal and returning to the same place.

This audit inspected the native Expo source, the living design/component guides, the Goalmaxxing chart reference, and the actual Expo components in a phone-width browser preview. A booted iPhone in Xcode Device Hub showed a different installed build (older header, Home chart and navigation); it was useful contextual evidence, but does not validate this worktree. These are source/layout/interaction findings, not a claim that the updated app has passed native-device or physical-haptic QA.

## Ranked findings

| Priority | Finding and evidence | Effect on the experience | Direction |
| --- | --- | --- | --- |
| 1 | `f.card` supplies four borders, 20px inner padding and rounded corners to unrelated full-row sections. Home's chart adds another 18px inside the page gutter. | The user sees a stack of boxes before seeing a personal training story. Charts and content feel small despite generous whitespace. | Use page sections and quiet separators for continuous content; reserve cards for an actual grouped task, hero artwork or side-by-side summaries. |
| 1 | `FocusSegments` switches each button's background immediately. Home and effort charts originally expose SVG output without a scrub interaction. 2D lanes originally expose button zoom and an explicit pan mode. | The interface acknowledges taps but rarely follows a finger. This is a major reason it feels closer to a responsive dashboard than a mobile product. | Continuous selection indicators, inspectable data with meaningful haptics, pinch zoom and a real fullscreen exploration destination. |
| 1 | Sport picker icons are inline SVG path strings in `packages/shared/src/product-icons.ts`; activity icons separately use Run/Ride/Walk/Lift from `sport-mark.ts`. The streak flame is another hand-authored path. | Inconsistent weight, silhouette, meaning and finish make the UI look assembled from placeholders. | One mobile sport treatment now: system emoji. Longer term, use a documented symbol family for utility chrome. |
| 2 | The compact header combines an effort number, progress meter, streak, Debug control and profile. Nested score/caption text can compete for width. | Too many small objects compete before the screen's primary content. The header loses identity and legibility on narrower phones. | Protect the numeric score, let secondary copy shrink, and keep developer controls out of the normal release experience in a separate release-focused pass. |
| 2 | Numerous uppercase kickers, small supporting labels and similarly weighted blocks compete with the useful numbers. | Density is spent on explaining the interface rather than presenting the athlete's progress. | A primary number, a short contextual sentence and subordinate detail. Audit real long names, large text and empty states before adding more labels. |
| 2 | The design system combines a scenic mountain hero, illustrated 3D field, liquid capsules, Ember, custom line icons and miscellaneous text symbols. | Each asset may work alone; together they do not yet establish one deliberate visual language. | Keep the selected identity, but constrain where illustrations appear and standardize utility icons. Additional art directions are not needed to solve the current problem. |
| 2 | Some interactions exist in principle but lack native evidence: direct pinch, gesture handoff, chart haptics, fullscreen transitions and large-text layout. | A still screenshot can look finished while daily use feels fragile. | Treat physical-device interaction review as a release criterion, with realistic accounts and multiple phone sizes. |

## Changes in this pass

| Request | Implemented behavior |
| --- | --- |
| Sport icons / Latest activity | Shared mobile `SportIcon` renders 🏃 / 🚴 / 🚶 / 🏋️ using the system emoji font. Activity rows reuse it instead of the word “Ride”. No image generation or new native module. |
| Icon provenance | The previous sports were inline paths with no named-library attribution in that file. Code inspection cannot establish whether a person or generator authored them. `sport-mark.ts` deliberately returns the text abbreviations. |
| Preferences switches | Explicit `alignSelf: "center"` overrides React Native's iOS Switch default of `flex-start`. Active sports use centered divider rows. |
| Data Sync | A simpler download-to-tray mark replaces the irregular circular arrows. Home's Sync action and settings use the same canonical path. |
| Header streak | System 🔥 replaces the monochrome custom flame. iOS supplies Apple's emoji; Android uses its own platform emoji. |
| Journey spacing | Right-side date/caption width ends 10px before the circle, mirroring the left-side relationship rather than stopping near the page midpoint. |
| Competition tooltip | Removed the information button and scoring sheet beside the Competition heading. Scoring remains available from Athlete. Athlete identity labels in the field remain. |
| Fullscreen | Tap the field background or its explicit expand button. A native fullscreen Modal covers the app header and bottom tabs, supports system Back, and fills the remaining safe-area height. The fullscreen 2D/3D selector updates the underlying selection too. |
| State through expansion | Viewport, athlete selection and both horizontal scene anchors belong to the parent. One active scene is rendered in the chosen presentation. Moving into/out of the native Modal remounts the scene host, with its horizontal anchor restored; this is not a claim of an uninterrupted shared-element expansion animation. |
| 2D pinch | Two-finger distance continuously changes the bounded viewport span. A normal embedded one-finger vertical gesture remains available to the page. Fullscreen allows vertical field exploration; explicit inline Explore remains supported. Zoom buttons interpolate over 240ms unless reduced motion is on. |
| Containers | Added a section primitive; Home's chart, Progress training/effort/records/recap/history, profile and settings rows use open sections or separators. Real grouped cards and the paired Compete previews remain. This is a targeted pass, not a blind global removal of `f.card`. |
| Charts | Home, effort history, training week/month/year and personal records share touch inspection: nearest rendered point, crosshair, readable value/date, selection haptics on point changes, and accessibility increment/decrement. Vertical gestures can yield to page scrolling. Annual training now fits all twelve buckets in the available width. |
| Home chart width | Removed nested card padding, expanded the plot across the content gutter and increased the plot height to 210px. The plot line uses the existing teal token for contrast; yellow remains the progress fill/accent. |
| Multi-option controls | One measured animated highlight moves between options in `FocusSegments`; underline tabs use the same mechanism. Existing controls inherit it, including units, range, score track and field mode. Initial layout and reduced-motion changes are immediate. |
| Selected bottom tab | Icon and label use Ember yellow on a dark tinted selected pill. The darker tint preserves contrast for small yellow labels while retaining the floating rounded navigation treatment. |

The chart's interaction layer does not manufacture denser data. Home inspects available current-week cumulative day values; training inspects actual calendar buckets; records inspect actual attempts. The effort model still reconstructs daily levels from closed-week results plus the current score, and now labels that limitation. Exact intraday effort history would require a separate data model.

## What should happen next

1. Review the same real athlete on a narrow iPhone, a larger iPhone and Android. Check tap → drag → vertical scroll, interrupted gestures, rotation, large text, modal Back and return position. A mouse preview cannot establish physical haptic quality or frame pacing.
2. Simplify the header in the release experience and review screen hierarchy with loaded, empty and error states. Do not use new features as a substitute for that work.
3. Standardize the remaining utility icons. [Expo Symbols](https://docs.expo.dev/versions/latest/sdk/symbols/) exposes SF Symbols on iOS; [Lucide](https://lucide.dev/) is another documented family for a consistent cross-platform treatment. Choose one deliberately before replacing isolated glyphs. There is no need to extract Strava's assets to achieve clear sport recognition.
4. Refine the field's visual balance on device: marker size, readable peer identities, scenery prominence and the amount of competition visible at default zoom. Keep the existing shared viewport and scoring contract.
5. Extend the section/card distinction to remaining Crew and settings subflows after inspecting their real content. Preserve cards when grouping is meaningful, rather than treating borders as universally wrong.

## Garmin routes and maps

[Garmin's Activity API](https://developer.garmin.com/gc-developer-program/activity-api/) provides activity details and activity files, subject to program access and user consent. [FIT Activity files](https://developer.garmin.com/fit/file-types/activity) can contain GPS tracks, timestamps, laps and sensor data. GPS availability depends on what the device recorded; indoor activities need not contain a route.

That is the route data, not a ready-made map UI for this app. A route display consists of:

1. Importing the actual coordinate series from activity details/FIT/GPX/TCX.
2. Retaining it under the owning activity and generating a simplified display geometry.
3. Drawing that geometry over a map SDK's basemap, with start/end and fit-to-route behavior.

[Apple MapKit overlays](https://developer.apple.com/documentation/mapkit/mapkit-overlays) and [MapLibre's shape sources](https://maplibre.org/maplibre-react-native/docs/components/sources/shape-source/) illustrate the rendering layer. A cross-platform map stack also needs a basemap/tile source and appropriate attribution. We do not need a routing/directions API to draw an already recorded GPS track; geocoding, search and turn-by-turn routing are additional capabilities only if the product needs them. A small route silhouette can be drawn without a basemap.

In this checkout, `mapGarminActivity` consumes summaries, and `activity-files.ts` summarizes GPX/TCX points into totals. Those paths do not retain a displayable coordinate series. Connecting Garmin alone will not make route previews appear. Route import/storage/rendering should be a separate reviewed feature, with private activity routes as the starting visibility and explicit decisions before showing them to Crew. No Garmin ingestion or connection behavior was changed here.

## Verification

The [Home review image](mobile-ui-2026-10-23/home.jpg) uses the existing local debug fixture in the Expo browser renderer; it is not a screenshot of an updated native binary.

- `pnpm typecheck` — passed across all workspaces.
- `pnpm test` — passed: 352 shared, 121 mobile, 271 web, 16 rankings and 2 pursuit tests; 5 existing web tests skipped.
- `pnpm build` — passed for the web application, including the shared icon/presentation changes.
- Added coverage for measured segment animation, chart coordinate mapping and selection/haptic behavior, pinch bounds/page-scroll separation, and fullscreen selection/viewport/anchor preservation.
- Expo browser preview: populated Home, Compete 2D and 3D fullscreen, and return navigation inspected using the existing local debug fixtures. These fixtures are presentation data, not live tracker connectivity.
- Native-device execution of this worktree, two-finger hardware feel, VoiceOver and physical haptics remain unverified. The already running Device Hub build is different and was not replaced.
