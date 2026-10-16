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
      "Home",
      "Arena",
      "Crew",
      "Athlete",
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

  it("keeps the Focus ink, lime, paper, and Star Ember tokens", () => {
    expect(SHELL_COLORS.plum).toBe("#26382d");
    expect(SHELL_COLORS.tennis).toBe("#d4ee89");
    expect(SHELL_COLORS.paper).toBe("#fafbf8");
    expect(SHELL_COLORS.starEmber).toBe("#f5c451");
  });
});
