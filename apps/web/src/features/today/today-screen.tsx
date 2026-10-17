"use client";
import { useState, type Ref } from "react";
import { useCompete } from "@/components/compete-context";
import { AnimatedEmber } from "@/components/mascot/animated-ember";
import type { EmberAction } from "@fitness-battle/shared/mascot";
import {
  APP_TIMEZONE,
  buildTodayRoute,
  competeNow,
  competePeriodWindow,
  countsOnTrack,
  formatVolume,
  isSampleActivity,
  primaryFreezePeriodStart,
  sportById,
  type Activity,
  type UnitSystem,
} from "@fitness-battle/shared";
import {
  JourneyTrail,
  groupActivitiesByDay,
  planJourneyTrail,
  type JourneyLane,
} from "./journey-trail";

type JourneyDay = {
  id: string;
  day: string;
  items: Activity[];
};

type JourneyStop =
  | { key: "future"; kind: "future"; lane: JourneyLane }
  | { key: "today"; kind: "today"; lane: JourneyLane }
  | { key: string; kind: "day"; lane: JourneyLane; day: JourneyDay }
  | { key: "start"; kind: "start"; lane: JourneyLane };

function buildJourneyStops(days: JourneyDay[]): JourneyStop[] {
  // One circle per activity-day. Lanes assigned bottom-up from Start so
  // Oct 17 keeps its side when Oct 18 appears (see planJourneyTrail).
  const plan = planJourneyTrail(days);
  const stops: JourneyStop[] = [
    { key: "future", kind: "future", lane: plan.future },
    { key: "today", kind: "today", lane: plan.today },
  ];
  days.forEach((day, i) => {
    stops.push({
      key: day.id,
      kind: "day",
      lane: plan.days[i]!,
      day,
    });
  });
  stops.push({ key: "start", kind: "start", lane: plan.start });
  return stops;
}

function stopRowClass(stop: JourneyStop): string {
  const tone =
    stop.kind === "future"
      ? " is-future"
      : stop.kind === "today"
        ? " is-current"
        : stop.kind === "start"
          ? " is-start"
          : "";
  return `focus-path-row${tone}`;
}

function JourneyDayStop({
  day,
  units,
  stopRef,
  onOpen,
}: {
  day: JourneyDay;
  units: UnitSystem;
  stopRef: Ref<HTMLButtonElement>;
  onOpen: (activity: Activity) => void;
}) {
  const primary = day.items[0]!;
  const volume = formatVolume(
    primary.sport,
    primary.distanceM,
    primary.movingSec,
    units,
  );
  const dayDate = new Date(`${day.day}T12:00:00.000Z`);
  const weekday = dayDate.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
  const monthDay = dayDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const detail =
    day.items.length > 1
      ? `${day.items.length} sessions`
      : primary.disposition === "excluded" || isSampleActivity(primary)
        ? `${primary.source} · sample (excluded)`
        : `${primary.verified ? "Verified" : "Open"} · ${primary.disposition === "pending" ? "pending" : "counted"}`;

  return (
    <>
      <button
        ref={stopRef}
        onClick={() => onOpen(primary)}
        aria-label={`Open ${sportById(primary.sport).name} from ${day.day} ${volume}`}
      >
        <i>✓</i>
        <b>{volume}</b>
        <small>{weekday}</small>
      </button>
      <span>
        <small>{monthDay}</small>
        <b>{sportById(primary.sport).name}</b>
        <em>{detail}</em>
      </span>
    </>
  );
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

  if (!state) return <p className="fb-copy">Loading your week…</p>;

  const route = buildTodayRoute(state);
  const now = competeNow(state);
  const frozen = state.frozenPeriods.includes(primaryFreezePeriodStart(state));
  const counted = state.activities.filter(
    (a) => countsOnTrack(a, "open") && new Date(a.startedAt) <= now,
  );
  // Days with activity (not empty calendar days). A new day with a workout
  // prepends one circle; earlier days keep the same lane.
  const journeyDays = groupActivitiesByDay(counted, 10);
  const units = state.units;
  const journeyStops = buildJourneyStops(journeyDays);

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
              timeZone: APP_TIMEZONE,
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
          <span>Your effort score is protected through next Monday.</span>
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
        {journeyDays.length ? (
          <span className="fb-note">
            Last {journeyDays.length} active day{journeyDays.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      <JourneyTrail
        stopCount={journeyStops.length}
        layoutKey={journeyStops.map((s) => `${s.key}:${s.lane}`).join("|")}
      >
        {({ setStopRef }) =>
          journeyStops.map((stop, index) => (
            <div
              key={stop.key}
              className={stopRowClass(stop)}
              data-lane={stop.lane}
            >
              {stop.kind === "future" ? (
                <>
                  <button
                    ref={setStopRef(index)}
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
                </>
              ) : null}
              {stop.kind === "today" ? (
                <>
                  <button
                    ref={setStopRef(index)}
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
                </>
              ) : null}
              {stop.kind === "day" ? (
                <JourneyDayStop
                  day={stop.day}
                  units={units}
                  stopRef={setStopRef(index)}
                  onOpen={(activity) => setExpanded(activity)}
                />
              ) : null}
              {stop.kind === "start" ? (
                <button
                  ref={setStopRef(index)}
                  type="button"
                  aria-label="Start"
                  onClick={() => react("hop")}
                >
                  <i>🏁</i>
                  <b>START</b>
                </button>
              ) : null}
            </div>
          ))
        }
      </JourneyTrail>
    </div>
  );
}
