"use client";
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
    <section className="club-achievements">
      <div className="club-section-heading">
        <h2 className="fb-section-title">Achievements</h2>
        <Link href="/you/achievements" className="club-text-link">View all →</Link>
      </div>
      <div className="club-achievement-grid">
        {featured.map((row) => (
          <Link
            className="club-achievement"
            key={row.id}
            href="/you/achievements"
            aria-label={`${row.title}. ${row.target} ${row.category === "sessions" ? "sessions" : "Open effort score"}. ${row.earned ? "Earned" : "In progress"}`}
          >
            <AchievementBadge item={row} />
            <b>
              {row.target.toLocaleString()}
              {row.category === "sessions" ? (row.target === 1 ? " session" : " sessions") : " pts"}
            </b>
            <small>{row.title}</small>
            <span className={row.earned ? "club-earned" : "club-upcoming"}>
              {row.earned ? "✓ Earned" : "Up next"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
