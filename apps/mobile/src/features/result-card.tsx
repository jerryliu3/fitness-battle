import { useFocusStyles } from "../ui/focus";
import { textStyle, SectionHeader, AppText  } from "../ui/section";
import { useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import {
  APP_TIMEZONE,
  formatEloDelta,
  formatVolume,
  formatEffort,
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
  const f = useFocusStyles();

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
        accessibilityLabel={`${receipt ? "Hide" : "View"} ${sportById(result.sport).name} result receipt. ${range}. ${result.track === "verified" ? "GPS" : "Open"}. Place ${result.place} of ${result.fieldSize}. ${formatVolume(result.sport, result.distanceM, result.movingSec, units)}. ${result.eloBefore} to ${result.eloAfter} effort score, ${formatEloDelta(result.eloBefore, result.eloAfter)}. ${result.frozen ? "Weekly score adjustment held by freeze." : "Weekly score adjustment."}`}
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
            <SectionHeader title="The receipt"/>
            <AppText role="body" secondary >
              {formatVolume(
                result.sport,
                result.distanceM,
                result.movingSec,
                units,
              )}{" "}
              · {formatEffort(result.effort)} effort
            </AppText>
            <AppText role="body" secondary >
              {result.eloBefore} → {result.eloAfter} effort score
            </AppText>
            <AppText role="caption" secondary >
              {result.frozen
                ? "Weekly score adjustment held by freeze"
                : "Weekly score adjustment"}{" "}
              · Eastern time
            </AppText>
          </>
        ) : (
          <>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: 8,
                paddingTop: 6,
                paddingBottom: 4,
              }}
            >
              {(
                [
                  { step: 2, label: "2nd", height: 52 },
                  { step: 1, label: "1st", height: 68 },
                  { step: 3, label: "3rd", height: 42 },
                ] as const
              ).map((podium) => {
                const isYou = result.place === podium.step;
                return (
                  <View
                    key={podium.step}
                    style={{
                      flex: 1,
                      height: podium.height,
                      borderRadius: 12,
                      backgroundColor: isYou ? "#142b3b" : "#ffffff99",
                      borderWidth: isYou ? 2 : 1,
                      borderColor: isYou ? "#142b3b" : "#c3a65566",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                    }}
                  >
                    <Text
                      style={[
                        textStyle("label"),
                        { color: isYou ? "#f7c948" : "#142b3b" },
                      ]}
                    >
                      {podium.label}
                    </Text>
                    {isYou ? (
                      <Text
                        style={[
                          textStyle("caption"),
                          { color: "#ffffff" },
                        ]}
                      >
                        YOU
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "stretch" }}>
              <View style={{ flex: 1.1, backgroundColor: "#ffffff88", borderRadius: 16, padding: 16, justifyContent: "center" }}>
                <Text style={f.massive}>#{result.place}</Text>
                <AppText role="body" secondary >of {result.fieldSize}</AppText>
              </View>
              <View style={{ flex: 1, gap: 10 }}>
                <AppText role="body" secondary style={{ padding: 12, backgroundColor: "#ffffffbb", borderRadius: 14 }}>{formatVolume(result.sport, result.distanceM, result.movingSec, units)}</AppText>
                <AppText role="label" style={{ padding: 12, backgroundColor: "#fff5d1", borderRadius: 14 }}>{result.eloAfter} effort score · {formatEloDelta(result.eloBefore,result.eloAfter)}</AppText>
              </View>
            </View>
          </>
        )}
        <AppText role="caption" secondary style={{ textAlign: "right" }}>
          {receipt ? "View result ↻" : "View receipt ↻"}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}
