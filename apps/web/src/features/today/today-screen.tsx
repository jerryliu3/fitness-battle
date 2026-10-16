"use client";

import { useCompete } from "@/components/compete-context";
import { AnimatedEmber } from "@/components/mascot/ember";
import { BootSplash } from "@/shell/boot-splash";
import { Sheet } from "@/ui/sheet";
import {
  buildTodayRoute,
  type CheckpointDisc,
  type EmberClipName,
  type EmberKConcept,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useEffect, useState } from "react";

const REACTION_MODES: { id: EmberClipName; label: string }[] = [
  { id: "jumpUp", label: "Jump Up" },
  { id: "celebrate", label: "Celebrate" },
  { id: "hop", label: "Quick Hop" },
  { id: "dash", label: "Sprint Dash" },
];

export function TodayScreen() {
  const { state } = useCompete();
  const [disc, setDisc] = useState<CheckpointDisc | null>(null);
  const [reactionClip, setReactionClip] = useState<EmberClipName>("jumpUp");
  const [activeClip, setActiveClip] = useState<EmberClipName>("idle");
  const [burstKey, setBurstKey] = useState(0);
  const [poppedPastId, setPoppedPastId] = useState<string | null>(null);
  const [replayBoot, setReplayBoot] = useState<EmberKConcept | null>(null);

  useEffect(() => {
    if (activeClip === "idle") return;
    const timer = setTimeout(() => {
      setActiveClip("idle");
    }, 1150);
    return () => clearTimeout(timer);
  }, [activeClip, burstKey]);

  if (!state) return <p className="fb-copy">Loading your week…</p>;

  const route = buildTodayRoute(state);
  const open = disc != null && disc.role !== "future";
  const body =
    disc?.role === "today" ? `${disc.detail} ${route.suggestion.reason}` : (disc?.detail ?? "");

  const pastCount = route.discs.filter((d) => d.role === "past").length;
  const totalCount = route.discs.length;
  const progressRatio = totalCount > 0 ? (pastCount + 0.5) / totalCount : 0.5;

  function triggerTodayCheckpoint(item: CheckpointDisc, openSheet = true) {
    setBurstKey((k) => k + 1);
    setActiveClip(reactionClip);
    if (openSheet) {
      setDisc(item);
    }
  }

  function triggerPastCheckpoint(item: CheckpointDisc) {
    setPoppedPastId(item.id);
    setBurstKey((k) => k + 1);
    setActiveClip("hop");
    setDisc(item);
  }

  return (
    <>
      {replayBoot ? (
        <div className="boot-replay-modal" role="dialog" aria-label="Boot animation preview">
          <BootSplash
            concept={replayBoot}
            onAnimationComplete={() => {
              setTimeout(() => setReplayBoot(null), 550);
            }}
          />
          <button
            type="button"
            className="boot-replay-close"
            onClick={() => setReplayBoot(null)}
          >
            ✕ Close Preview
          </button>
        </div>
      ) : null}

      <div className="today-header-row">
        <div>
          <p className="fb-kicker">Today · Checkpoint Trail</p>
          <p className="today-subkicker">
            {pastCount} completed · Tap Ember on the Today pad for a reaction & session plan
          </p>
        </div>
        <div className="today-proto-bar" aria-label="Animation prototype controls">
          <span className="today-proto-label">Click reaction:</span>
          {REACTION_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`today-chip ${reactionClip === mode.id ? "is-active" : ""}`}
              onClick={() => {
                setReactionClip(mode.id);
                setBurstKey((k) => k + 1);
                setActiveClip(mode.id);
              }}
            >
              {mode.label}
            </button>
          ))}
          <span className="today-proto-divider" aria-hidden="true" />
          <button
            type="button"
            className="today-chip is-accent"
            onClick={() => setReplayBoot("tucked")}
          >
            ▶ Boot: Concept 1 (Tucked K)
          </button>
          <button
            type="button"
            className="today-chip is-accent"
            onClick={() => setReplayBoot("skater")}
          >
            ▶ Boot: Concept 2 (Skater K)
          </button>
          <Link href="/design/overtaek" className="today-chip is-link">
            K-Morph Studio →
          </Link>
        </div>
      </div>

      <section className="checkpoint-frame" aria-label="Winding activity checkpoints">
        <svg
          className="checkpoint-route"
          viewBox={`0 0 ${route.frame.width} ${route.frame.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path className="checkpoint-route-base" d={route.path} />
          <path
            className="checkpoint-route-active"
            d={route.path}
            pathLength={100}
            style={{
              strokeDasharray: `${Math.round(progressRatio * 100)} 100`,
            }}
          />
        </svg>
        {route.discs.map((item) => {
          const future = item.role === "future";
          const nudge = future ? 33 : 44;
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
                <span className="checkpoint-future-ring" aria-hidden="true" />
              </div>
            );
          }
          const isToday = item.role === "today";
          const isPopped = poppedPastId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={[
                "checkpoint-disc",
                `is-${item.role}`,
                isToday && activeClip !== "idle" ? "is-reacting" : "",
                isPopped ? "is-popped" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={style}
              aria-label={item.accessibilityLabel}
              onClick={() =>
                isToday ? triggerTodayCheckpoint(item, true) : triggerPastCheckpoint(item)
              }
            >
              {isToday ? (
                <>
                  <span key={burstKey} className="checkpoint-burst-ring" aria-hidden="true" />
                  <span className="checkpoint-today-glow" aria-hidden="true" />
                  <span className="world-mascot checkpoint-ember-host" aria-hidden="true">
                    <AnimatedEmber
                      key={`${activeClip}-${burstKey}`}
                      clip={activeClip}
                      size={128}
                    />
                  </span>
                  <span className="checkpoint-today-tag" aria-hidden="true">
                    TODAY
                  </span>
                </>
              ) : null}
              {item.role === "past" ? (
                <>
                  <span className="checkpoint-check" aria-hidden="true">
                    ✓
                  </span>
                  <b>{item.volume}</b>
                </>
              ) : null}
            </button>
          );
        })}
        <div className="checkpoint-copy">
          <div className="checkpoint-copy-badge">
            <span className="checkpoint-live-dot" aria-hidden="true" />
            <span>Today’s Recommended Effort</span>
          </div>
          <h1>{route.suggestion.title}</h1>
          <div className="checkpoint-copy-meta">
            {route.suggestion.minutes != null ? (
              <small className="checkpoint-pill">{route.suggestion.minutes} min target</small>
            ) : null}
            <small className="checkpoint-reason">{route.suggestion.reason}</small>
          </div>
          <div className="checkpoint-copy-actions">
            <button
              type="button"
              className="checkpoint-cheer-btn"
              onClick={() => {
                const todayDisc = route.discs.find((d) => d.role === "today");
                if (todayDisc) triggerTodayCheckpoint(todayDisc, false);
              }}
            >
              ✨ Cheer Ember ({REACTION_MODES.find((m) => m.id === reactionClip)?.label})
            </button>
            <button
              type="button"
              className="checkpoint-open-btn"
              onClick={() => {
                const todayDisc = route.discs.find((d) => d.role === "today");
                if (todayDisc) triggerTodayCheckpoint(todayDisc, true);
              }}
            >
              View Checkpoint Detail
            </button>
          </div>
        </div>
      </section>
      <Sheet
        open={open}
        title={disc?.title ?? "Detail"}
        body={body}
        onClose={() => setDisc(null)}
      >
        {disc ? (
          <div className="sheet-ember-companion">
            <div className="sheet-ember-avatar">
              <AnimatedEmber
                clip={disc.role === "today" ? "celebrate" : "hop"}
                size={76}
              />
            </div>
            <div className="sheet-ember-copy">
              <strong>
                {disc.role === "today" ? "Ember’s Pace Note" : "Checkpoint Logged"}
              </strong>
              <span>
                {disc.role === "today"
                  ? "Every minute logged today moves your marker up the Arena lane."
                  : `Completed volume (${disc.volume ?? "logged"}) is locked into your weekly total.`}
              </span>
            </div>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
