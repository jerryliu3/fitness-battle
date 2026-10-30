vi.mock("../lib/haptics", () => ({ playCue: vi.fn(), playPattern: vi.fn(() => vi.fn()) }));
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ StyleSheet: { create: (value: unknown) => value }, Modal: "Modal", Platform: { OS: "ios" }, Pressable: "Pressable", Text: "Text", View: "View" }));
vi.mock("@react-native-community/datetimepicker", () => ({ default: "DateTimePicker" }));
vi.mock("@react-native-picker/picker", async () => { const { createElement } = await import("react"); return { Picker: Object.assign((props: object) => createElement("Picker", props), { Item: "PickerItem" }) }; });
vi.mock("./focus", () => ({ f: {} }));
import { NumberPicker, DateTimeField } from "./form-picker.native";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
it("commits decimal distance only after Done and preserves the value when cancelled", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const change = vi.fn();
  await act(async () => { renderer = create(createElement(NumberPicker, { label: "Distance", unit: "mi", value: "2.5", step: .1, max: 1000, onChange: change })); });
  const button = (label: string) => renderer.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel === label || node.findAllByType("Text" as never).some(text => text.children.includes(label)))!;
  await act(async () => button("Distance: 2.5 mi").props.onPress());
  await act(async () => renderer.root.findAllByType("Picker" as never).find(node => node.props.accessibilityLabel === "Distance tenths")!.props.onValueChange(7));
  expect(change).not.toHaveBeenCalled();
  await act(async () => button("Cancel").props.onPress());
  expect(change).not.toHaveBeenCalled();
  await act(async () => button("Distance: 2.5 mi").props.onPress());
  await act(async () => renderer.root.findAllByType("Picker" as never).find(node => node.props.accessibilityLabel === "Distance tenths")!.props.onValueChange(7));
  await act(async () => button("Done").props.onPress());
  expect(change).toHaveBeenCalledWith("2.7");
});
it("returns the chosen wall time for the existing Eastern validator without device-zone conversion", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const change = vi.fn();
  await act(async () => { renderer = create(createElement(DateTimeField, { label: "Session time · Eastern", mode: "time", value: "08:00", onChange: change })); });
  await act(async () => renderer.root.findByType("Pressable" as never).props.onPress());
  await act(async () => renderer.root.findByType("DateTimePicker" as never).props.onValueChange({}, new Date("2000-01-01T09:45:00Z")));
  expect(change).not.toHaveBeenCalled();
  const done = renderer.root.findAllByType("Pressable" as never).find(node => node.findAllByType("Text" as never).some(text => text.children.includes("Done")))!;
  await act(async () => done.props.onPress());
  expect(change).toHaveBeenCalledWith("09:45");
});

it("allows an optional time to return to current time without clearing required session times", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const change = vi.fn();
  await act(async () => { renderer = create(createElement(DateTimeField, { label: "Time of day", mode: "time", value: "08:00", onChange: change, clearLabel: "Use current time" })); });
  await act(async () => renderer.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel === "Use current time")!.props.onPress());
  expect(change).toHaveBeenCalledWith("");
  await act(async () => renderer.update(createElement(DateTimeField, { label: "Time of day", mode: "time", value: "", onChange: change, clearLabel: "Use current time" })));
  expect(renderer.root.findAllByType("Pressable" as never)).toHaveLength(1);
  await act(async () => renderer.update(createElement(DateTimeField, { label: "Session time", mode: "time", value: "08:00", onChange: change })));
  expect(renderer.root.findAllByType("Pressable" as never)).toHaveLength(1);
});
