# Compete background field and bottom sheet

Superseded by the November 7 [event home and immersive field flow](../compete-event-home/README.md).

Implemented November 6, 2026 from the owner's reference image and revised request.
The permanent competition field replaces the separate fullscreen mode. Existing
Everyday Club colors, typography, real field values, eligibility, privacy, queue,
registration and result paths remain in use. No Feed feature is introduced.

The sheet starts partially expanded, minimizes to its header, and expands above
persistent bottom navigation. Its grip accepts dragging; labeled controls support
all states. Native additionally exposes adjustable accessibility actions; web has
arrow-key adjustment and Escape to minimize. Contents remain mounted and scroll
independently. Native uses Animated/PanResponder; web uses a fixed pointer-driven
panel. Sheet movement never changes field dimensions. Distance stays geographic
3D and points stay 2D. Event selection explicitly replaces the selected field.

The partial view leads with event selection and standings. Register stays in its
header. The week summary and existing results/all-time destinations remain below
the table. The old fullscreen Back/Close controls and positions/player panels are
removed from the new background composition; athlete map cards and map options
remain available. Legacy inline/replay consumers retain their existing behavior.

Screenshots from the iPhone 18 Pro simulator on iOS 27.0, using local demo data:

- `partial.png`: the default sheet with the map visible above standings.
- `expanded.png`: standings fills the content area; bottom tabs remain available.
- `minimized.png`: the header remains while the field is exposed.

Observed native partial/expanded/minimized states with labeled and accessibility
controls. Automated coverage checks web dragging, keyboard snapping, tab hiding,
and preservation of mounted content, plus the existing native field and arena
interactions. No release-device latency measurement is claimed.

Mobbin search was unavailable because the connector requires a paid plan. This
layout uses the owner's attached reference, not uninspected third-party screens.
