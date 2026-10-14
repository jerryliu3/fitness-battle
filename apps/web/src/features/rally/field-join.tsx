"use client";

import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import {
  fetchCrewFieldPin,
  loadCrewJoinOptions,
  type CrewJoinOption,
} from "@/lib/join-crew-field";
import type { SportId } from "@fitness-battle/shared";
import { useEffect, useState } from "react";

interface FieldJoinProps {
  sport: SportId;
  sportName: string;
  requireParticipate: (reason: string, next: () => void) => void;
}

/**
 * Optional field registration: alone (density match) or together with a
 * private crew on one shared individual leaderboard. Group approval is out
 * of scope — each mate opts in with “together” when they join the week.
 */
export function FieldJoinActions({
  sport,
  sportName,
  requireParticipate,
}: FieldJoinProps) {
  const { user, demoMode } = useAuth();
  const { state, dispatch } = useCompete();
  const [crews, setCrews] = useState<CrewJoinOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user || demoMode) {
      setCrews([]);
      return;
    }
    let cancelled = false;
    void loadCrewJoinOptions().then((options) => {
      if (!cancelled) setCrews(options.filter((crew) => crew.sport === sport));
    });
    return () => {
      cancelled = true;
    };
  }, [demoMode, sport, user]);

  function joinAlone() {
    requireParticipate(`Sign in to join ${sportName} this week.`, () => {
      if (state?.crewBoard?.sport === sport) {
        dispatch({ type: "clear-crew-board" });
      }
      dispatch({ type: "opt-in", sport });
    });
  }

  async function joinTogether(crew: CrewJoinOption) {
    requireParticipate(`Sign in to join ${sportName} with your crew.`, () => {
      setBusy(true);
      setNote(null);
      void fetchCrewFieldPin({ crewId: crew.id, sport })
        .then((pin) => {
          if (!pin) {
            setNote("Could not seat the crew field. Try again or join alone.");
            return;
          }
          dispatch({ type: "set-crew-board", crewBoard: pin });
          dispatch({ type: "opt-in", sport });
        })
        .finally(() => setBusy(false));
    });
  }

  return (
    <div className="fb-stack">
      <p className="fb-note">
        {crews.length > 0
          ? "Join alone for a normal density field, or together so your crew shares one individual leaderboard this week. Each person still opts in on their own — no group approval step yet."
          : "Fields are density groups of eight. Real athletes seat first; synthetic rivals fill empty seats. Create or join a private crew if you want the option to register together later."}
      </p>
      <button
        type="button"
        className="fb-btn"
        disabled={busy}
        onClick={joinAlone}
      >
        Join {sportName} alone
      </button>
      {crews.map((crew) => (
        <button
          key={crew.id}
          type="button"
          className="fb-btn-line"
          disabled={busy}
          onClick={() => void joinTogether(crew)}
        >
          Join with {crew.name} ({crew.memberCount})
        </button>
      ))}
      {note ? <p className="fb-note">{note}</p> : null}
    </div>
  );
}

interface FieldCrewSwitchProps {
  sport: SportId;
}

/** While already on the field, optionally move onto or off a crew board. */
export function FieldCrewSwitch({ sport }: FieldCrewSwitchProps) {
  const { user, demoMode } = useAuth();
  const { state, dispatch } = useCompete();
  const [crews, setCrews] = useState<CrewJoinOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const pin = state?.crewBoard?.sport === sport ? state.crewBoard : null;

  useEffect(() => {
    if (!user || demoMode || pin) {
      setCrews([]);
      return;
    }
    let cancelled = false;
    void loadCrewJoinOptions().then((options) => {
      if (!cancelled) setCrews(options.filter((crew) => crew.sport === sport));
    });
    return () => {
      cancelled = true;
    };
  }, [demoMode, pin, sport, user]);

  if (pin) {
    return (
      <div className="fb-stack">
        <p className="fb-note">
          Sharing this field with {pin.crewName} ({pin.memberIds.length}{" "}
          athletes, {pin.syntheticIds.length} fillers). Scores stay individual.
        </p>
        <button
          type="button"
          className="fb-btn-ghost"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            dispatch({ type: "clear-crew-board" });
            setBusy(false);
            setNote("Now competing alone on a density field.");
          }}
        >
          Switch to alone
        </button>
        {note ? <p className="fb-note">{note}</p> : null}
      </div>
    );
  }

  if (crews.length === 0) return null;

  return (
    <div className="fb-stack">
      <p className="fb-note">
        Optional: move onto your crew’s shared individual leaderboard for the
        rest of this week.
      </p>
      {crews.map((crew) => (
        <button
          key={crew.id}
          type="button"
          className="fb-btn-ghost"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setNote(null);
            void fetchCrewFieldPin({ crewId: crew.id, sport })
              .then((next) => {
                if (!next) {
                  setNote("Could not seat the crew field.");
                  return;
                }
                dispatch({ type: "set-crew-board", crewBoard: next });
                setNote(`Now sharing a field with ${crew.name}.`);
              })
              .finally(() => setBusy(false));
          }}
        >
          Compete with {crew.name}
        </button>
      ))}
      {note ? <p className="fb-note">{note}</p> : null}
    </div>
  );
}
