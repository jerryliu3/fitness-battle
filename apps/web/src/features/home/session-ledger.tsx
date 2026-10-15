"use client";

import { useCompete } from "@/components/compete-context";
import { paceMinPerKm, progressionTrends, sportById } from "@fitness-battle/shared";
import Link from "next/link";

/** Longer history and the count/exclude ledger, in the progress column. */
export function SessionLedger() {
  const { state, dispatch } = useCompete();
  if (!state) return null;
  const sport = state.primary;
  const spec = sportById(sport);
  const trends = progressionTrends(
    state.activities,
    sport,
    state.periodResults
      .filter((result) => result.sport === sport && result.track === "open")
      .map((result) => ({ day: result.periodStart.slice(0, 10), elo: result.eloAfter })),
  );
  const series = spec.gps ? trends.distance : trends.elo;
  const best = state.activities
    .filter(
      (activity) =>
        activity.sport === sport &&
        activity.provenance === "recorded" &&
        (activity.disposition ?? "counted") === "counted",
    )
    .map((activity) => ({ activity, pace: paceMinPerKm(activity) }))
    .filter((row) => row.pace != null)
    .sort((a, b) => a.pace! - b.pace!)[0];
  const rows = state.activities.filter((activity) => activity.sport === sport).slice(-12).reverse();

  return (
    <section className="ah-ledger" aria-label="History">
      <h2>History</h2>
      {series.length === 0 ? (
        <p className="ah-small">No counted days yet.</p>
      ) : (
        <ul className="ah-ledger-list">
          {series.slice(-12).map((point) => (
            <li key={point.day}>
              <span>{point.day}</span>
              <b>
                {point.value} {spec.gps ? "km" : "rating"}
              </b>
            </li>
          ))}
        </ul>
      )}
      {best?.pace != null ? (
        <p className="ah-small">
          Best recorded pace {best.pace.toFixed(1)} min/km. <Link href="/pace">Pace board</Link>
        </p>
      ) : (
        <p className="ah-small">
          <Link href="/pace">Pace board</Link> is completion time, separate from this week.
        </p>
      )}
      <h2>Sessions</h2>
      {rows.length === 0 ? <p className="ah-small">Imports show up here.</p> : null}
      {rows.map((activity) => (
        <div key={activity.id} className="ah-ledger-row">
          <span>
            {activity.startedAt.slice(0, 10)}
            <small>{activity.disposition ?? "counted"}</small>
          </span>
          {activity.disposition === "pending" ? (
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "set-disposition", activityId: activity.id, disposition: "counted" })
              }
            >
              Count
            </button>
          ) : null}
          {activity.disposition !== "excluded" ? (
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "set-disposition", activityId: activity.id, disposition: "excluded" })
              }
            >
              Exclude
            </button>
          ) : null}
        </div>
      ))}
    </section>
  );
}
