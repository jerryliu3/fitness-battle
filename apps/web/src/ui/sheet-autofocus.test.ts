import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sheetPath = join(dirname(fileURLToPath(import.meta.url)), "sheet.tsx");

describe("Sheet autofocus guard", () => {
  it("supports preventing Radix open autofocus for mobile keyboards", () => {
    const source = readFileSync(sheetPath, "utf8");
    expect(source).toMatch(/preventAutoFocus/);
    expect(source).toMatch(/onOpenAutoFocus/);
  });
});
