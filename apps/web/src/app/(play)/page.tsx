"use client";

import { AuthPrompt } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import {
  currentPeriodBounds,
  daysLeft,
  eloInBand,
  formatClock,
  lessonFor,
  rankForElo,
  sportById,
  SPORTS,
  type SportId,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useState } from "react";

export default function TodayPage() {
  const { state, dispatch } = useCompete();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState(
    "Create an account to join a board and keep your rating.",
  );
  if (!state) return <p className="fb-copy">Loading your week…</p>;

  const now = new Date();
  const period = currentPeriodBounds(state.clock.kind, now);
  const rating = state.ratings.find((item) => item.sport === state.primary);
  const elo = rating?.openElo ?? 1000;
  const rank = rankForElo(elo);
  const ladder = eloInBand(elo);
  const lesson = lessonFor(state.primary, now);
  const done = state.lessonDoneOn === now.toISOString().slice(0, 10);
  const sport = sportById(state.primary);
  const inBoard = rating?.optedIn ?? false;

  function requireParticipate(reason: string, action: () => void) {
    if (!user) {
      setAuthReason(reason);
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
      <header>
        <p className="fb-kicker">{formatClock(period)}</p>
        <h1 className="fb-title">Keep each other moving.</h1>
        <p className="fb-copy">
          {daysLeft(period, now)} days left in a shared week. Effort counts more
          than speed.
        </p>
      </header>

      <section className="fb-card">
        <div className="fb-elo">
          <div>
            <p className="fb-kicker">{sport.name}</p>
            <strong>{elo}</strong>
          </div>
          <div className="fb-rank">
            <b>{rank.name}</b>
            <span className="fb-meta">
              {ladder.next
                ? `${ladder.intoNext} to ${ladder.next.name}`
                : "Top level"}
            </span>
          </div>
        </div>
        <div className="fb-split">
          <div className="fb-pill">
            <span>Verified</span>
            <b>{rating?.verifiedElo ?? 1000}</b>
          </div>
          <div className="fb-pill">
            <span>Open</span>
            <b>{rating?.openElo ?? 1000}</b>
          </div>
        </div>
        <p className="fb-note">
          Verified is GPS and device benchmarks. Open includes indoor work.
          Everyone starts at 1000. Levels run from Beginner to Champion.
        </p>
      </section>

      <section className="fb-card fb-lesson">
        <p className="fb-kicker">Today’s lesson</p>
        <h2>
          {lesson.title} · {lesson.minutes} min
        </h2>
        <p className="fb-copy">{lesson.detail}</p>
        <button
          type="button"
          className="fb-btn"
          disabled={done}
          onClick={() => dispatch({ type: "complete-lesson" })}
        >
          {done ? "Done for today" : "Mark done"}
        </button>
      </section>

      <section className="fb-stack">
        {SPORTS.map((item) => {
          const joined = state.ratings.find((row) => row.sport === item.id)?.optedIn;
          return (
            <button
              key={item.id}
              type="button"
              className={joined ? "fb-btn-line" : "fb-btn"}
              onClick={() =>
                requireParticipate(
                  `Sign in to compete in ${item.name} this week.`,
                  () =>
                    dispatch({
                      type: joined ? "set-primary" : "opt-in",
                      sport: item.id as SportId,
                    }),
                )
              }
            >
              {joined
                ? `${item.name} board · this week`
                : `Compete in ${item.name}`}
            </button>
          );
        })}
        <Link href="/board" className="fb-btn-line">
          {inBoard ? "See the weekly board" : "Challenge someone 1v1"}
        </Link>
      </section>

      <AuthPrompt
        open={authOpen}
        reason={authReason}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
