import { NavigationAction, SectionStack, AppText } from "../../src/ui/section";
import { competitionQueue, competeNow, waveTimeLabel, nextDailyWaveWindowAt, competitionTrack, competitionTrackLabel } from "@fitness-battle/shared";
import { EventCarousel } from "../../src/features/event-carousel";
import {
  SPORTS,
  type CrewBoardPin,
  type SportId,
} from "@fitness-battle/shared";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CompetitionField } from "../../src/features/competition-field";
import { QueuedField } from "../../src/features/queued-field";
import { CompetitionSummary } from "../../src/features/competition-summary";
import { useCrewApi } from "../../src/features/crew";
import { RoundTakeover } from "../../src/features/round-takeover";
import { SleepPanel } from "../../src/features/sleep-panel";
import { useAuth } from "../../src/lib/auth";
import { useCompeteStore } from "../../src/lib/compete-store";

import { playCue } from "../../src/lib/haptics";
import { FocusButton, FocusSheet, f } from "../../src/ui/focus";
import { SHELL_COLORS } from "../../src/theme";

export default function ArenaScreen() {
  const {
    state,
    accountKey,
    dispatch,
    standingsStale,
    saveError,
    retrySave,
    refresh,
    canWrite,
  } = useCompeteStore();
  const { user } = useAuth();
  const router = useRouter();
  const requestedEvent=useGlobalSearchParams<{event?:string}>().event;
  const crewApi = useCrewApi();
  const [register, setRegister] = useState(false);
  const [selection,setSelection]=useState<{account:string;sport:SportId|"sleep"}|null>(null);
  useEffect(()=>{if(requestedEvent&&SPORTS.some(s=>s.id===requestedEvent))setSelection({account:accountKey,sport:requestedEvent as SportId});},[requestedEvent,accountKey]);
  const [sport, setSport] = useState<SportId | "sleep" | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState("");
  const joinFlight = useRef(false);
  const currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  const [, updateClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => updateClock(value => value + 1), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!state || state.demoNow) return;
    const starts = [...state.enrollments.map(e => Date.parse(e.waveStart)), ...state.healthRatings.filter(r => r.optedIn).map(r => Date.parse(r.lockPeriod))].filter(at => at > Date.now());
    if (!starts.length) return;
    const timer = setTimeout(() => { updateClock(value => value + 1); void refresh(); }, Math.min(...starts) - Date.now() + 50);
    return () => clearTimeout(timer);
  }, [state, refresh]);
  if (!state) return null;
  const active = state.ratings.filter((rating) => rating.optedIn);
  const hasRegistration =
    active.length > 0 || state.healthRatings.some((rating) => rating.optedIn);
  const sleepOptedIn=state.healthRatings.some(r=>r.metric==="sleep"&&r.optedIn);
  const requested=selection?.account===accountKey?selection.sport:null;
  const selectedSport=requested&&(requested==="sleep"?sleepOptedIn:active.some(r=>r.sport===requested))
    ? requested : active.find(r=>r.sport===state.primary)?.sport??active[0]?.sport??(sleepOptedIn?"sleep":null);
  const now = competeNow(state);
  const queue = selectedSport ? competitionQueue(state, selectedSport, now) : null;
  const track = competitionTrack(selectedSport && selectedSport !== "sleep" ? selectedSport : state.primary);
  function openRegistration() {
    setSport(null);
    setJoinError("");
    setRegister(true);
  }
  async function join(nextSport: SportId, crewId?: string) {
    if (!user) {
      setRegister(false);
      setSport(null);
      router.navigate("/athlete");
      return;
    }
    if (joinFlight.current) return;
    if (!state?.onboardingCompleted) {
      setRegister(false);
      router.navigate("/onboarding");
      return;
    }
    const joiningAccount = user.id;
    joinFlight.current = true;
    setJoinBusy(true);
    setJoinError("");
    try {
      let pin: CrewBoardPin | null = null;
      if (crewId && state.crewBoard && state.crewBoard.crewId === crewId) {
        pin = state.crewBoard;
      } else if (crewId) {
        const result = await crewApi.request("/field", { crewId });
        pin = result.pin ?? null;
        if (!pin || pin.sport !== nextSport)
          throw new Error("Could not join that crew field. Please try again.");
      }
      if (currentUser.current !== joiningAccount) return;
      dispatch({
        type: "set-primary",
        sport: nextSport,
        accountId: joiningAccount,
      });
      dispatch({
        type: "opt-in",
        sport: nextSport,
        crewBoard: pin,
        accountId: joiningAccount,
      });
      setSelection({account:accountKey,sport:nextSport});
      setRegister(false);
      setSport(null);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Could not join.");
    } finally {
      joinFlight.current = false;
      setJoinBusy(false);
    }
  }

  const eventOptions = [
    ...active.map(r => ({
      value: r.sport,
      label: SPORTS.find(s => s.id === r.sport)?.name ?? r.sport,
    })),
    ...(sleepOptedIn ? [{ value: "sleep" as const, label: "Recovery" }] : []),
  ];

  return (
    <SafeAreaView style={f.safe} edges={[]}>
      <ScrollView contentContainerStyle={f.content}>
<SectionStack divided={false}>
        <CompetitionSummary state={state} selectedSport={selectedSport??undefined} onRegister={openRegistration} />
        {saveError ? (
          <View style={f.feedback}>
            <AppText role="body" secondary >{saveError}</AppText>
            <FocusButton label="Retry save" secondary onPress={retrySave} />
          </View>
        ) : null}
        {standingsStale ? (
          <AppText role="body" secondary  accessibilityLiveRegion="polite">
            Standings may be out of date until the next refresh.
          </AppText>
        ) : null}
        <RoundTakeover state={state} ready={canWrite} dispatch={dispatch} />
        {hasRegistration ? (
          <EventCarousel
            key={accountKey}
            events={[
              ...active.map((r) => ({
                id: r.sport,
                label: SPORTS.find((s) => s.id === r.sport)!.name,
                badge: competitionTrackLabel(r.sport),
              })),
              ...(sleepOptedIn
                ? [{ id: "sleep", label: "Recovery" }]
                : []),
            ]}
            value={selectedSport!}
            onChange={(id) => {
              setSelection({
                account: accountKey,
                sport: id as SportId | "sleep",
              });
              void playCue("selection");
            }}
            onRegister={openRegistration}
          >
            {selectedSport === "sleep" && queue && (queue.queued || queue.awaitingField) ? <QueuedField state={state} event={selectedSport} now={now} onCancel={() => dispatch(selectedSport === "sleep" ? { type: "opt-out-health", metric: "sleep" } : { type: "opt-out", sport: selectedSport })} /> : selectedSport && selectedSport !== "sleep" ? (
              <CompetitionField
                key={`${accountKey}:${selectedSport}:${state.units}:${track}`}
                sport={selectedSport}
                track={track}
              />
            ) : selectedSport === "sleep" ? (
              <SleepPanel state={state} dispatch={dispatch} />
            ) : (
              <View style={f.card}>
                <AppText role="heading">Your next chapter starts here.</AppText>
                <AppText role="body" secondary>
                  Register for an event to open your field.
                </AppText>
              </View>
            )}
            {selectedSport && !queue?.queued && !queue?.awaitingField ? <AppText role="caption" secondary>Sync workouts before the end time. Late uploads won't change final results.</AppText> : null}
          </EventCarousel>
        ) : (
          <View style={f.card}>
            <AppText role="heading">Your next chapter starts here.</AppText>
            <AppText role="body" secondary>
              Register for an event to open your field.
            </AppText>
            <FocusButton label="Explore events" onPress={openRegistration} />
          </View>
        )}
        {state.periodResults.length ? <NavigationAction label="Last week results" onPress={() => router.push("/arena?results=latest")} /> : null}
        <NavigationAction label="View all time standings" onPress={() => router.push("/benchmarks")} />
      </SectionStack>
</ScrollView>
      <FocusSheet
        open={register}
        minimal
        title="Choose an event to join"
        onClose={() => {
          setRegister(false);
          setSport(null);
        }}
      >
        <AppText role="body" secondary>Next wave starts {waveTimeLabel(nextDailyWaveWindowAt(now).waveStart)}. Everyone starts at zero.</AppText>
        {SPORTS.map((s) => {
          const isRegistered = state.ratings.find(
            (r) => r.sport === s.id,
          )?.optedIn;
          return (
            <View key={s.id} style={{ gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${s.name}, ${isRegistered ? "Already registered" : competitionTrackLabel(s.id)}`}
                disabled={Boolean(isRegistered) || joinBusy}
                onPress={() => {
                  if (isRegistered || joinBusy) return;
                  setSport(s.id);
                  void join(s.id);
                }}
                style={({ pressed }) => [
                  f.chip,
                  sport === s.id && f.chipActive,
                  Boolean(isRegistered) && { opacity: 0.5 },
                  pressed && !isRegistered && { opacity: 0.7 },
                ]}
              >
                <AppText role="label">{s.name}</AppText>
                <AppText role="caption" secondary>
                  {isRegistered
                    ? "Already registered"
                    : competitionTrackLabel(s.id)}
                </AppText>
              </Pressable>
            </View>
          );
        })}
        <View style={{ gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Recovery, ${sleepOptedIn ? "Already registered" : "Health Tracked"}`}
            disabled={Boolean(sleepOptedIn) || joinBusy}
            onPress={() => {
              if (sleepOptedIn || joinBusy) return;
              if (!user) {
                setRegister(false);
                router.navigate("/athlete");
                return;
              }
              if (!state.onboardingCompleted) {
                setRegister(false);
                router.navigate("/onboarding");
                return;
              }
              setSelection({ account: accountKey, sport: "sleep" });
              dispatch({ type: "opt-in-health", metric: "sleep" });
              setRegister(false);
            }}
            style={({ pressed }) => [
              f.chip,
              sport === "sleep" && f.chipActive,
              Boolean(sleepOptedIn) && { opacity: 0.5 },
              pressed && !sleepOptedIn && { opacity: 0.7 },
            ]}
          >
            <AppText role="label">Recovery</AppText>
            <AppText role="caption" secondary>
              {sleepOptedIn ? "Already registered" : "Health Tracked"}
            </AppText>
          </Pressable>
        </View>
        {Boolean(joinError) && (
          <AppText role="body" secondary  accessibilityLiveRegion="polite">
            {joinError}
          </AppText>
        )}
      </FocusSheet>
    </SafeAreaView>
  );
}
