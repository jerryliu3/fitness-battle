import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
vi.mock("react-native", () => ({ View: "View", Switch: "Switch", StyleSheet: { create: (v: unknown) => v } }));
vi.mock("../ui/focus", () => ({ FocusSegments: "Segments", useFocusStyles: () => ({}) }));
vi.mock("../ui/section", () => ({ AppText: "Text", SectionHeader: "Heading" }));
vi.mock("../ui/app-icon", () => ({ AppIcon: "Icon" }));
vi.mock("../ui/sport-icon", () => ({ SportIcon: "Icon" }));
vi.mock("../ui/choice-picker", () => ({ ChoicePicker: "Choice" }));
vi.mock("../ui/timezone-picker", () => ({ TimezonePicker: "Choice" }));
vi.mock("../ui/appearance-control", () => ({ AppearanceControl: "Choice" }));
vi.mock("../ui/haptic-preference", () => ({ HapticPreference: "Choice" }));
import { ScopedThemeProvider } from "../appearance";
import { AthletePreferencesFields } from "./athlete-preferences";
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return r! * .2126 + g! * .7152 + b! * .0722;
}
it.each(["light", "dark"] as const)("keeps enabled preference switch thumbs visible in %s", async mode => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const base = freshState();
  const state = { ...base, enrollments: [], ratings: base.ratings.map(row => ({ ...row, optedIn: true })), healthRatings: base.healthRatings.map(row => ({ ...row, optedIn: true })) };
  let tree!: ReturnType<typeof create>;
  try {
    await act(async () => { tree = create(createElement(ScopedThemeProvider, { mode, children: createElement(AthletePreferencesFields, { state, dispatch: vi.fn() }) })); });
    const switches = tree.root.findAllByType("Switch" as never).filter(node => node.props.value);
    expect(switches.length).toBeGreaterThanOrEqual(4);
    for (const node of switches) {
      const values = [luminance(node.props.thumbColor), luminance(node.props.trackColor.true)].sort((a, b) => b - a);
      expect((values[0]! + .05) / (values[1]! + .05)).toBeGreaterThanOrEqual(3);
    }
  } finally { if (tree) await act(async () => tree.unmount()); vi.unstubAllGlobals(); }
});
