"use client";

import { useCompete } from "@/components/compete-context";
import { AnimatedEmber } from "@/components/mascot/animated-ember";
import type { EmberAction } from "@fitness-battle/shared/mascot";
import { Sheet } from "@/ui/sheet";
import { buildTodayRoute, type CheckpointDisc } from "@fitness-battle/shared";
import { useState } from "react";

export function TodayScreen() {
  const { state } = useCompete();
  const [disc, setDisc] = useState<CheckpointDisc | null>(null);
  const [reaction, setReaction] = useState<{ action: EmberAction; key: number }>({ action: "wave", key: 0 });
  const react = (action: EmberAction) => setReaction(value => ({ action, key: value.key + 1 }));
  if (!state) return <p className="fb-copy">Loading your week…</p>;

  const route = buildTodayRoute(state);
  const open = disc != null && disc.role !== "future";
  const body =
    disc?.role === "today" ? `${disc.detail} ${route.suggestion.reason}` : (disc?.detail ?? "");

  return (
    <>
      <p className="fb-kicker">Today</p>
      <section className="checkpoint-frame" aria-label="Winding activity checkpoints">
        <svg
          className="checkpoint-route"
          viewBox={`0 0 ${route.frame.width} ${route.frame.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={route.path} />
        </svg>
        {route.discs.map((item) => {
          const future = item.role === "future";
          const nudge = future ? 33 : 39;
          const style = {
            left: `calc(${item.cx * 100}% - ${nudge}px)`,
            top: `${(item.top / route.frame.height) * 100}%`,
          };
          if (future) {
            return (
              <div
                key={item.id}
                className="checkpoint-disc is-future"
                style={style}
                role="img"
                aria-label={item.accessibilityLabel}
              >
                <span aria-hidden="true" />
              </div>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              className={`checkpoint-disc is-${item.role}`}
              style={style}
              aria-label={item.accessibilityLabel}
              onFocus={event => { if(item.role === "today" && event.currentTarget.matches(":focus-visible")) react("wave"); }}
              onMouseEnter={() => { if(item.role === "today") react("wave"); }}
              onPointerDown={() => { if(item.role === "today") react("hop"); }}
              onClick={event => { if(item.role === "today" && event.detail === 0) react("hop"); setDisc(item); }}
            >
              {item.role === "today" ? <AnimatedEmber className="checkpoint-ember" action={reaction.action} restartKey={reaction.key} loop={false} playing={reaction.key > 0} /> : null}
              {item.role === "past" ? (
                <>
                  <span aria-hidden="true">✓</span>
                  <b>{item.volume}</b>
                </>
              ) : null}
            </button>
          );
        })}
        <div className="checkpoint-copy">
          <p className="fb-kicker">Today</p>
          <h1>{route.suggestion.title}</h1>
          {route.suggestion.minutes != null ? <small>{route.suggestion.minutes} min</small> : null}
        </div>
      </section>
      <Sheet
        open={open}
        title={disc?.title ?? "Detail"}
        body={body}
        onClose={() => setDisc(null)}
      >
        {disc?.role === "today" ? <div className="checkpoint-greeting"><AnimatedEmber action="wave" loop={false} restartKey={reaction.key} /><p>One small step. Your pace.</p></div> : null}
      </Sheet>
    </>
  );
}
