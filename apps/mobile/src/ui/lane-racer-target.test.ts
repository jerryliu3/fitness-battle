import { describe, expect, it, vi } from "vitest";
import { LaneRacerTarget } from "./lane-racer-target.web";
describe("Expo web racer accessibility", () => {
  it("keeps an SVG group while supporting pointer and keyboard selection", () => {
    const select = vi.fn(), preventDefault = vi.fn();
    const element = LaneRacerTarget({ accessibilityLabel: "Alice", accessibilityState: { selected: true }, onPress: select });
    expect(element.type).toBe("g");
    expect(element.props.role).toBe("button");
    expect(element.props["aria-label"]).toBe("Alice");
    element.props.onClick?.({} as never);
    element.props.onKeyDown?.({ key: "Enter", preventDefault } as never);
    element.props.onKeyDown?.({ key: " ", preventDefault } as never);
    expect(select).toHaveBeenCalledTimes(3);
    expect(preventDefault).toHaveBeenCalledTimes(2);
  });
});
