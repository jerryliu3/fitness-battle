import type { ArenaLane } from "@fitness-battle/shared";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import { SHELL_COLORS } from "../theme";

export function LaneTrack({
  lanes,
  labels,
  unit,
  showGhost,
  index,
  onSelect,
}: {
  lanes: ArenaLane[];
  labels: [string, string, string];
  unit: string;
  showGhost: boolean;
  index: number;
  onSelect: (lane: ArenaLane) => void;
}) {
  const [width, setWidth] = useState(320);
  const visible = lanes.filter((lane) => showGhost || !lane.ghost);
  const height = 360;
  const peak = Math.max(1, ...visible.map((lane) => lane.values[index] ?? 0));
  const laneWidth = visible.length > 0 ? (width - 36) / visible.length : width;

  return (
    <View
      accessibilityLabel="Lane track"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <Svg width={width} height={height}>
        <Line
          x1={28}
          y1={16}
          x2={28}
          y2={height - 28}
          stroke={SHELL_COLORS.line}
          strokeWidth={2}
        />
        {visible.map((lane, laneIndex) => {
          const value = lane.values[index] ?? 0;
          const barHeight = ((height - 48) * value) / peak;
          const x = 36 + laneIndex * laneWidth + laneWidth * 0.18;
          const barWidth = laneWidth * 0.64;
          const y = height - 28 - barHeight;
          const fill = lane.you
            ? SHELL_COLORS.tennis
            : lane.ghost
              ? SHELL_COLORS.starEmber
              : SHELL_COLORS.plum;
          return (
            <Rect
              key={lane.id}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 2)}
              rx={8}
              fill={fill}
              opacity={lane.ghost ? 0.85 : 1}
              onPress={() => onSelect(lane)}
            />
          );
        })}
        <SvgText x={4} y={20} fill={SHELL_COLORS.muted} fontSize={11}>
          {peak.toFixed(1)}
        </SvgText>
        <SvgText x={4} y={height - 16} fill={SHELL_COLORS.muted} fontSize={11}>
          0
        </SvgText>
      </Svg>
      <View style={styles.names}>
        {visible.map((lane) => (
          <Pressable
            key={lane.id}
            style={styles.name}
            accessibilityRole="button"
            accessibilityLabel={`${lane.name}, ${(lane.values[index] ?? 0).toFixed(1)} ${unit}`}
            onPress={() => onSelect(lane)}
          >
            <Text style={[styles.nameText, lane.you ? styles.you : null]} numberOfLines={1}>
              {lane.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.cutoff}>
        {labels[index]} · {unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  names: { flexDirection: "row", paddingLeft: 36 },
  name: { flex: 1, minHeight: 44, justifyContent: "center" },
  nameText: {
    textAlign: "center",
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: SHELL_COLORS.muted,
  },
  you: { color: SHELL_COLORS.ink, fontFamily: "DMSans_700Bold" },
  cutoff: {
    textAlign: "center",
    color: SHELL_COLORS.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    marginTop: 4,
  },
});
