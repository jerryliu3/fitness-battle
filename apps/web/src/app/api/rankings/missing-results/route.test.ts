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
  payload: Record<string, unknown> = {
    athleteName: "Jane Doe",
    race: "Chicago Marathon 2025",
    link: "https://results.chicagomarathon.com/2025/?pid=search&idp=123",
    surface: "observatory",
  },
  origin = "https://overtaek.xyz",
  ip = `203.0.114.${ipCounter++}`,
) {
  return new Request("https://overtaek.xyz/api/rankings/missing-results", {
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

describe("missing result submission", () => {
  it("accepts a link-only report and sends via Resend", async () => {
    send.mockResolvedValue(Response.json({ id: "email-1" }));
    const res = await POST(
      makeRequest({
        athleteName: "Jane Doe",
        race: "Chicago Marathon 2025",
        details: "Bib 4210, finish time 2:58:14",
        link: "https://results.chicagomarathon.com/2025/?pid=123",
        name: "Alex Runner",
        email: "alex@example.com",
        surface: "observatory",
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });
    const [url, init] = send.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      from: serverEnv.issueReportFrom,
      to: [serverEnv.issueReportTo],
      reply_to: "alex@example.com",
      subject: "Overtaek missing result: Jane Doe (Chicago Marathon 2025)",
    });
    expect(body.text).toContain("Athlete: Jane Doe");
    expect(body.text).toContain("Results link: https://results.chicagomarathon.com/2025/?pid=123");
    expect(body.text).toContain("Bib 4210, finish time 2:58:14");
    expect(body.attachments).toBeUndefined();
  });

  it("accepts an image-only report and forwards the attachment to Resend", async () => {
    send.mockResolvedValue(Response.json({ id: "email-2" }));
    const res = await POST(
      makeRequest({
        athleteName: "Sam Smith",
        race: "Boston Marathon 2026",
        image: {
          filename: "finish-screenshot.png",
          contentType: "image/png",
          contentBase64: "iVBORw0KGgo=",
        },
        surface: "observatory",
      }),
    );
    expect(res.status).toBe(200);
    const body = JSON.parse(send.mock.calls[0][1].body);
    expect(body.text).toContain("Image attached: finish-screenshot.png (image/png)");
    expect(body.attachments).toEqual([
      {
        filename: "finish-screenshot.png",
        content: "iVBORw0KGgo=",
        content_type: "image/png",
      },
    ]);
  });

  it("requires at least a link or an image and validates fields", async () => {
    expect((await POST(makeRequest({ athleteName: "Jane Doe", race: "Chicago Marathon 2025" }))).status).toBe(400);
    expect(
      (
        await POST(
          makeRequest({
            athleteName: "Jane Doe",
            race: "Chicago Marathon 2025",
            link: "ftp://invalid.example.com",
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          makeRequest({
            athleteName: "Jane Doe",
            race: "Chicago Marathon 2025",
            image: { filename: "bad.svg", contentType: "image/svg+xml", contentBase64: "PHN2Zz4=" },
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          makeRequest({
            athleteName: "J",
            race: "Chicago Marathon 2025",
            link: "https://example.com",
          }),
        )
      ).status,
    ).toBe(400);
    expect((await POST(makeRequest(undefined, "https://evil.example"))).status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it("silently accepts honeypot submissions without emailing", async () => {
    const res = await POST(
      makeRequest({
        athleteName: "Spam Runner",
        race: "Fake Race",
        website: "https://spam.invalid",
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("attaches signed-in user metadata and handles configuration or Resend errors", async () => {
    vi.mocked(resolveRequestUser).mockResolvedValue({ id: "acct-7", email: "member@example.com" });
    send.mockResolvedValue(Response.json({ id: "email-3" }));
    expect((await POST(makeRequest())).status).toBe(200);
    const body = JSON.parse(send.mock.calls[0][1].body);
    expect(body.reply_to).toBe("member@example.com");
    expect(body.text).toContain("Account: acct-7");

    serverEnv.resendApiKey = "";
    expect((await POST(makeRequest())).status).toBe(503);

    serverEnv.resendApiKey = "test-key";
    send.mockResolvedValue(new Response("", { status: 500 }));
    expect((await POST(makeRequest())).status).toBe(502);
  });
});
