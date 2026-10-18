import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "./fetch-with-timeout";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("native request deadline", () => {
  it("works without the browser-only AbortSignal.timeout static method", async () => {
    vi.stubGlobal("AbortSignal", undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ ok: true })),
    );
    expect((await fetchWithTimeout("https://test.local")).ok).toBe(true);
  });
  it("aborts a hanging fetch and clears its timer", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, options) =>
          new Promise((_resolve, reject) =>
            options.signal.addEventListener("abort", () =>
              reject(new Error("aborted")),
            ),
          ),
      ),
    );
    const result = expect(
      fetchWithTimeout("https://test.local", {}, 10),
    ).rejects.toThrow("aborted");
    await vi.advanceTimersByTimeAsync(10);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });
});
