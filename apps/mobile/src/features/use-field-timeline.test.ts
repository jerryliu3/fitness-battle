import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { freshState, type CompeteState, type CompetitionReplay, type CompetitionReplaySelection } from "@fitness-battle/shared";
const mocks = vi.hoisted(() => ({ request: vi.fn(), debug: false, userId: "account-a", pause: null as null | (() => void) }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: { id: mocks.userId }, offlineMode: false, accessToken: "token" }) }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ debugActive: mocks.debug }) }));
vi.mock("../lib/api", () => ({ requestApi: mocks.request }));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://example.test" } }));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => false }));
vi.mock("react-native", () => ({ AppState: { addEventListener: (_: string, fn: (status: string) => void) => { mocks.pause = () => fn("background"); return { remove() {} }; } } }));
import { useFieldTimeline } from "./use-field-timeline";
const selection: CompetitionReplaySelection = { sport: "running", track: "verified", periodStart: "2026-10-19T04:00:00.000Z", periodEnd: "2026-10-26T04:00:00.000Z" };
const state: CompeteState = { ...freshState(new Date("2026-10-25T18:00:00Z")), units: "metric" as const };
const ledger: CompetitionReplay = { ...selection, scope: "field", through: "2026-10-25T18:00:00Z", athletes: [{ id: "you", name: "You", you: true }, { id: "peer", name: "Peer", you: false }], events: [
  { id: "one", athleteId: "you", at: "2026-10-20T12:00:00Z", distanceM: 1000, movingSec: 300, effort: 1 },
  { id: "two", athleteId: "peer", at: "2026-10-21T12:00:00Z", distanceM: 2000, movingSec: 600, effort: 2 },
] };
let renderer: ReactTestRenderer;
function Harness({ active = true, selected = selection, current = state }) {
  return createElement("timeline", { value: useFieldTimeline(current, selected, active) });
}
const timeline = () => renderer.root.findByType("timeline" as never).props.value as ReturnType<typeof useFieldTimeline>;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-25T18:00:00Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => setTimeout(callback, 16));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  
  mocks.debug = false; mocks.userId = "account-a";
  mocks.request.mockReset(); mocks.request.mockResolvedValue(ledger);
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function mount() { await act(async () => { renderer = create(createElement(Harness)); }); }
it("starts with live totals, seeks forward and backward, and explicitly returns to Latest", async () => {
  await mount();
  expect(timeline().frame).toBeNull(); expect(timeline().count).toBe(2);
  await act(async () => timeline().seek(1.5));
  expect(timeline().frame!.rows.find(row => row.id === "peer")!.value).toBe(1);
  await act(async () => timeline().seek(.5));
  expect(timeline().frame!.rows.find(row => row.you)!.value).toBe(.5);
  await act(async () => timeline().live());
  expect(timeline().frame).toBeNull(); expect(timeline().cursor).toBe(2);
});
it("pauses on manual seeking and backgrounding, and finishes at live totals", async () => {
  await mount();
  await act(async () => timeline().toggle());
  await act(async () => { vi.advanceTimersByTime(1100); });
  expect(timeline().cursor).toBeGreaterThan(.45); expect(timeline().cursor).toBeLessThan(.55);
  await act(async () => timeline().seek(1));
  await act(async () => { vi.advanceTimersByTime(1000); });
  expect(timeline().cursor).toBe(1); expect(timeline().playing).toBe(false);
  await act(async () => timeline().toggle());
  await act(async () => mocks.pause!());
  expect(timeline().playing).toBe(false);
  await act(async () => timeline().toggle());
  await act(async () => { vi.advanceTimersByTime(2300); });
  expect(timeline().frame).toBeNull(); expect(timeline().playing).toBe(false);
});
it("retains history when changing units and pauses when its tab becomes inactive", async () => {
  await mount(); await act(async () => timeline().seek(1));
  await act(async () => renderer.update(createElement(Harness, { current: { ...state, units: "us" } as typeof state })));
  expect(timeline().frame!.rows.find(row => row.you)!.value).toBeCloseTo(1000 / 1609.344);
  await act(async () => timeline().toggle());
  await act(async () => renderer.update(createElement(Harness, { active: false })));
  expect(timeline().playing).toBe(false);
});
it("clears historical positions when the account or wave changes", async () => {
  await mount(); await act(async () => timeline().seek(1));
  mocks.userId = "account-b";
  await act(async () => renderer.update(createElement(Harness)));
  expect(timeline().frame).toBeNull(); expect(mocks.request).toHaveBeenCalledTimes(2);
  await act(async () => timeline().seek(1));
  await act(async () => renderer.update(createElement(Harness, { selected: { ...selection, periodStart: selection.periodEnd, periodEnd: "2026-11-02T05:00:00Z" } })));
  expect(timeline().frame).toBeNull();
});
it("uses Debug's local history and keeps authenticated failures explicit after Debug is reset", async () => {
  mocks.debug = true; await mount();
  expect(mocks.request).not.toHaveBeenCalled(); expect(timeline().preview).toBe(true);
  mocks.debug = false; mocks.request.mockRejectedValue(new Error("offline"));
  await act(async () => renderer.update(createElement(Harness)));
  expect(timeline().ready).toBe(false); expect(timeline().error).toContain("unavailable");
  expect(timeline().frame).toBeNull(); expect(timeline().preview).toBe(false);
  mocks.request.mockResolvedValue(ledger);
  await act(async () => timeline().retry());
  expect(timeline().ready).toBe(true); expect(timeline().count).toBe(2);
});
