import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { Animated, Easing, Keyboard, Pressable, View } from "react-native";
import {
  COMPETE_ART_COLORS,
  competeNow,
  eventRegistration,
  entryBarcode,
  registrationDetailCards,
  registrationTicketRows,
  type CompeteEvent,
  type CompeteState,
  type RegistrationRuleCard,
} from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { IconButton } from "../ui/icon-button";
import { FocusButton } from "../ui/focus";
import { WaveCountdown } from "../ui/wave-countdown";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { useThemeColors } from "../theme";
import { CompeteIcon, EventArt } from "./compete-home-sections";

function RuleFlipCard({
  item,
  tint,
  flipped,
  reduced,
  rowHeight,
  onMeasure,
  onToggle,
}: {
  item: RegistrationRuleCard;
  tint: string;
  flipped: boolean;
  reduced: boolean;
  rowHeight: number;
  onMeasure(height: number): void;
  onToggle(): void;
}) {
  const c = useThemeColors();
  const flipAnim = useRef(new Animated.Value(flipped ? 180 : 0)).current;

  useEffect(() => {
    Animated.timing(flipAnim, {
      toValue: flipped ? 180 : 0,
      duration: reduced ? 0 : 400,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [flipped, flipAnim, reduced]);

  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 89, 90, 180], outputRange: [1, 1, 0, 0] });
  const backOpacity = flipAnim.interpolate({ inputRange: [0, 90, 91, 180], outputRange: [0, 0, 1, 1] });
  const frontRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg", "180deg"] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg", "360deg"] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: flipped }}
      accessibilityLabel={`${item.title}, ${item.summary}. ${flipped ? item.detail : "Tap to see details."}`}
      onPress={onToggle}
      style={{ width: "100%", minHeight: rowHeight }}
    >
      <Animated.View
        pointerEvents={flipped ? "none" : "auto"}
        accessibilityElementsHidden={flipped}
        onLayout={e => onMeasure(e.nativeEvent.layout.height)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          minHeight: rowHeight,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.card,
          paddingHorizontal: 14,
          paddingVertical: 12,
          paddingRight: 36,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backfaceVisibility: "hidden",
          opacity: frontOpacity,
          transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
        }}
      >
        <View style={{ position: "absolute", top: 12, right: 14 }}>
          <CompeteIcon name="replay" size={14} color={c.muted} />
        </View>
        <View style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: c.soft }}>
          <CompeteIcon name={item.icon} size={20} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <AppText role="label">{item.title}</AppText>
          <AppText role="caption" secondary>{item.summary}</AppText>
        </View>
      </Animated.View>

      <Animated.View
        pointerEvents={flipped ? "auto" : "none"}
        accessibilityElementsHidden={!flipped}
        onLayout={e => onMeasure(e.nativeEvent.layout.height)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          minHeight: rowHeight,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: tint,
          backgroundColor: c.card,
          paddingHorizontal: 14,
          paddingVertical: 12,
          justifyContent: "center",
          gap: 4,
          backfaceVisibility: "hidden",
          opacity: backOpacity,
          transform: [{ perspective: 1000 }, { rotateY: backRotate }],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap", flex: 1 }}>
            <AppText role="label">{item.title}</AppText>
            {item.footnote ? <AppText role="field" secondary>{item.footnote}</AppText> : null}
          </View>
          <CompeteIcon name="replay" size={14} color={c.muted} />
        </View>
        <AppText role="caption" secondary>{item.detail}</AppText>
      </Animated.View>
    </Pressable>
  );
}

export function EventRegistration({
  state,
  event,
  registered,
  busy = false,
  crew = false,
  ticketOnly = false,
  onBack,
  error,
  onClaim,
  onView,
}: {
  state: CompeteState;
  event: CompeteEvent;
  registered: boolean;
  busy?: boolean;
  crew?: boolean;
  ticketOnly?: boolean;
  onBack?: () => void;
  error?: string;
  onClaim(): void;
  onView(): void;
}) {
  const c = useThemeColors();
  const tint = `${COMPETE_ART_COLORS[event]}33`;
  const reduced = useReducedMotion();
  const [step, setStep] = useState(registered ? 1 : 0);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [cardHeight, setCardHeight] = useState(72);
  const [claiming, setClaiming] = useState(false);
  const [ticketHeight, setTicketHeight] = useState(0);
  const [stageHeight, setStageHeight] = useState(0);
  const rotation = useRef(new Animated.Value(registered ? 180 : 0)).current;
  const stamp = useRef(new Animated.Value(0)).current;
  const entry = useRef(new Animated.Value(0)).current;
  const stepProgress = useRef(new Animated.Value(registered ? 1 : 0)).current;
  const claimed = registered;
  const claimPending = !claimed && (busy || claiming);

  useEffect(() => {
    entry.setValue(reduced ? 1 : 0);
    Animated.timing(entry, {
      toValue: 1,
      delay: reduced ? 0 : 800,
      duration: reduced ? 0 : 600,
      useNativeDriver: true,
    }).start();
    return () => entry.stopAnimation();
  }, [entry, reduced]);

  const goToStep = (target: number) => {
    if (target === step) return;
    setStep(target);
    Animated.timing(stepProgress, {
      toValue: target,
      duration: reduced ? 0 : 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  useEffect(() => () => stepProgress.stopAnimation(), [stepProgress]);

  const now = competeNow(state);
  const detail = eventRegistration(state, event, now);
  const ruleCards = registrationDetailCards(detail);
  const ticketRows = registrationTicketRows(detail).filter(row => !ticketOnly || row.label === "Starts" || row.label === "Scoring");
  const barcode = entryBarcode(`${event}:${detail.start}`);
  const eventTag = crew ? "Crew Derby" : "Weekly event";

  useEffect(() => {
    if (registered || error) setClaiming(false);
  }, [registered, error]);

  useLayoutEffect(() => {
    if ((!ticketOnly && step !== 1) || !claimed) {
      if (!claimed) {
        rotation.setValue(0);
        stamp.setValue(0);
      }
      return;
    }
    if (reduced) { rotation.setValue(180); stamp.setValue(1); return; }
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
  }, [step, claimed, reduced, rotation, stamp, ticketOnly]);

  const frontOpacity = rotation.interpolate({ inputRange: [0, 89, 90, 180], outputRange: [1, 1, 0, 0] });
  const backOpacity = rotation.interpolate({ inputRange: [0, 90, 91, 180], outputRange: [0, 0, 1, 1] });

  const face = (back: boolean) => (
    <Animated.View
      pointerEvents={back === claimed ? "auto" : "none"}
      aria-hidden={back !== claimed}
      accessibilityElementsHidden={back !== claimed}
      onLayout={e => setTicketHeight(value => Math.max(value, e.nativeEvent.layout.height))}
      style={{
        position: ticketOnly && back === claimed ? "relative" : "absolute",
        top: 0,
        left: 0,
        right: 0,
        borderRadius: 24,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: tint,
        overflow: "hidden",
        backfaceVisibility: "hidden",
        opacity: back ? backOpacity : frontOpacity,
        transform: [
          { perspective: 1200 },
          { rotateY: rotation.interpolate({ inputRange: [0, 180], outputRange: back ? ["180deg", "360deg"] : ["0deg", "180deg"] }) },
        ],
      }}
    >
      <View style={{ backgroundColor: tint }}>
        <View style={{ minHeight: ticketOnly ? 96 : 162, padding: ticketOnly ? 14 : 22, justifyContent: "space-between", gap: ticketOnly ? 10 : 18, backgroundColor: c.surfaceInverse, overflow: "hidden" }}>
          <EventArt event={event} feature />
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.card }}>
              <CompeteIcon name={event} size={24} />
            </View>
            <AppText role="field" style={{ color: c.textOnInverse, opacity: 0.78 }}>
              {back ? "CONFIRMED ENTRY" : eventTag.toUpperCase()}
            </AppText>
          </View>
          <View style={{ gap: 4 }}>
            <AppText role={ticketOnly ? "heading" : "display"} accessibilityRole="header" style={{ color: c.textOnInverse }}>
              {back ? "You’re on the start list." : "Your spot is ready."}
            </AppText>
            {back ? (
              <AppText role="body" style={{ color: c.textOnInverse, opacity: 0.82 }}>
                {detail.headline}
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={{ padding: ticketOnly ? 14 : 22, gap: ticketOnly ? 10 : 16 }}>
          {back ? (
            <>
              <View style={{ gap: 6 }}>
                <AppText role="caption" secondary>YOUR WAVE STARTS IN</AppText>
                {step === 1 || ticketOnly ? <WaveCountdown start={detail.start} now={now} prominent={!ticketOnly} /> : <AppText role="display">00:00:00</AppText>}
              </View>
              <View style={{ transform: [{ rotate: "-5deg" }], alignSelf: "flex-start" }}>
                <Animated.View
                  accessibilityLabel={`${detail.name}, ${detail.dateRange}, ${detail.stampYear}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 12,
                    borderWidth: 2,
                    borderRadius: 10,
                    borderColor: c.ink,
                    opacity: stamp.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }),
                    transform: [{ scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }) }],
                  }}
                >
                  <CompeteIcon name={event} size={30} />
                  <View style={{ flexShrink: 1, gap: 4 }}>
                    <AppText role="label">{detail.name}</AppText>
                    <AppText role="caption">{detail.dateRange} · {detail.stampYear}</AppText>
                  </View>
                </Animated.View>
              </View>
            </>
          ) : (
            <>
              <AppText role="heading" accessibilityRole="header">{detail.name}</AppText>
              <View style={{ gap: 10 }}>
                {ticketRows.map(row => (
                  <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
                    <AppText role="caption" secondary>{row.label}</AppText>
                    <AppText role="label">{row.value}</AppText>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: c.muted, paddingTop: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <AppText role="field" secondary>YOUR ENTRY</AppText>
              <AppText role="field" secondary>{back ? "CONFIRMED" : "READY TO CLAIM"}</AppText>
            </View>
            <View accessible={false} style={{ flexDirection: "row", gap: 2 }}>
              {barcode.map((width, i) => <View key={i} style={{ flex: width, height: ticketOnly ? 20 : 32, backgroundColor: c.ink, borderRadius: 1 }} />)}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          {onBack && <IconButton icon="back" label="Back" disabled={busy || claimPending} onPress={onBack} />}
          <View style={{ flex: 1 }}><FocusButton
            label={ticketOnly ? "Continue" : back ? `View ${Date.parse(detail.start) > now.getTime() ? "upcoming race" : "race"} →` : claimPending ? "Claiming your spot…" : "Claim your spot"}
            disabled={busy || claimPending}
            onPress={back ? onView : () => {
              setClaiming(true);
              requestAnimationFrame(() => {
                onClaim();
              });
            }}
          /></View>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  if (ticketOnly) return <View onTouchStart={Keyboard.dismiss}>{face(false)}{face(true)}{error && <AppText role="caption" accessibilityRole="alert">{error}</AppText>}</View>;

  const sharedHeight = Math.max(stageHeight, ticketHeight);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ minHeight: sharedHeight || undefined }}>
        <Animated.View
          pointerEvents={step === 0 ? "auto" : "none"}
          accessibilityElementsHidden={step !== 0}
          importantForAccessibility={step === 0 ? "yes" : "no-hide-descendants"}
          style={{
            position: step === 0 ? "relative" : "absolute",
            top: 0,
            left: 0,
            right: 0,
            opacity: stepProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [{ translateX: stepProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) }],
          }}
        >
          <View
            onLayout={e => {
              const height = e.nativeEvent.layout.height;
              setStageHeight(prev => (height > prev ? height : prev));
            }}
            style={{ gap: 16 }}
          >
            <View style={{ borderRadius: 24, backgroundColor: c.card, overflow: "hidden" }}>
              <View style={{ padding: 20, gap: 14, backgroundColor: tint, overflow: "hidden" }}>
                <EventArt event={event} feature />
                <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <AppText role="display" accessibilityRole="header">{detail.name}</AppText>
                  <AppText role="caption" secondary>{eventTag}</AppText>
                </View>
                <AppText role="support" secondary>{detail.description}</AppText>

                <View style={{ gap: 10, paddingTop: 4 }}>
                  <AppText role="caption" secondary>You’ll see the other athletes when the event starts.</AppText>
                  <View
                    accessible
                    accessibilityLabel="You and seven mystery athletes"
                    style={{ flexDirection: "row", justifyContent: "space-between", gap: 5 }}
                  >
                    {Array.from({ length: 8 }, (_, i) => {
                      const isYou = i === 0;
                      return (
                        <Animated.View
                          key={i}
                          style={{
                            opacity: entry.interpolate({ inputRange: [i / 10, (i + 2) / 10], outputRange: [0, 1], extrapolate: "clamp" }),
                            transform: [
                              { translateY: entry.interpolate({ inputRange: [i / 10, (i + 2) / 10], outputRange: [6, 0], extrapolate: "clamp" }) },
                              { scale: entry.interpolate({ inputRange: [i / 10, (i + 2) / 10], outputRange: [0.9, 1], extrapolate: "clamp" }) },
                            ],
                            flex: 1,
                            maxWidth: 34,
                            aspectRatio: 1,
                            borderRadius: 17,
                            backgroundColor: c.card,
                            borderWidth: isYou ? 1.5 : 1,
                            borderColor: isYou ? c.ink : c.line,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <AppText role={isYou ? "field" : "caption"}>{isYou ? "You" : "?"}</AppText>
                        </Animated.View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <AppText role="label">How this race works</AppText>
                <AppText role="caption" secondary>Tap a card to learn more</AppText>
              </View>
              <View style={{ gap: 10 }}>
                {ruleCards.map((item, index) => (
                  <RuleFlipCard
                    key={item.id}
                    item={item}
                    tint={tint}
                    flipped={Boolean(flipped[index])}
                    reduced={reduced}
                    rowHeight={cardHeight}
                    onMeasure={measured => setCardHeight(prev => (measured > prev ? measured : prev))}
                    onToggle={() => setFlipped(prev => ({ ...prev, [index]: !prev[index] }))}
                  />
                ))}
              </View>
            </View>
            <FocusButton label="Continue →" onPress={() => goToStep(1)} />
          </View>
        </Animated.View>

        <Animated.View
          pointerEvents={step === 1 ? "auto" : "none"}
          accessibilityElementsHidden={step !== 1}
          importantForAccessibility={step === 1 ? "yes" : "no-hide-descendants"}
          style={{
            position: step === 1 ? "relative" : "absolute",
            top: 0,
            left: 0,
            right: 0,
            minHeight: sharedHeight || undefined,
            justifyContent: "center",
            opacity: stepProgress,
            transform: [{ translateX: stepProgress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }}
        >
          <View style={{ minHeight: ticketHeight || undefined }}>
            {face(false)}
            {face(true)}
          </View>
        </Animated.View>
      </View>

      {error && <AppText role="caption" accessibilityLiveRegion="polite">{error}</AppText>}
    </View>
  );
}
