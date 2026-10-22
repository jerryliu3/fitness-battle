import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, reduceCompete, type Activity, type CompeteState } from "@fitness-battle/shared";
const mock=vi.hoisted(()=>({state:null as CompeteState|null,account:"one",navigate:vi.fn()}));
vi.mock("react-native",()=>({
 Pressable:"Pressable",ScrollView:"ScrollView",Text:"Text",View:"View",Image:"Image",StyleSheet:{create:(value:unknown)=>value},
 Animated:{View:"AnimatedView",Value:class{constructor(public value:number){}setValue(value:number){this.value=value;}interpolate(){return 0;}},timing:()=>({start(){},stop(){}})},
}));
vi.mock("react-native-svg",()=>({default:"Svg",G:"G",Path:"Path",Text:"SvgText"}));
vi.mock("expo-router",()=>({useRouter:()=>({navigate:mock.navigate})}));
vi.mock("../lib/compete-store",()=>({useCompeteStore:()=>({state:mock.state,accountKey:mock.account,canWrite:true,saveError:null})}));
vi.mock("../ui/focus",()=>({FocusButton:"FocusButton",FocusSegments:"FocusSegments",f:{}}));
vi.mock("../ui/mascot/animated-ember",()=>({AnimatedEmber:"Ember"}));
vi.mock("../ui/use-reduced-motion",()=>({useReducedMotion:()=>true}));
vi.mock("../ui/field-course",()=>({drawFieldNode:()=>null}));
import { EffortRail } from "./effort-rail";
import { SessionStage } from "./session-stage";
let renderer:ReactTestRenderer;
const text=()=>renderer.root.findAllByType("Text" as never).map(n=>n.children.filter(c=>typeof c==="string").join("")).join(" ");
const now=new Date("2026-10-21T12:00:00Z");
const recorded=(id:string,movingSec:number,sport:Activity["sport"]="running"):Activity=>({id,movingSec,sport,startedAt:now.toISOString(),distanceM:5000,avgHr:null,verified:true,source:"strava",provenance:"recorded",disposition:"counted"});
beforeEach(()=>{vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);vi.useFakeTimers();vi.setSystemTime(now);mock.account="one";mock.state=reduceCompete(freshState(now),{type:"opt-in",sport:"running",now:now.toISOString()});});
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount());vi.useRealTimers();vi.unstubAllGlobals();vi.clearAllMocks();});
describe("native earned progress flows",()=>{
 it("shows score changes once after hydration, keeps reduced motion still and resets across accounts",async()=>{
  await act(async()=>{renderer=create(createElement(EffortRail));});
  expect(JSON.stringify(renderer.toJSON())).not.toContain("✦");
  mock.state={...mock.state!,ratings:mock.state!.ratings.map(r=>r.sport==="running"?{...r,openElo:r.openElo+2}:r)};
  await act(async()=>renderer.update(createElement(EffortRail)));
  expect(text()).toContain("+2");expect(JSON.stringify(renderer.toJSON())).not.toContain("✦");
  mock.account="two";await act(async()=>renderer.update(createElement(EffortRail)));expect(text()).not.toContain("+2");
  await act(async()=>renderer.root.findByType("Pressable" as never).props.onPress());expect(mock.navigate).toHaveBeenCalledWith("/you");
 });
 it("leads with hours across multiple sports and requires confirmation before removing one session",async()=>{
  const remove=vi.fn();await act(async()=>{renderer=create(createElement(SessionStage,{state:mock.state!,activities:[recorded("run",3600),recorded("strength",1800,"strength")],onRemove:remove}));});
  expect(JSON.stringify(renderer.toJSON())).toContain('"1.5"');expect(JSON.stringify(renderer.toJSON())).toContain("2 recorded sessions");
  await act(async()=>renderer.root.findAllByType("Pressable" as never)[0]!.props.onPress());
  const removal=renderer.root.findAllByType("Pressable" as never).find(n=>n.findAllByType("Text" as never).some(t=>t.children.includes("Remove session")))!;
  await act(async()=>removal.props.onPress());expect(remove).not.toHaveBeenCalled();
  await act(async()=>renderer.root.findAllByType("FocusButton" as never).find(n=>n.props.label==="Remove session")!.props.onPress());expect(remove).toHaveBeenCalledWith("run");
 });
 it("keeps an unrecorded suggestion separate from completion",async()=>{
  await act(async()=>{renderer=create(createElement(SessionStage,{state:mock.state!,activities:[],suggestion:{title:"Easy movement",minutes:30,detail:"Keep it comfortable."},onRemove:vi.fn()}));});
  const json=JSON.stringify(renderer.toJSON());expect(json).toContain("Suggested time");expect(json).toContain('"0.5"');expect(json).not.toContain("recorded session");
 });
});
