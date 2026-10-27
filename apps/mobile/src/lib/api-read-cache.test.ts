import { afterEach, describe, expect, it, vi } from "vitest";
import { requestApi } from "./api";
import { apiReadScope, clearApiReads, invalidateApiReads, peekApiRead, subscribeApiReads } from "./api-read-cache";

afterEach(() => { clearApiReads(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const read = (token = "alice") => requestApi("https://test.local", token, "/api/crews", { cacheMs: 60_000 });
const scope = apiReadScope("https://test.local", "alice");

describe("mobile API read cache", () => {
  it("shares in-flight requests and reuses a fresh snapshot", async () => {
    const fetcher = vi.fn(async () => Response.json({ crews: [] }));
    vi.stubGlobal("fetch", fetcher);
    await Promise.all([read(), read(), read()]);
    await read();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(peekApiRead(scope, "/api/crews")).toEqual({ crews: [] });
  });
  it("separates credentials and API origins", async () => {
    const fetcher = vi.fn(async () => Response.json({ crews: [] }));
    vi.stubGlobal("fetch", fetcher);
    await read(); await read("bob");
    await requestApi("https://other.local", "alice", "/api/crews", { cacheMs: 60_000 });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("expires reads and retains stale data while revalidating", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => Response.json({ crews: [] }));
    vi.stubGlobal("fetch", fetcher);
    await read();
    await vi.advanceTimersByTimeAsync(60_001);
    expect(peekApiRead(scope, "/api/crews")).toEqual({ crews: [] });
    await read();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("invalidates successful writes and notifies mounted consumers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true })));
    await read();
    const notify = vi.fn();
    const unsubscribe = subscribeApiReads(scope, notify);
    await requestApi("https://test.local", "alice", "/api/crews/join", { body: { code: "ABC" } });
    expect(peekApiRead(scope, "/api/crews")).toBeUndefined();
    expect(notify).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
  it("does not let a pre-mutation read replace the refreshed cache", async () => {
    let resolve!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn()
      .mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }))
      .mockResolvedValueOnce(Response.json({ value: "new" })));
    const old = read();
    invalidateApiReads(scope);
    await read();
    resolve(Response.json({ value: "old" }));
    await old;
    expect(peekApiRead(scope, "/api/crews")).toEqual({ value: "new" });
  });
  it("retries failed reads and preserves cache after a failed write", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: "offline" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ crews: [] }))
      .mockResolvedValueOnce(Response.json({ error: "no access" }, { status: 403 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(read()).rejects.toThrow("offline");
    await read();
    await expect(requestApi("https://test.local", "alice", "/api/crews/join", { body: {} })).rejects.toThrow();
    expect(peekApiRead(scope, "/api/crews")).toEqual({ crews: [] });
  });
});
