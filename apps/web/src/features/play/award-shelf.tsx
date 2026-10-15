"use client";

import { formatEloDelta, formatPlace, sportById } from "@fitness-battle/shared";
import { useCompete } from "@/components/compete-context";

export function AwardShelf() {
  const { state } = useCompete();
  if (!state) return null;
  const awards = state.periodResults.filter((result) => result.track === "open").slice(0, 8);
  if (awards.length === 0) return <p className="ps-note">Week awards show up after a week closes.</p>;
  return (
    <div className="ps-awards" aria-label="Week awards">
      {awards.map((result) => (
        <article key={result.id} className="ps-award">
          <span>{sportById(result.sport).name}</span>
          <strong>{formatPlace(result.place, result.fieldSize)}</strong>
          <p>{formatEloDelta(result.eloBefore, result.eloAfter)} rating</p>
        </article>
      ))}
    </div>
  );
}
