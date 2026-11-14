import { useRef, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { APP_TIMEZONE, WEEK_RECAP_COLORS, roundEnrollment, sportById, weekRecapPages, weekRecapTraining, type CompeteState, type PeriodResult } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { FocusButton, FocusSheet } from "../ui/focus";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { AnimatedEmber } from "../ui/mascot/animated-ember";
import { StandardLineChart } from "../ui/standard-line-chart";
import { playPattern } from "../lib/haptics";
import { CompetitionReplayButton } from "./competition-replay";
import { ResultCard } from "./result-card";
import { WeeklySocialActions } from "./weekly-social";
import { WeekRecapBackground } from "./week-recap-background";
import { WeekRecapFit } from "./week-recap-fit";
import { useThemeColors } from "../theme";

export function WeekRecap({ state, results, social, onClose }: {
  state: CompeteState; results: PeriodResult[]; social: boolean; onClose: () => void;
}) {
  const pages = weekRecapPages(results);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState(false);
  const current = Math.min(index, pages.length - 1);
  const page = pages[current]!;
  const next = pages[current + 1];
  const last = current === pages.length - 1;
  const celebrated = useRef(false);
  const reduced = useReducedMotion();
  const router = useRouter();
  const title = page.kind === "arrival" ? "Small days. Quite a week." : sportById(page.result.sport).name;
  const description = page.kind === "arrival" ? "Your effort, your progress." : page.kind === "results" ? "Your week, settled." : "Your week in motion.";
  const label = last ? "Done" : page.kind === "arrival" ? "Reveal my finish →" : page.kind === "results" ? "See what added up →" : `${next && next.kind !== "arrival" ? sportById(next.result.sport).name : "Next sport"} results →`;
  const advance = () => {
    if (page.kind === "arrival" && !celebrated.current) {
      celebrated.current = true;
      if (results.some(row => !state.periodResults.find(original => original.id === row.id)?.acknowledgedAt && row.eloAfter > row.eloBefore)) playPattern("earned");
    }
    if (last) onClose(); else setIndex(current + 1);
  };
  return <Modal visible presentationStyle="fullScreen" animationType={reduced ? "none" : "fade"} onRequestClose={() => { if (current > 0) setIndex(current - 1); }}>
    <SafeAreaProvider initialMetrics={initialWindowMetrics}><View style={s.canvas}><StatusBar style="light" /><WeekRecapBackground />
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <View style={s.progress} accessible accessibilityRole="progressbar" accessibilityLabel="Week recap progress" accessibilityValue={{ min: 0, max: pages.length, now: current + 1, text: `Step ${current + 1} of ${pages.length}` }}>
          {pages.map((_, step) => <View key={step} style={[s.progressBar, step <= current && s.complete]} />)}
        </View>
        <View style={s.heading}><AppText role="display" accessibilityRole="header" style={s.light}>{title}</AppText><AppText style={s.light}>{description}</AppText></View>
        <WeekRecapFit key={current}>
          {page.kind === "arrival" ? <View style={s.arrival}><AnimatedEmber size={180} /><AppText style={s.light}>Your effort added up. Let’s see where it took you.</AppText></View>
            : page.kind === "results" ? <ResultCard result={page.result} units={state.units} compact />
            : <Training state={state} result={page.result} />}
        </WeekRecapFit>
        <View style={s.footer}>
          {page.kind === "results" && <View style={s.actions}><View style={{ flex: 1 }}><CompetitionReplayButton state={state} selection={page.result} label="Replay this round" /></View>{social && <View style={{ flex: 1 }}><FocusButton secondary label="Field choices" onPress={() => setChoices(true)} /></View>}</View>}
          {last && page.kind === "effort" && <FocusButton secondary label="Update sport settings" onPress={() => { onClose(); router.push("/athlete-settings?panel=preferences"); }} />}
          <View style={s.actions}>{current > 0 && <FocusButton secondary label="Back" onPress={() => setIndex(current - 1)} />}<View style={{ flex: 1 }}><FocusButton label={label} onPress={advance} /></View></View>
        </View>
        <FocusSheet open={choices && page.kind === "results"} title="Field choices" onClose={() => setChoices(false)}>
          <AppText>Choices appear when eligible athletes are available.</AppText>
          {page.kind !== "arrival" && <WeeklySocialActions result={page.result} units={state.units} />}
        </FocusSheet>
      </SafeAreaView>
    </View></SafeAreaProvider>
  </Modal>;
}

function Training({ state, result }: { state: CompeteState; result: PeriodResult }) {
  const colors = useThemeColors();
  const series = weekRecapTraining(state, result);
  const enrollment = roundEnrollment(state, result);
  return <View style={{ gap: 16 }}>
    <AppText style={s.light}>{Math.round(result.movingSec / 60)} minutes · {result.effort.toFixed(1)} effort</AppText>
    <AppText style={s.light}>Score {Math.round(result.eloBefore)} → {Math.round(result.eloAfter)} ({result.eloAfter >= result.eloBefore ? "+" : ""}{Math.round(result.eloAfter - result.eloBefore)})</AppText>
    {series.available ? <View style={[s.readingSurface, { backgroundColor: colors.card }]}><StandardLineChart height={170} showAxes showSummary values={series.values} pointLabels={series.labels}
      xLabels={[series.labels[0]!, series.labels[Math.floor((series.labels.length - 1) / 2)]!, series.labels.at(-1)!]} formatAxisY={v => `${Math.round(v)}`} formatY={v => `${Math.round(v)} min`} accessibilityLabel="Cumulative training minutes in the settled week" /></View>
      : <AppText style={s.light}>Detailed activity history is unavailable for this archived week.</AppText>}
    <AppText style={s.light}>{enrollment.startsAt
      ? `Your current round ${enrollment.status === "upcoming" ? "starts" : "started"} ${enrollment.startsAt.toLocaleString("en-US", { timeZone: APP_TIMEZONE, timeZoneName: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. ${enrollment.renews ? "Renews after this round." : "Stops after this round."}`
      : "You’re not registered for another round. Update sport settings to join again."}</AppText>
  </View>;
}

const s = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: WEEK_RECAP_COLORS.background },
  safe: { flex: 1, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 16, gap: 12 },
  light: { color: WEEK_RECAP_COLORS.text },
  heading: { gap: 6 },
  arrival: { alignItems: "center", gap: 24, paddingTop: 16 },
  progress: { flexDirection: "row", gap: 6, marginBottom: 4 },
  progressBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: WEEK_RECAP_COLORS.text, opacity: .24 },
  complete: { backgroundColor: WEEK_RECAP_COLORS.progress, opacity: 1 },
  readingSurface: { borderRadius: 20, padding: 16 },
  actions: { flexDirection: "row", gap: 10, alignItems: "center" },
  footer: { gap: 10 },
});
