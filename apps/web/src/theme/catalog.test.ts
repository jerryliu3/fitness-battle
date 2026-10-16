import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_ID, parseThemeId, THEMES } from "./catalog";

describe("theme catalog", () => {
  it("defaults to focus and ignores unknown ids", () => {
    expect(DEFAULT_THEME_ID).toBe("focus");
    expect(parseThemeId(null)).toBe("focus");
    expect(parseThemeId("volt")).toBe("focus");
    expect(parseThemeId("ink")).toBe("ink");
    expect(parseThemeId("form")).toBe("form");
    expect(THEMES.rally.wordmark).toBe("RALLY");
    expect(THEMES.form.wordmark).toBe("FORM");
    expect(THEMES.ink.wordmark).toBe("SPLIT");
  });
});
