vi.mock("../ui/toast", () => ({ Toast: "AccountSaveToast" }));
vi.mock("../features/sync-review", async () => {
  const { createElement } = await import("react");
  return { SyncReview: (props: object) => createElement("SyncReview", props) };
});
import AsyncStorage from "@react-native-async-storage/async-storage";
import { freshState, reduceCompete } from "@fitness-battle/shared";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountStorageKeys } from "./account-state";
import { CompeteProvider, useCompeteStore } from "./compete-store";

const mock = vi.hoisted(() => ({
  auth: {
    user: null as null | {
      id: string;
      displayName: string;
      email: string;
      mode: string;
    },
    loading: false,
    offlineMode: false,
  },
  values: new Map<string, string>(),
  pathname: "/arena",
  router: { navigate: vi.fn() },
  appStateListeners: new Set<(state: string) => void>(),
}));
vi.mock("./auth", () => ({ useAuth: () => mock.auth }));
vi.mock("./env", () => ({
  mobileEnv: { useDemoData: false, apiUrl: "https://test.local", supabaseUrl: "https://test.supabase.co", supabaseAnonKey: "a".repeat(30) },
}));
vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: {
          session: mock.auth.user
            ? {
                user: { id: mock.auth.user.id },
                access_token: mock.auth.user.id,
              }
            : null,
        },
      }),
    },
  },
}));
vi.mock("expo-router", () => ({
  useRouter: () => mock.router,
  usePathname: () => mock.pathname,
}));
vi.mock("react-native", () => ({
  Text: "Text",
  View: "View",
  Pressable: "Pressable",
  AppState: {
    currentState: "active",
    addEventListener: (_type: string, listener: (state: string) => void) => {
      mock.appStateListeners.add(listener);
      return { remove: () => mock.appStateListeners.delete(listener) };
    },
  },
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => mock.values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mock.values.set(key, value);
    },
    removeItem: async (key: string) => {
      mock.values.delete(key);
    },
    multiGet: async (keys: string[]) =>
      keys.map((key) => [key, mock.values.get(key) ?? null]),
    multiSet: async (pairs: [string, string][]) => {
      for (const [key, value] of pairs) mock.values.set(key, value);
    },
    multiRemove: async (keys: string[]) => {
      for (const key of keys) mock.values.delete(key);
    },
    getAllKeys: async () => [...mock.values.keys()],
  },
}));

let api: ReturnType<typeof useCompeteStore>;
let renderer: ReactTestRenderer;
let fetcher: ReturnType<typeof vi.fn>;
const seenNames: (string | null)[] = [];
function Probe() {
  api = useCompeteStore();
  seenNames.push(api.state?.name ?? null);
  return null;
}
function element() {
  return createElement(CompeteProvider, null, createElement(Probe));
}
async function flush() {
  for (let i = 0; i < 30; i++) await Promise.resolve();
}
function login(id: string) {
  mock.auth.user = {
    id,
    displayName: id,
    email: `${id}@example.com`,
    mode: "supabase",
  };
}
function accountState(id: string) {
  const state = freshState();
  state.name = id;
  return state;
}
beforeEach(() => {
  mock.appStateListeners.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-22T16:00:00Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.values.clear();
  mock.pathname = "/arena";
  mock.router.navigate.mockClear();
  mock.auth.user = null;
  mock.auth.loading = false;
  mock.auth.offlineMode = false;
  seenNames.length = 0;
  fetcher = vi
    .fn()
    .mockImplementation(async (_url: string, init: RequestInit) =>
      init.method === "PUT"
        ? Response.json({ ok: true, updatedAt: "2026-10-20T13:00:00Z" })
        : Response.json({ state: accountState(mock.auth.user?.id ?? "guest") }),
    );
  vi.stubGlobal("fetch", fetcher);
});
afterEach(async () => {
  if (renderer)
    await act(async () => {
      renderer.unmount();
    });
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function mount() {
  await act(async () => {
    renderer = create(element());
    await flush();
  });
}
async function switchTo(id: string | null) {
  if (id) login(id);
  else mock.auth.user = null;
  await act(async () => {
    renderer.update(element());
    await flush();
  });
}
async function save() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
    await flush();
  });
}

describe("mobile account lifecycle", () => {
  it("renders only the current account's cache before the server resolves, with writes gated", async () => {
    login("Alice");
    mock.values.set(accountStorageKeys("Alice").state, JSON.stringify(accountState("Cached Alice")));
    let resolve!: (response: Response) => void;
    fetcher.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }));
    await mount();
    expect(api.state?.name).toBe("Cached Alice");
    expect(api.loadStatus).toBe("loading");
    expect(api.canWrite).toBe(false);
    await act(async () => { api.dispatch({ type: "set-city", city: "Blocked during hydration" }); });
    expect(api.state?.city).not.toBe("Blocked during hydration");
    await act(async () => { api.dispatch({ type: "set-avatar", avatarUrl: "https://example.com/new.jpg" }); });
    expect(api.state?.avatarUrl).not.toBe("https://example.com/new.jpg");
    await act(async () => {
      resolve(Response.json({ state: accountState("Server Alice"), updatedAt: "rev" }));
      await flush();
    });
    expect(api.state?.name).toBe("Server Alice");
    expect(api.canWrite).toBe(true);
  });

  it("skips fresh automatic standings refreshes but still allows an explicit refresh", async () => {
    login("Alice");
    await mount();
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => { await api.refresh({ ifStale: true }); });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => { await api.refresh(); });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("recovers a failed initial account load through a later standings refresh", async () => {
    login("Alice");
    fetcher.mockResolvedValueOnce(Response.json({ error: "offline" }, { status: 503 }));
    await mount();
    expect(api.loadStatus).toBe("failed");
    expect(api.canWrite).toBe(false);
    await act(async () => { expect(await api.refresh({ ifStale: true })).toBe(true); });
    expect(api.loadStatus).toBe("ready");
    expect(api.canWrite).toBe(true);
    expect(api.standingsStale).toBe(false);
  });
  it("loads and saves an authenticated synthetic account independently of its legacy mode label", async () => {
    login("Synthetic");
    mock.auth.user!.mode = "demo";
    mock.auth.offlineMode = false;
    await mount();
    expect(fetcher).toHaveBeenCalled();
    expect(api.state?.name).toBe("Synthetic");
    await act(async () => api.dispatch({ type: "set-city", city: "Boston" }));
    await save();
    expect(fetcher.mock.calls.some(([, init]) => init.method === "PUT")).toBe(true);
  });
  it.each([
    "/athlete",
    "/athlete-settings",
    "/settings",
    "/notifications",
    "/onboarding",
    "/crew-members",
  ])("keeps %s open when a field update arrives", async (path) => {
    login("Alice");
    mock.pathname = path;
    const active = reduceCompete(accountState("Alice"), { type: "opt-in", sport: "running", now: "2026-10-19T09:00:00Z" });
    fetcher.mockResolvedValueOnce(Response.json({ state: active }));
    await mount();
    await act(async () => {
      api.dispatch({
        type: "log-manual",
        sport: "running",
        distanceM: 1000,
        movingSec: 600,
        activityId: "local-notice-test",
        now: new Date(Date.now() - 3600000).toISOString(),
      });
      await flush();
    });
    await act(flush);
    expect(api.state?.activities).toHaveLength(1);
    expect(api.fieldNotice?.personal).toBe(true);
    expect(mock.router.navigate).not.toHaveBeenCalled();
  });
  it("preserves an edit dispatched while refresh persists its revision", async () => {
    login("Alice");
    await mount();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = AsyncStorage.setItem;
    vi.spyOn(AsyncStorage, "setItem").mockImplementation(async (key, value) => {
      if (key.endsWith(":revision")) await pending;
      return original(key, value);
    });
    fetcher.mockResolvedValueOnce(
      Response.json({ state: accountState("Alice"), updatedAt: "revision-2" }),
    );
    let refreshing!: Promise<boolean>;
    await act(async () => {
      refreshing = api.refresh();
      await flush();
    });
    await act(async () => {
      api.dispatch({ type: "set-city", city: "New edit" });
    });
    await act(async () => {
      release();
      await refreshing;
    });
    expect(api.state?.city).toBe("New edit");
    expect(
      JSON.parse(mock.values.get(accountStorageKeys("Alice").state)!).city,
    ).toBe("New edit");
  });

  it("never displays or uploads guest training into a newly signed-in account", async () => {
    await mount();
    await act(async () => {
      api.dispatch({ type: "rename", name: "Guest draft" });
    });
    await switchTo("Alice");
    expect(api.state?.name).toBe("Alice");
    await save();
    expect(
      fetcher.mock.calls.filter(([, options]) => options.method === "PUT"),
    ).toHaveLength(0);
    expect(
      JSON.parse(mock.values.get(accountStorageKeys(null).state)!).name,
    ).toBe("Guest draft");
  });
  it("hides the previous account immediately and restores the guest cache on sign-out", async () => {
    login("Alice");
    await mount();
    const boundary = seenNames.length;
    await switchTo("Bob");
    expect(seenNames.slice(boundary)).not.toContain("Alice");
    expect(api.state?.name).toBe("Bob");
    await switchTo(null);
    expect(api.state?.name).toBe("Guest");
  });
  it("saves the latest document when several actions dispatch before a render", async () => {
    login("Alice");
    await mount();
    await act(async () => {
      api.dispatch({ type: "set-city", city: "Toronto" });
      api.dispatch({ type: "set-units", units: "metric" });
    });
    await save();
    const writes = fetcher.mock.calls.filter(
      ([, options]) => options.method === "PUT",
    );
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0][1].body as string).state).toMatchObject({
      city: "Toronto",
      units: "metric",
    });
  });
  it("surfaces open-week conflicts, preserves the draft, and retries", async () => {
    login("Alice");
    await mount();
    fetcher.mockImplementation(async (_url: string, init: RequestInit) =>
      init.method === "PUT"
        ? Response.json({ error: "week_still_open" }, { status: 409 })
        : Response.json({ state: accountState("Alice") }),
    );
    await act(async () => {
      api.dispatch({ type: "set-city", city: "Boston" });
    });
    await save();
    expect(api.saveError).toContain("wave has started");
    expect(api.state?.city).toBe("Boston");
    expect(mock.values.get(accountStorageKeys("Alice").dirty)).toBe("1");
    fetcher.mockResolvedValue(
      Response.json({ ok: true, updatedAt: "2026-10-20T13:00:00Z" }),
    );
    await act(async () => {
      api.retrySave();
    });
    await save();
    expect(api.saveError).toBeNull();
    expect(mock.values.get(accountStorageKeys("Alice").dirty)).toBeUndefined();
  });
  it("sends the loaded revision and blocks stale retries until explicit account reload", async () => {
    login("Alice");
    fetcher.mockImplementation(async (_url: string, init: RequestInit) =>
      init.method === "PUT"
        ? Response.json({ error: "account_changed_reload" }, { status: 409 })
        : Response.json({
            state: accountState("Alice"),
            updatedAt: "revision-1",
          }),
    );
    await mount();
    await act(async () =>
      api.dispatch({ type: "set-city", city: "Local draft" }),
    );
    await save();
    const writes = () =>
      fetcher.mock.calls.filter(([, options]) => options.method === "PUT");
    expect(JSON.parse(writes()[0]![1].body as string).updatedAt).toBe(
      "revision-1",
    );
    await act(async () =>
      api.dispatch({ type: "set-city", city: "Still local" }),
    );
    await save();
    expect(writes()).toHaveLength(1);
    await act(async () => {
      api.retrySave();
      await flush();
    });
    expect(
      mock.values.has(`${accountStorageKeys("Alice").state}:recovery`),
    ).toBe(true);
    expect(api.state?.city).toBe(accountState("Alice").city);
  });
  it("does not apply a delayed Alice refresh after switching to Bob", async () => {
    login("Alice");
    await mount();
    let resolve!: (response: Response) => void;
    fetcher.mockImplementationOnce(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    let refreshing!: Promise<boolean>;
    await act(async () => {
      refreshing = api.refresh();
      await flush();
    });
    await switchTo("Bob");
    await act(async () => {
      resolve(Response.json({ state: accountState("Alice stale") }));
      await refreshing;
    });
    expect(api.state?.name).toBe("Bob");
  });
  it("refuses to clear the current account for a delayed previous-account deletion", async () => {
    login("Alice");
    await mount();
    await switchTo("Bob");
    expect(await api.clearAccountData("Alice")).toBe(false);
    expect(api.state?.name).toBe("Bob");
    expect(mock.values.has(accountStorageKeys("Bob").state)).toBe(true);
    expect(mock.values.has(accountStorageKeys("Alice").state)).toBe(false);
  });
  it("ignores actions explicitly attributed to a previous account", async () => {
    login("Alice");
    await mount();
    await switchTo("Bob");
    await act(async () => {
      api.dispatch({
        type: "rename",
        name: "Wrong profile",
        accountId: "Alice",
      });
    });
    expect(api.state?.name).toBe("Bob");
  });

  it("blocks writes from a failed initial load until the account is reloaded", async () => {
    login("Alice");
    fetcher.mockResolvedValue(
      Response.json({ error: "offline" }, { status: 503 }),
    );
    await mount();
    await act(async () => {
      api.dispatch({ type: "set-city", city: "Unsafe replacement" });
    });
    await save();
    expect(
      fetcher.mock.calls.filter(([, options]) => options.method === "PUT"),
    ).toHaveLength(0);
    expect(api.saveError).toContain("could not load");
    expect(api.canWrite).toBe(false);
    fetcher.mockImplementation(async () =>
      Response.json({ state: accountState("Alice recovered") }),
    );
    await act(async () => {
      api.retrySave();
      await flush();
    });
    expect(api.state?.name).toBe("Alice recovered");
    expect(api.canWrite).toBe(true);
    expect(api.saveError).toBeNull();
    expect(api.state?.city).not.toBe("Unsafe replacement");
  });
  it("clears only exact owned caches when deleting an account", async () => {
    login("Alice");
    await mount();
    mock.values.set(accountStorageKeys("Bob").state, "Bob training");
    mock.values.set("fb-arena-baseline:Alice:running:open", "Alice baseline");
    mock.values.set(
      "fb-arena-baseline:AliceExtra:running:open",
      "Other baseline",
    );
    await act(async () => {
      expect(await api.clearAccountData("Alice")).toBe(true);
    });
    expect(mock.values.has(accountStorageKeys("Alice").state)).toBe(false);
    expect(mock.values.get(accountStorageKeys("Bob").state)).toBe(
      "Bob training",
    );
    expect(mock.values.get("fb-arena-baseline:AliceExtra:running:open")).toBe(
      "Other baseline",
    );
    expect(mock.values.has("fb-arena-baseline:Alice:running:open")).toBe(false);
  });
});

it("keeps native debug previews local, blocks refresh and clears them across accounts", async () => {
  login("alice");
  await mount();
  const original = api.state;
  await act(async () => { api.triggerDebugEvent?.("sync-activity"); });
  expect(api.debugActive).toBe(true);
  expect(api.state).not.toBe(original);
  const calls = fetcher.mock.calls.length;
  await act(async () => { await api.refresh(); });
  expect(fetcher).toHaveBeenCalledTimes(calls);
  await act(async () => { api.resetDebugState?.(); });
  expect(api.state).toBe(original);
  await act(async () => { api.triggerDebugEvent?.("overtake"); });
  await switchTo("bob");
  expect(api.debugActive).toBe(false);
  const bob = api.state;
  await act(async () => { api.resetDebugState?.(); });
  expect(api.state).toBe(bob);
  expect(api.state?.name).toBe("bob");
});

it("does not let an in-flight refresh replace a native debug preview", async () => {
  login("alice");
  await mount();
  let resolve!: (response: Response) => void;
  fetcher.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }));
  let refreshing!: Promise<boolean>;
  await act(async () => { refreshing = api.refresh(); await flush(); });
  await act(async () => { api.triggerDebugEvent?.("sync-activity"); });
  const preview = api.state;
  await act(async () => {
    resolve(Response.json({ state: accountState("Remote"), updatedAt: "late" }));
    expect(await refreshing).toBe(false);
  });
  expect(api.state).toBe(preview);
  expect(api.debugActive).toBe(true);
});

it("runs debug sync through review, actual application, full-screen combo and acknowledgement", async () => {
  login("alice"); await mount();
  const original = api.state;
  const stored = mock.values.get(accountStorageKeys("alice").state);
  await act(async () => { api.triggerDebugEvent?.("sync-combo"); await flush(); });
  let screen = renderer.root.findByType("SyncReview" as never);
  expect(screen.props.receipt.activities).toHaveLength(2);
  expect(screen.props.moment).toBeNull();
  expect(screen.props.debug).toBe(true);
  const ids = screen.props.receipt.activities.map((a: { id: string }) => a.id);
  await act(async () => { screen.props.onComplete(ids); await flush(); });
  screen = renderer.root.findByType("SyncReview" as never);
  expect(screen.props.receipt).toBeNull();
  expect(screen.props.moment.plan.overtakenIds.length).toBeGreaterThanOrEqual(2);
  expect(api.state?.activities.filter(a => ids.includes(a.id))).toHaveLength(2);
  await act(async () => { screen.props.onAcknowledge(); });
  expect(renderer.root.findAllByType("SyncReview" as never)).toHaveLength(0);
  expect(mock.values.get(accountStorageKeys("alice").state)).toBe(stored);
  await act(async () => { api.resetDebugState?.(); });
  expect(api.state).toBe(original);
});

it("holds remote synced activity for review while preserving the server revision", async () => {
  login("alice"); await mount();
  const activity = { id: "remote-sync", sport: "running" as const, source: "strava" as const, startedAt: new Date().toISOString(), distanceM: 5000, movingSec: 1800, avgHr: null, verified: true, provenance: "recorded" as const, disposition: "counted" as const };
  fetcher.mockResolvedValueOnce(Response.json({ state: { ...api.state, activities: [...api.state!.activities, activity] }, updatedAt: "remote-revision" }));
  await act(async () => { await api.refresh(); await flush(); });
  expect(api.state!.activities.some(a => a.id === activity.id)).toBe(false);
  const screen = renderer.root.findByType("SyncReview" as never);
  expect(screen.props.receipt.activities[0].id).toBe(activity.id);
  await act(async () => { screen.props.onComplete([activity.id]); });
  expect(api.state!.activities.some(a => a.id === activity.id)).toBe(true);
  expect(mock.values.get(`${accountStorageKeys("alice").state}:revision`)).toBe("remote-revision");
});

it("does not manufacture a dirty draft or save request for an unchanged preference", async () => {
  login("Alice");
  await mount();
  await act(async () => { api.dispatch({ type: "set-city", city: api.state!.city }); await flush(); });
  await save();
  expect(mock.values.get(accountStorageKeys("Alice").dirty)).toBeUndefined();
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(0);
});

it("retries a persisted draft after sign-in without claiming a save has already failed", async () => {
  const keys = accountStorageKeys("Alice");
  mock.values.set(keys.state, JSON.stringify({ ...accountState("Alice"), city: "Draft city" }));
  mock.values.set(keys.dirty, "1");
  mock.values.set(`${keys.state}:revision`, "revision-1");
  login("Alice");
  fetcher.mockImplementation(async (_url: string, init: RequestInit) => init.method === "PUT"
    ? Response.json({ updatedAt: "revision-2" })
    : Response.json({ state: accountState("Alice"), updatedAt: "revision-1" }));
  await mount();
  expect(api.saveError).toBeNull();
  expect(api.state?.city).toBe("Draft city");
  await save();
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(1);
  expect(mock.values.has(keys.dirty)).toBe(false);
  expect(api.saveError).toBeNull();
});

it("ignores a failed in-flight save after signing out and back into the same account", async () => {
  login("Alice");
  await mount();
  let complete!: (response: Response) => void;
  fetcher.mockImplementationOnce(() => new Promise<Response>(resolve => { complete = resolve; }));
  await act(async () => { api.dispatch({ type: "set-city", city: "Draft" }); await flush(); });
  await save();
  await switchTo(null);
  await switchTo("Alice");
  await act(async () => { complete(Response.json({ error: "account_changed_reload" }, { status: 409 })); await flush(); });
  expect(api.saveError).toBeNull();
  expect(renderer.root.findAllByProps({ accessibilityRole: "alert" })).toHaveLength(0);
});

it("preserves restored draft units through refresh and automatic retry", async () => {
  login("Alice");
  const keys = accountStorageKeys("Alice");
  mock.values.set(keys.state, JSON.stringify({ ...accountState("Alice"), units: "metric" }));
  mock.values.set(keys.dirty, "1");
  mock.values.set(`${keys.state}:revision`, "revision-1");
  fetcher.mockImplementation(async (_url: string, init: RequestInit) => init.method === "PUT"
    ? Response.json({ updatedAt: "revision-2" })
    : Response.json({ state: { ...accountState("Alice"), units: "us" }, updatedAt: "revision-1" }));
  await mount();
  expect(api.state?.units).toBe("metric");
  await act(async () => { await api.refresh(); });
  expect(api.state?.units).toBe("metric");
  await save();
  const writes = fetcher.mock.calls.filter(([, init]) => init?.method === "PUT");
  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0]![1]!.body as string).state.units).toBe("metric");
  expect(mock.values.has(keys.dirty)).toBe(false);
  expect(api.saveError).toBeNull();
});

it("removes an orphan dirty flag before caching the loaded account", async () => {
  login("Alice");
  const keys = accountStorageKeys("Alice");
  mock.values.set(keys.dirty, "1");
  mock.values.set(`${keys.state}:revision`, "old-revision");
  await mount();
  await save();
  expect(mock.values.has(keys.dirty)).toBe(false);
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(0);
  await switchTo(null);
  await switchTo("Alice");
  await save();
  expect(api.saveError).toBeNull();
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(0);
});


it.each([true, false])("detects Garmin imports at startup only with a prior account baseline (cache=%s)", async (hasCache) => {
  login("alice");
  const cached = accountState("alice");
  const activity = { id: "garmin-arrived-while-closed", sport: "running" as const, source: "garmin" as const, startedAt: "2026-10-21T12:00:00Z", distanceM: 5000, movingSec: 1800, avgHr: null, verified: true, provenance: "recorded" as const, disposition: "counted" as const };
  if (hasCache) mock.values.set(accountStorageKeys("alice").state, JSON.stringify(cached));
  fetcher.mockResolvedValueOnce(Response.json({ state: { ...cached, activities: [...cached.activities, activity] }, updatedAt: "garmin-revision" }));
  await mount();
  if (hasCache) {
    expect(api.state!.activities.some(a => a.id === activity.id)).toBe(false);
    const screen = renderer.root.findByType("SyncReview" as never);
    expect(screen.props.receipt.activities.map((a: { id: string }) => a.id)).toEqual([activity.id]);
    await act(async () => { screen.props.onComplete([activity.id]); await flush(); });
    expect(api.state!.activities.filter(a => a.id === activity.id)).toHaveLength(1);
    await act(async () => { await api.refresh(); await flush(); });
    expect(renderer.root.findAllByType("SyncReview" as never).some(screen => screen.props.receipt)).toBe(false);
  } else {
    expect(api.state!.activities.some(a => a.id === activity.id)).toBe(true);
    expect(renderer.root.findAllByType("SyncReview" as never)).toHaveLength(0);
  }
});

it("ignores transient inactive states and gates background return refreshes by freshness", async () => {
  login("alice");
  const cached = accountState("alice");
  mock.values.set(accountStorageKeys("alice").state, JSON.stringify(cached));
  await mount();
  const initialFetchCount = fetcher.mock.calls.length;

  // Transient inactive -> active does not trigger network fetch
  await act(async () => {
    mock.appStateListeners.forEach(listener => listener("inactive"));
    mock.appStateListeners.forEach(listener => listener("active"));
    await flush();
  });
  expect(fetcher.mock.calls.length).toBe(initialFetchCount);

  // Background -> active within fresh TTL (still fresh) does not trigger network fetch
  await act(async () => {
    mock.appStateListeners.forEach(listener => listener("background"));
    mock.appStateListeners.forEach(listener => listener("active"));
    await flush();
  });
  expect(fetcher.mock.calls.length).toBe(initialFetchCount);
});

it("shows retry progress, sends the current draft once, and retains it until the save succeeds", async () => {
  login("Alice"); await mount();
  fetcher.mockResolvedValueOnce(Response.json({ error: "competition_inputs_changed" }, { status: 409 }));
  await act(async () => api.dispatch({ type: "set-city", city: "Retained draft" }));
  await save();
  expect(api.saveError).toContain("More activities arrived");
  expect(mock.values.get(accountStorageKeys("Alice").dirty)).toBe("1");
  let resolve!: (response: Response) => void;
  fetcher.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }));
  await act(async () => { api.retrySave(); await flush(); });
  expect(api.saving).toBe(true);
  const calls = fetcher.mock.calls.length;
  await act(async () => { api.retrySave(); await flush(); });
  expect(fetcher).toHaveBeenCalledTimes(calls);
  expect(api.state?.city).toBe("Retained draft");
  await act(async () => { resolve(Response.json({ ok: true, updatedAt: "saved-retry" })); await flush(); });
  expect(api.saving).toBe(false);
  expect(api.saveError).toBeNull();
  expect(mock.values.get(accountStorageKeys("Alice").dirty)).toBeUndefined();
});

it("resurfaces conflict recovery on another edit without attempting an unsafe save", async () => {
  login("Alice"); await mount();
  fetcher.mockImplementation(async (_url: string, init: RequestInit) => init.method === "PUT"
    ? Response.json({ error: "account_changed_reload" }, { status: 409 })
    : Response.json({ state: accountState("Alice"), updatedAt: "revision-1" }));
  await act(async () => api.dispatch({ type: "set-city", city: "First draft" }));
  await save();
  const original = renderer.root.findByType("AccountSaveToast" as never);
  await act(async () => api.dispatch({ type: "set-city", city: "Another draft" }));
  expect(renderer.root.findByType("AccountSaveToast" as never)).not.toBe(original);
  await save();
  expect(fetcher.mock.calls.filter(([, init]) => init.method === "PUT")).toHaveLength(1);
  expect(mock.values.get(accountStorageKeys("Alice").dirty)).toBe("1");
});
