"use client";
import { useLayoutEffect, useRef, useState } from "react";
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

type Pt = { x: number; y: number };

/** Cubic segments through measured stop centers (SVG pixel space). */
function journeyPathSegments(pts: Pt[], svgWidth: number): string[] {
  if (pts.length < 2 || svgWidth < 1) return [];
  const segs: string[] = [];
  // Side bulge ≈ lane spacing (CSS --path-l/r ≈ 26–28% apart).
  const bulge = Math.max(48, svgWidth * 0.26);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i]!;
    const p1 = pts[i + 1]!;
    const midY = (p0.y + p1.y) / 2;
    const rise = p1.y - p0.y;
    if (Math.abs(p0.x - p1.x) < 4) {
      const goRight = p0.x < svgWidth * 0.5;
      const outer = goRight ? p0.x + bulge : p0.x - bulge;
      const inner = goRight ? p0.x - bulge * 0.35 : p0.x + bulge * 0.35;
      segs.push(
        `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${outer.toFixed(1)} ${(p0.y + rise * 0.28).toFixed(1)}, ${inner.toFixed(1)} ${midY.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
      );
    } else {
      segs.push(
        `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${p0.x.toFixed(1)} ${(p0.y + rise * 0.28).toFixed(1)}, ${p1.x.toFixed(1)} ${midY.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
      );
    }
  }
  return segs;
}

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

  const journeyRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const stopRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pathSegs, setPathSegs] = useState<string[]>([]);
  const [svgBox, setSvgBox] = useState({ w: 100, h: 100 });

  const now = state ? competeNow(state) : null;
  const counted =
    state && now
      ? state.activities.filter(
          (a) => countsOnTrack(a, "open") && new Date(a.startedAt) <= now,
        )
      : [];
  const sessions = counted
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 10);
  // future + today + sessions + start
  const stopCount = 2 + sessions.length + 1;

  useLayoutEffect(() => {
    if (!state || expanded) return;
    const measure = () => {
      const svg = svgRef.current;
      if (!svg) return;
      const svgRect = svg.getBoundingClientRect();
      if (svgRect.width < 1 || svgRect.height < 1) return;
      const pts: Pt[] = [];
      for (let i = 0; i < stopCount; i++) {
        const btn = stopRefs.current[i];
        if (!btn) return;
        const r = btn.getBoundingClientRect();
        pts.push({
          x: r.left + r.width / 2 - svgRect.left,
          y: r.top + r.height / 2 - svgRect.top,
        });
      }
      setSvgBox({ w: svgRect.width, h: svgRect.height });
      setPathSegs(journeyPathSegments(pts, svgRect.width));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (journeyRef.current) ro.observe(journeyRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [state, stopCount, expanded, sessions.length]);

  const setStopRef = (index: number) => (el: HTMLButtonElement | null) => {
    stopRefs.current[index] = el;
  };

  if (!state || !now) return <p className="fb-copy">Loading your week…</p>;

  const route = buildTodayRoute(state);
  const frozen = state.frozenPeriods.includes(primaryFreezePeriodStart(state));
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
      <section
        ref={journeyRef}
        className="focus-journey"
        aria-label="Activity journey"
      >
        <svg
          ref={svgRef}
          className="focus-journey-path"
          viewBox={`0 0 ${svgBox.w} ${svgBox.h}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {pathSegs.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </svg>
        <div className="focus-path-row is-future is-right">
          <button
            ref={setStopRef(0)}
            type="button"
            disabled
            aria-label="Upcoming session"
          >
            <span className="focus-path-hollow" aria-hidden="true" />
          </button>
          <span>
            <small>Up next</small>
            <b>Room for what&apos;s next</b>
          </span>
        </div>
        <div className="focus-path-row is-current">
          <button
            ref={setStopRef(1)}
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
          const toLeft = i % 2 === 0;
          return (
            <div
              className={`focus-path-row ${toLeft ? "is-left" : "is-right"}`}
              key={a.id}
            >
              <button
                ref={setStopRef(2 + i)}
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
          <button
            ref={setStopRef(2 + sessions.length)}
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
