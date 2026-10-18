import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const screenPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "arena-screen.tsx",
);

describe("competition week label", () => {
  it("clarifies that the displayed end date is not a full included day", () => {
    const source = readFileSync(screenPath, "utf8");
    expect(source).toMatch(/Week ends Monday 00:00 Eastern/);
  });
});
