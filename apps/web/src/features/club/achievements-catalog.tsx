"use client";
import { AppParagraph, AppText, StatusBadge } from "@/ui/section";
import { useState } from "react";
import {
  achievementAccessibilityLabel,
  clubAchievements,
  sportById,
  type ClubAchievement,
  type CompeteState,
} from "@fitness-battle/shared";
import { Achievements } from "./achievements";
import { AchievementMeter } from "./achievement-meter";

function AchievementRingBadge({ item }: { item: ClubAchievement }) {
  const dash = Math.round(item.fraction * 138.2);
  const stroke = item.earned
    ? item.category === "effort"
      ? "#f7c948"
      : "#176c75"
    : "#9fa5af";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
      <circle
        cx="28"
        cy="28"
        r="22"
        fill={item.earned ? "#142b3b" : "#f8f9f6"}
        stroke="#e3e9e7"
        strokeWidth="4"
      />
      <circle
        cx="28"
        cy="28"
        r="22"
        fill="none"
        stroke={stroke}
        strokeWidth="4.5"
        strokeDasharray={`${dash} 138.2`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
      />
      <text
        x="28"
        y="32"
        textAnchor="middle"
        fill={item.earned ? "#f7c948" : "#142b3b"}
        fontSize="11"
        fontWeight="800"
      >
        {Math.round(item.fraction * 100)}%
      </text>
    </svg>
  );
}

export function AchievementsCatalog({
  state,
  initialId,
}: {
  state: CompeteState;
  initialId?: string;
}) {
  const rows = clubAchievements(state);
  const [selected, setSelected] = useState(
    initialId && rows.some((row) => row.id === initialId)
      ? initialId
      : rows[0]?.id ?? "",
  );
  const item = rows.find((row) => row.id === selected) ?? rows[0];
  return (
    <div className="club-achievements-catalog" style={{ display: "grid", gap: 20 }}>
      <Achievements state={state} />
      {item ? (
        <div className="club-achievement-detail">
          <AchievementRingBadge item={item} />
          <AchievementMeter row={item} decorative={false} />
          <strong>
            {Math.min(item.current, item.target).toLocaleString()} /{" "}
            {item.target.toLocaleString()}
          </strong>
          <AppParagraph typographyRole="body">
            {item.category === "sessions"
              ? "Sessions currently in your activity history."
              : `${sportById(state.primary).name} · Open Effort Score.`}
          </AppParagraph>
          <AppParagraph typographyRole="body">
            {item.earned
              ? "Milestone reached. Keep building on it."
              : `${Math.max(0, item.target - item.current).toLocaleString()} ${item.category === "sessions" ? "sessions" : "points"} to this milestone.`}
          </AppParagraph>
        </div>
      ) : null}
      <AppParagraph typographyRole="caption" className="fb-note">
        Milestones reflect your current activity history and score. They do not
        grant rewards or change competition points.
      </AppParagraph>
      <div className="club-all-achievements">
        {rows.map((row) => (
          <button
            type="button"
            key={row.id}
            aria-pressed={row.id === item?.id}
            aria-label={achievementAccessibilityLabel(row)}
            onClick={() => setSelected(row.id)}
          >
            <AchievementRingBadge item={row} />
            <span>
              <b>{row.title}</b>
              <AchievementMeter row={row} />
              <AppText as="small" role="caption" secondary>
                {row.target}{" "}
                {row.category === "sessions"
                  ? "sessions"
                  : "Open effort score"}
              </AppText>
              <StatusBadge tone={row.earned ? "success" : "neutral"}>
                {row.earned ? "Earned" : "Up next"}
              </StatusBadge>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

