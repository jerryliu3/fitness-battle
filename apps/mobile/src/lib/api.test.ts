import { afterEach, describe, expect, it, vi } from "vitest";
import { requestApi } from "./api";
afterEach(() => vi.unstubAllGlobals());
describe("mobile API transport", () => {
  it("requires live credentials before making a request", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      requestApi("https://test.com", null, "/api/issues"),
    ).rejects.toThrow("live signed-in");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("sends bearer credentials and JSON to the existing server route", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ sent: true }));
    vi.stubGlobal("fetch", fetcher);
    await expect(
      requestApi("https://test.com/", "token", "/api/issues", {
        body: { message: "Report text" },
      }),
    ).resolves.toEqual({ sent: true });
    expect(fetcher.mock.calls[0][0]).toBe("https://test.com/api/issues");
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe("Bearer token");
  });
  it("retains server failures and does not treat unpersisted crew writes as saved", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "Invite not found" }, { status: 400 }),
        ),
    );
    await expect(
      requestApi("https://test.com", "token", "/api/crews/join"),
    ).rejects.toThrow("Invite not found");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(Response.json({ persisted: false })),
        ),
    );
    await expect(
      requestApi("https://test.com", "token", "/api/crews"),
    ).rejects.toThrow();
    await expect(
      requestApi("https://test.com", "token", "/api/fitness/sync", {
        allowUnpersisted: true,
      }),
    ).resolves.toEqual({ persisted: false });
  });
});
