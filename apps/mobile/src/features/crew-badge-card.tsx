import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { APP_TIMEZONE, crewBadgeCollection, type CrewBadgeReceipt, type UnitSystem } from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { AppIcon } from "../ui/app-icon";
import { FocusSheet } from "../ui/focus";
import { AppText } from "../ui/section";

type Badge = ReturnType<typeof crewBadgeCollection>[number];

function Seal({ badge, muted, surface, border = muted }: { badge: Badge; muted: string; surface?: string; border?: string }) {
  const earned = Boolean(badge.receipt);
  const { fill, edge, ink, radius } = badge.seal;
  return <View style={[styles.seal, {
    borderRadius: radius, borderStyle: earned ? "solid" : "dashed",
    borderColor: earned ? edge : border, backgroundColor: earned ? fill : surface,
  }]}>
    <AppIcon name={badge.icon} size={21} color={earned ? ink : muted} />
  </View>;
}

export function CrewBadgeCard({ crewName, badges, units }: {
  crewName: string;
  badges?: CrewBadgeReceipt[];
  units?: UnitSystem;
}) {
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  if (!badges) return null;
  const collection = crewBadgeCollection(badges, units);
  const count = collection.filter(badge => badge.receipt).length;
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: APP_TIMEZONE });

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Crew Passport, ${count} of ${collection.length} badges earned`}
      onPress={() => setOpen(true)} style={({ pressed }) => [styles.cover, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.coverEdge} pointerEvents="none" />
      <AppText role="label" numberOfLines={1} style={{ color: "#ead891" }}>{crewName}</AppText>
      <AppText role="display" style={{ color: "#faf5df" }}>Crew Passport</AppText>
      <View style={styles.slots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {collection.map(badge => <Seal key={badge.code} badge={badge} muted="#b5c9d0" />)}
      </View>
      <View style={styles.coverFooter}>
        <AppText role="caption" style={{ color: "#faf5df" }}>{count} of {collection.length} earned</AppText>
        <AppText role="label" style={{ color: "#f7c948" }}>View badges →</AppText>
      </View>
    </Pressable>
    <FocusSheet open={open} onClose={() => setOpen(false)} title="Crew Passport" fullScreen>
      <AppText role="heading">{crewName}</AppText>
      <AppText role="caption" secondary>{count} of {collection.length} earned</AppText>
      <View style={styles.catalog}>
        {collection.map(badge => <View key={badge.code} style={[styles.badge, { borderColor: c.line, backgroundColor: c.card }]}>
          <Seal badge={badge} muted={c.ink} border={c.line} surface={c.soft} />
          <AppText role="label">{badge.name}</AppText>
          <AppText role="caption" secondary>{badge.result ?? badge.requirement}</AppText>
          {badge.receipt && <AppText role="caption" secondary>{date.format(new Date(badge.receipt.earned_at))}</AppText>}
        </View>)}
      </View>
    </FocusSheet>
  </>;
}

const styles = StyleSheet.create({
  cover: { backgroundColor: "#173340", borderWidth: 1, borderColor: "#527988", borderRadius: 22, padding: 18, gap: 12 },
  coverEdge: { position: "absolute", top: 5, bottom: 5, left: 5, right: 5, borderWidth: 1, borderColor: "#ead89145", borderRadius: 17 },
  slots: { flexDirection: "row", justifyContent: "space-around", gap: 6 },
  seal: { width: 46, height: 46, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  coverFooter: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 6, borderTopWidth: 1, borderTopColor: "#ead89145", paddingTop: 10 },
  catalog: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  badge: { flexBasis: "47%", flexGrow: 1, minWidth: 120, borderWidth: 1, borderRadius: 14, padding: 12, gap: 7 },
});
