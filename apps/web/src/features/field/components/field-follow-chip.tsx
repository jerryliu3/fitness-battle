import { APP_ICON_PATHS } from "@fitness-battle/shared";
import type { CSSProperties } from "react";

const mapChipStyle: CSSProperties = {
  minHeight: 44,
  minWidth: 44,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: 0,
  cursor: "pointer",
};

export function FieldFollowChip({
  following,
  athleteName,
  onPress,
}: {
  following: boolean;
  athleteName: string;
  onPress(): void;
}) {
  const label = following ? "Following selected athlete" : `Follow ${athleteName}`;
  return (
    <button className="map-hud-control" type="button" aria-pressed={following} aria-label={label} title={label} onClick={onPress} style={mapChipStyle}>
      <svg width={22} height={22} viewBox="0 0 256 256" aria-hidden>
        <path
          d={following ? APP_ICON_PATHS.navigationArrowFill : APP_ICON_PATHS.navigationArrow}
          fill={following ? "currentColor" : "none"}
          stroke={following ? "none" : "currentColor"}
          strokeWidth={following ? 0 : 18}
          strokeLinejoin="round"
          fillRule={following ? "nonzero" : "evenodd"}
        />
      </svg>
    </button>
  );
}