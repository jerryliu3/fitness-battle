import { APP_TIMEZONE, competeNow, pendingPeriodResults, sportById, type Action, type CompeteState, type PeriodResult } from "@fitness-battle/shared";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Modal, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FocusButton, f } from "../ui/focus";
function NumberReveal({ value, from = 0 }: { value: number; from?: number }) {
  const [display, setDisplay] = useState(from);
  useEffect(() => {
    let cancelled = false;
    const progress = new Animated.Value(from);
    const subscription = progress.addListener(({ value }) => setDisplay(Math.round(value)));
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) setDisplay(value);
      else Animated.timing(progress, { toValue: value, duration: 900, useNativeDriver: false }).start();
    }).catch(() => { if (!cancelled) setDisplay(value); });
    return () => { cancelled = true; progress.stopAnimation(); progress.removeListener(subscription); };
  }, [value, from]);
  return <Text accessibilityLabel={String(value)}>{display}</Text>;
}
function Round({ state, rows, onClose }: { state: CompeteState; rows: PeriodResult[]; onClose: () => void }) {
  const [next, setNext] = useState(false);
  const router = useRouter();
  const started = new Date(rows[0]!.periodEnd);
  return <Modal visible presentationStyle="fullScreen" animationType="none" onRequestClose={onClose}>
    <SafeAreaView style={f.safe}><ScrollView contentContainerStyle={f.content}>
      <FocusButton label="Close results" secondary onPress={onClose}/>
      <Text style={f.kicker}>Round complete · {next ? "2 / 2" : "1 / 2"}</Text>
      <Text style={f.title}>{next ? "A fresh field awaits." : "Your week, settled."}</Text>
      {!next ? <>
        {rows.map((result) => <Text key={result.id} style={f.copy}>
          {sportById(result.sport).name}{"\n"}Place <NumberReveal value={result.place}/> / {result.fieldSize}{"\n"}
          Effort {result.effort.toFixed(1)}{"\n"}Effort score <Text style={{ color: "#a67c00" }}><NumberReveal from={result.eloBefore} value={result.eloAfter}/></Text>
        </Text>)}
        <FocusButton label="Next round →" onPress={() => setNext(true)}/>
      </> : <>
        <Text style={f.copy}>The next round {started <= competeNow(state) ? "started" : "starts"} {started.toLocaleString("en-US", { timeZone: APP_TIMEZONE, timeZoneName: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.</Text>
        <FocusButton label="Update sport settings" secondary onPress={() => { onClose(); router.push("/settings"); }}/>
        <FocusButton label="Back to Compete" onPress={onClose}/>
      </>}
    </ScrollView></SafeAreaView>
  </Modal>;
}
export function RoundTakeover({ state, dispatch }: { state: CompeteState; dispatch: (action: Action) => void }) {
  const path = usePathname();
  const pending = pendingPeriodResults(state.periodResults);
  if (path !== "/arena" || !pending.length) return null;
  const periodStart = pending[0]!.periodStart;
  const round = pending.filter((result) => result.periodStart === periodStart);
  const rows = round.filter((result) => result.track === "open" || !round.some((other) => other.sport === result.sport && other.track === "open"));
  return <Round key={periodStart} state={state} rows={rows} onClose={() => dispatch({ type: "acknowledge-reveal", revealIds: round.map((result) => result.id) })}/>;
}
