import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("@/ui/sheet", () => ({ Sheet: () => null }));
import { CrewSessions } from "./crew-sessions";
it("uses already-authorized roster portraits for session participants", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ sessions: [{ id: "session", created_by: "peer", title: "Crew run", sport: "running", starts_at: "2099-10-24T12:00:00Z", time_zone: "America/New_York", duration_min: 30, cancelled_at: null, participants: [{ user_id: "peer", display_name: "Mara Chen" }] }] }) })));
  let view!: ReactTestRenderer;
  try {
    await act(async () => { view = create(createElement(CrewSessions, { crewId: "crew", userId: "you", portraits: { peer: "https://example.test/mara.jpg" } })); });
    expect(view.root.findByType("img").props.src).toBe("https://example.test/mara.jpg");
    expect(JSON.stringify(view.toJSON())).not.toContain('"MC"');
  } finally { if (view) await act(async () => view.unmount()); vi.unstubAllGlobals(); }
});
