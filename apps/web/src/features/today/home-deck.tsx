"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import {
  accountTimeZone,
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
  type HomeDeckCardVisual,
  type HomeRouteDayStop,
} from "@fitness-battle/shared";
import { playCue } from "@/lib/haptics";
import { AppHeading, AppText } from "@/ui/section";
import "./home-deck.css";

const memoryDismissed = new Map<string, HomeDeckCardId[]>();

function CompactRouteStrip({
  stops,
  todayIndex,
  onSelectStop,
}: {
  stops: HomeRouteDayStop[];
  todayIndex: number;
  onSelectStop?: (stop: HomeRouteDayStop) => void;
}) {
  const trackPct = Math.round((Math.max(0, Math.min(6, todayIndex)) / 6) * 100);
  return (
    <div className="home-route-strip-wrap" aria-label="Weekly route progress">
      <div className="home-route-track">
        <span
          className="home-route-track-fill"
          style={{ "--track-pct": `${trackPct}%` } as CSSProperties}
        />
      </div>
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
              style={{ "--stop-index": stop.index } as CSSProperties}
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
                {!isLogged ? (isToday ? "→" : "·") : null}
                {isLogged ? <span className="home-route-node-fill">✓</span> : null}
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

function CompactVisualBar({ visual }: { visual: HomeDeckCardVisual }) {
  const fillPct = Math.round(Math.max(0, Math.min(1, visual.primaryFraction)) * 100);
  const isCompare = visual.mode === "compare" && visual.markerFraction != null;
  const markerPct =
    visual.markerFraction == null
      ? null
      : Math.round(Math.max(0.06, Math.min(0.94, visual.markerFraction)) * 100);
  const startPct = isCompare && markerPct != null ? Math.min(fillPct, markerPct) : 0;
  const spanWidthPct = isCompare && markerPct != null ? Math.abs(fillPct - markerPct) : fillPct;
  const youLeads = markerPct != null && fillPct > markerPct;
  const rivalLeads = markerPct != null && markerPct > fillPct;

  return (
    <div className="home-deck-visual">
      {(visual.leftLabel || visual.rightLabel) && (
        <div className={`home-deck-visual-meta${!visual.leftLabel ? " is-end" : ""}`}>
          {visual.leftLabel ? (
            <span className={isCompare && visual.leftLabel !== "You" ? "is-muted" : undefined}>
              {visual.leftLabel}
            </span>
          ) : null}
          {visual.rightLabel ? (
            <span className={isCompare && visual.rightLabel === "You" ? undefined : "is-muted"}>
              {visual.rightLabel}
            </span>
          ) : null}
        </div>
      )}
      <div className="home-deck-visual-track">
        {isCompare && markerPct != null ? (
          <>
            <span
              className="home-deck-visual-span"
              style={
                {
                  "--start-left": `${startPct}%`,
                  "--span-width": `${spanWidthPct}%`,
                } as CSSProperties
              }
            />
            <span
              className={`home-deck-visual-marker${rivalLeads ? " is-leader" : ""}`}
              style={
                rivalLeads
                  ? ({ "--start-left": `${startPct}%`, "--end-left": `${markerPct}%` } as CSSProperties)
                  : { left: `${markerPct}%` }
              }
            />
            <span
              className={`home-deck-visual-you${youLeads ? " is-leader" : ""}`}
              style={
                youLeads
                  ? ({ "--start-left": `${startPct}%`, "--end-left": `${fillPct}%` } as CSSProperties)
                  : { left: `${fillPct}%` }
              }
            />
          </>
        ) : (
          <span
            className="home-deck-visual-fill"
            style={{ "--fill-pct": `${fillPct}%` } as CSSProperties}
          />
        )}
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
        <button
          type="button"
          className="home-deck-dismiss"
          aria-label={onDismiss ? `Dismiss ${card.title} card` : undefined}
          aria-hidden={!onDismiss}
          tabIndex={onDismiss ? 0 : -1}
          disabled={!onDismiss}
          onClick={onDismiss}
        >
          ✕
        </button>
      </div>

      <div className="home-deck-card-body">
        <AppHeading level={3} role="heading" className="home-deck-title">
          {card.title}
        </AppHeading>
        <p className="home-deck-subtitle">{card.subtitle}</p>
        {card.routeWeek ? (
          <CompactRouteStrip
            stops={card.routeWeek.stops}
            todayIndex={card.routeWeek.todayIndex}
            onSelectStop={onSelectStop}
          />
        ) : card.visual ? (
          <CompactVisualBar visual={card.visual} />
        ) : null}
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
  const storageKey = homeDeckDismissStorageKey(accountKey, now, accountTimeZone(state));

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
      {!activeCard && !dismissing ? (
        <div className="home-deck-caught-up">
          <AppText role="body" secondary>
            You’re all caught up.
          </AppText>
          {dismissedIds.length > 0 && (
            <button
              type="button"
              className="home-deck-restore-btn"
              onClick={resetDeck}
              aria-label="Reset dismissed cards"
            >
              Reset
            </button>
          )}
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
                className={`home-deck-card depth-0 is-front tone-${activeCard.tone}${
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
