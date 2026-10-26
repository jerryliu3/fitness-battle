# Geographic course navigation

A course is presentation geometry, separate from activity ingestion and scoring.
GPX imports do not record workouts or change competition totals. One continuous
GPX track segment or route is accepted; disconnected tracks are rejected rather
than connected with an invented straight line. Input is bounded to 4 MB and
20,000 points. Native/web share a cumulative metre index with logarithmic seeks.

Distance fields convert km/mi to metres and place athletes along the same route.
Points-based fields retain the existing visualization. Progress clamps at the
finish; it does not silently wrap or change standings. Course selection is local
to the current view, not a server-authoritative assignment to other participants.
Shared published course assignment is a separate product/data change.

The geographic view uses one platform-agnostic camera controller. Focus resumes
following; direct manipulation, zoom and overview suspend it. Two-dimensional
and chase views use the same map instance. The map engines execute gestures,
inertia and camera animations; React does not drive the camera every frame.
Reduced Motion makes programmatic transitions immediate.

Follow-up implementation layers:
1. Shared GPX/course index and camera contract.
2. Native Mapbox and web Mapbox GL adapters; GPX and Directions route chooser.
3. Physical-device and native-build validation, with limitations recorded below.

Mapbox Standard supplies scenery. We do not add or maintain a custom city asset
library, or add Skia in parallel. Mapbox credentials come through existing env
modules, and attribution remains visible. Map styles/tile availability depend on
Mapbox service access. Route generation uses explicit waypoint coordinates and
a walking/cycling profile; choosing only a city is not sufficient to invent a
safe or meaningful race course. No live GPS permission is required.
