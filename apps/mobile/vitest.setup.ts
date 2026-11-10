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

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

vi.mock("react-native-purchases", () => ({
  default: {
    configure: vi.fn(),
    logIn: vi.fn().mockResolvedValue({}),
    getOfferings: vi.fn().mockResolvedValue({ current: null }),
    purchasePackage: vi.fn().mockResolvedValue({ customerInfo: { entitlements: { active: {} } } }),
    restorePurchases: vi.fn().mockResolvedValue({ entitlements: { active: {} } }),
    addCustomerInfoUpdateListener: vi.fn(() => () => {}),
  },
  PACKAGE_TYPE: {
    ANNUAL: "ANNUAL",
    MONTHLY: "MONTHLY",
    LIFETIME: "LIFETIME",
  },
  PURCHASES_ERROR_CODE: {
    PURCHASE_CANCELLED_ERROR: "1",
  },
}));
