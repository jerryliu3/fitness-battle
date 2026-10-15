"use client";

import { HomeConcept } from "@/app/design/_studies/home-lab/home-concepts";
import { AuthPrompt } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { SleepPanel } from "@/features/health/sleep-panel";
import { Ace } from "@/features/rally/ace";
import { DetailSheet } from "@/features/play/detail-sheet";
import { WeekReveal } from "@/features/split/components/week-reveal";
import { buildSplitBoard } from "@/features/split/model";
import {
  activityEffort,
  competeNow,
  countsOnTrack,
  formatEffort,
  formatVolume,
  lessonFor,
  sportById,
  suggestionForState,
  type Activity,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useState } from "react";
import "@/app/design/_studies/home-lab/home-concepts.css";

export function TodayScreen() {
  const { state, dispatch, loadStatus } = useCompete();
  const { user, loading } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [coach, setCoach] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  if (loading || !state) return <p className="ps-note">Loading your week…</p>;

  const now = competeNow(state);
  const sport = sportById(state.primary);
  const showingSleep = state.focus.family === "health" && state.focus.id === "sleep";
  const today = state.primary === "running" ? suggestionForState(state, now) : lessonFor(state.primary, now);
  const lesson = lessonFor(state.primary, now);
  const done = state.lessonDoneOn === now.toISOString().slice(0, 10);
  const board = buildSplitBoard(state, state.primary, "open", now);
  const activities = board.weekActivities.filter(
    (item) => countsOnTrack(item, "open") && new Date(item.startedAt) <= now,
  );
  const distanceM = activities.reduce((sum, item) => sum + item.distanceM, 0);
  const movingSec = activities.reduce((sum, item) => sum + item.movingSec, 0);

  function requireUser(action: () => void) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!state!.onboardingCompleted) {
      window.location.href = "/onboarding";
      return;
    }
    action();
  }

  return (
    <>
      <p className="ps-kicker">{showingSleep ? "Sleep" : sport.name}</p>
      <h1 className="ps-title">{formatVolume(state.primary, distanceM, movingSec)}</h1>
      {state.pendingRevealIds.length > 0 ? (
        <WeekReveal state={state} onDismiss={() => dispatch({ type: "acknowledge-reveal" })} />
      ) : null}
      {showingSleep ? (
        <SleepPanel
          state={state}
          now={now}
          onJoin={() => requireUser(() => dispatch({ type: "opt-in-health", metric: "sleep" }))}
          onSample={() => requireUser(() => dispatch({ type: "log-sleep" }))}
          onLeave={() => dispatch({ type: "opt-out-health", metric: "sleep" })}
        />
      ) : (
        <HomeConcept
          layout="trail"
          activities={activities}
          sport={state.primary}
          now={now}
          periodStart={board.periodStart}
          recommendation={today}
          onActivity={setActivity}
          onCoach={() => setCoach(true)}
        />
      )}
      {!board.optedIn ? (
        <p className="ps-note">
          <Link href="/field">Join this week’s field</Link> when you want a place on the track.
        </p>
      ) : null}
      {activity ? (
        <DetailSheet title="Counted session" onClose={() => setActivity(null)}>
          <strong>{formatVolume(state.primary, activity.distanceM, activity.movingSec)}</strong>
          <p className="ps-note">
            {Math.round(activity.movingSec / 60)} min · {formatEffort(activityEffort(activity))} effort
          </p>
          <Link className="ps-btn" href="/board" onClick={() => setActivity(null)}>
            See it on the track
          </Link>
        </DetailSheet>
      ) : null}
      {coach ? (
        <DetailSheet title={today.title} onClose={() => setCoach(false)}>
          <Ace />
          <p>{lesson.detail}</p>
          <button
            type="button"
            className="ps-btn"
            disabled={done || !user || loadStatus === "failed"}
            onClick={() => {
              dispatch({ type: "complete-lesson" });
              setCoach(false);
            }}
          >
            {done ? "Tip completed" : "Got it"}
          </button>
          <p className="ps-note">This completes the tip, not a workout.</p>
        </DetailSheet>
      ) : null}
      <AuthPrompt
        open={authOpen}
        reason="Create an account to compete this week."
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
