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
  Stop: "SvgStop",
  ClipPath: "SvgClipPath",
  Mask: "SvgMask",
  Pattern: "SvgPattern",
  Image: "SvgImage",
}));
