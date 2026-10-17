"use client";
import { useState } from "react";
import { useCompete } from "@/components/compete-context";
import { AnimatedEmber } from "@/components/mascot/animated-ember";
import type { EmberAction } from "@fitness-battle/shared/mascot";
import {
  buildTodayRoute,
  competeNow,
  countsOnTrack,
  formatVolume,
  primaryFreezePeriodStart,
  sportById,
  type Activity,
} from "@fitness-battle/shared";

export function TodayScreen() {
  const { state } = useCompete();
  const [expanded, setExpanded] = useState<"suggestion" | Activity | null>(
    null,
  );
  const [reaction, setReaction] = useState<{
    action: EmberAction;
    key: number;
  }>({ action: "wave", key: 0 });
  const react = (action: EmberAction) =>
    setReaction((value) => ({ action, key: value.key + 1 }));
  if (!state) return <p className="fb-copy">Loading your week…</p>;
  const route = buildTodayRoute(state);
  const now = competeNow(state);
  const frozen = state.frozenPeriods.includes(primaryFreezePeriodStart(state));
  const counted = state.activities.filter(
    (a) => countsOnTrack(a, "open") && new Date(a.startedAt) <= now,
  );
  const sessions = counted
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 10);
  const units = state.units;

  if (expanded === "suggestion") {
    return (
      <div className="focus-home focus-home-expanded">
        <button
          type="button"
          className="focus-expand-back"
          onClick={() => setExpanded(null)}
        >
          ← Back
        </button>
        <section className="focus-expand-panel" aria-label="Today's suggestion">
          <p className="fb-kicker">Today&apos;s suggestion</p>
          <h1>{route.suggestion.title}</h1>
          {route.suggestion.minutes ? (
            <p className="fb-copy">{route.suggestion.minutes} min</p>
          ) : null}
          <p className="fb-copy">{route.suggestion.detail}</p>
          <p className="fb-note">{route.suggestion.reason}</p>
          <AnimatedEmber
            className="focus-expand-ember"
            expression="happy"
            action={reaction.action}
            restartKey={reaction.key}
            loop={false}
            playing={reaction.key > 0}
          />
        </section>
      </div>
    );
  }

  if (expanded) {
    const a = expanded;
    return (
      <div className="focus-home focus-home-expanded">
        <button
          type="button"
          className="focus-expand-back"
          onClick={() => setExpanded(null)}
        >
          ← Back
        </button>
        <section className="focus-expand-panel" aria-label="Activity details">
          <p className="fb-kicker">
            {sportById(a.sport).name} ·{" "}
            {new Date(a.startedAt).toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })}
          </p>
          <h1>{formatVolume(a.sport, a.distanceM, a.movingSec, units)}</h1>
          <p className="fb-copy">
            Source: {a.source} · {a.verified ? "GPS verified" : "Open effort"}
          </p>
          {a.avgHr ? (
            <p className="fb-copy">Avg heart rate: {a.avgHr} bpm</p>
          ) : null}
          <p className="fb-note">
            {a.disposition === "excluded"
              ? "Sample activity. Not counted toward rankings."
              : a.disposition === "pending"
                ? "Pending file import"
                : "Counted toward your training."}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="focus-home">
      {frozen && (
        <div className="fb-pill" style={{ marginBottom: "16px" }}>
          <b>❄ Week frozen</b>
          <span>Your Elo rating is protected through next Monday.</span>
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        className="focus-suggestion"
        onClick={() => {
          setExpanded("suggestion");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded("suggestion");
          }
        }}
      >
        <span>
          <small>Today&apos;s suggestion</small>
          <strong>{route.suggestion.title}</strong>
          <em className="focus-suggestion-hint" aria-hidden="true">
            Your next move
          </em>
        </span>
      </div>
      <div className="focus-row">
        <h2>Your fitness journey</h2>
        {sessions.length ? (
          <span className="fb-note">Last {sessions.length} sessions</span>
        ) : null}
      </div>
      <section className="focus-journey" aria-label="Activity journey">
        <div className="focus-path-row is-current">
          <button
            onClick={() => {
              react("hop");
              setExpanded("suggestion");
            }}
            aria-label="Ember: open today's recommendation"
          >
            <AnimatedEmber
              expression="happy"
              action={reaction.action}
              restartKey={reaction.key}
              loop={false}
              playing={reaction.key > 0}
            />
          </button>
          <span>
            <small>Today</small>
            <b>You are here</b>
            <em>Tap Ember for your next move</em>
          </span>
        </div>
        {sessions.map((a, i) => (
          <div
            className={`focus-path-row ${i % 2 ? "is-left" : "is-right"}`}
            key={a.id}
          >
            <button
              onClick={() => setExpanded(a)}
              aria-label={`Open ${sportById(a.sport).name} session ${formatVolume(a.sport, a.distanceM, a.movingSec, units)}`}
            >
              <i>✓</i>
              <b>{formatVolume(a.sport, a.distanceM, a.movingSec, units)}</b>
              <small>
                {new Date(a.startedAt).toLocaleDateString("en-US", {
                  weekday: "short",
                  timeZone: "UTC",
                })}
              </small>
            </button>
            <span>
              <small>
                {new Date(a.startedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </small>
              <b>{sportById(a.sport).name}</b>
              <em>
                {a.disposition === "excluded"
                  ? `${a.source} · sample (excluded)`
                  : `${a.verified ? "Verified" : "Open"} · ${a.disposition === "pending" ? "pending" : "counted"}`}
              </em>
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
