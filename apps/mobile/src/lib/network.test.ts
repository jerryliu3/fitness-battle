import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  appStateListener: null as null | ((state: string) => void),
}));

vi.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: (_: string, listener: (state: string) => void) => {
      mock.appStateListener = listener;
      return { remove() { mock.appStateListener = null; } };
    },
  },
}));
vi.mock("./env", () => ({ mobileEnv: { apiUrl: "https://test.local" } }));

import {
  checkNetworkNow,
  getNetworkStatus,
  isTransportError,
  reportNetworkFailure,
  reportNetworkSuccess,
  resetNetworkStatusForTests,
  subscribeNetworkStatus,
} from "./network";

describe("network reachability monitor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetNetworkStatusForTests();
  });

  afterEach(() => {
    resetNetworkStatusForTests();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("distinguishes transport errors from HTTP server errors", () => {
    expect(isTransportError(new TypeError("Network request failed"))).toBe(true);
    expect(isTransportError(Object.assign(new Error("Aborted"), { name: "AbortError" }))).toBe(true);
    expect(isTransportError(Object.assign(new Error("Server error"), { status: 500 }))).toBe(false);
    expect(isTransportError(new Error("Invalid credentials"))).toBe(false);
  });

  it("does not mark offline on non-transport errors", () => {
    const listener = vi.fn();
    subscribeNetworkStatus(listener);
    reportNetworkFailure(Object.assign(new Error("Bad gateway"), { status: 502 }));
    expect(getNetworkStatus()).toBe("online");
    expect(listener).not.toHaveBeenCalled();
  });

  it("marks offline on transport failure and recovers via health probe", async () => {
    const fetcher = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    const changes: string[] = [];
    subscribeNetworkStatus((status) => changes.push(status));

    reportNetworkFailure(new TypeError("Network request failed"));
    expect(getNetworkStatus()).toBe("offline");
    expect(changes).toEqual(["offline"]);

    await vi.advanceTimersByTimeAsync(3_000);
    expect(fetcher).toHaveBeenCalledWith("https://test.local/api/health", expect.objectContaining({ method: "GET" }));
    expect(getNetworkStatus()).toBe("online");
    expect(changes).toEqual(["offline", "online"]);
  });

  it("probes immediately when app returns to active while offline", async () => {
    const fetcher = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    subscribeNetworkStatus(() => {});

    reportNetworkFailure(new TypeError("Network request failed"));
    expect(getNetworkStatus()).toBe("offline");

    mock.appStateListener?.("active");
    await vi.waitFor(() => expect(getNetworkStatus()).toBe("online"));
    expect(fetcher).toHaveBeenCalledTimes(1);
    reportNetworkSuccess();
    expect(await checkNetworkNow()).toBe(true);
  });
});
