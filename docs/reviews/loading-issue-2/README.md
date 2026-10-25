# Issue 2: over / taek launch animation

The default loader on web and mobile is the existing 35% clean staggered logo
race, with shared platform-independent motion and SVG geometry. The Ember loader
is retained intact as `variant="ember"`. The selected race uses product
ink/paper/tennis colors and the existing Nunito Sans Black font.

`/design/loading` previews and replays either actual web loader. The mascot
launch study explicitly selects Ember so its authoring controls keep working.

Validation:

- `pnpm typecheck`: passed across the workspace.
- `pnpm test`: passed (832 tests, 5 existing skips).
- `pnpm build`: passed.
- `expo export --platform ios --output-dir /tmp/fitness-logo-ios --no-bytecode`:
  passed; bundle verification, not a native device visual check.
- Browser review: desktop and 390×844 phone viewport; both loaders complete and
  retain the final mark/loading indicator. Screenshots accompany this note.
- Clock regression tests verify background pause/resume, completion once, reduced
  motion, and final mark retention. Shared/study tests cover the three lead
  changes, continuous forward motion, overlap and finite bounded render inputs.
- Issue 1's readiness-gate regressions continue to pass.

Native visual smoothness and glyph rendering still need a device/simulator pass.
No backend, migration, scoring, connection or account settings change is included.
