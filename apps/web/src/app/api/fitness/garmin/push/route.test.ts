import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ enqueue: vi.fn(), drain: vi.fn(), after: vi.fn() }));
vi.mock("next/server", () => ({ after: m.after, NextResponse: { json: (body: unknown) => Response.json(body) } }));
vi.mock("@/lib/env", () => ({ serverEnv: { garminWebhookSecret: "a".repeat(32) } }));
vi.mock("@/lib/garmin-inbox", async importOriginal => ({ ...(await importOriginal<typeof import("@/lib/garmin-inbox")>()), enqueueGarminPush: m.enqueue, drainGarminPush: m.drain }));
import { POST } from "./route";

describe("Garmin push endpoint", () => {
  beforeEach(() => { vi.resetAllMocks(); });
  it("rejects unauthenticated events without writing", async () => {
    const res = await POST(new Request("https://example.com/api/fitness/garmin/push?key=wrong", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401); expect(m.enqueue).not.toHaveBeenCalled();
  });
  it("acknowledges only after the durable write succeeds", async () => {
    m.enqueue.mockRejectedValueOnce(new Error("enqueue_failed"));
    const request = () => new Request(`https://example.com/api/fitness/garmin/push?key=${"a".repeat(32)}`, { method: "POST", body: '{"activities":[]}' });
    expect((await POST(request())).status).toBe(503); expect(m.after).not.toHaveBeenCalled();
    m.enqueue.mockResolvedValueOnce(undefined);
    expect((await POST(request())).status).toBe(200); expect(m.after).toHaveBeenCalledOnce();
  });
});
