import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ state: null as any, user: { id: "athlete", mode: "demo" } as any, canWrite: true, dispatch: vi.fn(), supported: ["strava"], device: vi.fn(), begin: vi.fn(), end: vi.fn(), refresh: vi.fn() }));
vi.mock("react-native", () => ({
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  StyleSheet: { create: (styles: unknown) => styles }, Text: "Text", TextInput: "TextInput", View: "View" }));
vi.mock("expo-router", () => ({ Link: "Link" }));
vi.mock("../lib/api", () => ({ requestApi: vi.fn() }));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "http://localhost" } }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: mock.user, offlineMode: true, accessToken: null }) }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ state: mock.state, canWrite: mock.canWrite, dispatch: mock.dispatch, refresh: mock.refresh, beginSyncReviewBatch: mock.begin, endSyncReviewBatch: mock.end }) }));
vi.mock("../lib/platform-providers", () => ({ providersForDevice: () => mock.supported.map((id) => ({ id })) }));
vi.mock("../lib/device-health", () => ({ syncAppleHealth: mock.device, syncHealthConnect: mock.device, createAppleHealthDeps: vi.fn(), createHealthConnectDeps: vi.fn() }));
vi.mock("../ui/icon-button", () => ({ IconButton: "IconButton" }));
vi.mock("../ui/form-picker", () => ({ NumberPicker: "NumberPicker", DateTimeField: "DateTimeField" }));
vi.mock("../ui/choice-picker", () => ({ ChoicePicker: "ChoicePicker" }));
vi.mock("../ui/focus", () => ({ f: {}, FocusButton: (props: any) => createElement("Button", props), FocusSheet: (props: any) => props.open ? createElement("Sheet", props) : null }));
import { HomeActivityActions } from "./home-activity-actions";
let renderer: ReactTestRenderer;
const button = (label: string) => renderer.root.findAllByType("Button" as any).find((node) => node.props.label === label)!;
beforeEach(async () => {
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
 mock.dispatch.mockClear(); mock.device.mockReset(); mock.begin.mockClear(); mock.end.mockClear(); mock.refresh.mockClear(); mock.canWrite = true; mock.supported = ["strava"];
 mock.user = { id: "athlete", mode: "demo" }; mock.state = freshState();
 await act(async () => { renderer = create(createElement(HomeActivityActions, {})); });
});
afterEach(async () => { await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
describe("native Home actions", () => {
 it("shows validation errors inside the open sheet, then saves picker values", async () => {
  await act(async () => button("Add activity").props.onPress());
  expect(button("Save activity").props.disabled).toBe(true);
  await act(async () => renderer.root.findByType("ChoicePicker" as any).props.onChange("running"));
  const input = (name: string) => renderer.root.findAllByType("NumberPicker" as any).find((node) => node.props.label === name)!;
  await act(async () => input("Duration").props.onChange("30"));
  await act(async () => button("Save activity").props.onPress());
  expect(mock.dispatch).not.toHaveBeenCalled();
  expect(renderer.root.findByType("Sheet" as any).findAllByType("Text" as any).filter(node => node.props.accessibilityRole === "alert")).toHaveLength(1);
  await act(async () => input("Distance").props.onChange("2,5"));
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

it("batches device-health samples through the receipt gate instead of bypassing it with refresh", async () => {
  mock.supported = ["apple_health"];
  mock.state = { ...mock.state, links: mock.state.links.map((link: any) => ({ ...link, linked: link.provider === "apple_health" })) };
  mock.device.mockResolvedValue({ ok: true, message: "Synced", activities: [{ id: "health-run", provider: "apple_health", externalId: "run", categorySlug: "running", startedAt: new Date().toISOString(), metricValue: 5000, movingSec: 1800, rawName: "Run" }] });
  await act(async () => renderer.update(createElement(HomeActivityActions, {})));
  await act(async () => button("Sync activities").props.onPress());
  expect(mock.begin).toHaveBeenCalledWith("athlete");
  expect(mock.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "apply-sync", accountId: "athlete", provider: "apple_health", activities: [expect.objectContaining({ provenance: "recorded", source: "apple_health" })] }));
  expect(mock.refresh).not.toHaveBeenCalled();
  expect(mock.end).toHaveBeenCalledWith("athlete");
});
