import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";

const mock = vi.hoisted(() => ({
  user: { id: "alice", mode: "live" } as { id: string; mode: string } | null,
  pick: vi.fn(),
  request: vi.fn(),
  dispatch: vi.fn(),
}));
vi.mock("react-native", () => ({
  Platform: { OS: "web" },
  Text: "Text",
  View: "View",
}));
vi.mock("expo-document-picker", () => ({ getDocumentAsync: mock.pick }));
vi.mock("../lib/api", () => ({ requestApi: mock.request }));
vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    user: mock.user,
    accessToken: mock.user ? `${mock.user.id}-token` : null,
    demoMode: false,
  }),
}));
vi.mock("../lib/compete-store", () => ({
  useCompeteStore: () => ({
    state: { ...freshState(), links: [{ provider: "strava", linked: true }] },
    dispatch: mock.dispatch,
  }),
}));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://test.local" } }));
vi.mock("../ui/focus", () => ({ FocusButton: "Button", f: {} }));
import { DataSyncActions } from "./data-sync-actions";

let renderer: ReactTestRenderer;
const file = {
  canceled: false,
  assets: [{ name: "run.gpx", uri: "blob:activity", size: 128 }],
};
const button = (label: string) =>
  renderer.root
    .findAllByType("Button" as never)
    .find((node) => node.props.label.startsWith(label))!;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.user = { id: "alice", mode: "live" };
  vi.clearAllMocks();
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});
describe("tracker action ownership", () => {
  it.each(["switch", "signout", "unmount", "switch back"])(
    "does not upload a file after %s while the picker is open",
    async (change) => {
      const picker = deferred<typeof file>();
      mock.pick.mockReturnValueOnce(picker.promise);
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      await act(async () => {
        renderer = create(createElement(DataSyncActions));
      });
      await act(async () => button("Import Garmin").props.onPress());
      await act(async () => {
        if (change === "unmount") renderer.unmount();
        else {
          mock.user = change === "signout" ? null : { id: "bob", mode: "live" };
          renderer.update(createElement(DataSyncActions));
        }
      });
      if (change === "switch back") {
        mock.user = { id: "alice", mode: "live" };
        await act(async () => renderer.update(createElement(DataSyncActions)));
      }
      await act(async () => picker.resolve(file));
      expect(fetch).not.toHaveBeenCalled();
      expect(mock.dispatch).not.toHaveBeenCalled();
    },
  );

  it("checks ownership again after reading the selected web file", async () => {
    const blob = deferred<Blob>();
    mock.pick.mockResolvedValueOnce(file);
    const fetch = vi.fn().mockResolvedValue({ blob: () => blob.promise });
    vi.stubGlobal("fetch", fetch);
    await act(async () => {
      renderer = create(createElement(DataSyncActions));
    });
    await act(async () => button("Import Garmin").props.onPress());
    expect(fetch).toHaveBeenCalledWith(file.assets[0].uri);
    mock.user = { id: "bob", mode: "live" };
    await act(async () => renderer.update(createElement(DataSyncActions)));
    await act(async () => blob.resolve(new Blob(["activity"])));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mock.dispatch).not.toHaveBeenCalled();
  });

  it("imports into the initiating account when it is still active", async () => {
    mock.pick.mockResolvedValueOnce(file);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ blob: async () => new Blob(["activity"]) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activities: [] }),
      });
    vi.stubGlobal("fetch", fetch);
    await act(async () => {
      renderer = create(createElement(DataSyncActions));
    });
    await act(async () => button("Import Garmin").props.onPress());
    expect(fetch).toHaveBeenLastCalledWith(
      "https://test.local/api/fitness/import",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer alice-token" },
      }),
    );
    expect(mock.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "apply-sync",
        provider: "garmin",
        accountId: "alice",
      }),
    );
  });

  it("keeps useful file validation feedback", async () => {
    mock.pick.mockResolvedValueOnce({
      ...file,
      assets: [{ ...file.assets[0], name: "run.pdf" }],
    });
    await act(async () => {
      renderer = create(createElement(DataSyncActions));
    });
    await act(async () => button("Import Garmin").props.onPress());
    expect(JSON.stringify(renderer.toJSON())).toContain(
      "Choose a .fit, .gpx, .tcx, or .zip file.",
    );
  });

  it.each(["Sync", "Disconnect"])(
    "ignores a late %s response after switching accounts",
    async (label) => {
      const response = deferred<object>();
      mock.request.mockReturnValueOnce(response.promise);
      await act(async () => {
        renderer = create(
          createElement(DataSyncActions, { provider: "strava" }),
        );
      });
      await act(async () => button(label).props.onPress());
      mock.user = { id: "bob", mode: "live" };
      await act(async () =>
        renderer.update(createElement(DataSyncActions, { provider: "strava" })),
      );
      await act(async () => response.resolve({ activities: [] }));
      expect(mock.dispatch).not.toHaveBeenCalled();
    },
  );
});
