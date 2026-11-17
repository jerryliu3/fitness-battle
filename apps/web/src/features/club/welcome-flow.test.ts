import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ setItem: vi.fn(), removeItem: vi.fn(), replace: vi.fn(), push: vi.fn(), signUp: vi.fn(async (): Promise<{ error?: string; needsEmailConfirm?: boolean }> => ({})), next: "", preview: true, user: { id: "existing", email: "owner@example.com", displayName: "Owner" } as { id: string; email: string; displayName: string } | null }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(`${mock.preview ? "preview=1" : ""}${mock.next ? `&next=${encodeURIComponent(mock.next)}` : ""}`), useRouter: () => ({ push: mock.push, replace: mock.replace }) }));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("@/components/auth-context", () => ({ useAuth: () => ({ user: mock.user, loading: false, signUp: mock.signUp }) }));
const state = freshState();
vi.mock("@/components/compete-context", () => ({ useCompete: () => ({ state }) }));
vi.mock("@/ui/section", () => ({ AppHeading: "h1", AppParagraph: "p" }));
vi.mock("@/ui/back-button", () => ({ BackButton: "BackButton" }));
vi.mock("@/ui/sport-activity-icon", () => ({ SportActivityIcon: "SportIcon" }));
vi.mock("./onboarding-athlete", () => ({ OnboardingAthlete: "OnboardingAthlete" }));
vi.mock("./onboarding-overtake", () => ({ OnboardingOvertake: "OnboardingOvertake" }));
vi.mock("./onboarding-feature-tour", () => ({ OnboardingFeatureTour: "OnboardingFeatureTour" }));
import Welcome from "@/app/app/welcome/page";
beforeEach(() => {
  vi.clearAllMocks(); mock.next = ""; mock.preview = true; mock.user = { id: "existing", email: "owner@example.com", displayName: "Owner" }; mock.signUp.mockResolvedValue({});
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: mock.setItem, removeItem: mock.removeItem });
});
async function athlete(r: ReactTestRenderer) {
  const press = async (name: string) => act(async () => r.root.findAllByType("button").find(n => n.props.children === name)!.props.onClick());
  expect(r.root.findAllByType("button").some(n => n.props.children === "Continue")).toBe(false);
  await act(async () => r.root.findAllByType("button").find(n => n.props.className === "onboarding-sport")!.props.onClick());
  return press;
}
it("keeps preview read-only and card model stable while fields are edited", async () => {
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(Welcome)); });
  expect(r.root.findByType("h1").props.children).toBe("What moves you?");
  expect(r.root.findAllByType("a").find(n => n.props.children === "I already have an account")!.props.href).toBe("/login?from=onboarding&preview=1");
  const press = await athlete(r);
  const first = r.root.findByType("OnboardingAthlete" as never).props.model;
  await act(async () => r.root.findAllByType("input")[0].props.onChange({ target: { value: "Taylor" } }));
  expect(r.root.findByType("OnboardingAthlete" as never).props.model).toBe(first);
  await act(async () => r.root.findAllByType("input")[0].props.onBlur());
  expect(r.root.findByType("OnboardingAthlete" as never).props.model.name).toBe("Taylor");
  await press("See yourself compete");
  expect(r.root.findByType("OnboardingOvertake" as never).props.name).toBe("Taylor");
  await act(async () => r.root.findByType("OnboardingOvertake" as never).props.onComplete());
  await press("Make it official");
  expect(r.root.findAllByType("a").some(n => n.props.children === "Sign in")).toBe(false);
  await act(async () => r.root.findByType("form").props.onSubmit({ preventDefault: vi.fn() }));
  expect(mock.push).toHaveBeenCalledWith("/app/onboarding?preview=1&sport=running");
  expect(mock.signUp).not.toHaveBeenCalled(); expect(mock.setItem).not.toHaveBeenCalled();
  await act(async () => r.unmount());
});
it("shows email confirmation inline after signup and marks the introduction before auth can navigate", async () => {
  mock.preview = false; mock.user = null; mock.signUp.mockResolvedValue({ needsEmailConfirm: true });
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(Welcome)); });
  const press = await athlete(r);
  await act(async () => r.root.findAllByType("input")[0].props.onChange({ target: { value: "Taylor" } }));
  await press("See yourself compete");
  await act(async () => r.root.findByType("OnboardingOvertake" as never).props.onComplete());
  await press("Make it official");
  await act(async () => r.root.findAllByType("input")[0].props.onChange({ target: { value: "taylor@example.com" } }));
  await act(async () => r.root.findAllByType("input")[1].props.onChange({ target: { value: "password" } }));
  await act(async () => r.root.findByType("form").props.onSubmit({ preventDefault: vi.fn() }));
  expect(mock.signUp).toHaveBeenCalledWith({ email: "taylor@example.com", password: "password", displayName: "Taylor" });
  expect(mock.setItem.mock.calls.some(([, raw]) => String(raw).includes('"introCompleted":true'))).toBe(true);
  expect(r.root.findAllByType("p").some(n => n.props.role === "status")).toBe(true);
  expect(mock.replace).not.toHaveBeenCalled();
  await act(async () => r.unmount());
});

it("preserves an invitation when saving the athlete inline", async () => {
  mock.preview = false; mock.user = null; mock.next = "/app/arena?invite=crew";
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(Welcome)); });
  expect(r.root.findAllByType("a").find(n => n.props.children === "I already have an account")!.props.href).toContain("next=%2Fapp%2Farena%3Finvite%3Dcrew");
  const press = await athlete(r);
  await act(async () => r.root.findAllByType("input")[0].props.onChange({ target: { value: "Taylor" } }));
  await press("See yourself compete");
  await act(async () => r.root.findByType("OnboardingOvertake" as never).props.onComplete());
  await press("Make it official");
  await act(async () => {
    r.root.findAllByType("input")[0].props.onChange({ target: { value: "taylor@example.com" } });
    r.root.findAllByType("input")[1].props.onChange({ target: { value: "password" } });
  });
  await act(async () => r.root.findByType("form").props.onSubmit({ preventDefault() {} }));
  expect(mock.replace).toHaveBeenCalledWith("/app/onboarding?next=%2Fapp%2Farena%3Finvite%3Dcrew");
  await act(async () => r.unmount());
});
