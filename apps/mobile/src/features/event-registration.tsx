import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
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
      style={{ flex: 1, minHeight: rowHeight }}
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
          padding: 14,
          paddingRight: 26,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backfaceVisibility: "hidden",
          opacity: frontOpacity,
          transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
        }}
      >
        <View style={{ position: "absolute", top: 10, right: 10 }}>
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
          padding: 14,
          gap: 6,
          backfaceVisibility: "hidden",
          opacity: backOpacity,
          transform: [{ perspective: 1000 }, { rotateY: backRotate }],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <AppText role="label">{item.title}</AppText>
          <CompeteIcon name="replay" size={14} color={c.muted} />
        </View>
        <AppText role="caption" secondary>{item.detail}</AppText>
        {item.footnote ? <AppText role="field">{item.footnote}</AppText> : null}
      </Animated.View>
    </Pressable>
  );
}

export function EventRegistration({
  state,
  event,
  registered,
  crew = false,
  error,
  onClaim,
  onView,
  onClose,
}: {
  state: CompeteState;
  event: CompeteEvent;
  registered: boolean;
  crew?: boolean;
  error?: string;
  onClaim(): void;
  onView(): void;
  onClose?: () => void;
}) {
  const c = useThemeColors();
  const tint = `${COMPETE_ART_COLORS[event]}33`;
  const pillTint = `${COMPETE_ART_COLORS[event]}4d`;
  const reduced = useReducedMotion();
  const [step, setStep] = useState(registered ? 1 : 0);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const [claiming, setClaiming] = useState(false);
  const [ticketHeight, setTicketHeight] = useState(0);
  const rotation = useRef(new Animated.Value(registered ? 180 : 0)).current;
  const stamp = useRef(new Animated.Value(registered ? 1 : 0)).current;
  const entry = useRef(new Animated.Value(0)).current;
  const stepMotion = useRef(new Animated.Value(1)).current;
  const claimed = registered;
  const claimPending = !claimed && claiming;

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

  const transitioning = useRef(false);
  const goToStep = (target: number) => {
    if (transitioning.current || target === step) return;
    transitioning.current = true;
    Animated.timing(stepMotion, { toValue: 0, duration: reduced ? 0 : 110, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) {
        transitioning.current = false;
        return;
      }
      setStep(target);
      Animated.timing(stepMotion, { toValue: 1, duration: reduced ? 0 : 190, useNativeDriver: true }).start(() => {
        transitioning.current = false;
      });
    });
  };
  useEffect(() => () => { stepMotion.stopAnimation(); transitioning.current = false; }, [stepMotion]);

  const now = competeNow(state);
  const detail = eventRegistration(state, event, now);
  const ruleCards = registrationDetailCards(detail);
  const ticketRows = registrationTicketRows(detail);
  const barcode = entryBarcode(`${event}:${detail.start}`);
  const eventTag = crew ? "Crew Derby" : "Weekly event";

  useEffect(() => {
    if (registered || error) setClaiming(false);
  }, [registered, error]);

  useEffect(() => {
    if (step !== 1 || !claimed) {
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

  const face = (back: boolean) => (
    <Animated.View
      pointerEvents={back === claimed ? "auto" : "none"}
      accessibilityElementsHidden={back !== claimed}
      onLayout={e => setTicketHeight(value => Math.max(value, e.nativeEvent.layout.height))}
      style={{
        position: "absolute",
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
        <View style={{ minHeight: 162, padding: 22, justifyContent: "space-between", gap: 18, backgroundColor: c.surfaceInverse, overflow: "hidden" }}>
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
            <AppText role="display" accessibilityRole="header" style={{ color: c.textOnInverse }}>
              {back ? "You’re on the start list." : "Your spot is ready."}
            </AppText>
            <AppText role="body" style={{ color: c.textOnInverse, opacity: 0.82 }}>
              {back ? detail.headline : "One last step to join your field."}
            </AppText>
          </View>
        </View>

        <View style={{ padding: 22, gap: 16 }}>
          {back ? (
            <>
              <View style={{ gap: 6 }}>
                <AppText role="caption" secondary>YOUR WAVE STARTS IN</AppText>
                {step === 1 ? <WaveCountdown start={detail.start} now={now} prominent /> : <AppText role="display">00:00:00</AppText>}
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
              <AppText role="heading" accessibilityRole="header">{detail.name} Meet</AppText>
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
              {barcode.map((width, i) => <View key={i} style={{ flex: width, height: 32, backgroundColor: c.ink, borderRadius: 1 }} />)}
            </View>
          </View>

          <FocusButton
            label={back ? `View ${Date.parse(detail.start) > now.getTime() ? "upcoming race" : "race"} →` : claimPending ? "Claiming your spot…" : "Claim your spot"}
            disabled={claimPending}
            onPress={back ? onView : () => {
              setClaiming(true);
              requestAnimationFrame(() => {
                onClaim();
              });
            }}
          />
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, alignItems: "flex-start" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close registration"
            disabled={claimPending}
            onPress={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.card,
              alignItems: "center",
              justifyContent: "center",
              opacity: claimPending ? 0.45 : 1,
            }}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth={2.2} strokeLinecap="round">
              <Path d="M18 6 6 18M6 6l12 12" />
            </Svg>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Step 1: Event details"
            disabled={step === 0 || claimed}
            onPress={() => { if (step === 1 && !claimed) goToStep(0); }}
            hitSlop={8}
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: step === 0 ? c.ink : c.line }}
          />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: step === 1 ? c.ink : c.line }} />
        </View>

        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <AppText role="caption" secondary>Step {step + 1} of 2</AppText>
        </View>
      </View>

      <Animated.View
        style={{
          gap: 16,
          opacity: stepMotion,
          transform: [{ translateX: stepMotion.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
        }}
      >
        {step === 0 ? (
          <>
            <View style={{ borderRadius: 24, backgroundColor: c.card, overflow: "hidden" }}>
              <View style={{ padding: 20, gap: 14, backgroundColor: tint, overflow: "hidden" }}>
                <EventArt event={event} feature />
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 99, backgroundColor: pillTint }}>
                    <CompeteIcon name={event} size={14} />
                    <AppText role="caption">{detail.name}</AppText>
                  </View>
                  <AppText role="caption" secondary>{eventTag}</AppText>
                </View>

                <View style={{ gap: 6 }}>
                  <AppText role="display" accessibilityRole="header">{detail.name} Meet</AppText>
                  <AppText secondary>{detail.description}</AppText>
                </View>

                <View style={{ gap: 10, paddingTop: 4 }}>
                  <AppText role="field">YOUR FIELD</AppText>
                  <View
                    accessible
                    accessibilityLabel="You and seven mystery athletes"
                    style={{ flexDirection: "row", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}
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
                            width: 34,
                            height: 34,
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
                  <AppText role="caption" secondary>Meet your competitors when you join.</AppText>
                </View>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <AppText role="label">How this race works</AppText>
                <AppText role="caption" secondary>Tap a card to learn more</AppText>
              </View>
              <View style={{ gap: 10 }}>
                {[0, 1].map(rowIndex => {
                  const start = rowIndex * 2;
                  return (
                    <View key={start} style={{ flexDirection: "row", gap: 10 }}>
                      {ruleCards.slice(start, start + 2).map((item, offset) => {
                        const index = start + offset;
                        return (
                          <RuleFlipCard
                            key={item.id}
                            item={item}
                            tint={tint}
                            flipped={Boolean(flipped[index])}
                            reduced={reduced}
                            rowHeight={rowHeights[rowIndex] ?? 124}
                            onMeasure={measured => setRowHeights(prev => (measured > (prev[rowIndex] ?? 124) ? { ...prev, [rowIndex]: measured } : prev))}
                            onToggle={() => setFlipped(prev => ({ ...prev, [index]: !prev[index] }))}
                          />
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        ) : (
          <View style={{ gap: 12 }}>
            <View style={{ minHeight: ticketHeight || undefined }}>
              {face(false)}
              {face(true)}
            </View>
            {!claimed && (
              <AppText role="caption" secondary style={{ textAlign: "center" }}>
                Your entry will be confirmed when you claim your spot.
              </AppText>
            )}
          </View>
        )}
      </Animated.View>

      {step === 0 && <FocusButton label="Continue →" onPress={() => goToStep(1)} />}
      {error && <AppText role="caption" accessibilityLiveRegion="polite">{error}</AppText>}
    </View>
  );
}
