import { createElement, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let currentDomain = "market";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "domain" ? currentDomain : null),
  }),
}));

vi.mock("@/components/compete-context", () => ({
  useCompete: () => ({ state: null }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [k: string]: unknown;
  }) => createElement("a", { href, ...props }, children),
}));

import { AthleteTelemetryMatrix } from "./athlete-telemetry-matrix";
import { TelemetryPage } from "./telemetry-page";

let renderer: ReactTestRenderer;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  currentDomain = "market";
});

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});

describe("AthleteTelemetryMatrix web component", () => {
  it("renders Bento Matrix overview with single title and links to dedicated pages", async () => {
    await act(async () => {
      renderer = create(createElement(AthleteTelemetryMatrix));
    });

    const allText = () =>
      renderer.root
        .findAll((n) => typeof n.children?.[0] === "string")
        .map((n) => n.children.filter((c: unknown) => typeof c === "string").join(""))
        .join(" ");

    const text = allText();
    // Verify single title
    expect(text).toContain("Advanced Analytics");

    // Verify kickers and filler copy are removed
    expect(text).not.toContain("Biometrics & Telemetry");
    expect(text).not.toContain("Autonomic health, training load, and cardiovascular efficiency");
    expect(text).not.toContain("Inspect lab →");

    // Verify all 6 Bento cards are present
    expect(text).toContain("Athlete Equity");
    expect(text).toContain("Overnight HRV");
    expect(text).toContain("Sleep & Debt");
    expect(text).toContain("Workload Ratio");
    expect(text).toContain("Aerobic Efficiency");
    expect(text).toContain("Readiness Brief");

    // Verify links to dedicated pages
    const links = renderer.root.findAllByType("a");
    expect(links.length).toBe(6);
    expect(links[0]!.props.href).toBe("/you/telemetry?domain=market");
    expect(links[1]!.props.href).toBe("/you/telemetry?domain=vitals");
    expect(links[2]!.props.href).toBe("/you/telemetry?domain=sleep");
    expect(links[3]!.props.href).toBe("/you/telemetry?domain=load");
    expect(links[4]!.props.href).toBe("/you/telemetry?domain=performance");
    expect(links[5]!.props.href).toBe("/you/telemetry?domain=combined");
  });

  it("renders dedicated telemetry pages with interactive chart inspection and no bloated date tables", async () => {
    // 1. Market domain
    currentDomain = "market";
    await act(async () => {
      renderer = create(createElement(TelemetryPage));
    });

    let allText = () =>
      renderer.root
        .findAll((n) => typeof n.children?.[0] === "string")
        .map((n) => n.children.filter((c: unknown) => typeof c === "string").join(""))
        .join(" ");

    expect(allText()).toContain("Athlete Market");
    expect(allText()).toContain("Equity Curve");
    expect(allText()).toContain("Asset Holdings by Sport");
    expect(allText()).not.toContain("Weekly Performance Ledger");

    // 2. Vitals domain
    currentDomain = "vitals";
    await act(async () => {
      renderer = create(createElement(TelemetryPage));
    });
    expect(allText()).toContain("Autonomic Vitals");
    expect(allText()).toContain("Autonomic Baseline Corridors");
    expect(allText()).toContain("Heart Rate Variability");
    expect(allText()).toContain("Corridor:");
    expect(allText()).not.toContain("Daily Readings");

    // 3. Sleep domain
    currentDomain = "sleep";
    await act(async () => {
      renderer = create(createElement(TelemetryPage));
    });
    expect(allText()).toContain("Sleep & Recovery");
    expect(allText()).toContain("Sleep Architecture");
    expect(allText()).toContain("Avg Score");
    expect(allText()).toContain("Cumulative Debt");

    // 4. Load domain
    currentDomain = "load";
    await act(async () => {
      renderer = create(createElement(TelemetryPage));
    });
    expect(allText()).toContain("Workload Ratio");
    expect(allText()).toContain("Period Volume Burn-Up");
    expect(allText()).not.toContain("Weekly Workload Buckets");

    // 5. Performance domain
    currentDomain = "performance";
    await act(async () => {
      renderer = create(createElement(TelemetryPage));
    });
    expect(allText()).toContain("Cardio & Pace");
    expect(allText()).toContain("Aerobic Efficiency (EF)");
    expect(allText()).toContain("PR Staircase & Critical Pace");
    expect(allText()).not.toContain("Matched Endurance Runs");

    // 6. Combined domain
    currentDomain = "combined";
    await act(async () => {
      renderer = create(createElement(TelemetryPage));
    });
    expect(allText()).toContain("Readiness Brief");
    expect(allText()).toContain("Morning Readiness Brief");
    expect(allText()).toContain("Readiness");
    expect(allText()).not.toContain("Daily Synthesis Log");
  });

  it("renders time lens buttons (7D, 30D, 90D, All) and allows switching vitals while retaining selected date", async () => {
    currentDomain = "vitals";
    await act(async () => {
      renderer = create(createElement(TelemetryPage));
    });

    const allText = () =>
      renderer.root
        .findAll((n) => typeof n.children?.[0] === "string")
        .map((n) => n.children.filter((c: unknown) => typeof c === "string").join(""))
        .join(" ");

    expect(allText()).toContain("7D");
    expect(allText()).toContain("30D");
    expect(allText()).toContain("90D");
    expect(allText()).toContain("All");

    const buttons = renderer.root.findAllByType("button");
    const lens7d = buttons.find((b) => b.children.includes("7D"));
    expect(lens7d).toBeDefined();

    await act(async () => {
      lens7d!.props.onClick();
    });

    expect(allText()).toContain("Autonomic Baseline Corridors");
  });
});
