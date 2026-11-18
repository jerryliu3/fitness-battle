import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";

const mock = vi.hoisted(() => ({ request: vi.fn(), device: vi.fn(), dispatch: vi.fn(), dismiss: vi.fn(), user: { id: "alice" } as { id: string } | null }));
const state = freshState();
state.links = state.links.map(l => l.provider === "apple_health" ? { ...l, status: "connected", linked: true } : l);
vi.mock("react-native", () => ({ View: "View" }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: mock.user, accessToken: `${mock.user?.id}-token`, offlineMode: false }) }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ state, dispatch: mock.dispatch }) }));
vi.mock("../lib/api", () => ({ requestApi: mock.request }));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://example.test" } }));
vi.mock("../lib/device-health", () => ({ createAppleHealthDeps: (d: unknown) => d, createHealthConnectDeps: (d: unknown) => d, syncAppleHealth: mock.device, syncHealthConnect: mock.device }));
vi.mock("../lib/platform-providers", () => ({ providersForDevice: () => [{ id: "apple_health", name: "Apple Health" }] }));
vi.mock("../ui/focus", () => ({ FocusButton: "Button", FocusSheet: ({ open, children, onClosed }: any) => createElement("Sheet", { open, onClosed }, open ? children : null) }));
vi.mock("../ui/form-picker", () => ({ NumberPicker: "NumberPicker" }));
vi.mock("../ui/section", () => ({ AppText: "Text", SectionHeader: "Heading" }));
import { FocusButton, FocusSheet } from "../ui/focus";
import { NumberPicker } from "../ui/form-picker";
import { FitnessHistoryImport } from "./fitness-history-import";

let renderer: ReactTestRenderer;
const button = (label: string) => renderer.root.findAllByType(FocusButton).find(b => b.props.label === label)!;
beforeEach(() => {
  vi.clearAllMocks(); mock.user = { id: "alice" };
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.request.mockImplementation(async (_url, _token, _path, options) => options?.body?.days
    ? { lease: "ticket", since: "2026-10-18T18:00:00Z", until: "2026-11-17T18:00:00Z" }
    : { completed: false, provider: null, days: null });
  mock.device.mockResolvedValue({ ok: true, activities: [] });
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
it("offers 90 days after connection and Later leaves import available in settings", async () => {
  await act(async () => { renderer = create(createElement(FitnessHistoryImport, { offer: "apple_health", onDismiss: mock.dismiss })); });
  expect(mock.request).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByType(NumberPicker).props.value).toBe("90");
  await act(async () => button("Later").props.onPress());
  expect(mock.device).not.toHaveBeenCalled();
  expect(mock.request.mock.calls.every(c => !c[3]?.body)).toBe(true);
  await act(async () => renderer.update(createElement(FitnessHistoryImport, { offer: null, onDismiss: mock.dismiss })));
  expect(button("Import fitness history").props.disabled).toBe(false);
  await act(async () => button("Import fitness history").props.onPress());
  expect(renderer.root.findByType(NumberPicker).props.value).toBe("90");
});
it("passes the selected range and locks settings immediately without waiting for activity review", async () => {
  await act(async () => { renderer = create(createElement(FitnessHistoryImport, { offer: "apple_health", onDismiss: mock.dismiss })); });
  await act(async () => renderer.root.findByType(NumberPicker).props.onChange("30"));
  await act(async () => button("Import 30 days").props.onPress());
  expect(mock.request).toHaveBeenCalledWith("https://example.test", "alice-token", "/api/fitness/history", { body: { provider: "apple_health", days: 30 } });
  expect(mock.device).toHaveBeenCalledWith(expect.objectContaining({ historyLease: "ticket", syncRange: expect.objectContaining({ since: "2026-10-18T18:00:00Z" }) }));
  expect(button("History imported").props.disabled).toBe(true);
  expect(mock.dispatch).not.toHaveBeenCalled();
  await act(async () => renderer.root.findByType(FocusSheet).props.onClosed());
  expect(mock.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "apply-sync", accountId: "alice" }));
});
it("keeps failed imports retryable", async () => {
  mock.device.mockResolvedValue({ ok: false, message: "Upload failed" });
  await act(async () => { renderer = create(createElement(FitnessHistoryImport, { offer: "apple_health", onDismiss: mock.dismiss })); });
  await act(async () => button("Import 90 days").props.onPress());
  expect(button("Import 90 days").props.disabled).toBe(false);
  expect(mock.request).toHaveBeenCalledWith("https://example.test", "alice-token", "/api/fitness/history", { method: "DELETE", body: { lease: "ticket" } });
  expect(mock.dispatch).not.toHaveBeenCalled();
});
it("keeps a completed account locked after reopening settings", async () => {
  mock.request.mockResolvedValue({ completed: true, provider: "strava", days: 14 });
  await act(async () => { renderer = create(createElement(FitnessHistoryImport, { offer: "apple_health", onDismiss: mock.dismiss })); });
  expect(button("History imported").props.disabled).toBe(true);
  expect(renderer.root.findByType(FocusSheet).props.open).toBe(false);
  expect(mock.dismiss).toHaveBeenCalled();
});


it("does not apply a late import to a different account", async () => {
  let resolve!: (value: unknown) => void;
  mock.device.mockReturnValue(new Promise(r => { resolve = r; }));
  await act(async () => { renderer = create(createElement(FitnessHistoryImport, { offer: "apple_health", onDismiss: mock.dismiss })); });
  await act(async () => button("Import 90 days").props.onPress());
  mock.user = { id: "bob" };
  await act(async () => renderer.update(createElement(FitnessHistoryImport, { offer: null, onDismiss: mock.dismiss })));
  await act(async () => resolve({ ok: true, activities: [] }));
  expect(mock.dispatch).not.toHaveBeenCalled();
  expect(button("Import fitness history").props.disabled).toBe(false);
});


it("ignores an old import even after switching away and back to the same account", async () => {
  let resolve!: (value: unknown) => void;
  mock.device.mockReturnValue(new Promise(r => { resolve = r; }));
  await act(async () => { renderer = create(createElement(FitnessHistoryImport, { offer: "apple_health", onDismiss: mock.dismiss })); });
  await act(async () => button("Import 90 days").props.onPress());
  mock.user = { id: "bob" };
  await act(async () => renderer.update(createElement(FitnessHistoryImport, { offer: null, onDismiss: mock.dismiss })));
  mock.user = { id: "alice" };
  await act(async () => renderer.update(createElement(FitnessHistoryImport, { offer: null, onDismiss: mock.dismiss })));
  await act(async () => resolve({ ok: true, activities: [] }));
  expect(mock.dispatch).not.toHaveBeenCalled();
  expect(button("Import fitness history").props.disabled).toBe(false);
});
