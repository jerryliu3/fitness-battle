import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));
vi.mock("expo-router", () => ({
  useRouter: () => ({
    canGoBack: () => true,
    back: vi.fn(),
    replace: vi.fn(),
  }),
}));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Circle: "Circle",
  G: "G",
  Line: "Line",
  Path: "Path",
  Polygon: "Polygon",
  Polyline: "Polyline",
  Rect: "Rect",
  Text: "SvgText",
}));
vi.mock("../ui/chart-scrubber", () => ({
  ChartScrubber: ({ children }: { children: unknown }) => children,
}));
vi.mock("../ui/screen-header", () => ({
  ScreenHeader: "ScreenHeader",
}));
vi.mock("../ui/focus", () => ({
  f: {
    safe: {},
    content: {},
    card: {},
    section: {},
    kicker: {},
    h2: {},
    rowTitle: {},
    copy: {},
    small: {},
    chip: {},
    chipActive: {},
  },
}));

import HealthAnalyticsLab from "./health-analytics-lab";

let renderer: ReactTestRenderer;

const allText = () =>
  renderer.root
    .findAllByType("Text" as never)
    .map((n) => n.children.filter((c) => typeof c === "string").join(""))
    .join(" ");

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});

describe("HealthAnalyticsLab mobile native prototype", () => {
  it("renders all 3 concepts for Athlete Market by default and switches between 1-Point and Trend horizons", async () => {
    await act(async () => {
      renderer = create(createElement(HealthAnalyticsLab));
    });
    expect(allText()).toContain("Athlete Equity & All-Time Returns");
    expect(allText()).toContain("Concept A · Net Athlete Equity & Moving Average Ribbon");
    expect(allText()).toContain("Concept B · Weekly OHLC Candlesticks & Volume");
    expect(allText()).toContain("Concept C · Asset Allocation & Dividend Ledger");

    const onePointBtn = renderer.root
      .findAllByType("Pressable" as never)
      .find((n) => n.props.accessibilityLabel === "Horizon 1-Point")!;
    await act(async () => onePointBtn.props.onPress());
    expect(allText()).toContain("1-Point View");
    expect(allText()).toContain("Live Weekly Candle");
  });

  it("switches across all 6 data domains and 3 mobile native UI layout architectures", async () => {
    await act(async () => {
      renderer = create(createElement(HealthAnalyticsLab, { embedded: true }));
    });

    const pressByLabel = async (label: string) => {
      const btn = renderer.root
        .findAllByType("Pressable" as never)
        .find((n) => n.props.accessibilityLabel === label)!;
      await act(async () => btn.props.onPress());
    };

    await pressByLabel("Category Vitals Lab");
    expect(allText()).toContain("Biometric Vitals & Baseline Corridors");
    expect(allText()).toContain("Heart Rate Variability");

    await pressByLabel("Category Sleep & Recovery");
    expect(allText()).toContain("Sleep Stages, Debt & Circadian Rhythm");

    await pressByLabel("Category Training Load");
    expect(allText()).toContain("Cumulative Pace & Acute:Chronic Workload");

    await pressByLabel("Category Cardio & Pace");
    expect(allText()).toContain("Aerobic Efficiency, HR Zones & PR Curve");

    await pressByLabel("Category Multi-Metric");
    expect(allText()).toContain("Combined vs. Isolated Data Interactions");

    await pressByLabel("Layout Bento Matrix");
    expect(allText()).toContain("Bento Matrix · Tap any tile to inspect");

    await pressByLabel("Layout Telemetry Ribbon");
    expect(allText()).toContain("$ATHL");
  });
});
