import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";
import { GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ path: "/onboarding", params: {} as Record<string, string>, replace: vi.fn(), storage: new Map<string, string>() }));
vi.mock("expo-router", () => ({ usePathname: () => mock.path, useGlobalSearchParams: () => mock.params, router: { replace: mock.replace } }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: async (key: string) => mock.storage.get(key) ?? null } }));
vi.mock("./auth", () => ({ useAuth: () => ({ user: { id: "a", email: "taylor@example.com" }, loading: false }) }));
vi.mock("./compete-store", () => ({ useCompeteStore: () => ({ state: { onboardingCompleted: false }, loadStatus: "ready", accountKey: "a" }) }));
vi.mock("../ui/boot-readiness", () => ({ useBootOpened: () => true }));
import { OnboardingNavigation } from "./onboarding-navigation";
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks(); mock.path = "/onboarding"; mock.params = {}; mock.storage.clear(); });
it("routes an ordinary new account through the introduction", async () => {
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(OnboardingNavigation)); });
  expect(mock.replace).toHaveBeenCalledWith("/welcome");
  await act(async () => r.unmount());
});
it("continues setup only after an introduction bound to that account", async () => {
  mock.path = "/welcome";
  mock.storage.set(GUEST_INTRO_DRAFT_KEY, JSON.stringify({ sport: "running", name: "Taylor", introCompleted: true }));
  mock.storage.set(GUEST_SIGNUP_PENDING_KEY, "taylor@example.com");
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(OnboardingNavigation)); });
  expect(mock.replace).toHaveBeenCalledWith("/onboarding");
  await act(async () => r.unmount());
});
it("allows tracker authorization to return without replaying the introduction", async () => {
  mock.path = "/athlete"; mock.params = { provider: "strava" };
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(OnboardingNavigation)); });
  expect(mock.replace).not.toHaveBeenCalled();
  await act(async () => r.unmount());
});


it("allows the explicit replay-tuning preview without advancing onboarding", async () => {
  mock.path = "/replay-tuning"; mock.params = { preview: "1" };
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(OnboardingNavigation)); });
  expect(mock.replace).not.toHaveBeenCalled();
  await act(async () => r.unmount());
});
