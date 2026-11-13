# Native chart label proportions — November 13, 2026

The shared chart label correction was measuring SVG artwork instead of its
viewport. In react-native-svg 15.16.0, `Svg` forwards `onLayout` to its inner `G`;
on iOS that reports the union of the children's artwork bounds. Using those bounds
to cancel viewport scaling enlarged and stretched the labels, and made their
proportions depend on chart content.

`ChartSvg` now measures a native `View` enclosing the SVG. Text still uses the
same SVG coordinates and anchors as the plot, with the existing Manrope Medium
13-point caption recipe and accessibility font scaling. No font, chart engine,
data, or axis visibility changes.

Native captures on the iPhone 18 Pro simulator (iOS 27.0), with the same Home
data, device size, and appearance:

- [Original Home](home-before.png)
- [Corrected Home](home-after.png)
- [Corrected Progress](progress-after.png)

The controlled Home comparison temporarily restored the original component,
captured it, and restored the fix. Original labels are visibly taller/larger;
corrected labels retain natural proportions while their anchor positions and
plot geometry remain aligned. Physical-device and Android appearance were not
verified.

Validation: mobile typecheck passed; all 351 mobile tests passed. The chart tests
now measure the native frame rather than invoking the SVG artwork callback and
retain coverage for nonuniform scaling, accessibility font scaling, and plot /
inspection alignment at multiple widths.
