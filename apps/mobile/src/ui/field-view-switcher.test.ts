vi.mock("./app-icon", () => ({ AppIcon: "AppIcon" }));
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({useColorScheme: () => "light", View: "View", Text: "Text", Pressable: "Pressable", Switch: "Switch", StyleSheet: { absoluteFill: {} }, Platform: { OS: "ios" } }));
vi.mock("./anchored-menu", () => ({
  AnchoredMenuItem: ({ accessibilityLabel, selected, onPress }: { accessibilityLabel: string; selected: boolean; onPress: () => void }) =>
    createElement("Pressable", { accessibilityLabel, accessibilityState: { selected }, onPress }),
  AnchoredMenu: ({ children }: { children: unknown }) => children,
  useAnchoredMenu: () => ({ open: true, close: vi.fn(), toggle: vi.fn(), anchorRef: { current: null }, menuLayout: null }),
}));
const native = vi.hoisted(() => ({ enabled: false }));
vi.mock("./system-choice", () => ({
  get SystemChoice() { return native.enabled ? "SystemChoice" : null; },
}));
vi.mock("./section", () => ({ textStyle: () => ({}) }));
vi.mock("../lib/haptics", () => ({ playCue: () => {} }));
import { FieldViewSwitcher } from "./field-view-switcher";

it("offers 2D, geographic 3D, and Timeline in a field view menu", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onChange = vi.fn(); let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(FieldViewSwitcher, { value: "4d", event: "running", onChange })); });
    const buttons = renderer.root.findAllByType("Pressable" as never);
    const trigger = buttons.find((b: { props: { accessibilityLabel?: string } }) => b.props.accessibilityLabel === "Field view: 3D");
    expect(trigger).toBeDefined();

    const optionTimeline = buttons.find((b: { props: { accessibilityLabel?: string } }) => b.props.accessibilityLabel === "Select Timeline");
    const option2D = buttons.find((b: { props: { accessibilityLabel?: string } }) => b.props.accessibilityLabel === "Select 2D");
    const option3D = buttons.find((b: { props: { accessibilityLabel?: string } }) => b.props.accessibilityLabel === "Select 3D");
  const option4D = buttons.find((b: { props: { accessibilityLabel?: string } }) => b.props.accessibilityLabel === "Select 4D");
    expect(optionTimeline).toBeDefined();
    expect(option2D).toBeDefined();
    expect(option3D?.props.accessibilityState.selected).toBe(true);
    await act(async () => option3D!.props.onPress());
    expect(onChange).toHaveBeenCalledWith("4d");
    expect(option4D).toBeUndefined();

    await act(async () => optionTimeline!.props.onPress());
    expect(onChange).toHaveBeenCalledWith("graph");

    await act(async () => option2D!.props.onPress());
    expect(onChange).toHaveBeenCalledWith("2d");

    await act(async () => renderer.update(createElement(FieldViewSwitcher, { value: "2d", event: "strength", onChange })));
    const updatedButtons = renderer.root.findAllByType("Pressable" as never);
    expect(updatedButtons.find((b: { props: { accessibilityLabel?: string } }) => b.props.accessibilityLabel === "Select 3D")).toBeUndefined();
  } finally { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); }
});

it("uses the shared Recovery policy without offering an unrelated sport view", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(FieldViewSwitcher, {
      event: "sleep", value: "graph", onChange: vi.fn(),
    })); });
    const choices = renderer.root.findAllByType("Pressable" as never)
      .filter(button => button.props.accessibilityLabel.startsWith("Select "));
    expect(choices.map(button => button.props.accessibilityLabel)).toEqual(["Select Timeline"]);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    vi.unstubAllGlobals();
  }
});


it("uses the iOS system menu when the bridge is available", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  native.enabled = true;
  const onChange = vi.fn();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(FieldViewSwitcher, { value: "4d", event: "running", onChange })); });
    const menu = renderer.root.findByType("SystemChoice" as never);
    expect(menu.props.value).toBe("4d");
    expect(menu.props.options.map((option: { label: string }) => option.label)).toEqual(["3D", "2D", "Timeline"]);
    await act(async () => menu.props.onSelect({ nativeEvent: { value: "graph" } }));
    expect(onChange).toHaveBeenCalledWith("graph");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    native.enabled = false;
    vi.unstubAllGlobals();
  }
});
