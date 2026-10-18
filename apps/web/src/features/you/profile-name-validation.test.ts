import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const routePath = join(dirname(fileURLToPath(import.meta.url)), "you-route.tsx");

describe("profile name validation", () => {
  it("surfaces an error when saving an empty display name", () => {
    const source = readFileSync(routePath, "utf8");
    expect(source).toMatch(/Display name cannot be empty/);
    expect(source).toMatch(/profileError/);
  });
});
