import { useFocusStyles } from "../ui/focus";
import { useThemeColors } from "../theme";
import type { ReactNode } from "react";
import { View } from "react-native";
import { initialsFromName, rankForElo, rankSymbolForScore } from "@fitness-battle/shared";
import { RankAvatar } from "../ui/rank-symbol";


import { AppText } from "../ui/section";

/** Shared identity card for your Athlete page and another athlete's sheet. */
export function AthleteProfileCard({ name, avatarUrl, city, score, since, action, children, largeName = false }: {
  name: string;
  avatarUrl?: string | null;
  city?: string | null;
  score?: number | null;
  since?: string | null;
  action?: ReactNode;
  children?: ReactNode;
  largeName?: boolean;
}) {
const c=useThemeColors();
const f=useFocusStyles();

  return (
    <View style={{ borderRadius: 24, backgroundColor: c.surfaceInverse, borderWidth: 1, borderColor: c.line, overflow: "hidden" }}>
      <View style={{ padding: 20, gap: 16 }}>
        <View style={[f.row, { gap: 16, alignItems: "center" }]}>
          <RankAvatar rank={rankSymbolForScore(score)} src={avatarUrl} name={name} size={104} highlight fallback={<AppText role="heading" style={{ color: c.ink }}>{initialsFromName(name)}</AppText>} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={[f.row, { justifyContent: "space-between", alignItems: "baseline" }]}>
              <AppText role={largeName ? "display" : "heading"} style={{ color: c.textOnFeature, flex: 1 }}>{name}</AppText>
              {since ? <AppText role="caption" style={{ color: c.textOnFeatureMuted }}>{since}</AppText> : null}
            </View>
            {city ? <AppText role="caption" style={{ color: c.textOnFeatureMuted }}>{city}</AppText> : null}
            <View style={[f.row, { justifyContent: "space-between", alignItems: "center", marginTop: 4 }]}>
              {score != null && Number.isFinite(score) ? <AppText role="caption" style={{ color: c.tennis }}>{score} · {rankForElo(score).name}</AppText> : <View />}
              {action}
            </View>
          </View>
        </View>
        {children}
      </View>
    </View>
  );
}
