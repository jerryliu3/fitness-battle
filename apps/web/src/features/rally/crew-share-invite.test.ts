import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const panelPath = join(dirname(fileURLToPath(import.meta.url)), "crew-panel.tsx");
const inviteFlowPath = join(dirname(fileURLToPath(import.meta.url)), "use-crew-invite-flow.ts");

describe("crew invites", () => {
  it("supports invite deep links after retiring manual session sharing", () => {
    const flowSource = readFileSync(inviteFlowPath, "utf8");
    expect(flowSource).toMatch(/searchParams\.get\("invite"\)/);
    expect(flowSource).toMatch(/next\.delete\("invite"\)/);
    const panelSource = readFileSync(panelPath, "utf8");
    expect(panelSource).toMatch(/Copy invite link/);
    expect(panelSource).toMatch(/crewInviteHttpsUrl/);
    expect(panelSource).toMatch(/CrewInviteLanding/);
    expect(panelSource).toMatch(/useCrewInviteFlow/);
  });
});
