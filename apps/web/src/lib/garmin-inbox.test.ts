import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), user: vi.fn(), persist: vi.fn() }));
vi.mock("./fitness-store", () => ({ serviceDb: () => ({ rpc: mocks.rpc }), userIdForAthlete: mocks.user, persistSyncedActivities: mocks.persist }));
import { drainGarminPush, enqueueGarminPush, secretMatches } from "./garmin-inbox";

const raw = JSON.stringify({ activities: [{ userId: "garmin-user", summaryId: "123", activityType: "RUNNING", startTimeInSeconds: 1700000000, durationInSeconds: 200, distanceInMeters: 1000 }] });
describe("Garmin durable inbox", () => {
  beforeEach(() => { vi.resetAllMocks(); });
  it("requires a sufficiently strong matching secret", () => {
    expect(secretMatches("x", "x")).toBe(false);
    expect(secretMatches("a".repeat(32), "a".repeat(32))).toBe(true);
    expect(secretMatches("b".repeat(32), "a".repeat(32))).toBe(false);
  });
  it("stores a stable digest before acknowledging and rejects invalid payloads", async () => {
    mocks.rpc.mockResolvedValue({ error: null });
    await enqueueGarminPush(raw); await enqueueGarminPush(raw);
    expect(mocks.rpc.mock.calls[0][1].p_hash).toBe(mocks.rpc.mock.calls[1][1].p_hash);
    await expect(enqueueGarminPush('{}')).rejects.toThrow('invalid_payload');
  });
  it("finishes a leased delivery only after persistence", async () => {
    mocks.rpc.mockImplementation(async (name) => name === "claim_garmin_push" ? { data: [{ id: 1, lease_id: "lease", payload: JSON.parse(raw) }], error: null } : { error: null });
    mocks.user.mockResolvedValue("app-user"); mocks.persist.mockResolvedValue(true);
    await drainGarminPush(1);
    expect(mocks.persist).toHaveBeenCalledWith("app-user", [expect.objectContaining({ externalId: "123", provider: "garmin" })]);
    expect(mocks.rpc).toHaveBeenLastCalledWith("finish_garmin_push", { p_id: 1, p_lease: "lease", p_success: true });
  });
  it("releases failures for retry, including a user mapping race", async () => {
    mocks.rpc.mockImplementation(async name => name === "claim_garmin_push" ? { data: [{ id: 1, lease_id: "lease", payload: JSON.parse(raw) }], error: null } : { error: null });
    mocks.user.mockResolvedValue(null);
    await expect(drainGarminPush(1)).resolves.toEqual({ processed: 1, failed: 1 });
    expect(mocks.rpc).toHaveBeenLastCalledWith("finish_garmin_push", { p_id: 1, p_lease: "lease", p_success: false });
  });
});
