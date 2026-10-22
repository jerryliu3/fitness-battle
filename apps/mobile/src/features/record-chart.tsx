import { View, Text } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import {
  formatClockTime,
  personalRecordChart,
  APP_TIMEZONE,
  type RecordAttempt,
} from "@fitness-battle/shared";
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
  const chart = personalRecordChart(rows, now);
  if (!chart) return null;
  return (
    <View style={{ marginVertical: 16 }}>
      <Svg
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
              stroke="#e0e5dc"
            />
            <SvgText
              x={chart.left - 8}
              y={t.y + 4}
              textAnchor="end"
              fill="#616c63"
              fontSize={10}
            >
              {formatClockTime(t.seconds)}
            </SvgText>
          </G>
        ))}
        <Path d={chart.path} fill="none" stroke="#282f2c" strokeWidth={2} />
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
              fill={selected === p.activityId ? "#282f2c" : "#fff"}
              stroke="#282f2c"
              strokeWidth={2}
            />
          </G>
        ))}
        <SvgText
          x={chart.left}
          y={chart.height - 8}
          fill="#616c63"
          fontSize={10}
        >
          {date(chart.start)}
        </SvgText>
        <SvgText
          x={chart.right}
          y={chart.height - 8}
          textAnchor="end"
          fill="#616c63"
          fontSize={10}
        >
          {date(now.toISOString())}
        </SvgText>
      </Svg>
    </View>
  );
}
