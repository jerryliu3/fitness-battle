# Home — Portfolio + Signal Room

The October 25 selection combines Portfolio's quiet cumulative hours chart with
Signal Room's dark daily-health tiles, on web and native iOS/Android.

The chart keeps the existing Eastern weekly hours comparison and eligibility.
It removes the weekday labels/picker, uses a teal line and subtle area, shows the
week's start/end dates and a quiet dashed previous-week comparison. Current week,
session count, Sync/Add actions and the week detail entry remain. Native retains
horizontal chart inspection and screen-reader adjustments.

Today's health sits immediately beneath the progress chart. Four selectable tiles
show Sleep, Steps, Resting HR and HRV. Only today's stored sleep duration is currently
available in the app's health model. Historical sleep appears as a seven-wake-date
sparkline with gaps preserved and source/wake date in the reading details. Stale,
future, history, known generated sample nights and stub tracker data are excluded
from today's value. The other three metrics explicitly show unavailable until a
separate data integration exists. Workout HR/distance and readiness/sleep scores
are never substituted. No new health permissions, API, persistence, migration,
goals or scoring changes are introduced.

The production palette is the shared HOME_HEALTH_COLORS token set. Readable text,
44px+ tile controls, explicit expanded states, wrapping, and native single-column
layout at larger font sizes are part of both implementations.

Validation: workspace typecheck and full tests passed, followed by focused shared
and native tests for missing/stale/sample readings, chart geometry, chart gestures,
metric expansion and larger text. Production web build and iOS Metro export passed.
Browser review at 390px and 320px confirmed heading contrast, wrapping with no
horizontal overflow, recorded sleep details and unavailable metric explanations.
Screenshots show a local synthetic account's existing recorded data. Physical
native-device and VoiceOver review remain outstanding.
