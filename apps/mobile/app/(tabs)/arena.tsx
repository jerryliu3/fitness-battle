import { CompetitionTimelineProvider, CompetitionTimelineControls } from "../../src/features/competition-timeline-context";
import { useCrewApi } from "../../src/features/crew";
import { useCompeteExperience } from "../../src/features/compete-experience";
import { EventHome } from "../../src/features/event-home";
import { CompeteIcon, CrewEvents, ExploreEvents, CompeteResults } from "../../src/features/compete-home-sections";
import { CompeteSheet } from "../../src/ui/compete-sheet";
import { SectionStack, AppText } from "../../src/ui/section";
import { APP_TIMEZONE, competePeriodWindow, weeklyCompetitionLastDay, weeklyPeriodBounds, buildArenaModel, competitionQueue, competeNow, competitionTrack, competitionTrackLabel, waveTimeLabel, nextDailyWaveWindowAt } from "@fitness-battle/shared";
import { useThemeColors } from "../../src/theme";
import { useFocusStyles } from "../../src/ui/focus";
import {
  SPORTS,
  type CrewBoardPin,
  type SportId,
} from "@fitness-battle/shared";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { CompetitionField } from "../../src/features/competition-field";
import { RoundTakeover } from "../../src/features/round-takeover";
import { QueuedField } from "../../src/features/queued-field";
import { SleepPanel } from "../../src/features/sleep-panel";
import { useAuth } from "../../src/lib/auth";
import { useCompeteStore } from "../../src/lib/compete-store";

import { FocusSheet } from "../../src/ui/focus";

export default function ArenaRoute() { return <ArenaScreen />; }

export function ArenaScreen({ persistent = false }: { persistent?: boolean }) {
const f=useFocusStyles();
  const c = useThemeColors();
  const {
    state,
    accountKey,
    dispatch,
    standingsStale,
    refresh,
    canWrite,
  } = useCompeteStore();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const experience = useCompeteExperience();
  const exit = experience.close;
  useEffect(() => { if (persistent && experience.immersive && (experience.event?.account !== accountKey || (state && !state.ratings.some(r => r.optedIn && r.sport === experience.event?.sport)))) experience.close(); }, [accountKey, persistent, experience, state]);
  const focused = usePathname().endsWith("/arena");
  useEffect(() => { if (!persistent || !focused || !experience.immersive) return; const sub = BackHandler.addEventListener("hardwareBackPress", () => { exit(); return true; }); return () => sub.remove(); }, [focused, persistent, experience.immersive, exit]);
  const requestedEvent=useGlobalSearchParams<{event?:string}>().event;
  const crewApi = useCrewApi();
  const [athleteFocus, setAthleteFocus] = useState<{ id: string; request: number } | null>(null);
  const [courseOptions, setCourseOptions] = useState<React.ReactNode>(null);
  const [expandRequest, setExpandRequest] = useState(0);
  const [register, setRegister] = useState(false);
  const [selection,setSelection]=useState<{account:string;sport:SportId|"sleep"}|null>(null);
  useEffect(()=>{if(requestedEvent&&SPORTS.some(s=>s.id===requestedEvent))setSelection({account:accountKey,sport:requestedEvent as SportId});},[requestedEvent,accountKey]);
  const [sport, setSport] = useState<SportId | "sleep" | null>(null);
  useEffect(() => { setRegister(false); setSport(null); }, [accountKey]);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState("");
  const currentUser = useRef(user?.id); currentUser.current = user?.id;
  const joinFlight = useRef(false);
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
  const headerPeriod = selectedSport && selectedSport !== "sleep" ? competePeriodWindow(state, now, selectedSport) : weeklyPeriodBounds(now);
  const dateOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: APP_TIMEZONE };
  const dateRange = `${headerPeriod.startsAt.toLocaleDateString("en-US", dateOptions)} – ${weeklyCompetitionLastDay(headerPeriod.endsAt).toLocaleDateString("en-US", dateOptions)}`;
  const remainingMs = Math.max(0, headerPeriod.endsAt.getTime() - now.getTime());
  const remainingDays = Math.floor(remainingMs / 86400000), remainingHours = Math.ceil(remainingMs / 3600000);
  const timeRemaining = remainingMs === 0 ? "Ended" : remainingDays >= 1 ? `${remainingDays} day${remainingDays === 1 ? "" : "s"} left` : `${remainingHours} hour${remainingHours === 1 ? "" : "s"} left`;
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


  return (
    <CompetitionTimelineProvider state={state} selection={{ sport: selectedSport && selectedSport !== "sleep" ? selectedSport : state.primary, track, periodStart: headerPeriod.startsAt.toISOString(), periodEnd: headerPeriod.endsAt.toISOString() }} enabled={persistent && Boolean(selectedSport) && selectedSport !== "sleep"} active={focused && experience.immersive && !queue?.queued && !queue?.awaitingField}>
    <SafeAreaView pointerEvents={persistent ? "box-none" : "auto"} style={[f.safe, persistent && { backgroundColor: "transparent" }]} edges={[]}>
      {persistent && selectedSport && selectedSport !== "sleep" ? <CompetitionField key={`${accountKey}:${selectedSport}:${state.units}`} sport={selectedSport} track={track} persistent backgroundMode externalAthleteFocus={athleteFocus} onOptionsChange={setCourseOptions} presentationActive={experience.immersive} onExit={exit} /> : null}
      {persistent && experience.immersive && <View style={{ position: "absolute", top: insets.top + 54, right: 16, zIndex: 20 }}>{courseOptions}</View>}
      <ArenaSheet persistent={persistent} expandRequest={expandRequest} active={focused && experience.immersive} overview={persistent && !queue?.queued && !queue?.awaitingField ? <CompetitionTimelineControls /> : undefined}>
<SectionStack divided={false}>
        {!persistent && <View style={{ gap: 8 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><CompeteIcon name="wreath" size={34} gold /><AppText role="display" accessibilityRole="header">Compete</AppText></View><Pressable accessibilityRole="button" onPress={() => openRegistration()} style={{ minHeight: 44, justifyContent: "center" }}><AppText role="label">+ Register</AppText></Pressable></View><View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}><AppText role="body" secondary>{dateRange}</AppText><View style={{ backgroundColor: c.actionSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}><AppText role="label">{timeRemaining}</AppText></View></View></View>}
        {standingsStale ? (
          <AppText role="body" secondary  accessibilityLiveRegion="polite">
            Standings may be out of date until the next refresh.
          </AppText>
        ) : null}
        {!persistent && <RoundTakeover state={state} ready={canWrite} dispatch={dispatch} />}
        {persistent ? selectedSport && selectedSport !== "sleep" ? <CompetitionField sport={selectedSport} track={track} standingsOnly onFocusAthlete={id => { setAthleteFocus(previous => ({ id, request: (previous?.request ?? 0) + 1 })); }} /> : null : <>
          <EventHome active={focused && !experience.immersive} state={state} accountKey={accountKey} onEnter={experience.enter} onRecovery={() => setSelection({ account: accountKey, sport: "sleep" })} />
          {selectedSport === "sleep" && (queue && (queue.queued || queue.awaitingField) ? <QueuedField state={state} event="sleep" now={now} onCancel={() => dispatch({ type: "opt-out-health", metric: "sleep" })} /> : <SleepPanel state={state} dispatch={dispatch} />)}
        </>}
        {!persistent && <CrewEvents onChoose={() => router.navigate("/field")} />}
        {!persistent && <ExploreEvents onChoose={event => {
          if (event === "sleep" && sleepOptedIn) setSelection({ account: accountKey, sport: "sleep" });
          else if (event !== "sleep" && active.some(r => r.sport === event)) experience.enter(accountKey, event);
          else openRegistration();
        }} />}
        {!persistent && <CompeteResults state={state} onHistory={() => router.push("/progress-history")} onRankings={() => router.push("/benchmarks")} />}
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
    </CompetitionTimelineProvider>
  );
}

function ArenaSheet({ persistent, children, ...props }: { persistent: boolean; children: React.ReactNode; expandRequest: number; active: boolean; overview?: React.ReactNode }) {
  const f = useFocusStyles();
  return persistent ? <CompeteSheet {...props}>{children}</CompeteSheet> : <ScrollView contentContainerStyle={f.content}>{children}</ScrollView>;
}
