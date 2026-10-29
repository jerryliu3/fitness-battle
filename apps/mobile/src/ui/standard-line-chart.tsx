import { useMemo } from "react";
import { Animated, View } from "react-native";
import {
  Defs, ClipPath, Circle,
  G,
  Line,
  Path,
  Polyline,
  Rect,
} from "react-native-svg";
import {
  SHELL_COLORS as c,
  buildStandardChartGeometry,
} from "@fitness-battle/shared";
import { ChartSvg, ChartText } from "./chart-text";

const AnimatedRect=Animated.createAnimatedComponent(Rect);
export interface StandardLineChartProps {
  revealProgress?: Animated.Value;
  values: number[];
  xLabels?: [string, string, string]; // [start, mid, end]
  formatY?: (value: number) => string;
  selectedIdx?: number;
  onSelectIdx?: (index: number) => void;
  stroke?: string;
  height?: number;
  corridor?: {
    high: number[];
    low: number[];
  };
  accessibilityLabel?: string;
  ariaLabel?: string;
}

export function StandardLineChart({
  values,
  revealProgress,
  xLabels,
  formatY = (v) => `${Math.round(v)}`,
  selectedIdx,
  onSelectIdx,
  stroke = c.fieldTeal,
  height = 150,
  corridor,
  accessibilityLabel,
  ariaLabel,
}: StandardLineChartProps) {
  const geo = useMemo(
    () => buildStandardChartGeometry(values, 340, height, corridor),
    [values, height, corridor],
  );

  if (values.length < 2) return null;

  const activeIdx =
    selectedIdx !== undefined && selectedIdx >= 0 && selectedIdx < geo.points.length
      ? selectedIdx
      : undefined;
  const activePt = activeIdx !== undefined ? geo.points[activeIdx] : undefined;

  return (
    <View style={{ height, marginVertical: 8 }}>
      <ChartSvg
        width="100%"
        height={height}
        viewBox={`0 0 340 ${height}`}
        preserveAspectRatio="none"
        accessible
        accessibilityLabel={accessibilityLabel ?? ariaLabel}
      >
        {/* Horizontal gridlines */}
        {[
          [geo.yTop, geo.yMax],
          [geo.yMidPos, geo.yMid],
          [geo.yBottom, geo.yMin],
        ].map(([y, val]) => (
          <G key={y}>
            <Line
              x1={geo.xStart}
              x2={geo.xEnd}
              y1={y}
              y2={y}
              stroke={c.line}
              strokeDasharray="3 3"
            />
            <ChartText
              x={geo.xStart - 8}
              y={y + 3}
              textAnchor="end"
              fill={c.muted}
            >
              {formatY(val)}
            </ChartText>
          </G>
        ))}

        {/* Vertical baseline */}
        <Line
          x1={geo.xStart}
          x2={geo.xStart}
          y1={geo.yTop}
          y2={geo.yBottom}
          stroke={c.line}
        />

        <Defs><ClipPath id="onboarding-draw"><AnimatedRect x={0} y={0} height={height} width={revealProgress?revealProgress.interpolate({inputRange:[0,1],outputRange:[0,340]}):340}/></ClipPath></Defs><G clipPath={revealProgress?"url(#onboarding-draw)":undefined}>
        {/* Corridor fill */}
        {geo.corridorPath && (
          <Path d={geo.corridorPath} fill={stroke} opacity={0.16} />
        )}

        {/* Area fill */}
        <Path d={geo.areaPath} fill={stroke} opacity={0.12} />

        {/* Main trend line */}
        <Polyline
          points={geo.polyline}
          fill="none"
          stroke={stroke}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data point dots */}
        {geo.points.map((p, i) => (
          <Circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r={i === activeIdx ? 5 : 2.5}
            fill={i === activeIdx ? stroke : c.card}
            stroke={stroke}
            strokeWidth={2}
          />
        ))}

        {/* Active cursor / crosshair */}
        {activePt && (
          <Line
            x1={activePt.x}
            x2={activePt.x}
            y1={geo.yTop}
            y2={geo.yBottom}
            stroke={c.line}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        </G>
        {/* X-axis date labels */}
        {xLabels && (
          <>
            <ChartText
              x={geo.xStart}
              y={height - 8}
              textAnchor="start"
              fill={c.muted}
            >
              {xLabels[0]}
            </ChartText>
            {xLabels[1] && (
              <ChartText
                minChartWidth={260}
                x={geo.xMid}
                y={height - 8}
                textAnchor="middle"
                fill={c.muted}
              >
                {xLabels[1]}
              </ChartText>
            )}
            <ChartText
              x={geo.xEnd}
              y={height - 8}
              textAnchor="end"
              fill={c.muted}
            >
              {xLabels[2]}
            </ChartText>
          </>
        )}

        {/* Transparent tap / click columns */}
        {onSelectIdx &&
          geo.points.map((p, i) => (
            <Rect
              key={`col-${i}`}
              x={p.x - (geo.xEnd - geo.xStart) / (values.length * 2)}
              y={geo.yTop}
              width={(geo.xEnd - geo.xStart) / values.length}
              height={geo.yBottom - geo.yTop}
              fill="transparent"
              onPress={() => onSelectIdx(i)}
            />
          ))}
      </ChartSvg>
    </View>
  );
}
