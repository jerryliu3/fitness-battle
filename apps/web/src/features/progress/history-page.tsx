"use client";

import Link from "next/link";
import { AwardShelf } from "@/features/you/award-shelf";
import { SeasonHistory } from "@/features/split/components/season-history";
import { useCompete } from "@/components/compete-context";
import { awardCards } from "@fitness-battle/shared";

export function ProgressHistoryPage() {
  const { state } = useCompete();
  if (!state) return <p className="fb-copy">Loading history…</p>;
  return (
    <div className="club-detail-page">
      <header className="club-detail-heading">
        <Link href="/you" className="club-icon-button" aria-label="Return to Progress">
          ‹
        </Link>
        <h1>Past weeks & awards</h1>
      </header>
      <SeasonHistory results={state.periodResults} primary={state.primary} units={state.units} />
      {awardCards(state).length > 0 ? <AwardShelf state={state} /> : null}
    </div>
  );
}
