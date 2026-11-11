import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, View, useWindowDimensions } from "react-native";
import { COMPETE_ART_COLORS, competeNow, eventRegistration, entryBarcode, registrationDetailCards, type CompeteEvent, type CompeteState } from "@fitness-battle/shared";
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
  const [step, setStep] = useState(registered ? 2 : 0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [ticketHeight, setTicketHeight] = useState(0);
  const [detailsHeight, setDetailsHeight] = useState(0);
  const rotation = useRef(new Animated.Value(registered ? 180 : 0)).current;
  const stamp = useRef(new Animated.Value(0)).current;
  const entry = useRef(new Animated.Value(0)).current;
  const stepMotion = useRef(new Animated.Value(1)).current;
  const { height } = useWindowDimensions();
  const claimed = registered;
  useEffect(() => { entry.setValue(reduced ? 1 : 0); Animated.timing(entry, { toValue: 1, delay: reduced ? 0 : 800, duration: reduced ? 0 : 600, useNativeDriver: true }).start(); return () => entry.stopAnimation(); }, [entry, reduced]);
  const transitioning = useRef(false);
  const nextStep = () => {
    if (transitioning.current) return;
    transitioning.current = true;
    Animated.timing(stepMotion, { toValue: 0, duration: reduced ? 0 : 110, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setStep(value => value + 1);
      Animated.timing(stepMotion, { toValue: 1, duration: reduced ? 0 : 190, useNativeDriver: true }).start(() => { transitioning.current = false; });
    });
  };
  useEffect(() => () => { stepMotion.stopAnimation(); transitioning.current = false; }, [stepMotion]);
  const now = competeNow(state);
  const detail = eventRegistration(state, event, now);
  const details = registrationDetailCards(detail);
  const barcode = entryBarcode(`${event}:${detail.start}`);
  const reservedHeight = Math.max(Math.min(540, height * .65), ticketHeight + 72, detailsHeight + 72);
  useEffect(() => {
    if (error) setClaiming(false);
  }, [error]);
  useEffect(() => {
    if (step !== 2 || !claimed) {
      if (!claimed) {
        rotation.setValue(0);
        stamp.setValue(0);
      }
      return;
    }
    stamp.setValue(0);
    const flipNeeded = (rotation as any)._value < 90;
    const animations: Animated.CompositeAnimation[] = [];
    if (flipNeeded) {
      animations.push(
        Animated.timing(rotation, {
          toValue: 180,
          duration: reduced ? 0 : 450,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      );
    } else {
      rotation.setValue(180);
    }
    animations.push(
      Animated.sequence([
        Animated.delay(reduced ? 0 : flipNeeded ? 100 : 150),
        Animated.spring(stamp, {
          toValue: 1,
          friction: 6,
          tension: 110,
          useNativeDriver: true,
        }),
      ]),
    );
    const motion = Animated.sequence(animations);
    motion.start();
    return () => motion.stop();
  }, [step, claimed, reduced, rotation, stamp]);
  const frontOpacity = rotation.interpolate({ inputRange: [0, 89, 90, 180], outputRange: [1, 1, 0, 0] });
  const backOpacity = rotation.interpolate({ inputRange: [0, 90, 91, 180], outputRange: [0, 0, 1, 1] });
  const face = (back: boolean) => <Animated.View pointerEvents={back === claimed ? "auto" : "none"} accessibilityElementsHidden={back !== claimed} onLayout={e => setTicketHeight(value => Math.max(value, e.nativeEvent.layout.height))} style={{ position: "absolute", top: 0, left: 0, right: 0, borderRadius: 24, backgroundColor: tint, overflow: "hidden", backfaceVisibility: "hidden", opacity: back ? backOpacity : frontOpacity, transform: [{ perspective: 1200 }, { rotateY: rotation.interpolate({ inputRange: [0, 180], outputRange: back ? ["180deg", "360deg"] : ["0deg", "180deg"] }) }] }}>
      {!back && <View style={{ minHeight: 90, padding: 24, gap: 20, backgroundColor: c.ink }}><EventArt event={event} feature /><View style={{ padding: 10, borderRadius: 16, alignSelf: "flex-start", backgroundColor: c.card }}><CompeteIcon name={event} size={32} /></View></View>}
      <View style={{ padding: 20, gap: 12, minHeight: 0 }}>
        {back ? <>
          <AppText role="display" accessibilityRole="header">You’re on the start list.</AppText>
          <View style={{ gap: 6 }}><AppText role="caption" secondary>YOUR WAVE STARTS IN</AppText>{step === 2 ? <WaveCountdown start={detail.start} now={now} prominent /> : <AppText role="display">00:00:00</AppText>}</View>
          <View style={{ transform: [{ rotate: "-5deg" }], alignSelf: "flex-start" }}>
            <Animated.View accessibilityLabel={`${detail.name}, ${detail.dateRange}, ${detail.stampYear}`} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 2, borderRadius: 10, borderColor: c.ink, opacity: stamp.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }), transform: [{ scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }) }] }}>
              <CompeteIcon name={event} size={30} />
              <View style={{ flexShrink: 1, gap: 4 }}><AppText role="label">{detail.name}</AppText><AppText role="caption">{detail.dateRange} · {detail.stampYear}</AppText></View>
            </Animated.View>
          </View>
        </> : <>
          <AppText role="heading" accessibilityRole="header">{detail.name} Meet</AppText><AppText role="label">{detail.details[2]!.summary} league</AppText>
          <AppText role="label">Starts {detail.starts}</AppText>
        </>}
        <View style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: c.muted, paddingTop: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}><View accessible={false} style={{ flexDirection: "row", flex: 1, gap: 2 }}>{barcode.map((width, i) => <View key={i} style={{ flex: width, height: 24, backgroundColor: c.ink }} />)}</View></View>
        <FocusButton label={back ? `View ${Date.parse(detail.start) > now.getTime() ? "upcoming race" : "race"} →` : claiming ? "Claiming your spot…" : "Claim your spot"} disabled={claiming && !registered} onPress={back ? onView : () => { setClaiming(true); onClaim(); }} />
      </View>
    </Animated.View>;

  return <View style={{ minHeight: reservedHeight, gap: 16 }}>
    <Animated.View style={{ flexGrow: 1, gap: 16, opacity: stepMotion, transform: [{ translateX: stepMotion.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }}>
    {step === 0 && <>
    <View style={{ padding: 20, gap: 12, borderRadius: 24, backgroundColor: tint, overflow: "hidden" }}><EventArt event={event} feature /><AppText role="heading">{detail.name} Meet</AppText><AppText secondary>{detail.description}</AppText></View>
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>{Array.from({ length: 8 }, (_, i) => <Animated.View key={i} style={{ opacity: entry.interpolate({ inputRange: [i / 10, (i + 2) / 10], outputRange: [0, 1], extrapolate: "clamp" }), width: 32, height: 32, borderRadius: 16, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" }}><AppText role="caption">{i === 0 ? "You" : "?"}</AppText></Animated.View>)}</View>
    </>}
    {step === 1 && <>
    <View onLayout={e => setDetailsHeight(value => Math.max(value, e.nativeEvent.layout.height))} style={{ gap: 10 }}>{details.map((item, i) => <Pressable key={item.title} accessibilityRole="button" accessibilityState={{ expanded: expanded === i }} onPress={() => setExpanded(expanded === i ? null : i)} style={{ padding: 16, minHeight: 72, gap: 8, borderRadius: 20, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: tint }}><CompeteIcon name={(["time", "time", "trophy"] as const)[i]!} /></View><View style={{ flex: 1, gap: 4 }}><AppText role="label">{item.title}</AppText><AppText role="caption" secondary>{item.summary}</AppText></View><AppText accessible={false}>{expanded === i ? "−" : "＋"}</AppText></View>
      {expanded === i && <AppText role="caption" secondary>{item.detail}</AppText>}
    </Pressable>)}</View>
    </>}
    <View pointerEvents={step === 2 ? "auto" : "none"} accessibilityElementsHidden={step !== 2} importantForAccessibility={step === 2 ? "auto" : "no-hide-descendants"} style={step === 2 ? { minHeight: 280, height: ticketHeight || undefined } : { position: "absolute", top: 0, left: 0, right: 0, opacity: 0 }}>{face(false)}{face(true)}</View>
    </Animated.View>
    {step < 2 && <FocusButton label="Continue" onPress={nextStep} />}
    {error && <AppText role="caption" accessibilityLiveRegion="polite">{error}</AppText>}
  </View>;
    {step < 2 && <FocusButton label="Continue" onPress={nextStep} />}
    {error && <AppText role="caption" accessibilityLiveRegion="polite">{error}</AppText>}
  </View>;
}
