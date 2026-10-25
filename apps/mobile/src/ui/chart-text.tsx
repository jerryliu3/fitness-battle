import { createContext, useContext, useState } from "react";
import { useWindowDimensions } from "react-native";
import Svg, { Text as SvgText, type SvgProps, type TextProps } from "react-native-svg";
import { chartTextProps } from "./section";

const ChartScale = createContext({ x: 1, y: 1, width: Infinity });

/** Counter chart scaling, including nonuniform stretching, only for text. */
export function ChartSvg({ children, onLayout, ...props }: SvgProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const box = props.viewBox?.trim().split(/[ ,]+/).map(Number);
  const sx = box && size.width ? size.width / box[2] : 1;
  const sy = box && size.height ? size.height / box[3] : 1;
  const scale = props.preserveAspectRatio === "none" ? { x: sx, y: sy } : { x: Math.min(sx, sy), y: Math.min(sx, sy) };
  return <ChartScale.Provider value={{ ...scale, width: size.width || Infinity }}><Svg {...props} onLayout={event => { setSize(event.nativeEvent.layout); onLayout?.(event); }}>{children}</Svg></ChartScale.Provider>;
}

export function ChartText({ x = 0, y = 0, minChartWidth = 0, ...props }: Omit<TextProps, "transform" | "x" | "y"> & { x?: number | string; y?: number | string; minChartWidth?: number }) {
  const scale = useContext(ChartScale);
  const { fontScale } = useWindowDimensions();
  if (scale.width < minChartWidth * fontScale) return null;
  return <SvgText {...props} {...chartTextProps()} x={x} y={y} transform={`translate(${x} ${y}) scale(${fontScale / scale.x} ${fontScale / scale.y}) translate(${-Number(x)} ${-Number(y)})`}/>;
}
