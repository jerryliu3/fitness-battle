"use client";

import Link from "next/link";
import { AchievementsCatalog } from "@/features/club/achievements-catalog";
import { useCompete } from "@/components/compete-context";

export function AchievementsPage() {
  const { state } = useCompete();
  if (!state) return <p className="fb-copy">Loading achievements…</p>;
  return (
    <div className="club-detail-page">
      <header className="club-detail-heading">
        <Link href="/you" className="club-icon-button" aria-label="Return to Progress">
          ‹
        </Link>
        <h1>Achievements</h1>
      </header>
      <AchievementsCatalog state={state} />
    </div>
  );
}
