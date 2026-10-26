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
      "Compete",
      "Progress",
      "Crew",
    ]);
    expect(new Set(SHELL_TABS.map((tab) => tab.href)).size).toBe(4);
  });

  it("resolves a tab from its path and ignores a sheet query", () => {
    expect(shellTabFromPath("/arena")?.id).toBe("arena");
    expect(shellTabFromPath("/app/arena")?.id).toBe("arena");
    expect(shellTabFromPath("/you/")?.id).toBe("you");
    expect(shellTabFromPath("/field?sheet=crew")?.id).toBe("field");
    expect(shellTabFromPath("/onboarding")).toBeNull();
    expect(shellTabById("today")?.href).toBe("/today");
    expect(shellTabById("board")).toBeNull();
  });

  it("keeps the Everyday Club navy, yellow, canvas, and Ember tokens", () => {
    expect(SHELL_COLORS.plum).toBe("#142b3b");
    expect(SHELL_COLORS.tennis).toBe("#f7c948");
    expect(SHELL_COLORS.paper).toBe("#f8f9f6");
    expect(SHELL_COLORS.starEmber).toBe("#f7c948");
  });
});
