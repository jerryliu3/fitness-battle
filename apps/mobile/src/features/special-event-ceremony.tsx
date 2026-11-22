import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  formatSpecialEventVolume,
  specialEventSideCode,
  specialEventSideLabel,
  type SpecialEventCeremonyData,
  type SpecialEventSport,
  type UnitSystem,
} from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { FocusButton } from "../ui/focus";
import { AppText } from "../ui/section";

export function SpecialEventCeremony({
  ceremony,
  sport,
  units,
  onDone,
}: {
  ceremony: SpecialEventCeremonyData;
  sport: SpecialEventSport;
  units: UnitSystem;
  onDone(): void;
}) {
  const c = useThemeColors();
  const [phase, setPhase] = useState<"climbing" | "cutting" | "verdict">("climbing");
  const [progress, setProgress] = useState(0);
  const cutLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setPhase("climbing");
    setProgress(0);
    cutLineAnim.setValue(0);
    const started = Date.now();
    const timer = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / 2500);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p >= 1) clearInterval(timer);
    }, 32);
    const t1 = setTimeout(() => {
      setPhase("cutting");
      Animated.timing(cutLineAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, 2700);
    const t2 = setTimeout(() => setPhase("verdict"), 4100);
    return () => {
      clearInterval(timer);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [ceremony.roundNumber, ceremony.headline, cutLineAnim]);

  const maxScore = Math.max(1, ...ceremony.sides.map((s) => s.score));

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onDone}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(18, 20, 26, 0.96)", justifyContent: "center", padding: 24 }}>
        {phase !== "verdict" ? (
          <View style={{ gap: 14 }}>
            <View style={{ alignItems: "center", gap: 4 }}>
              <AppText role="caption" style={{ color: c.white }}>{ceremony.badge}</AppText>
              <AppText role="heading" style={{ color: c.white }}>
                {phase === "climbing" ? "Finalizing round distances…" : "Applying round cut…"}
              </AppText>
            </View>
            <View style={{ gap: 8 }}>
              {ceremony.sides.map((side, idx) => {
                const liveScore = side.score * progress;
                const dropped = ceremony.isCutFormat && phase === "cutting" && idx + 1 > ceremony.advanceCount;
                const widthPct = Math.max(4, Math.round((liveScore / maxScore) * 100));
                return (
                  <View key={side.sideId} style={{ gap: 4 }}>
                    <View
                      style={{
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 12,
                        opacity: dropped ? 0.38 : 1,
                        backgroundColor: side.isYou ? "rgba(183, 242, 85, 0.16)" : "rgba(255, 255, 255, 0.06)",
                        borderWidth: 1,
                        borderColor: side.isYou ? c.tennis : "rgba(255, 255, 255, 0.14)",
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                        <AppText role="caption" style={{ color: c.white }}>
                          {side.place}. {specialEventSideCode(side)} · {specialEventSideLabel(side)}{side.isYou ? " · You" : ""}
                        </AppText>
                        <AppText role="caption" style={{ color: c.white }}>
                          {dropped ? "OUT" : formatSpecialEventVolume(sport, liveScore, units)}
                        </AppText>
                      </View>
                      <View style={{ height: 6, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
                        <View style={{ width: `${widthPct}%`, height: "100%", backgroundColor: side.isYou ? c.tennis : c.white }} />
                      </View>
                    </View>
                    {ceremony.isCutFormat && phase === "cutting" && ceremony.sides.length > ceremony.advanceCount && idx + 1 === ceremony.advanceCount ? (
                      <Animated.View
                        style={{
                          width: cutLineAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                          borderBottomWidth: 2,
                          borderStyle: "dashed",
                          borderColor: c.statusError,
                          paddingVertical: 4,
                          alignItems: "center",
                          overflow: "hidden",
                        }}
                      >
                        <AppText role="caption" style={{ color: c.statusError }}>
                          ELIMINATION CUT · TOP {ceremony.advanceCount} ADVANCE
                        </AppText>
                      </Animated.View>
                    ) : null}
                  </View>
                );
              })}
            </View>
            <Pressable accessibilityRole="button" onPress={() => setPhase("verdict")} style={{ alignSelf: "center", padding: 10 }}>
              <AppText role="caption" style={{ color: c.white }}>Skip</AppText>
            </Pressable>
          </View>
        ) : (
          <View style={{ alignItems: "center", gap: 14 }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: ceremony.tone === "lime" ? c.tennis : ceremony.tone === "danger" ? c.statusError : c.podiumGold,
              }}
            >
              <AppText role="caption" style={{ color: ceremony.tone === "danger" ? c.textOnError : c.ink }}>
                {ceremony.badge}
              </AppText>
            </View>
            <AppText role="display" style={{ color: c.white, textAlign: "center" }}>{ceremony.headline}</AppText>
            <AppText role="body" style={{ color: c.white, textAlign: "center" }}>{ceremony.detail}</AppText>
            <View style={{ width: "100%" }}>
              <FocusButton label={ceremony.ctaLabel} onPress={onDone} />
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
