vi.mock("../lib/avatar-upload", () => ({ uploadNativeProfileAvatar: vi.fn() }));
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
const mock=vi.hoisted(()=>({preview:undefined as string|undefined,dispatch:vi.fn(),replace:vi.fn(),back:vi.fn(),storage:vi.fn(async()=>{})}));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("react-native",()=>({useColorScheme: () => "light", Modal:"Modal",ScrollView:"ScrollView",TextInput:"TextInput",View:"View"}));
vi.mock("react-native-svg",()=>({default:"Svg",Rect:"Rect",Text:"SvgText"}));
vi.mock("react-native-safe-area-context",()=>({SafeAreaProvider:"SafeAreaProvider",SafeAreaView:"SafeAreaView"}));
vi.mock("@react-native-async-storage/async-storage",()=>({default:{getItem:async()=>null,setItem:mock.storage,removeItem:vi.fn(async()=>{}),multiRemove:vi.fn(async()=>{})}}));
vi.mock("expo-router",()=>({useLocalSearchParams:()=>({preview:mock.preview}),useRouter:()=>({replace:mock.replace,back:mock.back,canGoBack:()=>true})}));
vi.mock("../lib/auth",()=>({useAuth:()=>({user:{id:"a",displayName:"Jamie"}})}));
const state=freshState();
vi.mock("../lib/compete-store",()=>({useCompeteStore:()=>({state,canWrite:true,dispatch:mock.dispatch})}));
vi.mock("../ui/icon-button",()=>({IconButton:"IconButton"}));
vi.mock("../ui/section",()=>({AppText:"AppText",chartTextProps:()=>({})}));
vi.mock("../ui/motion-step",()=>({MotionStep:"MotionStep"}));
vi.mock("../ui/mascot/animated-ember",()=>({AnimatedEmber:"AnimatedEmber"}));
vi.mock("../ui/choice-picker",()=>({ChoicePicker:"ChoicePicker"}));
vi.mock("../ui/searchable-country-picker",()=>({SearchableCountryPicker:"SearchableCountryPicker"}));
vi.mock("../ui/chip",()=>({Chip:"Chip"}));
vi.mock("../ui/focus",()=>((()=>{const mock={FocusButton:"FocusButton",FocusSegments:"FocusSegments",f:{}};return {...mock,useFocusStyles:()=>("f" in mock ? mock.f : {})};})()));
vi.mock("./onboarding-visuals",()=>({OnboardingFade:"OnboardingFade",OnboardingOutlook:"OnboardingOutlook",OnboardingSummary:"OnboardingSummary"}));
vi.mock("./profile-photo",()=>({ProfilePhoto:"ProfilePhoto"}));
vi.mock("../../app/athlete",()=>({TrackerConnections:"TrackerConnections"}));
vi.mock("./onboarding-overtake",()=>({OnboardingOvertake:"OnboardingOvertake"}));
import Onboarding from "../../app/onboarding";

async function completeIdentityStep(r: ReactTestRenderer) {
  await act(async () => {
    r.root.findAllByType("TextInput" as never).find((n) => n.props.accessibilityLabel === "Name")!.props.onChangeText("Jamie");
    r.root
      .findAllByType("ChoicePicker" as never)
      .find((n) => n.props.label === "Gender (optional)")!
      .props.onChange("female");
    r.root.findByType("SearchableCountryPicker" as never).props.onChange("US");
  });
}

it.each([false,true])("walks all setup steps and only saves a real completion (preview=%s)",async(preview)=>{
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);vi.clearAllMocks();mock.preview=preview?"1":undefined;
 let r!:ReactTestRenderer;await act(async()=>{r=create(createElement(Onboarding));});
 const button=(label:string)=>{
  const matches=r.root.findAllByType("FocusButton" as never).find(n=>n.props.label===label);
  if(!matches) throw new Error(`Missing FocusButton "${label}"; saw ${r.root.findAllByType("FocusButton" as never).map(n=>n.props.label).join(", ")}`);
  return matches;
 };
 const advance=async(label="Continue")=>act(async()=>button(label).props.onPress());
 await advance("Skip for now");
 if (!preview) {
   await completeIdentityStep(r);
   await act(async()=>r.root.findAllByType("Chip" as never).find(n=>n.props.label==="Running")!.props.onPress());
   await act(async()=>r.root.findAllByType("TextInput" as never).find(n=>n.props.accessibilityLabel==="Typical weekly running")!.props.onChangeText("7"));
 }
 expect(mock.dispatch).not.toHaveBeenCalled();
 await advance();
 expect(mock.dispatch).not.toHaveBeenCalled();
 await advance("Enter events");
 if(preview){
   expect(mock.dispatch).not.toHaveBeenCalled();
   expect(mock.storage).not.toHaveBeenCalled();
 }else{
   expect(mock.dispatch).toHaveBeenCalledWith({type:"declare-effort",sport:"running",declaredWeeklyVolume:11265.408});
   expect(mock.dispatch).toHaveBeenCalledWith({type:"set-units",units:state.units});
   expect(mock.dispatch).toHaveBeenCalledWith({type:"set-gender",gender:"female"});
   expect(mock.dispatch).toHaveBeenCalledWith({type:"set-country",countryCode:"US"});
   expect(mock.dispatch.mock.calls.filter(([a])=>a.type==="complete-onboarding")).toHaveLength(1);
   expect(mock.replace).toHaveBeenCalledWith("/today");
 }
 await act(async()=>r.unmount());
});

it("validates the combined selection on Continue and supports sleep without a sport",async()=>{
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);vi.clearAllMocks();mock.preview=undefined;
 let r!:ReactTestRenderer;await act(async()=>{r=create(createElement(Onboarding));});
 const press=async(label:string)=>act(async()=>r.root.findAllByType("FocusButton" as never).find(n=>n.props.label===label)!.props.onPress());
 await press("Skip for now");
 await completeIdentityStep(r);
 const chip=(label:string)=>r.root.findAllByType("Chip" as never).find(n=>n.props.label===label)!;
 await press("Continue");
 expect(r.root.findAllByType("AppText" as never).some(n=>n.props.children==="Choose at least one sport or sleep tracking to continue.")).toBe(true);
 await act(async()=>chip("Sleep tracking").props.onPress());await press("Continue");
 await press("Enter events");
 expect(mock.dispatch).toHaveBeenCalledWith({type:"opt-in-health",metric:"sleep"});
 expect(mock.dispatch.mock.calls.some(([a])=>a.type==="opt-in"||a.type==="set-primary")).toBe(false);
 await act(async()=>r.unmount());
});

it("uses the top safe area and a primary dropdown only for multiple sports", async () => {
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);mock.preview="1";
 let r!:ReactTestRenderer;await act(async()=>{r=create(createElement(Onboarding));});
 expect(r.root.findByType("SafeAreaView" as never).props.edges).toEqual(["top","bottom"]);
 const next=async()=>act(async()=>r.root.findAllByType("FocusButton" as never).find(n=>n.props.label==="Continue")!.props.onPress());
 await act(async()=>r.root.findAllByType("FocusButton" as never).find(n=>n.props.label==="Skip for now")!.props.onPress());
 await completeIdentityStep(r);
 expect(r.root.findAllByType("ChoicePicker" as never).some(n=>n.props.label==="Primary sport")).toBe(false);
 await act(async()=>r.root.findAllByType("Chip" as never).find(n=>n.props.label==="Running")!.props.onPress());
 await act(async()=>r.root.findAllByType("Chip" as never).find(n=>n.props.label==="Cycling")!.props.onPress());
  const picker = r.root
    .findAllByType("ChoicePicker" as never)
    .find((n) => n.props.label === "Primary sport")!;
  expect(picker.props.options.map((o:{value:string})=>o.value)).toEqual(["running","cycling"]);
  await act(async()=>picker.props.onChange("cycling"));
  expect(
    r.root
      .findAllByType("ChoicePicker" as never)
      .find((n) => n.props.label === "Primary sport")!.props.value,
  ).toBe("cycling");
 await act(async()=>r.unmount());
});
