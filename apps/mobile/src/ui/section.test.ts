vi.mock("../lib/haptics", () => ({ playCue: vi.fn(), playPattern: vi.fn(() => vi.fn()) }));
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ Text: "Text", View: "View", Pressable: "Pressable", StyleSheet: { create: (x: unknown) => x }, useWindowDimensions: () => ({ fontScale: 2 }) }));
import { AppText, SectionHeader, SectionStack, TextAction } from "./section";
it("keeps long scalable headings and named actions unconstrained at large font sizes", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onPress = vi.fn();
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(createElement(SectionHeader, { title: "A very long heading for personal achievements", action: createElement(TextAction, { label: "View all", accessibilityLabel: "View all achievements", onPress }) })); });
  const heading = renderer!.root.findAllByType("Text" as never).find(node => node.props.accessibilityRole === "header")!;
  expect(heading.props.numberOfLines).toBeUndefined();
  expect(heading.props.allowFontScaling).not.toBe(false);
  const container = renderer!.root.findAllByType("View" as never)[0];
  expect(container.props.style.flexWrap).toBe("wrap");
  const titleBox = renderer!.root.findAllByType("View" as never)[1];
  expect(titleBox.props.style[1].flexBasis).toBe(400);
  await act(async () => heading.props.onTextLayout({ nativeEvent: { lines: [{}, {}] } }));
  expect(titleBox.props.style[1].flexBasis).toBe("100%");
  await act(async () => heading.props.onTextLayout({ nativeEvent: { lines: [{}] } }));
  expect(titleBox.props.style[1].flexBasis).toBe("100%");
  const action = renderer!.root.findByType("Pressable" as never);
  expect(action.props.accessibilityLabel).toBe("View all achievements");
  await act(async () => action.props.onPress());
  expect(onPress).toHaveBeenCalledOnce();
});
it("adds boundaries only between present sections and leaves item titles separate", async () => {
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(createElement(SectionStack, { children: [createElement(AppText, { key: "item", role: "label" }, "Member name"), false, null, createElement(AppText, { key: "caption", role: "caption" }, "Yesterday")] })); });
  expect(renderer!.root.findAllByType("Text" as never)).toHaveLength(2);
  expect(renderer!.root.findAllByType("View" as never)).toHaveLength(3);
  expect(renderer!.root.findAllByType("Text" as never)[0].props.accessibilityRole).toBeUndefined();
});

it("preserves the recipe and keeps numeric emphasis separate from heading semantics", async () => {
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(createElement(AppText, { role: "heading", style: { fontSize: 99, fontFamily: "Other", letterSpacing: 3, color: "red" } }, "1,140")); });
  const text = renderer!.root.findByType("Text" as never);
  const style = Object.assign({}, ...text.props.style);
  expect(style).toMatchObject({ fontSize: 20, lineHeight: 26, fontFamily: "Manrope_700Bold", letterSpacing: -0.4, textTransform: "none", color: "red" });
  expect(text.props.accessibilityRole).toBeUndefined();
  expect(text.props.allowFontScaling).not.toBe(false);
});
