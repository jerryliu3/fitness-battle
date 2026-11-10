import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  storage: new Map<string, string>(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mocks.storage.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mocks.storage.set(key, value);
      return Promise.resolve();
    }),
  },
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: mocks.push, navigate: mocks.push }),
}));

vi.mock("../lib/haptics", () => ({
  playCue: vi.fn(),
}));

vi.mock("../lib/athlete-blocks", () => ({
  useAthleteBlocks: () => ({ blocks: [], ready: true, setBlocked: vi.fn() }),
}));

vi.mock("../ui/use-reduced-motion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("react-native", () => ({
  useColorScheme: () => "light",
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  useWindowDimensions: () => ({ fontScale: 1, width: 390, height: 844 }),
  StyleSheet: {
    absoluteFill: {},
    create: (value: unknown) => value,
  },
  Easing: {
    cubic: "cubic",
    out: (v: unknown) => v,
  },
  PanResponder: {
    create: (config: unknown) => ({ panHandlers: config }),
  },
  Animated: {
    View: "AnimatedView",
    Value: class {
      value: number;
      constructor(v: number) {
        this.value = v;
      }
      setValue(v: number) {
        this.value = v;
      }
      interpolate() {
        return "0deg";
      }
    },
    timing: () => ({ start: (cb?: () => void) => cb?.() }),
    spring: () => ({ start: (cb?: () => void) => cb?.() }),
  },
}));

vi.mock("react-native-svg", () => ({
  default: "Svg",
  Circle: "Circle",
  G: "G",
  Line: "Line",
  Path: "Path",
  Polyline: "Polyline",
  Text: "SvgText",
}));

import { HomeDeck } from "./home-deck";

let renderer: ReactTestRenderer;

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  mocks.push.mockReset();
  mocks.storage.clear();
  vi.unstubAllGlobals();
});

describe("Mobile HomeDeck", () => {
  it("cycles through the 4 stacked cards, dismisses cards, and restores them when all caught up", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const now = new Date("2026-10-22T14:00:00.000Z");
    const state = freshState(now);
    state.demoNow = now.toISOString();
    state.units = "metric";
    state.activities = [
      {
        id: "mon-run",
        sport: "running",
        startedAt: "2026-10-19T12:00:00.000Z",
        distanceM: 5200,
        movingSec: 1680,
        avgHr: 142,
        verified: true,
        source: "strava",
        provenance: "recorded",
        disposition: "counted",
      },
    ];
    const onOpenTodaySession = vi.fn();
    const onOpenActivities = vi.fn();

    await act(async () => {
      renderer = create(
        createElement(HomeDeck, {
          accountKey: "test-mobile-user",
          state,
          onOpenTodaySession,
          onOpenActivities,
        }),
      );
    });

    const jsonText = () => JSON.stringify(renderer.toJSON());
    expect(jsonText()).toContain("RECOVERY-FRIENDLY");
    expect(jsonText()).not.toContain("4 cards");

    expect(jsonText()).toContain("Updates");
    expect(jsonText()).not.toContain("Show card");
    for (let i = 0; i < 2; i++) {
      const dismiss = renderer.root.find(n => (n.type as unknown) === "Pressable" && typeof n.props.accessibilityLabel === "string" && n.props.accessibilityLabel.startsWith("Dismiss "));
      await act(async () => dismiss.props.onPress());
    }
    expect(jsonText()).toContain("Good things are in motion.");

    // Tap Monday's logged stop on the route card
    const monChip = renderer.root.find(
      (n) =>
        (n.type as unknown) === "Pressable" &&
        typeof n.props.accessibilityLabel === "string" &&
        n.props.accessibilityLabel.includes("5.2 km logged"),
    );
    await act(async () => {
      monChip.props.onPress();
    });
    expect(onOpenActivities).toHaveBeenCalledTimes(1);

    // Dismiss 1 card: verify Reset is NOT visible yet (only appears when all caught up)
    const dismissFirst = renderer.root.find(
      (n) =>
        (n.type as unknown) === "Pressable" &&
        typeof n.props.accessibilityLabel === "string" &&
        n.props.accessibilityLabel.startsWith("Dismiss "),
    );
    await act(async () => {
      dismissFirst.props.onPress();
    });
    expect(jsonText()).not.toContain("Reset");
    expect(jsonText()).not.toContain("3 cards");

    // Dismiss remaining card until all caught up
    for (let i = 0; i < 1; i++) {
      const dismissBtn = renderer.root.find(
        (n) =>
          (n.type as unknown) === "Pressable" &&
          typeof n.props.accessibilityLabel === "string" &&
          n.props.accessibilityLabel.startsWith("Dismiss "),
      );
      await act(async () => {
        dismissBtn.props.onPress();
      });
    }

    // Now all caught up: compact message and Reset button appear
    expect(jsonText()).toContain("You’re all caught up.");
    expect(jsonText()).toContain("Reset");

    // Restore cards via Reset button
    const resetBtn = renderer.root.find(
      (n) =>
        (n.type as unknown) === "Pressable" &&
        n.props.accessibilityLabel === "Reset dismissed cards",
    );
    await act(async () => {
      resetBtn.props.onPress();
    });
    expect(jsonText()).not.toContain("You’re all caught up.");
    expect(jsonText()).toContain("RECOVERY-FRIENDLY");
  });
});
