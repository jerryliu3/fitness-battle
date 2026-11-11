import { vi } from "vitest";

/** React Native / Expo packages expect a Metro-style global in unit tests. */
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

vi.mock("expo-haptics", () => ({
  selectionAsync: vi.fn().mockResolvedValue(undefined),
  impactAsync: vi.fn().mockResolvedValue(undefined),
  notificationAsync: vi.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Soft: "soft", Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

vi.mock("react-native-screens", () => ({ FullWindowOverlay: "FullWindowOverlay" }));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Svg: "Svg",
  G: "SvgG",
  Line: "SvgLine",
  Polyline: "SvgPolyline",
  Path: "SvgPath",
  Circle: "SvgCircle",
  Ellipse: "SvgEllipse",
  Rect: "SvgRect",
  Text: "SvgText",
  Defs: "SvgDefs",
  LinearGradient: "SvgLinearGradient",
  RadialGradient: "SvgRadialGradient",
  Stop: "SvgStop",
  ClipPath: "SvgClipPath",
  Mask: "SvgMask",
  Pattern: "SvgPattern",
  Polygon: "SvgPolygon",
  Image: "SvgImage",
}));

// Rank art is required() as PNG. Stub image extensions when Vite does not rewrite them.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const Module = require("node:module");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (Module && Module._extensions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Module._extensions[".png"] = (m: any) => { m.exports = 1; };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Module._extensions[".jpg"] = (m: any) => { m.exports = 1; };
}
