"use client";
import { useState } from "react";
import { useCompete } from "@/components/compete-context";
import { AnimatedEmber } from "@/components/mascot/animated-ember";
import type { EmberAction } from "@fitness-battle/shared/mascot";
import {
  buildTodayRoute,
  competeNow,
  competePeriodWindow,
  countsOnTrack,
  formatVolume,
  isSampleActivity,
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

  const weekPeriod = competePeriodWindow(state, now);
  const weekStart = weekPeriod.startsAt.getTime();
  const weekEnd = weekPeriod.endsAt.getTime();
  const weekActivities = state.activities.filter((a) => {
    if (!countsOnTrack(a, "open")) return false;
    const t = new Date(a.startedAt).getTime();
    return t >= weekStart && t < weekEnd;
  });
  const weekMovingSec = weekActivities.reduce((acc, a) => acc + (a.movingSec || 0), 0);
  const weekHours = weekMovingSec / 3600;
  const weekHoursLabel =
    weekHours >= 10
      ? `${Math.round(weekHours)} hr`
      : `${(Math.round(weekHours * 10) / 10).toFixed(1).replace(/\.0$/, "")} hr`;
  const nowDayIso = now.toISOString().slice(0, 10);

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + i * 86_400_000);
    const dayIso = d.toISOString().slice(0, 10);
    const dayActs = weekActivities.filter((a) => a.startedAt.slice(0, 10) === dayIso);
    const dayVolume = dayActs.reduce((acc, a) => acc + (a.movingSec || 0), 0);
    return {
      key: dayIso,
      label: dayLabels[i],
      isToday: dayIso === nowDayIso,
      hasActivity: dayActs.length > 0,
      volume: dayVolume,
    };
  });
  const maxDayVolume = Math.max(1, ...weekDays.map((d) => d.volume));
  const weekDaysWithPct = weekDays.map((d) => ({
    ...d,
    pct: d.hasActivity ? Math.max(20, Math.round((d.volume / maxDayVolume) * 100)) : 0,
  }));

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
      <section className="focus-stats-card" aria-label="This week's progress">
        <div className="focus-stats-body">
          <div className="focus-stats-hours">
            <p className="fb-kicker">This week</p>
            <strong>{weekHoursLabel}</strong>
          </div>
          <div className="focus-mini-chart" aria-hidden="true">
            {weekDaysWithPct.map((d) => (
              <div
                key={d.key}
                className={`focus-mini-bar-col${d.isToday ? " is-today" : ""}${d.hasActivity ? "" : " is-empty"}`}
              >
                <div className="focus-mini-bar-track">
                  {d.hasActivity ? (
                    <div
                      className="focus-mini-bar-fill"
                      style={{ height: `${d.pct}%` }}
                    />
                  ) : (
                    <span className="focus-mini-bar-flat" />
                  )}
                </div>
                <span className="focus-mini-bar-day">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="focus-row">
        <h2>Your fitness journey</h2>
        {sessions.length ? (
          <span className="fb-note">Last {sessions.length} sessions</span>
        ) : null}
      </div>
      <section className="focus-journey" aria-label="Activity journey">
        <div className="focus-path-row is-future is-left">
          <button type="button" disabled aria-label="Upcoming session">
            <span className="focus-path-hollow" aria-hidden="true" />
          </button>
          <span>
            <small>Up next</small>
            <b>Room for what&apos;s next</b>
          </span>
        </div>
        <div className="focus-path-row is-current">
          <svg
            className="focus-path-curve"
            viewBox="0 0 200 140"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* From future (left) → today (center), winding S-bend */}
            <path d="M 52 4 C 52 36, 160 44, 160 78 S 48 104, 100 136" />
          </svg>
          <button
            onClick={() => {
              react("hop");
              setExpanded("suggestion");
            }}
            aria-label="Ember: open today's session"
          >
            <AnimatedEmber
              expression="happy"
              action={reaction.action}
              restartKey={reaction.key}
              loop={false}
              playing={reaction.key > 0}
            />
          </button>
          <span
            role="button"
            tabIndex={0}
            onClick={() => {
              react("hop");
              setExpanded("suggestion");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                react("hop");
                setExpanded("suggestion");
              }
            }}
            style={{ cursor: "pointer" }}
          >
            <small>Today</small>
            <b>See today&apos;s session</b>
          </span>
        </div>
        {sessions.map((a, i) => {
          const fromCenter = i === 0;
          const toLeft = i % 2 === 1;
          const curve = fromCenter
            ? "M 100 4 C 100 36, 160 52, 148 136"
            : toLeft
              ? "M 148 4 C 148 40, 40 56, 52 136"
              : "M 52 4 C 52 40, 160 56, 148 136";
          return (
            <div
              className={`focus-path-row ${toLeft ? "is-left" : "is-right"}`}
              key={a.id}
            >
              <svg
                className="focus-path-curve"
                viewBox="0 0 200 140"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d={curve} />
              </svg>
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
                  {a.disposition === "excluded" || isSampleActivity(a)
                    ? `${a.source} · sample (excluded)`
                    : `${a.verified ? "Verified" : "Open"} · ${a.disposition === "pending" ? "pending" : "counted"}`}
                </em>
              </span>
            </div>
          );
        })}
        <div className="focus-path-row is-start">
          <svg
            className="focus-path-curve"
            viewBox="0 0 200 140"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={
                sessions.length === 0
                  ? "M 100 4 C 40 48, 160 88, 100 136"
                  : sessions.length % 2 === 1
                    ? "M 148 4 C 148 40, 52 72, 100 136"
                    : "M 52 4 C 52 40, 148 72, 100 136"
              }
            />
          </svg>
          <button
            type="button"
            aria-label="Start"
            onClick={() => react("hop")}
          >
            <i>🏁</i>
            <b>START</b>
          </button>
        </div>
      </section>
    </div>
  );
}
