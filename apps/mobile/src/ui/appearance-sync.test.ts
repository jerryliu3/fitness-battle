import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ preference: "system" as "system" | "light" | "dark", platform: { OS: "ios" }, native: vi.fn(), theme: vi.fn(), variables: vi.fn() }));
vi.mock("react-native", () => ({ Appearance: { setColorScheme: mock.native }, Platform: mock.platform }));
vi.mock("uniwind", () => ({ Uniwind: { setTheme: mock.theme, updateCSSVariables: mock.variables } }));
vi.mock("../appearance", () => ({ useAppTheme: () => ({ preference: mock.preference }) }));
import { AppearanceSync } from "./appearance-sync";
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); mock.platform.OS = "ios"; });
it.each(["light", "dark", "system"] as const)("syncs native controls with %s without pinning System", async preference => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.preference = preference;
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(AppearanceSync)); });
  expect(mock.native).toHaveBeenCalledWith(preference === "system" ? "auto" : preference);
  expect(mock.theme).toHaveBeenCalledWith(preference);
  expect(mock.variables).toHaveBeenCalledTimes(2);
  await act(async () => tree.unmount());
});
it("keeps Expo web independent of native Appearance overrides", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.platform.OS = "web";
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(AppearanceSync)); });
  expect(mock.native).not.toHaveBeenCalled();
  await act(async () => tree.unmount());
});
