import { createElement, useEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearApiReads } from "./api-read-cache";
import { apiReadScope, cachedApiRead } from "./api-read-cache";
import { requestApi } from "./api";
import { useCachedApi } from "./use-cached-api";

const mock = vi.hoisted(() => ({ id: "alice", token: "alice", resume: null as null | ((state: string) => void) }));
vi.mock("./auth", () => ({ useAuth: () => ({ user: { id: mock.id }, accessToken: mock.token, offlineMode: false }) }));
vi.mock("./env", () => ({ mobileEnv: { apiUrl: "https://test.local" } }));
vi.mock("expo-router", () => ({ useFocusEffect: (effect: () => (() => void) | void) => useEffect(effect, [effect]) }));
vi.mock("react-native", () => ({ AppState: { addEventListener: (_: string, listener: (state: string) => void) => {
  mock.resume = listener;
  return { remove() {} };
} } }));

let result: ReturnType<typeof useCachedApi<{ value: string }>>;
let renderer: ReactTestRenderer;
const renders: (string | undefined)[] = [];
function Probe() {
  result = useCachedApi<{ value: string }>("/api/crews");
  renders.push(result.data?.value);
  return null;
}
beforeEach(() => {
  clearApiReads();
  mock.id = mock.token = "alice";
  renders.length = 0;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  clearApiReads();
  vi.unstubAllGlobals();
});

it("deduplicates mount/focus reads, reuses data on remount and reloads after a write", async () => {
  const fetcher = vi.fn(async () => Response.json({ value: "cached" }));
  vi.stubGlobal("fetch", fetcher);
  await act(async () => { renderer = create(createElement(Probe)); });
  expect(result.data?.value).toBe("cached");
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
  renders.length = 0;
  await act(async () => { renderer = create(createElement(Probe)); });
  expect(renders[0]).toBe("cached");
  expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockImplementation(async (_url?: unknown, init?: RequestInit) => Response.json({ value: init?.method === "GET" ? "updated" : "saved" }));
  await act(async () => { await requestApi("https://test.local", "alice", "/api/crews/join", { body: {} }); });
  expect(result.data?.value).toBe("updated");
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it("hides a previous account immediately and ignores its delayed result", async () => {
  let resolve!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn()
    .mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }))
    .mockResolvedValueOnce(Response.json({ value: "bob" })));
  await act(async () => { renderer = create(createElement(Probe)); });
  mock.id = mock.token = "bob";
  renders.length = 0;
  await act(async () => renderer.update(createElement(Probe)));
  expect(renders).not.toContain("alice");
  expect(result.data?.value).toBe("bob");
  await act(async () => { resolve(Response.json({ value: "alice" })); });
  expect(result.data?.value).toBe("bob");
});

it("updates mounted consumers when another reader refreshes the shared snapshot", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ value: "initial" })));
  await act(async () => { renderer = create(createElement(Probe)); });
  await act(async () => {
    await cachedApiRead(apiReadScope("https://test.local", "alice"), "/api/crews", 0,
      async () => ({ value: "refreshed elsewhere" }));
  });
  expect(result.data?.value).toBe("refreshed elsewhere");
});

it("reloads silently on background return without setting busy when cached", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(async () => Response.json({ value: "initial" }));
  vi.stubGlobal("fetch", fetcher);
  await act(async () => { renderer = create(createElement(Probe)); });
  expect(result.data?.value).toBe("initial");
  expect(fetcher).toHaveBeenCalledTimes(1);

  // Transient inactive does not reload
  await act(async () => {
    mock.resume?.("inactive");
    mock.resume?.("active");
  });
  expect(fetcher).toHaveBeenCalledTimes(1);

  // Advance time past TAB_READ_TTL so cache is stale
  vi.advanceTimersByTime(65_000);

  // Background return reloads silently
  fetcher.mockImplementationOnce(async () => Response.json({ value: "fresh" }));
  await act(async () => {
    mock.resume?.("background");
    mock.resume?.("active");
  });
  // During or after reload, busy remains false
  expect(result.busy).toBe(false);
  expect(result.data?.value).toBe("fresh");
  expect(fetcher).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
});
