import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";
import { GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ path: "/app/onboarding", completed: false, replace: vi.fn(), params: new URLSearchParams(), storage: new Map<string, string>() }));
vi.mock("next/navigation", () => ({ usePathname: () => mock.path, useSearchParams: () => mock.params, useRouter: () => ({ replace: mock.replace }) }));
vi.mock("./auth-context", () => ({ useAuth: () => ({ user: { id: "a", email: "taylor@example.com" }, loading: false }) }));
vi.mock("./compete-context", () => ({ useCompete: () => ({ state: { onboardingCompleted: mock.completed }, loadStatus: "ready" }) }));
import { OnboardingNavigation } from "./onboarding-navigation";
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks();
  mock.path = "/app/onboarding"; mock.completed = false; mock.params = new URLSearchParams(); mock.storage.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => mock.storage.get(key) ?? null });
});
it("sends ordinary new accounts through the first part before tracker setup", async () => {
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(OnboardingNavigation)); });
  expect(mock.replace).toHaveBeenCalledWith("/app/welcome");
  await act(async () => r.unmount());
});
it("continues into setup after the current account completed its introduction", async () => {
  mock.path = "/app/welcome";
  mock.storage.set(GUEST_INTRO_DRAFT_KEY, JSON.stringify({ sport: "running", name: "Taylor", introCompleted: true }));
  mock.storage.set(GUEST_SIGNUP_PENDING_KEY, "taylor@example.com");
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(OnboardingNavigation)); });
  expect(mock.replace).toHaveBeenCalledWith("/app/onboarding");
  await act(async () => r.unmount());
});
it("retains completed-account and tracker callback routing", async () => {
  mock.path = "/app/welcome"; mock.completed = true;
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(OnboardingNavigation)); });
  expect(mock.replace).toHaveBeenCalledWith("/app/today");
  mock.replace.mockClear(); mock.completed = false; mock.path = "/app/athlete"; mock.params = new URLSearchParams("provider=strava");
  await act(async () => r.update(createElement(OnboardingNavigation)));
  expect(mock.replace).not.toHaveBeenCalled();
  await act(async () => r.unmount());
});
it.each(["/app/welcome", "/app/onboarding"])("keeps %s previews read-only and on their requested page", async path => {
  mock.path = path; mock.params = new URLSearchParams("preview=1");
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(OnboardingNavigation)); });
  expect(mock.replace).not.toHaveBeenCalled();
  await act(async () => r.unmount());
});
