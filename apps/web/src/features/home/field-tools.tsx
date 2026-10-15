"use client";

import { useCompete } from "@/components/compete-context";
import { CrewPanel } from "@/features/rally/crew-panel";
import { FieldCrewSwitch, FieldJoinActions } from "@/features/rally/field-join";
import { formatEffort, type SportId } from "@fitness-battle/shared";
import type { DuelView } from "@fitness-battle/shared";
import { useState } from "react";

/** Field registration, crew, and practice duel. Same column as the track. */
export function FieldTools({
  sport,
  sportName,
  optedIn,
  duels,
  requireParticipate,
}: {
  sport: SportId;
  sportName: string;
  optedIn: boolean;
  duels: DuelView[];
  requireParticipate: (reason: string, action: () => void) => void;
}) {
  const { dispatch } = useCompete();
  const [username, setUsername] = useState("");

  return (
    <section className="ah-field-tools" aria-label="Field">
      {optedIn ? (
        <>
          <FieldCrewSwitch sport={sport} />
          <button type="button" className="ah-text-link" onClick={() => dispatch({ type: "opt-out", sport })}>
            Leave this field
          </button>
        </>
      ) : (
        <FieldJoinActions sport={sport} sportName={sportName} requireParticipate={requireParticipate} />
      )}
      <CrewPanel />
      <div className="ah-field-duel" id="duel">
        <h2>Practice 1v1</h2>
        {duels.length === 0 ? (
          <>
            <button
              type="button"
              className="ah-primary"
              onClick={() =>
                requireParticipate("Sign in to start a 1v1.", () =>
                  dispatch({ type: "duel", sport, mode: "auto" }),
                )
              }
            >
              Auto match
            </button>
            <label className="ah-duel-name">
              Username
              <input value={username} placeholder="Maya Chen" onChange={(event) => setUsername(event.target.value)} />
            </label>
            <button
              type="button"
              className="ah-text-link"
              onClick={() =>
                requireParticipate("Sign in to send a 1v1 invite.", () =>
                  dispatch({ type: "duel", sport, mode: "invite", username }),
                )
              }
            >
              Practice rival
            </button>
          </>
        ) : (
          duels.map((view) => (
            <p key={view.duel.id} className="ah-small">
              {view.duel.rivalName} · {formatEffort(view.rivalEffort)} effort
              {view.leading === "you" ? " · you lead" : view.leading === "rival" ? " · they lead" : " · level"}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
