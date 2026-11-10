import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("../theme", () => ({ useThemeColors: () => ({}) }));
vi.mock("./use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34 }) }));
vi.mock("react-native", () => ({ View: "View", ScrollView: "ScrollView", useWindowDimensions: () => ({ height: 200 }),
  PanResponder: { create: () => ({ panHandlers: {} }) },
  Animated: { View: "Sheet", Value: class { constructor(public value: number) {} setValue(value: number) { this.value = value; } stopAnimation() {} }, timing: (value: { setValue(n: number): void }, config: { toValue: number }) => ({ start: () => value.setValue(config.toValue) }) },
}));
import { CompeteSheet } from "./compete-sheet";
it("keeps stops ordered and body heights nonnegative on short screens", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(CompeteSheet, { active: true, expandRequest: 0, overview: "Timeline", children: "Standings" })); });
  try {
    const sheet = () => tree.root.findByType("Sheet" as never);
    const before = sheet().props.style.transform[0].translateY.value;
    await act(async () => tree.root.findByProps({ accessibilityRole: "adjustable" }).props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } }));
    expect(sheet().props.style.transform[0].translateY.value).toBeLessThanOrEqual(before);
    const overview = tree.root.findAllByType("View" as never).find(node => node.props.onLayout)!;
    await act(async () => overview.props.onLayout({ nativeEvent: { layout: { height: 1000 } } }));
    expect(tree.root.findByType("ScrollView" as never).props.style.height).toBe(0);
    expect(sheet().props.style.transform[0].translateY.value).toBe(0);
  } finally { await act(async () => tree.unmount()); vi.unstubAllGlobals(); }
});
