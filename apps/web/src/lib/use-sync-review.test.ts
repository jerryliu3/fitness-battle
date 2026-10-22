import { createElement, useRef, useState } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import {
  freshState,
  reduceCompete,
  type Action,
  type Activity,
} from "@fitness-battle/shared";
import { useSyncReviewGate } from "./use-sync-review";
let renderer: ReactTestRenderer,
  gate: ReturnType<typeof useSyncReviewGate>,
  stateValue: ReturnType<typeof freshState>;
const now = new Date("2026-10-22T18:00:00Z");
const today: Activity = {
  id: "today",
  sport: "running",
  startedAt: "2026-10-22T12:00:00Z",
  distanceM: 4000,
  movingSec: 1800,
  avgHr: null,
  source: "strava",
  verified: true,
  provenance: "recorded",
  disposition: "counted",
};
function Harness({ account = "a" }: { account?: string }) {
  const [state, setState] = useState(() => freshState(now));
  const block = useRef(false);
  stateValue = state;
  gate = useSyncReviewGate(
    (a) => setState((s) => reduceCompete(s, a)),
    state,
    account,
    block,
  );
  return createElement("Gate");
}
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
});
it("batches a recap, applies history immediately, and confirms at most once", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => {
    renderer = create(createElement(Harness));
  });
  await act(async () => {
    gate.begin("a");
    gate.dispatch({
      type: "apply-sync",
      provider: "strava",
      accountId: "a",
      now: now.toISOString(),
      activities: [
        today,
        { ...today, id: "old", startedAt: "2026-10-20T12:00:00Z" },
      ],
    });
  });
  expect(gate.receipt).toBeNull();
  expect(stateValue.activities.map((a) => a.id)).toEqual(["old"]);
  await act(async () => gate.end("a"));
  expect(gate.receipt?.activities.map((a) => a.id)).toEqual(["today"]);
  await act(async () => {
    gate.finish();
    gate.finish();
  });
  expect(stateValue.activities.filter((a) => a.id === "today")).toHaveLength(1);
  expect(gate.receipt).toBeNull();
});
it("drops pending UI on account changes and ignores stale sync responses", async () => {
  await act(async () => {
    renderer = create(createElement(Harness));
  });
  await act(async () =>
    gate.dispatch({
      type: "apply-sync",
      provider: "strava",
      accountId: "a",
      now: now.toISOString(),
      activities: [today],
    }),
  );
  expect(gate.receipt).not.toBeNull();
  await act(async () =>
    renderer.update(createElement(Harness, { account: "b" })),
  );
  expect(gate.receipt).toBeNull();
  await act(async () => {
    gate.finish();
    gate.dispatch({
      type: "apply-sync",
      provider: "strava",
      accountId: "a",
      activities: [today],
    });
  });
  expect(stateValue.activities.some((a) => a.id === "today")).toBe(false);
});
