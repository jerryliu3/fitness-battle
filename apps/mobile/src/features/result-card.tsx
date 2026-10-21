import { useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import {
  APP_TIMEZONE,
  formatVolume,
  sportById,
  type PeriodResult,
  type UnitSystem,
} from "@fitness-battle/shared";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { f } from "../ui/focus";
export function ResultCard({
  result,
  units,
}: {
  result: PeriodResult;
  units: UnitSystem;
}) {
  const [receipt, setReceipt] = useState(false),
    pressed = useRef(new Animated.Value(0)).current,
    reduced = useReducedMotion();
  const tilt = (value: number) => {
    if (reduced) return;
    Animated.spring(pressed, {
      toValue: value,
      useNativeDriver: true,
      speed: 24,
      bounciness: 3,
    }).start();
  };
  const range = `${new Date(result.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })} – ${new Date(Date.parse(result.periodEnd) - 1).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })}`;
  return (
    <Animated.View
      style={{
        marginVertical: 18,
        transform: [
          { perspective: 900 },
          {
            rotateX: pressed.interpolate({
              inputRange: [0, 1],
              outputRange: ["3deg", "0deg"],
            }),
          },
          {
            rotateY: pressed.interpolate({
              inputRange: [0, 1],
              outputRange: ["-3deg", "0deg"],
            }),
          },
        ],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${receipt ? "Hide" : "View"} ${sportById(result.sport).name} result receipt`}
        accessibilityState={{ expanded: receipt }}
        onPressIn={() => tilt(1)}
        onPressOut={() => tilt(0)}
        onPress={() => setReceipt(!receipt)}
        style={{
          padding: 24,
          gap: 14,
          borderRadius: 20,
          backgroundColor: "#f7e5a3",
          borderWidth: 1,
          borderBottomWidth: 5,
          borderRightWidth: 3,
          borderColor: "#c3a655",
          minHeight: 260,
        }}
      >
        <Text style={f.kicker}>
          {sportById(result.sport).name} ·{" "}
          {result.track === "verified" ? "GPS" : "Open"} · {range}
        </Text>
        {receipt ? (
          <>
            <Text style={f.h2}>The receipt</Text>
            <Text style={f.copy}>
              {formatVolume(
                result.sport,
                result.distanceM,
                result.movingSec,
                units,
              )}{" "}
              · {result.effort.toFixed(1)} effort
            </Text>
            <Text style={f.copy}>
              {result.eloBefore} → {result.eloAfter} effort score
            </Text>
            <Text style={f.small}>
              {result.frozen
                ? "Weekly bonus held by freeze"
                : "Weekly placement bonus"}{" "}
              · {APP_TIMEZONE}
            </Text>
          </>
        ) : (
          <>
            <View style={[f.row, { alignItems: "baseline" }]}>
              <Text style={[f.massive, { fontSize: 64 }]}>#{result.place}</Text>
              <Text style={f.copy}>of {result.fieldSize}</Text>
            </View>
            <Text style={f.copy}>
              {formatVolume(
                result.sport,
                result.distanceM,
                result.movingSec,
                units,
              )}
            </Text>
            <Text style={f.rowTitle}>
              {result.eloAfter} effort score · +
              {Math.max(0, result.eloAfter - result.eloBefore)}
            </Text>
          </>
        )}
        <Text style={[f.small, { textAlign: "right" }]}>
          {receipt ? "Back to result ↻" : "View receipt ↻"}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
