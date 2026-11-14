import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { RankAvatar } from "../ui/rank-symbol";
import { AppText } from "../ui/section";
import { SportIcon } from "../ui/sport-icon";
import { useState } from "react";
import { Pressable, View } from "react-native";
import {
  APP_TIMEZONE,
  formatEloDelta,
  formatVolume,
  formatEffort,
  ordinalPlace,
  sportById,
  rankSymbolForRankName,
  type AppColors,
  type PeriodResult,
  type UnitSystem,
} from "@fitness-battle/shared";

export function podiumMedalColor(c: AppColors, place: number): string | null {
  return place === 1 ? c.podiumGold : place === 2 ? c.podiumSilver : place === 3 ? c.podiumBronze : null;
}

export function eloDeltaPalette(c: AppColors, frozen: boolean, delta: number) {
  return {
    bg: frozen ? c.soft : delta > 0 ? c.greenSoft : delta < 0 ? c.statusErrorSoft : c.soft,
    text: frozen ? c.muted : delta > 0 ? c.green : delta < 0 ? c.statusError : c.ink,
  };
}

export function formatPeriodDateRange(periodStart: string, periodEnd: string): string {
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE });
  return `${fmt(Date.parse(periodStart))} – ${fmt(Date.parse(periodEnd) - 1)}`;
}

export function ResultCard({
  result,
  units,
  podiumAthletes = [],
  compact = false,
}: {
  result: PeriodResult;
  units: UnitSystem;
  podiumAthletes?: { id: string; name: string; place: number; you: boolean; avatarUrl?: string | null; rank?: string | null }[];
  compact?: boolean;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const [receipt, setReceipt] = useState(false);

  const sport = sportById(result.sport);
  const range = formatPeriodDateRange(result.periodStart, result.periodEnd);
  const delta = result.eloAfter - result.eloBefore;
  const deltaText = formatEloDelta(result.eloBefore, result.eloAfter);
  const podiumColor = podiumMedalColor(c, result.place);
  const { bg: deltaBg, text: deltaColor } = eloDeltaPalette(c, Boolean(result.frozen), delta);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${receipt ? "Hide" : "View"} ${sport.name} result receipt. ${range}. ${result.track === "verified" ? "GPS" : "Open"}. Place ${result.place} of ${result.fieldSize}. ${formatVolume(result.sport, result.distanceM, result.movingSec, units)}. ${result.eloBefore} to ${result.eloAfter} effort score, ${deltaText}. ${result.frozen ? "Weekly score adjustment held by freeze." : "Weekly score adjustment."}`}
      accessibilityState={{ expanded: receipt }}
      onPress={() => setReceipt((v) => !v)}
      style={({ pressed }) => [
        s.card,
        compact && s.cardCompact,
        pressed && { opacity: 0.92 },
      ]}
    >
      {/* Header row */}
      <View style={s.header}>
        <View style={s.sportRow}>
          <SportIcon sport={result.sport} size={18} />
          <AppText role="label">{sport.name}</AppText>
          <View style={s.trackBadge}>
            <AppText role="caption" secondary>{result.track === "verified" ? "GPS" : "Open"}</AppText>
          </View>
        </View>
        <AppText role="caption" secondary>{range}</AppText>
      </View>

      {/* Podium strip when field athletes are provided */}
      {podiumAthletes.length > 0 ? (
        <View style={s.podiumRow}>
          {(
            [
              { step: 2, label: "2nd", height: 42, color: c.podiumSilver },
              { step: 1, label: "1st", height: 56, color: c.podiumGold },
              { step: 3, label: "3rd", height: 34, color: c.podiumBronze },
            ] as const
          ).map((podium) => {
            const athletes = podiumAthletes.filter((a) => a.place === podium.step);
            const isYou = result.place === podium.step;
            return (
              <View key={podium.step} style={s.podiumCol}>
                {athletes.map((athlete) => (
                  <View key={athlete.id} style={s.podiumAthlete}>
                    <RankAvatar
                      rank={rankSymbolForRankName(athlete.rank)}
                      src={athlete.avatarUrl}
                      name={athlete.name}
                      size={44}
                      highlight={athlete.you}
                    />
                    <AppText role="caption" numberOfLines={1} style={{ textAlign: "center" }}>
                      {athlete.name}
                    </AppText>
                  </View>
                ))}
                <View
                  style={[
                    s.podiumStep,
                    {
                      height: podium.height,
                      backgroundColor: isYou ? c.surfaceInverse : c.paper,
                      borderColor: isYou ? c.surfaceInverse : podium.color,
                    },
                  ]}
                >
                  <AppText role="label" style={{ color: isYou ? c.tennis : c.ink }}>
                    {podium.label}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Hero Position & Effort Score Delta */}
      <View style={s.heroRow}>
        <View style={s.placeGroup}>
          <View
            style={[
              s.placeBadge,
              podiumColor ? { backgroundColor: `${podiumColor}24`, borderColor: podiumColor } : null,
            ]}
          >
            <AppText role="heading" style={[s.tabular, podiumColor ? { color: c.ink } : null]}>
              #{result.place}
            </AppText>
          </View>
          <View style={{ gap: 2 }}>
            <AppText role="heading" accessibilityRole="header">
              {ordinalPlace(result.place)} of {result.fieldSize}
            </AppText>
            <AppText role="caption" secondary>
              {result.frozen ? "Week frozen · Score held" : "Round settled"}
            </AppText>
          </View>
        </View>

        <View style={[s.deltaPill, { backgroundColor: deltaBg }]}>
          <AppText role="label" style={[s.tabular, { color: deltaColor }]}>
            {deltaText} pts
          </AppText>
        </View>
      </View>

      {/* 3-Cell Metrics Strip */}
      <View style={s.metricsRow}>
        <View style={s.metricCell}>
          <AppText role="caption" secondary>Volume</AppText>
          <AppText role="label" style={s.tabular} numberOfLines={1}>
            {formatVolume(result.sport, result.distanceM, result.movingSec, units)}
          </AppText>
        </View>
        <View style={s.metricDivider} />
        <View style={s.metricCell}>
          <AppText role="caption" secondary>Effort</AppText>
          <AppText role="label" style={s.tabular} numberOfLines={1}>
            {formatEffort(result.effort)} pts
          </AppText>
        </View>
        <View style={s.metricDivider} />
        <View style={s.metricCell}>
          <AppText role="caption" secondary>Rating</AppText>
          <AppText role="label" style={s.tabular} numberOfLines={1}>
            {result.eloAfter}
          </AppText>
        </View>
      </View>

      {/* Expandable Itemized Score Receipt */}
      {receipt ? (
        <View style={s.receiptBox}>
          {[
            ["Starting score", `${result.eloBefore}`],
            ["Round adjustment", `${deltaText}${result.frozen ? " (frozen)" : ""}`],
            ["Final rating", `${result.eloAfter}`],
            ["Window", "Eastern time · Mon–Mon"],
          ].map(([label, value]) => (
            <View key={label} style={s.receiptLine}>
              <AppText role="caption" secondary>{label}</AppText>
              <AppText role="caption" style={s.tabular}>{value}</AppText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={s.footerToggle}>
        <AppText role="caption" secondary>
          {receipt ? "Hide breakdown" : "Score breakdown"}
        </AppText>
        <AppText role="caption" secondary>{receipt ? "−" : "+"}</AppText>
      </View>
    </Pressable>
  );
}

const sThemes = createThemedStyles((c) => ({
  card: {
    padding: 16,
    gap: 14,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
  },
  cardCompact: {
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trackBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
  },
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
    paddingTop: 4,
  },
  podiumCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  podiumAthlete: {
    alignItems: "center",
    gap: 3,
    width: "100%",
  },
  podiumStep: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  placeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  placeBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: "center",
    justifyContent: "center",
  },
  deltaPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.line,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metricCell: {
    flex: 1,
    gap: 2,
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: c.line,
  },
  receiptBox: {
    borderTopWidth: 1,
    borderTopColor: c.line,
    paddingTop: 12,
    gap: 8,
  },
  receiptLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  footerToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: c.line,
    paddingTop: 10,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
}));
