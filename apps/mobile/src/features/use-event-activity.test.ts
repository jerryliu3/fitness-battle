import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { competeNow, competePeriodWindow, freshState, type CompetitionReplay } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ account: "alice", blocks: [] as { id: string }[], request: vi.fn() }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: { id: mock.account }, accessToken: "token", offlineMode: false }) }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ accountKey: "retained-store-scope", debugActive: false }) }));
vi.mock("../lib/athlete-blocks", () => ({ useAthleteBlocks: () => ({ blocks: mock.blocks }) }));
vi.mock("../lib/api", () => ({ requestApi: mock.request }));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://example.test" } }));
import { useEventActivity } from "./use-event-activity";
const state = freshState(new Date("2026-11-08T12:00:00Z"));
state.demoNow = "2026-11-08T12:00:00Z";
const period = competePeriodWindow(state, competeNow(state), "running");
const replay: CompetitionReplay = { sport: "running", track: "verified", periodStart: period.startsAt.toISOString(), periodEnd: period.endsAt.toISOString(), through: state.demoNow, scope: "field", athletes: [{ id: "peer", name: "Private peer", you: false }], events: [{ id: "event", athleteId: "peer", at: "2026-11-06T12:00:00Z", distanceM: 1000, movingSec: 300, effort: 1 }] };
let renderer: ReactTestRenderer;
let result: ReturnType<typeof useEventActivity>;
function Probe({ active = true }: { active?: boolean }) { result = useEventActivity(state, "running", active); return null; }
beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); mock.account = "alice"; mock.blocks = []; mock.request.mockReset(); vi.unstubAllGlobals(); });

it("discards a prior account's in-flight event ledger", async () => {
  let resolveOld!: (value: CompetitionReplay) => void;
  mock.request.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce({ ...replay, events: [] });
  await act(async () => { renderer = create(createElement(Probe)); });
  mock.account = "bob";
  await act(async () => renderer.update(createElement(Probe)));
  await act(async () => resolveOld(replay));
  expect(result.rows).toEqual([]);
  expect(result.scope).toBe("field");
});
it("removes newly blocked activity from an already loaded feed", async () => {
  mock.request.mockResolvedValue(replay);
  await act(async () => { renderer = create(createElement(Probe)); });
  expect(result.rows).toHaveLength(1);
  mock.blocks = [{ id: "peer" }];
  await act(async () => renderer.update(createElement(Probe)));
  expect(result.rows).toEqual([]);
  expect(mock.request).toHaveBeenCalledTimes(1);
});
it("shows an authenticated error without substituting simulated events", async () => {
  mock.request.mockRejectedValue(new Error("Unavailable"));
  await act(async () => { renderer = create(createElement(Probe)); });
  expect(result.error).toBe("Could not load race updates.");
  expect(result.rows).toEqual([]);
  expect(result.scope).toBeUndefined();
});
it("does not read or expose the feed while its retained screen is inactive", async () => {
  mock.request.mockResolvedValue(replay);
  await act(async () => { renderer = create(createElement(Probe, { active: false })); });
  expect(mock.request).not.toHaveBeenCalled();
  expect(result.rows).toEqual([]);
});
