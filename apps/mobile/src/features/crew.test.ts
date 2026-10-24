vi.mock("../ui/app-icon", () => ({ AppIcon: "AppIcon" }));
vi.mock("../ui/club-art",()=>({alpineTrail:1}));
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  freshState,
  dayKey,
  weeklyPeriodBounds,
  APP_TIMEZONE,
} from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({
  live: false,
  navigate: vi.fn(),
  push: vi.fn(),
  state: null as unknown,
  data: null as unknown,
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => {}) },
}));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  ClipPath: "ClipPath",
  Defs: "Defs",
  G: "G",
  Path: "Path",
  Pattern: "Pattern",
  Rect: "Rect",
  Text: "SvgText",
}));
vi.mock("react-native", () => ({
  Pressable: "Pressable",
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
  ImageBackground: "ImageBackground",
  StyleSheet: {absoluteFill:{}, create: (value: unknown) => value},
  useWindowDimensions: () => ({width:390,height:844,fontScale:1}),
  ScrollView: "ScrollView",
  Share: { share: vi.fn() },
}));
vi.mock("expo-router", () => ({
  useFocusEffect() {},
  useGlobalSearchParams: () => ({}),
  useRouter: () => ({ navigate: mock.navigate, push: mock.push }),
}));
vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    user: { id: "audit" },
    offlineMode: !mock.live,
    accessToken: mock.live ? "test-token" : null,
  }),
}));
vi.mock("../lib/compete-store", () => ({
  useCompeteStore: () => ({ state: mock.state, refresh: vi.fn() }),
}));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://test.local" } }));
vi.mock("../lib/fetch-with-timeout", () => ({
  fetchWithTimeout: async (url: string, options: { body?: string }) => {
    if (url.includes("/crews/sessions"))
      return { ok: true, json: async () => ({ sessions: [] }) };
    if (url.endsWith("/rest") && mock.data && options.body) {
      const body = JSON.parse(options.body);
      (
        mock.data as { members: { rest_week: string | null }[] }
      ).members[0]!.rest_week = body.rest
        ? dayKey(weeklyPeriodBounds(new Date()).startsAt, APP_TIMEZONE)
        : null;
    }
    return {
      ok: true,
      json: async () =>
        mock.data ?? { crews: [], members: [], entries: [], notices: [] },
    };
  },
}));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
vi.mock("../ui/focus", () => ({
  FocusButton: "FocusButton",
  FocusSheet: "Sheet",
  f: {},
}));
vi.mock("./crew-relay",()=>({CrewRelay:"CrewRelay"}));
import { CrewHub } from "./crew";
let renderer: ReactTestRenderer;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  mock.data = null;
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

it("keeps crew settings open while setting and clearing the current rest week", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.live = true;
  mock.state = freshState();
  mock.data = {
    crews: [
      {
        crews: {
          id: "crew",
          name: "Runners",
          sport: "running",
          format: "volume",
          journey_km: 0,
          target_sessions: 4,
          invite_code: "ABC",
        },
      },
    ],
    members: [
      {
        crew_id: "crew",
        user_id: "audit",
        display_name: "You",
        status: "active",
        rest_week: null,
      },
    ],
    entries: [],
    notices: [],
  };
  await act(async () => {
    renderer = create(createElement(CrewHub));
  });
  await act(async () => renderer.root.findByProps({ accessibilityLabel: "View crew members" }).props.onPress());
  expect(mock.push).toHaveBeenCalledWith({ pathname: "/crew-members", params: { crewId: "crew" } });
  await act(async () =>
    renderer.root
      .findByProps({ accessibilityLabel: "Crew settings" })
      .props.onPress(),
  );
  const button = (label: string) =>
    renderer.root
      .findAllByType("FocusButton" as never)
      .find((node) => node.props.label === label)!;
  await act(async () => button("Mark my rest week").props.onPress());
  expect(button("Clear rest week")).toBeTruthy();
  expect(
    renderer.root
      .findAllByType("Sheet" as never)
      .some(
        (node) =>
          node.props.open && node.props.title === "Your crew, your rhythm.",
      ),
  ).toBe(true);
  await act(async () => button("Clear rest week").props.onPress());
  expect(button("Mark my rest week")).toBeTruthy();
});
