import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "page.tsx",
);

describe("support page", () => {
  it("links account deletion and support email", () => {
    const source = readFileSync(pagePath, "utf8");
    expect(source).toMatch(/delete-account/);
    expect(source).toMatch(/support@overtaek\.xyz/);
  });
});
