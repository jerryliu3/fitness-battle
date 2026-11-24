
import { colors as appearanceColors } from "@/theme/app-colors";
import { initialsFromName, type ArenaSceneLane } from "@fitness-battle/shared";
import { typographyStyle } from "@/ui/section";

export interface AthleteNodeProps {
  mapOverlay?: boolean;
  lane: Pick<ArenaSceneLane, "name" | "you" | "avatarUrl"> & {
    initials?: string;
    mystery?: boolean;
    ghost?: boolean;
  };
  x: number;
  y: number;
  detail: string;
  subdetail?: string;
  prefix: string;
  /** Whether the connected detail popup card + leader line is open. Defaults to false. */
  expanded?: boolean;
  /** Whether to render the circular profile node at (0, 0). Defaults to true. */
  showNode?: boolean;
  /** Whether the circular profile node at (0, 0) is selected/expanded. */
  selected?: boolean;
  /** Base radius of the circular profile node at (0, 0). Defaults to 20. */
  nodeRadius?: number;
  /** Scale multiplier for the circular profile node at (0, 0). Defaults to 1. */
  nodeScale?: number;
  /** Whether this athlete holds 1st place: yellow accent instead of the secondary color. */
  gold?: boolean;
}

function resolveInitials(name: string, explicit?: string, mystery?: boolean): string {
  if (mystery) return "?";
  const candidate = (explicit && explicit.trim().toUpperCase() !== "YOU" ? explicit : initialsFromName(name)).trim().toUpperCase();
  if (!candidate || candidate === "YOU" || candidate === "YO") {
    const cleaned = name.replace(/\byou\b/gi, "").trim();
    return cleaned ? initialsFromName(cleaned).slice(0, 2).toUpperCase() : "AP";
  }
  return candidate.slice(0, 2);
}

/** Pure circular athlete profile node at (0, 0) with optional leader-line detail popup in screen coordinates. */
export function AthleteNode({
  lane: l,
  x,
  y,
  detail,
  subdetail,
  prefix,
  expanded = false,
  showNode = true,
  selected = false,
  nodeRadius = 20,
  nodeScale = 1,
  gold = false,
  mapOverlay = false,
}: AthleteNodeProps) {
  const isActive = expanded || selected;
  const r = nodeRadius;
  const effectiveScale = nodeScale * (l.mystery ? 0.8 : isActive ? 1.16 : 1);
  const accent = gold ? appearanceColors.tennis : appearanceColors.secondary;
  const initials = resolveInitials(l.name, l.initials, l.mystery);
  const cleanSubdetail = subdetail?.trim();
  const cardW = 128;
  const cardH = cleanSubdetail ? 44 : 30;
  const attachX = x + cardW / 2;
  const attachY = y > 0 ? y : y + cardH;

  return (
    <g>
      {expanded && !l.mystery && (detail || cleanSubdetail) ? (
        <g>
          <path
            d={`M0 0 L${attachX} ${attachY}`}
            fill="none"
            stroke={appearanceColors.secondary}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx={attachX} cy={attachY} r={2.6} fill={appearanceColors.secondary} />
          <rect x={x} y={y + 2} width={cardW} height={cardH} rx={12} fill={appearanceColors.textSecondary} opacity={0.14} />
          <rect
            x={x}
            y={y}
            width={cardW}
            height={cardH}
            rx={12}
            fill={mapOverlay ? `var(--map-hud-fill, ${appearanceColors.card})` : appearanceColors.card}
            stroke={mapOverlay ? `var(--map-hud-edge, ${appearanceColors.line})` : appearanceColors.line}
            strokeWidth={1.1}
          />
          {detail ? (
            <text
              style={typographyStyle("caption")}
              x={x + cardW / 2}
              y={y + (cleanSubdetail ? 17 : 19)}
              textAnchor="middle"
              fill={appearanceColors.ink}
            >
              {detail}
            </text>
          ) : null}
          {cleanSubdetail ? (
            <text
              style={typographyStyle("caption")}
              x={x + cardW / 2}
              y={y + 33}
              textAnchor="middle"
              fill={mapOverlay ? `var(--map-hud-muted, ${appearanceColors.fieldTeal})` : appearanceColors.fieldTeal}
            >
              {cleanSubdetail.length > 18 ? `${cleanSubdetail.slice(0, 17)}…` : cleanSubdetail}
            </text>
          ) : null}
        </g>
      ) : null}
      {showNode ? (
        <g transform={`scale(${effectiveScale})`}>
          {isActive ? <circle cx={0} cy={0} r={r + 4} fill={accent} opacity={0.28} /> : null}
          <circle cx={0} cy={1.5} r={r} fill={appearanceColors.ink} opacity={0.2} />
          <circle cx={0} cy={0} r={r} fill={appearanceColors.card} />
          {!l.mystery && l.avatarUrl ? (
            <>
              <defs>
                <clipPath id={`${prefix}-node-portrait`}>
                  <circle cx={0} cy={0} r={r} />
                </clipPath>
              </defs>
              <image
                href={l.avatarUrl}
                x={-r}
                y={-r}
                width={r * 2}
                height={r * 2}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${prefix}-node-portrait)`}
              />
            </>
          ) : (
            <text style={typographyStyle("caption")} x={0} y={4} textAnchor="middle" fill={appearanceColors.ink}>
              {initials}
            </text>
          )}
          <circle
            cx={0}
            cy={0}
            r={r}
            fill="none"
            stroke={isActive ? accent : appearanceColors.line}
            strokeWidth={isActive && r >= 14 ? 2.4 : 1.6}
            strokeDasharray={l.mystery || l.ghost ? "3 3" : undefined}
          />
        </g>
      ) : null}
    </g>
  );
}
