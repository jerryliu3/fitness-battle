import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
const motion = vi.hoisted(() => ({ reduced: false, pending: [] as Array<{ target: number; done?: (result: { finished: boolean }) => void; stopped: boolean }> }));
vi.mock("./use-reduced-motion", () => ({ useReducedMotion: () => motion.reduced }));
vi.mock("react-native", () => ({ Animated: {
  View: "AnimatedView",
  Value: class { setValue() {} },
  timing: (_value: unknown, options: { toValue: number }) => {
    const animation = { target: options.toValue, stopped: false, done: undefined as undefined | ((result: { finished: boolean }) => void) };
    return { start: (done?: typeof animation.done) => { animation.done = done; motion.pending.push(animation); }, stop: () => { animation.stopped = true; } };
  },
} }));
import { ScreenFade } from "./screen-fade";
afterEach(() => { motion.pending = []; motion.reduced = false; vi.unstubAllGlobals(); });
it("keeps the outgoing screen until fade-out finishes and blocks its actions", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let renderer!: ReturnType<typeof create>;
  await act(async () => { renderer = create(createElement(ScreenFade, { identity: "receipt", children: "Sync completed" })); });
  await act(async () => renderer.update(createElement(ScreenFade, { identity: "replay", children: "Your overtakes" })));
  expect(JSON.stringify(renderer.toJSON())).toContain("Sync completed");
  expect(renderer.root.findByType("AnimatedView" as never).props.pointerEvents).toBe("none");
  await act(async () => motion.pending.find(item => item.target === 0 && !item.stopped)!.done?.({ finished: true }));
  expect(JSON.stringify(renderer.toJSON())).toContain("Your overtakes");
  expect(renderer.root.findByType("AnimatedView" as never).props.pointerEvents).toBe("auto");
  expect(motion.pending.at(-1)?.target).toBe(1);
  await act(async () => renderer.unmount());
});
it("changes screens immediately with Reduced Motion", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  motion.reduced = true;
  let renderer!: ReturnType<typeof create>;
  await act(async () => { renderer = create(createElement(ScreenFade, { identity: "receipt", children: "Sync completed" })); });
  await act(async () => renderer.update(createElement(ScreenFade, { identity: "replay", children: "Your overtakes" })));
  expect(JSON.stringify(renderer.toJSON())).toContain("Your overtakes");
  expect(motion.pending.some(item => item.target === 0)).toBe(false);
  await act(async () => renderer.unmount());
});
