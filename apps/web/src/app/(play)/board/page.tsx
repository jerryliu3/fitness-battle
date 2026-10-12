"use client";

import { AuthPrompt } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import {
  currentPeriodBounds,
  duelViews,
  formatClock,
  formatEffort,
  formatVolume,
  projectedElo,
  sportById,
  SPORTS,
  weeklyBoard,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { useState } from "react";

export default function BoardPage() {
  const { state, dispatch } = useCompete();
  const { user } = useAuth();
  const [sport, setSport] = useState<SportId | null>(null);
  const [track, setTrack] = useState<ScoreTrack>("open");
  const [username, setUsername] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState(
    "Sign in to join the weekly board or start a 1v1.",
  );
  if (!state) return <p className="fb-copy">Loading the board…</p>;

  const active = sport ?? state.primary;
  const spec = sportById(active);
  const shownTrack: ScoreTrack = spec.gps ? track : "open";
  const now = new Date();
  const period = currentPeriodBounds(state.clock.kind, now);
  const rating = state.ratings.find((item) => item.sport === active);
  const rows = rating?.optedIn
    ? weeklyBoard(state, active, shownTrack, now)
    : [];
  const you = rows.find((row) => row.you);
  const nextElo = rating?.optedIn
    ? projectedElo(state, active, shownTrack, now)
    : null;
  const currentElo =
    shownTrack === "verified" ? rating?.verifiedElo : rating?.openElo;
  const duels = duelViews(state, now).filter((view) => view.duel.sport === active);
  const frozen = state.frozenPeriods.includes(period.startsAt.toISOString());

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
        <p className="fb-kicker">Weekly board · {formatClock(period)}</p>
        <h1 className="fb-title">Same week. Close levels.</h1>
        <p className="fb-copy">
          Groups are matched when you join and stay put until the week closes.
          Guests can browse; joining needs an account.
        </p>
      </header>

      <div className="fb-chips">
        {SPORTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === active ? "fb-chip on" : "fb-chip"}
            onClick={() => setSport(item.id)}
          >
            {item.name}
          </button>
        ))}
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
      ) : (
        <p className="fb-note">
          Strength uses the open score. Indoor work is not treated as GPS.
        </p>
      )}

      {!rating?.optedIn ? (
        <section className="fb-card">
          <h2>You are not on this board</h2>
          <p className="fb-copy">{spec.blurb}</p>
          <button
            type="button"
            className="fb-btn"
            onClick={() =>
              requireParticipate(`Sign in to join ${spec.name} this week.`, () =>
                dispatch({ type: "opt-in", sport: active }),
              )
            }
          >
            Join {spec.name} this week
          </button>
        </section>
      ) : (
        <section className="fb-card">
          {rows.map((row) => (
            <div
              key={row.id}
              className={row.you ? "fb-row fb-you" : "fb-row"}
            >
              <span className="fb-place">{row.place}</span>
              <span className="fb-grow">
                {row.name}
                <small>
                  Rating {row.elo}
                  {row.you
                    ? ` · ${formatVolume(active, row.distanceM, row.movingSec)}`
                    : ""}
                </small>
              </span>
              <b>{formatEffort(row.effort)}</b>
            </div>
          ))}
          <p className="fb-note">
            {frozen
              ? "This week is frozen. Rating will not move when it closes."
              : you && nextElo != null && currentElo != null
                ? `If the week ended now, ${shownTrack} rating would be ${nextElo} (${nextElo - currentElo >= 0 ? "+" : ""}${nextElo - currentElo}).`
                : "Rating updates when the week closes."}
          </p>
          <button
            type="button"
            className="fb-btn-ghost"
            onClick={() => dispatch({ type: "opt-out", sport: active })}
          >
            Leave this board
          </button>
        </section>
      )}

      <section className="fb-card" id="duel">
        <h2>1v1 this week</h2>
        <p className="fb-copy">
          One opponent, same weekly window. Auto match picks the closest rating.
        </p>
        {duels.map((view) => {
          const total = view.youEffort + view.rivalEffort || 1;
          return (
            <div key={view.duel.id}>
              <div className="fb-row">
                <span className="fb-grow">
                  You
                  <small>{formatEffort(view.youEffort)} effort</small>
                </span>
                <span className="fb-grow" style={{ textAlign: "right" }}>
                  {view.duel.rivalName}
                  <small>{formatEffort(view.rivalEffort)} effort</small>
                </span>
              </div>
              <div className="fb-bar">
                <span style={{ width: `${(view.youEffort / total) * 100}%` }} />
              </div>
              <p className="fb-note">
                {view.leading === "tie"
                  ? "Level right now."
                  : view.leading === "you"
                    ? "You are ahead."
                    : `${view.duel.rivalName} is ahead.`}
                {view.duel.source === "invite" ? " Invited." : " Auto matched."}
              </p>
            </div>
          );
        })}
        {duels.length === 0 ? (
          <div className="fb-stack">
            <button
              type="button"
              className="fb-btn"
              onClick={() =>
                requireParticipate("Sign in to start a 1v1.", () =>
                  dispatch({ type: "duel", sport: active, mode: "auto" }),
                )
              }
            >
              Auto match
            </button>
            <label className="fb-field">
              Username
              <input
                value={username}
                placeholder="Maya Chen"
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="fb-btn-line"
              onClick={() =>
                requireParticipate("Sign in to send a 1v1 invite.", () =>
                  dispatch({
                    type: "duel",
                    sport: active,
                    mode: "invite",
                    username,
                  }),
                )
              }
            >
              Send invite
            </button>
          </div>
        ) : null}
      </section>

      <AuthPrompt
        open={authOpen}
        reason={authReason}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
