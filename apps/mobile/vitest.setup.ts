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
