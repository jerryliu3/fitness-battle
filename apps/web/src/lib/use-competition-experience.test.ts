import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { applyDebugEvent, freshState, type CompeteState } from "@fitness-battle/shared";
import { useCompetitionExperience } from "./use-competition-experience";
let renderer: ReactTestRenderer;
let experience: ReturnType<typeof useCompetitionExperience>;
const saved = new Map<string, string>();
const read = (k: string) => saved.get(k) ?? null;
const write = (k: string, v: string) => { saved.set(k, v); };
const initial = freshState(new Date("2026-10-24T18:00:00Z"));
function Harness({ state = initial, account = "a" }: { state?: CompeteState; account?: string }) {
  experience = useCompetitionExperience(state, account, read, write);
  return createElement("Home");
}
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); saved.clear(); });
it("queues movement above any tab, deduplicates refresh, and requires acknowledgement", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => { renderer = create(createElement(Harness)); });
  expect(experience.moment).toBeNull();
  const result = applyDebugEvent(initial, "overtake", "a");
  await act(async () => { experience.prime(result.baselines); renderer.update(createElement(Harness, { state: result.state })); });
  expect(experience.moment?.plan.hasOvertake).toBe(true);
  await act(async () => experience.observe(result.state));
  expect(experience.remaining).toBe(1);
  await act(async () => experience.acknowledge());
  expect(experience.moment).toBeNull();
  await act(async () => experience.observe(result.state));
  expect(experience.moment).toBeNull();
});
it("quiet application and account switches do not leak an event", async () => {
  await act(async () => { renderer = create(createElement(Harness)); });
  const result = applyDebugEvent(initial, "overtaken", "a");
  await act(async () => { experience.prime(result.baselines); experience.observe(result.state, true); });
  expect(experience.moment).toBeNull();
  await act(async () => { experience.prime(result.baselines); experience.observe(result.state); });
  expect(experience.moment).not.toBeNull();
  await act(async () => renderer.update(createElement(Harness, { account: "b" })));
  expect(experience.moment).toBeNull();
});
