import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
const nativeView = vi.hoisted(() => vi.fn());
vi.mock("expo", () => ({ requireOptionalNativeModule: () => null, requireNativeView: nativeView }));
vi.mock("react-native", () => ({ NativeModules: {}, Text: "Text", View: "View" }));
vi.mock("./icon-button", () => ({ IconButton: "IconButton" }));
vi.mock("./section", () => ({ textStyle: () => ({}) }));
import { MaterialBack } from "./material-back.ios";
import { DeferredCourseMap } from "../features/deferred-course-map";
it("keeps back navigation usable when the installed binary lacks AnchoredChoice", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onPress = vi.fn();
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(createElement(MaterialBack, { onPress })); });
  renderer!.root.findByType("IconButton" as never).props.onPress();
  expect(onPress).toHaveBeenCalledOnce();
  expect(nativeView).not.toHaveBeenCalled();
  await act(async () => renderer!.unmount()); vi.unstubAllGlobals();
});
it("explains missing native map support without evaluating the Mapbox SDK", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(createElement(DeferredCourseMap, {} as never)); });
  expect(renderer!.root.findByType("Text" as never).children.join("")).toContain("missing native map support");
  await act(async () => renderer!.unmount()); vi.unstubAllGlobals();
});
