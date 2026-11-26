vi.mock("../lib/athlete-blocks", () => ({ useAthleteBlocks: () => ({ blocks: mocks.blocks, ready: true, setBlocked: mocks.setBlocked }) }));
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  navigate: vi.fn(),
  close: vi.fn(),
  request: vi.fn(),
  setBlocked: vi.fn(),
  blocks: [] as { id: string; name: string }[],
  pathname: "/arena",
}));
vi.mock("react-native", () => ({useColorScheme: () => "light",  ActivityIndicator: "ActivityIndicator", View: "View", TextInput: "TextInput", Pressable: "Pressable" }));
vi.mock("expo-router", () => ({
  useRouter: () => ({ navigate: mocks.navigate, push: mocks.navigate }),
  usePathname: () => mocks.pathname,
}));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: { id: "owner", createdAt: "2024-05-01T00:00:00Z" }, accessToken: "token", offlineMode: false }) }));
vi.mock("../lib/api", () => ({ requestApi: mocks.request }));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://example.test" } }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ state: { city: "Boston", primary: "running", lifetimeOvertakes: 12 } }) }));
vi.mock("../lib/supabase", () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ maybeSingle: mocks.lookup }) }),
}) } }));
vi.mock("../ui/focus", () => ((()=>{const mock={ FocusSheet: "FocusSheet", FocusButton: "FocusButton", f: { row: {}, section: {} } };return {...mock,useFocusStyles:()=>("f" in mock ? mock.f : {})};})()));
vi.mock("../ui/section", () => ({ AppText: "AppText", SectionHeader: "SectionHeader" }));
vi.mock("../ui/app-icon", () => ({ AppIcon: "AppIcon" }));
vi.mock("./athlete-crest", () => ({ AthleteCrest: "AthleteCrest" }));
import { AthleteProfileSheet } from "./athlete-profile-sheet";

const id = "11111111-1111-4111-8111-111111111111";
let renderer: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  mocks.blocks = [];
  mocks.setBlocked.mockImplementation(async (target: string, blocked: boolean) => { mocks.blocks = blocked ? [{ id: target, name: "Peer" }] : []; });
  mocks.request.mockResolvedValue({ sent: true });
  mocks.lookup.mockResolvedValue({ data: { city: "Toronto", country_code: "CA", created_at: "2025-03-01T00:00:00Z", lifetime_overtakes: 8, primary_sport: "running" } });
});
it("waits for public profile resolution with a loading indicator before mounting the 3D card", async () => {
  let resolveLookup!: (value: unknown) => void;
  mocks.lookup.mockImplementationOnce(() => new Promise((resolve) => { resolveLookup = resolve; }));
  await act(async () => {
    renderer = create(createElement(AthleteProfileSheet, { athlete: { id, name: "Peer", score: 1100 }, onClose: mocks.close }));
  });
  expect(renderer.root.findAllByType("AthleteCrest" as never)).toHaveLength(0);
  expect(renderer.root.findAllByType("ActivityIndicator" as never)).toHaveLength(1);
  await act(async () => {
    resolveLookup({ data: { city: "Toronto", country_code: "CA", created_at: "2025-03-01T00:00:00Z", lifetime_overtakes: 8, primary_sport: "running" } });
  });
  expect(renderer.root.findAllByType("ActivityIndicator" as never)).toHaveLength(0);
  expect(renderer.root.findByType("AthleteCrest" as never).props.model).toMatchObject({ name: "Peer", city: "Toronto", memberSince: "Since 2/25" });
});

it("loads public identity and shows the selected standings context", async () => {
  await act(async () => { renderer = create(createElement(AthleteProfileSheet, { athlete: { id, name: "Peer", score: 1100, contextValue: "5.0 km", contextDetail: "Place 2" }, onClose: mocks.close })); });
  expect(renderer.root.findByType("AthleteCrest" as never).props.model).toMatchObject({ name: "Peer", city: "Toronto", score: 1100, memberSince: "Since 2/25" });
  expect(JSON.stringify(renderer.toJSON())).toContain("5.0 km");
  expect(JSON.stringify(renderer.toJSON())).toContain("View full profile");
  expect(JSON.stringify(renderer.toJSON())).not.toContain("Athlete details");
});
it("shows own details and navigates only after the sheet closes", async () => {
  await act(async () => { renderer = create(createElement(AthleteProfileSheet, { athlete: { id: "you", name: "Me", you: true }, onClose: mocks.close })); });
  expect(mocks.lookup).not.toHaveBeenCalled();
  expect(renderer.root.findByType("AthleteCrest" as never).props.model).toMatchObject({ city: "Boston", memberSince: "Since 4/24" });
  await act(async () => renderer.root.findAllByType("FocusButton" as never).find(node => node.props.label === "Your Athlete page")!.props.onPress());
  expect(mocks.close).toHaveBeenCalled();
  expect(mocks.navigate).not.toHaveBeenCalled();
  await act(async () => renderer.root.findByType("FocusSheet" as never).props.onClosed());
  expect(mocks.navigate).toHaveBeenCalledWith("/athlete");
});

it("opens the full profile route after the preview sheet closes", async () => {
  mocks.pathname = "/arena";
  await act(async () => { renderer = create(createElement(AthleteProfileSheet, { athlete: { id, name: "Peer", score: 1100, contextValue: "5.0 km" }, onClose: mocks.close })); });
  await act(async () => renderer.root.findAllByType("FocusButton" as never).find(node => node.props.label === "View full profile")!.props.onPress());
  expect(mocks.close).toHaveBeenCalled();
  await act(async () => renderer.root.findByType("FocusSheet" as never).props.onClosed());
  expect(mocks.navigate).toHaveBeenCalledWith({
    pathname: "/athlete-profile",
    params: { id, name: "Peer", score: "1100", contextValue: "5.0 km", returnTo: "/arena" },
  });
});

it("returns to Crew after opening a profile from the field tab", async () => {
  mocks.pathname = "/field";
  await act(async () => {
    renderer = create(createElement(AthleteProfileSheet, {
      athlete: {
        id,
        name: "Crewmate",
        score: 980,
        contextLabel: "This week's crew contribution",
        contextValue: "12.4 km",
        contextDetail: "River Runners · 28% of crew total",
      },
      onClose: mocks.close,
    }));
  });
  await act(async () => renderer.root.findAllByType("FocusButton" as never).find(node => node.props.label === "View full profile")!.props.onPress());
  await act(async () => renderer.root.findByType("FocusSheet" as never).props.onClosed());
  expect(mocks.navigate).toHaveBeenCalledWith({
    pathname: "/athlete-profile",
    params: {
      id,
      name: "Crewmate",
      score: "980",
      contextLabel: "This week's crew contribution",
      contextValue: "12.4 km",
      contextDetail: "River Runners · 28% of crew total",
      returnTo: "/field",
    },
  });
});
it("treats every other profile as an account, including seeded field athletes", async () => {
  await act(async () => { renderer = create(createElement(AthleteProfileSheet, { athlete: { id, name: "Jordan Lee" }, onClose: mocks.close })); });
  expect(mocks.lookup).toHaveBeenCalled();
  expect(JSON.stringify(renderer.toJSON())).not.toContain("Sample athlete");
  expect(renderer.root.findByProps({ accessibilityLabel: "Block athlete" })).toBeDefined();
  expect(renderer.root.findByProps({ accessibilityLabel: "Report athlete" })).toBeDefined();
});

it("sends a report identifying the athlete through the support email endpoint", async () => {
  await act(async () => { renderer = create(createElement(AthleteProfileSheet, { athlete: { id, name: "Peer" }, onClose: mocks.close })); });
  const button = (label: string) => renderer.root.findAllByType("FocusButton" as never).find(node => node.props.label === label)!;
  await act(async () => renderer.root.findByProps({ accessibilityLabel: "Report athlete" }).props.onPress());
  await act(async () => renderer.root.findByType("TextInput" as never).props.onChangeText("This athlete was abusive."));
  await act(async () => button("Send report").props.onPress());
  expect(mocks.request).toHaveBeenCalledWith("https://example.test", "token", "/api/issues", { body: { message: `Athlete report\nReported account: ${id}\n\nThis athlete was abusive.` } });
});

it("confirms before blocking an athlete", async () => {
  await act(async () => { renderer = create(createElement(AthleteProfileSheet, { athlete: { id, name: "Peer" }, onClose: mocks.close })); });
  await act(async () => renderer.root.findByProps({ accessibilityLabel: "Block athlete" }).props.onPress());
  expect(mocks.setBlocked).not.toHaveBeenCalled();
  expect(renderer.root.findAllByType("AppText" as never).some(node => node.children.join("") === "Block Peer?")).toBe(true);
  await act(async () => renderer.root.findAllByType("FocusButton" as never).find(node => node.props.label === "Confirm block")!.props.onPress());
  expect(mocks.setBlocked).toHaveBeenCalledWith(id, true);
  expect(mocks.close).not.toHaveBeenCalled();
  await act(async () => renderer.update(createElement(AthleteProfileSheet, { athlete: { id, name: "Peer" }, onClose: mocks.close })));
  await act(async () => renderer.root.findByProps({ accessibilityLabel: "Unblock athlete" }).props.onPress());
  expect(mocks.setBlocked).toHaveBeenCalledTimes(1);
  await act(async () => renderer.root.findAllByType("FocusButton" as never).find(node => node.props.label === "Confirm unblock")!.props.onPress());
  expect(mocks.setBlocked).toHaveBeenCalledWith(id, false);
  expect(mocks.close).not.toHaveBeenCalled();
});
