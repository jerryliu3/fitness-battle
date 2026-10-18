import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const routePath = join(dirname(fileURLToPath(import.meta.url)), "you-route.tsx");

describe("delete account confirmation sheet", () => {
  it("does not duplicate dismiss actions with both Cancel and Close", () => {
    const source = readFileSync(routePath, "utf8");
    const sheetBlock = source.slice(
      source.indexOf("const deleteAccountSheet"),
      source.indexOf("useEffect(() => {", source.indexOf("const deleteAccountSheet")),
    );
    expect(sheetBlock).not.toMatch(/>\s*Cancel\s*</);
    expect(sheetBlock).toMatch(/Permanently delete account/);
  });
});
