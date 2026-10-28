import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ owner: "owner", rows: [] as { blocked_id: string; profiles: { display_name: string } }[], insert: vi.fn(), remove: vi.fn(), failure: false }));
vi.mock("react-native", () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock("./auth", () => ({ useAuth: () => ({ user: { id: mock.owner }, offlineMode: false }) }));
vi.mock("./supabase", () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ order: () => ({ limit: () => {
    let after: string | null = null;
    const query = {
      gt: (_column: string, id: string) => { after = id; return query; },
      then: (resolve: (result: unknown) => unknown) => Promise.resolve({ data: mock.rows.filter(row => !after || row.blocked_id > after).slice(0, 100), error: mock.failure ? new Error("offline") : null }).then(resolve),
    };
    return query;
  } }) }) }),
  insert: mock.insert,
  delete: () => ({ eq: () => ({ eq: mock.remove }) }),
}) } }));
import { AthleteBlocksProvider, useAthleteBlocks } from "./athlete-blocks";
let observed: ReturnType<typeof useAthleteBlocks>;
function Consumer() { observed = useAthleteBlocks(); return null; }
let renderer: ReactTestRenderer;
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks(); mock.owner = "owner"; mock.rows = []; mock.failure = false;
  mock.insert.mockResolvedValue({ error: null }); mock.remove.mockResolvedValue({ error: null });
  await act(async () => { renderer = create(createElement(AthleteBlocksProvider, null, createElement(Consumer))); });
});
it("loads and persists directed blocks, then reloads them", async () => {
  expect(observed.ready).toBe(true);
  mock.rows = [{ blocked_id: "peer", profiles: { display_name: "Peer" } }];
  await act(async () => observed.setBlocked("peer", true));
  expect(mock.insert).toHaveBeenCalledWith({ blocker_id: "owner", blocked_id: "peer" });
  expect(observed.blocks).toEqual([{ id: "peer", name: "Peer" }]);
  mock.rows = [];
  await act(async () => observed.setBlocked("peer", false));
  expect(mock.remove).toHaveBeenCalledWith("blocked_id", "peer");
  expect(observed.blocks).toEqual([]);
});
it("fails closed when the block list cannot be loaded", async () => {
  mock.failure = true;
  await act(async () => observed.reload());
  expect(observed.ready).toBe(false);
  expect(observed.error).toContain("Could not load");
});
it("clears the previous account before loading another", async () => {
  mock.rows = [{ blocked_id: "peer", profiles: { display_name: "Peer" } }];
  await act(async () => observed.reload());
  mock.owner = "other"; mock.rows = [];
  await act(async () => renderer.update(createElement(AthleteBlocksProvider, null, createElement(Consumer))));
  expect(observed.blocks).toEqual([]);
});

it("loads every block when the result spans multiple pages", async () => {
  mock.rows = Array.from({ length: 205 }, (_, i) => ({ blocked_id: String(i).padStart(4, "0"), profiles: { display_name: `Athlete ${i}` } }));
  await act(async () => observed.reload());
  expect(observed.ready).toBe(true);
  expect(observed.blocks).toHaveLength(205);
  expect(observed.blocks[204]?.id).toBe("0204");
});
