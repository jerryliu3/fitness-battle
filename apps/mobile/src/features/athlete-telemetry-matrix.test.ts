import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
vi.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ domain: "market" }),
}));

vi.mock("react-native", () => ({
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  StyleSheet: { create: (styles: unknown) => styles },
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

vi.mock("../ui/focus", () => ({
  f: {
    safe: {},
    content: {},
    card: {},
    section: {},
    sectionTitle: {},
    kicker: {},
    h2: {},
    rowTitle: {},
    copy: {},
    small: {},
  },
  fonts: {
    bodyBold: "System",
  },
}));

vi.mock("../theme", () => ({
  fonts: {
    bodyBold: "System",
    body: "System",
  },
}));

import { AthleteTelemetryMatrix } from "./athlete-telemetry-matrix";
import { AthleteTelemetryDetailView } from "./athlete-telemetry-details";

let renderer: ReactTestRenderer;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mockPush.mockClear();
});

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});

describe("AthleteTelemetryMatrix mobile features", () => {
  it("renders 6 Bento tiles in overview without kickers or copy, and navigates to separate pages", async () => {
    await act(async () => {
      renderer = create(createElement(AthleteTelemetryMatrix));
    });

    const allText = () =>
      renderer.root
        .findAllByType("Text" as never)
        .map((n) => n.children.filter((c: unknown) => typeof c === "string").join(""))
        .join(" ");

    const text = allText();
    expect(text).toContain("Athlete Telemetry Matrix");
    expect(text).not.toContain("Biometrics & Telemetry");
    expect(text).not.toContain("Autonomic health, training load, and cardiovascular efficiency");
    expect(text).not.toContain("Inspect lab →");

    expect(text).toContain("Athlete Equity");
    expect(text).toContain("Overnight HRV");
    expect(text).toContain("Sleep & Debt");
    expect(text).toContain("Workload Ratio");
    expect(text).toContain("Aerobic Efficiency");
    expect(text).toContain("Readiness Brief");

    const tiles = renderer.root.findAllByType("Pressable" as never);
    expect(tiles.length).toBe(6);

    await act(async () => {
      tiles[0]!.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/telemetry",
      params: { domain: "market" },
    });
  });

  it("renders dedicated detail pages with interactive chart inspection and no bloated date tables", async () => {
    // 1. Market detail page
    await act(async () => {
      renderer = create(createElement(AthleteTelemetryDetailView, { domain: "market" }));
    });

    let allText = () =>
      renderer.root
        .findAllByType("Text" as never)
        .map((n) => n.children.filter((c: unknown) => typeof c === "string").join(""))
        .join(" ");

    expect(allText()).toContain("Equity Curve");
    expect(allText()).toContain("Current NAV");
    expect(allText()).toContain("Asset Holdings by Sport");
    expect(allText()).toContain("Running");
    expect(allText()).not.toContain("Weekly Performance Ledger");

    // 2. Vitals detail page: interactive corridor inspection without 14-row tables
    await act(async () => {
      renderer = create(createElement(AthleteTelemetryDetailView, { domain: "vitals" }));
    });
    expect(allText()).toContain("Autonomic Baseline Corridors");
    expect(allText()).toContain("Heart Rate Variability");
    expect(allText()).toContain("Corridor:");
    expect(allText()).not.toContain("Daily Readings");

    // 3. Sleep detail page: interactive night inspection with continuous stage ribbon
    await act(async () => {
      renderer = create(createElement(AthleteTelemetryDetailView, { domain: "sleep" }));
    });
    expect(allText()).toContain("Sleep & Recovery Architecture");
    expect(allText()).toContain("Daily Sleep Stages");
    expect(allText()).toContain("Avg Sleep Score");
    expect(allText()).toContain("Cumulative Debt");

    // 4. Load detail page: interactive ACWR curve
    await act(async () => {
      renderer = create(createElement(AthleteTelemetryDetailView, { domain: "load" }));
    });
    expect(allText()).toContain("Workload Ratio (ACWR)");
    expect(allText()).toContain("Period Volume Burn-Up");
    expect(allText()).not.toContain("Weekly Workload Buckets");

    // 5. Performance detail page: interactive EF and zones
    await act(async () => {
      renderer = create(createElement(AthleteTelemetryDetailView, { domain: "performance" }));
    });
    expect(allText()).toContain("Aerobic Efficiency (EF)");
    expect(allText()).toContain("Heart Rate Polarization");
    expect(allText()).toContain("PR Staircase & Critical Pace");
    expect(allText()).not.toContain("Matched Endurance Runs");

    // 6. Combined detail page: interactive strain vs recovery
    await act(async () => {
      renderer = create(createElement(AthleteTelemetryDetailView, { domain: "combined" }));
    });
    expect(allText()).toContain("Morning Readiness Brief");
    expect(allText()).toContain("Daily Training Strain vs Next-Day Recovery");
    expect(allText()).not.toContain("Daily Synthesis Log");
  });
});
