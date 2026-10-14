"use client";

import { useCompete } from "@/components/compete-context";
import {
  ProductHeader,
  sourceFromLinks,
} from "@/features/split/components/product-header";
import {
  paceMinPerKm,
  progressionTrends,
  sportById,
} from "@fitness-battle/shared";

function Series({
  title,
  unit,
  points,
}: {
  title: string;
  unit: string;
  points: { day: string; value: number }[];
}) {
  const max = Math.max(1, ...points.map((point) => point.value));
  return (
    <section className="fb-card">
      <h2>{title}</h2>
      {points.length === 0 ? (
        <p className="fb-copy">No counted {title.toLowerCase()} yet.</p>
      ) : (
        <ul className="fb-stack">
          {points.slice(-16).map((point) => (
            <li key={point.day}>
              <span>
                {point.day} · {point.value} {unit}
              </span>
              <div className="fb-bar">
                <span style={{ width: `${(point.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ProgressPage() {
  const { state } = useCompete();
  if (!state) return <p className="fb-copy">Loading…</p>;
  const source = sourceFromLinks(state.links);
  const sport = state.primary;
  const trends = progressionTrends(
    state.activities,
    sport,
    state.periodResults
      .filter((result) => result.sport === sport && result.track === "open")
      .map((result) => ({
        day: result.periodStart.slice(0, 10),
        elo: result.eloAfter,
      })),
  );
  const best = state.activities
    .filter((activity) => activity.sport === sport && activity.provenance === "recorded")
    .map((activity) => ({ activity, pace: paceMinPerKm(activity) }))
    .filter((row) => row.pace != null)
    .sort((a, b) => a.pace! - b.pace!)[0];
  const weeksShown = state.periodResults.filter(
    (result) => result.sport === sport && result.track === "open" && result.effort > 0,
  ).length;

  return (
    <>
      <ProductHeader sourceStatus={source.status} sourceLabel={source.label} />
      <p className="fb-kicker">{sportById(sport).name}</p>
      <h1>Progress</h1>
      <p className="fb-copy">
        Distance and pace use counted sessions. Sample calibration is left out.
        Rating points are the open-track result after each closed week.
      </p>
      <Series title="Distance" unit="km" points={trends.distance} />
      <Series title="Pace" unit="min/km" points={trends.pace} />
      <Series title="Rating" unit="elo" points={trends.elo} />
      <section className="fb-card">
        <h2>Milestones</h2>
        <p className="fb-copy">
          {weeksShown} week{weeksShown === 1 ? "" : "s"} with counted effort.
          {best
            ? ` Fastest recorded pace is ${best.pace!.toFixed(1)} min/km.`
            : " A recorded session will set a pace milestone."}
        </p>
      </section>
    </>
  );
}
