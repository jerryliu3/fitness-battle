"use client";
import { useId, useState } from "react";
import {
  clubAchievements,
  featuredClubAchievements,
  sportById,
  type ClubAchievement,
  type CompeteState,
} from "@fitness-battle/shared";
import { Sheet } from "@/ui/sheet";
function AchievementBadge({ item }: { item: ClubAchievement }) {
  const id = useId();
  return (
    <svg className="club-badge" viewBox="0 0 84 92" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop
            stopColor={
              item.earned
                ? item.category === "effort"
                  ? "#ffe39a"
                  : "#6bbab2"
                : "#edf1f1"
            }
          />
          <stop
            offset="1"
            stopColor={
              item.earned
                ? item.category === "effort"
                  ? "#e4a82b"
                  : "#176c75"
                : "#cbd6d9"
            }
          />
        </linearGradient>
      </defs>
      <path
        d="M42 4 76 22v43L42 87 8 65V22Z"
        fill={`url(#${id})`}
        stroke={item.earned ? "#ffffff" : "#e3e9e7"}
        strokeWidth="3"
      />
      <path
        d="M42 13 68 27v33L42 77 16 60V27Z"
        fill="none"
        stroke="#ffffff88"
        strokeWidth="2"
      />
      {item.category === "sessions" ? (
        <path
          d="m42 27 5 11 12 2-9 8 2 13-10-6-11 6 2-13-9-8 13-2Z"
          fill="white"
        />
      ) : (
        <path d="m46 23-18 26h12l-3 20 21-29H45Z" fill="white" />
      )}
    </svg>
  );
}
export function Achievements({ state }: { state: CompeteState }) {
  const rows = clubAchievements(state),
    featured = featuredClubAchievements(rows);
  const [selected, setSelected] = useState<string | null>(null);
  const item = rows.find((row) => row.id === selected);
  return (
    <section className="club-achievements">
      <div className="club-section-heading">
        <h2>Achievements</h2>
        <button
          type="button"
          className="club-text-link"
          onClick={() => setSelected(featured[0]!.id)}
        >
          View all →
        </button>
      </div>
      <div className="club-achievement-grid">
        {featured.map((row) => (
          <button
            className="club-achievement"
            key={row.id}
            type="button"
            onClick={() => setSelected(row.id)}
            aria-label={`${row.title}. ${row.target} ${row.category === "sessions" ? "sessions" : "Open effort score"}. ${row.earned ? "Earned" : "In progress"}`}
          >
            <AchievementBadge item={row} />
            <b>
              {row.target.toLocaleString()}
              {row.category === "sessions"
                ? row.target === 1
                  ? " session"
                  : " sessions"
                : " pts"}
            </b>
            <small>{row.title}</small>
            <span className={row.earned ? "club-earned" : "club-upcoming"}>
              {row.earned ? "✓ Earned" : "Up next"}
            </span>
          </button>
        ))}
      </div>
      <Sheet
        open={Boolean(item)}
        title={item?.title ?? "Achievements"}
        body="Everyday milestones, built by you."
        onClose={() => setSelected(null)}
      >
        {item ? (
          <>
            <div className="club-achievement-detail">
              <AchievementBadge item={item} />
              <strong>
                {item.current.toLocaleString()} / {item.target.toLocaleString()}
              </strong>
              <p>
                {item.category === "sessions"
                  ? "Sessions currently in your activity history."
                  : `${sportById(state.primary).name} · Open Effort Score.`}
              </p>
              <p>
                {item.earned
                  ? "Milestone reached. Keep building on it."
                  : `${Math.max(0, item.target - item.current).toLocaleString()} ${item.category === "sessions" ? "sessions" : "points"} to this milestone.`}
              </p>
              <progress
                max={1}
                value={item.fraction}
                aria-label="Milestone progress"
              />
            </div>
            <p className="fb-note">
              Milestones reflect your current activity history and score. They do
              not grant rewards or change competition points.
            </p>
            <div className="club-all-achievements">
              {rows.map((row) => (
                <button
                  type="button"
                  key={row.id}
                  aria-pressed={row.id === item.id}
                  onClick={() => setSelected(row.id)}
                >
                  <AchievementBadge item={row} />
                  <span>
                    <b>{row.title}</b>
                    <small>
                      {row.target}{" "}
                      {row.category === "sessions"
                        ? "sessions"
                        : "Open effort score"}{" "}
                      · {row.earned ? "Earned" : "Upcoming"}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </Sheet>
    </section>
  );
}
