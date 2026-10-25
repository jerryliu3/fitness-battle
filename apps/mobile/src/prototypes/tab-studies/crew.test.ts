import { createElement } from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
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
import CrewStudy from "./crew";
import { crews, crewTotal, dayShares, journeyPosition } from "./crew-data";
function textOf(node: ReactTestInstance | string): string {
  return typeof node === "string"
    ? node
    : node.children
        .map((child) => textOf(child as ReactTestInstance | string))
        .join("");
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
it("keeps additive shared views and journey endpoints consistent", () => {
  expect(crewTotal(crews[0].members)).toBeCloseTo(72.6);
  expect(crewTotal(crews[1].members)).toBeCloseTo(45.2);
  for (const crew of crews)
    expect(
      dayShares.reduce<number>(
        (sum, share) => sum + share * crewTotal(crew.members),
        0,
      ),
    ).toBeCloseTo(crewTotal(crew.members));
  expect(journeyPosition(0)).toEqual({ x: 22, y: 218 });
  expect(journeyPosition(1).x).toBeCloseTo(298);
  expect(journeyPosition(1).y).toBeCloseTo(16);
});
it("renders nine roots, drills shared → member → activity, and keeps RSVP local/reversible", async () => {
  let app: ReturnType<typeof create>;
  await act(async () => {
    app = create(createElement(CrewStudy));
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
    "02 Contribution Mosaic",
    "03 The Relay",
    "04 Crew Constellation",
    "05 The Clubhouse",
    "06 People First",
    "07 Shared Calendar",
    "08 The Start Line",
    "09 Crew Chapters",
    "01 Shared Journey",
  ])
    await press(label);
  await press("Night Shift");
  expect(textOf(app!.root)).toContain("45.2 mi");
  await press("Sunday People");
  await press("Explore shared journey contributions");
  await press("Open Alex Lee contribution");
  await press("Counted activityPrivate crew view · Sample sessions");
  await press("Morning milesSample counted session3.6 mi");
  expect(textOf(app!.root)).toContain("Shared contribution");
  await press("Done");
  await press("Start Line sessionsPlans & local RSVP preview");
  await press("RSVP locally");
  expect(textOf(app!.root)).toContain("No RSVP was sent.");
  await press("Mara ChenSample attendee");
  await press("‹ Back");
  await press("Going ✓ · Tap to undo");
  expect(textOf(app!.root)).toContain("3 sample RSVPs.");
  await press("Done");
  await press("Crew preferencesLocal draft · No crew writes");
  await act(async () =>
    app!.root
      .findByProps({ accessibilityLabel: "Crew target draft" })
      .props.onChangeText("-5"),
  );
  await press("Preview saved draft");
  expect(textOf(app!.root)).toContain("Enter a name and a positive distance.");
  await act(async () => app!.unmount());
});
