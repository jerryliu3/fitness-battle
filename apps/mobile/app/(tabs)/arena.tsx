import { useAthleteBlocks } from "../../src/lib/athlete-blocks";
import { FieldOverview } from "../../src/ui/field-course";
import { useCompeteExperience } from "../../src/features/compete-experience";
import { EventHome } from "../../src/features/event-home";
import { CompeteSheet } from "../../src/ui/compete-sheet";
import { NavigationAction, SectionStack, AppText } from "../../src/ui/section";
import { buildArenaModel, competitionQueue, competeNow, waveTimeLabel, nextDailyWaveWindowAt, competitionTrack, competitionTrackLabel } from "@fitness-battle/shared";
import {
  SPORTS,
  type CrewBoardPin,
  type SportId,
} from "@fitness-battle/shared";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Pressable, ScrollView, View, type ScrollViewInstance } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CompetitionField } from "../../src/features/competition-field";
import { useCrewApi } from "../../src/features/crew";
import { RoundTakeover } from "../../src/features/round-takeover";
import { QueuedField } from "../../src/features/queued-field";
import { SleepPanel } from "../../src/features/sleep-panel";
import { useAuth } from "../../src/lib/auth";
import { useCompeteStore } from "../../src/lib/compete-store";

import { playCue } from "../../src/lib/haptics";
import { FocusButton, FocusSheet, f } from "../../src/ui/focus";

export default function ArenaRoute() { return <ArenaScreen />; }

export function ArenaScreen({ persistent = false }: { persistent?: boolean }) {
  const {
    state,
    accountKey,
    dispatch,
    standingsStale,
    refresh,
    canWrite,
  } = useCompeteStore();
  const { user } = useAuth();
  const { blocks } = useAthleteBlocks();
  const router = useRouter();
  const experience = useCompeteExperience();
  const exit = experience.close;
  useEffect(() => { if (persistent && experience.immersive && (experience.event?.account !== accountKey || (state && !state.ratings.some(r => r.optedIn && r.sport === experience.event?.sport)))) experience.close(); }, [accountKey, persistent, experience, state]);
  const focused = usePathname().endsWith("/arena");
  useEffect(() => { if (!persistent || !focused || !experience.immersive) return; const sub = BackHandler.addEventListener("hardwareBackPress", () => { exit(); return true; }); return () => sub.remove(); }, [focused, persistent, experience.immersive, exit]);
  const requestedEvent=useGlobalSearchParams<{event?:string}>().event;
  const crewApi = useCrewApi();
  const [courseOptions, setCourseOptions] = useState<React.ReactNode>(null);
  const [courseTarget, setCourseTarget] = useState<{ value: number; request: number } | null>(null);
  useEffect(() => setCourseTarget(null), [accountKey, experience.event?.sport]);
  const [expandRequest, setExpandRequest] = useState(0);
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
  const sleepOptedIn=state.healthRatings.some(r=>r.metric==="sleep"&&r.optedIn);
  const requested=persistent && experience.event?.account === accountKey ? experience.event.sport : selection?.account===accountKey?selection.sport:null;
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


  const overviewModel = persistent && selectedSport && selectedSport !== "sleep" ? buildArenaModel(state, undefined, track, selectedSport) : null;
  return (
    <SafeAreaView pointerEvents={persistent ? "box-none" : "auto"} style={f.safe} edges={[]}>
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: experience.immersive ? 0 : experience.viewport?.y ?? 0, height: experience.immersive ? "100%" : experience.viewport?.height ?? 0, overflow: "hidden" }}>
      {persistent && active.map(rating => {
        const sport = rating.sport, frame = experience.previews?.[sport];
        const expanded = experience.immersive && selectedSport === sport;
        const queued = competitionQueue(state, sport, now);
        const visible = expanded || (frame && !experience.immersive && !queued?.queued && !queued?.awaitingField);
        return <View key={`${accountKey}:${sport}:${state.units}`} pointerEvents={expanded ? "auto" : "none"} style={{ position: "absolute", left: expanded ? 0 : frame?.x ?? 0, top: expanded ? 0 : (frame?.y ?? 0) - (experience.viewport?.y ?? 0), width: expanded ? "100%" : frame?.width ?? 1, height: expanded ? "100%" : frame?.height ?? 180, borderRadius: expanded ? 0 : 12, overflow: "hidden", opacity: visible ? 1 : 0 }}>
          <CompetitionField sport={sport} track={competitionTrack(sport)} persistent backgroundMode previewHeight={expanded ? undefined : frame?.height ?? 180} onOptionsChange={sport === selectedSport ? setCourseOptions : undefined} externalCourseTarget={sport === selectedSport ? courseTarget : null} presentationActive={focused && Boolean(visible)} onExit={exit} />
        </View>;
      })}
      </View>
      <ArenaSheet persistent={persistent} expandRequest={expandRequest} active={focused && experience.immersive} overview={overviewModel && !queue?.queued && !queue?.awaitingField ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{ flex: 1 }}><FieldOverview hiddenIds={blocks.map(block => block.id)} lanes={overviewModel.lanes.filter(lane => !lane.ghost).map(lane => ({ ...lane, value: lane.values[2], initials: "" }))} unit={overviewModel.unit} positionOnly view={{ center: courseTarget?.value ?? overviewModel.lanes.find(lane => lane.you)?.values[2] ?? 0, span: 1 }} onNavigate={value => setCourseTarget(previous => ({ value, request: (previous?.request ?? 0) + 1 }))} /></View>{courseOptions}</View> : undefined}>
<SectionStack divided={false}>
        {!persistent && <View style={{ gap: 8 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><AppText role="display" accessibilityRole="header">Compete</AppText><FocusButton label="+ Register" secondary onPress={openRegistration} /></View><AppText role="body" secondary>Your events</AppText></View>}
        {standingsStale ? (
          <AppText role="body" secondary  accessibilityLiveRegion="polite">
            Standings may be out of date until the next refresh.
          </AppText>
        ) : null}
        {!persistent && <RoundTakeover state={state} ready={canWrite} dispatch={dispatch} />}
        {persistent ? selectedSport && selectedSport !== "sleep" ? <CompetitionField sport={selectedSport} track={track} standingsOnly /> : null : <>
          <EventHome state={state} accountKey={accountKey} onEnter={experience.enter} onRecovery={() => setSelection({ account: accountKey, sport: "sleep" })} />
          {selectedSport === "sleep" && (queue && (queue.queued || queue.awaitingField) ? <QueuedField state={state} event="sleep" now={now} onCancel={() => dispatch({ type: "opt-out-health", metric: "sleep" })} /> : <SleepPanel state={state} dispatch={dispatch} />)}
        </>}
        {!persistent && state.periodResults.length ? <NavigationAction label="Last week results" onPress={() => router.push("/arena?results=latest")} /> : null}
        {!persistent && <NavigationAction label="View all time standings" onPress={() => router.push("/benchmarks")} />}
      </SectionStack>
</ArenaSheet>
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

function ArenaSheet({ persistent, children, ...props }: { persistent: boolean; children: React.ReactNode; expandRequest: number; active: boolean; overview?: React.ReactNode }) {
  const experience = useCompeteExperience();
  const viewportRef = useRef<ScrollViewInstance>(null);
  const measure = () => { viewportRef.current?.measureInWindow((x, y, width, height) => experience.updateViewport?.({ x, y, width, height })); experience.measurePreviews?.(); };
  return persistent ? <CompeteSheet {...props}>{children}</CompeteSheet> : <ScrollView ref={viewportRef} onLayout={measure} onScroll={experience.measurePreviews} scrollEventThrottle={16} contentContainerStyle={f.content}>{children}</ScrollView>;
}
