import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_ID, parseThemeId, THEMES } from "./catalog";

describe("theme catalog", () => {
  it("defaults to rally and ignores unknown ids", () => {
    expect(DEFAULT_THEME_ID).toBe("rally");
    expect(parseThemeId(null)).toBe("rally");
    expect(parseThemeId("volt")).toBe("rally");
    expect(parseThemeId("ink")).toBe("ink");
    expect(parseThemeId("form")).toBe("form");
    expect(THEMES.rally.wordmark).toBe("RALLY");
    expect(THEMES.form.wordmark).toBe("FORM");
    expect(THEMES.ink.wordmark).toBe("SPLIT");
  });
});
