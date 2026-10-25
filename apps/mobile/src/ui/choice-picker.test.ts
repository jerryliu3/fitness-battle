import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ show: vi.fn(), OS: "ios" }));
vi.mock("react-native", () => ({ Platform: mock, View: "View", Text: "Text", Modal: "Modal", Pressable: "Pressable", FlatList: "FlatList", ActionSheetIOS: { showActionSheetWithOptions: mock.show }, StyleSheet: { create: (v: unknown) => v } }));
vi.mock("@react-native-picker/picker", () => ({ Picker: Object.assign((props: object) => createElement("Picker", props), { Item: "Item" }) }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
vi.mock("./focus", () => ({ f: { row: {}, input: {} } }));
import { ChoicePicker } from "./choice-picker";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); mock.show.mockClear(); });
it("uses the iOS action sheet for short choices and ignores cancellation", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const change = vi.fn();
  await act(async () => { renderer = create(createElement(ChoicePicker, { label: "Sport", value: "running", options: [{ value: "running", label: "Running" }], onChange: change })); });
  renderer.root.findByProps({ accessibilityLabel: "Sport: Running" }).props.onPress();
  const callback = mock.show.mock.calls[0][1]; callback(-1); callback(1); expect(change).not.toHaveBeenCalled(); callback(0); expect(change).toHaveBeenCalledWith("running");
});
it("uses a native wheel for long choices and commits only on Done", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const change = vi.fn(), options = Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: `Option ${i}` }));
  await act(async () => { renderer = create(createElement(ChoicePicker, { label: "Choice", value: "0", options, onChange: change })); });
  await act(async () => { renderer.root.findByProps({ accessibilityLabel: "Choice: Option 0" }).props.onPress(); });
  await act(async () => { renderer.root.find(node => (node.type as unknown) === "Picker").props.onValueChange("8"); });
  expect(change).not.toHaveBeenCalled();
  await act(async () => { renderer.root.findByProps({ accessibilityLabel: "Confirm Choice" }).props.onPress(); });
  expect(change).toHaveBeenCalledWith("8");
});
