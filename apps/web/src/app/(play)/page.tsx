"use client";

import { AuthPrompt } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { CheckpointControl } from "@/features/split/components/checkpoint-control";
import {
  ProductHeader,
  sourceFromLinks,
} from "@/features/split/components/product-header";
import { RaceTrack } from "@/features/split/components/race-track";
import { TrackVerdict } from "@/features/split/components/track-verdict";
import { FieldRoster } from "@/features/split/components/field-roster";
import { WeekReveal } from "@/features/split/components/week-reveal";
import {
  buildSplitBoard,
  formatPts,
  laneAtCheckpoint,
  type ComparisonMode,
} from "@/features/split/model";
import {
  competeNow,
  currentPeriodBounds,
  daysLeft,
  lessonFor,
  sportById,
  SPORTS,
  type CheckpointIndex,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useState } from "react";

export default function MyTrackPage() {
  const { state, dispatch } = useCompete();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState(
    "Create an account to join a board and keep your rating.",
  );
  const [comparison, setComparison] = useState<ComparisonMode>("self");
  const [checkpoint, setCheckpoint] = useState<CheckpointIndex>(2);
  const [showField, setShowField] = useState(false);
  const [track, setTrack] = useState<ScoreTrack>("open");

  if (!state) return <p className="fb-copy">Loading your week…</p>;

  const now = competeNow(state);
  const sport = state.primary;
  const spec = sportById(sport);
  const shownTrack: ScoreTrack = spec.gps ? track : "open";
  const board = buildSplitBoard(state, sport, shownTrack, now);
  const source = sourceFromLinks(state.links);
  const youLane = board.fieldLanes.find((lane) => lane.you) ?? null;
  const ghostEffort = board.ghostEffortAt(checkpoint);
  const youEffort = youLane ? laneAtCheckpoint(youLane, checkpoint) : 0;
  const lesson = lessonFor(sport, now);
  const done = state.lessonDoneOn === now.toISOString().slice(0, 10);
  const periodDaysLeft = daysLeft(currentPeriodBounds(state.clock.kind, now), now);

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
      <ProductHeader sourceStatus={source.status} sourceLabel={source.label} />

      {state.pendingRevealIds.length > 0 ? (
        <WeekReveal
          state={state}
          onDismiss={() => dispatch({ type: "acknowledge-reveal" })}
        />
      ) : null}

      <div className="sp-title-block">
        <p className="fb-kicker">
          {board.periodLabel} / Weekly {spec.name.toLowerCase()}
        </p>
        <h1>
          {comparison === "self" ? (
            <>
              CHASE YOUR
              <br />
              <span>OWN LINE.</span>
            </>
          ) : (
            <>
              FIND YOUR
              <br />
              <span>CLOSE CONTEST.</span>
            </>
          )}
        </h1>
        <p className="fb-copy">
          {periodDaysLeft} days left. Effort points accumulate through the week —
          not a live race or pace board.
        </p>
      </div>

      <div className="fb-chips">
        {SPORTS.map((item) => {
          const joined = state.ratings.find((row) => row.sport === item.id)
            ?.optedIn;
          return (
            <button
              key={item.id}
              type="button"
              className={item.id === sport ? "fb-chip on" : "fb-chip"}
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
              {item.name}
              {joined ? "" : " · join"}
            </button>
          );
        })}
      </div>

      {spec.gps ? (
        <div className="fb-chips">
          {(
            [
              ["open", "All efforts"],
              ["verified", "Verified only"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={shownTrack === id ? "fb-chip on" : "fb-chip"}
              onClick={() => setTrack(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {!board.optedIn ? (
        <section className="sp-empty">
          <h2>You are not on a track yet</h2>
          <p className="fb-copy">{spec.blurb}</p>
          <button
            type="button"
            className="fb-btn"
            onClick={() =>
              requireParticipate(`Sign in to join ${spec.name} this week.`, () =>
                dispatch({ type: "opt-in", sport }),
              )
            }
          >
            Join {spec.name} this week
          </button>
        </section>
      ) : (
        <div className="sp-layout">
          <section className="sp-board">
            <div className="sp-mode-switch" aria-label="Comparison mode">
              <button
                type="button"
                aria-pressed={comparison === "self"}
                onClick={() => {
                  setComparison("self");
                  setShowField(false);
                }}
              >
                Your previous week
              </button>
              <button
                type="button"
                aria-pressed={comparison === "field"}
                onClick={() => setComparison("field")}
              >
                Nearby rivals
              </button>
            </div>
            <RaceTrack
              comparison={comparison}
              checkpoint={checkpoint}
              trackMax={board.trackMax}
              youLane={youLane}
              ghostEffort={ghostEffort}
              nearby={board.nearby}
            />
            <CheckpointControl
              checkpoint={checkpoint}
              labels={board.checkpointLabels}
              onChange={setCheckpoint}
            />
          </section>
          <TrackVerdict
            comparison={comparison}
            youLane={youLane}
            ghostEffort={ghostEffort}
            checkpointEffort={youEffort}
            onOpenField={() => setShowField(true)}
          />
        </div>
      )}

      {board.optedIn ? (
        <div className="sp-bottom">
          <span>
            Your field <strong>{youLane?.place ?? "—"} / {board.rows.length}</strong>
          </span>
          <span>
            Your week <strong>{formatPts(youLane?.effort ?? 0)} pts</strong>
          </span>
          <Link href="/you#connections" className="fb-btn-ghost">
            {source.label} ↗
          </Link>
        </div>
      ) : null}

      {showField && board.optedIn ? (
        <section>
          <div className="fd-roster-head">
            <h3>Full field</h3>
            <button
              type="button"
              className="fb-btn-ghost"
              onClick={() => setShowField(false)}
            >
              Hide
            </button>
          </div>
          <FieldRoster rows={board.rows} />
        </section>
      ) : null}

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

      <AuthPrompt
        open={authOpen}
        reason={authReason}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
