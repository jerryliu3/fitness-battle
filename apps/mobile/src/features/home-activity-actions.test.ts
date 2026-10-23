import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ state: null as any, user: { id: "athlete", mode: "demo" } as any, canWrite: true, dispatch: vi.fn(), supported: ["strava"], device: vi.fn() }));
vi.mock("react-native", () => ({ Text: "Text", TextInput: "TextInput", View: "View" }));
vi.mock("expo-router", () => ({ Link: "Link" }));
vi.mock("../lib/api", () => ({ requestApi: vi.fn() }));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "http://localhost" } }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: mock.user, offlineMode: true, accessToken: null }) }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ state: mock.state, canWrite: mock.canWrite, dispatch: mock.dispatch, refresh: vi.fn() }) }));
vi.mock("../lib/platform-providers", () => ({ providersForDevice: () => mock.supported.map((id) => ({ id })) }));
vi.mock("../lib/device-health", () => ({ syncAppleHealth: mock.device, syncHealthConnect: mock.device, createAppleHealthDeps: vi.fn(), createHealthConnectDeps: vi.fn() }));
vi.mock("../ui/focus", () => ({ f: {}, FocusButton: (props: any) => createElement("Button", props), FocusSheet: (props: any) => props.open ? createElement("Sheet", props) : null }));
import { HomeActivityActions } from "./home-activity-actions";
let renderer: ReactTestRenderer;
const button = (label: string) => renderer.root.findAllByType("Button" as any).find((node) => node.props.label === label)!;
beforeEach(async () => {
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
 mock.dispatch.mockClear(); mock.device.mockClear(); mock.canWrite = true; mock.supported = ["strava"];
 mock.user = { id: "athlete", mode: "demo" }; mock.state = freshState();
 await act(async () => { renderer = create(createElement(HomeActivityActions, {})); });
});
afterEach(async () => { await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
describe("native Home actions", () => {
 it("shows validation errors inside the open sheet, then saves decimal-keyboard input", async () => {
  await act(async () => button("Add activity").props.onPress());
  const input = (name: string) => renderer.root.findAllByType("TextInput" as any).find((node) => node.props.accessibilityLabel === name)!;
  await act(async () => input("Duration in minutes").props.onChangeText("30"));
  await act(async () => button("Save activity").props.onPress());
  expect(mock.dispatch).not.toHaveBeenCalled();
  expect(renderer.root.findByType("Sheet" as any).findAllByProps({ accessibilityRole: "alert" })).toHaveLength(1);
  await act(async () => input("Mileage").props.onChangeText("2,5"));
  await act(async () => button("Save activity").props.onPress());
  expect(mock.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "log-manual", distanceM: 4023.36, movingSec: 1800 }));
  expect(renderer.root.findAllByType("Sheet" as any)).toHaveLength(0);
 });
 it("disables writing and syncing while account hydration has failed", async () => {
  mock.canWrite = false;
  await act(async () => {
   renderer.update(createElement(HomeActivityActions, {}));
  });
   expect(button("Add activity").props.disabled).toBe(true);
   expect(button("Sync activities").props.disabled).toBe(true);
 });
 it("does not invoke another platform’s device tracker", async () => {
  mock.state = { ...mock.state, links: mock.state.links.map((link: any) => ({ ...link, linked: link.provider === "apple_health" })) };
  await act(async () => renderer.update(createElement(HomeActivityActions, {})));
  await act(async () => button("Sync activities").props.onPress());
  expect(mock.device).not.toHaveBeenCalled();
  expect(mock.dispatch).not.toHaveBeenCalled();
 });
});
