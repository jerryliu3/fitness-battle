# Persistent competition timeline

The main Compete field and fullscreen field now share a timeline cursor on web
and native. Replay plays in place, dragging pauses, and Latest restores live
totals. Historical inspection uses the existing event reconstruction and does
not write competition data. Archived rounds retain their existing replay viewer.

Validation: workspace `pnpm typecheck`, `pnpm lint:ui`, 10 focused web tests,
24 focused native tests, and the production web build passed. Regression cases
cover live versus historical totals, reverse seeking, interpolation, automatic
completion, background/tab pause, unit conversion, account/wave changes,
Debug reset, retry, and retaining time across expansion and view changes.

A local browser walkthrough checked the actual 2D field at desktop and 390×844,
including keyboard scrubbing, starting-line visibility, automatic playback and
fullscreen controls. The [phone screenshot](web-phone.jpg) shows the starting
line with the timeline, distance overview and athlete panel visible together.

The local environment has no Mapbox token. Geographic integration tests use
mocked renderers; no live geographic-map or installed-native-device walkthrough
was performed. The preview used local demo data, with its partial history and
simulated daily steps disclosed.
