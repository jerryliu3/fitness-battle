"use client";
import { AppParagraph, AppHeading } from "@/ui/section";

import Link from "next/link";
import { AwardShelf } from "@/features/you/award-shelf";
import { SeasonHistory } from "@/features/split/components/season-history";
import { useCompete } from "@/components/compete-context";
import { awardCards } from "@fitness-battle/shared";

export function ProgressHistoryPage() {
  const { state } = useCompete();
  if (!state) return <AppParagraph typographyRole="body" className="fb-copy">Loading history…</AppParagraph>;
  return (
    <div className="club-detail-page">
      <header className="club-detail-heading">
        <Link href="/you?view=effort" className="club-icon-button" aria-label="Return to Progress">
          ‹
        </Link>
        <AppHeading level={1} role="heading">Past weeks & awards</AppHeading>
      </header>
      <SeasonHistory state={state} results={state.periodResults} primary={state.primary} units={state.units} />
      {awardCards(state).length > 0 ? <AwardShelf state={state} /> : null}
    </div>
  );
}
