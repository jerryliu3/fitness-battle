import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const panelPath = join(dirname(fileURLToPath(import.meta.url)), "crew-panel.tsx");

describe("crew invites", () => {
  it("supports invite deep links after retiring manual session sharing", () => {
    const source = readFileSync(panelPath, "utf8");
    expect(source).toMatch(/searchParams\.get\("invite"\)/);
    expect(source).toMatch(/next\.delete\("invite"\)/);
    expect(source).toMatch(/Copy invite link/);
  });
});
