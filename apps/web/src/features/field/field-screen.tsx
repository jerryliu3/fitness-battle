"use client";

import { AuthPrompt } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { CrewPanel } from "@/features/rally/crew-panel";
import { FieldJoinActions } from "@/features/rally/field-join";
import { buildSplitBoard } from "@/features/split/model";
import { competeNow, formatEffort, sportById } from "@fitness-battle/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FieldScreen() {
  const { state, dispatch } = useCompete();
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState("Sign in to join the field.");
  const [username, setUsername] = useState("");

  if (!state) return <p className="fb-copy">Loading the field…</p>;

  const now = competeNow(state);
  const sport = state.primary;
  const spec = sportById(sport);
  const board = buildSplitBoard(state, sport, "open", now);

  function requireParticipate(reason: string, action: () => void) {
    if (!user) {
      setAuthReason(reason);
      setAuthOpen(true);
      return;
    }
    if (!state!.onboardingCompleted) {
      router.push("/onboarding");
      return;
    }
    action();
  }

  return (
    <>
      <p className="fb-kicker">Field</p>
      <h1>{spec.name}</h1>
      {board.optedIn ? (
        <button
          type="button"
          className="fb-btn"
          onClick={() =>
            requireParticipate("Sign in to start a 1v1.", () =>
              dispatch({ type: "duel", sport, mode: "auto" }),
            )
          }
        >
          Practice a 1v1
        </button>
      ) : (
        <FieldJoinActions
          sport={sport}
          sportName={spec.name}
          requireParticipate={requireParticipate}
        />
      )}
      <CrewPanel />
      <section aria-label="Matchups">
        <h2>Matchups</h2>
        {board.duels.length === 0 ? (
          <p className="fb-copy">No practice 1v1 this week.</p>
        ) : (
          board.duels.map((view) => (
            <p key={view.duel.id} className="fb-copy">
              You {formatEffort(view.youEffort)} · {view.duel.rivalName}{" "}
              {formatEffort(view.rivalEffort)}
            </p>
          ))
        )}
        <label className="fb-field">
          Practice rival
          <input
            value={username}
            placeholder="Name"
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="fb-btn-line"
          onClick={() =>
            requireParticipate("Sign in to send a 1v1 invite.", () =>
              dispatch({ type: "duel", sport, mode: "invite", username }),
            )
          }
        >
          Invite
        </button>
      </section>
      <AuthPrompt open={authOpen} reason={authReason} onClose={() => setAuthOpen(false)} />
    </>
  );
}
