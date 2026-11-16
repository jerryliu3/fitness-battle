import { useThemeColors } from "../theme";
import { Circle, Defs, ClipPath, Image as SvgImage, G, Path, Rect, Text as SvgText } from "react-native-svg";
import { initialsFromName, type ArenaSceneLane } from "@fitness-battle/shared";
import { chartTextProps } from "./section";

export interface AthleteNodeProps {
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
}: AthleteNodeProps) {
  const c = useThemeColors();
  const isActive = expanded || selected;
  const r = nodeRadius;
  const effectiveScale = nodeScale * (isActive ? 1.16 : 1);
  const accent = gold ? c.tennis : c.secondary;
  const initials = resolveInitials(l.name, l.initials, l.mystery);
  const cleanSubdetail = subdetail?.replace(/\s+vs\s+you\b/gi, "").replace(/\byou['’]re\s+/gi, "");
  const cardW = 128;
  const cardH = cleanSubdetail ? 44 : 30;
  const attachX = x + cardW / 2;
  const attachY = y > 0 ? y : y + cardH;

  return (
    <G>
      {expanded && !l.mystery && (detail || cleanSubdetail) ? (
        <G>
          <Path
            d={`M0 0 L${attachX} ${attachY}`}
            fill="none"
            stroke={c.secondary}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <Circle cx={attachX} cy={attachY} r={2.6} fill={c.secondary} />
          <Rect x={x} y={y + 2} width={cardW} height={cardH} rx={12} fill={c.ink} opacity={0.14} />
          <Rect
            x={x}
            y={y}
            width={cardW}
            height={cardH}
            rx={12}
            fill={c.card}
            stroke={c.line}
            strokeWidth={1.1}
          />
          {detail ? (
            <SvgText
              {...chartTextProps()}
              x={x + cardW / 2}
              y={y + (cleanSubdetail ? 17 : 19)}
              textAnchor="middle"
              fill={c.ink}
            >
              {detail}
            </SvgText>
          ) : null}
          {cleanSubdetail ? (
            <SvgText
              {...chartTextProps()}
              x={x + cardW / 2}
              y={y + 33}
              textAnchor="middle"
              fill={c.fieldTeal}
            >
              {cleanSubdetail.length > 18 ? `${cleanSubdetail.slice(0, 17)}…` : cleanSubdetail}
            </SvgText>
          ) : null}
        </G>
      ) : null}
      {showNode ? (
        <G transform={`scale(${effectiveScale})`}>
          {isActive ? <Circle cx={0} cy={0} r={r + 4} fill={accent} opacity={0.28} /> : null}
          <Circle cx={0} cy={1.5} r={r} fill={c.ink} opacity={0.2} />
          <Circle cx={0} cy={0} r={r} fill={c.card} />
          {!l.mystery && l.avatarUrl ? (
            <>
              <Defs>
                <ClipPath id={`${prefix}-node-portrait`}>
                  <Circle cx={0} cy={0} r={r} />
                </ClipPath>
              </Defs>
              <SvgImage
                href={{ uri: l.avatarUrl }}
                x={-r}
                y={-r}
                width={r * 2}
                height={r * 2}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${prefix}-node-portrait)`}
              />
            </>
          ) : (
            <SvgText {...chartTextProps()} x={0} y={4} textAnchor="middle" fill={c.ink}>
              {initials}
            </SvgText>
          )}
          <Circle
            cx={0}
            cy={0}
            r={r}
            fill="none"
            stroke={isActive ? accent : c.line}
            strokeWidth={isActive && r >= 14 ? 2.4 : 1.6}
            strokeDasharray={l.mystery || l.ghost ? "3 3" : undefined}
          />
        </G>
      ) : null}
    </G>
  );
}
