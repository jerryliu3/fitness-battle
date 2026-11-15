import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildHomeDeck,
  competeNow,
  accountTimeZone,
  homeDeckDismissStorageKey,
  paletteForDeckTone,
  parseDismissedCardIds,
  serializeDismissedCardIds,
  shouldSwipeDismiss,
  visibleHomeDeckCards,
  type Activity,
  type CompeteState,
  type HomeDeckCard,
  type HomeDeckCardId,
  type HomeDeckCardVisual,
  type HomeRouteDayStop,
} from "@fitness-battle/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  Text,
  View,
} from "react-native";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { playCue } from "../lib/haptics";
import { createThemedStyles, useAppTheme, useThemedStyles } from "../theme";
import { AppText, textStyle } from "../ui/section";
import { useReducedMotion } from "../ui/use-reduced-motion";

const CARD_HEIGHT = 188;
const memoryDismissed = new Map<string, HomeDeckCardId[]>();

function CompactRouteStrip({
  stops,
  todayIndex,
  isDark,
  focusAnim,
  onSelectStop,
}: {
  stops: HomeRouteDayStop[];
  todayIndex: number;
  isDark: boolean;
  focusAnim: Animated.Value;
  onSelectStop?: (stop: HomeRouteDayStop) => void;
}) {
  const s = useThemedStyles(sThemes);
  const trackColor = isDark ? "#39554d" : "#c6d9cf";
  const activeColor = isDark ? "#8ccdab" : "#24765c";
  const maxDay = Math.max(1, Math.min(6, todayIndex));
  const step = 0.68 / (maxDay + 1);
  const trackFillWidth = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", `${Math.round((Math.max(0, Math.min(6, todayIndex)) / 6) * 100)}%`],
  });

  return (
    <View style={s.routeStripWrap}>
      <View style={[s.routeTrackLine, { backgroundColor: trackColor }]}>
        <Animated.View
          style={{
            height: "100%",
            width: trackFillWidth,
            borderRadius: 1,
            backgroundColor: activeColor,
            opacity: 0.55,
          }}
        />
      </View>
      <View style={s.routeStopsRow}>
        {stops.map((stop) => {
          const isToday =
            stop.status === "today-open" || stop.status === "today-logged";
          const isLogged =
            stop.status === "logged" || stop.status === "today-logged";
          const interactive = Boolean(onSelectStop) && (isToday || isLogged);
          const start = Math.min(0.7, stop.index * step);
          const end = Math.min(1, start + 0.3);
          const checkOpacity = focusAnim.interpolate({
            inputRange: [start, end],
            outputRange: [0, 1],
            extrapolate: "clamp",
          });
          const checkScale = focusAnim.interpolate({
            inputRange: [start, end],
            outputRange: [0.35, 1],
            extrapolate: "clamp",
          });

          return (
            <Pressable
              key={stop.day}
              accessibilityRole="button"
              disabled={!interactive}
              accessibilityLabel={`${stop.weekdayShort}: ${
                isLogged ? `${stop.volumeLabel ?? "session"} logged` : isToday ? "today" : "no session"
              }`}
              onPress={() => onSelectStop?.(stop)}
              style={s.routeStopCol}
            >
              <View
                style={[
                  s.routeNodeCircle,
                  isToday && !isLogged && s.routeNodeToday,
                  (!isToday || isLogged) && [s.routeNodeEmpty, { borderColor: trackColor }],
                ]}
              >
                {!isLogged && (
                  <Text
                    style={[
                      s.routeNodeGlyph,
                      isToday && { color: "#1f1715" },
                      !isToday && { color: isDark ? "#7a958b" : "#8ca398" },
                    ]}
                  >
                    {isToday ? "→" : "·"}
                  </Text>
                )}
                {isLogged && (
                  <Animated.View
                    style={[
                      s.routeNodeCheckOverlay,
                      {
                        backgroundColor: isToday ? "#f48c72" : activeColor,
                        opacity: checkOpacity,
                        transform: [{ scale: checkScale }],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.routeNodeGlyph,
                        { color: isToday ? "#1f1715" : "#ffffff" },
                      ]}
                    >
                      ✓
                    </Text>
                  </Animated.View>
                )}
              </View>
              <Text
                style={[
                  s.routeDayLetter,
                  isToday && s.routeDayLetterToday,
                ]}
              >
                {stop.weekdayShort.slice(0, 1)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CompactVisualBar({
  visual,
  pal,
  focusAnim,
}: {
  visual: HomeDeckCardVisual;
  pal: ReturnType<typeof paletteForDeckTone>;
  focusAnim: Animated.Value;
}) {
  const s = useThemedStyles(sThemes);
  const fillPct = Math.round(Math.max(0, Math.min(1, visual.primaryFraction)) * 100);
  const isCompare = visual.mode === "compare" && visual.markerFraction != null;
  const markerPct =
    visual.markerFraction == null
      ? null
      : Math.round(Math.max(0.06, Math.min(0.94, visual.markerFraction)) * 100);
  const startPct = isCompare && markerPct != null ? Math.min(fillPct, markerPct) : 0;
  const spanWidthPct = isCompare && markerPct != null ? Math.abs(fillPct - markerPct) : fillPct;

  const animatedFillWidth = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", `${fillPct}%`],
  });
  const animatedYouLeft = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${startPct}%`, `${fillPct}%`],
  });
  const animatedMarkerLeft = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${startPct}%`, `${markerPct ?? 0}%`],
  });
  const animatedSpanWidth = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", `${spanWidthPct}%`],
  });

  const compareDots = isCompare && markerPct != null
    ? (() => {
        const pair = [
          <Animated.View
            key="marker"
            style={[
              s.visualMarker,
              {
                left: animatedMarkerLeft,
                backgroundColor: pal.bg,
                borderColor: pal.muted,
              },
            ]}
          />,
          <Animated.View
            key="you"
            style={[
              s.visualYouDot,
              {
                left: animatedYouLeft,
                backgroundColor: pal.ctaBg,
                borderColor: pal.bg,
              },
            ]}
          />,
        ];
        if (markerPct > fillPct) pair.reverse();
        return pair;
      })()
    : null;

  return (
    <View style={s.visualWrap}>
      {(visual.leftLabel || visual.rightLabel) ? (
        <View
          style={[
            s.visualMetaRow,
            !visual.leftLabel && s.visualMetaRowEnd,
          ]}
        >
          {visual.leftLabel ? (
            <Text
              style={[
                s.visualMetaText,
                { color: isCompare && visual.leftLabel !== "You" ? pal.muted : pal.ink },
              ]}
              numberOfLines={1}
            >
              {visual.leftLabel}
            </Text>
          ) : null}
          {visual.rightLabel ? (
            <Text
              style={[
                s.visualMetaText,
                { color: isCompare && visual.rightLabel === "You" ? pal.ink : pal.muted },
              ]}
              numberOfLines={1}
            >
              {visual.rightLabel}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={[s.visualTrack, { backgroundColor: pal.accentCircleBg }]}>
        {compareDots ? (
          <>
            <Animated.View
              style={[
                s.visualFill,
                {
                  position: "absolute",
                  left: `${startPct}%`,
                  width: animatedSpanWidth,
                  backgroundColor: pal.muted,
                  opacity: 0.45,
                },
              ]}
            />
            {compareDots}
          </>
        ) : (
          <Animated.View
            style={[
              s.visualFill,
              { width: animatedFillWidth, backgroundColor: pal.ctaBg },
            ]}
          />
        )}
      </View>
    </View>
  );
}

function DeckCardContent({
  card,
  isDark,
  isFront = false,
  reduceMotion = false,
  onDismiss,
  onAction,
  onSelectStop,
}: {
  card: HomeDeckCard;
  isDark: boolean;
  isFront?: boolean;
  reduceMotion?: boolean;
  onDismiss?: () => void;
  onAction?: () => void;
  onSelectStop?: (stop: HomeRouteDayStop) => void;
}) {
  const s = useThemedStyles(sThemes);
  const pal = paletteForDeckTone(card.tone, isDark);
  const focusAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      focusAnim.setValue(1);
      return;
    }
    if (!isFront) {
      focusAnim.setValue(0);
      return;
    }
    focusAnim.setValue(0);
    const animation = Animated.timing(focusAnim, {
      toValue: 1,
      duration: 1350,
      easing: Easing.bezier?.(0.35, 0, 0.82, 0.96) ?? Easing.in(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop?.();
  }, [card.id, focusAnim, isFront, reduceMotion]);

  return (
    <View style={s.cardInner}>
      <View style={s.cardTopRow}>
        <View style={[s.cardBadge, { backgroundColor: pal.badgeBg }]}>
          <Text style={[s.cardBadgeText, { color: pal.badgeText }]}>
            {card.badge}
          </Text>
        </View>
        <Pressable
          accessibilityRole={onDismiss ? "button" : "none"}
          accessibilityLabel={onDismiss ? `Dismiss ${card.title} card` : undefined}
          accessible={Boolean(onDismiss)}
          hitSlop={8}
          disabled={!onDismiss}
          onPress={onDismiss}
          style={[s.dismissBtn, { backgroundColor: pal.accentCircleBg }]}
        >
          <Text style={[s.dismissBtnText, { color: pal.accentCircleText }]}>
            ✕
          </Text>
        </Pressable>
      </View>

      <View style={s.cardBody}>
        <Text
          style={[s.cardTitle, { color: pal.ink }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {card.title}
        </Text>
        <Text style={[s.cardSubtitle, { color: pal.muted }]} numberOfLines={1}>
          {card.subtitle}
        </Text>
        {card.routeWeek ? (
          <CompactRouteStrip
            stops={card.routeWeek.stops}
            todayIndex={card.routeWeek.todayIndex}
            isDark={isDark}
            focusAnim={focusAnim}
            onSelectStop={onSelectStop}
          />
        ) : card.visual ? (
          <CompactVisualBar visual={card.visual} pal={pal} focusAnim={focusAnim} />
        ) : null}
      </View>

      <View style={s.cardFooter}>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={card.ctaLabel}
          onPress={onAction}
          style={[s.ctaBtn, { backgroundColor: pal.ctaBg }]}
        >
          <Text style={[s.ctaText, { color: pal.ctaText }]}>
            {card.ctaLabel} →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function HomeDeck({
  accountKey,
  state,
  onOpenTodaySession,
  onOpenActivities,
}: {
  accountKey: string;
  state: CompeteState;
  onOpenTodaySession: () => void;
  onOpenActivities: (activities: Activity[], title?: string) => void;
}) {
  const router = useRouter();
  const { mode } = useAppTheme();
  const s = useThemedStyles(sThemes);
  const reduceMotion = useReducedMotion();
  const { blocks } = useAthleteBlocks();
  const isDark = mode === "dark";

  const now = competeNow(state);
  const storageKey = homeDeckDismissStorageKey(accountKey, now, accountTimeZone(state));
  const [dismissedIds, setDismissedIds] = useState<HomeDeckCardId[]>(
    () => memoryDismissed.get(storageKey) ?? [],
  );
  const dismissalRevision = useRef(0);
  const swipingRef = useRef(false);
  const dismissalAnimation = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    swipingRef.current = false;
    return () => { dismissalAnimation.current?.stop(); swipingRef.current = false; };
  }, [storageKey]);

  useEffect(() => {
    let alive = true;
    const revision = dismissalRevision.current;
    const cached = memoryDismissed.get(storageKey);
    if (cached) setDismissedIds(cached);
    void AsyncStorage.getItem(storageKey)
      .catch(() => null)
      .then((raw) => {
        if (!alive || revision !== dismissalRevision.current) return;
        const parsed = parseDismissedCardIds(raw);
        if (parsed.length > 0 || !cached) {
          memoryDismissed.set(storageKey, parsed);
          setDismissedIds(parsed);
        }
      });
    return () => {
      alive = false;
    };
  }, [storageKey]);

  const hiddenRivalIds = useMemo(() => blocks.map((b) => b.id), [blocks]);
  const allCards = useMemo(
    () => buildHomeDeck(state, { now, hiddenRivalIds }),
    [state, now, hiddenRivalIds],
  );
  const visibleCards = useMemo(
    () => visibleHomeDeckCards(allCards, dismissedIds),
    [allCards, dismissedIds],
  );

  const activeCard = visibleCards[0] ?? null;
  const nextCard = visibleCards[1] ?? null;
  const depth2Card = visibleCards[2] ?? null;
  // Each top card owns its native animation values. Never reset an outgoing view.
  const motion = useMemo(
    () => ({ x: new Animated.Value(0), opacity: new Animated.Value(1) }),
    [storageKey, activeCard?.id],
  );
  const dragX = motion.x;
  const cardOpacity = motion.opacity;

  const persistDismissed = useCallback(
    (next: HomeDeckCardId[]) => {
      dismissalRevision.current++;
      memoryDismissed.set(storageKey, next);
      setDismissedIds(next);
      void AsyncStorage.setItem(
        storageKey,
        serializeDismissedCardIds(next),
      ).catch(() => {});
    },
    [storageKey],
  );

  const dismissCard = useCallback(
    (
      cardId: HomeDeckCardId,
      direction: "left" | "right" = "left",
      currentDx = 0,
      velocityX = 0,
    ) => {
      if (swipingRef.current) return;
      const targetCard =
        visibleCards.find((c) => c.id === cardId) ?? activeCard;
      if (!targetCard) return;
      const nextDismissed = [...new Set([...dismissedIds, cardId])];

      if (reduceMotion) {
        dragX.setValue(0);
        cardOpacity.setValue(1);
        persistDismissed(nextDismissed);
        void playCue("light");
        return;
      }

      // Start the native exit immediately without triggering an intermediate JS re-render
      // so there is zero pause between finger release and the card sweeping away.
      swipingRef.current = true;
      dragX.setValue(currentDx);
      const remaining = Math.max(80, 460 - Math.abs(currentDx));
      const speed = Math.max(0.95, Math.abs(velocityX) * 0.85 + 1.15);
      const duration = Math.max(260, Math.min(420, Math.round(remaining / speed)));

      const animation = Animated.parallel([
        Animated.timing(dragX, {
          toValue: direction === "left" ? -460 : 460,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: Math.max(220, duration - 30),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
      dismissalAnimation.current = animation;
      animation.start(({ finished }) => {
        swipingRef.current = false;
        if (!finished) return;
        persistDismissed(nextDismissed);
      });
      void playCue("light");
    },
    [
      activeCard,
      cardOpacity,
      dismissedIds,
      dragX,
      persistDismissed,
      reduceMotion,
      visibleCards,
    ],
  );

  const resetDeck = useCallback(() => {
    void playCue("selection");
    dragX.setValue(0);
    cardOpacity.setValue(1);
    swipingRef.current = false;
    persistDismissed([]);
  }, [cardOpacity, dragX, persistDismissed]);

  const activeCardRef = useRef<HomeDeckCard | null>(activeCard);
  activeCardRef.current = activeCard;
  const dismissCardRef = useRef(dismissCard);
  dismissCardRef.current = dismissCard;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !swipingRef.current &&
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderMove: (_, gesture) => {
          dragX.setValue(gesture.dx);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, gesture) => {
          const velocityDismiss =
            Math.abs(gesture.vx) >= 0.45 && Math.abs(gesture.dx) >= 18
              ? (gesture.vx < 0 ? "left" : "right")
              : null;
          const decision = shouldSwipeDismiss(gesture.dx, gesture.dy, 48) ?? velocityDismiss;
          if (decision && activeCardRef.current) {
            dismissCardRef.current(
              activeCardRef.current.id,
              decision,
              gesture.dx,
              gesture.vx,
            );
          } else {
            Animated.spring(dragX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 5,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [dragX],
  );

  const handleCardAction = (card: HomeDeckCard) => {
    void playCue("light");
    if (card.action.type === "open-today-session") {
      onOpenTodaySession();
    } else {
      router.push(card.action.href as never);
    }
  };

  const handleRouteStopPress = (stop: HomeRouteDayStop) => {
    void playCue("light");
    if (stop.status === "today-open" || stop.status === "today-logged") {
      onOpenTodaySession();
      return;
    }
    if (stop.activityIds.length > 0) {
      const ids = new Set(stop.activityIds);
      const dayActivities = state.activities.filter((a) => ids.has(a.id));
      if (dayActivities.length > 0) {
        onOpenActivities(dayActivities, stop.dateLabel);
      }
    }
  };

  const depth1TranslateY = dragX.interpolate({
    inputRange: [-180, 0, 180],
    outputRange: [0, 7, 0],
    extrapolate: "clamp",
  });
  const depth1Opacity = dragX.interpolate({
    inputRange: [-180, 0, 180],
    outputRange: [1, 0.95, 1],
    extrapolate: "clamp",
  });
  const depth2TranslateY = dragX.interpolate({
    inputRange: [-180, 0, 180],
    outputRange: [7, 14, 7],
    extrapolate: "clamp",
  });
  const depth2Opacity = dragX.interpolate({
    inputRange: [-180, 0, 180],
    outputRange: [0.95, 0.7, 0.95],
    extrapolate: "clamp",
  });

  return (
    <View style={s.section} accessibilityLabel="Updates">
      {!activeCard ? (
        <View style={s.caughtUpRow}>
          <AppText role="body" secondary>
            You’re all caught up.
          </AppText>
          {dismissedIds.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset dismissed cards"
              onPress={resetDeck}
              style={s.restorePill}
            >
              <AppText role="label" style={s.restorePillText}>
                Reset
              </AppText>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={s.deckWrapper}>
          <View style={s.stackStage}>
            {/* Depth 2 Card (Underneath next card — smoothly glides up to depth 1 as top card swipes) */}
            {depth2Card && (
              <Animated.View
                key={`depth2-${depth2Card.id}`}
                pointerEvents="none"
                accessible={false}
                style={[
                  s.deckCard,
                  s.cardDepth2,
                  {
                    backgroundColor: paletteForDeckTone(depth2Card.tone, isDark).bg,
                    borderColor: paletteForDeckTone(depth2Card.tone, isDark).border,
                    opacity: depth2Opacity,
                    transform: [{ translateY: depth2TranslateY }],
                  },
                ]}
              >
                <DeckCardContent card={depth2Card} isDark={isDark} reduceMotion={reduceMotion} />
              </Animated.View>
            )}

            {nextCard && (
              <Animated.View
                key={`depth1-${nextCard.id}`}
                pointerEvents="none"
                accessible={false}
                style={[
                  s.deckCard,
                  s.cardDepth1,
                  {
                    backgroundColor: paletteForDeckTone(nextCard.tone, isDark).bg,
                    borderColor: paletteForDeckTone(nextCard.tone, isDark).border,
                    opacity: depth1Opacity,
                    transform: [{ translateY: depth1TranslateY }],
                  },
                ]}
              >
                <DeckCardContent card={nextCard} isDark={isDark} reduceMotion={reduceMotion} />
              </Animated.View>
            )}

            {/* Top Card: Active Animated Swipable Card */}
            {activeCard && (() => {
              const pal = paletteForDeckTone(activeCard.tone, isDark);
              const rotate = dragX.interpolate({
                inputRange: [-240, 0, 240],
                outputRange: ["-5deg", "0deg", "5deg"],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  key={`${storageKey}:${activeCard.id}`}
                  {...panResponder.panHandlers}
                  pointerEvents="auto"
                  style={[
                    s.deckCard,
                    s.cardTop,
                    {
                      backgroundColor: pal.bg,
                      borderColor: pal.border,
                      opacity: cardOpacity,
                      transform: [{ translateX: dragX }, { rotate }],
                    },
                  ]}
                >
                  <DeckCardContent
                    card={activeCard}
                    isDark={isDark}
                    isFront
                    reduceMotion={reduceMotion}
                    onDismiss={() => dismissCard(activeCard.id, "left", 0)}
                    onAction={() => handleCardAction(activeCard)}
                    onSelectStop={handleRouteStopPress}
                  />
                </Animated.View>
              );
            })()}
          </View>
        </View>
      )}
    </View>
  );
}

const sThemes = createThemedStyles((c) => ({
  section: {
    gap: 10,
  },
  restorePill: {
    backgroundColor: c.soft,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 30,
    justifyContent: "center",
  },
  restorePillText: {
    color: c.ink,
  },
  deckWrapper: {
    gap: 10,
  },
  stackStage: {
    position: "relative",
    height: CARD_HEIGHT + 14,
  },
  deckCard: {
    height: CARD_HEIGHT,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    shadowColor: c.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 3,
  },
  cardDepth1: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 2,
  },
  cardDepth2: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1,
  },
  cardInner: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 26,
  },
  cardBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  cardBadgeText: {
    ...textStyle("nav"),
  },
  dismissBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissBtnText: {
    ...textStyle("caption"),
  },
  cardBody: {
    gap: 4,
    justifyContent: "center",
  },
  cardTitle: {
    ...textStyle("heading"),
  },
  cardSubtitle: {
    ...textStyle("caption"),
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  ctaBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  ctaText: {
    ...textStyle("nav"),
  },
  routeStripWrap: {
    position: "relative",
    paddingTop: 6,
    paddingBottom: 2,
    justifyContent: "center",
  },
  routeTrackLine: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 14,
    height: 2,
    borderRadius: 1,
  },
  routeStopsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeStopCol: {
    alignItems: "center",
    gap: 2,
    minWidth: 26,
  },
  routeNodeCircle: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  routeNodeCheckOverlay: {
    position: "absolute",
    top: -1.5,
    right: -1.5,
    bottom: -1.5,
    left: -1.5,
    borderRadius: 8.5,
    alignItems: "center",
    justifyContent: "center",
  },
  routeNodeToday: {
    backgroundColor: "#f48c72",
  },
  routeNodeEmpty: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },
  routeNodeGlyph: {
    ...textStyle("nav"),
  },
  routeDayLetter: {
    ...textStyle("nav"),
    color: c.muted,
  },
  routeDayLetterToday: {
    color: c.ink,
  },
  caughtUpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
    paddingHorizontal: 2,
    minHeight: 30,
  },
  visualWrap: {
    gap: 5,
    paddingTop: 6,
    paddingBottom: 2,
  },
  visualMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  visualMetaRowEnd: {
    justifyContent: "flex-end",
  },
  visualMetaText: {
    ...textStyle("nav"),
    flexShrink: 1,
  },
  visualTrack: {
    height: 6,
    borderRadius: 999,
    position: "relative",
    justifyContent: "center",
  },
  visualFill: {
    height: 6,
    borderRadius: 999,
  },
  visualMarker: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginLeft: -5,
    top: -2,
  },
  visualYouDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginLeft: -6,
    top: -3,
  },
}));
