import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stagePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "field-stage.tsx",
);

describe("field stage athlete selection", () => {
  it("recenters the lane window when an athlete is selected", () => {
    const source = readFileSync(stagePath, "utf8");
    expect(source).toMatch(/if \(!chosen \|\| mode !== "lanes"\)/);
    expect(source).toMatch(/clampArenaLaneCenter\(target, span\)/);
  });
});
