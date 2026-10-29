import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, reduceCompete, type CompeteState } from "@fitness-battle/shared";
const mock=vi.hoisted(()=>({state:null as CompeteState|null}));
vi.mock("@/components/compete-context",()=>({useCompete:()=>({state:mock.state,dispatch:vi.fn(),loadStatus:"local"})}));
vi.mock("@/components/auth-context",()=>({useAuth:()=>({user:{id:"demo"}})}));
vi.mock("next/navigation",()=>({useSearchParams:()=>new URLSearchParams(),useRouter:()=>({push:vi.fn()})}));
vi.mock("@/lib/score-track-lens",()=>({useScoreTrackLens:()=>["open",vi.fn()]}));
vi.mock("@/lib/haptics",()=>({playCue:vi.fn()}));
vi.mock("@/features/field/components/field-stage",()=>({FieldStage:({sportTitle, queueOverlay}:{sportTitle:string; queueOverlay?: import("react").ReactNode})=>createElement("div",{"data-active-field":sportTitle}, queueOverlay)}));
vi.mock("@/features/health/sleep-panel",()=>({SleepPanel:()=>createElement("div",{"data-sleep-field":true})}));
vi.mock("@/features/split/components/week-reveal",()=>({WeekReveal:()=>null}));
vi.mock("@/ui/sheet",()=>({Sheet:()=>null}));
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
  expect(html).toContain('role="tab"');
  expect(html).toContain("Register");
 });
 it("shows recovery alone when it is the only registration",()=>{
  mock.state=reduceCompete(freshState(),{type:"opt-in-health",metric:"sleep",now:"2026-10-21T09:00:00Z"});
  const html=renderToStaticMarkup(createElement(ArenaScreen));
  expect(html).toContain("data-sleep-field");expect(html).not.toContain("data-active-field");
 });
});

it("shows mystery competitors and a cancel action for a queued registration", () => {
  mock.state=reduceCompete(freshState(), { type: "opt-in", sport: "running" });
  mock.state.enrollments[0]!.peerIds=["hidden-peer"];
  const html=renderToStaticMarkup(createElement(ArenaScreen));
  expect(html).toContain("Finding your competitors");
  expect(html).toContain("7 mystery competitors");
  expect(html).toContain("Cancel registration");
  expect(html).toContain("6:00 AM ET");
  expect(html).toContain("11:59 PM ET");
  expect(html).toContain('data-active-field="Running"');
  expect(html).not.toContain("hidden-peer");
});
