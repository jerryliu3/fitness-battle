import { useThemeColors } from "../theme";
import { ChartSvg, ChartText } from "../ui/chart-text";

import { useId, useState } from "react";
import { View } from "react-native";
import { Circle, ClipPath, Defs, G, Line, Path, Polyline, Rect } from "react-native-svg";
import {
  formatClockTime,
  personalRecordChart,
  APP_TIMEZONE,
  type ChartDatum,
  type RecordAttempt,
} from "@fitness-battle/shared";
import { ChartScrubber } from "../ui/chart-scrubber";

const date = (at: string) =>
  new Date(at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
export function RecordChart({
  rows,
  selected,
  now,
  onSelect,
}: {
  rows: RecordAttempt[];
  selected?: string | null;
  now: Date;
  onSelect: (id: string) => void;
}) {
const clubColors=useThemeColors();
  const clipId = useId();
  const [scrubbed, setScrubbed] = useState<ChartDatum | undefined>();

  const chart = personalRecordChart(rows, now);
  if (!chart) return null;
  const scrubPoints: ChartDatum[] = chart.points.map(point => ({
    id: point.activityId, x: point.x, y: point.y, label: date(point.startedAt), value: formatClockTime(point.seconds),
  }));
  const activePoint = scrubbed ?? (selected ? scrubPoints.find((p) => p.id === selected) : undefined);
  return (
    <View style={{ marginVertical: 16 }}>
      <ChartScrubber
        hideSummary
        selectedPointId={selected ?? undefined}
        label="Personal record timeline, lower time is faster"
        points={scrubPoints}
        width={chart.width}
        height={chart.height}
        plotTop={16}
        plotBottom={chart.height - 28}
        dotColor={clubColors.chartSeries}
        dotBorderColor={clubColors.surfaceCard}
        onSelectionChange={setScrubbed}
        onSelect={onSelect}
      >
      <ChartSvg
        preserveAspectRatio="none"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        width="100%"
        height={190}
        accessibilityLabel="Personal record timeline, lower time is faster"
      >
        {activePoint && (
          <Defs>
            <ClipPath id={`${clipId}-left`}><Rect x={0} y={0} width={activePoint.x} height={chart.height} /></ClipPath>
            <ClipPath id={`${clipId}-right`}><Rect x={activePoint.x} y={0} width={Math.max(0, chart.width - activePoint.x)} height={chart.height} /></ClipPath>
          </Defs>
        )}
        {chart.ticks.map((t) => (
          <G key={t.seconds}>
            <Line
              x1={chart.left}
              x2={chart.right}
              y1={t.y}
              y2={t.y}
              stroke={clubColors.line}
            />
            <ChartText
              x={chart.left - 8}
              y={t.y + 4}
              textAnchor="end"
              fill={clubColors.muted}
            >
              {formatClockTime(t.seconds)}
            </ChartText>
          </G>
        ))}
        {!!chart.trendPolyline && (
          <Polyline
            points={chart.trendPolyline}
            fill="none"
            stroke={clubColors.secondary}
            strokeWidth={1.75}
            strokeDasharray="3 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {activePoint ? (
          <>
            <G clipPath={`url(#${clipId}-left)`}>
              <Path d={chart.path} fill="none" stroke={clubColors.chartSeries} strokeWidth={2} />
            </G>
            <G clipPath={`url(#${clipId}-right)`} opacity={0.3}>
              <Path d={chart.path} fill="none" stroke={clubColors.chartSeries} strokeWidth={2} />
            </G>
          </>
        ) : (
          <Path d={chart.path} fill="none" stroke={clubColors.chartSeries} strokeWidth={2} />
        )}
        {chart.points.map((pt) => (
          <Circle
            key={pt.activityId}
            cx={pt.x}
            cy={pt.y}
            r={4}
            fill={clubColors.chartSeries}
            stroke={clubColors.surfaceCard}
            strokeWidth={1.5}
            opacity={activePoint && pt.x > activePoint.x ? 0.3 : 1}
          />
        ))}
        <ChartText
          x={chart.points.length===1?(chart.left+chart.right)/2:chart.left}
          textAnchor={chart.points.length===1?"middle":"start"}
          y={chart.height - 8}
          fill={clubColors.muted}
        >
          {date(chart.start)}
        </ChartText>
        <ChartText
          x={chart.right}
          y={chart.height - 8}
          textAnchor="end"
          fill={clubColors.muted}
        >
          {chart.points.length>1?date(chart.end):""}
        </ChartText>
      </ChartSvg>
      </ChartScrubber>
    </View>
  );
}
