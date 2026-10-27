"use client";
import { AppParagraph, AppHeading, AppText, StatusBadge, typographyStyle } from "@/ui/section";

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
  const eventsRef = useRef(events);
  eventsRef.current = events;
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
    if (!host?.clientWidth) return;
    host.scrollTo({
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
      <div
        className="club-event-toolbar"
        style={{
          display: "flex",
          width: "100%",
          padding: "4px 0 12px",
          borderBottom: "1px solid var(--line, #e0e5dc)",
        }}
      >
        <div
          role="tablist"
          aria-label="Registered sports"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${events.length}, 1fr)`,
            width: "100%",
          }}
        >
          {events.map((event, i) => (
            <button
              key={event.id}
              id={`${tabPrefix}-${event.id}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-controls={`${tabPrefix}-panel-${event.id}`}
              aria-label={`Show ${event.label}`}
              onClick={() => onChange(event.id)}
              style={{
                cursor: "pointer",
                padding: "8px 4px",
                border: "none",
                borderBottom: i === index ? "2.5px solid var(--ink, #00101b)" : "2.5px solid transparent",
                background: "transparent",
                color: i === index ? "var(--ink, #00101b)" : "var(--muted, #64748b)",
                ...typographyStyle("heading"),
                textAlign: "center",
                marginBottom: "-13px",
              }}
            >
              {event.label}
              {event.badge ? (
                <AppText role="caption" secondary style={{ marginLeft: 4 }}>· {event.badge}</AppText>
              ) : null}
            </button>
          ))}
        </div>
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
            if (next !== activeIndex.current) {
              activeIndex.current = next;
              fromScroll.current = true;
              onChange(eventsRef.current[next]!.id);
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
