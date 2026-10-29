import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (styles: unknown) => styles },
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("./profile-photo", () => ({
  ProfilePhoto: "ProfilePhoto",
}));

vi.mock("./effort-trend", () => ({
  EffortTrend: "EffortTrend",
}));

vi.mock("../ui/icon-button", () => ({
  IconButton: "IconButton",
}));

vi.mock("../ui/section", () => ({
  AppText: "AppText",
  SectionHeader: "SectionHeader",
}));

vi.mock("../ui/focus", () => ({
  f: {
    section: {},
    card: {},
    row: {},
    kicker: {},
  },
  FocusButton: "FocusButton",
}));

import { AthleteMetrics } from "./athlete-metrics";

let renderer: ReactTestRenderer;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});

describe("AthleteMetrics", () => {
  const getRenderedTexts = () =>
    renderer.root
      .findAllByType("Text" as never)
      .map((n) => n.children.filter((c: unknown) => typeof c === "string").join(""))
      .join(" ");

  it("renders state city for signed-in athletes", async () => {
    const state = { ...freshState(), city: "Toronto", name: "Alice" };
    await act(async () => {
      renderer = create(
        createElement(AthleteMetrics, { state, sections: "profile", signedOut: false })
      );
    });
    const text = getRenderedTexts();
    expect(text).toContain("Toronto");
  });

  it("renders no city by default for signed-out athletes", async () => {
    const state = { ...freshState(), city: "Toronto", name: "Guest" };
    await act(async () => {
      renderer = create(
        createElement(AthleteMetrics, { state, sections: "profile", signedOut: true })
      );
    });
    const text = getRenderedTexts();
    expect(text).not.toContain("Toronto");
    expect(text).not.toContain("City");
  });

  it("renders explicit city if provided for signed-out athletes", async () => {
    const state = { ...freshState(), city: "Toronto", name: "Guest" };
    await act(async () => {
      renderer = create(
        createElement(AthleteMetrics, {
          state,
          sections: "profile",
          signedOut: true,
          city: "City",
        })
      );
    });
    const text = getRenderedTexts();
    expect(text).toContain("City");
    expect(text).not.toContain("Toronto");
  });
});
