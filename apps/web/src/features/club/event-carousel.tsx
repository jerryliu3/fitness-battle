"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { Sheet } from "@/ui/sheet";
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
  const [choosing, setChoosing] = useState(false);
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
  return (
    <section
      className="club-event-carousel"
      aria-label="Your registered events"
      aria-roledescription="carousel"
    >
      <div className="club-event-toolbar">
        <button
          type="button"
          className="club-event-choose"
          aria-haspopup="dialog"
          onClick={() => setChoosing(true)}
        >
          <span className="fb-kicker">
            Your events · {index + 1} of {events.length}
          </span>
          <strong>
            {events[index]?.label} {events[index]?.badge && <span className="club-track-badge">{events[index]?.badge}</span>} <span aria-hidden="true">⌄</span>
          </strong>
        </button>
        <button
          type="button"
          className="club-icon-button"
          aria-label="Previous event"
          disabled={index === 0}
          onClick={() => onChange(events[index - 1]!.id)}
        >
          ←
        </button>
        <button
          type="button"
          className="club-icon-button"
          aria-label="Next event"
          disabled={index === events.length - 1}
          onClick={() => onChange(events[index + 1]!.id)}
        >
          →
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
            const next = Math.max(
              0,
              Math.min(
                events.length - 1,
                Math.round(host.scrollLeft / host.clientWidth),
              ),
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
            className="club-event-page"
            role="group"
            aria-roledescription="slide"
            aria-label={`${event.label}, ${i + 1} of ${events.length}`}
            inert={i !== index}
          >
            {i === index ? (
              children
            ) : (
              <div className="club-event-preview">
                <h2>{event.label}</h2>
                <p>Swipe to open this event</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="club-event-dots" aria-label="Choose an event">
        {events.map((event, i) => (
          <button
            type="button"
            key={event.id}
            aria-label={`Show ${event.label}`}
            aria-pressed={i === index}
            onClick={() => onChange(event.id)}
          >
            <span />
          </button>
        ))}
      </div>
      <Sheet
        open={choosing}
        title="Choose your event"
        body="Each registration has its own competition field."
        onClose={() => setChoosing(false)}
      >
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            className="club-event-option"
            aria-pressed={event.id === value}
            onClick={() => {
              onChange(event.id);
              setChoosing(false);
            }}
          >
            <span>{event.label}</span>
            <span aria-hidden="true">{event.id === value ? "✓" : "→"}</span>
          </button>
        ))}
        <button
          type="button"
          className="fb-btn"
          onClick={() => {
            setChoosing(false);
            onRegister();
          }}
        >
          Register for another event
        </button>
      </Sheet>
    </section>
  );
}
