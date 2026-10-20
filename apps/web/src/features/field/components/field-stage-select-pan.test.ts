import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stagePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "field-stage.tsx",
);

describe("field stage athlete selection", () => {
  it("centers a selected athlete while preserving explicit follow controls", () => {
    const source = readFileSync(stagePath, "utf8");
    expect(source).toContain("tweenCenterTo(valueAt(runner, time))");
    expect(source).toMatch(/tweenCenterTo\(total, view.span, true\)/);
    expect(source).toMatch(/clampViewCenter\(target, nextSpan\)/);
  });
});
