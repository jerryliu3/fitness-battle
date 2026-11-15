import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import {
  LAUREL_WREATH_PATHS, WEEK_RECAP_COLORS, formatEffort, formatPeriodDateRange, sportById,
  weekRecapBreakdown, weekRecapCopy, weekRecapPages, weekRecapPodium, weekRecapTraining,
  type CompeteState, type CompetitionReplay, type PeriodResult,
} from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { AppIcon } from "../ui/app-icon";
import { FocusButton, FocusSheet } from "../ui/focus";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { AnimatedEmber } from "../ui/mascot/animated-ember";
import { StandardLineChart } from "../ui/standard-line-chart";
import type { ChartDatum } from "../ui/chart-scrubber";
import { UserAvatar } from "../ui/user-avatar";
import { playCue, playPattern } from "../lib/haptics";
import { CompetitionReplayButton } from "./competition-replay";
import { ResultCard } from "./result-card";
import { WeeklySocialActions } from "./weekly-social";
import { WeekRecapBackground } from "./week-recap-background";
import { WeekRecapFit } from "./week-recap-fit";
import { useThemeColors } from "../theme";

const MUTED_LIGHT = "rgba(249, 247, 236, 0.72)";
const GLASS_BG = "rgba(255, 255, 255, 0.08)";
const GLASS_BORDER = "rgba(255, 255, 255, 0.15)";
const SUCCESS_LIGHT = "#8ccdab";
const STAT_COLOR = { muted: MUTED_LIGHT, gold: WEEK_RECAP_COLORS.progress, success: SUCCESS_LIGHT } as const;
const PODIUM_STEP = {
  1: { height: 60, avatar: 54, pedestal: { backgroundColor: "rgba(247, 201, 72, 0.24)", borderColor: "rgba(247, 201, 72, 0.52)" }, badge: "#f7c948", ink: "#142b3b" },
  2: { height: 44, avatar: 44, pedestal: { backgroundColor: "rgba(255, 255, 255, 0.13)", borderColor: "rgba(255, 255, 255, 0.26)" }, badge: "rgba(255, 255, 255, 0.24)", ink: WEEK_RECAP_COLORS.text },
  3: { height: 34, avatar: 44, pedestal: { backgroundColor: "rgba(184, 121, 69, 0.22)", borderColor: "rgba(184, 121, 69, 0.44)" }, badge: "rgba(184, 121, 69, 0.55)", ink: WEEK_RECAP_COLORS.text },
} as const;

export function WeekRecap({ state, results, social, onClose, loadReplay, hiddenIds = [] }: {
  state: CompeteState; results: PeriodResult[]; social: boolean; onClose: () => void;
  loadReplay?: (result: PeriodResult) => Promise<CompetitionReplay | null>; hiddenIds?: readonly string[];
}) {
  const pages = weekRecapPages(results);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState(false);
  const [replays, setReplays] = useState<Record<string, CompetitionReplay | null>>({});
  const { current, page, last, title, description, label } = weekRecapCopy(pages, index);
  const celebrated = useRef(false);
  const reduced = useReducedMotion();
  const router = useRouter();

  const currentResult = page.kind === "arrival" ? null : page.result;
  useEffect(() => {
    if (!loadReplay || !currentResult || currentResult.id in replays) return;
    let cancelled = false;
    void loadReplay(currentResult)
      .then((data) => { if (!cancelled) setReplays((prev) => ({ ...prev, [currentResult.id]: data })); })
      .catch(() => { if (!cancelled) setReplays((prev) => ({ ...prev, [currentResult.id]: null })); });
    return () => { cancelled = true; };
  }, [loadReplay, currentResult?.id]);

  const advance = () => {
    if (page.kind === "arrival" && !celebrated.current) {
      celebrated.current = true;
      if (results.some((row) => !state.periodResults.find((o) => o.id === row.id)?.acknowledgedAt && row.eloAfter > row.eloBefore)) {
        playPattern("earned");
      }
    }
    if (last) onClose();
    else setIndex(current + 1);
  };

  return (
    <Modal visible presentationStyle="fullScreen" animationType={reduced ? "none" : "fade"} onRequestClose={() => { if (current > 0) setIndex(current - 1); }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <View style={s.canvas}>
          <StatusBar style="light" />
          <WeekRecapBackground />
          <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
            <View style={s.progress} accessible accessibilityRole="progressbar" accessibilityLabel="Week recap progress"
              accessibilityValue={{ min: 0, max: pages.length, now: current + 1, text: `Step ${current + 1} of ${pages.length}` }}>
              {pages.map((_, step) => <View key={step} style={[s.progressBar, step <= current && s.complete]} />)}
            </View>

            {page.kind !== "arrival" && (
              <View style={s.eyebrowRow}>
                <View style={s.rowGap8}>
                  {current > 0 && (
                    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => { void playCue("light"); setIndex(current - 1); }}
                      style={({ pressed }) => [s.backBtn, pressed && s.pressed]}>
                      <AppIcon name="back" size={16} color={WEEK_RECAP_COLORS.text} />
                    </Pressable>
                  )}
                  <AppIcon name={page.result.sport} size={18} color={WEEK_RECAP_COLORS.text} />
                  <AppText role="label" style={s.light}>{sportById(page.result.sport).name}</AppText>
                  <View style={s.trackBadge}><AppText role="caption" style={s.trackText}>{page.result.track === "verified" ? "GPS" : "Open"}</AppText></View>
                </View>
                <AppText role="caption" style={s.mutedLight}>{formatPeriodDateRange(page.result.periodStart, page.result.periodEnd)}</AppText>
              </View>
            )}

            <View style={s.heading}>
              <AppText role="display" accessibilityRole="header" style={s.light}>{title}</AppText>
              <AppText style={s.mutedLight}>{description}</AppText>
            </View>

            <WeekRecapFit key={current}>
              {page.kind === "arrival" ? (
                <View style={s.arrival}>
                  <AnimatedEmber size={180} />
                  <AppText style={s.light}>Your effort added up. Let’s see where it took you.</AppText>
                </View>
              ) : page.kind === "results" ? (
                <View style={s.resultsWrap}>
                  <PodiumHero replay={replays[page.result.id] ?? null} state={state} result={page.result} hiddenIds={hiddenIds} />
                  <ResultCard result={page.result} units={state.units} variant="recap" />
                </View>
              ) : <Training state={state} result={page.result} />}
            </WeekRecapFit>

            <View style={s.footer}>
              <FocusButton label={label} onPress={advance} />
              {page.kind === "results" && (
                <View style={s.linkRow}>
                  <CompetitionReplayButton state={state} selection={page.result} label="Replay this round" variant="link" />
                  {social && (
                    <Pressable accessibilityRole="button" accessibilityLabel="Field choices" onPress={() => { void playCue("light"); setChoices(true); }}
                      style={({ pressed }) => [s.textLink, pressed && s.pressed]}>
                      <AppText role="label" style={s.textLinkLabel}>Field choices</AppText>
                    </Pressable>
                  )}
                </View>
              )}
              {last && page.kind === "effort" && (
                <Pressable accessibilityRole="button" accessibilityLabel="Update sport settings" onPress={() => { onClose(); router.push("/athlete-settings?panel=preferences"); }}
                  style={({ pressed }) => [s.textLink, pressed && s.pressed]}>
                  <AppText role="label" style={s.textLinkLabel}>Update sport settings</AppText>
                </Pressable>
              )}
            </View>

            <FocusSheet open={choices && page.kind === "results"} title="Field choices" onClose={() => setChoices(false)}>
              <AppText>Choices appear when eligible athletes are available.</AppText>
              {page.kind !== "arrival" && <WeeklySocialActions result={page.result} units={state.units} />}
            </FocusSheet>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

function PodiumHero({ replay, state, result, hiddenIds }: {
  replay: CompetitionReplay | null; state: CompeteState; result: PeriodResult; hiddenIds: readonly string[];
}) {
  const slots = useMemo(() => weekRecapPodium(replay, state, result, hiddenIds), [replay, state, result, hiddenIds]);
  return (
    <View style={s.podiumRow}>
      {slots.map(({ step, entry }) => {
        const meta = PODIUM_STEP[step];
        return (
          <View key={step} style={[s.podiumCol, slots.length === 1 && s.podiumSingleCol]}>
            <View style={s.podiumAthlete}>
              <View style={[s.avatarFrame, step === 1 && s.firstFrame]}>
                {step === 1 && (
                  <Svg width={76} height={64} viewBox="0 0 84 70" style={s.laurel} accessible={false}>
                    {LAUREL_WREATH_PATHS.map((d) => <Path key={d} d={d} fill="none" stroke="#f7c948" strokeWidth="2.4" strokeLinecap="round" />)}
                  </Svg>
                )}
                {entry ? (
                  <View style={[s.avatarRing, step === 1 ? s.ringFirst : entry.you && s.ringYou]}>
                    <UserAvatar src={entry.avatarUrl} name={entry.name} size={meta.avatar} />
                  </View>
                ) : (
                  <View style={[s.emptyAvatar, { width: meta.avatar, height: meta.avatar, borderRadius: meta.avatar / 2 }]}>
                    <AppText role="caption" style={s.mutedLight}>—</AppText>
                  </View>
                )}
              </View>
              <AppText role="label" numberOfLines={1} style={[s.light, s.center, entry?.you && { color: WEEK_RECAP_COLORS.progress }]}>
                {entry?.name ?? "—"}
              </AppText>
              {entry && <AppText role="caption" style={[s.mutedLight, s.tabular]} numberOfLines={1}>{entry.metricLabel}</AppText>}
            </View>
            <View style={[s.pedestal, meta.pedestal, { height: meta.height }]}>
              <View style={[s.pedestalBadge, { backgroundColor: meta.badge }]}>
                <AppText role="caption" style={[s.tabular, { fontWeight: "800", color: meta.ink }]}>{step}</AppText>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Training({ state, result }: { state: CompeteState; result: PeriodResult }) {
  const colors = useThemeColors();
  const series = weekRecapTraining(state, result);
  const { negative, scoreLine, stats, nextRound } = weekRecapBreakdown(state, result);
  const [chartMode, setChartMode] = useState<"time" | "effort">("time");
  const [scrubbed, setScrubbed] = useState<ChartDatum | undefined>(undefined);
  const activeMode = chartMode === "effort" && series.hasEffort ? "effort" : "time";

  return (
    <View style={s.trainingWrap}>
      <View style={[s.scoreBanner, negative && s.scoreBannerNeg]}>
        <View style={s.scoreLeft}>
          <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
            <Circle cx="12" cy="12" r="10" fill={negative ? "#f09c98" : "#4ea77c"} />
            <Path d="M8.5 12.2l2.3 2.3 4.8-5" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <AppText role="label" style={[s.light, s.tabular]}>{scoreLine}</AppText>
        </View>
        {!negative && !result.frozen && (
          <Svg width={18} height={18} viewBox="0 0 24 24" accessible={false}>
            <Path d="M6 12h6M8 7l5 2M8 17l5-2" fill="none" stroke={SUCCESS_LIGHT} strokeWidth="2" strokeLinecap="round" />
          </Svg>
        )}
      </View>

      <View style={[s.glassCard, s.statStrip]}>
        {stats.map((item, idx) => (
          <View key={item.label} style={s.statGroup}>
            {idx > 0 && <View style={s.statDivider} />}
            <View style={s.statCell}>
              <AppIcon name={item.icon} size={16} color={STAT_COLOR[item.tone]} />
              <AppText role="value" style={[s.light, s.tabular]} numberOfLines={1}>{item.value}</AppText>
              <AppText role="caption" style={s.mutedLight}>{item.label}</AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={[s.chartCard, { backgroundColor: colors.card, borderColor: colors.line }]}>
        <View style={s.chartHeader}>
          <View style={s.chartTitleRow}>
            <AppIcon name="scoring" size={16} color={colors.ink} />
            <AppText role="label" numberOfLines={1}>
              {scrubbed ? `${scrubbed.label} · ${scrubbed.value}` : activeMode === "time" ? "Training time" : "Effort"}
            </AppText>
          </View>
          {series.available && series.hasEffort && (
            <View style={[s.modeToggle, { backgroundColor: colors.paper, borderColor: colors.line }]} accessibilityRole="tablist">
              {(["time", "effort"] as const).map((mode) => {
                const selected = activeMode === mode;
                return (
                  <Pressable key={mode} accessibilityRole="tab" accessibilityState={{ selected }}
                    onPress={() => { if (activeMode !== mode) { void playCue("selection"); setScrubbed(undefined); setChartMode(mode); } }}
                    style={[s.modePill, selected && { backgroundColor: colors.actionSoft }]}>
                    <AppText role="caption" style={{ color: selected ? colors.ink : colors.muted, fontWeight: selected ? "700" : "500" }}>
                      {mode === "time" ? "Time" : "Effort"}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
        {series.available ? (
          <StandardLineChart height={150} showAxes showArea showTrend={false} onSelectionChange={setScrubbed}
            values={activeMode === "time" ? series.values : series.effortValues} pointLabels={series.labels}
            xLabels={[series.labels[0]!, series.labels[Math.floor((series.labels.length - 1) / 2)]!, series.labels.at(-1)!]}
            formatAxisY={(v) => (activeMode === "time" ? `${Math.round(v)}` : `${Number(v.toFixed(1))}`)}
            formatY={(v) => (activeMode === "time" ? `${Math.round(v)} min` : `${formatEffort(v)} pts`)}
            accessibilityLabel={activeMode === "time" ? "Cumulative training minutes in the settled week" : "Cumulative effort points in the settled week"} />
        ) : <AppText role="support" secondary>Detailed activity history is unavailable for this archived week.</AppText>}
      </View>

      <View style={[s.glassCard, s.nextCard]}>
        <View style={s.nextHeader}>
          <View style={s.rowGap6}>
            <AppIcon name="calendar" size={16} color={WEEK_RECAP_COLORS.text} />
            <AppText role="label" style={s.light}>Next round</AppText>
          </View>
          <View style={[s.nextPill, nextRound.active ? s.nextPillActive : s.nextPillInactive]}>
            <AppText role="caption" style={{ color: nextRound.active ? SUCCESS_LIGHT : MUTED_LIGHT, fontWeight: "700" }}>{nextRound.pill}</AppText>
          </View>
        </View>
        <AppText role="row" style={s.light}>{nextRound.detail}</AppText>
        <AppText role="caption" style={s.mutedLight}>{nextRound.subtext}</AppText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: WEEK_RECAP_COLORS.background },
  safe: { flex: 1, paddingHorizontal: 20, paddingVertical: 14, gap: 10 },
  light: { color: WEEK_RECAP_COLORS.text },
  mutedLight: { color: MUTED_LIGHT },
  center: { textAlign: "center" },
  tabular: { fontVariant: ["tabular-nums"] },
  pressed: { opacity: 0.7 },
  rowGap8: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowGap6: { flexDirection: "row", alignItems: "center", gap: 6 },
  progress: { flexDirection: "row", gap: 6, marginBottom: 2 },
  progressBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: WEEK_RECAP_COLORS.text, opacity: 0.24 },
  complete: { backgroundColor: WEEK_RECAP_COLORS.progress, opacity: 1 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_BORDER, alignItems: "center", justifyContent: "center" },
  trackBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_BORDER },
  trackText: { color: MUTED_LIGHT, fontSize: 11 },
  heading: { gap: 4 },
  arrival: { alignItems: "center", gap: 24, paddingTop: 16 },
  resultsWrap: { gap: 16 },
  podiumRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 10, paddingTop: 4 },
  podiumCol: { flex: 1, alignItems: "center", gap: 8 },
  podiumSingleCol: { maxWidth: 160 },
  podiumAthlete: { alignItems: "center", gap: 2, width: "100%" },
  avatarFrame: { alignItems: "center", justifyContent: "center", position: "relative" },
  firstFrame: { width: 76, height: 64 },
  laurel: { position: "absolute", top: 0 },
  avatarRing: { borderRadius: 999, padding: 2, borderWidth: 2, borderColor: "rgba(255,255,255,0.45)" },
  ringFirst: { borderColor: "#f7c948" },
  ringYou: { borderColor: WEEK_RECAP_COLORS.progress },
  emptyAvatar: { backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_BORDER, alignItems: "center", justifyContent: "center" },
  pedestal: { width: "100%", borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pedestalBadge: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  trainingWrap: { gap: 12 },
  glassCard: { backgroundColor: GLASS_BG, borderRadius: 18, borderWidth: 1, borderColor: GLASS_BORDER },
  scoreBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: "rgba(140, 205, 171, 0.15)", borderWidth: 1, borderColor: "rgba(140, 205, 171, 0.28)" },
  scoreBannerNeg: { backgroundColor: "rgba(240, 156, 152, 0.14)", borderColor: "rgba(240, 156, 152, 0.28)" },
  scoreLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  statStrip: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8 },
  statGroup: { flex: 1, flexDirection: "row", alignItems: "center" },
  statCell: { flex: 1, alignItems: "center", gap: 3 },
  statDivider: { width: 1, height: 34, backgroundColor: GLASS_BORDER },
  chartCard: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 8 },
  chartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  chartTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  modeToggle: { flexDirection: "row", borderRadius: 999, borderWidth: 1, padding: 2, gap: 2 },
  modePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  nextCard: { padding: 14, gap: 4 },
  nextHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 2 },
  nextPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  nextPillActive: { backgroundColor: "rgba(140, 205, 171, 0.18)" },
  nextPillInactive: { backgroundColor: "rgba(255, 255, 255, 0.12)" },
  footer: { gap: 4 },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  textLink: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  textLinkLabel: { color: WEEK_RECAP_COLORS.text, opacity: 0.9 },
});
