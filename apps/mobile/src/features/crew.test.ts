import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({
  live: false,
  navigate: vi.fn(),
  state: null as unknown,
}));
vi.mock("react-native", () => ({
  Pressable: "Pressable",
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
  Share: { share: vi.fn() },
}));
vi.mock("expo-router", () => ({
  useFocusEffect() {},
  useGlobalSearchParams: () => ({}),
  useRouter: () => ({ navigate: mock.navigate }),
}));
vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    user: { id: "audit" },
    demoMode: !mock.live,
    accessToken: mock.live ? "test-token" : null,
  }),
}));
vi.mock("../lib/compete-store", () => ({
  useCompeteStore: () => ({ state: mock.state, refresh: vi.fn() }),
}));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://test.local" } }));
vi.mock("../lib/fetch-with-timeout", () => ({
  fetchWithTimeout: async () => ({
    ok: true,
    json: async () => ({ crews: [], members: [], entries: [], notices: [] }),
  }),
}));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
vi.mock("../ui/focus", () => ({
  FocusButton: "FocusButton",
  FocusSheet: "Sheet",
  f: {},
}));
import { CrewHub } from "./crew";
let renderer: ReactTestRenderer;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});
describe("crew empty states", () => {
  it.each([false, true])(
    "shows an honest entry point when live=%s and there are no crews",
    async (live) => {
      vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
      mock.live = live;
      mock.state = freshState();
      await act(async () => {
        renderer = create(createElement(CrewHub));
      });
      const content = JSON.stringify(renderer.toJSON());
      expect(content.match(/Make room for your people/g)).toHaveLength(1);
      expect(content).not.toContain("Our shared week");
      expect(content).not.toContain("Solo circle");
      const buttons = renderer.root.findAllByType("FocusButton" as never);
      expect(
        buttons.some(
          (button) => button.props.label === "Share my counted sessions",
        ),
      ).toBe(false);
      const entry = buttons.find(
        (button) =>
          button.props.label ===
          (live ? "Create or join a crew" : "View account"),
      )!;
      await act(async () => entry.props.onPress());
      if (live)
        expect(renderer.root.findByType("Sheet" as never).props.open).toBe(
          true,
        );
      else expect(mock.navigate).toHaveBeenCalledWith("/athlete");
    },
  );
});
