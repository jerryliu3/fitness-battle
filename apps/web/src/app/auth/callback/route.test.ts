import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  configured: true,
  exchangeCodeForSession: vi.fn(async (_code: string) => ({ error: null as { message: string } | null })),
}));

vi.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: () => ({
    configured: mock.configured,
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: mock.exchangeCodeForSession,
    },
  }),
}));

import { GET } from "./route";

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.configured = true;
    mock.exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it("exchanges code and redirects to safe next path", async () => {
    const response = await GET(
      new Request("https://overtaek.xyz/auth/callback?code=pkce-123&next=%2Farena"),
    );
    expect(mock.exchangeCodeForSession).toHaveBeenCalledWith("pkce-123");
    expect(response.headers.get("location")).toBe("https://overtaek.xyz/app/arena");
  });

  it("redirects signup and onboarding OAuth flows through /app/onboarding", async () => {
    const response = await GET(
      new Request(
        "https://overtaek.xyz/auth/callback?code=pkce-456&from=signup&next=%2Fapp%2Ffield",
      ),
    );
    expect(mock.exchangeCodeForSession).toHaveBeenCalledWith("pkce-456");
    expect(response.headers.get("location")).toBe(
      "https://overtaek.xyz/app/onboarding?next=%2Fapp%2Ffield",
    );
  });

  it("redirects back to login with error when code exchange fails", async () => {
    mock.exchangeCodeForSession.mockResolvedValue({
      error: { message: "Invalid code verifier" },
    });
    const response = await GET(
      new Request("https://overtaek.xyz/auth/callback?code=bad&next=%2Ftoday"),
    );
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("Invalid code verifier");
    expect(location.searchParams.get("next")).toBe("/app/today");
  });

  it("redirects back to signup when OAuth error arrives from signup flow", async () => {
    const response = await GET(
      new Request(
        "https://overtaek.xyz/auth/callback?from=signup&error=access_denied&error_description=User+cancelled",
      ),
    );
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/signup");
    expect(location.searchParams.get("error")).toBe("User cancelled");
  });
});
