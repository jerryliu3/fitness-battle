import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stagePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "field-stage.tsx",
);

describe("field stage athlete selection", () => {
  it("keeps lane pan manual (center controls) without auto-recenter on select", () => {
    const source = readFileSync(stagePath, "utf8");
    expect(source).not.toMatch(/if \(!selected \|\| mode !== "lanes"\)/);
    expect(source).toMatch(/tweenCenterTo\(total, view.span, true\)/);
    expect(source).toMatch(/clampArenaLaneCenter\(target, nextSpan\)/);
  });
});
