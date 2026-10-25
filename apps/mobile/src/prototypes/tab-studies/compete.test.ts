import { createElement } from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
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
import CompeteStudy from "./compete";
import { boardFor, sports } from "./compete-data";
function textOf(node: ReactTestInstance | string): string {
  return typeof node === "string"
    ? node
    : node.children
        .map((child) => textOf(child as ReactTestInstance | string))
        .join("");
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
describe("Compete study", () => {
  it("keeps each sport/track fixture ranked and the previous week settled independently", () => {
    for (const sport of sports)
      for (const track of ["Open", "GPS"] as const)
        for (const previous of [false, true]) {
          const board = boardFor(sport, track, previous);
          expect(board.map((a) => a.place)).toEqual([1, 2, 3, 4, 5, 6]);
          expect(board.filter((a) => a.you)).toHaveLength(1);
          expect(
            board.every((a, i) => !i || board[i - 1].volume >= a.volume),
          ).toBe(true);
        }
    expect(boardFor("Running", "Open", true).find((a) => a.you)?.place).toBe(2);
  });
  it("renders every concept and walks athlete → session → back, preserving root context", async () => {
    let app: ReturnType<typeof create>;
    await act(async () => {
      app = create(createElement(CompeteStudy));
    });
    const press = async (label: string) => {
      const button = app!.root
        .findAllByType("Pressable" as never)
        .find(
          (n) => n.props.accessibilityLabel === label || textOf(n) === label,
        );
      expect(button, label).toBeDefined();
      await act(async () => button!.props.onPress());
    };
    for (const label of [
      "02 The Chase",
      "03 The Podium",
      "04 Meet Cards",
      "05 Sport Switchboard",
      "06 Season Ribbon",
      "07 Race Room",
      "08 Field + List",
      "09 The Trophy Room",
      "01 The Standings",
    ])
      await press(label);
    await press("GPS");
    await press("Open Jules Rivera, place 2, 16.7 mi");
    await press("Morning milesSample eligible activity10.0 mi");
    expect(textOf(app!.root)).toContain("Why this session counts");
    await press("‹ Back");
    expect(textOf(app!.root)).toContain("Counted sessions");
    await press("Done");
    expect(
      app!.root
        .findAllByType("Pressable" as never)
        .some(
          (n) =>
            n.props.accessibilityLabel ===
            "Open Jules Rivera, place 2, 16.7 mi",
        ),
    ).toBe(true);
    await press("Strength");
    expect(
      app!.root
        .findAllByType("Pressable" as never)
        .some((n) => textOf(n) === "GPS"),
    ).toBe(false);
    await press("New athlete");
    expect(textOf(app!.root)).toContain("Your first start is ahead.");
    await press("Load sample board");
    await press("Past resultsSettled weeks, places & score receipts");
    await press("Oct 12–18Strength · Open · Settled#2");
    expect(textOf(app!.root)).toContain("Final result".toUpperCase());
    await act(async () => app!.unmount());
  });
});
