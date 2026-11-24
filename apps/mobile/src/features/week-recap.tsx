import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Svg, { Defs, LinearGradient, Path, Polygon, Rect, Stop } from "react-native-svg";
import {
  WEEK_RECAP_COLORS, formatTrainingXp, formatAccountPeriodDateRange, sportById,
  weekRecapBreakdown, weekRecapCopy, weekRecapHeartRateRanges, weekRecapHighlights,
  weekRecapPages, weekRecapPodium, weekRecapTraining,
  type Action, type CompeteState, type CompetitionReplay, type PeriodResult, type SportId, type WeekRecapTarget,
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
import { AthletePreferencesFields } from "./athlete-preferences";
import { CompetitionReplayButton } from "./competition-replay";
import { NotificationOptInStrip } from "./notification-opt-in";
import { ResultCard } from "./result-card";
import { WeeklySocialActions } from "./weekly-social";
import { WeekRecapBackground } from "./week-recap-background";
import { WeekRecapFit } from "./week-recap-fit";

const MUTED_LIGHT = "rgba(249, 247, 236, 0.72)";
const GLASS_BG = "rgba(255, 255, 255, 0.08)";
const GLASS_BORDER = "rgba(255, 255, 255, 0.15)";
const SUCCESS_LIGHT = "#8ccdab";
const HIGH_HR = "#f08575";
const COOL_HR = "#7cc6e8";
const STAT_COLOR = { muted: MUTED_LIGHT, gold: WEEK_RECAP_COLORS.progress, success: SUCCESS_LIGHT } as const;
const HR_BAR_COLOR = { high: HIGH_HR, warm: WEEK_RECAP_COLORS.progress, good: SUCCESS_LIGHT, cool: COOL_HR } as const;
const PODIUM_STEP = {
  1: {
    height: 92, avatar: 54, topPoints: "8,0 112,0 120,14 0,14", lipY: 14,
    topA: "#fae082", topB: "#cb9128", lip: "#fff3ba",
    faceA: "#d3a134", faceAOpacity: 0.62, faceB: "#7a5416", faceBOpacity: 0.24,
    badgeBg: "#f5c642", badgeBorder: "#ffe896", ink: "#142b3b",
  },
  2: {
    height: 68, avatar: 44, topPoints: "11,0 119,0 120,12 0,12", lipY: 12,
    topA: "#95a7b2", topB: "#556670", lip: "#d4e2ea",
    faceA: "#6e818c", faceAOpacity: 0.52, faceB: "#33444e", faceBOpacity: 0.2,
    badgeBg: "#495b66", badgeBorder: "#9bb0bc", ink: WEEK_RECAP_COLORS.text,
  },
  3: {
    height: 54, avatar: 44, topPoints: "1,0 109,0 120,12 0,12", lipY: 12,
    topA: "#be804c", topB: "#73421c", lip: "#eac09a",
    faceA: "#965828", faceAOpacity: 0.52, faceB: "#532e12", faceBOpacity: 0.18,
    badgeBg: "#79451f", badgeBorder: "#cc8f5d", ink: WEEK_RECAP_COLORS.text,
  },
} as const;

export function WeekRecap({ state, results, nonRaceWeek, social, debug = false, dispatch, onClose, loadReplay, hiddenIds = [] }: {
  state: CompeteState; results: PeriodResult[];
  nonRaceWeek?: { sport: SportId; periodStart: string; periodEnd: string } | null;
  social: boolean;
  debug?: boolean;
  dispatch?: (action: Action) => void;
  onClose: () => void;
  loadReplay?: (result: PeriodResult) => Promise<CompetitionReplay | null>; hiddenIds?: readonly string[];
}) {
  const pages = weekRecapPages(results, nonRaceWeek);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [replays, setReplays] = useState<Record<string, CompetitionReplay | null>>({});
  const { current, page, last, title, label } = weekRecapCopy(pages, index);
  const celebrated = useRef(false);
  const reduced = useReducedMotion();
  const router = useRouter();

  const currentResult = page.kind === "results" || page.kind === "effort" ? page.result : undefined;
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
                  <AppIcon name={page.kind === "results" ? page.result.sport : page.sport} size={18} color={WEEK_RECAP_COLORS.text} />
                  <AppText role="label" style={s.light}>{sportById(page.kind === "results" ? page.result.sport : page.sport).name}</AppText>
                  {page.kind === "results" && (
                    <View style={s.trackBadge}><AppText role="caption" style={s.mutedLight}>{page.result.track === "verified" ? "GPS" : "Open"}</AppText></View>
                  )}
                </View>
                <AppText role="caption" style={s.mutedLight}>
                  {formatAccountPeriodDateRange(state, page.kind === "results" ? page.result.periodStart : page.periodStart, page.kind === "results" ? page.result.periodEnd : page.periodEnd)}
                </AppText>
              </View>
            )}

            <View style={s.heading}>
              <AppText role="display" accessibilityRole="header" style={s.light}>{title}</AppText>
            </View>

            <WeekRecapFit key={current}>
              {page.kind === "arrival" ? (
                <View style={s.arrival}>
                  <AnimatedEmber size={180} />
                  <AppText style={s.light}>Your effort added up. Let’s see where it took you.</AppText>
                </View>
              ) : page.kind === "results" ? (
                <ResultsView state={state} result={page.result} replay={replays[page.result.id] ?? null} hiddenIds={hiddenIds} reduced={reduced} debug={debug} />
              ) : <Training state={state} target={{ sport: page.sport, periodStart: page.periodStart, periodEnd: page.periodEnd, result: page.result }} reduced={reduced} debug={debug} hiddenIds={hiddenIds} replay={page.result ? replays[page.result.id] ?? null : null} />}
            </WeekRecapFit>

            <View style={s.footer}>
              {page.kind === "arrival" ? (
                <FocusButton label={label} onPress={advance} />
              ) : page.kind === "results" ? (
                <>
                  <View style={s.footerRow}>
                    <View style={s.footerCol}>
                      <CompetitionReplayButton state={state} selection={page.result} label="Replay round" variant="recap" />
                    </View>
                    <View style={s.footerCol}>
                      <FocusButton label={label} onPress={advance} />
                    </View>
                  </View>
                  {social && (
                    <View style={s.linkRow}>
                      <Pressable accessibilityRole="button" accessibilityLabel="Field choices" onPress={() => { void playCue("light"); setChoices(true); }}
                        style={({ pressed }) => [s.textLink, pressed && s.pressed]}>
                        <AppText role="label" style={s.textLinkLabel}>Field choices</AppText>
                      </Pressable>
                    </View>
                  )}
                </>
              ) : (
                <View style={s.footerRow}>
                  <View style={s.footerCol}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Update settings"
                      onPress={() => { void playCue("light"); if (dispatch) setPreferencesOpen(true); else router.push("/athlete-settings?panel=preferences"); }}
                      style={({ pressed }) => [s.secondaryBtn, pressed && s.pressed]}>
                      <AppText role="label" style={s.light} numberOfLines={1}>Update settings</AppText>
                    </Pressable>
                  </View>
                  <View style={s.footerCol}>
                    <FocusButton label={label} onPress={advance} />
                  </View>
                </View>
              )}
            </View>

            <FocusSheet modal={false} open={choices && page.kind === "results"} title="Field choices" onClose={() => setChoices(false)}>
              <AppText>Choices appear when eligible athletes are available.</AppText>
              {page.kind === "results" && <WeeklySocialActions result={page.result} units={state.units} />}
            </FocusSheet>
            {dispatch && (
              <FocusSheet modal={false} open={preferencesOpen} title="Preferences" onClose={() => setPreferencesOpen(false)}>
                {preferencesOpen ? <View style={{ gap: 18 }}><AthletePreferencesFields state={state} dispatch={dispatch} /></View> : null}
              </FocusSheet>
            )}
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

function ResultsView({ state, result, replay, hiddenIds, reduced, debug }: {
  state: CompeteState; result: PeriodResult; replay: CompetitionReplay | null; hiddenIds: readonly string[]; reduced: boolean; debug: boolean;
}) {
  const highlights = useMemo(() => weekRecapHighlights(replay, state, result, hiddenIds), [replay, state, result, hiddenIds]);
  const onPodium = useMemo(
    () => weekRecapPodium(replay, state, result, hiddenIds).some((slot) => slot.entry?.you),
    [replay, state, result, hiddenIds],
  );
  return (
    <View style={s.resultsWrap}>
      <PodiumHero replay={replay} state={state} result={result} hiddenIds={hiddenIds} reduced={reduced} />
      <View style={s.highlightsList}>
        {highlights.map((item) => (
          <View key={item.title} style={[s.glassCard, s.highlightRow]}>
            <View style={[s.highlightIcon, { backgroundColor: `${STAT_COLOR[item.tone]}22` }]}>
              <AppIcon name={item.icon} size={18} color={STAT_COLOR[item.tone]} />
            </View>
            <View style={s.highlightText}>
              <AppText role="label" style={s.light} numberOfLines={1}>{item.title}</AppText>
              <AppText role="caption" style={s.mutedLight} numberOfLines={2}>{item.detail}</AppText>
            </View>
          </View>
        ))}
        {onPodium && (
          <NotificationOptInStrip surface="week_recap" variant="recap" debug={debug} />
        )}
      </View>
      {result.effortChange && <AppText>Training {result.effortChange.training} · History {result.effortChange.history} · Competition {result.effortChange.competition}</AppText>}
      <ResultCard result={result} units={state.units} variant="recap" replay={replay} hiddenIds={hiddenIds} account={state} />
    </View>
  );
}

function PodiumHero({ replay, state, result, hiddenIds, reduced }: {
  replay: CompetitionReplay | null; state: CompeteState; result: PeriodResult; hiddenIds: readonly string[]; reduced: boolean;
}) {
  const slots = useMemo(() => weekRecapPodium(replay, state, result, hiddenIds), [replay, state, result, hiddenIds]);
  const anims = useRef<Record<1 | 2 | 3, Animated.Value>>({
    1: new Animated.Value(reduced ? 1 : 0),
    2: new Animated.Value(reduced ? 1 : 0),
    3: new Animated.Value(reduced ? 1 : 0),
  }).current;

  useEffect(() => {
    if (reduced) {
      anims[1].setValue(1);
      anims[2].setValue(1);
      anims[3].setValue(1);
      return;
    }
    anims[1].setValue(0);
    anims[2].setValue(0);
    anims[3].setValue(0);
    const sequence = Animated.stagger(180, [
      Animated.timing(anims[3], { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(anims[2], { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(anims[1], { toValue: 1, duration: 360, useNativeDriver: true }),
    ]);
    sequence.start();
    return () => sequence.stop();
  }, [result.id, reduced, anims]);

  return (
    <View style={s.podiumRow}>
      {slots.map(({ step, entry }) => {
        const meta = PODIUM_STEP[step];
        const progress = anims[step];
        const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
        return (
          <Animated.View key={step} style={[s.podiumCol, step === 1 && s.podiumColFirst, { opacity: progress, transform: [{ translateY }] }]}>
            <View style={s.podiumAthlete}>
              <View style={s.avatarFrame}>
                {entry ? (
                  <UserAvatar src={entry.avatarUrl} name={entry.name} size={meta.avatar} />
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
            <View style={[s.pedestal, { height: meta.height, paddingTop: meta.lipY + 10 }]}>
              <Svg width="100%" height="100%" viewBox="0 0 120 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill} accessible={false}>
                <Defs>
                  <LinearGradient id={`pod-top-${step}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={meta.topA} stopOpacity="0.95" />
                    <Stop offset="1" stopColor={meta.topB} stopOpacity="0.88" />
                  </LinearGradient>
                  <LinearGradient id={`pod-face-${step}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={meta.faceA} stopOpacity={meta.faceAOpacity} />
                    <Stop offset="0.55" stopColor={meta.faceB} stopOpacity={meta.faceBOpacity} />
                    <Stop offset="1" stopColor={WEEK_RECAP_COLORS.background} stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Polygon points={meta.topPoints} fill={`url(#pod-top-${step})`} />
                <Rect x={0} y={meta.lipY} width={120} height={100 - meta.lipY} fill={`url(#pod-face-${step})`} />
                <Path d={`M0 ${meta.lipY} H120`} stroke={meta.lip} strokeWidth="1.6" strokeOpacity="0.6" fill="none" />
                <Path d={`M1 ${meta.lipY} V100 M119 ${meta.lipY} V100`} stroke={meta.lip} strokeWidth="1" strokeOpacity="0.18" fill="none" />
              </Svg>
              <View style={[s.pedestalBadge, { backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder }]}>
                <AppText role="label" style={[s.tabular, { color: meta.ink }]}>{step}</AppText>
              </View>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

function Training({ state, target, reduced, debug, hiddenIds, replay }: { state: CompeteState; target: WeekRecapTarget; reduced: boolean; debug: boolean; hiddenIds: readonly string[]; replay: CompetitionReplay | null }) {
  const series = weekRecapTraining(state, target);
  const { stats, nextRound } = weekRecapBreakdown(state, target);
  const hr = weekRecapHeartRateRanges(state, target);
  const [chartMode, setChartMode] = useState<"time" | "xp">("time");
  const [scrubbed, setScrubbed] = useState<ChartDatum | undefined>(undefined);
  const activeMode = chartMode === "xp" && series.hasTrainingXp ? "xp" : "time";
  const draw = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      draw.setValue(1);
      return;
    }
    draw.setValue(0);
    const anim = Animated.timing(draw, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [reduced, activeMode, draw]);

  return (
    <View style={s.trainingWrap}>
      <View style={s.statCardsRow}>
        {stats.map((item) => (
          <View key={item.label} style={[s.glassCard, s.statCard]}>
            <AppIcon name={item.icon} size={16} color={STAT_COLOR[item.tone]} />
            <AppText role="value" style={[s.light, s.tabular, s.center]} numberOfLines={1}>{item.value}</AppText>
            <AppText role="caption" style={[s.mutedLight, s.center]} numberOfLines={1}>{item.label}</AppText>
          </View>
        ))}
      </View>

      <View style={[s.glassCard, s.chartCard]}>
        <View style={s.chartHeader}>
          <View style={s.chartTitleRow}>
            <AppIcon name="scoring" size={16} color={SUCCESS_LIGHT} />
            <AppText role="label" style={s.light} numberOfLines={1}>
              {scrubbed ? `${scrubbed.label} · ${scrubbed.value}` : activeMode === "time" ? "Training time" : "Training XP"}
            </AppText>
          </View>
          {series.available && series.hasTrainingXp && (
            <View style={s.modeToggle} accessibilityRole="tablist">
              {(["time", "xp"] as const).map((mode) => {
                const selected = activeMode === mode;
                return (
                  <Pressable key={mode} accessibilityRole="tab" accessibilityState={{ selected }}
                    onPress={() => { if (activeMode !== mode) { void playCue("selection"); setScrubbed(undefined); setChartMode(mode); } }}
                    style={[s.modePill, selected && s.modePillActive]}>
                    <AppText role={selected ? "label" : "caption"} style={{ color: selected ? "#142b3b" : MUTED_LIGHT }}>
                      {mode === "time" ? "Time" : "Training XP"}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
        {series.available ? (
          <StandardLineChart height={138} showAxes showArea showTrend={false} revealProgress={draw} followRevealDot onSelectionChange={setScrubbed}
            stroke={WEEK_RECAP_COLORS.progress} axisColor={GLASS_BORDER} labelColor={MUTED_LIGHT}
            values={activeMode === "time" ? series.values : series.trainingXpValues} pointLabels={series.labels}
            xLabels={[series.labels[0]!, series.labels[Math.floor((series.labels.length - 1) / 2)]!, series.labels.at(-1)!]}
            formatAxisY={(v) => (activeMode === "time" ? `${Math.round(v)}` : `${Number(v.toFixed(1))}`)}
            formatY={(v) => (activeMode === "time" ? `${Math.round(v)} min` : `${formatTrainingXp(v)} Training XP`)}
            accessibilityLabel={activeMode === "time" ? "Cumulative training minutes in the settled week" : "Cumulative Training XP in the settled week"} />
        ) : <AppText role="support" style={s.mutedLight}>Detailed activity history is unavailable for this archived week.</AppText>}
      </View>

      <View style={[s.glassCard, s.hrCard]}>
        <View style={s.nextHeader}>
          <View style={s.rowGap6}>
            <AppIcon name="heart" size={16} color={WEEK_RECAP_COLORS.progress} />
            <AppText role="label" style={s.light}>Heart-rate zones</AppText>
          </View>
        </View>
        {hr.ranges.length > 0 ? (
          <ScrollView style={s.hrScroll} contentContainerStyle={s.hrList} nestedScrollEnabled showsVerticalScrollIndicator>
            {hr.ranges.map((row) => (
              <View key={row.id} style={s.hrRow}>
                <AppText role="caption" style={[s.light, s.hrLabel]} numberOfLines={1}>{row.label}</AppText>
                <View style={s.hrTrack}>
                  <View style={[s.hrFill, { width: `${Math.max(8, row.pct)}%`, backgroundColor: HR_BAR_COLOR[row.tone] }]} />
                </View>
                <AppText role="caption" style={[s.mutedLight, s.tabular, s.hrPct]} numberOfLines={1}>
                  {row.pct}%
                </AppText>
              </View>
            ))}
          </ScrollView>
        ) : (
          <AppText role="caption" style={s.mutedLight}>No heart-rate samples recorded this week.</AppText>
        )}
      </View>

      <View style={[s.glassCard, s.nextCard]}>
        <View style={s.nextHeader}>
          <View style={s.rowGap6}>
            <AppIcon name="calendar" size={16} color={WEEK_RECAP_COLORS.text} />
            <AppText role="label" style={s.light}>Next round</AppText>
          </View>
          <View style={[s.nextPill, nextRound.active ? s.nextPillActive : s.nextPillInactive]}>
            <AppText role="caption" style={{ color: nextRound.active ? SUCCESS_LIGHT : MUTED_LIGHT }}>{nextRound.pill}</AppText>
          </View>
        </View>
        <AppText role="row" style={s.light}>{nextRound.detail}</AppText>
        {nextRound.active && !(target.result && weekRecapPodium(replay, state, target.result, hiddenIds).some((slot) => slot.entry?.you)) && (
          <NotificationOptInStrip surface="week_recap" variant="recap" compact debug={debug} />
        )}
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
  heading: { gap: 4 },
  arrival: { alignItems: "center", gap: 24, paddingTop: 16 },
  resultsWrap: { gap: 12 },
  podiumRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 0, paddingTop: 2 },
  podiumCol: { flex: 1, alignItems: "center", gap: 8 },
  podiumColFirst: { zIndex: 2 },
  podiumAthlete: { alignItems: "center", gap: 2, width: "100%", paddingHorizontal: 4 },
  avatarFrame: { alignItems: "center", justifyContent: "center" },
  emptyAvatar: { backgroundColor: "rgba(255, 255, 255, 0.08)", alignItems: "center", justifyContent: "center" },
  pedestal: { width: "100%", overflow: "hidden", alignItems: "center", justifyContent: "flex-start" },
  pedestalBadge: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.2, alignItems: "center", justifyContent: "center" },
  highlightsList: { gap: 8 },
  highlightRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  highlightIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  highlightText: { flex: 1, gap: 1 },
  trainingWrap: { gap: 10 },
  glassCard: { backgroundColor: GLASS_BG, borderRadius: 18, borderWidth: 1, borderColor: GLASS_BORDER },
  statCardsRow: { flexDirection: "row", gap: 8, flexShrink: 0 },
  statCard: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, alignItems: "center", gap: 3 },
  chartCard: { padding: 12, gap: 6, flexShrink: 0 },
  chartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  chartTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  modeToggle: { flexDirection: "row", borderRadius: 999, borderWidth: 1, borderColor: GLASS_BORDER, backgroundColor: "rgba(255,255,255,0.06)", padding: 2, gap: 2 },
  modePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  modePillActive: { backgroundColor: WEEK_RECAP_COLORS.progress },
  hrCard: { padding: 12, gap: 8, flexShrink: 0 },
  hrScroll: { maxHeight: 112 },
  hrList: { gap: 6 },
  hrRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hrLabel: { width: 88 },
  hrPct: { width: 40, textAlign: "right" },
  hrTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "rgba(255, 255, 255, 0.12)", overflow: "hidden" },
  hrFill: { height: 8, borderRadius: 4 },
  nextCard: { padding: 12, gap: 4, flexShrink: 0 },
  nextHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 2 },
  nextPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  nextPillActive: { backgroundColor: "rgba(140, 205, 171, 0.18)" },
  nextPillInactive: { backgroundColor: "rgba(255, 255, 255, 0.12)" },
  footer: { gap: 4 },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  footerCol: { flex: 1 },
  secondaryBtn: { minHeight: 48, borderRadius: 999, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255, 255, 255, 0.09)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.22)" },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  textLink: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  textLinkLabel: { color: WEEK_RECAP_COLORS.text, opacity: 0.9 },
});
