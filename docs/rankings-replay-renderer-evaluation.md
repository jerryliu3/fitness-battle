# Race replay renderer decision — November 9, 2026

Decision: retain the existing Mapbox GL JS and native @rnmapbox/maps integrations. The application already ships both renderers, token/env handling and attribution/privacy controls. A reviewed polyline and a batched point source implement the required replay without adding a rendering SDK. This is an implementation-fit decision, not a claim that Mapbox is cheapest or fastest; those require actual usage and device measurements.

## What the reference actually lists

[Marathon Replay privacy](https://www.marathonreplay.com/privacy), retrieved again November 9 via HTTP, lists Vercel hosting/analytics, consent-based PostHog, Google Fonts and optional Google Maps photorealistic 3D tiles, Esri/OpenStreetMap map tiles/building data, and jsDelivr for an open-source 3D library. That is a stated inventory, not a network audit. The policy does not identify Mapbox or name the 3D library. Hosting, analytics, fonts and a library CDN are not alternatives to a map renderer.

| Option | Fit for this application | Decision |
|---|---|---|
| Mapbox GL JS + existing native SDK | Existing web/native stack; custom GeoJSON line and point layers; reuse map credits and native telemetry preference | Use for this phase |
| Google photorealistic 3D Tiles | Attractive city meshes; requires a compatible 3D Tiles renderer, API key, enabled service and billing. Useful for a future cinematic camera, not needed to plot runners on a course | Defer |
| Esri services with MapLibre | Viable alternative: Esri documents a MapLibre plugin/location-services stack requiring an account. Introduces a second service/renderer integration and migration work | Reconsider if basemap/licensing/usage requirements justify it |
| OpenStreetMap data | Can underpin a licensed hosted or self-hosted basemap. Public OSM tile servers have usage requirements and best-effort availability, not an unlimited production tile service | Do not introduce public tiles as a presumed free replacement |
| jsDelivr / generic 3D library | Distribution/rendering pieces, not a basemap, course data source or complete native/web mapping service | No new CDN dependency |

Primary evidence: [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/guides/), [GeoJSON source updates](https://docs.mapbox.com/mapbox-gl-js/example/live-geojson/), [native ShapeSource](https://rnmapbox.github.io/docs/components/ShapeSource), [Google photorealistic tiles](https://developers.google.com/maps/documentation/tile/3d-tiles), [Esri + MapLibre](https://developers.arcgis.com/maplibre-gl-js/), [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).

## Implementation and limits

Course geometry contains edition-specific, reviewed cumulative distance at every vertex. This keeps loops and out-and-back paths ordered and avoids nearest-point guessing or automatically stretching arbitrary GPX lengths. The acquisition workstream owns converting/reviewing permitted GPX/GeoJSON into this representation and establishing checkpoint alignment. The product validates coordinate/distance bounds but cannot certify geography from syntax alone.

The shared replay model interpolates only between adjacent observed timing mats on the same clock, hides missing intervals, never moves before an actual start in race-day mode and holds only the observed finish after completion. Elapsed comparison is separate from race-day time, which requires chip timing and all loaded actual runner start timestamps. Official elapsed times include start delay and cannot establish an actual runner start; race-day mode is withheld for that clock. No runner GPS observations or exact passes are claimed. Non-finishers remain excluded under existing public-result eligibility rules.

Single runners link from reports; compatible pairs link from comparisons; saved selections are filtered by edition/category/clock. Full timing-field mode is opt-in, cancellable and keyset-paged in batches of 1,000 without a 200-runner cap. Category can include the entire race. Raw timing arrays are transferred, never per-second GPS tracks. Course changes invalidate an in-progress load. Pages are individual snapshots; result changes during loading are not a revision-pinned field snapshot.

Markers use one batched source and circle layer, not per-runner DOM/native views. Selected/group updates run at most five times per second and fields over 1,000 profiles at most twice per second. Positions use binary searches over checkpoint times and measured course distances. No continuously moving camera is required; map gestures remain user-controlled. Reduced Motion uses manual seeking; web hidden/offscreen and native background/blur/scroll pause playback. Existing Mapbox marks, credits and native privacy controls are retained.

Functional regressions include a 50,000-profile calculation case. This does not establish GPU/device frame rate, memory, network cost or production readiness. Browser/simulator and representative physical-device performance, live course alignment and permitted real-data acceptance remain release gates. No pricing, quota, plan or account configuration was changed. Course/split records remain unpopulated by this work.
