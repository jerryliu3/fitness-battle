"use client";
import { AppText, AppParagraph } from "@/ui/section";

import { useDailySuggestion } from "./use-daily-suggestion";
import "./daily-suggestion.css";
import { WeekChart } from "./week-chart";
import { DailyHealth } from "./daily-health";
import { LatestActivity } from "@/features/club/latest-activity";

import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { Sheet } from "@/ui/sheet";
import { SessionStage } from "./session-stage";
import { RivalCard } from "@/features/club/rival-card";

import { ActivityActions } from "./activity-actions";
import { newJourneyStops } from "./journey-reveal";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { playCue } from "@/lib/haptics";

import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { AnimatedEmber } from "@/components/mascot/animated-ember";
import type { EmberAction } from "@fitness-battle/shared/mascot";
import { APP_TIMEZONE, buildTodayRoute, competeNow, countsOnTrack, dayKey, formatVolume, primaryFreezePeriodStart, shellTabFromPath, sportById, type Activity } from "@fitness-battle/shared";
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
        <AppText as="small" role="caption" secondary>{dateWithWeekday}</AppText>
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
      <AppParagraph typographyRole="label" className="fb-kicker">{kicker}</AppParagraph>
      <strong>{title}</strong>
      {detail ? <AppParagraph typographyRole="caption" className="fb-note">{detail}</AppParagraph> : null}
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
  const onHome = shellTabFromPath(usePathname())?.id === "today";
  const { user } = useAuth();
  const { state, dispatch, lastDebugEvent, loadStatus } = useCompete();
  const suggestionPrompt = useDailySuggestion(user?.id ?? "guest", state);
  const reduced = useReducedMotion();
  const [removed, setRemoved] = useState<Activity | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [session, setSession] = useState<SessionPhase>({ kind: "closed" });
  const [revealingStops, setRevealingStops] = useState<string[]>([]);
  const peekRef = useRef<HTMLDivElement>(null);
  const journeyDetailsRef = useRef<HTMLDetailsElement>(null);
  const lastSyncNonceRef = useRef<number>(0);
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

  if (!state) return <AppParagraph typographyRole="body" className="fb-copy">Loading your week…</AppParagraph>;

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

  useEffect(() => {
    if (!lastDebugEvent || lastDebugEvent.id !== "sync-activity" || lastDebugEvent.nonce === lastSyncNonceRef.current) return;
    lastSyncNonceRef.current = lastDebugEvent.nonce;
    if (journeyDetailsRef.current) journeyDetailsRef.current.open = true;
    setRevealingStops(reduced ? [] : [todayStop]);
    react("hop");
    const newest = counted[counted.length - 1];
    if (newest) setSyncNotice(`↻ Synced ${sportById(newest.sport).name} · ${formatVolume(newest.sport, newest.distanceM, newest.movingSec, units)}`);
  }, [counted, lastDebugEvent, reduced, todayStop, units]);

  useEffect(() => {
    if (!syncNotice) return;
    const timer = window.setTimeout(() => setSyncNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [syncNotice]);

  function openSession(target: SessionTarget, phase: "peek" | "full") {
    if (target === "suggestion") suggestionPrompt.dismiss();
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
      <Sheet fullScreen={detailActivities.length > 0} body="" returnFocusTo={sessionReturnFocus} open={session.kind === "full"} title={detailTarget === "suggestion" ? "Today" : "Your activity"} onClose={closeSession}>
        <SessionStage state={state} activities={detailActivities} suggestion={route.suggestion} actions={<ActivityActions />} onRemove={activityId => { setRemoved(detailActivities.find(a=>a.id===activityId)??null); dispatch({type:"set-disposition",activityId,disposition:"excluded"}); if(detailActivities.length <= 1)closeSession(); }}/>
      </Sheet>
      <div className="focus-home-overlay">
      {syncNotice ? <div className="fb-note" role="status" aria-live="polite"><b>{syncNotice}</b></div> : null}
      {removed ? <div className="fb-note" role="status">Session removed. <button type="button" className="fb-btn-ghost" onClick={() => { dispatch({type:"set-disposition", activityId:removed.id, disposition:removed.disposition}); setRemoved(null); }}>Undo</button></div> : null}
      {frozen && (
        <div className="fb-pill" style={{ marginBottom: "16px" }}>
          <b>❄ Week frozen</b>
          <span>Your effort score is protected through next Monday.</span>
        </div>
      )}
      <WeekChart state={state} ready={loadStatus === "ready" || loadStatus === "local"} />
      </div>
      {(loadStatus === "ready" || loadStatus === "local") && <DailyHealth state={state} />}
      <RivalCard state={state} />
      <LatestActivity state={state} onOpen={activity=>openSession(activity,"full")} />
      <details ref={journeyDetailsRef} className="club-home-journey"><summary>Your activity journey <span>＋</span></summary>
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
                      <AppText as="small" role="caption" secondary>Past</AppText>
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
                      <AppText as="small" role="caption" secondary>Past</AppText>
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
                      <AppText as="small" role="caption" secondary>
                        {new Date(`${stop.day.day}T12:00:00.000Z`).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            timeZone: "UTC",
                          },
                        )}
                      </AppText>
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
                      <AppText as="small" role="caption" secondary>Today</AppText>
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
      </details>
      {onHome && suggestionPrompt.visible && session.kind === "closed" ? <aside className="home-daily-suggestion" aria-label="Today's suggested session">
        <button type="button" className="home-daily-suggestion-open" onClick={() => openSession("suggestion", "full")}>
          <span>Today’s suggested session</span><strong>{route.suggestion.title} ↗</strong>
        </button>
        <button type="button" className="home-daily-suggestion-dismiss" aria-label="Dismiss suggested session for today" onClick={suggestionPrompt.dismiss}>×</button>
      </aside> : null}
    </div>
  );
}
