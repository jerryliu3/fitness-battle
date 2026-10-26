import {
  achievementProgressPercent,
  type ClubAchievement,
} from "@fitness-battle/shared";

export function AchievementMeter({
  row,
  decorative = true,
}: {
  row: ClubAchievement;
  decorative?: boolean;
}) {
  return (
    <div
      className="club-achievement-meter"
      data-earned={row.earned ? "true" : "false"}
      aria-hidden={decorative ? true : undefined}
    >
      <span style={{ width: `${achievementProgressPercent(row.fraction)}%` }} />
    </div>
  );
}
