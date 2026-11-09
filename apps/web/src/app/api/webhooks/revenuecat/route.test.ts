import { describe, expect, it, vi, beforeEach } from "vitest";

const mockUpsert = vi.fn();
vi.mock("@/lib/competition-authority", () => ({
  competitionAuthorityDatabase: () => ({
    from: (table: string) => {
      if (table === "athlete_entitlements") {
        return {
          upsert: mockUpsert,
        };
      }
      return {};
    },
  }),
}));

import { POST } from "./route";

describe("POST /api/webhooks/revenuecat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.REVENUECAT_WEBHOOK_AUTH_KEY;
  });

  it("rejects unauthorized requests when auth key is configured", async () => {
    process.env.REVENUECAT_WEBHOOK_AUTH_KEY = "secret-key-123";

    const request = new Request("http://localhost/api/webhooks/revenuecat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer wrong-key",
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("handles INITIAL_PURCHASE for monthly pass", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const userId = "11111111-2222-4333-8444-555555555555";
    const request = new Request("http://localhost/api/webhooks/revenuecat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: userId,
          product_id: "xyz.overtaek.pass.monthly.099",
          store: "APP_STORE",
          purchased_at_ms: 1731110000000,
          expiration_at_ms: 1733702000000,
          original_transaction_id: "orig-123",
          transaction_id: "tx-456",
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.tier).toBe("monthly_pass");
    expect(json.status).toBe("active");

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        tier: "monthly_pass",
        status: "active",
        provider: "apple",
        original_transaction_id: "orig-123",
        latest_transaction_id: "tx-456",
        cancel_at_period_end: false,
      }),
      { onConflict: "user_id" }
    );
  });

  it("handles NON_RENEWING_PURCHASE for $49 lifetime pass", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const userId = "22222222-3333-4444-8555-666666666666";
    const request = new Request("http://localhost/api/webhooks/revenuecat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: {
          type: "NON_RENEWING_PURCHASE",
          app_user_id: userId,
          product_id: "xyz.overtaek.pass.lifetime.4900",
          store: "PLAY_STORE",
          purchased_at_ms: 1731110000000,
          original_transaction_id: "life-orig-1",
          transaction_id: "life-tx-1",
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.tier).toBe("lifetime_pass");
    expect(json.status).toBe("active");

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        tier: "lifetime_pass",
        status: "active",
        provider: "google",
        expires_at: null,
      }),
      { onConflict: "user_id" }
    );
  });

  it("handles EXPIRATION gracefully", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const userId = "33333333-4444-4555-8666-777777777777";
    const request = new Request("http://localhost/api/webhooks/revenuecat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: {
          type: "EXPIRATION",
          app_user_id: userId,
          product_id: "xyz.overtaek.pass.monthly.099",
          expiration_at_ms: 1731110000000,
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe("expired");
  });

  it("handles RevenueCat TEST connection ping", async () => {
    const request = new Request("http://localhost/api/webhooks/revenuecat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: {
          type: "TEST",
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.test).toBe(true);
  });

  it("returns 404 when user_id is not found in profiles (foreign key violation)", async () => {
    mockUpsert.mockResolvedValue({ error: { code: "23503", message: "foreign key violation" } });

    const request = new Request("http://localhost/api/webhooks/revenuecat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: "00000000-0000-4000-8000-000000000000",
          product_id: "xyz.overtaek.pass.monthly.099",
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });
});
