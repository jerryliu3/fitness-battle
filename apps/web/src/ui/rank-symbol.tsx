import type { ComponentProps } from "react";
import {
  RANK_SYMBOL_GEOMETRY,
  RANK_SYMBOLS,
  type RankSymbolId,
  type RankSymbolVariant,
} from "@fitness-battle/shared";
import { UserAvatar } from "./user-avatar";

export function RankSymbol({ rank, size = 80, variant = "badge", decorative = false, className }: {
  rank: RankSymbolId;
  /** Full ornament width/height, including the crown and ribbon. */
  size?: number;
  variant?: RankSymbolVariant;
  decorative?: boolean;
  className?: string;
}) {
  const name = RANK_SYMBOLS.find(symbol => symbol.id === rank)!.name;
  const { portrait } = RANK_SYMBOL_GEOMETRY;
  const scale = size / RANK_SYMBOL_GEOMETRY.size;
  return <span className={className} role={decorative ? undefined : "img"}
    aria-label={decorative ? undefined : `${name} rank`} aria-hidden={decorative || undefined}
    style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0, pointerEvents: "none" }}>
    {variant === "badge" && <span style={{ position: "absolute", left: portrait.x * scale, top: portrait.y * scale,
      width: portrait.size * scale, height: portrait.size * scale, borderRadius: "50%",
      background: "radial-gradient(circle at 35% 25%, #ffffff, #fff5d1)" }} /> }
    <img src={`/rank-symbols/${rank}.png`} width={size} height={size} alt="" draggable={false}
      style={{ position: "absolute", inset: 0, display: "block" }} />
    {variant === "badge" && <svg width={portrait.size * scale} height={portrait.size * scale} viewBox="0 0 84 84" aria-hidden="true"
      style={{ position: "absolute", left: portrait.x * scale, top: portrait.y * scale }}>
      <path d="M28 47L42 34L56 47" fill="none" stroke="#244d3c" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>}
  </span>;
}

/** Opt-in portrait composition; existing UserAvatar callers are unaffected. */
export function RankAvatar({ rank, size = 80, className, decorative = true, name, ...avatar }: Omit<ComponentProps<typeof UserAvatar>, "size"> & {
  rank: RankSymbolId;
  /** Full ornament size. The portrait occupies 84/160 of this width. */
  size?: number;
}) {
  const { size: viewBox, portrait } = RANK_SYMBOL_GEOMETRY;
  const scale = size / viewBox;
  const rankName = RANK_SYMBOLS.find(symbol => symbol.id === rank)!.name;
  return <span className={className} role={decorative ? undefined : "img"}
    aria-hidden={decorative || undefined} aria-label={decorative ? undefined : `${name}, ${rankName} rank`}
    style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0, verticalAlign: "middle" }}>
    <span style={{ position: "absolute", left: portrait.x * scale, top: portrait.y * scale }}>
      <UserAvatar {...avatar} name={name} size={portrait.size * scale} decorative />
    </span>
    <span style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <RankSymbol rank={rank} size={size} variant="frame" decorative />
    </span>
  </span>;
}
