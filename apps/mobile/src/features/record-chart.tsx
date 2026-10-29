import { useThemeColors } from "../theme";
import { ChartSvg, ChartText } from "../ui/chart-text";

import { chartTextProps } from "../ui/section";
import { SHELL_COLORS as clubColors } from "@fitness-battle/shared";
import { View, Text } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import {
  formatClockTime,
  personalRecordChart,
  APP_TIMEZONE,
  type RecordAttempt,
} from "@fitness-battle/shared";
import { ChartScrubber } from "../ui/chart-scrubber";
import { f } from "../ui/focus";
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
  const clubColors = useThemeColors();

  const chart = personalRecordChart(rows, now);
  if (!chart) return null;
  return (
    <View style={{ marginVertical: 16 }}>
      <ChartScrubber
        hideSummary
        label="Personal record timeline, lower time is faster"
        points={chart.points.map(point => ({
          id: point.activityId, x: point.x, y: point.y, label: date(point.startedAt), value: formatClockTime(point.seconds),
        }))}
        width={chart.width}
        height={chart.height}
        plotTop={16}
        plotBottom={chart.height - 28}
        onSelect={onSelect}
      >
      <ChartSvg
        preserveAspectRatio="none"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        width="100%"
        height={190}
        accessibilityLabel="Personal record timeline, lower time is faster"
      >
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
        <Path d={chart.path} fill="none" stroke={clubColors.ink} strokeWidth={2} />
        {chart.points.map((p) => (
          <G
            key={p.activityId}
            onPress={() => onSelect(p.activityId)}
            accessibilityLabel={`${date(p.startedAt)}, ${formatClockTime(p.seconds)}`}
          >
            <Circle cx={p.x} cy={p.y} r={20} fill="transparent" />
            <Circle
              cx={p.x}
              cy={p.y}
              r={selected === p.activityId ? 6 : 4}
              fill={selected === p.activityId ? clubColors.ink : "#fff"}
              stroke={clubColors.ink}
              strokeWidth={2}
            />
          </G>
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
