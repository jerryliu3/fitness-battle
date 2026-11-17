import { WORKOUT_SIZE_BAR_COLOR_ROLES, WORKOUT_SIZE_BAR_HEIGHT_RATIOS, type WorkoutSizeBarCount } from "@fitness-battle/shared";

const ROLE_CSS_VAR = {
  podiumBronze: "var(--app-podium-bronze)",
  podiumSilver: "var(--app-podium-silver)",
  podiumGold: "var(--app-podium-gold)",
} as const;

export function WorkoutSizeIcon({ bars, size = 64 }: { bars: WorkoutSizeBarCount; size?: number }) {
  const maxBarHeight = Math.round(size * 0.72);
  const barWidth = Math.max(4, Math.round(size * 0.12));
  const gap = Math.max(2, Math.round(size * 0.06));
  const activeColor = ROLE_CSS_VAR[WORKOUT_SIZE_BAR_COLOR_ROLES[Math.max(0, bars - 1)]!];
  return (
    <span
      role="img"
      aria-label={`Workout Size ${bars} of 5`}
      style={{
        display: "inline-flex",
        alignItems: "flex-end",
        justifyContent: "center",
        width: size,
        height: size,
        paddingBottom: Math.round(size * 0.12),
        gap,
        boxSizing: "border-box",
      }}
    >
      {WORKOUT_SIZE_BAR_HEIGHT_RATIOS.map((ratio, index) => {
        const active = index < bars;
        const fill = active ? activeColor : "var(--app-divider)";
        return (
          <span
            key={index}
            aria-hidden="true"
            style={{
              width: barWidth,
              height: Math.max(5, Math.round(maxBarHeight * ratio)),
              borderRadius: Math.ceil(barWidth / 2),
              background: fill,
              opacity: active ? 1 : 0.45,
            }}
          />
        );
      })}
    </span>
  );
}
