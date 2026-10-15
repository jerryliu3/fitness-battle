import { sportById, type BoardRow } from "@fitness-battle/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

export function LaneBoard({
  rows,
  gps,
  onSelect,
}: {
  rows: BoardRow[];
  gps: boolean;
  onSelect: (row: BoardRow) => void;
}) {
  const peak = Math.max(1, ...rows.map((row) => (gps ? row.distanceM / 1000 : row.effort)));
  return (
    <View style={styles.track} accessibilityLabel="2D lane standings">
      {rows.map((row) => {
        const value = gps ? row.distanceM / 1000 : row.effort;
        const height = 36 + (value / peak) * 180;
        return (
          <Pressable key={row.id} accessibilityRole="button" onPress={() => onSelect(row)} style={styles.lane}>
            <Text style={styles.value}>{value.toFixed(1)}</Text>
            <View style={[styles.bar, { height }, row.you && styles.you]} />
            <Text style={styles.name} numberOfLines={1}>
              {row.you ? "You" : row.name.split(" ")[0]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function laneUnit(sport: Parameters<typeof sportById>[0]) {
  return sportById(sport).gps ? "km" : "pts";
}

const styles = StyleSheet.create({
  track: {
    minHeight: 280,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    backgroundColor: "#efe6cf",
    borderRadius: 18,
    padding: 12,
    gap: 8,
  },
  lane: { flex: 1, alignItems: "center", gap: 6 },
  bar: { width: "70%", borderRadius: 12, backgroundColor: "#c9b7d4", minHeight: 36 },
  you: { backgroundColor: colors.tennis },
  value: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 13 },
  name: { fontFamily: fonts.bodyMedium, color: colors.plum, fontSize: 12 },
});
