import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ lookup: vi.fn(), navigate: vi.fn(), close: vi.fn(), request: vi.fn() }));
vi.mock("react-native", () => ({ View: "View", TextInput: "TextInput", Pressable: "Pressable" }));
vi.mock("expo-router", () => ({ useRouter: () => ({ navigate: mocks.navigate }) }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: { id: "owner", createdAt: "2024-05-01T00:00:00Z" }, accessToken: "token", offlineMode: false }) }));
vi.mock("../lib/api", () => ({ requestApi: mocks.request }));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://example.test" } }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ state: { city: "Boston", primary: "running", lifetimeOvertakes: 12 } }) }));
vi.mock("../lib/supabase", () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ maybeSingle: mocks.lookup }) }),
}) } }));
vi.mock("../ui/focus", () => ({ FocusSheet: "FocusSheet", FocusButton: "FocusButton", f: { row: {}, section: {} } }));
vi.mock("../ui/section", () => ({ AppText: "AppText", SectionHeader: "SectionHeader" }));
vi.mock("../ui/app-icon", () => ({ AppIcon: "AppIcon" }));
vi.mock("./athlete-profile-card", () => ({ AthleteProfileCard: "AthleteProfileCard" }));
import { AthleteProfileSheet } from "./athlete-profile-sheet";

const id = "11111111-1111-4111-8111-111111111111";
let renderer: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  mocks.request.mockResolvedValue({ sent: true });
  mocks.lookup.mockResolvedValue({ data: { city: "Toronto", created_at: "2025-03-01T00:00:00Z", lifetime_overtakes: 8, primary_sport: "running" } });
});
it("loads public identity and shows the selected standings context", async () => {
  await act(async () => { renderer = create(createElement(AthleteProfileSheet, { athlete: { id, name: "Peer", score: 1100, contextValue: "5.0 km", contextDetail: "Place 2" }, onClose: mocks.close })); });
  expect(renderer.root.findByType("AthleteProfileCard" as never).props).toMatchObject({ name: "Peer", city: "Toronto", score: 1100, since: "Since 2025" });
  expect(JSON.stringify(renderer.toJSON())).toContain("5.0 km");
  expect(JSON.stringify(renderer.toJSON())).toContain("Overtakes");
});
it("shows own details and navigates only after the sheet closes", async () => {
  await act(async () => { renderer = create(createElement(AthleteProfileSheet, { athlete: { id: "you", name: "Me", you: true }, onClose: mocks.close })); });
  expect(mocks.lookup).not.toHaveBeenCalled();
  expect(renderer.root.findByType("AthleteProfileCard" as never).props).toMatchObject({ city: "Boston", since: "Since 2024" });
  await act(async () => renderer.root.findByType("FocusButton" as never).props.onPress());
  expect(mocks.close).toHaveBeenCalled();
  expect(mocks.navigate).not.toHaveBeenCalled();
  await act(async () => renderer.root.findByType("FocusSheet" as never).props.onClosed());
  expect(mocks.navigate).toHaveBeenCalledWith("/athlete");
});
it("labels sample athletes and does not look them up as accounts", async () => {
  await act(async () => { renderer = create(createElement(AthleteProfileSheet, { athlete: { id, name: "Sample", sample: true }, onClose: mocks.close })); });
  expect(mocks.lookup).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer.toJSON())).toContain("Sample athlete");
});

it("sends a report identifying the athlete through the support email endpoint", async () => {
  await act(async () => { renderer = create(createElement(AthleteProfileSheet, { athlete: { id, name: "Peer" }, onClose: mocks.close })); });
  const button = (label: string) => renderer.root.findAllByType("FocusButton" as never).find(node => node.props.label === label)!;
  await act(async () => renderer.root.findByProps({ accessibilityLabel: "Report athlete" }).props.onPress());
  await act(async () => renderer.root.findByType("TextInput" as never).props.onChangeText("This athlete was abusive."));
  await act(async () => button("Send report").props.onPress());
  expect(mocks.request).toHaveBeenCalledWith("https://example.test", "token", "/api/issues", { body: { message: `Athlete report\nReported account: ${id}\n\nThis athlete was abusive.` } });
});
