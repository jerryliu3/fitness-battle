import { createElement } from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Switch: "Switch",
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
import ProfileStudy from "./profile";
import { initialProfile, publicIdentity } from "./profile-data";
function textOf(node: ReactTestInstance | string): string {
  return typeof node === "string"
    ? node
    : node.children
        .map((child) => textOf(child as ReactTestInstance | string))
        .join("");
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
it("projects only intended public identity fields and honors local visibility", () => {
  expect(
    publicIdentity(initialProfile, { city: false, records: false }),
  ).toEqual({
    name: "Alex Lee",
    city: null,
    bio: initialProfile.bio,
    showRecords: false,
  });
});
it("renders four concepts, edits locally, and keeps settings/email/hidden records out of public views", async () => {
  let app: ReturnType<typeof create>;
  await act(async () => {
    app = create(createElement(ProfileStudy));
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
    "02 Athletic Passport",
    "03 Cover Story",
    "04 Record Cabinet",
    "01 Athlete Card",
  ])
    await press(label);
  await press("Edit profile");
  await act(async () =>
    app!.root
      .findByProps({ accessibilityLabel: "Profile name draft" })
      .props.onChangeText(""),
  );
  await press("Save local profile");
  expect(textOf(app!.root)).toContain("Enter a display name.");
  await act(async () =>
    app!.root
      .findByProps({ accessibilityLabel: "Profile name draft" })
      .props.onChangeText("Alex Rivera"),
  );
  await press("Save local profile");
  expect(textOf(app!.root)).toContain("Alex Rivera");
  await press("Settings →");
  await press("AccountPrivate account information");
  expect(textOf(app!.root)).toContain("alex@example.test");
  await press("‹ Back");
  await press("Public profile visibilityPreview city and record visibility");
  await act(async () =>
    app!.root
      .findByProps({ accessibilityLabel: "Show city in public preview" })
      .props.onValueChange(false),
  );
  await act(async () =>
    app!.root
      .findByProps({ accessibilityLabel: "Show records in public preview" })
      .props.onValueChange(false),
  );
  await press("Done");
  await press("Public");
  const publicText = textOf(app!.root);
  expect(publicText).toContain("Alex Rivera");
  expect(publicText).not.toContain("Brooklyn, NY");
  expect(publicText).not.toContain("alex@example.test");
  expect(publicText).not.toContain("24:18");
  expect(
    app!.root
      .findAllByType("Pressable" as never)
      .some((n) => textOf(n) === "Settings →" || textOf(n) === "Edit profile"),
  ).toBe(false);
  await press("Preview new athlete");
  expect(textOf(app!.root)).toContain("Your story starts here.");
  await act(async () => app!.unmount());
});
