import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { applyDebugEvent, competitionMoments, competitionMomentSnapshots, freshState, momentStorageKey, type CompeteState } from "@fitness-battle/shared";
const location = vi.hoisted(() => ({ path: "/home" }));
vi.mock("expo-router", () => ({ usePathname: () => location.path }));
import { useCompetitionExperience } from "./use-competition-experience";
let renderer: ReactTestRenderer;
let experience: ReturnType<typeof useCompetitionExperience>;
const saved = new Map<string, string>();
const read = (key: string) => saved.get(key) ?? null;
const write = (key: string, value: string) => { saved.set(key, value); };
const initial = freshState(new Date("2026-10-24T18:00:00Z"));
function Harness({ state = initial, account = "a" }: { state?: CompeteState; account?: string }) {
  experience = useCompetitionExperience(state, account, read, write, true);
  return null;
}
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  saved.clear(); location.path = "/home";
});
it("opens no-pass progress over Home and acknowledges it once", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => { renderer = create(createElement(Harness)); });
  const result = applyDebugEvent(initial, "overtake", "a");
  const snapshot = competitionMomentSnapshots(result.state, "a")[0];
  const previous = JSON.parse(snapshot.value);
  const you = snapshot.lanes.find(lane => lane.you)!;
  previous.values[you.id] = you.value - .05;
  await act(async () => { experience.prime({ [snapshot.arenaKey]: JSON.stringify(previous) }); experience.observe(result.state); });
  expect(experience.moment?.plan.hasOvertake).toBe(false);
  expect(experience.moment?.plan.youAfter).toBe(you.value);
  await act(async () => { experience.acknowledge(); experience.observe(result.state); });
  expect(experience.moment).toBeNull();
});
it("waits for committed passes, queues all sports, and deduplicates acknowledgement and recovery", async () => {
  await act(async () => { renderer = create(createElement(Harness)); });
  const result = applyDebugEvent(initial, "overtake", "a");
  const baselines = Object.fromEntries(Object.entries(result.baselines).map(([key, value]) => [momentStorageKey(key), value]));
  const moment = competitionMoments(result.state, "a", key => baselines[key])[0];
  await act(async () => { experience.prime(result.baselines); experience.observe(result.state); });
  expect(experience.moment).toBeNull();
  const committed = { ...result.state, committedOvertakeMoments: [
    { ...moment, id: "overtake:a:revision:running" },
    { ...moment, sport: "cycling" as const, id: "overtake:a:revision:cycling" },
  ] };
  await act(async () => experience.observe(committed));
  expect(experience.remaining).toBe(2);
  expect(experience.moment?.sport).toBe("running");
  await act(async () => { experience.observe(committed); experience.acknowledge(); });
  expect(experience.remaining).toBe(1);
  expect(experience.moment?.sport).toBe("cycling");
  await act(async () => experience.acknowledge());
  await act(async () => renderer.unmount());
  await act(async () => { renderer = create(createElement(Harness, { state: committed })); });
  expect(experience.moment).toBeNull();
  await act(async () => renderer.update(createElement(Harness, { state: initial, account: "b" })));
  expect(experience.moment).toBeNull();
});
