import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const panelPath = join(dirname(fileURLToPath(import.meta.url)), "crew-panel.tsx");

describe("crew share and invite", () => {
  it("reports share_crew_week results and supports invite deep links", () => {
    const source = readFileSync(panelPath, "utf8");
    expect(source).toMatch(/path === "\/entries"/);
    expect(source).toMatch(/already shared for this week/);
    expect(source).toMatch(/searchParams\.get\("invite"\)/);
    expect(source).toMatch(/next\.delete\("invite"\)/);
    expect(source).toMatch(/Copy invite link/);
    expect(source).toMatch(/function shareCountedSessions/);
    expect(source).not.toMatch(/\(!user \|\| demoMode\) && \(\s*<div className="focus-crew-preview"/);
  });
});
