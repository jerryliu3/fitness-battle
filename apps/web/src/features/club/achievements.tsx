"use client";
import { Section, TextAction, StatusBadge, AppText } from "@/ui/section";
import Link from "next/link";
import { useId } from "react";
import {
  clubAchievements,
  featuredClubAchievements,
  type ClubAchievement,
  type CompeteState,
} from "@fitness-battle/shared";

function AchievementBadge({ item }: { item: ClubAchievement }) {
  const id = useId();
  return (
    <svg className="club-badge" viewBox="0 0 84 92" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={item.earned ? (item.category === "effort" ? "#ffe39a" : "#6bbab2") : "#edf1f1"} />
          <stop offset="1" stopColor={item.earned ? (item.category === "effort" ? "#e4a82b" : "#176c75") : "#cbd6d9"} />
        </linearGradient>
      </defs>
      <path d="M42 4 76 22v43L42 87 8 65V22Z" fill={`url(#${id})`} stroke={item.earned ? "#ffffff" : "#e3e9e7"} strokeWidth="3" />
      <path d="M42 13 68 27v33L42 77 16 60V27Z" fill="none" stroke="#ffffff88" strokeWidth="2" />
      {item.category === "sessions" ? (
        <path d="m42 27 5 11 12 2-9 8 2 13-10-6-11 6 2-13-9-8 13-2Z" fill="white" />
      ) : (
        <path d="m46 23-18 26h12l-3 20 21-29H45Z" fill="white" />
      )}
    </svg>
  );
}

export function Achievements({ state }: { state: CompeteState }) {
  const rows = clubAchievements(state);
  const featured = featuredClubAchievements(rows);
  return (
    <Section className="club-achievements" title="Achievements" action={<TextAction href="/you/achievements" label="View all" accessibilityLabel="View all achievements"/>}>
      <div className="club-achievement-grid">
        {featured.map((row) => (
          <Link
            className="club-achievement"
            key={row.id}
            href={`/you/achievements?milestone=${encodeURIComponent(row.id)}`}
            aria-label={`${row.title}. ${row.target} ${row.category === "sessions" ? "sessions" : "Open effort score"}. ${row.earned ? "Earned" : "In progress"}`}
          >
            <AchievementBadge item={row} />
            <AppText role="caption" secondary className="club-achievement-title">
              {row.title}
            </AppText>
            <div
              className="club-achievement-meter"
              data-earned={row.earned ? "true" : "false"}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={row.target}
              aria-valuenow={Math.min(row.current, row.target)}
              aria-label={`${row.current} of ${row.target}`}
            >
              <span style={{ width: `${Math.round(row.fraction * 100)}%` }} />
            </div>
            <AppText role="label" className="club-achievement-progress">
              {row.current.toLocaleString()} / {row.target.toLocaleString()}
            </AppText>
            <StatusBadge tone={row.earned ? "success" : "neutral"}>
              {row.earned ? "✓ Earned" : "Up next"}
            </StatusBadge>
          </Link>
        ))}
      </div>
    </Section>
  );
}
