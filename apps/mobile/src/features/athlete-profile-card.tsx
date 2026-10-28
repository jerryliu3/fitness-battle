import type { ReactNode } from "react";
import { View } from "react-native";
import { initialsFromName, rankForElo } from "@fitness-battle/shared";
import { SHELL_COLORS as c } from "../theme";
import { f } from "../ui/focus";
import { AppText } from "../ui/section";
import { UserAvatar } from "../ui/user-avatar";

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
  return (
    <View style={{ borderRadius: 24, backgroundColor: c.ink, borderWidth: 1, borderColor: c.line, overflow: "hidden" }}>
      <View style={{ padding: 20, gap: 16 }}>
        <View style={[f.row, { gap: 16, alignItems: "center" }]}>
          <UserAvatar src={avatarUrl} name={name} size={64} highlight fallback={<AppText role="heading" style={{ color: c.card }}>{initialsFromName(name)}</AppText>} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={[f.row, { justifyContent: "space-between", alignItems: "baseline" }]}>
              <AppText role={largeName ? "display" : "heading"} style={{ color: c.card, flex: 1 }}>{name}</AppText>
              {since ? <AppText role="caption" style={{ color: "#8fa2b5" }}>{since}</AppText> : null}
            </View>
            {city ? <AppText role="caption" style={{ color: "#c9d6e3" }}>{city}</AppText> : null}
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
