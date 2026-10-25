# Issue 7 — map first and recorded replay observations

Web and native session detail now place the recorded map before session metadata,
time summary and receipts. Suggestions/non-GPS activities stay map-free.

GPX, TCX and FIT imports retain optional distance-aligned replay samples with
recorded elapsed time, speed, HR and cadence. Speed falls back to consecutive GPS
point distance / elapsed time only across intervals of at most 30 seconds; the
viewer discloses this. TCX/FIT running stride cycles become steps/minute (including
FIT fractional cadence); cycling remains rpm. Ambiguous GPX running cadence is
left unavailable. GPX HR/speed and cycling cadence are retained where recorded.

The 2D/3D HUD follows the same distance-progress cursor as the route. It shows the
nearest recorded observation, leaves individual missing sensors blank, and does
not carry measurements across gaps longer than 30 seconds. Series are validated,
ordered, bounded to 20,000 samples, and passed in native/Expo-web bridge messages,
never scene URLs. The optional series survives ingestion in the activity row and local state.
After refresh it is fetched lazily through an owner-filtered, RLS-backed endpoint
only when the route opens, so account hydration never loads every sensor series. No averages are presented as instantaneous measurements.

Apply `20261025023647_activity_replay_samples.sql` before server deployment. This
adds one nullable JSONB array column to existing owner-scoped activities; no RLS,
profile access, scoring, track eligibility or connection rules change. Existing
files require reimport to populate samples. Existing Strava history has no sensor
streams fetched by this change and remains map-only unless samples are present.
The native viewer requires the corresponding web deployment at EXPO_PUBLIC_API_URL.

Verification: workspace typecheck/tests and web build; parser fixtures for GPX,
TCX and FIT, sample selection/gaps/sanitization, store upsert and owner-only lazy reads,
HUD unit/missing-value behavior and native bridge transfer. Docker is not running
locally, so the migration has not been executed against a local database or applied
to production. Native device and live Mapbox smoke tests remain outstanding.

Cadence reference: [Garmin FIT cadence discussion](https://forums.garmin.com/developer/fit-sdk/f/discussion/288454/fractional-cadence-values/1391870),
[Garmin TCX activity extension schema](https://www8.garmin.com/xmlschemas/ActivityExtensionv2.xsd).
