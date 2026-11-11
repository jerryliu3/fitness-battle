import { useId, type ComponentProps } from "react";
import { Image, View } from "react-native";
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from "react-native-svg";
import {
  RANK_SYMBOL_GEOMETRY,
  RANK_SYMBOLS,
  type RankSymbolId,
  type RankSymbolVariant,
} from "@fitness-battle/shared";
import { UserAvatar } from "./user-avatar";

const RANK_ART = {
  beginner: require("../../../../packages/shared/assets/rank-symbols/beginner.png"),
  rookie: require("../../../../packages/shared/assets/rank-symbols/rookie.png"),
  active: require("../../../../packages/shared/assets/rank-symbols/active.png"),
  challenger: require("../../../../packages/shared/assets/rank-symbols/challenger.png"),
  athlete: require("../../../../packages/shared/assets/rank-symbols/athlete.png"),
  elite: require("../../../../packages/shared/assets/rank-symbols/elite.png"),
  master: require("../../../../packages/shared/assets/rank-symbols/master.png"),
  olympian: require("../../../../packages/shared/assets/rank-symbols/olympian.png"),
  champion: require("../../../../packages/shared/assets/rank-symbols/champion.png"),
} as const;

export function RankSymbol({ rank, size = 80, variant = "badge", decorative = false }: {
  rank: RankSymbolId;
  /** Full ornament width/height, including the crown and ribbon. */
  size?: number;
  variant?: RankSymbolVariant;
  decorative?: boolean;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const name = RANK_SYMBOLS.find(symbol => symbol.id === rank)!.name;
  return <View accessible={!decorative} accessibilityRole="image"
    accessibilityLabel={decorative ? undefined : `${name} rank`}
    pointerEvents="none" style={{ width: size, height: size, flexShrink: 0 }}>
    {variant === "badge" && <Svg width={size} height={size} viewBox="0 0 160 160" accessible={false} style={{ position: "absolute" }}>
      <Defs><RadialGradient id={id}><Stop stopColor="#ffffff"/><Stop offset="1" stopColor="#fff5d1"/></RadialGradient></Defs>
      <Circle cx="80" cy="82" r="42" fill={`url(#${id})`}/>
    </Svg>}
    <Image source={RANK_ART[rank]} style={{ width: size, height: size }} resizeMode="contain" accessible={false}/>
    {variant === "badge" && <Svg width={size} height={size} viewBox="0 0 160 160" accessible={false} style={{ position: "absolute" }}>
      <Path d="M66 87L80 74L94 87" fill="none" stroke="#244d3c" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>}
  </View>;
}

/** Opt-in portrait composition; existing UserAvatar callers are unaffected. */
export function RankAvatar({ rank, size = 80, decorative = true, name, ...avatar }: Omit<ComponentProps<typeof UserAvatar>, "size"> & {
  rank: RankSymbolId;
  /** Full ornament size. The portrait occupies 84/160 of this width. */
  size?: number;
}) {
  const { size: viewBox, portrait } = RANK_SYMBOL_GEOMETRY;
  const scale = size / viewBox;
  const rankName = RANK_SYMBOLS.find(symbol => symbol.id === rank)!.name;
  return <View accessible={!decorative} accessibilityRole="image"
    accessibilityLabel={decorative ? undefined : `${name}, ${rankName} rank`}
    accessibilityElementsHidden={decorative} importantForAccessibility={decorative ? "no-hide-descendants" : "auto"}
    style={{ width: size, height: size, flexShrink: 0 }}>
    <View style={{ position: "absolute", left: portrait.x * scale, top: portrait.y * scale }}>
      <UserAvatar {...avatar} name={name} size={portrait.size * scale} decorative />
    </View>
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0 }}>
      <RankSymbol rank={rank} size={size} variant="frame" decorative />
    </View>
  </View>;
}
