import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const panelPath = join(dirname(fileURLToPath(import.meta.url)), "sleep-panel.tsx");

describe("sleep panel copy", () => {
  it("explains contest score vs nightly average", () => {
    const source = readFileSync(panelPath, "utf8");
    expect(source).toMatch(/nights you miss count against/);
    expect(source).not.toMatch(/not a distance\./);
  });
});
