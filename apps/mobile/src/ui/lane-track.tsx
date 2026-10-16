import {
  distanceTrackMaxKm,
  effortTrackMax,
  initialsFromName,
  stableFieldLanes,
  type ArenaLane,
} from "@fitness-battle/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SHELL_COLORS } from "../theme";

const HEIGHT = 360;

function markerTop(value: number, ceiling: number): number {
  return HEIGHT - 36 - (value / ceiling) * (HEIGHT - 96);
}

/** Shared track ceilings: kilometers keep 5–10 km past the leader, points step by 20. */
function laneCeiling(unit: string, marks: number[]): number {
  return unit === "km" ? distanceTrackMaxKm(marks) : effortTrackMax(marks);
}

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
  const field = stableFieldLanes(lanes);
  const you = field.find((lane) => lane.you);
  const ghost = lanes.find((lane) => lane.ghost) ?? null;
  const marks = field.map((lane) => lane.values[index] ?? 0);
  if (showGhost && ghost) marks.push(ghost.values[index] ?? 0);
  const ceiling = laneCeiling(unit, marks);
  const youIndex = field.findIndex((lane) => lane.you);

  if (!you || field.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View
        accessibilityLabel="Straight field. Position is weekly distance or effort. Lane number is not rank."
        style={styles.plot}
      >
        {field.map((lane) => {
          const value = lane.values[index] ?? 0;
          const top = markerTop(value, ceiling);
          const radius = lane.you ? 11 : 7;
          return (
            <Pressable
              key={lane.id}
              accessibilityRole="button"
              accessibilityLabel={`${lane.name}, ${value.toFixed(1)} ${unit}`}
              onPress={() => onSelect(lane)}
              style={[styles.lane, lane.you ? styles.laneYou : null]}
            >
              <Text style={lane.you ? styles.headingYou : styles.heading}>
                {lane.you ? "YOU" : initialsFromName(lane.name)}
              </Text>
              <View
                style={[
                  styles.dot,
                  {
                    top: top - radius,
                    width: radius * 2,
                    height: radius * 2,
                    borderRadius: radius,
                    marginLeft: -radius,
                    backgroundColor: lane.you ? SHELL_COLORS.ink : SHELL_COLORS.plum,
                  },
                ]}
              />
            </Pressable>
          );
        })}
        {showGhost && ghost ? (
          <View
            pointerEvents="none"
            style={[
              styles.ghost,
              {
                left: `${((youIndex + 0.5) / field.length) * 100}%`,
                top: markerTop(ghost.values[index] ?? 0, ceiling) - 8,
              },
            ]}
          />
        ) : null}
        <Text style={styles.start}>START</Text>
      </View>
      <Text style={styles.cutoff}>
        {labels[index]} · top of the lane is {ceiling} {unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  plot: {
    height: HEIGHT,
    flexDirection: "row",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#efe4cf",
  },
  lane: {
    flex: 1,
    position: "relative",
    backgroundColor: "#f7efe0",
    borderRightWidth: 1,
    borderRightColor: "rgba(64,35,78,0.08)",
  },
  laneYou: { backgroundColor: "#fff4a8" },
  heading: {
    marginTop: 8,
    textAlign: "center",
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: SHELL_COLORS.muted,
  },
  headingYou: {
    marginTop: 8,
    textAlign: "center",
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: SHELL_COLORS.ink,
  },
  dot: { position: "absolute", left: "50%" },
  ghost: {
    position: "absolute",
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: SHELL_COLORS.ink,
    backgroundColor: "transparent",
  },
  start: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 8,
    textAlign: "center",
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    letterSpacing: 1.2,
    color: SHELL_COLORS.muted,
  },
  cutoff: {
    textAlign: "center",
    color: SHELL_COLORS.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
});
