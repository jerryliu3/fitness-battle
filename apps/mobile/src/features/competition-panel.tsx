import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { useThemeColors } from "../theme";
import { AppText } from "../ui/section";
import { AppIcon } from "../ui/app-icon";
import { useReducedMotion } from "../ui/use-reduced-motion";

/** Swap faces edge-on while retaining standings selection and layout state. */
export function CompetitionPanel({ active, standings, activity }: { active: boolean; standings: ReactNode; activity(visible: boolean): ReactNode }) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const [feed, setFeed] = useState(false);
  const [busy, setBusy] = useState(false);
  const turning = useRef(false);
  const generation = useRef(0);
  const angle = useRef(new Animated.Value(0)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    generation.current++;
    animation.current?.stop();
    angle.setValue(0);
    turning.current = false;
    setBusy(false);
    if (!active) setFeed(false);
    return () => { generation.current++; animation.current?.stop(); };
  }, [active, reduced, angle]);
  function flip() {
    if (!active || turning.current) return;
    if (reduced) { setFeed(value => !value); return; }
    turning.current = true;
    setBusy(true);
    const request = ++generation.current;
    const turn = (toValue: number, done: () => void) => {
      animation.current = Animated.timing(angle, { toValue, duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
      animation.current.start(({ finished }) => { if (finished && generation.current === request) done(); });
    };
    turn(90, () => {
      setFeed(value => !value);
      angle.setValue(-90);
      turn(0, () => { turning.current = false; setBusy(false); });
    });
  }
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <AppText role="heading" accessibilityRole="header">{feed ? "Activity" : "Standings"}</AppText>
      <Pressable accessibilityRole="button" accessibilityLabel={feed ? "Show standings" : "Show activity feed"} disabled={busy} onPress={flip} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}><AppIcon name="sync" size={18} /><AppText role="label">{feed ? "Standings" : "Activity"}</AppText></Pressable>
    </View>
    <Animated.View style={{ backfaceVisibility: "hidden", transform: [{ perspective: 1000 }, { rotateY: angle.interpolate({ inputRange: [-90, 0, 90], outputRange: ["-90deg", "0deg", "90deg"] }) }] }}>
      <View style={{ display: feed ? "none" : "flex" }} accessibilityElementsHidden={feed} importantForAccessibility={feed ? "no-hide-descendants" : "auto"}>{standings}</View>
      <View style={{ display: feed ? "flex" : "none" }} accessibilityElementsHidden={!feed} importantForAccessibility={feed ? "auto" : "no-hide-descendants"}>{activity(active && feed)}</View>
    </Animated.View>
  </View>;
}
