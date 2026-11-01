import { expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
import { persistCompeteAccount } from "./compete-persist";
function database() {
  return { from(table: string) {
    const result = { data: table === "categories" ? [{ id: "running", slug: "running" }] : [], error: null };
    const query = { select: () => query, eq: () => query, in: () => query, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
    return query;
  } };
}
it("uses the atomic writer and the committed lifetime value rather than a client total", async () => {
  const state = freshState(); state.lifetimeOvertakes = 99999;
  const rpc = vi.fn(async (name: string) => name === "read_compete_overtake_baselines"
    ? { data: {}, error: null }
    : { data: { updatedAt: "2026-11-01T01:00:00Z", lifetimeOvertakes: 7, overtakes: 0 }, error: null });
  const revision = await persistCompeteAccount(database() as never, "owner", state, "previous", { db: { rpc } as never, receipts: 12, computedAt: new Date("2026-11-01T01:00:00Z") });
  expect(revision).toBe("2026-11-01T01:00:00Z");
  expect(state.lifetimeOvertakes).toBe(7);
  expect(rpc).toHaveBeenLastCalledWith("save_compete_account_with_overtakes", expect.objectContaining({ p_user_id: "owner", p_expected_updated_at: "previous", p_expected_receipts: 12, p_moments: [], p_baselines: [] }));
});
it("fails before saving when the authoritative baseline cannot be read", async () => {
  const rpc = vi.fn(async () => ({ data: null, error: { message: "unavailable" } }));
  await expect(persistCompeteAccount(database() as never, "owner", freshState(), "previous", { db: { rpc } as never, receipts: 0, computedAt: new Date() })).rejects.toThrow("overtake_baselines_unavailable");
  expect(rpc).toHaveBeenCalledTimes(1);
});
it("does not acknowledge a lifetime change when the transaction rejects the revision", async () => {
  const state = freshState(); state.lifetimeOvertakes = 7;
  const rpc = vi.fn(async (name: string) => name === "read_compete_overtake_baselines"
    ? { data: {}, error: null } : { data: null, error: { message: "account_changed_reload" } });
  await expect(persistCompeteAccount(database() as never, "owner", state, "stale", { db: { rpc } as never, receipts: 0, computedAt: new Date() })).rejects.toThrow("account_changed_reload");
  expect(state.lifetimeOvertakes).toBe(7);
  expect(state.committedOvertakeMoments).toBeUndefined();
});
