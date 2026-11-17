import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";
import { freshState, GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ replace: vi.fn(), dispatch: vi.fn(), params: new URLSearchParams(), storage: new Map<string, string>(), upload: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mock.replace }), useSearchParams: () => mock.params }));
vi.mock("@/components/auth-context", () => ({ useAuth: () => ({ user: { id: "a", email: "taylor@example.com", displayName: "Taylor" } }) }));
const state = freshState();
vi.mock("@/components/compete-context", () => ({ useCompete: () => ({ state, loadStatus: "ready", dispatch: mock.dispatch }) }));
vi.mock("@/components/auth-gate", () => ({ AuthGate: ({ children }: { children: unknown }) => children }));
vi.mock("@/ui/back-button", () => ({ BackButton: "BackButton" }));
vi.mock("@/ui/section", () => ({ AppHeading: "h2", AppParagraph: "p" }));
vi.mock("@/ui/country-combobox", () => ({ CountryCombobox: "Country" }));
vi.mock("@/ui/timezone-combobox", () => ({ TimezoneCombobox: "Timezone" }));
vi.mock("@/features/you/you-route", () => ({ TrackerConnections: "TrackerConnections" }));
vi.mock("./onboarding-units", () => ({ OnboardingUnits: "Units" }));
vi.mock("@/features/arena/event-registration", () => ({ EventRegistration: "EventRegistration" }));
vi.mock("@/lib/profile/avatar-upload", () => ({ uploadWebProfileAvatar: mock.upload }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
import Onboarding from "@/app/app/onboarding/page";
beforeEach(() => {
  vi.clearAllMocks(); mock.storage.clear(); mock.params = new URLSearchParams(); Object.assign(state, freshState());
  mock.upload.mockResolvedValue("https://example.com/athlete.jpg");
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const storage = { getItem: (key: string) => mock.storage.get(key) ?? null, setItem: (key: string, value: string) => mock.storage.set(key, value), removeItem: (key: string) => mock.storage.delete(key) };
  vi.stubGlobal("localStorage", storage); vi.stubGlobal("sessionStorage", storage);
});
const next = (r: ReactTestRenderer) => act(async () => r.root.findByType("button").props.onClick());
it.each([false, true])("uses one event with weekly volume on the starting line and immediate confirmation (preview=%s)", async preview => {
  if (preview) mock.params = new URLSearchParams("preview=1");
  else {
    mock.storage.set(GUEST_INTRO_DRAFT_KEY, JSON.stringify({ sport: "walking", name: "Taylor", introCompleted: true }));
    mock.storage.set(GUEST_SIGNUP_PENDING_KEY, "taylor@example.com");
  }
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(Onboarding)); });
  expect(r.root.findAllByType("input")).toHaveLength(1);
  expect(r.root.findByType("select").props.value).toBe("");
  await next(r); await next(r);
  await act(async () => r.root.findByType("EventRegistration" as never).props.onBack());
  expect(r.root.findAllByType("TrackerConnections" as never)).toHaveLength(preview ? 0 : 1);
  await next(r);
  const sport = preview ? "running" : "walking";
  await act(async () => r.root.findByType("input").props.onChange({ target: { value: "28000" } }));
  const ticket = r.root.findByType("EventRegistration" as never);
  expect(ticket.props).toMatchObject({ event: sport, registered: true, ticketOnly: true });
  expect(mock.dispatch.mock.calls.some(([a]) => a.type === "complete-onboarding")).toBe(false);
  await act(async () => ticket.props.onView());
  if (preview) { expect(mock.dispatch).not.toHaveBeenCalled(); expect(mock.storage.size).toBe(0); }
  else {
    expect(mock.dispatch).toHaveBeenCalledWith({ type: "declare-effort", sport: "walking", declaredWeeklyVolume: 28000 });
    expect(mock.dispatch.mock.calls.filter(([a]) => a.type === "opt-in")).toHaveLength(1);
    expect(mock.dispatch).toHaveBeenCalledWith({ type: "complete-onboarding" });
    expect(mock.storage.has(GUEST_INTRO_DRAFT_KEY)).toBe(false);
  }
  await act(async () => r.unmount());
});
it.each([false, true])("saves the selected photo on Continue and retains it on failure (failure=%s)", async failure => {
  state.avatarUrl = "https://example.com/old-avatar.jpg";
  mock.storage.set(GUEST_INTRO_DRAFT_KEY, JSON.stringify({ sport: "walking", name: "Taylor", photo: "data:image/jpeg;base64,/9j/", introCompleted: true }));
  mock.storage.set(GUEST_SIGNUP_PENDING_KEY, "taylor@example.com");
  vi.stubGlobal("fetch", vi.fn(async () => ({ blob: async () => new Blob(["photo"], { type: "image/jpeg" }) })));
  if (failure) mock.upload.mockRejectedValueOnce(new Error("Upload failed"));
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(Onboarding)); });
  await next(r); await next(r);
  await act(async () => r.root.findByType("EventRegistration" as never).props.onView());
  expect(mock.upload).toHaveBeenCalledWith(expect.objectContaining({ userId: "a", previousAvatarUrl: state.avatarUrl, requireStorage: true }));
  if (failure) {
    expect(mock.dispatch.mock.calls.some(([action]) => action.type === "complete-onboarding")).toBe(false);
    expect(mock.storage.has(GUEST_INTRO_DRAFT_KEY)).toBe(true);
  } else expect(r.root.findByType("EventRegistration" as never).props.event).toBe("walking");
  await act(async () => r.unmount());
});
