import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ useWindowDimensions: () => ({ fontScale: 1 }), Animated: { createAnimatedComponent: () => "AnimatedRect" } }));
vi.mock("react-native-svg", () => ({ default: "Svg", Polyline: "Polyline", Path: "Path", Line: "Line", Text: "SvgText", Defs: "Defs", ClipPath: "ClipPath", Rect: "Rect", G: "G" }));
vi.mock("./section", () => ({ chartTextProps: () => ({ fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }) }));
vi.mock("./chart-scrubber", () => ({ ChartScrubber: "Scrubber" }));
import { StandardLineChart } from "./standard-line-chart";
it("keeps axes outside the animated plot clipping region", async () => {
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
 const interpolate=vi.fn(()=>123);
 let r!:ReturnType<typeof create>;
 await act(async()=>{r=create(createElement(StandardLineChart,{showAxes:true,values:[1000,1040,1080],xLabels:["Week 1","Week 4","Week 7"],revealProgress:{interpolate} as never}));});
 expect(r.root.findByType("Svg" as never).props.preserveAspectRatio).toBe("none");
 expect(r.root.findAllByType("Line" as never)).toHaveLength(2);
 expect(r.root.findAllByType("SvgText" as never)).toHaveLength(8);
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
   await act(async()=>svg.props.onLayout({nativeEvent:{layout:{width,height:190}}}));
   expect(svg.props.preserveAspectRatio).toBe("none");
   const vertex=r.root.findByType("Polyline" as never).props.points.split(" ")[1].split(",").map(Number);
   const selected=scrubber.props.points[1];
   expect(Math.abs(vertex[0]*width/340-selected.x*width/340)).toBeLessThan(.1);
   expect(Math.abs(vertex[1]-selected.y)).toBeLessThan(.1);
 }
 const labels=r.root.findAllByType("SvgText" as never).map(t=>t.props.children);
 expect(labels).toContain("HRV (ms)");expect(labels).toContain("Date");expect(labels).toContain("Oct 21");
 await act(async()=>r.unmount());vi.unstubAllGlobals();
});
