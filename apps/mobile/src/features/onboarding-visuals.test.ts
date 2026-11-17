import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ useColorScheme: () => "light", View: "View" }));
vi.mock("../ui/section", () => ({ AppText: "AppText" }));
vi.mock("../ui/rank-symbol", () => ({ RankSymbol: "RankSymbol" }));
vi.mock("../ui/standard-line-chart", () => ({ StandardLineChart: "Chart" }));
import { OnboardingPotential } from "./onboarding-potential";
it("keeps potential growth separate from earned rank and score", async () => {
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
 let r!:ReactTestRenderer;
 await act(async()=>{r=create(createElement(OnboardingPotential));});
 expect(r.root.findByType("Chart" as never).props.values).toEqual([500,620,780,990,1250,1520,1770,2000]);
 expect(r.root.findAllByType("RankSymbol" as never)).toHaveLength(0);
 expect(r.root.findAllByType("AppText" as never).some(n=>n.props.children==="Effort Score")).toBe(true);
 await act(async()=>r.unmount());
});
