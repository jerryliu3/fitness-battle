"use client";
import { AppParagraph, AppHeading, StatusBadge } from "@/ui/section";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { competeEventCarouselPageIndex } from "@fitness-battle/shared";
export type ClubEvent = { id: string; label: string; badge?: string };
export function EventCarousel({
  events,
  value,
  onChange,
  onRegister,
  children,
}: {
  events: ClubEvent[];
  value: string;
  onChange: (id: string) => void;
  onRegister: () => void;
  children: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    fromScroll = useRef(false);
  const reduced = useReducedMotion();
  const index = Math.max(
    0,
    events.findIndex((event) => event.id === value),
  );
  const activeIndex = useRef(index);
  activeIndex.current = index;
  useEffect(() => {
    const host = scroller.current;
    if (!host) return;
    let width = host.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width === host.clientWidth) return;
      width = host.clientWidth;
      host.scrollTo({ left: activeIndex.current * width, behavior: "instant" });
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    const host = scroller.current;
    host?.scrollTo({
      left: index * host.clientWidth,
      behavior: reduced ? "instant" : "smooth",
    });
  }, [index, reduced]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const tabPrefix = useId().replace(/:/g, "");
  return (
    <section
      className="club-event-carousel"
      aria-label="Your registered events"
      aria-roledescription="carousel"
    >
      {/* Sport chips select the active field; horizontal swipe on the pages still switches events. */}
      <div className="club-event-chips-bar">
        <div className="club-event-chips" role="tablist" aria-label="Registered events">
          {events.map((event) => (
            <button
              key={event.id}
              id={`${tabPrefix}-${event.id}`}
              type="button"
              role="tab"
              className="club-event-chip"
              aria-selected={event.id === value}
              aria-controls={`${tabPrefix}-panel-${event.id}`}
              onClick={() => onChange(event.id)}
            >
              {event.label}
              {event.badge ? (
                <StatusBadge>{event.badge}</StatusBadge>
              ) : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="club-event-chip is-register"
          aria-label="Register for an event"
          onClick={onRegister}
        >
          Register
        </button>
      </div>
      <div
        ref={scroller}
        className="club-event-pages"
        onScroll={() => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            const host = scroller.current;
            if (!host?.clientWidth) return;
            const next = competeEventCarouselPageIndex(
              host.scrollLeft,
              host.clientWidth,
              events.length,
            );
            if (next !== index) {
              fromScroll.current = true;
              onChange(events[next]!.id);
            }
          }, 150);
        }}
      >
        {events.map((event, i) => (
          <div
            key={event.id}
            id={`${tabPrefix}-panel-${event.id}`}
            className="club-event-page"
            role="tabpanel"
            aria-labelledby={`${tabPrefix}-${event.id}`}
            aria-roledescription="slide"
            aria-label={`${event.label}, ${i + 1} of ${events.length}`}
            aria-hidden={i !== index}
            inert={i !== index}
          >
            {i === index ? (
              children
            ) : (
              <div className="club-event-preview">
                <AppHeading level={2} role="heading">{event.label}</AppHeading>
                <AppParagraph typographyRole="body">Swipe to open this event</AppParagraph>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
