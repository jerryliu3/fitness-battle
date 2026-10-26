import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native-svg", () => Object.fromEntries(["G", "Path", "Defs", "LinearGradient", "Stop"].map(key => [key, `Svg${key}`])));
import { PolishedRacer } from "./polished-racer";

it("draws the native capsule head without wake paths, masks, or frame work", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const request = vi.fn(); vi.stubGlobal("requestAnimationFrame", request);
  let renderer!: ReturnType<typeof create>;
  await act(async () => { renderer = create(createElement(PolishedRacer, { x: 120, y: 200, you: true })); });
  expect(renderer.root.findAllByType("SvgPath" as never)).toHaveLength(6);
  expect(renderer.root.findAllByType("SvgLinearGradient" as never)).toHaveLength(3);
  expect(request).not.toHaveBeenCalled();
  await act(async () => renderer.unmount()); vi.unstubAllGlobals();
});
