"use client";

import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import Link from "next/link";
import {
  loadCrewFieldPin,
  loadCrewJoinOptions,
  pinsEqual,
  seatCrewFieldPin,
  type CrewJoinOption,
} from "@/lib/crew-field";
import type { SportId } from "@fitness-battle/shared";
import { useEffect, useState } from "react";

function useCrewOptions(sport: SportId, enabled: boolean) {
  const { user, offlineMode } = useAuth();
  const { state } = useCompete();
  const [crews, setCrews] = useState<CrewJoinOption[]>([]);

  useEffect(() => {
    if (!enabled || !user) {
      setCrews([]);
      return;
    }
    if (offlineMode) {
      const pin = state?.crewBoard;
      if (
        pin &&
        pin.sport === sport &&
        pin.crewId &&
        pin.crewId !== "solo" &&
        !pin.crewId.startsWith("field:")
      ) {
        setCrews([
          {
            id: pin.crewId,
            name: pin.crewName,
            sport: pin.sport,
            memberCount: pin.memberIds.length,
          },
        ]);
      } else {
        setCrews([]);
      }
      return;
    }
    let cancelled = false;
    void loadCrewJoinOptions().then((options) => {
      if (!cancelled) setCrews(options.filter((crew) => crew.sport === sport));
    });
    return () => {
      cancelled = true;
    };
  }, [offlineMode, enabled, sport, state?.crewBoard, user]);

  return crews;
}

interface FieldJoinProps {
  sport: SportId;
  sportName: string;
  requireParticipate: (reason: string, next: () => void) => void;
  onJoined?: () => void;
}

/**
 * Optional field registration: density field or together with a crew.
 * Each mate opts in themselves — no group-approval step yet.
 */
export function FieldJoinActions({
  sport,
  sportName,
  requireParticipate,
  onJoined,
}: FieldJoinProps) {
  const { dispatch, state } = useCompete();
  const crews = useCrewOptions(sport, true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const isOptedIn = Boolean(
    state?.ratings.find((r) => r.sport === sport)?.optedIn,
  );
  const isCurrentCrew = state?.crewBoard?.sport === sport;

  function joinField() {
    requireParticipate(`Sign in to join ${sportName} this week.`, () => {
      dispatch({ type: "set-primary", sport });
      dispatch({ type: "opt-in", sport, crewBoard: null });
      onJoined?.();
    });
  }

  function joinTogether(crew: CrewJoinOption) {
    requireParticipate(`Sign in to join ${sportName} with your crew.`, () => {
      setBusy(true);
      setNote(null);
      void seatCrewFieldPin({ crewId: crew.id, sport })
        .then((pin) => {
          if (!pin) {
            setNote("Could not seat the crew field. Try joining again.");
            return;
          }
          dispatch({ type: "set-primary", sport });
          dispatch({ type: "opt-in", sport, crewBoard: pin });
          onJoined?.();
        })
        .finally(() => setBusy(false));
    });
  }

  return (
    <div className="fb-stack">
      <p className="fb-note">
        {isOptedIn
          ? `You are registered for ${sportName} this week.`
          : crews.length > 0
            ? "Join a density field, or register with a crew so you share one individual leaderboard. Each person still opts in on their own."
            : "Fields are density groups of eight. Create or join a private crew if you want the option to register together."}
      </p>
      <button
        type="button"
        className="fb-btn"
        disabled={busy || (isOptedIn && !isCurrentCrew)}
        onClick={joinField}
      >
        {isOptedIn && !isCurrentCrew
          ? "Already registered for this week"
          : isOptedIn && isCurrentCrew
            ? `Switch to solo ${sportName}`
            : `Join ${sportName}`}
      </button>
      {crews.map((crew) => {
        const isJoinedThisCrew =
          isCurrentCrew && state?.crewBoard?.crewId === crew.id;
        return (
          <button
            key={crew.id}
            type="button"
            className="fb-btn-line"
            disabled={busy || isJoinedThisCrew}
            onClick={() => joinTogether(crew)}
          >
            {isJoinedThisCrew
              ? `Registered with ${crew.name}`
              : `Join with ${crew.name} (${crew.memberCount})`}
          </button>
        );
      })}
      {note ? <p className="fb-note">{note}</p> : null}
    </div>
  );
}

/** While on the field, move onto/off a crew board, and refresh a stale pin. */
export function FieldCrewSwitch({ sport }: { sport: SportId }) {
  const { dispatch, state } = useCompete();
  const pin = state?.crewBoard?.sport === sport ? state.crewBoard : null;
  const isCrewField = Boolean(
    pin &&
      pin.crewId &&
      pin.crewId !== "solo" &&
      !pin.crewId.startsWith("field:") &&
      state?.enrollments.find((e) => e.sport === sport)?.crewId,
  );
  const crews = useCrewOptions(sport, !isCrewField);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!pin || !isCrewField) return;
    const snapshot = pin;
    let cancelled = false;
    void loadCrewFieldPin(snapshot.crewId).then((fresh) => {
      if (cancelled || !fresh || pinsEqual(snapshot, fresh)) return;
      dispatch({ type: "set-crew-board", crewBoard: fresh });
    });
    return () => {
      cancelled = true;
    };
    // Refresh seating when this sport's crew field is shown.
  }, [dispatch, isCrewField, pin?.crewId, pin?.waveStart, sport]);

  if (isCrewField && pin) {
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
            dispatch({ type: "clear-crew-board" });
            setNote("Now on a density field.");
          }}
        >
          Leave crew field
        </button>
        {note ? <p className="fb-note">{note}</p> : null}
      </div>
    );
  }

  if (crews.length === 0) {
    return (
      <div className="fb-stack">
        <p className="fb-note">You aren’t in any {sport} crews yet.</p>
        <Link href="/field" className="fb-btn-ghost">
          Find or create a crew
        </Link>
      </div>
    );
  }

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
            void seatCrewFieldPin({ crewId: crew.id, sport })
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
