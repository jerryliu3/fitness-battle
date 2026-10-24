"use client";
import { AppParagraph, AppHeading } from "@/ui/section";


import Link from "next/link";
import { AchievementsCatalog } from "@/features/club/achievements-catalog";
import { useCompete } from "@/components/compete-context";

export function AchievementsPage() {
  const { state } = useCompete();
  if (!state) return <AppParagraph typographyRole="body" className="fb-copy">Loading achievements…</AppParagraph>;
  return (
    <div className="club-detail-page">
      <header className="club-detail-heading">
        <Link href="/you" className="club-icon-button" aria-label="Return to Progress">
          ‹
        </Link>
        <AppHeading level={1} role="navigationTitle">Achievements</AppHeading>
      </header>
      <AchievementsCatalog state={state} />
    </div>
  );
}
