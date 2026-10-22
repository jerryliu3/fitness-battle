"use client";
import { WeekRecap } from "@/features/club/week-recap";
import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { Sheet } from "@/ui/sheet";
import { SessionStage } from "./session-stage";
import { RivalCard } from "@/features/club/rival-card";
import { ClubWelcome } from "@/features/club/welcome";
import { EffortRail } from "@/features/progress/effort-rail";
import { ActivityActions } from "./activity-actions";
import { newJourneyStops } from "./journey-reveal";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { playCue } from "@/lib/haptics";
import { AnimatedPolygon, AnimatedPolyline } from "./activity-chart";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { AnimatedEmber } from "@/components/mascot/animated-ember";
import type { EmberAction } from "@fitness-battle/shared/mascot";
import {
  APP_TIMEZONE,
  buildTodayRoute,
  competeNow,
  competePeriodWindow,
  countsOnTrack,
  dayKey,
  formatDistanceM,
  formatVolume,
  getZonedWeekday,
  isSampleActivity,
  primaryFreezePeriodStart,
  sportById,
  weeklyPeriodBounds,
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
  | { key: "today"; kind: "today"; lane: JourneyLane; day?: JourneyDay }
  | { key: "past" | "past-more"; kind: "past"; lane: JourneyLane }
  | { key: string; kind: "day"; lane: JourneyLane; day: JourneyDay }
  | { key: "start"; kind: "start"; lane: JourneyLane };

function buildJourneyStops(
  days: JourneyDay[],
  hasMorePast = false,
  allDays = days,
  todayDay?: JourneyDay,
): JourneyStop[] {
  if (days.length === 0 && !todayDay) {
    // When no past sessions exist, wind cleanly: Today (r) -> Past (l) -> Start (c)
    // Guarantee no consecutive stops share a lane.
    return [
      { key: "today", kind: "today", lane: "r" },
      { key: "past", kind: "past", lane: "l" },
      { key: "start", kind: "start", lane: "c" },
    ];
  }
  const plan = planJourneyTrail(allDays);
  const stops: JourneyStop[] = [
    { key: "today", kind: "today", lane: plan.today, day: todayDay },
  ];
  days.forEach((day, i) => {
    stops.push({
      key: day.id,
      kind: "day",
      lane: plan.days[i]!,
      day,
    });
  });
  if (hasMorePast) {
    stops.push({ key: "past-more", kind: "past", lane: plan.start });
  } else {
    stops.push({ key: "start", kind: "start", lane: plan.start });
  }
  return stops;
}

function stopRowClass(stop: JourneyStop): string {
  const tone =
    stop.kind === "past"
      ? stop.key === "past-more"
        ? " is-past-more"
        : " is-past"
      : stop.kind === "today"
        ? " is-current"
        : stop.kind === "start"
          ? " is-start"
          : "";
  return `focus-path-row${tone}`;
}

function formatDayHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours <= 0) return "0 hr";
  const rounded = Math.round(hours * 10) / 10;
  if (rounded >= 10) {
    return `${Math.round(rounded)} hr`;
  }
  const display = rounded < 0.1 ? "0.1" : rounded.toFixed(1).replace(/\.0$/, "");
  return `${display} hr`;
}

function JourneyDayStop({
  day,
  stopRef,
  onOpen,
}: {
  day: JourneyDay;
  stopRef: Ref<HTMLButtonElement>;
  onOpen: (day: JourneyDay) => void;
}) {
  const primary = day.items[0]!;
  const totalMovingSec = day.items.reduce(
    (acc, a) => acc + (a.movingSec || 0),
    0,
  );
  const hoursLabel = formatDayHours(totalMovingSec);
  const dayDate = new Date(`${day.day}T12:00:00.000Z`);
  const dateWithWeekday = dayDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const sessionTitle =
    day.items.length > 1
      ? `${day.items.length} sessions`
      : sportById(primary.sport).name;

  return (
    <>
      <button
        ref={stopRef}
        onClick={() => onOpen(day)}
        aria-label={`Open sessions from ${day.day}`}
      >
        <i>✓</i>
        <b>{hoursLabel}</b>
      </button>
      <span
        role="button"
        tabIndex={0}
        onClick={() => onOpen(day)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(day);
          }
        }}
        style={{ cursor: "pointer" }}
      >
        <small>{dateWithWeekday}</small>
        <b>{sessionTitle}</b>
      </span>
    </>
  );
}

function SessionStopPeek({
  title,
  kicker,
  detail,
  onOpen,
  onClose,
  peekRef,
}: {
  title: string;
  kicker: string;
  detail?: string;
  onOpen: () => void;
  onClose: () => void;
  peekRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={peekRef} className="focus-stop-peek" role="dialog" aria-label="Session preview">
      <button type="button" className="focus-stop-peek-close" aria-label="Close preview" onClick={onClose}>
        ×
      </button>
      <p className="fb-kicker">{kicker}</p>
      <strong>{title}</strong>
      {detail ? <p className="fb-note">{detail}</p> : null}
      <button type="button" className="fb-btn" onClick={onOpen}>
        See session
      </button>
    </div>
  );
}

type SessionTarget = "suggestion" | Activity | JourneyDay;

type SessionPhase =
  | { kind: "closed" }
  | { kind: "peek"; target: SessionTarget }
  | { kind: "full"; target: SessionTarget };

export function TodayScreen() {
  const onHome = usePathname() === "/today";
  const { user } = useAuth();
  const { state, dispatch } = useCompete();
  const reduced = useReducedMotion();
  const [removed, setRemoved] = useState<Activity | null>(null);
  const [session, setSession] = useState<SessionPhase>({ kind: "closed" });
  const [revealingStops, setRevealingStops] = useState<string[]>([]);
  const peekRef = useRef<HTMLDivElement>(null);
  const sessionReturnFocus = useRef<HTMLElement | null>(null);
  const [reaction, setReaction] = useState<{
    action: EmberAction;
    key: number;
  }>({ action: "wave", key: 0 });
  const react = (action: EmberAction) =>
    setReaction((value) => ({ action, key: value.key + 1 }));

  useEffect(() => {
    if (!revealingStops.length) return;
    const timer = window.setTimeout(() => setRevealingStops([]), 1050);
    return () => window.clearTimeout(timer);
  }, [revealingStops]);

  useEffect(() => {
    if (session.kind !== "peek") return;
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !peekRef.current?.contains(target)) {
        setSession({ kind: "closed" });
      }
    };
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [session.kind]);

  useEffect(()=>{if(!onHome)setSession({kind:"closed"});},[onHome]);

  if (!state) return <p className="fb-copy">Loading your week…</p>;

  const route = buildTodayRoute(state);
  const now = competeNow(state);
  const frozen = state.frozenPeriods.includes(primaryFreezePeriodStart(state));
  const counted = state.activities.filter(
    (a) => countsOnTrack(a, "open") && new Date(a.startedAt) <= now,
  );
  // Days with activity (not empty calendar days). A new day with a workout
  // prepends one circle; earlier days keep the same lane.
  const journeyDays = groupActivitiesByDay(counted, 30);
  const todayKey = dayKey(now, APP_TIMEZONE);
  const todayDay = journeyDays.find((d) => d.day === todayKey);
  const pastDays = journeyDays.filter((d) => d.day !== todayKey);
  const allPastDays = groupActivitiesByDay(
    counted.filter(
      (a) => dayKey(new Date(a.startedAt), APP_TIMEZONE) !== todayKey,
    ),
    Infinity,
  );
  const shownSessions =
    pastDays.reduce((acc, d) => acc + d.items.length, 0) +
    (todayDay ? todayDay.items.length : 0);
  const hasMorePast = counted.length > shownSessions;
  const units = state.units;
  const journeyStops = buildJourneyStops(
    pastDays,
    hasMorePast,
    allPastDays,
    todayDay,
  );

  const todayStop = `today:${todayKey}`;
  const revealIdentity = JSON.stringify([todayStop, ...journeyDays.map((day) => day.id)]);
  useLayoutEffect(() => {
    if (!onHome) return;
    const key = `fb:journey-seen-stops:${user?.id ?? state.name ?? "guest"}`;
    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      const seen = Array.isArray(parsed) && parsed.every((id) => typeof id === "string") ? parsed as string[] : null;
      const current = JSON.parse(revealIdentity) as string[];
      const fresh = newJourneyStops(seen, current);
      if (fresh.length) setRevealingStops(reduced ? [] : fresh);
      localStorage.setItem(key, JSON.stringify([...new Set([...(seen ?? []), ...current])].slice(-400)));
    } catch {
      // Blocked storage must not turn every mount into another entrance.
      setRevealingStops([]);
    }
  }, [onHome, revealIdentity, reduced, state.name, user?.id]);

  const weekPeriod = competePeriodWindow(state, now);
  const weekStart = weekPeriod.startsAt.getTime();
  const weekEnd = weekPeriod.endsAt.getTime();
  const weekActivities = state.activities.filter((a) => {
    if (!countsOnTrack(a, "open")) return false;
    const t = new Date(a.startedAt).getTime();
    return t >= weekStart && t < weekEnd && t <= now.getTime();
  });
  const weekMovingSec = weekActivities.reduce(
    (acc, a) => acc + (a.movingSec || 0),
    0,
  );
  const weekDistanceM = weekActivities.reduce(
    (acc, a) => acc + (a.distanceM || 0),
    0,
  );
  const unitLabel = units === "metric" ? "km" : "mi";
  const weekHours = weekMovingSec / 3600;
  const weekHoursLabel =
    weekHours >= 10
      ? `${Math.round(weekHours)} hr`
      : `${(Math.round(weekHours * 10) / 10).toFixed(1).replace(/\.0$/, "")} hr`;

  // Previous calendar week in Eastern time, including DST changes.
  const prevWeekStart = weeklyPeriodBounds(
    new Date(weekStart - 1),
  ).startsAt.getTime();
  const prevWeekEnd = weekStart;
  const prevWeekActivities = state.activities.filter((a) => {
    if (!countsOnTrack(a, "open")) return false;
    const t = new Date(a.startedAt).getTime();
    return t >= prevWeekStart && t < prevWeekEnd;
  });
  const prevWeekMovingSec = prevWeekActivities.reduce(
    (acc, a) => acc + (a.movingSec || 0),
    0,
  );
  const prevPeriodResult = state.periodResults.find(
    (r) =>
      r.sport === state.primary &&
      (r.track === "open" || !r.track) &&
      new Date(r.periodStart).getTime() >= prevWeekStart - 3600000 &&
      new Date(r.periodStart).getTime() <= prevWeekStart + 3600000,
  );

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  // Index of today (0 = Monday, 6 = Sunday) in America/New_York
  const weekday = getZonedWeekday(now, APP_TIMEZONE);
  const nowDayIndex = Math.min(6, Math.max(0, weekday === 0 ? 6 : weekday - 1));

  // Cumulative hours for current week up to now
  let currRunningSec = 0;
  const currCumulativeHours: number[] = [];
  for (let i = 0; i <= nowDayIndex; i++) {
    const d = new Date(weekStart + i * 86_400_000 + 43_200_000);
    const dayIso = dayKey(d, APP_TIMEZONE);
    const dayActs = weekActivities.filter(
      (a) => dayKey(new Date(a.startedAt), APP_TIMEZONE) === dayIso,
    );
    const daySec = dayActs.reduce((acc, a) => acc + (a.movingSec || 0), 0);
    currRunningSec += daySec;
    currCumulativeHours.push(Number((currRunningSec / 3600).toFixed(2)));
  }
  if (currCumulativeHours.length > 0) {
    currCumulativeHours[currCumulativeHours.length - 1] = Number(
      (weekMovingSec / 3600).toFixed(2),
    );
  }

  // Cumulative hours for previous week (all 7 days)
  let prevRunningSec = 0;
  const prevCumulativeHours: number[] = [];
  if (prevWeekActivities.length > 0) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(prevWeekStart + i * 86_400_000 + 43_200_000);
      const dayIso = dayKey(d, APP_TIMEZONE);
      const dayActs = prevWeekActivities.filter(
        (a) => dayKey(new Date(a.startedAt), APP_TIMEZONE) === dayIso,
      );
      const daySec = dayActs.reduce((acc, a) => acc + (a.movingSec || 0), 0);
      prevRunningSec += daySec;
      prevCumulativeHours.push(Number((prevRunningSec / 3600).toFixed(2)));
    }
  } else if (prevPeriodResult && prevPeriodResult.movingSec > 0) {
    const totalPrevHours = prevPeriodResult.movingSec / 3600;
    for (let i = 0; i < 7; i++) {
      prevCumulativeHours.push(
        Number(((totalPrevHours * (i + 1)) / 7).toFixed(2)),
      );
    }
  } else {
    for (let i = 0; i < 7; i++) {
      prevCumulativeHours.push(0);
    }
  }

  const currTotalHours = Number((weekMovingSec / 3600).toFixed(1));
  const prevTotalHours = Number(
    (
      prevCumulativeHours[prevCumulativeHours.length - 1] ??
      prevWeekMovingSec / 3600
    ).toFixed(1),
  );
  const hoursDelta = Number(
    (currTotalHours - (prevCumulativeHours[nowDayIndex] ?? 0)).toFixed(1),
  );

  // SVG chart geometry
  const chartW = 340;
  const chartH = 132;
  const xStart = 34;
  const xEnd = 324;
  const yTop = 14;
  const yBottom = 100;
  const yMidPos = Math.round((yTop + yBottom) / 2);

  const maxVal = Math.max(...currCumulativeHours, ...prevCumulativeHours, 0.5);
  const yMax = Math.max(1, Math.ceil(maxVal * 1.15));
  const yMid = Math.round((yMax / 2) * 10) / 10;

  const getY = (hrs: number) =>
    yBottom - (Math.min(hrs, yMax) / yMax) * (yBottom - yTop);
  const getX = (dayIdx: number) =>
    xStart + ((dayIdx + 1) / 7) * (xEnd - xStart);
  const getDayCenterX = (dayIdx: number) =>
    xStart + ((dayIdx + 0.5) / 7) * (xEnd - xStart);

  const weekDurationMs = weekEnd - weekStart;
  const weekProgress = Math.min(
    1,
    Math.max(0, (now.getTime() - weekStart) / (weekDurationMs || 1)),
  );
  // Continuous X coordinate reflecting exact progress through the week
  const currPreciseX = Number(
    (xStart + weekProgress * (xEnd - xStart)).toFixed(1),
  );
  const currLastY = getY(currTotalHours);

  const prevPoints = [
    `${xStart.toFixed(1)},${getY(0).toFixed(1)}`,
    ...prevCumulativeHours.map(
      (h, i) => `${getX(i).toFixed(1)},${getY(h).toFixed(1)}`,
    ),
  ].join(" ");

  const currPointsList = [
    `${xStart.toFixed(1)},${getY(0).toFixed(1)}`,
    ...currCumulativeHours
      .slice(0, nowDayIndex)
      .map((h, i) => `${getX(i).toFixed(1)},${getY(h).toFixed(1)}`),
    `${currPreciseX.toFixed(1)},${currLastY.toFixed(1)}`,
  ];
  const currLinePoints = currPointsList.join(" ");
  const currAreaPoints = `${currLinePoints} ${currPreciseX.toFixed(1)},${yBottom} ${xStart.toFixed(1)},${yBottom}`;

  const prevLastY = getY(prevTotalHours);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + i * 86_400_000 + 43_200_000);
    const dayIso = dayKey(d, APP_TIMEZONE);
    const dayActs = weekActivities.filter(
      (a) => dayKey(new Date(a.startedAt), APP_TIMEZONE) === dayIso,
    );
    return {
      key: dayIso,
      label: dayLabels[i],
      isToday: i === nowDayIndex,
      hasActivity: dayActs.length > 0,
    };
  });
  const activeDaysCount = weekDays.filter((d) => d.hasActivity).length;

  function openSession(target: SessionTarget, phase: "peek" | "full") {
    if(phase==="peek" && document.activeElement instanceof HTMLElement)sessionReturnFocus.current=document.activeElement;
    setRevealingStops([]);
    void playCue("light");
    setSession({ kind: phase, target });
  }

  function closeSession() {
    void playCue("soft");
    setSession({ kind: "closed" });
  }

  const detailTarget = session.kind === "full" ? session.target : null;
  const detailActivities = detailTarget === "suggestion"
    ? counted.filter(a => dayKey(new Date(a.startedAt), APP_TIMEZONE) === todayKey)
    : detailTarget && typeof detailTarget !== "string"
      ? "items" in detailTarget ? detailTarget.items : [detailTarget]
      : [];

  const peekStopKey =
    session.kind === "peek"
      ? session.target === "suggestion"
        ? "today"
        : "items" in session.target
          ? session.target.id
          : journeyDays.find((d) =>
              d.items.some(
                (a) =>
                  typeof session.target !== "string" &&
                  "id" in session.target &&
                  a.id === session.target.id,
              ),
            )?.id ?? null
      : null;

  return (
    <div className="focus-home-stage">
      <Sheet body="" returnFocusTo={sessionReturnFocus} open={session.kind === "full"} title={detailTarget === "suggestion" ? "Today" : "Your session"} onClose={closeSession}>
        <SessionStage state={state} activities={detailActivities} suggestion={route.suggestion} actions={<ActivityActions />} onRemove={activityId => { setRemoved(detailActivities.find(a=>a.id===activityId)??null); dispatch({type:"set-disposition",activityId,disposition:"excluded"}); if(detailActivities.length <= 1)closeSession(); }}/>
      </Sheet>
      <div className="focus-home-overlay">
      <ClubWelcome state={state} />
      {removed ? <div className="fb-note" role="status">Session removed. <button type="button" className="fb-btn-ghost" onClick={() => { dispatch({type:"set-disposition", activityId:removed.id, disposition:removed.disposition}); setRemoved(null); }}>Undo</button></div> : null}
      {frozen && (
        <div className="fb-pill" style={{ marginBottom: "16px" }}>
          <b>❄ Week frozen</b>
          <span>Your effort score is protected through next Monday.</span>
        </div>
      )}
      <section className="focus-stats-card" aria-label="This week's progress">
        <div className="focus-stats-header">
          <div>
            <p className="fb-kicker">This week</p>
            <div className="focus-stats-numbers">
              <strong>
                {currTotalHours === 0
                  ? "0 hours"
                  : `${currTotalHours.toFixed(1)} hrs`}
              </strong>
              <span className="focus-stats-session-count">
                {weekActivities.length}{" "}
                {weekActivities.length === 1 ? "session" : "sessions"}
              </span>
            </div>
          </div>
          <ActivityActions compact />
        </div>

        <div
          className="focus-activity-chart-wrap"
          aria-label="Cumulative hours comparison chart"
        >
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="focus-activity-svg"
            role="img"
            aria-label={`Cumulative hours: ${currTotalHours === 0 ? "0 hours" : `${currTotalHours.toFixed(1)} hrs`} this week compared to ${prevTotalHours.toFixed(1)} hrs last week`}
          >
            <defs>
              <linearGradient
                id="focus-activity-grad"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#f1c75b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f1c75b" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal gridlines & Y-axis labels */}
            <text
              x="26"
              y={yTop + 4}
              textAnchor="end"
              fontSize="9"
              fill="#616c63"
              fontWeight="500"
            >
              {yMax}h
            </text>
            <line
              x1={xStart}
              y1={yTop}
              x2={xEnd}
              y2={yTop}
              className="focus-activity-gridline"
              strokeDasharray="3 3"
            />

            <text
              x="26"
              y={yMidPos + 3}
              textAnchor="end"
              fontSize="9"
              fill="#616c63"
              fontWeight="500"
            >
              {yMid}h
            </text>
            <line
              x1={xStart}
              y1={yMidPos}
              x2={xEnd}
              y2={yMidPos}
              className="focus-activity-gridline"
              strokeDasharray="3 3"
            />

            <text
              x="26"
              y={yBottom + 3}
              textAnchor="end"
              fontSize="9"
              fill="#616c63"
              fontWeight="500"
            >
              0h
            </text>
            <line
              x1={xStart}
              y1={yBottom}
              x2={xEnd}
              y2={yBottom}
              className="focus-activity-gridline"
            />

            {/* Previous week baseline (dashed line across the week) */}
            <polyline
              points={prevPoints}
              className="focus-activity-line-prev"
            />

            {/* Current week area fill & line */}
            <AnimatedPolygon
              points={currAreaPoints}
              className="focus-activity-area"
              reduced={Boolean(reduced)}
            />
            <AnimatedPolyline
              points={currLinePoints}
              className="focus-activity-line-curr"
              reduced={Boolean(reduced)}
            />

            {/* Live pulsing dot indicator at exact time point */}
            <circle
              cx={currPreciseX}
              cy={currLastY}
              r="6.5"
              fill="none"
              stroke="#f1c75b"
              strokeWidth="2"
              className="focus-trend-pulse"
            />
            <circle cx={currPreciseX} cy={currLastY} r="3.5" fill="#f1c75b" />

            {/* Direct on-chart label: This week over the indicator */}
            <text
              x={Math.max(xStart + 30, Math.min(xEnd - 30, currPreciseX))}
              y={Math.max(yTop + 10, currLastY - 10)}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fill="#282f2c"
            >
              This week
            </text>

            {/* Direct on-chart label: Last week at the end of the baseline */}
            <text
              x={xEnd}
              y={
                Math.abs(currPreciseX - xEnd) < 55 && Math.abs(currLastY - prevLastY) < 18
                  ? Math.min(yBottom - 6, prevLastY + 12)
                  : Math.max(yTop + 10, prevLastY - 6)
              }
              textAnchor="end"
              fontSize="9"
              fontWeight="600"
              fill="#616c63"
            >
              Last week
            </text>

            {/* X-axis day labels */}
            {dayLabels.map((lbl, i) => {
              const cx = getDayCenterX(i);
              const isToday = i === nowDayIndex;
              return (
                <text
                  key={i}
                  x={cx}
                  y={yBottom + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={isToday ? "700" : "500"}
                  fill={isToday ? "#282f2c" : "#616c63"}
                >
                  {lbl}
                </text>
              );
            })}
          </svg>
        </div>
      </section>
      </div>
      <RivalCard state={state} />
      <EffortRail />
      <WeekRecap state={state} />
      <div className="focus-home-journey-layer">
      <JourneyTrail
        stopCount={journeyStops.length}
        layoutKey={journeyStops.map((s) => `${s.key}:${s.lane}`).join("|")}
        revealing={journeyStops.flatMap((stop, index) => revealingStops.includes(stop.kind === "today" ? todayStop : stop.key) ? [index] : [])}
      >
        {({ setStopRef }) =>
          journeyStops.map((stop, index) => (
            <div
              key={stop.key}
              className={`${stopRowClass(stop)}${revealingStops.includes(stop.kind === "today" ? todayStop : stop.key) ? " is-new-stop" : ""}`}
              data-lane={stop.lane}
            >
              {stop.kind === "past" ? (
                stop.key === "past-more" ? (
                  <>
                    <button
                      ref={setStopRef(index)}
                      type="button"
                      aria-label="More past sessions"
                      onClick={() => react("hop")}
                    >
                      <i>⋯</i>
                      <b>PAST</b>
                    </button>
                    <span>
                      <small>Past</small>
                      <b>More past sessions</b>
                    </span>
                  </>
                ) : (
                  <>
                    <button
                      ref={setStopRef(index)}
                      type="button"
                      disabled
                      aria-label="Past sessions"
                    />
                    <span>
                      <small>Past</small>
                      <b>Past sessions will appear here</b>
                    </span>
                  </>
                )
              ) : null}
              {stop.kind === "today" ? (
                stop.day ? (
                  <>
                    {peekStopKey === "today" && session.kind === "peek" && session.target !== "suggestion" ? (
                      <SessionStopPeek
                        kicker={
                          "items" in session.target
                            ? `${new Date(`${session.target.day}T12:00:00Z`).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                timeZone: "UTC",
                              })}`
                            : sportById(session.target.sport).name
                        }
                        title={
                          "items" in session.target
                            ? session.target.items.length === 1
                              ? `${sportById(session.target.items[0].sport).name} · ${formatVolume(
                                  session.target.items[0].sport,
                                  session.target.items[0].distanceM,
                                  session.target.items[0].movingSec,
                                  units,
                                )}`
                              : `${session.target.items.length} sessions recorded`
                            : formatVolume(
                                session.target.sport,
                                session.target.distanceM,
                                session.target.movingSec,
                                units,
                              )
                        }
                        onOpen={() => {
                          if (session.kind === "peek" && session.target !== "suggestion") {
                            openSession(session.target, "full");
                          }
                        }}
                        onClose={closeSession}
                        peekRef={peekRef}
                      />
                    ) : null}
                    <button
                      ref={setStopRef(index)}
                      onClick={() => {
                        react("hop");
                        openSession(stop.day!, "peek");
                      }}
                      aria-label={`Open today's sessions from ${stop.day.day}`}
                    >
                      <AnimatedEmber
                        expression="happy"
                        action={reaction.action}
                        restartKey={reaction.key}
                        loop={false}
                        playing={reaction.key > 0}
                      />
                      <i>✓</i>
                      <b>
                        {formatDayHours(
                          stop.day.items.reduce(
                            (acc, a) => acc + (a.movingSec || 0),
                            0,
                          ),
                        )}
                      </b>
                    </button>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        react("hop");
                        openSession(stop.day!, "peek");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          react("hop");
                          openSession(stop.day!, "peek");
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <small>
                        {new Date(`${stop.day.day}T12:00:00.000Z`).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            timeZone: "UTC",
                          },
                        )}
                      </small>
                      <b>
                        {stop.day.items.length > 1
                          ? `${stop.day.items.length} sessions`
                          : sportById(stop.day.items[0].sport).name}
                      </b>
                    </span>
                  </>
                ) : (
                  <>
                    {peekStopKey === "today" ? (
                      <SessionStopPeek
                        kicker="Today"
                        title={route.suggestion.title}
                        onOpen={() => openSession("suggestion", "full")}
                        onClose={closeSession}
                        peekRef={peekRef}
                      />
                    ) : null}
                    <button
                      ref={setStopRef(index)}
                      onClick={() => {
                        react("hop");
                        openSession("suggestion", "peek");
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
                        openSession("suggestion", "peek");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          react("hop");
                          openSession("suggestion", "peek");
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <small>Today</small>
                      <b>See today&apos;s session</b>
                    </span>
                  </>
                )
              ) : null}
              {stop.kind === "day" ? (
                <>
                  {peekStopKey === stop.day.id &&
                  session.kind === "peek" &&
                  session.target !== "suggestion" ? (
                    <SessionStopPeek
                      kicker={
                        "items" in session.target
                          ? `${new Date(`${session.target.day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}`
                          : sportById(session.target.sport).name
                      }
                      title={
                        "items" in session.target
                          ? session.target.items.length === 1
                            ? `${sportById(session.target.items[0].sport).name} · ${formatVolume(
                                session.target.items[0].sport,
                                session.target.items[0].distanceM,
                                session.target.items[0].movingSec,
                                units,
                              )}`
                            : `${session.target.items.length} sessions recorded`
                          : formatVolume(
                              session.target.sport,
                              session.target.distanceM,
                              session.target.movingSec,
                              units,
                            )
                      }
                      onOpen={() => {
                        if (session.kind === "peek" && session.target !== "suggestion") {
                          openSession(session.target, "full");
                        }
                      }}
                      onClose={closeSession}
                      peekRef={peekRef}
                    />
                  ) : null}
                  <JourneyDayStop
                    day={stop.day}
                    stopRef={setStopRef(index)}
                    onOpen={(day) => openSession(day, "peek")}
                  />
                </>
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
    </div>
  );
}
