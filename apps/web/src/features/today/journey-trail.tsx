"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { routeThroughCenters, type JourneyPt } from "./journey-route";

export type { JourneyLane, JourneyLanePlan } from "./journey-route";
export {
  planJourneyLanes,
  planJourneyTrail,
  routeThroughCenters,
} from "./journey-route";

function readStopCenters(
  svg: SVGSVGElement,
  stops: Array<HTMLElement | null>,
): { centers: JourneyPt[]; box: { w: number; h: number } } | null {
  const svgRect = svg.getBoundingClientRect();
  if (svgRect.width < 1 || svgRect.height < 1) return null;
  const centers: JourneyPt[] = [];
  for (const el of stops) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    centers.push({
      x: r.left + r.width / 2 - svgRect.left,
      y: r.top + r.height / 2 - svgRect.top,
    });
  }
  return {
    centers,
    box: { w: svgRect.width, h: svgRect.height },
  };
}

/**
 * Journey shell: N positioned stops + a route always derived from their centers.
 * Add/remove/reorder stops by changing the stop list — the path follows the circles.
 */
export function JourneyTrail({
  stopCount,
  /** Changes when stop identity/order changes (not only count) so the route remeasures. */
  layoutKey,
  active = true,
  children,
}: {
  stopCount: number;
  layoutKey: string;
  active?: boolean;
  children: (api: {
    setStopRef: (index: number) => Ref<HTMLButtonElement>;
  }) => ReactNode;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const stopEls = useRef<(HTMLButtonElement | null)[]>([]);
  const [pathSegs, setPathSegs] = useState<string[]>([]);
  const [svgBox, setSvgBox] = useState({ w: 100, h: 100 });

  useLayoutEffect(() => {
    if (!active || stopCount < 2) {
      setPathSegs([]);
      return;
    }
    const redraw = () => {
      const svg = svgRef.current;
      if (!svg) return;
      const measured = readStopCenters(
        svg,
        stopEls.current.slice(0, stopCount),
      );
      if (!measured) return;
      setSvgBox(measured.box);
      // Path is a pure function of the circle centers — nothing else.
      setPathSegs(routeThroughCenters(measured.centers, measured.box.w));
    };
    redraw();
    const ro = new ResizeObserver(redraw);
    if (rootRef.current) ro.observe(rootRef.current);
    window.addEventListener("resize", redraw);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", redraw);
    };
  }, [active, stopCount, layoutKey]);

  const setStopRef =
    (index: number): Ref<HTMLButtonElement> =>
    (el) => {
      stopEls.current[index] = el;
    };

  return (
    <section
      ref={rootRef}
      className="focus-journey"
      aria-label="Activity journey"
    >
      <svg
        ref={svgRef}
        className="focus-journey-path"
        viewBox={`0 0 ${svgBox.w} ${svgBox.h}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {pathSegs.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
      {children({ setStopRef })}
    </section>
  );
}
