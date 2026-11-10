"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  buildHomeDeck,
  competeNow,
  homeDeckDismissStorageKey,
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
import { playCue } from "@/lib/haptics";
import { AppHeading, AppText } from "@/ui/section";
import "./home-deck.css";

const memoryDismissed = new Map<string, HomeDeckCardId[]>();

function CompactRouteStrip({
  stops,
  onSelectStop,
}: {
  stops: HomeRouteDayStop[];
  onSelectStop?: (stop: HomeRouteDayStop) => void;
}) {
  return (
    <div className="home-route-strip-wrap" aria-label="Weekly route progress">
      <div className="home-route-track" />
      <div className="home-route-nodes">
        {stops.map((stop) => {
          const isToday =
            stop.status === "today-open" || stop.status === "today-logged";
          const isLogged =
            stop.status === "logged" || stop.status === "today-logged";
          const interactive = Boolean(onSelectStop) && (isToday || isLogged);

          return (
            <button
              key={stop.day}
              type="button"
              disabled={!interactive}
              onClick={() => onSelectStop?.(stop)}
              className={`home-route-node-col${isToday ? " is-today" : ""}${
                isLogged ? " is-logged" : ""
              }`}
              aria-label={`${stop.weekdayShort}: ${
                isLogged
                  ? `${stop.volumeLabel ?? "session"} logged`
                  : isToday
                    ? "today"
                    : "no session"
              }`}
            >
              <span className="home-route-node-circle">
                {isLogged ? "✓" : isToday ? "→" : "·"}
              </span>
              <span className="home-route-node-day">
                {stop.weekdayShort.slice(0, 1)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DeckCardContent({
  card,
  onDismiss,
  onAction,
  onSelectStop,
}: {
  card: HomeDeckCard;
  onDismiss?: () => void;
  onAction?: () => void;
  onSelectStop?: (stop: HomeRouteDayStop) => void;
}) {
  return (
    <div className="home-deck-card-inner">
      <div className="home-deck-card-top">
        <span className="home-deck-badge">{card.badge}</span>
        {onDismiss ? (
          <button
            type="button"
            className="home-deck-dismiss"
            aria-label={`Dismiss ${card.title} card`}
            onClick={onDismiss}
          >
            ✕
          </button>
        ) : (
          <div className="home-deck-dismiss-placeholder" />
        )}
      </div>

      <div className="home-deck-card-body">
        <AppHeading level={3} role="heading" className="home-deck-title">
          {card.title}
        </AppHeading>
        <p className="home-deck-subtitle">{card.subtitle}</p>
        {card.routeWeek && (
          <CompactRouteStrip
            stops={card.routeWeek.stops}
            onSelectStop={onSelectStop}
          />
        )}
      </div>

      <div className="home-deck-card-footer">
        <button
          type="button"
          className="home-deck-cta"
          onClick={onAction}
        >
          {card.ctaLabel} →
        </button>
      </div>
    </div>
  );
}

export function HomeDeck({
  accountKey,
  state,
  initialIndex = 0,
  onOpenTodaySession,
  onOpenActivities,
}: {
  accountKey: string;
  state: CompeteState;
  initialIndex?: number;
  onOpenTodaySession: () => void;
  onOpenActivities: (activities: Activity[], title?: string) => void;
}) {
  const router = useRouter();
  const now = competeNow(state);
  const storageKey = homeDeckDismissStorageKey(accountKey, now);

  const [dismissedIds, setDismissedIds] = useState<HomeDeckCardId[]>(
    () => memoryDismissed.get(storageKey) ?? [],
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [dismissing, setDismissing] = useState<{
    id: HomeDeckCardId;
    direction: "left" | "right";
  } | null>(null);

  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setDismissing(null);
    setDragOffset(0);
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); };
  }, [storageKey]);

  useEffect(() => {
    if (typeof initialIndex === "number") {
      setActiveIndex(initialIndex);
    }
  }, [initialIndex]);
  const dragStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(
    null,
  );
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const read = () => {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(storageKey);
      } catch {
        // Fallback
      }
      const parsed = parseDismissedCardIds(raw);
      const cached = memoryDismissed.get(storageKey);
      if (parsed.length > 0 || !cached) {
        memoryDismissed.set(storageKey, parsed);
        setDismissedIds(parsed);
      } else {
        setDismissedIds(cached);
      }
    };
    read();
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);

  const allCards = useMemo(() => buildHomeDeck(state, { now }), [state, now]);
  const visibleCards = useMemo(
    () => visibleHomeDeckCards(allCards, dismissedIds),
    [allCards, dismissedIds],
  );
  const safeIndex =
    visibleCards.length > 0 ? activeIndex % visibleCards.length : 0;
  const activeCard = visibleCards[safeIndex] ?? null;

  const nextIndex =
    visibleCards.length > 1 ? (safeIndex + 1) % visibleCards.length : null;
  const nextCard = nextIndex !== null ? visibleCards[nextIndex] ?? null : null;

  const depth2Index =
    visibleCards.length > 2 ? (safeIndex + 2) % visibleCards.length : null;
  const depth2Card =
    depth2Index !== null ? visibleCards[depth2Index] ?? null : null;

  const persistDismissed = useCallback(
    (next: HomeDeckCardId[]) => {
      memoryDismissed.set(storageKey, next);
      setDismissedIds(next);
      try {
        localStorage.setItem(storageKey, serializeDismissedCardIds(next));
      } catch {
        // In-memory fallback
      }
    },
    [storageKey],
  );

  const dismissCard = useCallback(
    (
      cardId: HomeDeckCardId,
      direction: "left" | "right" = "left",
      _currentDx = 0,
    ) => {
      if (dismissing) return;
      const targetCard =
        visibleCards.find((c) => c.id === cardId) ?? activeCard;
      if (!targetCard) return;
      void playCue("light");
      setDismissing({ id: cardId, direction });
      const nextDismissed = [...new Set([...dismissedIds, cardId])];
      const nextCount = Math.max(0, visibleCards.length - 1);

      dismissTimer.current = setTimeout(() => {
        setDragOffset(0);
        setActiveIndex((curr) => (nextCount > 0 ? curr % nextCount : 0));
        persistDismissed(nextDismissed);
      }, 280);
    },
    [activeCard, dismissedIds, dismissing, persistDismissed, visibleCards],
  );

  useLayoutEffect(() => {
    if (dismissing && activeCard?.id !== dismissing.id) setDismissing(null);
  }, [activeCard?.id, dismissing]);

  const resetDeck = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    void playCue("selection");
    setDragOffset(0);
    setActiveIndex(0);
    setDismissing(null);
    persistDismissed([]);
  }, [persistDismissed]);

  const handleCardAction = (card: HomeDeckCard) => {
    void playCue("light");
    if (card.action.type === "open-today-session") {
      onOpenTodaySession();
    } else {
      router.push(card.action.href);
    }
  };

  const handleRouteStopSelect = (stop: HomeRouteDayStop) => {
    void playCue("light");
    if (stop.status === "today-open" || stop.status === "today-logged") {
      onOpenTodaySession();
      return;
    }
    if (stop.activityIds.length > 0) {
      const ids = new Set(stop.activityIds);
      const found = state.activities.filter((a) => ids.has(a.id));
      if (found.length > 0) onOpenActivities(found, stop.dateLabel);
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || dismissing) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a")) return;
    suppressClickRef.current = false;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      setDragOffset(dx);
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start || !activeCard) {
      setDragOffset(0);
      return;
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const decision = shouldSwipeDismiss(dx, dy, 48);
    if (decision) {
      suppressClickRef.current = true;
      dismissCard(activeCard.id, decision, dx);
    } else {
      setDragOffset(0);
    }
  };

  return (
    <section className="home-deck-section" aria-label="Updates">
      {visibleCards.length === 0 && dismissedIds.length > 0 && <div className="home-deck-header">
          <button
            type="button"
            className="home-deck-restore-btn"
            onClick={resetDeck}
            aria-label="Reset dismissed cards"
          >
            Reset
          </button>

      </div>}

      {!activeCard && !dismissing ? (
        <div className="home-deck-caught-up">
          <AppText role="body" secondary>
            You’re all caught up.
          </AppText>
        </div>
      ) : (
        <div className="home-deck-wrapper">
          <div
            className={`home-deck-stage${nextCard ? " has-back" : ""}${
              dismissing ? " is-dismissing" : ""
            }`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              dragStartRef.current = null;
              setDragOffset(0);
            }}
            onClickCapture={(e) => {
              if (suppressClickRef.current) {
                e.preventDefault();
                e.stopPropagation();
                suppressClickRef.current = false;
              }
            }}
          >
            {/* Depth 2 Preview Card */}
            {depth2Card && (
              <div
                key={`depth2-${depth2Card.id}`}
                aria-hidden="true"
                className={`home-deck-card depth-2 tone-${depth2Card.tone}`}
              />
            )}

            {/* Depth 1 Card: Next Card Immediately Rendered Underneath */}
            {nextCard && (
              <div
                key={`depth1-${nextCard.id}`}
                aria-hidden="true"
                className={`home-deck-card depth-1 tone-${nextCard.tone}`}
              >
                <DeckCardContent card={nextCard} />
              </div>
            )}

            {/* Active Top Card */}
            {activeCard && (
              <article
                key={`top-${activeCard.id}`}
                className={`home-deck-card depth-0 tone-${activeCard.tone}${
                  dismissing?.id === activeCard.id
                    ? ` is-dismissing dismiss-${dismissing.direction}`
                    : ""
                }`}
                style={
                  dismissing?.id === activeCard.id
                    ? undefined
                    : dragOffset !== 0
                    ? {
                        transform: `translateX(${dragOffset.toFixed(1)}px) rotate(${(
                          dragOffset * 0.018
                        ).toFixed(2)}deg)`,
                        transition: "none",
                      }
                    : undefined
                }
              >
                <DeckCardContent
                  card={activeCard}
                  onDismiss={() => dismissCard(activeCard.id, "left", 0)}
                  onAction={() => handleCardAction(activeCard)}
                  onSelectStop={handleRouteStopSelect}
                />
              </article>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
