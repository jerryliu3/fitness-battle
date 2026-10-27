import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
const motion = vi.hoisted(() => ({ reduced: false, runs: [] as Array<{ toValue: number; duration: number; stop: ReturnType<typeof vi.fn> }> }));
vi.mock("./use-reduced-motion", () => ({ useReducedMotion: () => motion.reduced }));
vi.mock("react-native-svg", () => ({ G: "Group" }));
vi.mock("react-native", () => ({
  View: "View", Pressable: "Pressable", StyleSheet: { flatten: (value: unknown) => value },
  Easing: { out: (fn: unknown) => fn, cubic: (x: number) => x },
  Animated: {
    View: "AnimatedView", Value: class { constructor(public value: number) {} },
    createAnimatedComponent: () => "AnimatedGroup",
    timing: (_value: unknown, options: { toValue: number; duration: number }) => {
      const stop = vi.fn(); motion.runs.push({ ...options, stop });
      return { start() {}, stop };
    },
  },
}));
import { FieldOverlayView, SlidingFieldPanel } from "./field-overlay-motion";
let renderer: ReactTestRenderer;
afterEach(async () => { await act(async () => renderer.unmount()); motion.runs = []; motion.reduced = false; vi.unstubAllGlobals(); });
it("fades both ways, stops the previous fade on reversal and respects Reduced Motion", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => { renderer = create(createElement(FieldOverlayView, { hidden: false, children: createElement("Content") })); });
  await act(async () => renderer.update(createElement(FieldOverlayView, { hidden: true, children: createElement("Content") })));
  expect(motion.runs.at(-1)).toMatchObject({ toValue: 0, duration: 160 });
  expect(renderer.root.findByType("AnimatedView" as never).props.pointerEvents).toBe("none");
  expect(renderer.root.findByType("Content" as never)).toBeDefined();
  const hiding = motion.runs.at(-1)!;
  await act(async () => renderer.update(createElement(FieldOverlayView, { hidden: false })));
  expect(hiding.stop).toHaveBeenCalledTimes(1);
  expect(motion.runs.at(-1)).toMatchObject({ toValue: 1, duration: 160 });
  motion.reduced = true;
  await act(async () => renderer.update(createElement(FieldOverlayView, { hidden: true })));
  expect(motion.runs.at(-1)?.duration).toBe(0);
});
it("slides stable panel content past the edge, leaving the full notch hit area available", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const props = { label: "intervals", collapsed: false, onToggle() {}, overlaysHidden: false, style: { left: 12, maxWidth: 230 }, children: createElement("Content") };
  await act(async () => { renderer = create(createElement(SlidingFieldPanel, props)); });
  await act(async () => renderer.root.findByType("AnimatedView" as never).props.onLayout({ nativeEvent: { layout: { width: 274 } } }));
  await act(async () => renderer.update(createElement(SlidingFieldPanel, { ...props, collapsed: true })));
  expect(motion.runs.at(-1)).toMatchObject({ toValue: -242, duration: 320 });
  expect(renderer.root.findByType("Content" as never)).toBeDefined();
  expect(renderer.root.findByType("Pressable" as never).props.style.width).toBe(44);
  const hiding = motion.runs.at(-1)!;
  await act(async () => renderer.update(createElement(SlidingFieldPanel, props)));
  expect(hiding.stop).toHaveBeenCalledTimes(1);
  expect(motion.runs.at(-1)).toMatchObject({ toValue: 0, duration: 320 });
});
