import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { freshState } from "@fitness-battle/shared";
import { DailyHealth } from "./daily-health";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("daily health details", () => {
  it("opens the selected metric immediately after its row and switches without opening a session", async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(createElement(DailyHealth, { state: freshState() })); });
    const buttons = renderer.root.findAllByType("button");
    for (const [index, label] of [[0, "Sleep"], [1, "Steps"], [3, "HRV"]] as const) {
      await act(async () => { buttons[index]!.props.onClick(); });
      expect(buttons[index]!.props["aria-expanded"]).toBe(true);
      const detail = renderer.root.findByProps({ id: "home-health-detail" });
      expect(detail.findByType("b").children).toEqual([label]);
      const grid = renderer.root.findByProps({ className: "home-health-grid" });
      const children = grid.children;
      expect(children.indexOf(detail)).toBe(index < 2 ? 2 : 4);
    }
    await act(async () => { renderer.unmount(); });
  });
});
