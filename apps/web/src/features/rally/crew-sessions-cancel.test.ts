import { createElement, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("@/ui/sheet", () => ({ Sheet: ({ open, title, children }: { open: boolean; title: string; children: ReactNode }) => open ? createElement("div", { "aria-label": title }, children) : null }));
import { CrewSessions } from "./crew-sessions";

it("requires confirmation before cancelling a crew session", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let cancelled = false;
  const fetcher = vi.fn(async (_url: string, options?: { method?: string }) => {
    if (options?.method === "POST") cancelled = true;
    return { ok: true, json: async () => ({ sessions: [{ id: "session", created_by: "you", title: "Crew run", sport: "running", starts_at: "2099-10-24T12:00:00Z", time_zone: "America/New_York", duration_min: 30, cancelled_at: cancelled ? "2026-10-27T12:00:00Z" : null, participants: [] }] }) };
  });
  vi.stubGlobal("fetch", fetcher);
  let view!: ReactTestRenderer;
  try {
    await act(async () => { view = create(createElement(CrewSessions, { crewId: "crew", userId: "you" })); });
    const button = () => view.root.findAllByType("button").find(item => item.children.join("") === "Cancel session")!;
    await act(async () => { button().props.onClick(); });
    expect(fetcher.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(0);
    const dialog = view.root.findByProps({ "aria-label": "Cancel this session?" });
    await act(async () => { dialog.findAllByType("button").find(item => item.children.join("") === "Keep session")!.props.onClick(); });
    expect(fetcher.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(0);
    await act(async () => { button().props.onClick(); });
    await act(async () => { view.root.findByProps({ "aria-label": "Cancel this session?" }).findAllByType("button").find(item => item.children.join("") === "Cancel session")!.props.onClick(); });
    expect(fetcher.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(1);
    expect(JSON.stringify(view.toJSON())).toContain("Cancelled");
  } finally { if (view) await act(async () => view.unmount()); vi.unstubAllGlobals(); }
});
