import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("./competition-moment",()=>({CompetitionMoment:"CompetitionMoment"}));
import { OnboardingOvertake } from "./onboarding-overtake";
it("switches view on the same player and resets only on explicit replay",async()=>{
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);let r!:ReactTestRenderer;
 await act(async()=>{r=create(createElement(OnboardingOvertake));});
 const player=()=>r.root.findByType("CompetitionMoment" as never);
 const first=player();const moment=first.props.moment;expect(first.props.dimension).toBe("4d");
 await act(async()=>r.root.findAllByType("button").find(b=>b.props.role==="switch")!.props.onClick());
 expect(player()).toBe(first);expect(player().props.dimension).toBe("2d");expect(player().props.moment).toBe(moment);expect(player().props.course).not.toBeNull();
 await act(async()=>player().props.onConfirm());expect(player()).not.toBe(first);
 await act(async()=>r.unmount());
});
