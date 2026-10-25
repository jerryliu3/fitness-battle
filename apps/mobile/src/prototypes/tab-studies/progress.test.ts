import { createElement } from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Modal: ({ visible, children }: { visible: boolean; children: unknown }) =>
    visible ? children : null,
  StyleSheet: { create: (v: unknown) => v, absoluteFill: {} },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
}));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));
vi.mock("expo-router", () => ({ useLocalSearchParams: () => ({}) }));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Circle: "Circle",
  Line: "Line",
  Path: "Path",
  Polyline: "Polyline",
}));
vi.mock("../../ui/app-icon", () => ({ AppIcon: "AppIcon" }));
import ProgressStudy from "./progress";
import {
  calendarHours,
  ranges,
  total,
  training,
  trainingValues,
} from "./progress-data";
function textOf(node: ReactTestInstance | string): string {
  return typeof node === "string"
    ? node
    : node.children
        .map((child) => textOf(child as ReactTestInstance | string))
        .join("");
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
it("keeps calendar, range totals and sport shares consistent", () => {
  expect(total(calendarHours.map((v) => v ?? 0))).toBeCloseTo(
    total(training.Month.hours),
  );
  expect(calendarHours.slice(18, 25)).toEqual(training.Week.hours);
  expect(calendarHours.slice(25).every((v) => v === null)).toBe(true);
  for (const range of ranges)
    expect(
      total(trainingValues(range, "Running")) +
        total(trainingValues(range, "Cycling")) +
        total(trainingValues(range, "Strength")),
    ).toBeCloseTo(total(trainingValues(range, "All sports")));
});
it("renders nine roots and drills a selected range into a session, with independent chart state", async () => {
  let app: ReturnType<typeof create>;
  await act(async () => {
    app = create(createElement(ProgressStudy));
  });
  const press = async (label: string) => {
    const button = app!.root
      .findAllByType("Pressable" as never)
      .filter(
        (n) => n.props.accessibilityLabel === label || textOf(n) === label,
      )
      .at(-1);
    expect(button, label).toBeDefined();
    await act(async () => button!.props.onPress());
  };
  for (const label of [
    "02 Calendar Lens",
    "03 Signal Library",
    "04 Training Journal",
    "05 Year Atlas",
    "06 Then & Now",
    "07 Activity Clock",
    "08 Personal Bests",
    "09 Monthly Chapters",
    "01 Training Portfolio",
  ])
    await press(label);
  await press("Month");
  expect(textOf(app!.root)).toContain("15.3 h");
  await press("Running");
  expect(textOf(app!.root)).toContain("7.7 h");
  await press("All training historyRange → bucket → session");
  await press("Year");
  await press("Inspect Jan");
  expect(textOf(app!.root)).toContain("Jan · 4.5 h");
  await press("Open Jan activities →");
  await press("Morning session60% of this sample bucket164m");
  expect(textOf(app!.root)).toContain("Activity receipt");
  await press("Done");
  await press("02 Calendar Lens");
  await press("Inspect October 21");
  await press("Open this day →");
  expect(textOf(app!.root)).toContain("No counted activity.");
  await press("Done");
  await press("03 Signal Library");
  await press("Preview missing health readings");
  await press("Explore Sleep duration");
  expect(textOf(app!.root)).toContain("No source reading.");
  await act(async () => app!.unmount());
});
