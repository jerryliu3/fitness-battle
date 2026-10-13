import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_ID, parseThemeId, THEMES } from "./catalog";

describe("theme catalog", () => {
  it("defaults to form and ignores unknown ids", () => {
    expect(DEFAULT_THEME_ID).toBe("form");
    expect(parseThemeId(null)).toBe("form");
    expect(parseThemeId("volt")).toBe("form");
    expect(parseThemeId("ink")).toBe("ink");
    expect(THEMES.form.wordmark).toBe("FORM");
    expect(THEMES.ink.wordmark).toBe("SPLIT");
  });
});
