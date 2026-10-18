import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: vi.fn() }));
vi.mock("@/lib/env", () => ({ serverEnv: {
  resendApiKey: "test-key", issueReportFrom: "Overtaek <reports@example.com>", issueReportTo: "support@example.com",
} }));
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { serverEnv } from "@/lib/env";
import { POST } from "./route";

const send = vi.fn();
function request(message: unknown = "The page stops responding when I save.", origin = "https://overtaek.com") {
  return new Request("https://overtaek.com/api/issues", {
    method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify({ message }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", send);
  vi.mocked(resolveRequestUserId).mockResolvedValue("account-123");
  serverEnv.resendApiKey = "test-key";
});

describe("issue submission", () => {
  it("requires sign-in and rejects cross-origin requests", async () => {
    vi.mocked(resolveRequestUserId).mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect((await POST(request(undefined, "https://other.com"))).status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });
  it("validates the report before sending", async () => {
    for (const message of [null, "short", "x".repeat(5001)]) {
      expect((await POST(request(message))).status).toBe(400);
    }
    expect(send).not.toHaveBeenCalled();
  });
  it("reports missing configuration and provider failures honestly", async () => {
    serverEnv.resendApiKey = "";
    expect((await POST(request())).status).toBe(503);
    serverEnv.resendApiKey = "test-key";
    send.mockResolvedValue(new Response("", { status: 429 }));
    expect((await POST(request())).status).toBe(502);
    send.mockRejectedValue(new Error("offline"));
    expect((await POST(request())).status).toBe(502);
  });
  it("sends plain text to the configured inbox with verified account attribution", async () => {
    send.mockResolvedValue(Response.json({ id: "email-123" }));
    const response = await POST(request());
    expect(await response.json()).toEqual({ sent: true });
    const [url, options] = send.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(options.body)).toMatchObject({
      from: serverEnv.issueReportFrom, to: [serverEnv.issueReportTo],
      text: "Account: account-123\n\nThe page stops responding when I save.",
    });
  });
});
