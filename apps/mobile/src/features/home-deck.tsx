import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildHomeDeck,
  competeNow,
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
  type HomeRouteDayStop,
} from "@fitness-battle/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useLayoutEffect, useRef, useState } from "react";
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
  isDark,
  onSelectStop,
}: {
  stops: HomeRouteDayStop[];
  isDark: boolean;
  onSelectStop?: (stop: HomeRouteDayStop) => void;
}) {
  const s = useThemedStyles(sThemes);
  const trackColor = isDark ? "#39554d" : "#c6d9cf";
  const activeColor = isDark ? "#8ccdab" : "#24765c";

  return (
    <View style={s.routeStripWrap}>
      <View style={[s.routeTrackLine, { backgroundColor: trackColor }]} />
      <View style={s.routeStopsRow}>
        {stops.map((stop) => {
          const isToday =
            stop.status === "today-open" || stop.status === "today-logged";
          const isLogged =
            stop.status === "logged" || stop.status === "today-logged";
          const interactive = Boolean(onSelectStop) && (isToday || isLogged);

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
                  isToday && s.routeNodeToday,
                  isLogged && !isToday && { backgroundColor: activeColor },
                  !isLogged && !isToday && [s.routeNodeEmpty, { borderColor: trackColor }],
                ]}
              >
                <Text
                  style={[
                    s.routeNodeGlyph,
                    isToday && { color: "#1f1715" },
                    isLogged && !isToday && { color: "#ffffff" },
                    !isLogged && !isToday && { color: isDark ? "#7a958b" : "#8ca398" },
                  ]}
                >
                  {isLogged ? "✓" : isToday ? "→" : "·"}
                </Text>
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

function DeckCardContent({
  card,
  isDark,
  onDismiss,
  onAction,
  onSelectStop,
}: {
  card: HomeDeckCard;
  isDark: boolean;
  onDismiss?: () => void;
  onAction?: () => void;
  onSelectStop?: (stop: HomeRouteDayStop) => void;
}) {
  const s = useThemedStyles(sThemes);
  const pal = paletteForDeckTone(card.tone, isDark);

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
        {card.routeWeek && (
          <CompactRouteStrip
            stops={card.routeWeek.stops}
            isDark={isDark}
            onSelectStop={onSelectStop}
          />
        )}
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
  const storageKey = homeDeckDismissStorageKey(accountKey, now);
  const [dismissedIds, setDismissedIds] = useState<HomeDeckCardId[]>(
    () => memoryDismissed.get(storageKey) ?? [],
  );
  const [dismissingId, setDismissingId] = useState<HomeDeckCardId | null>(null);
  const dismissalRevision = useRef(0);
  const swipingRef = useRef(false);
  const dismissalAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const stackLift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setDismissingId(null);
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
  const depth1Lift = stackLift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });
  const depth2Lift = stackLift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });

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
    ) => {
      if (swipingRef.current) return;
      const targetCard =
        visibleCards.find((c) => c.id === cardId) ?? activeCard;
      if (!targetCard) return;
      void playCue("light");
      const nextDismissed = [...new Set([...dismissedIds, cardId])];

      if (reduceMotion) {
        dragX.setValue(0);
        cardOpacity.setValue(1);
        stackLift.setValue(0);
        persistDismissed(nextDismissed);
        return;
      }

      swipingRef.current = true;
      setDismissingId(cardId);
      dragX.setValue(currentDx);
      stackLift.setValue(0);

      const animation = Animated.parallel([
        Animated.timing(dragX, {
          toValue: direction === "left" ? -460 : 460,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 240,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(stackLift, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
      dismissalAnimation.current = animation;
      animation.start(({ finished }) => {
        if (!finished) return;
        stackLift.setValue(0);
        persistDismissed(nextDismissed);
      });
    },
    [
      activeCard,
      cardOpacity,
      dismissedIds,
      dragX,
      persistDismissed,
      reduceMotion,
      stackLift,
      visibleCards,
    ],
  );

  // Clear the gesture lock once the replacement card has committed.
  useLayoutEffect(() => {
    if (!dismissingId || activeCard?.id === dismissingId) return;
    setDismissingId(null);
    swipingRef.current = false;
  }, [activeCard?.id, dismissingId]);

  const resetDeck = useCallback(() => {
    void playCue("selection");
    dragX.setValue(0);
    cardOpacity.setValue(1);
    stackLift.setValue(0);
    setDismissingId(null);
    swipingRef.current = false;
    persistDismissed([]);
  }, [cardOpacity, dragX, persistDismissed, stackLift]);

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
          Math.abs(gesture.dx) > 10 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
        onPanResponderMove: (_, gesture) => {
          dragX.setValue(gesture.dx);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, gesture) => {
          const decision = shouldSwipeDismiss(gesture.dx, gesture.dy, 48);
          if (decision && activeCardRef.current) {
            dismissCardRef.current(
              activeCardRef.current.id,
              decision,
              gesture.dx,
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

  return (
    <View style={s.section} accessibilityLabel="Updates">
      {!activeCard && !dismissingId ? (
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
            {/* Depth 2 Card (Underneath next card) */}
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
                    opacity: 0.7,
                    transform: [{ translateY: depth2Lift }],
                  },
                ]}
              >
                <DeckCardContent card={depth2Card} isDark={isDark} />
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
                    opacity: dismissingId ? 1 : 0.95,
                    transform: [{ translateY: depth1Lift }],
                  },
                ]}
              >
                <DeckCardContent card={nextCard} isDark={isDark} />
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
                  pointerEvents={dismissingId ? "none" : "auto"}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
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
  stackStageWithBack: {},
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
    top: 7,
    zIndex: 2,
  },
  cardDepth2: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 14,
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
  dismissPlaceholder: {
    width: 26,
    height: 26,
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
}));
