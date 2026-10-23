import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({
  pick: vi.fn(), dispatch: vi.fn(),
  user: { id: "alice", mode: "demo" } as { id: string; mode: string } | null,
}));
vi.mock("expo-image-picker", () => ({ launchImageLibraryAsync: mock.pick }));
vi.mock("react-native", () => ({ View: "View", Text: "Text", Image: "Image", Pressable: "Pressable" }));
vi.mock("react-native-svg", () => ({ default: "Svg", Path: "Path" }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: mock.user, offlineMode: true }) }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ dispatch: mock.dispatch }) }));
vi.mock("../lib/supabase", () => ({ supabase: {} }));
vi.mock("../ui/focus", () => ({ FocusSheet: "Sheet", FocusButton: "Button", f: {} }));
import { ProfilePhoto } from "./profile-photo";
let renderer: ReactTestRenderer;
const tree = () => createElement(ProfilePhoto, { state: freshState() });
const choose = () => renderer.root.findAllByType("Button" as never).find(n => n.props.label === "Choose photo")!;
const sheet = () => renderer.root.findByType("Sheet" as never);
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  mock.user = { id: "alice", mode: "demo" };
  mock.pick.mockResolvedValue({ canceled: true });
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  vi.unstubAllGlobals();
});
it("waits for native dismissal, then allows choosing again after cancellation", async () => {
  await act(async () => { renderer = create(tree()); });
  await act(async () => choose().props.onPress());
  expect(sheet().props.open).toBe(false);
  expect(mock.pick).not.toHaveBeenCalled();
  await act(async () => sheet().props.onClosed());
  expect(mock.pick).toHaveBeenCalledTimes(1);
  expect(mock.dispatch).not.toHaveBeenCalled();
  await act(async () => sheet().props.onClosed());
  expect(mock.pick).toHaveBeenCalledTimes(1);
  await act(async () => choose().props.onPress());
  await act(async () => sheet().props.onClosed());
  expect(mock.pick).toHaveBeenCalledTimes(2);
});
it("does not open the picker when the account changes during sheet dismissal", async () => {
  await act(async () => { renderer = create(tree()); });
  await act(async () => choose().props.onPress());
  mock.user = null;
  await act(async () => renderer.update(tree()));
  await act(async () => sheet().props.onClosed());
  expect(mock.pick).not.toHaveBeenCalled();
});
it("still applies a selected photo after the handoff", async () => {
  mock.pick.mockResolvedValue({ canceled: false, assets: [{ base64: "/9j/" }] });
  await act(async () => { renderer = create(tree()); });
  await act(async () => choose().props.onPress());
  await act(async () => sheet().props.onClosed());
  expect(mock.dispatch).toHaveBeenCalledWith({ type: "set-avatar", avatarUrl: "data:image/jpeg;base64,/9j/", accountId: "alice" });
});
