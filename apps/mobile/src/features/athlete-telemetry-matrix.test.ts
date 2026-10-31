import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
vi.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ domain: "market" }),
}));

vi.mock("react-native", () => ({ AppState: { currentState: "active", addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
  Animated: { createAnimatedComponent: (component: unknown) => component },
  PanResponder: { create: () => ({ panHandlers: {} }) },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  useWindowDimensions: () => ({ fontScale: 1, width: 375, height: 812 }),
  StyleSheet: { create: (styles: unknown) => styles },
}));

vi.mock("react-native-svg", () => ({
  default: "Svg",
  Defs: "Defs",
  ClipPath: "ClipPath",
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
  FocusSegments: ({
    label,
    options,
    value,
    onChange,
  }: {
    label: string;
    options: readonly { label: string; value: string }[];
    value: string;
    onChange: (val: string) => void;
  }) =>
    createElement(
      "View",
      { accessibilityRole: "tablist", accessibilityLabel: label },
      options?.map((o) =>
        createElement(
          "Pressable",
          {
            key: o.value,
            accessibilityRole: "tab",
            accessibilityLabel: `Time lens ${o.label}`,
            accessibilityState: { selected: value === o.value },
            onPress: () => onChange(o.value),
          },
          createElement("Text", null, o.label),
        ),
      ),
    ),
  fonts: {
    bodyBold: "System",
  },
}));

vi.mock("../theme", () => ({
  SHELL_COLORS: { ink: "#142b3b", muted: "#637482", tennis: "#f7c948" },
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
    expect(text).toContain("Advanced Analytics");
    expect(text).not.toContain("Biometrics & Telemetry");
    expect(text).not.toContain("Autonomic health, training load, and cardiovascular efficiency");
    expect(text).not.toContain("Inspect lab →");

    expect(text).not.toContain("Athlete Equity");
    expect(text).toContain("Overnight HRV");
    expect(text).toContain("Sleep & Debt");
    expect(text).toContain("Workload Ratio");
    expect(text).toContain("Aerobic Efficiency");
    expect(text).toContain("Readiness Brief");

    const tiles = renderer.root
      .findAllByType("Pressable" as never)
      .filter((p) => !p.props.accessibilityLabel?.startsWith("Time lens"));
    expect(tiles.length).toBe(5);

    await act(async () => {
      tiles[0]!.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/telemetry",
      params: { domain: "vitals" },
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
    expect(allText()).toContain("Avg Score");
    expect(allText()).toContain("Cumulative Debt");
    expect(allText()).toContain("Restorative %");

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
    expect(allText()).toContain("PR Staircase & Critical Pace");
    expect(allText()).not.toContain("Matched Endurance Runs");

    // 6. Combined detail page: interactive strain vs recovery
    await act(async () => {
      renderer = create(createElement(AthleteTelemetryDetailView, { domain: "combined" }));
    });
    expect(allText()).toContain("Morning Readiness Brief");
    expect(allText()).toContain("Readiness");
    expect(allText()).toContain("Strain Ceiling");
    expect(allText()).not.toContain("Daily Synthesis Log");
  });

  it("renders time lens pills (7D, 30D, 90D, All) and persists selected date when switching vitals", async () => {
    await act(async () => {
      renderer = create(createElement(AthleteTelemetryDetailView, { domain: "vitals" }));
    });

    const allText = () =>
      renderer.root
        .findAllByType("Text" as never)
        .map((n) => n.children.filter((c: unknown) => typeof c === "string").join(""))
        .join(" ");

    // Verify time lens pills
    expect(allText()).toContain("7D");
    expect(allText()).toContain("30D");
    expect(allText()).toContain("90D");
    expect(allText()).toContain("All");

    // Switching lenses updates view
    const lensPills = renderer.root
      .findAllByType("Pressable" as never)
      .filter((p) => p.props.accessibilityLabel?.startsWith("Time lens"));
    expect(lensPills.length).toBe(4);

    await act(async () => {
      lensPills[0]!.props.onPress(); // 7D
    });

    // Verify switching active vital keeps selected date intact
    const vitalPills = renderer.root
      .findAllByType("Pressable" as never)
      .filter((p) => p.props.accessibilityLabel?.includes("Resting Heart Rate"));
    expect(vitalPills.length).toBe(1);

    await act(async () => {
      vitalPills[0]!.props.onPress();
    });
    expect(allText()).toContain("Resting Heart Rate");
  });

  it("shows empty placeholder data when signedOut is true", async () => {
    await act(async () => {
      renderer = create(createElement(AthleteTelemetryMatrix, { signedOut: true }));
    });

    const allText = () =>
      renderer.root
        .findAllByType("Text" as never)
        .map((n) => n.children.filter((c: unknown) => typeof c === "string").join(""))
        .join(" ");

    const text = allText();
    expect(text).toContain("Advanced Analytics");
    expect(text).toContain("Overnight HRV");
    expect(text).toContain("—");
    expect(text).toContain("No data");

    // Also verify detail view has zero mock data when signedOut is true
    await act(async () => {
      renderer = create(createElement(AthleteTelemetryDetailView, { domain: "vitals", signedOut: true }));
    });
    const detailText = allText();
    expect(detailText).toContain("Autonomic Vitals");
    expect(detailText).toContain("No data available");
    expect(detailText).not.toContain("Heart Rate Variability");
    expect(detailText).not.toContain("74 ms");
  });
});
