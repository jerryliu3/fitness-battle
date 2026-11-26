import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";
import { freshState, GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ preview: false, dispatch: vi.fn(), replace: vi.fn(), values: new Map<string, string>(), save: vi.fn(async () => {}), upload: vi.fn() }));
vi.mock("react-native", () => ({ useColorScheme: () => "light", Modal: "Modal", TextInput: "TextInput", View: "View" }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaProvider: "SafeAreaProvider", SafeAreaView: "SafeAreaView" }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: async (key: string) => mock.values.get(key) ?? null, setItem: mock.save, removeItem: vi.fn(async () => {}), multiRemove: vi.fn(async () => {}) } }));
vi.mock("expo-router", () => ({ useLocalSearchParams: () => ({ preview: mock.preview ? "1" : undefined }), useRouter: () => ({ replace: mock.replace }) }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: { id: "a", displayName: "Taylor", email: "taylor@example.com" } }) }));
const state = freshState();
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ state, canWrite: true, loadStatus: "ready", dispatch: mock.dispatch }) }));
vi.mock("../lib/avatar-upload", () => ({ uploadNativeProfileAvatar: mock.upload }));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("../ui/icon-button", () => ({ IconButton: "IconButton" }));
vi.mock("../ui/section", () => ({ AppText: "AppText" }));
vi.mock("../ui/motion-step", () => ({ MotionStep: "MotionStep" }));
vi.mock("../ui/choice-picker", () => ({ ChoicePicker: "ChoicePicker" }));
vi.mock("../ui/country-picker", () => ({ CountryPicker: "Country" }));
vi.mock("../ui/timezone-picker", () => ({ TimezonePicker: "Timezone" }));
vi.mock("../ui/focus", () => ({ FocusButton: "FocusButton", FocusSegments: "FocusSegments", useFocusStyles: () => ({}) }));
vi.mock("../../app/athlete", () => ({ TrackerConnections: "TrackerConnections" }));
vi.mock("./fitness-history-import", () => ({ HistoryImportPreview: "HistoryImportPreview" }));
vi.mock("./event-registration", () => ({ EventRegistration: "EventRegistration" }));
vi.mock("../ui/onboarding-canvas", () => ({ OnboardingCanvas: ({ children }: { children: unknown }) => children }));
import Onboarding from "../../app/onboarding";
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks(); mock.values.clear(); mock.preview = false;
  Object.assign(state, freshState()); mock.dispatch.mockImplementation(action => {
    if (action.type === "opt-in") state.ratings.find(r => r.sport === action.sport)!.optedIn = true;
  }); mock.upload.mockResolvedValue("https://example.com/new.jpg");
});
const next = (r: ReactTestRenderer) => act(async () => r.root.findByType("FocusButton" as never).props.onPress());
it.each([false, true])("collects details first, registers one sport, shows a claimed card immediately (preview=%s)", async preview => {
  mock.preview = preview;
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(Onboarding)); });
  expect(r.root.findAllByType("TextInput" as never).map(n => n.props.accessibilityLabel)).toEqual(["City"]);
  expect(r.root.findAllByType("ChoicePicker" as never).find(n => n.props.label === "Gender (optional)")!.props.placeholder).toBe("Not specified");
  expect(r.root.findByType("FocusSegments" as never).props.label).toBe("Units");
  await next(r);
  expect(r.root.findByType("TrackerConnections" as never).props.preview).toBe(preview);
  await next(r);

  if (!preview) {
    const actions = mock.dispatch.mock.calls.map(([action]) => action.type);
    expect(actions.indexOf("set-timezone")).toBeLessThan(actions.indexOf("opt-in"));
  }
  await act(async () => r.root.findByType("EventRegistration" as never).props.onBack());
  expect(r.root.findByType("TrackerConnections" as never).props.preview).toBe(preview);
  await next(r);
  expect(r.root.findAllByType("TextInput" as never)).toHaveLength(0);
  const ticket = r.root.findByType("EventRegistration" as never);
  expect(ticket.props).toMatchObject({ event: "running", registered: true, ticketOnly: true });
  expect(mock.dispatch.mock.calls.some(([action]) => action.type === "complete-onboarding")).toBe(false);
  await act(async () => ticket.props.onView());
  if (!preview) {
    expect(mock.dispatch.mock.calls.filter(([action]) => action.type === "opt-in")).toHaveLength(1);
  }
  if (preview) { expect(mock.dispatch).not.toHaveBeenCalled(); expect(mock.save).not.toHaveBeenCalled(); }
  else expect(mock.dispatch).toHaveBeenCalledWith({ type: "complete-onboarding" });
  expect(mock.replace).toHaveBeenCalledWith("/today");
  await act(async () => r.unmount());
});
it.each([false, true])("preserves the chosen photo and sport through registration (upload fails=%s)", async failure => {
  state.avatarUrl = "https://example.com/old.jpg";
  mock.values.set(GUEST_INTRO_DRAFT_KEY, JSON.stringify({ sport: "walking", name: "Taylor", photo: "data:image/jpeg;base64,/9j/", introCompleted: true }));
  mock.values.set(GUEST_SIGNUP_PENDING_KEY, "taylor@example.com");
  if (failure) mock.upload.mockRejectedValueOnce(new Error("Upload failed"));
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(Onboarding)); });
  await next(r); await next(r);
  await act(async () => r.root.findByType("EventRegistration" as never).props.onView());
  expect(mock.upload).toHaveBeenCalledWith(expect.any(ArrayBuffer), "a");
  if (failure) {
    expect(mock.dispatch.mock.calls.some(([action]) => action.type === "complete-onboarding")).toBe(false);
    expect(r.root.findByType("EventRegistration" as never).props.error).toBe("Upload failed");
  } else {
    expect(mock.dispatch).toHaveBeenCalledWith({ type: "set-avatar", avatarUrl: "https://example.com/new.jpg", accountId: "a" });
    expect(r.root.findByType("EventRegistration" as never).props.event).toBe("walking");
  }
  await act(async () => r.unmount());
});
it("registers immediately when restoring the final step", async () => {
  mock.values.set("onboarding-draft:v7:a", JSON.stringify({ step: 3 }));
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(Onboarding)); });
  expect(r.root.findByType("EventRegistration" as never).props.registered).toBe(true);
  expect(r.root.findAllByType("TextInput" as never)).toHaveLength(0);
  await act(async () => r.unmount());
});
it("ignores the weekly volume in an old onboarding draft", async () => {
  state.activities.push({ id: "workout", sport: "running", startedAt: "2026-11-16T12:00:00Z", distanceM: 5000, movingSec: 1800, avgHr: null, verified: true, source: "apple_health" });
  mock.values.set("onboarding-draft:v7:a", JSON.stringify({ weeklyVolume: { running: "7" } }));
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(Onboarding)); });
  await next(r); await next(r);
  expect(r.root.findAllByType("TextInput" as never)).toHaveLength(0);
  const ticket = r.root.findByType("EventRegistration" as never);
  expect(ticket.props.registered).toBe(true);
  expect(ticket.props.onBack).toBeTypeOf("function");
  await act(async () => ticket.props.onView());
  expect(mock.dispatch.mock.calls.some(([action]) => action.type === "declare-effort")).toBe(false);
  expect(r.root.findByType("EventRegistration" as never).props.registered).toBe(true);
  await act(async () => r.unmount());
});
