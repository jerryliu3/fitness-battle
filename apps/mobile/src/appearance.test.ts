import { createElement, useState } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";
import { APP_COLORS } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ system: "dark" as "light" | "dark", getItem: vi.fn(), setItem: vi.fn() }));
vi.mock("react-native", () => ({ useColorScheme: () => mock.system, StyleSheet: { create: (value: unknown) => value } }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: mock.getItem, setItem: mock.setItem } }));
import { AppThemeProvider, createThemedStyles, useAppTheme, useThemedStyles } from "./appearance";
const recipes = createThemedStyles(colors => ({ surface: { backgroundColor: colors.surfaceCard }, accent: { color: colors.accentSecondary } }));
let api: ReturnType<typeof useAppTheme>;
let mounts = 0;
function Probe() {
  api = useAppTheme();
  const styles = useThemedStyles(recipes);
  const [identity] = useState(() => ++mounts);
  return createElement("probe", { mode: api.mode, identity, styles, actionText: api.colors.textOnAction });
}
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); mock.system = "dark"; mounts = 0; mock.getItem.mockReset().mockResolvedValue(null); mock.setItem.mockReset().mockResolvedValue(undefined); });
it("updates cached native style recipes without remounting children and persists explicit appearance choices", async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(createElement(AppThemeProvider, null, createElement(Probe))); });
  const identity = tree.root.findByType("probe" as never).props.identity;
  expect(tree.root.findByType("probe" as never).props.styles.surface.backgroundColor).toBe(APP_COLORS.dark.surfaceCard);
  await act(async () => api.setPreference("light"));
  expect(tree.root.findByType("probe" as never).props.styles.accent.color).toBe(APP_COLORS.light.accentSecondary);
  expect(tree.root.findByType("probe" as never).props.identity).toBe(identity);
  expect(mock.setItem).toHaveBeenLastCalledWith(expect.any(String), "light");
  await act(async () => api.setPreference("system"));
  expect(tree.root.findByType("probe" as never).props.mode).toBe("dark");
  expect(tree.root.findByType("probe" as never).props.actionText).toBe(APP_COLORS.light.textOnAction);
  await act(async () => tree.unmount());
});
it("does not let a late stored appearance overwrite a choice the user just made", async () => {
  let resolve!: (value: string) => void;
  mock.getItem.mockReturnValue(new Promise<string>(done => { resolve = done; }));
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(createElement(AppThemeProvider, null, createElement(Probe))); });
  await act(async () => api.setPreference("light"));
  await act(async () => resolve("dark"));
  expect(tree.root.findByType("probe" as never).props.mode).toBe("light");
  await act(async () => tree.unmount());
});
