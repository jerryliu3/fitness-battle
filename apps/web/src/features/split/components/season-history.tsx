"use client";

import {
  formatEloDelta,
  formatEffort,
  formatPlace,
  sportById,
  type PeriodResult,
  type SportId,
} from "@fitness-battle/shared";
import { useMemo, useState } from "react";

function weekLabel(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const end = new Date(new Date(periodEnd).getTime() - 1).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    },
  );
  return `${start} – ${end}`;
}

export function SeasonHistory({
  results,
  primary,
}: {
  results: PeriodResult[];
  primary: SportId;
}) {
  const [sportFilter, setSportFilter] = useState<SportId | "all">(primary);
  const [trackFilter, setTrackFilter] = useState<"open" | "verified" | "all">(
    "open",
  );

  const sports = useMemo(() => {
    const ids = [...new Set(results.map((row) => row.sport))];
    return ids.sort();
  }, [results]);

  const rows = useMemo(() => {
    return results.filter((row) => {
      if (sportFilter !== "all" && row.sport !== sportFilter) return false;
      if (trackFilter !== "all" && row.track !== trackFilter) return false;
      return true;
    });
  }, [results, sportFilter, trackFilter]);

  if (results.length === 0) {
    return (
      <section className="sp-history" id="season-history">
        <div className="fd-roster-head">
          <h3>Season history</h3>
        </div>
        <div className="sp-empty">
          <h2>No closed weeks yet</h2>
          <p className="fb-copy">
            When a UTC week ends, your place and effort score change land here — a
            Strava-style ledger of how the field treated you.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="sp-history" id="season-history">
      <div className="fd-roster-head">
        <h3>Season history</h3>
        <span>{rows.length} weeks</span>
      </div>

      <div className="fb-chips">
        <button
          type="button"
          className={sportFilter === "all" ? "fb-chip on" : "fb-chip"}
          onClick={() => setSportFilter("all")}
        >
          All sports
        </button>
        {sports.map((sport) => (
          <button
            key={sport}
            type="button"
            className={sportFilter === sport ? "fb-chip on" : "fb-chip"}
            onClick={() => setSportFilter(sport)}
          >
            {sportById(sport).name}
          </button>
        ))}
      </div>
      <div className="fb-chips">
        {(
          [
            ["open", "All efforts"],
            ["verified", "Verified"],
            ["all", "Both tracks"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={trackFilter === id ? "fb-chip on" : "fb-chip"}
            onClick={() => setTrackFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="sp-history-list">
        {rows.map((row) => {
          const delta = row.eloAfter - row.eloBefore;
          return (
            <article key={row.id} className="sp-history-row">
              <div className="sp-history-main">
                <strong>{weekLabel(row.periodStart, row.periodEnd)}</strong>
                <small>
                  {sportById(row.sport).name}
                  {row.track === "verified" ? " · verified" : " · open"}
                  {row.frozen ? " · frozen" : ""}
                </small>
              </div>
              <div className="sp-history-stats">
                <span>
                  <em>Place</em>
                  {formatPlace(row.place, row.fieldSize)}
                </span>
                <span>
                  <em>Effort</em>
                  {formatEffort(row.effort)}
                </span>
                <span>
                  <em>Effort Score</em>
                  {row.eloBefore}→{row.eloAfter}
                </span>
                <span data-delta={delta > 0 ? "up" : delta < 0 ? "down" : "flat"}>
                  <em>Δ</em>
                  {formatEloDelta(row.eloBefore, row.eloAfter)}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
