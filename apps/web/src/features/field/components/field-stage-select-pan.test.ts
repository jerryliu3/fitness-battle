import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stagePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "field-stage.tsx",
);

describe("field stage athlete selection", () => {
  it("centers a selected athlete without restoring retired follow controls", () => {
    const source = readFileSync(stagePath, "utf8");
    expect(source).toContain("tweenCenterTo(valueAt(runner, time))");
    expect(source).toMatch(/clampViewCenter\(target, nextSpan\)/);
    expect(source).not.toContain("Center me");
    expect(source).not.toContain("Center on you");
    expect(source).not.toContain("Fit field");
  });
});
