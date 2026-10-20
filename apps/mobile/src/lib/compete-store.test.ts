import { freshState } from "@fitness-battle/shared";
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
    demoMode: false,
  },
  values: new Map<string, string>(),
  router: { navigate: vi.fn() },
}));
vi.mock("./auth", () => ({ useAuth: () => mock.auth }));
vi.mock("./env", () => ({
  mobileEnv: { useDemoData: false, apiUrl: "https://test.local" },
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
vi.mock("expo-router", () => ({ useRouter: () => mock.router }));
vi.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: () => ({ remove() {} }),
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
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.values.clear();
  mock.auth.user = null;
  mock.auth.loading = false;
  seenNames.length = 0;
  fetcher = vi
    .fn()
    .mockImplementation(async (_url: string, init: RequestInit) =>
      init.method === "PUT"
        ? Response.json({ ok: true })
        : Response.json({ state: accountState(mock.auth.user?.id ?? "guest") }),
    );
  vi.stubGlobal("fetch", fetcher);
});
afterEach(async () => {
  if (renderer)
    await act(async () => {
      renderer.unmount();
    });
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
      api.dispatch({ type: "set-city", city: "Toronto" });
    });
    await save();
    expect(api.saveError).toBeNull();
    expect(mock.values.get(accountStorageKeys("Alice").dirty)).toBe("1");
    fetcher.mockResolvedValue(Response.json({ ok: true }));
    await act(async () => {
      api.retrySave();
    });
    await save();
    expect(api.saveError).toBeNull();
    expect(mock.values.get(accountStorageKeys("Alice").dirty)).toBeUndefined();
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
