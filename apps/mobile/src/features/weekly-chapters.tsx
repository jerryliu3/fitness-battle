import { useFocusStyles } from "../ui/focus";
import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { Chip, ChipRow } from "../ui/chip";
import { SectionHeader, AppText } from "../ui/section";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { competitionTrack, APP_TIMEZONE, formatEloDelta, sportById, type CompeteState, type SportId } from "@fitness-battle/shared";
import { CompetitionReplayButton } from "./competition-replay";
import { ResultCard, eloDeltaPalette, formatPeriodDateRange, podiumMedalColor } from "./result-card";

export function WeeklyChapters({ state }: { state: CompeteState }) {
  const f = useFocusStyles();
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);

  const [sport, setSport] = useState<SportId | "all">(state.primary);
  const [selected, setSelected] = useState<string | null>(null);
  const sports = [...new Set(state.periodResults.map((r) => r.sport))].sort();
  const rows = state.periodResults
    .filter((r) => (sport === "all" || r.sport === sport) && r.track === competitionTrack(r.sport))
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart));

  const month = (end: string) =>
    new Date(Date.parse(end) - 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: APP_TIMEZONE,
    });

  const podiums = rows.filter((r) => r.place <= 3).length;
  const netDelta = rows.reduce((sum, r) => sum + (r.eloAfter - r.eloBefore), 0);

  return (
    <View style={{ gap: 14 }}>
      <SectionHeader
        title="Past weeks"
        action={<AppText role="caption" secondary>{new Set(rows.map((r) => r.periodStart)).size} weeks</AppText>}
      />
      {!state.periodResults.length ? (
        <AppText role="support" secondary>Your first settled week will appear here.</AppText>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <ChipRow>
              {(["all", ...sports] as const).map((id) => (
                <Chip
                  key={id}
                  label={id === "all" ? "All sports" : sportById(id).name}
                  selected={sport === id}
                  onPress={() => setSport(id)}
                />
              ))}
            </ChipRow>
          </ScrollView>

          {rows.length > 0 ? (
            <View style={s.summaryStrip}>
              <View style={s.summaryCell}>
                <AppText role="heading" style={s.tabular}>{rows.length}</AppText>
                <AppText role="caption" secondary>Rounds</AppText>
              </View>
              <View style={s.summaryDivider} />
              <View style={s.summaryCell}>
                <AppText role="heading" style={s.tabular}>{podiums}</AppText>
                <AppText role="caption" secondary>Top 3</AppText>
              </View>
              <View style={s.summaryDivider} />
              <View style={s.summaryCell}>
                <AppText
                  role="heading"
                  style={[s.tabular, { color: netDelta >= 0 ? c.green : c.statusError }]}
                >
                  {netDelta >= 0 ? `+${netDelta}` : `${netDelta}`}
                </AppText>
                <AppText role="caption" secondary>Net score</AppText>
              </View>
            </View>
          ) : (
            <AppText role="caption" secondary>No closed weeks match this selection.</AppText>
          )}

          <View style={{ gap: 10 }}>
            {rows.map((r, i) => {
              const isOpen = selected === r.id;
              const delta = r.eloAfter - r.eloBefore;
              const medalColor = podiumMedalColor(c, r.place);
              const { bg: deltaBg, text: deltaTextColor } = eloDeltaPalette(c, Boolean(r.frozen), delta);
              const rangeLabel = formatPeriodDateRange(r.periodStart, r.periodEnd);

              return (
                <View key={r.id} style={{ gap: 10 }}>
                  {i === 0 || month(r.periodEnd) !== month(rows[i - 1]!.periodEnd) ? (
                    <Text style={[f.kicker, { marginTop: i === 0 ? 4 : 10, marginBottom: 2 }]}>
                      {month(r.periodEnd)}
                    </Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    accessibilityLabel={`${rangeLabel}, ${sportById(r.sport).name}, ${r.track}, place ${r.place} of ${r.fieldSize}, ${formatEloDelta(r.eloBefore, r.eloAfter)} Effort Score`}
                    onPress={() => setSelected(isOpen ? null : r.id)}
                    style={({ pressed }) => [
                      s.chapterCard,
                      isOpen && s.chapterCardActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View
                      style={[
                        s.place,
                        medalColor ? { backgroundColor: `${medalColor}22`, borderColor: medalColor } : null,
                      ]}
                    >
                      <AppText role="value" style={s.tabular}>#{r.place}</AppText>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <AppText role="row">{rangeLabel}</AppText>
                      <AppText role="caption" secondary>
                        {sportById(r.sport).name} · {r.track === "verified" ? "GPS" : "Open"} · {r.place} of {r.fieldSize}
                        {r.frozen ? " · frozen" : ""}
                      </AppText>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <View style={[s.deltaPill, { backgroundColor: deltaBg }]}>
                        <AppText role="label" style={[s.tabular, { color: deltaTextColor }]}>
                          {formatEloDelta(r.eloBefore, r.eloAfter)}
                        </AppText>
                      </View>
                      <AppText role="caption" secondary>{isOpen ? "Hide ↑" : "Receipt ↓"}</AppText>
                    </View>
                  </Pressable>
                  {isOpen ? (
                    <View style={s.expandedWrap}>
                      <ResultCard result={r} units={state.units} />
                      <CompetitionReplayButton state={state} selection={r} label="Replay this round" />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const sThemes = createThemedStyles((c) => ({
  summaryStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.line,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  summaryCell: { flex: 1, alignItems: "center", gap: 2 },
  summaryDivider: { width: 1, height: 26, backgroundColor: c.line },
  chapterCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
  },
  chapterCardActive: {
    borderColor: c.tennis,
  },
  place: {
    width: 46,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  deltaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  expandedWrap: {
    gap: 10,
  },
  tabular: { fontVariant: ["tabular-nums"] },
}));
