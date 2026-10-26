import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { freshState, reduceCompete, type CompeteState } from "@fitness-battle/shared";
const mock=vi.hoisted(()=>({state:null as CompeteState|null}));
vi.mock("@/components/compete-context",()=>({useCompete:()=>({state:mock.state,dispatch:vi.fn(),loadStatus:"local"})}));
vi.mock("@/components/auth-context",()=>({useAuth:()=>({user:{id:"demo"}})}));
vi.mock("next/navigation",()=>({useSearchParams:()=>new URLSearchParams(),useRouter:()=>({push:vi.fn()})}));
vi.mock("@/lib/score-track-lens",()=>({useScoreTrackLens:()=>["open",vi.fn()]}));
vi.mock("@/lib/haptics",()=>({playCue:vi.fn()}));
vi.mock("@/features/field/components/field-stage",()=>({FieldStage:({sportTitle}:{sportTitle:string})=>createElement("div",{"data-active-field":sportTitle})}));
vi.mock("@/features/health/sleep-panel",()=>({SleepPanel:()=>createElement("div",{"data-sleep-field":true})}));
vi.mock("@/features/split/components/week-reveal",()=>({WeekReveal:()=>null}));
vi.mock("@/ui/sheet",()=>({Sheet:()=>null}));
vi.mock("@/components/auth-gate",()=>({AuthPrompt:()=>null}));
import { ArenaScreen } from "./arena-screen";
describe("single-sport competition",()=>{
 it("offers all registrations while building only the primary field",()=>{
  mock.state=reduceCompete(reduceCompete(freshState(),{type:"opt-in",sport:"running"}),{type:"opt-in",sport:"cycling"});
  const html=renderToStaticMarkup(createElement(ArenaScreen));
  expect(html.match(/data-active-field=/g)).toHaveLength(1);
  expect(html).toContain('data-active-field="Running"');
  expect(html).toContain("Cycling");
  expect(html).toContain('role="tab"');
  expect(html).toContain("Register");
 });
 it("shows recovery alone when it is the only registration",()=>{
  mock.state=reduceCompete(freshState(),{type:"opt-in-health",metric:"sleep"});
  const html=renderToStaticMarkup(createElement(ArenaScreen));
  expect(html).toContain("data-sleep-field");expect(html).not.toContain("data-active-field");
 });
});
