import { SPORT_ICON_PATHS, type SportId } from "@fitness-battle/shared";

export function SportActivityIcon({ sport, size = 26 }: { sport: SportId; size?: number }) {
  const path = SPORT_ICON_PATHS[sport];
  return (
    <span className="sport-activity-icon" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </span>
  );
}
