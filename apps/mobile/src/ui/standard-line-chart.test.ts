import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({useColorScheme: () => "light", View: "View", useWindowDimensions: () => ({ fontScale: 1 }), Animated: { createAnimatedComponent: () => "AnimatedRect" } }));
vi.mock("react-native-svg", () => ({ default: "Svg", Polyline: "Polyline", Path: "Path", Line: "Line", Text: "SvgText", Defs: "Defs", ClipPath: "ClipPath", Rect: "Rect", G: "G", Circle: "Circle" }));
vi.mock("./section", () => ({ chartTextProps: () => ({ fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }) }));
vi.mock("./chart-scrubber", () => ({ ChartScrubber: "Scrubber" }));
import { dottedCircleDasharray } from "@fitness-battle/shared";
import { StandardLineChart } from "./standard-line-chart";
it("keeps axes outside the animated plot clipping region", async () => {
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
 const interpolate=vi.fn(()=>123);
 let r!:ReturnType<typeof create>;
 await act(async()=>{r=create(createElement(StandardLineChart,{showAxes:true,values:[1000,1040,1080],xLabels:["Week 1","Week 4","Week 7"],revealProgress:{interpolate} as never}));});
 expect(r.root.findByType("Svg" as never).props.preserveAspectRatio).toBe("none");
 expect(r.root.findAllByType("Line" as never)).toHaveLength(6);
 expect(r.root.findAllByType("SvgText" as never)).toHaveLength(7);
 expect(r.root.findByType("AnimatedRect" as never).props.width).toBe(123);
 expect(r.root.findAllByType("G" as never).find(n=>n.props.clipPath)!.findAllByType("SvgText" as never)).toHaveLength(0);
 expect(interpolate).toHaveBeenCalledWith({inputRange:[0,1],outputRange:[0,282]});
 await act(async()=>r.unmount());vi.unstubAllGlobals();
});
it("uses the same full-width transform and coordinates for the trace and selected point", async () => {
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
 let r!:ReturnType<typeof create>;
 await act(async()=>{r=create(createElement(StandardLineChart,{values:[50,65,90], selectedIdx:1, yAxisLabel:"HRV (ms)",xLabels:["Oct 20","Oct 21","Oct 22"]}));});
 const svg=r.root.findByType("Svg" as never);
 const scrubber=r.root.findByType("Scrubber" as never);
 for(const width of [280,390,600]) {
   await act(async()=>r.root.findByType("View" as never).props.onLayout({nativeEvent:{layout:{width,height:190}}}));
   expect(svg.props.preserveAspectRatio).toBe("none");
   const vertex=r.root.findAllByType("Polyline" as never).at(-1)!.props.points.split(" ")[1].split(",").map(Number);
   const selected=scrubber.props.points[1];
   expect(Math.abs(vertex[0]*width/340-selected.x*width/340)).toBeLessThan(.1);
   expect(Math.abs(vertex[1]-selected.y)).toBeLessThan(.1);
 }
 const labels=r.root.findAllByType("SvgText" as never).map(t=>t.props.children);
 expect(labels).not.toContain("HRV (ms)");expect(labels).not.toContain("Date");expect(labels).toContain("Oct 21");
 await act(async()=>r.unmount());vi.unstubAllGlobals();
});
it("hides default dots on line charts and renders corridor dots without a connecting line", async () => {
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
 let r!:ReturnType<typeof create>;
 await act(async()=>{r=create(createElement(StandardLineChart,{values:[42]}));});
 expect(r.root.findAllByType("Circle" as never)).toHaveLength(0);
 const labels=r.root.findAllByType("SvgText" as never).map(t=>t.props.children);
 expect(labels).toContain("1");
 await act(async()=>{r.update(createElement(StandardLineChart,{values:[50,80], selectedIdx: 0, corridor:{low:[55,60], high:[70,85]}}));});
 const circles=r.root.findAllByType("Circle" as never);
 expect(circles).toHaveLength(2);
 expect(circles[0]!.props.r).toBe(4);
 expect(circles[0]!.props.strokeDasharray).toBe(dottedCircleDasharray(4, 8));
 expect(circles[1]!.props.strokeDasharray).toBeUndefined();
 expect(r.root.findByType("Scrubber" as never).props.hideSelectionDot).toBe(true);
 expect(r.root.findAllByType("Polyline" as never)).toHaveLength(2);
 await act(async()=>r.unmount());vi.unstubAllGlobals();
});
