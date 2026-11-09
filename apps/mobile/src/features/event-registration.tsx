import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { COMPETE_ART_COLORS, competeNow, eventRegistration, type CompeteEvent, type CompeteState } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { FocusButton } from "../ui/focus";
import { WaveCountdown } from "../ui/wave-countdown";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { useThemeColors } from "../theme";
import { CompeteIcon, EventArt } from "./compete-home-sections";

export function EventRegistration({ state, event, registered, error, onClaim, onView }: { state: CompeteState; event: CompeteEvent; registered: boolean; error?: string; onClaim(): void; onView(): void }) {
  const c = useThemeColors();
  const tint = `${COMPETE_ART_COLORS[event]}33`;
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [back, setBack] = useState(registered);
  const rotation = useRef(new Animated.Value(0)).current;
  const stamp = useRef(new Animated.Value(registered ? 1 : 0)).current;
  const now = competeNow(state);
  const detail = eventRegistration(state, event, now);
  useEffect(() => {
    if (!registered || reduced) {
      setBack(registered); rotation.setValue(0); stamp.setValue(registered ? 1 : 0);
      return;
    }
    let cancelled = false;
    const flip = Animated.timing(rotation, { toValue: 90, duration: 240, useNativeDriver: true });
    flip.start(({ finished }) => {
      if (!finished || cancelled) return;
      setBack(true);
      rotation.setValue(-90);
      Animated.sequence([
        Animated.timing(rotation, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.delay(100),
        Animated.spring(stamp, { toValue: 1, speed: 22, bounciness: 5, useNativeDriver: true }),
      ]).start();
    });
    return () => { cancelled = true; rotation.stopAnimation(); stamp.stopAnimation(); };
  }, [registered, reduced, rotation, stamp]);
  return <View style={{ gap: 20 }}>
    <View style={{ padding: 20, gap: 12, borderRadius: 24, backgroundColor: tint, overflow: "hidden" }}><EventArt event={event} feature /><AppText role="heading">{detail.name} Meet</AppText><AppText>{detail.dateRange}</AppText><AppText secondary>{detail.description}</AppText></View>
    <AppText role="heading">Event details</AppText>
    <View style={{ gap: 10 }}>{[...detail.details, { title: "Schedule & renewal", summary: `Ends ${detail.ends}`, detail: detail.renewal }].map((item, i) => <Pressable key={item.title} accessibilityRole="button" accessibilityState={{ expanded: expanded === i }} onPress={() => setExpanded(expanded === i ? null : i)} style={{ padding: 16, minHeight: 72, gap: 8, borderRadius: 20, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: tint }}><CompeteIcon name={(["time", "crew", "trophy", event, "time"] as const)[i]!} /></View><View style={{ flex: 1, gap: 4 }}><AppText role="label">{item.title}</AppText><AppText role="caption" secondary>{item.summary}</AppText></View><AppText accessible={false}>{expanded === i ? "−" : "＋"}</AppText></View>
      {expanded === i && <AppText role="caption" secondary>{item.detail}</AppText>}
    </Pressable>)}</View>
    <Animated.View style={{ borderRadius: 24, backgroundColor: tint, overflow: "hidden", transform: [{ perspective: 1200 }, { rotateY: rotation.interpolate({ inputRange: [-90, 90], outputRange: ["-90deg", "90deg"] }) }] }}>
      {!back && <View style={{ minHeight: 90, padding: 24, gap: 20, backgroundColor: c.ink }}><EventArt event={event} feature /><View style={{ padding: 10, borderRadius: 16, alignSelf: "flex-start", backgroundColor: c.card }}><CompeteIcon name={event} size={32} /></View></View>}
      <View style={{ padding: 24, gap: 18, minHeight: 0 }}>
        {back ? <>
          <AppText role="display" accessibilityRole="header">You’re on the start list.</AppText>
          <View style={{ gap: 6 }}><AppText role="caption" secondary>YOUR WAVE STARTS IN</AppText><WaveCountdown start={detail.start} now={now} prominent /></View>
          <AppText role="caption" secondary>Starts {detail.starts}</AppText>
          <Animated.View accessibilityLabel={`${detail.name}, ${detail.dateRange}, ${detail.stampYear}`} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 2, borderRadius: 10, borderColor: c.ink, opacity: stamp, transform: [{ rotate: "-5deg" }, { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [1.5, 1] }) }] }}><CompeteIcon name={event} size={30} /><View style={{ flexShrink: 1, gap: 4 }}><AppText role="label">{detail.name}</AppText><AppText role="caption">{detail.dateRange} · {detail.stampYear}</AppText></View></Animated.View>
        </> : <>
          <AppText role="heading" accessibilityRole="header">{detail.name} Meet</AppText>
          <AppText role="label">Starts {detail.starts}</AppText>
        </>}
        <View style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: c.muted, paddingTop: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}><View accessible={false} style={{ flexDirection: "row", gap: 3 }}>{Array.from({ length: 12 }, (_, i) => <View key={i} style={{ width: i % 3 === 0 ? 4 : 2, height: 24, backgroundColor: c.ink }} />)}</View></View>
        <FocusButton label={back ? `View ${Date.parse(detail.start) > now.getTime() ? "upcoming race" : "race"} →` : "Claim your spot ↗"} disabled={registered && !back} onPress={back ? onView : onClaim} />
      </View>
    </Animated.View>
    {error && <AppText role="caption" accessibilityLiveRegion="polite">{error}</AppText>}

  </View>;
}
