vi.mock("../lib/athlete-blocks", () => ({ useAthleteBlocks: () => ({ blocks: [], ready: true, setBlocked: vi.fn() }) }));
import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
const fixtures = vi.hoisted(() => ({ rows: [] as unknown[], navigate: vi.fn() }));
vi.mock("@fitness-battle/shared", async importOriginal => ({ ...await importOriginal<typeof import("@fitness-battle/shared")>(), weeklyBoard: () => fixtures.rows }));
vi.mock("react-native", () => ({ View: "View", Text: "Text", ImageBackground: "ImageBackground", Pressable: "Pressable", StyleSheet: { absoluteFill: {}, create: (styles: unknown) => styles } }));
vi.mock("expo-router", () => ({ useRouter: () => ({ navigate: fixtures.navigate }) }));
vi.mock("../ui/club-art", () => ({ alpineTrail: 1 }));
vi.mock("../ui/app-icon", () => ({ AppIcon: () => null }));
import { freshState } from "@fitness-battle/shared";
import { RivalCard } from "./club-rival-card";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
it("renders ordinal, rival and gap in visible and accessible native copy", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const state = freshState();
  state.primary = "running";
  state.units = "metric";
  state.ratings = state.ratings.map(r => ({ ...r, optedIn: r.sport === "running" }));
  fixtures.rows = [
    { id: "mara", name: "Mara Chen", you: false, place: 1, distanceM: 6000, effort: 0 },
    { id: "you", name: "Alex", you: true, place: 2, distanceM: 5000, effort: 0 },
  ];
  await act(async () => { renderer = create(createElement(RivalCard, { state })); });
  const text = renderer.root.findAll(node => (node.type as unknown) === "Text").map(node => node.children.join(" ")).join(" ");
  expect(text).toContain("2nd");
  expect(text).toContain("1.0 km behind Mara");
  expect(text).toContain("Next rival in your field");
  expect(text).not.toContain(" / ");
  const button = renderer.root.find(node => (node.type as unknown) === "Pressable");
  expect(button.props.accessibilityLabel).toContain("2nd place. 1.0 km behind Mara. Next rival in your field.");
  button.props.onPress();
  expect(fixtures.navigate).toHaveBeenCalledWith("/arena?event=running");
});
