import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { applyDebugEvent, defaultFieldAppearance, freshState, localCompetitionReplay, DEMO_RACE_COURSE, type CompetitionReplaySelection } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ debug: true, request: vi.fn(), open: undefined as undefined | ((value: boolean) => void) }));
vi.mock("@/components/auth-context", () => ({ useAuth: () => ({ user: { id: "signed-in-athlete" }, offlineMode: false }) }));
vi.mock("@/components/compete-context", () => ({ useCompete: () => ({ debugActive: mock.debug }) }));
vi.mock("motion/react", () => ({ useReducedMotion: () => true }));
vi.mock("@/features/focus/arena-lanes", () => ({ ArenaLanes: "ArenaLanes" }));
vi.mock("@/features/club/portrait-field", () => ({ PortraitField: "PortraitField" }));
vi.mock("../course/use-competition-course", () => ({ useCompetitionCourse: () => ({ course: DEMO_RACE_COURSE, error: "", retry() {} }) }));
vi.mock("@/features/field/components/field-course", () => ({ useFieldAppearance: () => [defaultFieldAppearance] }));
vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ children, onOpenChange }: { children: React.ReactNode; onOpenChange: (value: boolean) => void }) => { mock.open = onOpenChange; return children; },
  Trigger: ({ children }: { children: React.ReactNode }) => children,
  Portal: "Portal", Overlay: "Overlay", Content: "Content", Close: "Close", Title: "Title",
}));
vi.mock("../course/geographic-course", () => ({ GeographicCourse: "GeographicCourse" }));
vi.mock("../field/components/field-view-switcher", () => ({ FieldViewSwitcher: "FieldViewSwitcher" }));
import { CompetitionReplayButton } from "./competition-replay";
const state = applyDebugEvent(freshState(new Date("2026-10-25T18:00:00Z")), "overtake-combo", "signed-in-athlete").state;
const selection: CompetitionReplaySelection = { sport: "running", track: "verified", periodStart: "2026-10-19T04:00:00.000Z", periodEnd: "2026-10-26T04:00:00.000Z" };
let renderer: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.debug = true;
  mock.request.mockReset();
  vi.stubGlobal("fetch", mock.request);
  vi.stubGlobal("window", { setTimeout, clearTimeout });
  vi.stubGlobal("document", { hidden: false, addEventListener() {}, removeEventListener() {} });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});
async function open() {
  await act(async () => { renderer = create(createElement(CompetitionReplayButton, { state, selection, dimension: "2d" })); });
  await act(async () => mock.open!(true));
}
it("uses the local practice ledger when signed in with Debug active and reloads from the server after reset", async () => {
  await open();
  expect(mock.request).not.toHaveBeenCalled();
  const field = () => renderer.root.findByType("ArenaLanes" as never);
  expect(field().props.lanes.map((lane: { id: string }) => lane.id).sort()).toEqual(localCompetitionReplay(state, selection).athletes.map(a => a.id).sort());
  expect(renderer.root.findByType("input").props.max).toBeGreaterThan(0);
  mock.debug = false;
  mock.request.mockResolvedValue(new Response(JSON.stringify(localCompetitionReplay(state, selection))));
  await act(async () => renderer.update(createElement(CompetitionReplayButton, { state, selection, dimension: "2d" })));
  expect(mock.request).toHaveBeenCalledTimes(1);
  expect(mock.request.mock.calls[0][0]).toContain("/api/compete/replay?");
});
it("keeps a real authenticated field lookup failure visible instead of substituting a local preview", async () => {
  mock.debug = false;
  mock.request.mockResolvedValue(new Response(JSON.stringify({ error: "Competition replay is unavailable. Please try again." }), { status: 404 }));
  await open();
  expect(mock.request).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByType("ArenaLanes" as never)).toHaveLength(0);
  expect(renderer.root.findByProps({ role: "status" }).findByType("p").props.children).toContain("Could not load");
});

it("uses replay totals in 4D, seeks backward and retains the course across modes", async () => {
  mock.debug = false;
  const replay = { ...localCompetitionReplay(state, selection), athletes: [{ id: "you", name: "You", you: true }], events: [{ id: "run", athleteId: "you", at: "2026-10-24T12:00:00Z", distanceM: 1000, movingSec: 300, effort: 1, simulated: false }] };
  mock.request.mockResolvedValue(new Response(JSON.stringify(replay)));
  await open();
  const modes = () => renderer.root.findByType("FieldViewSwitcher" as never);
  await act(async () => modes().props.onChange("4d"));
  const map = () => renderer.root.findByType("GeographicCourse" as never);
  const course = DEMO_RACE_COURSE;
  expect(map().props.onCourseChange).toBeUndefined();
  expect(map().props.course).toBe(course);
  expect(map().props.lanes.every((lane: { value: number }) => lane.value === 0)).toBe(true);
  const timeline = () => renderer.root.findByProps({ "aria-label": "Competition replay timeline" });
  const latest = timeline().props.max;
  await act(async () => timeline().props.onChange({ target: { value: latest } }));
  expect(latest).toBeGreaterThan(0);
  expect(map().props.lanes.some((lane: { value: number }) => lane.value > 0)).toBe(true);
  await act(async () => timeline().props.onChange({ target: { value: "0" } }));
  expect(map().props.lanes.every((lane: { value: number }) => lane.value === 0)).toBe(true);
  await act(async () => modes().props.onChange("3d"));
  expect(renderer.root.findAllByType("GeographicCourse" as never)).toHaveLength(0);
  await act(async () => modes().props.onChange("4d"));
  expect(map().props.course).toBe(course);
});
