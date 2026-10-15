import { describe, expect, it } from "vitest";
import {
  SHELL_COLORS,
  SHELL_TABS,
  SHELL_TAB_IDS,
  shellTabById,
  shellTabFromPath,
} from "./shell";

describe("phone shell", () => {
  it("names the four product tabs in order", () => {
    expect(SHELL_TABS.map((tab) => tab.id)).toEqual([...SHELL_TAB_IDS]);
    expect(SHELL_TABS.map((tab) => tab.label)).toEqual([
      "Today",
      "Arena",
      "Field",
      "You",
    ]);
    expect(new Set(SHELL_TABS.map((tab) => tab.href)).size).toBe(4);
  });

  it("resolves a tab from its path and ignores a sheet query", () => {
    expect(shellTabFromPath("/arena")?.id).toBe("arena");
    expect(shellTabFromPath("/you/")?.id).toBe("you");
    expect(shellTabFromPath("/field?sheet=crew")?.id).toBe("field");
    expect(shellTabFromPath("/onboarding")).toBeNull();
    expect(shellTabById("today")?.href).toBe("/today");
    expect(shellTabById("board")).toBeNull();
  });

  it("keeps the plum, tennis, paper, and Star Ember tokens", () => {
    expect(SHELL_COLORS.plum).toBe("#40234e");
    expect(SHELL_COLORS.tennis).toBe("#f6f253");
    expect(SHELL_COLORS.paper).toBe("#fff9e9");
    expect(SHELL_COLORS.starEmber).toBe("#f5c451");
  });
});
