import { playPattern } from "../lib/haptics";
import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { OnboardingFade } from "./onboarding-visuals";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { StandardLineChart } from "../ui/standard-line-chart";
import { useCompeteStore } from "../lib/compete-store";
import { AnimatedEmber } from "../ui/mascot/animated-ember";
import { SectionStack, AppText } from "../ui/section";
import { MotionStep } from "../ui/motion-step";
import { useAuth } from "../lib/auth";
import {
  countsOnTrack, APP_TIMEZONE, dayKey,
  roundReveal,
  roundEnrollment,
  sportById,
  type Action,
  type CompeteState,
  type PeriodResult,
} from "@fitness-battle/shared";
import { usePathname, useRouter, useGlobalSearchParams } from "expo-router";
import { useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WeeklySocialActions } from "./weekly-social";
import { ReplayViewer } from "./competition-replay";

import { FocusButton, f } from "../ui/focus";
function Round({
  state,
  rows,
  onClose,
}: {
  state: CompeteState;
  rows: PeriodResult[];
  onClose: () => void;
}) {
  const [stage, setStage] = useState(0);
  const celebrated = useRef(false);
  const revealFinish = () => {
    if (!celebrated.current) {
      celebrated.current = true;
      const fresh = rows.some(row => !state.periodResults.find(original => original.id === row.id)?.acknowledgedAt && row.eloAfter > row.eloBefore);
      if (fresh) playPattern("earned");
    }
    setStage(1);
  };
  const next = stage === 2;
  const router = useRouter();
  return (
    <Modal
      visible
      presentationStyle="fullScreen"
      animationType="slide"
      onRequestClose={() => { /* Complete the recap before acknowledging results. */ }}
    >
      <SafeAreaProvider>
      <SafeAreaView style={f.safe}>
        <ScrollView contentContainerStyle={f.content}>
<SectionStack divided={false}>
          <MotionStep identity={String(stage)}>
          <Text style={f.kicker}>
            Round complete · {stage+1} / 3
          </Text>
          <AppText accessibilityRole="header" role="display" >
            {["Small days. Quite a week.", "Your week, settled.", "Your week in motion.", "New round. Fresh start."][stage]}
          </AppText>
          {stage===0 ? <><View style={{alignItems:"center"}}><AnimatedEmber size={190}/></View><AppText>Your effort added up. Let’s see where it took you.</AppText><FocusButton label="Reveal my finish →" onPress={revealFinish}/></> : !next ? (
            <>
              {rows.map((result) => (
                <View key={result.id}>
                  <ReplayViewer state={state} selection={result} initialDimension="4d" embedded result={result} onClose={()=>{}}/>
                  <WeeklySocialActions result={result} units={state.units} />
                </View>
              ))}
              <FocusButton label="See what added up →" onPress={() => setStage(2)} />
            </>
          ) : (
            <>
              {rows.map((result,index) => {
                const enrollment = roundEnrollment(state, result);
                return (
                  <OnboardingFade key={result.id} delay={index*500}><View style={{gap:16}}><AppText role="heading">{sportById(result.sport).name} · Score {Math.round(result.eloBefore)} → {Math.round(result.eloAfter)}</AppText><WeekChart state={state} result={result} delay={index*500}/><AppText role="body" secondary>
                    {sportById(result.sport).name}:{" "}
                    {enrollment.startsAt
                      ? `Your current round ${enrollment.status === "upcoming" ? "starts" : "started"} ${enrollment.startsAt.toLocaleString("en-US", { timeZone: APP_TIMEZONE, timeZoneName: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. ${enrollment.renews ? "Renews after this round." : "Stops after this round."}`
                      : "You’re not registered for another round. Update sport settings to join again."}
                  </AppText></View></OnboardingFade>
                );
              })}
              <FocusButton
                label="Update sport settings"
                secondary
                onPress={() => {
                  onClose();
                  router.push("/athlete-settings?panel=preferences");
                }}
              />
              <FocusButton label="Done" onPress={onClose} />
            </>
          )}
          </MotionStep>
        </SectionStack>
</ScrollView>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
export function RoundTakeover({
  state,
  ready,
  dispatch,
}: {
  state: CompeteState;
  ready: boolean;
  dispatch: (action: Action) => void;
}) {
  const { user } = useAuth();
  const {debugActive,resetDebugState}=useCompeteStore();
  const [dismissed,setDismissed]=useState(false);
  const path = usePathname();
  const router = useRouter();
  const replay = useGlobalSearchParams().results === "latest";
  useEffect(()=>{if(!replay)setDismissed(false);},[replay]);
  const reveal = roundReveal(
    replay
      ? {
          ...state,
          periodResults: state.periodResults.map((row) => ({
            ...row,
            acknowledgedAt: null,
          })),
        }
      : state,
  );
  if(dismissed || !ready || path !== "/arena" || !replay || !reveal) return null;
  return (
    <Round
      key={`${user?.id ?? "guest"}:${reveal.key}`}
      state={state}
      rows={reveal.results}
      onClose={() => {
        setDismissed(true);
        dispatch({ type: "acknowledge-reveal", revealIds: reveal.ids });if(debugActive)resetDebugState?.();
        if (replay) router.replace("/arena");
      }}
    />
  );
}

function WeekChart({ state, result, delay }: { state: CompeteState; result: PeriodResult; delay: number }) {
  const reduced = useReducedMotion();
  const draw = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    const animation = Animated.timing(draw, { toValue: 1, delay: reduced ? 0 : delay + 400, duration: reduced ? 0 : 1500, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [draw, delay, reduced]);
  const activities = state.activities.filter(a => a.sport === result.sport && countsOnTrack(a, result.track) && Date.parse(a.startedAt) >= Date.parse(result.periodStart) && Date.parse(a.startedAt) < Date.parse(result.periodEnd));
  // Iterate calendar dates rather than 24-hour instants across Eastern DST changes.
  const first = dayKey(new Date(result.periodStart), APP_TIMEZONE);
  const last = dayKey(new Date(Date.parse(result.periodEnd) - 1), APP_TIMEZONE);
  const dates: string[] = [];
  for (let date = first; date <= last; date = new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0, 10)) dates.push(date);
  const labels = dates.map(date => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE }));
  return activities.length ? <StandardLineChart yAxisLabel="Training (min)" showAxes showSummary formatAxisY={value => `${Math.round(value)}`} pointLabels={labels} formatY={value => `${Math.round(value)} min`} accessibilityLabel="Cumulative training minutes in the settled week" revealProgress={draw}
    values={dates.map(date => activities.filter(a => dayKey(new Date(a.startedAt), APP_TIMEZONE) <= date).reduce((sum, a) => sum + a.movingSec / 60, 0))}
    xLabels={[labels[0]!, labels[Math.floor((labels.length - 1) / 2)]!, labels.at(-1)!]} />
    : <AppText>Detailed activity history is unavailable for this archived week.</AppText>;
}
