# Web Full Arena viewport follow-up

October 25, 2026. Stacked on competition replay PR #349.

The root dialog already covered the viewport, but its persistent field kept its
inline width/height and a uniform scale transform. That produced a centered,
letterboxed field. The scene now reflows at the dialog's full viewport dimensions;
its existing ResizeObserver updates lane geometry. The same scene/portal stays
mounted so selection, distance window and horizontal lane anchors survive.

Expansion/collapse animates only a reveal clip. Fullscreen 2D wrappers and the
3D board have a definite viewport-sized layout, no card margins or rounding,
and no document scroll. Zoom stays above the spotlight. The HUD remains mounted
through collapse, avoiding a flash of placeholder controls. Keyboard focus returns
to a visible expansion control if a dimension change hid the original trigger.
The unused uniform-scaling helper and its obsolete tests were removed.

Manual browser verification checked both dimensions at 1202×1404, 1600×900 and
390×844. Fullscreen scene bounds match the viewport exactly with transform=none.
The walkthrough covered dimension switching, a rival selection, return to inline,
Escape dismissal, and replay open/close from the fullscreen HUD. Inline Compete
has no replay trigger; recap/history still open their own fullscreen replay viewer.
[Phone 2D](phone-2d.png) · [Phone 3D](phone-3d.png).

This is a web layout change. The original native replay implementation is in
#349; its iOS JS bundle was produced, but the installed simulator binary has a
React Native / Worklets version mismatch and needs rebuilding before an actual
native interaction walkthrough. No native-device test is claimed here.

Type checks, automated tests and production builds were not run, following the
owner's earlier request. The running web development server compiled the change.
