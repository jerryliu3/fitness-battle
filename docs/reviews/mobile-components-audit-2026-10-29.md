# Mobile component audit, October 29, 2026

The largest opportunity is a consistent family of action buttons, filter chips and navigation rows. Pill actions would suit the current Everyday Club shell. Changing corner radii alone would leave oversized secondary actions, competing chip styles and uneven interaction feedback.

This is a proposal, not a new production design decision. The current guide explicitly selects 12px controls, 20px cards and 24px sheets. Keep the palette, Manrope hierarchy and selected chart designs.

## Scope and evidence

Reviewed the current native source for Home, Compete, Progress, Crew, Athlete, activity detail, settings, forms and shared controls. Inspected checked-in Home/Progress typography captures, profile form, activity detail, geographic field overlays and Crew captures. These captures are from earlier reviews and are supporting examples; the current source determines findings. No fresh device session, gesture test or accessibility test was performed.

Mobbin returned a paid-plan requirement. No external app comparisons are claimed.

## Ranked opportunities

| Priority | Opportunity | Examples | Relative effort |
| --- | --- | --- | --- |
| 1 | Establish pill action buttons | Save profile, Invite, Save activity, Connect | Small to medium |
| 2 | Give secondary navigation less visual weight | Explore route, Last week results, View all time standings | Small |
| 3 | Consolidate filter chips and compact pickers | Activity detail lenses, training sports, personal records, history | Medium |
| 4 | Replace large choice tiles with grouped rows | Event registration, account sport settings, crew format | Medium |
| 5 | Standardize feedback and touch targets | Chips, Register, field menus, async actions | Medium |
| 6 | Simplify grids of small boxed stats | Telemetry KPI cells and vital selectors | Medium |
| 7 | Unify sheet and form presentation | Manual activity, profile editing, picker dialogs | Medium to large |

### 1. Establish pill action buttons

`FocusButton` uses `SHELL_RADIUS.control` (12), while the profile Edit control and shared icon buttons already use pills/circles. The same app therefore has two different action silhouettes. `FocusButton` has a 48px minimum height and 15px padding; with the 20px label line height, its intrinsic height is approximately 50px.

Use a fully rounded primary/secondary action shape, with a 48 to 52px regular size and a compact variant that retains a 44px touch region. Give compact actions content-based width; reserve full width for the principal action in forms and confirmations. Keep yellow with dark labels for primary actions. Standardize the HeroUI authentication button through the same visual contract.

Do not change `SHELL_RADIUS.control` globally: that token also styles settings rows and authentication tabs. Introduce an action-specific rule and update the living guide if selected.

Evidence: [button implementation](../../apps/mobile/src/ui/focus.tsx#L323), [button geometry](../../apps/mobile/src/ui/focus.tsx#L562), [radius contract](../../packages/shared/src/shell.ts#L87), [profile Edit pill](../../apps/mobile/app/athlete.tsx#L746), [HeroUI auth button](../../apps/mobile/app/athlete.tsx#L412).

### 2. Give secondary navigation less visual weight

Compete finishes with full-width outlined buttons for past results and all-time standings. Activity detail adds another for Explore route. Each inherits the same substantial footprint as a form action.

Use a descriptive row with a trailing chevron for destinations, a text action beside a section heading for short contextual links, and a compact pill for optional commands. The route preview itself could carry an Explore affordance. Preserve explicit accessible labels and 44px touch regions.

Evidence: [Compete destinations](../../apps/mobile/app/(tabs)/arena.tsx#L203), [route action](../../apps/mobile/src/ui/activity-route.tsx#L32), [existing SettingsRow](../../apps/mobile/src/ui/settings-row.tsx).

### 3. Consolidate filter chips and compact pickers

There are several incompatible implementations:

- `Chip` is fully rounded, has a 32px minimum height, and uses navy fill with white text when selected. Its text changes from caption (13/18) to label (14/20), which can change its width and height on selection.
- `f.chip` has a 46px minimum height, 24px corners and 12px vertical padding. Its selected state uses a navy border with a pale fill. It is used for filters, crew tabs, icon buttons and two-line event choices.
- `ChoicePicker` uses a 46px trigger with 14px corners. Field pickers use separate dark pill styles.

Create one filter-chip family with stable typography and geometry, a clear selected cue beyond color, and optional icon/checkmark. Give compact picker triggers the same proportions, plus a chevron. Keep multi-select checkbox behavior in the training sports menu. Keep the approved underline navigation tabs and compact chart range controls as distinct semantic variants.

Evidence: [Chip](../../apps/mobile/src/ui/chip.tsx#L36), [legacy chip](../../apps/mobile/src/ui/focus.tsx#L673), [training filter](../../apps/mobile/src/features/training-sport-menu.tsx#L38), [personal record filters](../../apps/mobile/src/features/training-history.tsx#L49), [picker trigger](../../apps/mobile/src/ui/choice-picker.tsx#L135).

### 4. Replace large choice tiles with grouped rows

Event registration renders every sport as a separate `f.chip` containing a title and subtitle. These are substantial choice rows wearing chip styling. Athlete's settings also give individual sport rows their own borders and 12px corners.

Use one grouped surface with sport icons, title/supporting text, separators and a trailing state or action. Keep actual filter chips short and single line. Event selection currently joins immediately, so label that action clearly and preserve its existing behavior unless separately approved.

Evidence: [event choices](../../apps/mobile/app/(tabs)/arena.tsx#L217), [sport settings](../../apps/mobile/app/athlete.tsx#L681), [settings row geometry](../../apps/mobile/app/athlete.tsx#L977), [crew format choices](../../apps/mobile/src/features/crew.tsx#L677).

### 5. Standardize feedback and touch targets

`FocusButton` uses the same 50% opacity treatment for pressed and disabled states and has no loading prop. `Chip` and `ChoicePicker`'s custom trigger have no pressed visual treatment. Some compact controls have no explicit 44px target: `Chip` starts at 32px, Register at 36px, and field picker triggers at 34/36px. Actual rendered size can exceed those minimums, so verify on device before declaring a measured target failure.

Give actions distinct pressed, disabled and pending states, including a spinner and stable label width where appropriate. Apply visible press feedback consistently. Allow a smaller painted pill inside a 44px layout region; avoid overlapping expanded touch areas. Keep existing deliberate haptics and Reduced Motion behavior.

Evidence: [FocusButton states](../../apps/mobile/src/ui/focus.tsx#L323), [Chip sizing](../../apps/mobile/src/ui/chip.tsx#L73), [Register](../../apps/mobile/src/features/competition-summary.tsx#L67), [dimension menu](../../apps/mobile/src/ui/field-view-switcher.tsx#L28), [ground menu](../../apps/mobile/src/ui/field-ground-switcher.tsx#L24).

### 6. Simplify grids of small boxed stats

Telemetry detail repeats pale 8px-corner KPI cells, inspection boxes and three-column vital selectors. The repeated rectangles contribute more to the dashboard feeling than the main 20px cards do.

Use open value/label pairs for static stats. Use compact selectors for metrics that change the displayed chart, with the selected reading shown once beneath them. Retain cards for meaningful groups, profile identity and map/artwork surfaces. Retain the current circular Home health gauges and selected chart treatments.

Evidence: [telemetry styles](../../apps/mobile/src/features/athlete-telemetry-details.tsx#L536), [vital selector](../../apps/mobile/src/features/athlete-telemetry-details.tsx#L226).

### 7. Unify sheet and form presentation

The app has custom bottom Modals (`FocusSheet`), a side panel for profile editing, a HeroUI `DetailSheet`, and centered picker dialogs. `FocusSheet` supplies a handle and timed slide animation but does not implement a drag-to-dismiss gesture. The handle's affordance deserves device review.

Choose a consistent contextual sheet header, close control, action placement and keyboard treatment. Use familiar field rows for date, duration and distance, while retaining text-field shapes for free text. Standardize chrome before considering a sheet implementation migration, since parent retention, modal handoffs and Back behavior already have explicit contracts.

Evidence: [FocusSheet](../../apps/mobile/src/ui/focus.tsx#L40), [DetailSheet](../../apps/mobile/src/ui/detail-sheet.tsx), [native picker dialogs](../../apps/mobile/src/ui/form-picker.native.tsx#L10), [profile side panel](../../apps/mobile/app/athlete.tsx#L850).

## Suggested first pass

Pilot the shared pill button and chip family in Compete and activity detail, including the secondary navigation changes. These screens expose the mismatch directly. Review at 320/390/430 widths, with long labels and large text, plus selected/pressed/disabled/pending states. Then apply the selected contract across Crew, Athlete, forms and authentication.

Keep the floating bottom navigation, circular icon buttons, animated segment highlight, typography and palette as the foundation. Broader card/sheet changes should follow the first component review.
