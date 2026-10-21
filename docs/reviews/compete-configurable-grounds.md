# Configurable Compete grounds — implementation and deep review

October 21, 2026. Branch starts from `origin/main` at `985598c`, including merged PR #234. This is a standalone production follow-up; it does not depend on merging the earlier study PRs.

## Selected behavior

- Liquid Glass, faint underlay and Banked trail are the production 2D treatment. Capsule identity and the canonical wake clock are retained.
- All nine accepted grounds are selectable per event on web and mobile native. Contour Atlas stays retired. Club surroundings add turf, planting and benches to every ground; Open edges remains available. Meadow Trail / Club grounds is the default.
- Device-local settings are scoped by account and sport, shared between score lenses for that event, and stored separately from competition/account state. They do not sync between devices or write to the server. Failed storage retains an in-memory selection.
- Map zoom changes both axes and capsule scale. The overview shows zero through the actual field leader, excludes the unranked ghost from its extent, and clips the view window to that extent. Click/tap, drag and accessibility actions navigate the existing view state without modifying totals or rank.
- Closed ovals normalize one loop to the displayed distance unit (1 km or 1 mi); effort uses an explicitly labeled 20-point circuit. Total distance/effort and completed laps stay authoritative. Overview navigation zooms toward the corresponding circuit position, including zero. This is an illustrative board, not a regulation 400m track or GPS recording.
- The new implementation preserves #234’s independent event fields, global score lens, standings totals/effort scores and mobile navigation. Web expansion keeps its existing persistent scene. Native retains its existing Explore/pan interaction.

## Code boundaries

`packages/shared/src/field-appearance.ts` owns the typed ground catalog and defensive preference parsing. `field-course.ts` owns pure geometry, bounded world scenery, the static SVG scene, the canonical head exclusion and overview math. Neither imports React, Next, Expo, native or DOM modules.

Web and native `field-course.tsx` adapters paint the same scene with DOM SVG and `react-native-svg`. Platform storage and accessible controls stay in their respective apps. The production code imports no study modules, fictional sessions or fixtures. The aggregate Banked trail needs no invented peer session history. Existing scoring, unit conversion, overtake reconciliation, Eastern periods and backend writes are unchanged. No dependencies, lockfile changes or migrations.

The installed Next 15.5.27 package has no bundled `dist/docs`; its official [version-15 client-component guidance](https://nextjs.org/docs/15/app/getting-started/server-and-client-components) was read before editing the client UI. The app keeps its existing routing and server boundaries.

## Deep review

A second source/interaction review followed the initial implementation. Reviewed geometry and units, map range/zero/leader boundaries, capsule paint order, stable lane identity, preference hydration/account changes, scene reuse, accessibility, and parity with the merged native component composition.

Findings corrected before PR creation:

1. **Crowded-field scale disappeared with horizontal scrolling.** The single integer scale is now a separate fixed overlay on both platforms. There are no sub-unit cross-track rules or repeated numeric lane labels.
2. **A winding ground could appear motionless when its edge scenery was outside the phone viewport.** World-anchored meadow details now remain between racers, and move with the same distance camera.
3. **Oval start navigation inherited a linear-track lower bound.** A course-specific clamp permits the true zero circuit position; normalized lap tests cover distance and effort.
4. **Native preference hydration could overwrite an immediate selection.** A generation guard rejects stale reads after edits; cancellation and account-key checks prevent cross-account hydration. Regression exercises both cases.
5. **RN Web converted an accessible SVG group into an HTML button inside SVG, hiding racers.** A web-only SVG target retains the `g` element and implements pointer/keyboard semantics. iOS/Android retain the native SVG target. Unit and browser checks require valid SVG racers.
6. **A camera tween could compete with per-racer layout animation.** Camera/ground changes now apply field positions directly, while the existing standings transition remains available. Static course paint is memoized separately from the wake clock.
7. **Expo web omitted the overview value from its accessibility output.** Explicit ARIA values complement native accessibility values/actions; the real export verifies click navigation through the exposed current value.
8. **Existing capsule raster verification assumed a single SVG root.** Its extraction now handles the separate fixed scale and nested Ember SVG while continuing to raster-check actual capsule visibility at field edges and in standings.
9. **Oval and unfolded courses use different lateral geometry.** Switching between them or changing the roster resets the horizontal anchor to the athlete, while ordinary resizing/zooming retains the explored lane anchor.

No unresolved blocking findings were identified in the changed code. Native fullscreen/pinch and other gaps already documented by #234 are not introduced or claimed as fixed here.

## Verification

- `pnpm typecheck`: all workspaces pass.
- `pnpm test`: shared 270, rankings 16, pursuit 2, mobile 84, web 220 — **592 pass**, five existing database-dependent tests skipped.
- `pnpm build:web`: passes.
- Normal `expo export --platform all`: web static routes plus iOS/Android JavaScript/Hermes bundles pass.
- [Web browser report](compete-grounds/web-report.json): 54 ground/surrounding/viewport combinations at 1440, 390 and 320 px. Saved choices, independent events, keyboard/click overview, unchanged totals, retained scene across standings/expansion and no runtime errors.
- [Native component export report](compete-grounds/native-report.json): 36 ground/surrounding/viewport combinations at 390 and 320 px. Valid SVG targets, saved and independent event choices, tap navigation and no runtime errors. Native unit tests additionally exercise actual gesture/accessibility callbacks and stale storage reads.

Browser checks use disposable local demo state and no live account or tracker writes. Normal native exports establish bundling; an installed iOS/Android binary, device gestures and mobile GPU performance were not exercised. This limitation does not imply device verification from Expo web.

Review captures: [web 390px](compete-grounds/web-390.png), [web 320px](compete-grounds/web-320.png), [native component tree 390px](compete-grounds/native-390.png), [native component tree 320px](compete-grounds/native-320.png).

## Latest-main reconciliation and light review

October 21, 2026: merged `origin/main` at `a77aa45` into this PR, retaining #218's study history, #236's native review fixes and #235's self-review fixes. The only textual conflict was the design guide; it now preserves the earlier exploration under an explicit history heading and keeps the production selection authoritative.

Confirmed that the integrated field retains animated rank from the shared frame and selection without the retired athlete card. Tracker ownership checks, one-time callback consumption, retained Progress navigation, demo seed persistence and the orange native effort trend remain the upstream implementations. Their regressions pass alongside the field tests. No tracker, account or database implementation was rewritten in this reconciliation.

The light pass corrected two remaining native parity details: the header's no-photo fallback now uses the same muted shared person icon on white as web/profile settings, and the past-self marker scales with the Map lens like its web counterpart. The 44px native header press target is retained.

Post-merge workspace typecheck and tests pass: shared 270, rankings 16, pursuit 2, mobile 96 and web 238, totaling **622 passed**, with five existing database-dependent tests skipped. The mobile suite was repeated after the two small parity adjustments and passes all 96 tests. The installed-device limitations above still apply.

The merged production web build and normal Expo web/iOS/Android exports also pass after the parity adjustments.
