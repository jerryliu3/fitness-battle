import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUser: vi.fn() }));
vi.mock("@/lib/env", () => ({
  serverEnv: {
    resendApiKey: "test-key",
    issueReportFrom: "Overtaek <reports@example.com>",
    issueReportTo: "support@example.com",
  },
}));

import { resolveRequestUser } from "@/lib/auth/request-user";
import { serverEnv } from "@/lib/env";
import { POST } from "./route";

const send = vi.fn();
let ipCounter = 1;

function makeRequest(
  payload: Record<string, unknown> = { race: "Vancouver Marathon 2026", surface: "replay" },
  origin = "https://overtaek.xyz",
  ip = `203.0.113.${ipCounter++}`,
) {
  return new Request("https://overtaek.xyz/api/rankings/race-requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", send);
  vi.mocked(resolveRequestUser).mockResolvedValue(null);
  serverEnv.resendApiKey = "test-key";
});

describe("race request submission", () => {
  it("allows guest submissions and sends via Resend", async () => {
    send.mockResolvedValue(Response.json({ id: "email-1" }));
    const res = await POST(
      makeRequest({
        race: "Vancouver Marathon 2026 - https://bmovanmarathon.ca",
        name: "Alex Runner",
        email: "alex@example.com",
        surface: "replay",
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });
    const [url, init] = send.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(init.body)).toMatchObject({
      from: serverEnv.issueReportFrom,
      to: [serverEnv.issueReportTo],
      reply_to: "alex@example.com",
      subject: "Overtaek race request: Vancouver Marathon 2026 - https://bmovanmarathon.ca",
    });
    expect(JSON.parse(init.body).text).toContain("Account: Guest");
    expect(JSON.parse(init.body).text).toContain("Name: Alex Runner");
  });

  it("attaches signed-in user metadata when authenticated", async () => {
    vi.mocked(resolveRequestUser).mockResolvedValue({ id: "acct-9", email: "member@example.com" });
    send.mockResolvedValue(Response.json({ id: "email-2" }));
    const res = await POST(makeRequest({ race: "Marine Corps Marathon 2026", surface: "observatory" }));
    expect(res.status).toBe(200);
    const body = JSON.parse(send.mock.calls[0][1].body);
    expect(body.reply_to).toBe("member@example.com");
    expect(body.text).toContain("Account: acct-9");
    expect(body.text).toContain("Surface: observatory");
  });

  it("rejects cross-origin requests and invalid fields", async () => {
    expect((await POST(makeRequest(undefined, "https://evil.example"))).status).toBe(403);
    expect((await POST(makeRequest({ race: "x" }))).status).toBe(400);
    expect((await POST(makeRequest({ race: "a".repeat(2001) }))).status).toBe(400);
    expect((await POST(makeRequest({ race: "Toronto Waterfront", email: "not-an-email" }))).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("silently accepts honeypot submissions without emailing", async () => {
    const res = await POST(makeRequest({ race: "Spam Race", website: "https://spam.invalid" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("reports missing configuration and Resend failures", async () => {
    serverEnv.resendApiKey = "";
    expect((await POST(makeRequest())).status).toBe(503);
    serverEnv.resendApiKey = "test-key";
    send.mockResolvedValue(new Response("", { status: 500 }));
    expect((await POST(makeRequest())).status).toBe(502);
  });
});
