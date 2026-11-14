import { useThemeColors } from "../theme";
import { ChartSvg, ChartText } from "../ui/chart-text";

import { useId, useState } from "react";
import { View } from "react-native";
import { ClipPath, Defs, G, Line, Path, Polyline, Rect } from "react-native-svg";
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
  selected: string;
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
  const activePoint = scrubbed ?? scrubPoints.find((p) => p.id === selected);
  const trendPolyline = chart.points.length >= 2
    ? chart.points
        .map((p, i) => {
          const pMs = Date.parse(p.startedAt);
          let sumY = 0;
          let count = 0;
          for (let j = i; j >= 0; j--) {
            const jMs = Date.parse(chart.points[j]!.startedAt);
            if (Number.isFinite(pMs) && Number.isFinite(jMs) ? pMs - jMs <= 30 * 86400000 : i - j < 30) {
              sumY += chart.points[j]!.y;
              count += 1;
            } else {
              break;
            }
          }
          return `${p.x.toFixed(1)},${(count > 0 ? sumY / count : p.y).toFixed(1)}`;
        })
        .join(" ")
    : "";
  return (
    <View style={{ marginVertical: 16 }}>
      <ChartScrubber
        hideSummary
        selectedPointId={selected}
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
        {!!trendPolyline && (
          <Polyline
            points={trendPolyline}
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
