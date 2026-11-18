# Field, Health Lab and athlete card refinements

Stacked on #806. Debug controls and event actions are development-only on native
and web; release builds have no admin exception.

The native map scale uses the collapsed competition sheet's measured height plus
an eight-point gap at the left edge. Expanding the sheet covers the scale instead
of moving it. Snapshot images omit map chrome. Start-line shared-lane fanning keeps
the viewer in the center slot, or one of the two center slots for an even field.
Mystery profile markers are 20% smaller; the user's race marker size is unchanged.

Health Lab metric columns use fourteen-point gaps instead of six. Vertical dragging
moves the body in the direction of the gesture. The bundled native host is rebuilt
so the sign correction also reaches builds using local scene assets.

The current user's athlete card now mounts once at the app root after account
state loads, warms while hidden, and follows a measured slot on the Athlete page.
It clips to the scroll viewport, pauses when hidden, and remounts for a different
account. Other athletes and onboarding retain their independent card instances.
A failed WebView can retry on the next visit. Initial cold loading, unavailable
network resources and OS process termination can still require a fallback;
retention avoids restarting a healthy scene for each navigation.

Competition charts have no live pulse. Their bounds use enrollment start/end even
before the wave begins. Queued positions and previews stay at the Day 1 origin;
subsequent labels count Eastern calendar days within the actual event, including
short first/last days and daylight saving changes. Training-week bounds and
scoring are unchanged.

Validation: targeted native/shared/web renderer and model tests; mobile, web and
pursuit TypeScript checks; UI contract lint; regenerated Vitals Lab host. Device
review remains necessary for scrolling/stack transitions with the retained card,
native map scale placement and gesture feel.

From `/Users/jerryliu/.codex/worktrees/226c/fitness-battle`:

```sh
pnpm --filter @fitness-battle/mobile ios --port 8082
```

For web review:

```sh
pnpm --filter @fitness-battle/web dev
```
