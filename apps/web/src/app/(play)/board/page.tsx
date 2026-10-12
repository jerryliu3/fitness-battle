"use client";

import { AuthPrompt } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { FieldStage } from "@/features/field/components/field-stage";
import { buildFieldModel } from "@/features/field/model";
import {
  ProductHeader,
  sourceFromLinks,
} from "@/features/split/components/product-header";
import { buildSplitBoard } from "@/features/split/model";
import {
  formatClock,
  formatEffort,
  projectedElo,
  sportById,
  SPORTS,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { useMemo, useState } from "react";

export default function FieldPage() {
  const { state, dispatch } = useCompete();
  const { user } = useAuth();
  const [sport, setSport] = useState<SportId | null>(null);
  const [track, setTrack] = useState<ScoreTrack>("open");
  const [username, setUsername] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState(
    "Sign in to join the weekly field or start a 1v1.",
  );
  const now = useMemo(() => new Date(), []);

  if (!state) return <p className="fb-copy">Loading the field…</p>;

  const active = sport ?? state.primary;
  const spec = sportById(active);
  const shownTrack: ScoreTrack = spec.gps ? track : "open";
  const board = buildSplitBoard(state, active, shownTrack, now);
  const field = buildFieldModel(state, active, shownTrack, now);
  const source = sourceFromLinks(state.links);
  const rating = state.ratings.find((item) => item.sport === active);
  const nextElo = rating?.optedIn
    ? projectedElo(state, active, shownTrack, now)
    : null;
  const currentElo =
    shownTrack === "verified" ? rating?.verifiedElo : rating?.openElo;
  const frozen = state.frozenPeriods.includes(board.periodStart.toISOString());

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

      <div className="sp-title-block">
        <p className="fb-kicker">
          The field ·{" "}
          {formatClock({
            startsAt: board.periodStart,
            endsAt: board.periodEnd,
            kind: state.clock.kind,
          })}
        </p>
        <h1>
          THE GAP
          <br />
          <span>FEELS REAL.</span>
        </h1>
        <p className="fb-copy">
          POV pursuit and a bird’s-eye distance path. Positions use weekly{" "}
          {spec.gps ? "distance" : "effort"} — not equally spaced ranks.
        </p>
      </div>

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
          Strength uses open effort as the field axis. Indoor work is not treated
          as GPS distance.
        </p>
      )}

      {!board.optedIn ? (
        <section className="sp-empty">
          <h2>You are not on this field</h2>
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
        <>
          <FieldStage model={field} checkpoint={2} boardRows={board.rows} />
          <p className="fb-note">
            {frozen
              ? "This week is frozen. Rating will not move when it closes."
              : board.you && nextElo != null && currentElo != null
                ? `If the week ended now, ${shownTrack} rating would be ${nextElo} (${nextElo - currentElo >= 0 ? "+" : ""}${nextElo - currentElo}).`
                : "Rating updates when the week closes."}
          </p>
          <button
            type="button"
            className="fb-btn-ghost"
            onClick={() => dispatch({ type: "opt-out", sport: active })}
          >
            Leave this field
          </button>
        </>
      )}

      <section className="fb-card" id="duel">
        <h2>1v1 this week</h2>
        <p className="fb-copy">
          One opponent, same weekly window. Auto match picks the closest rating.
        </p>
        {board.duels.map((view) => {
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
        {board.duels.length === 0 ? (
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
