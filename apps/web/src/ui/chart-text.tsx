"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactElement, type SVGProps } from "react";
import { typographyStyle } from "./section";

const ChartScale = createContext({ x: 1, y: 1, width: Infinity });

/** Scale chart geometry with its container while keeping captions at their recipe size. */
export function ChartSvg({ children, ...props }: SVGProps<SVGSVGElement>): ReactElement {
  const ref = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState({ x: 1, y: 1, width: Infinity });
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const measure = () => {
      const matrix = svg.getScreenCTM();
      if (matrix) setScale({ x: Math.hypot(matrix.a, matrix.b) || 1, y: Math.hypot(matrix.c, matrix.d) || 1, width: svg.getBoundingClientRect().width });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [props.viewBox, props.preserveAspectRatio]);
  return <ChartScale.Provider value={scale}><svg {...props} ref={ref}>{children}</svg></ChartScale.Provider>;
}

export function ChartText({ x = 0, y = 0, style, minChartWidth = 0, ...props }: Omit<SVGProps<SVGTextElement>, "transform"> & { x?: number | string; y?: number | string; minChartWidth?: number }): ReactElement | null {
  const scale = useContext(ChartScale);
  if (scale.width < minChartWidth) return null;
  return <text {...props} x={x} y={y} transform={`translate(${x} ${y}) scale(${1 / scale.x} ${1 / scale.y}) translate(${-Number(x)} ${-Number(y)})`} style={{ ...style, ...typographyStyle("caption") }}/>;
}
