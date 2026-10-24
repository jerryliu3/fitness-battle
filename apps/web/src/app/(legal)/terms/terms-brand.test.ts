import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "page.tsx",
);

describe("terms of service branding", () => {
  it("uses overtaek in the terms body instead of Fitness Battle", () => {
    const source = readFileSync(pagePath, "utf8");
    expect(source).not.toMatch(/Fitness Battle/);
    expect(source).toMatch(/overtaek/);
  });
});
