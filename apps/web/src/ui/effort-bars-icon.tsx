import { EFFORT_BAR_COLOR_ROLES, EFFORT_BAR_HEIGHT_RATIOS, type EffortBarCount } from "@fitness-battle/shared";

const ROLE_CSS_VAR = {
  podiumBronze: "var(--app-podium-bronze)",
  podiumSilver: "var(--app-podium-silver)",
  podiumGold: "var(--app-podium-gold)",
} as const;

export function EffortBarsIcon({ bars, size = 64 }: { bars: EffortBarCount; size?: number }) {
  const maxBarHeight = Math.round(size * 0.5);
  const barWidth = Math.max(3, Math.round(size * 0.085));
  const gap = Math.max(2, Math.round(size * 0.05));
  return (
    <span
      role="img"
      aria-label={`Effort ${bars} of 5`}
      style={{
        display: "inline-flex",
        alignItems: "flex-end",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.19),
        background: "var(--paper)",
        border: "1px solid var(--line)",
        paddingBottom: Math.round(size * 0.24),
        gap,
        boxSizing: "border-box",
      }}
    >
      {EFFORT_BAR_HEIGHT_RATIOS.map((ratio, index) => {
        const active = index < bars;
        const fill = active ? ROLE_CSS_VAR[EFFORT_BAR_COLOR_ROLES[index]!] : "var(--app-divider)";
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
