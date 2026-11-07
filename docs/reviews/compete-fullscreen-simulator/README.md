# Compete simulator review — November 5, 2026

Tested the current worktree on the iPhone 18 Pro simulator, iOS 27.0, using
the installed native development build and this checkout's Metro server on 8086.
Used local demo account data and the project's existing public Mapbox token.
The token remains in ignored local environment configuration.

Observed flows:

- Fullscreen geographic field with app header and bottom tabs hidden.
- Events & standings opens the details surface; Return to field restores the map.
- Fullscreen Back returns to Home; tapping the Compete bottom tab reopens the
  retained field with the same visible camera framing and athlete selection.

Simulator inspection found inline standings painted over the persistent field.
The persistent field now omits that inline list; the details surface retains it.
The Events & standings action now occupies the fullscreen top bar so it does not
cover the current-positions heading. Regression coverage checks the omitted
inline rows and the details callback. Native typecheck and all 15 targeted
field/arena interaction tests passed; the expanded field regression suite also
passed after adding those assertions.

Screenshots:

- `01-fullscreen.png`: corrected fullscreen map and controls.
- `02-standings.png`: event chooser and full standings.
- `03-home.png`: Home after exiting the field.
- `04-reentered.png`: field after selecting Compete from the bottom tab.

These are visual simulator checks, not a measured 100 ms entry benchmark. A
separate cold relaunch returned this local demo account to onboarding, so the
first-entry-after-cold-start path was not established by this session. Release
device launch latency and memory-pressure recovery still need validation.
