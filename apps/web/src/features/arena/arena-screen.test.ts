import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, reduceCompete, type CompeteState } from "@fitness-battle/shared";
const mock=vi.hoisted(()=>({state:null as CompeteState|null, dispatch: vi.fn()}));
vi.mock("@/components/compete-context",()=>({useCompete:()=>({state:mock.state,dispatch:mock.dispatch,loadStatus:"local"})}));
vi.mock("@/components/auth-context",()=>({useAuth:()=>({user:{id:"demo"}})}));
vi.mock("next/link",()=>({default:"a"}));
vi.mock("next/navigation",()=>({useSearchParams:()=>new URLSearchParams(),useRouter:()=>({push:vi.fn()})}));
vi.mock("@/lib/score-track-lens",()=>({useScoreTrackLens:()=>["open",vi.fn()]}));
vi.mock("@/lib/haptics",()=>({playCue:vi.fn()}));
vi.mock("@/features/field/components/field-stage",()=>({FieldStage:({sportTitle, queueOverlay, standingsOnly, presentationVisible, onExit}:{sportTitle:string; standingsOnly?:boolean; presentationVisible?:boolean; onExit?:()=>void; queueOverlay?: import("react").ReactNode})=>createElement("div",{[standingsOnly ? "data-standings" : "data-active-field"]:sportTitle,"data-visible":presentationVisible,onDoubleClick:onExit}, queueOverlay)}));
vi.mock("./competition-timeline-context", () => ({
  CompetitionTimelineProvider: ({ children }: { children: import("react").ReactNode }) => children,
  CompetitionTimelineControls: () => null,
}));
vi.mock("./competition-panel", () => ({
  CompetitionPanel: ({ standings }: { standings: import("react").ReactNode }) => standings,
}));
vi.mock("./race-updates", () => ({ RaceUpdates: () => null }));
vi.mock("@/features/health/sleep-panel",()=>({SleepPanel:()=>createElement("div",{"data-sleep-field":true})}));
vi.mock("@/features/split/components/week-reveal",()=>({WeekReveal:()=>null}));
vi.mock("@/ui/sheet",()=>({Sheet:({ open, fullScreen, children, onClose }: { open: boolean; fullScreen?: boolean; children: import("react").ReactNode; onClose(): void }) => open ? createElement("section", { "data-event-page": fullScreen }, createElement("button", { "aria-label": "Back to events", onClick: onClose }, "Back"), children) : null}));
vi.mock("@/components/auth-gate",()=>({AuthPrompt:()=>null}));
import { ArenaScreen } from "./arena-screen";
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-21T12:00:00Z")); });
afterEach(() => vi.useRealTimers());
describe("single-sport competition",()=>{
 it("offers all registrations while building only the primary field",()=>{
  mock.state=reduceCompete(reduceCompete(freshState(),{type:"opt-in",sport:"running",now:"2026-10-21T09:00:00Z"}),{type:"opt-in",sport:"cycling",now:"2026-10-21T09:00:00Z"});
  const html=renderToStaticMarkup(createElement(ArenaScreen));
  expect(html.match(/data-active-field=/g)).toHaveLength(1);
  expect(html).toContain('data-active-field="Running"');
  expect(html).toContain("Cycling");
  expect(html).toContain('aria-label="Enter Running field"');
  expect(html).toContain('aria-label="Enter Cycling field"');
  expect(html).toContain("Register");
 });
 it("shows recovery alone when it is the only registration",()=>{
  mock.state=reduceCompete(freshState(),{type:"opt-in-health",metric:"sleep",now:"2026-10-21T09:00:00Z"});
  const html=renderToStaticMarkup(createElement(ArenaScreen));
  expect(html).not.toContain("data-sleep-field");expect(html).not.toContain("data-active-field");
  expect(html).toContain("Sleep competition");
 });
});

it("keeps queued race details and cancellation off the Compete home", () => {
  mock.state=reduceCompete(freshState(), { type: "opt-in", sport: "running" });
  mock.state.enrollments[0]!.peerIds=["hidden-peer"];
  const html=renderToStaticMarkup(createElement(ArenaScreen));
  expect(html).not.toContain("Cancel registration");
  expect(html).not.toContain("7 mystery competitors");
  expect(html).toContain("See race");
  expect(html).not.toContain("data-active-field");
  expect(html).not.toContain("data-standings");
  expect(html).not.toContain("hidden-peer");
});

it("enters a selected event and returns home without replacing its prepared field", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.state = reduceCompete(freshState(), { type: "opt-in", sport: "running", now: "2026-10-21T09:00:00Z" });
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(createElement(ArenaScreen)); });
  try {
    const map = renderer.root.findByProps({ "data-active-field": "Running" });
    expect(map.props["data-visible"]).toBe(false);
    await act(async () => renderer.root.findByProps({ "aria-label": "Enter Running field" }).props.onClick());
    expect(renderer.root.findByProps({ "data-active-field": "Running" })).toBe(map);
    expect(map.props["data-visible"]).toBe(true);
    await act(async () => map.props.onDoubleClick());
    expect(map.props["data-visible"]).toBe(false);
    expect(renderer.root.findByProps({ "aria-label": "Enter Running field" })).toBeDefined();
    expect(renderer.root.findByProps({ "data-active-field": "Running" })).toBe(map);
  } finally { await act(async () => renderer.unmount()); vi.unstubAllGlobals(); }
});

it("enters a queued race before exposing its countdown and cancellation", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  // The countdown's document visibility listener is supplied by the browser.
  vi.stubGlobal("document", { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  mock.dispatch.mockClear();
  mock.state = reduceCompete(freshState(), { type: "opt-in", sport: "running" });
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(createElement(ArenaScreen)); });
  try {
    expect(renderer.root.findAllByProps({ "data-event-page": true })).toHaveLength(0);
    await act(async () => renderer.root.findByProps({ "aria-label": "Enter Running field" }).props.onClick());
    const page = renderer.root.findByProps({ "data-event-page": true });
    const cancel = page.findAllByType("button").find(node => node.children.includes("Cancel registration"));
    expect(cancel).toBeDefined();
    expect(page.findAllByProps({ "aria-label": "Time until competition starts" })).not.toHaveLength(0);
    expect(renderer.root.findAllByProps({ "data-active-field": "Running" })).toHaveLength(0);
    await act(async () => cancel!.props.onClick());
    expect(mock.dispatch).toHaveBeenCalledWith({ type: "opt-out", sport: "running" });
    expect(renderer.root.findAllByProps({ "data-event-page": true })).toHaveLength(0);
    expect(renderer.root.findByProps({ "aria-label": "Enter Running field" })).toBeDefined();
  } finally { await act(async () => renderer.unmount()); vi.unstubAllGlobals(); }
});
