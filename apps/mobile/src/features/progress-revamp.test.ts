import { createElement, useEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, reduceCompete, type Activity, type CompeteState } from "@fitness-battle/shared";

const mock = vi.hoisted(() => ({
  state: null as CompeteState | null,
  account: "one",
  push: vi.fn(),
  params: { view: undefined as string | undefined },
}));

vi.mock("react-native", () => ({
  useColorScheme: () => "light",
  AppState: { currentState: "active", addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
  Platform: { OS: "ios" },
  NativeModules: {},
  AccessibilityInfo: {
    isReduceMotionEnabled: vi.fn().mockResolvedValue(false),
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  PanResponder: { create: () => ({ panHandlers: {} }) },
  Easing: {
    out: vi.fn(),
    in: vi.fn(),
    inOut: vi.fn(),
    ease: vi.fn(),
    cubic: vi.fn(),
  },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  Modal: "Modal",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  Image: "Image",
  StyleSheet: { create: (value: unknown) => value },
  Animated: {
    View: "AnimatedView",
    createAnimatedComponent: (c: unknown) => c,
    Value: class {
      constructor(public value: number) {}
      setValue(v: number) {
        this.value = v;
      }
      interpolate() {
        return 0;
      }
    },
    timing: () => ({ start: (cb?: () => void) => cb?.(), stop: () => {} }),
    loop: () => ({ start: () => {}, stop: () => {} }),
  },
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock("react-native-svg", () => ({
  default: "Svg",
  G: "G",
  Path: "Path",
  Text: "SvgText",
  Circle: "Circle",
  Line: "Line",
  Rect: "Rect",
  Polyline: "Polyline",
  Defs: "Defs",
  LinearGradient: "LinearGradient",
  Stop: "Stop",
  ClipPath: "ClipPath",
}));

vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://example.test" } }));

vi.mock("expo-status-bar", () => ({ StatusBar: "StatusBar" }));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: mock.push }),
  useLocalSearchParams: () => mock.params,
  useGlobalSearchParams: () => mock.params,
  useFocusEffect: (cb: () => void | (() => void)) => {
    useEffect(() => {
      const cleanup = cb();
      return () => {
        if (typeof cleanup === "function") cleanup();
      };
    }, []);
  },
}));

vi.mock("../lib/compete-store", () => ({
  useCompeteStore: () => ({
    state: mock.state,
    accountKey: mock.account,
    canWrite: true,
    saveError: null,
  }),
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    user: { id: "test-user" },
    offlineMode: false,
    accessToken: "tok",
  }),
}));

vi.mock("../lib/score-track-lens", () => ({
  useScoreTrackLens: () => ["open", vi.fn()],
}));

vi.mock("../ui/use-reduced-motion", () => ({
  useReducedMotion: () => false,
}));

vi.mock("../ui/compete-time-series-chart", () => ({
  CompeteTimeSeriesChart: "CompeteTimeSeriesChart",
}));

vi.mock("./competition-replay", () => ({
  CompetitionReplayButton: "CompetitionReplayButton",
}));

vi.mock("../ui/activity-route", () => ({
  ActivityRoute: "ActivityRoute",
}));

vi.mock("../ui/award-shelf", () => ({
  AwardShelf: "AwardShelf",
}));

vi.mock("./vitals-lab-body-scan", () => ({
  VitalsLabBodyScan: "VitalsLabBodyScan",
}));

vi.mock("../ui/focus", () => ({
  useFocusStyles: () => ({ safe: {}, content: {}, chip: {}, chipActive: {}, row: {} }),
  FocusSegments: ({ options, value, onChange }: any) =>
    createElement(
      "View",
      null,
      options?.map((o: any) =>
        createElement(
          "Pressable",
          {
            key: o.value,
            accessibilityLabel: o.label,
            onPress: () => onChange(o.value),
          },
          createElement("Text", null, o.label),
        ),
      ),
    ),
  FocusSheet: ({ children, open }: any) => (open ? createElement("View", null, children) : null),
  FocusButton: "FocusButton",
}));

import { ProgressScreen } from "./progress-screen";
import { PerformanceSpace } from "./performance-space";
import { JourneySpace } from "./journey-space";
import { HealthLabSpace } from "./health-lab-space";

let renderer: ReactTestRenderer;
const now = new Date("2026-11-10T12:00:00Z");

const recordedActivity = (
  id: string,
  movingSec: number,
  sport: Activity["sport"] = "running",
  distanceM = 5000,
): Activity => ({
  id,
  movingSec,
  sport,
  startedAt: now.toISOString(),
  distanceM,
  avgHr: 145,
  verified: true,
  source: "strava",
  provenance: "recorded",
  disposition: "counted",
});

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  vi.setSystemTime(now);
  mock.account = "one";
  mock.params = { view: undefined };

  const base = freshState(now);
  const opted = reduceCompete(base, {
    type: "opt-in",
    sport: "running",
    now: "2026-11-10T09:00:00Z",
  });

  mock.state = {
    ...opted,
    activities: [
      recordedActivity("run-1", 1860, "running", 5000), // 31:00 5k PR
      recordedActivity("run-2", 3600, "running", 10000),
    ],
    recordAttempts: [
      {
        activityId: "run-0",
        sport: "running",
        distanceId: "5k",
        startedAt: "2026-08-03T10:00:00Z",
        seconds: 2060, // 34:20 baseline PR
        source: "strava",
        verified: true,
      },
      {
        activityId: "run-1",
        sport: "running",
        distanceId: "5k",
        startedAt: now.toISOString(),
        seconds: 1860, // 31:00 current PR
        source: "strava",
        verified: true,
      },
    ],
    periodResults: [
      {
        id: "period-1",
        sport: "running",
        periodStart: "2026-11-02T05:00:00Z",
        periodEnd: "2026-11-09T05:00:00Z",
        place: 1,
        fieldSize: 7,
        track: "open",
        effort: 12,
        distanceM: 15000,
        movingSec: 5460,
        frozen: false,
        eloBefore: 1000,
        eloAfter: 1024,
        settledAt: "2026-11-09T05:00:00Z",
      },
    ],
  };
});

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Revamped Progress Screen & Spaces", () => {
  it("renders the 3 top-level spaces and defaults to Performance", async () => {
    await act(async () => {
      renderer = create(createElement(ProgressScreen));
    });

    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain("Performance");
    expect(json).toContain("Journey");
    expect(json).toContain("Health Lab");

    // Performance space is mounted and active
    expect(renderer.root.findByType(PerformanceSpace)).toBeTruthy();
  });

  it("handles deep-linking to journey and health_lab spaces", async () => {
    mock.params = { view: "journey" };
    await act(async () => {
      renderer = create(createElement(ProgressScreen));
    });

    expect(renderer.root.findByType(JourneySpace)).toBeTruthy();
    expect(() => renderer.root.findByType(PerformanceSpace)).toThrow();
    expect(() => renderer.root.findByType(HealthLabSpace)).toThrow();

    mock.params = { view: "health_lab" };
    await act(async () => {
      renderer.update(createElement(ProgressScreen));
    });

    expect(renderer.root.findByType(HealthLabSpace)).toBeTruthy();
    expect(() => renderer.root.findByType(JourneySpace)).toThrow();
  });

  it("opens Journey on the requested horizon", async () => {
    await act(async () => {
      renderer = create(createElement(JourneySpace, { state: mock.state!, initialHorizon: "year" }));
    });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain("2026");
    expect(json).not.toContain("Workouts");
  });

  it("PerformanceSpace displays Effort Score, Training Volume, and PR Lineage sequentially", async () => {
    await act(async () => {
      renderer = create(createElement(PerformanceSpace, { state: mock.state! }));
    });

    const json = JSON.stringify(renderer.toJSON());
    // Both charts rendered simultaneously
    expect(json).toContain("Effort Score");
    expect(json).toContain("GPS");
    expect(json).toContain("Training Volume");

    // PR Progression rendered in Performance
    expect(json).toContain("PR Progression");
    expect(json).toContain("31:00"); // current PR
    expect(json).toContain("34:20"); // initial PR
    expect(json).not.toContain("+8%");
    expect(json).not.toContain("vs. prior 30d");
  });

  it("JourneySpace renders calendar strip and recent activities", async () => {
    await act(async () => {
      renderer = create(createElement(JourneySpace, { state: mock.state! }));
    });

    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain("Week");
    expect(json).toContain("Month");
    expect(json).toContain("Year");
    expect(json).toContain("Recent Activities");
    expect(json).not.toContain("Past Competition Results");
  });

  it("labels the selected Journey day in Eastern without shifting through UTC", async () => {
    await act(async () => {
      renderer = create(createElement(JourneySpace, { state: mock.state! }));
    });
    const tuesday = renderer.root.findAllByType("Pressable" as never).find((node) =>
      String(node.props.accessibilityLabel ?? "").startsWith("Tue 10"),
    );
    expect(tuesday).toBeTruthy();
    await act(async () => {
      tuesday!.props.onPress();
    });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain("Activities on Tue, Nov 10");
    expect(json).not.toContain("Activities on Mon, Nov 9");
  });

  it("HealthLabSpace shows recorded measurements and an unavailable state without generated readings", async () => {
    await act(async () => {
      renderer = create(createElement(HealthLabSpace, { state: mock.state! }));
    });

    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain("Overnight HRV");
    expect(json).toMatch(/sleep/i);
    expect(json).toContain("resting heart rate");
    expect(json).toContain("No recorded observations");
    expect(json).toContain("Advanced Analytics");
  });
});
