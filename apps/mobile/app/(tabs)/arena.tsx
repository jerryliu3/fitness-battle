import { MaterialBack } from "../../src/ui/material-back";
import { CompetitionPanel } from "../../src/features/competition-panel";
import { CompetitionTimelineProvider, CompetitionTimelineControls } from "../../src/features/competition-timeline-context";
import { EventRegistration } from "../../src/features/event-registration";
import { useCompeteExperience } from "../../src/features/compete-experience";
import { RaceUpdates } from "../../src/features/race-updates";
import { EventHome } from "../../src/features/event-home";
import { CompeteIcon, CrewEvents, ExploreEvents, CompeteResults } from "../../src/features/compete-home-sections";
import { CompeteSheet } from "../../src/ui/compete-sheet";
import { SectionStack, AppText } from "../../src/ui/section";
import { APP_TIMEZONE, competePeriodWindow, weeklyCompetitionLastDay, weeklyPeriodBounds, competitionQueue, competeNow, competitionTrack, eventRegistration, type CompeteEvent } from "@fitness-battle/shared";
import { useThemeColors } from "../../src/theme";
import { useFocusStyles } from "../../src/ui/focus";
import {
  SPORTS,
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
    saveError,
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
  const [athleteFocus, setAthleteFocus] = useState<{ id: string; request: number } | null>(null);
  const [courseOptions, setCourseOptions] = useState<React.ReactNode>(null);
  const [expandRequest, setExpandRequest] = useState(0);
  const [register, setRegister] = useState(false);
  const [selection,setSelection]=useState<{account:string;sport:SportId|"sleep"}|null>(null);
  useEffect(()=>{if(requestedEvent&&SPORTS.some(s=>s.id===requestedEvent))setSelection({account:accountKey,sport:requestedEvent as SportId});},[requestedEvent,accountKey]);
  const [sport, setSport] = useState<SportId | "sleep" | null>(null);
  const joinFlight = useRef(false);
  const pendingEntry = useRef<CompeteEvent | null>(null);
  useEffect(() => { setRegister(false); setSport(null); pendingEntry.current = null; }, [accountKey]);
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
  function openRegistration(event: CompeteEvent | null = null) {
    setSport(event);
    joinFlight.current = false;
    setRegister(true);
  }
  function claimEntry() {
    if (!sport || joinFlight.current || (sport === "sleep" ? sleepOptedIn : active.some(r => r.sport === sport))) return;
    if (!user || !state!.onboardingCompleted) {
      setRegister(false);
      router.navigate(user ? "/onboarding" : "/athlete");
      return;
    }
    joinFlight.current = true;
    if (sport === "sleep") dispatch({ type: "opt-in-health", metric: "sleep", accountId: user.id });
    else {
      dispatch({ type: "set-primary", sport, accountId: user.id });
      dispatch({ type: "opt-in", sport, crewBoard: null, accountId: user.id });
    }
    setSelection({ account: accountKey, sport });
  }


  return (
    <CompetitionTimelineProvider state={state} selection={{ sport: selectedSport && selectedSport !== "sleep" ? selectedSport : state.primary, track, periodStart: headerPeriod.startsAt.toISOString(), periodEnd: headerPeriod.endsAt.toISOString() }} enabled={persistent && Boolean(selectedSport) && selectedSport !== "sleep"} active={focused && experience.immersive && !queue?.queued && !queue?.awaitingField}>
    <SafeAreaView pointerEvents={persistent ? "box-none" : "auto"} style={[f.safe, persistent && { backgroundColor: "transparent" }]} edges={[]}>
      {persistent && selectedSport && selectedSport !== "sleep" && !queue?.queued && !queue?.awaitingField ? <CompetitionField key={`${accountKey}:${selectedSport}:${state.units}`} sport={selectedSport} track={track} persistent backgroundMode externalAthleteFocus={athleteFocus} onOptionsChange={setCourseOptions} presentationActive={experience.immersive} onExit={exit} /> : null}
      {persistent && experience.immersive && (queue?.queued || queue?.awaitingField) && <View style={{ position: "absolute", top: insets.top + 6, left: 12, zIndex: 20 }}><MaterialBack onPress={exit} /></View>}
      {persistent && experience.immersive && <View style={{ position: "absolute", top: insets.top + 54, right: 16, zIndex: 20 }}>{courseOptions}</View>}
      <ArenaSheet persistent={persistent} expandRequest={expandRequest} active={focused && experience.immersive} overview={persistent && !queue?.queued && !queue?.awaitingField ? <CompetitionTimelineControls /> : undefined}>
<SectionStack divided={false}>
        {!persistent && <View style={{ gap: 8 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><CompeteIcon name="wreath" size={34} gold /><AppText role="display" accessibilityRole="header">Compete</AppText></View></View><View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}><AppText role="body" secondary>{dateRange}</AppText><View style={{ backgroundColor: c.actionSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}><AppText role="label">{timeRemaining}</AppText></View></View></View>}
        {standingsStale ? (
          <AppText role="body" secondary  accessibilityLiveRegion="polite">
            Standings may be out of date until the next refresh.
          </AppText>
        ) : null}
        {!persistent && <RoundTakeover state={state} ready={canWrite} dispatch={dispatch} />}
        {persistent ? selectedSport && selectedSport !== "sleep" ? queue?.queued || queue?.awaitingField ? <View style={{ gap: 16 }}><QueuedField state={state} event={selectedSport} now={now} onCancel={() => { dispatch({ type: "opt-out", sport: selectedSport }); exit(); }} /></View> : <CompetitionPanel key={`${accountKey}:${selectedSport}:${headerPeriod.startsAt.toISOString()}`} active={focused && experience.immersive} standings={<CompetitionField sport={selectedSport} track={track} standingsOnly onFocusAthlete={id => { setAthleteFocus(previous => ({ id, request: (previous?.request ?? 0) + 1 })); }} />} activity={visible => <RaceUpdates state={state} sport={selectedSport} active={visible} />} /> : null : <>
          <EventHome active={focused && !experience.immersive} state={state} accountKey={accountKey} onEnter={experience.enter} onRecovery={() => setSelection({ account: accountKey, sport: "sleep" })} />
          {selectedSport === "sleep" && (queue && (queue.queued || queue.awaitingField) ? <QueuedField state={state} event="sleep" now={now} onCancel={() => dispatch({ type: "opt-out-health", metric: "sleep" })} /> : <SleepPanel state={state} dispatch={dispatch} />)}
        </>}
        {!persistent && <CrewEvents onChoose={() => router.navigate("/field")} />}
        {!persistent && <ExploreEvents onChoose={event => {
          if (event === "sleep" && sleepOptedIn) setSelection({ account: accountKey, sport: "sleep" });
          else if (event !== "sleep" && active.some(r => r.sport === event)) experience.enter(accountKey, event);
          else openRegistration(event);
        }} />}
        {!persistent && <CompeteResults state={state} onHistory={() => router.push("/progress-history")} onRankings={() => router.push("/benchmarks")} />}
      </SectionStack>
</ArenaSheet>
      <FocusSheet open={register} title={sport ? eventRegistration(state, sport, now).title : "Choose an event"} onClose={() => setRegister(false)} onClosed={() => {
        const event = pendingEntry.current;
        pendingEntry.current = null;
        if (event === "sleep") setSelection({ account: accountKey, sport: event });
        else if (event) experience.enter(accountKey, event);
      }}>
        {sport ? <EventRegistration key={`${accountKey}:${sport}`} state={state} event={sport} registered={sport === "sleep" ? sleepOptedIn : active.some(r => r.sport === sport)} error={saveError ?? undefined} onClaim={claimEntry} onView={() => { pendingEntry.current = sport; setRegister(false); }} /> : <View style={{ gap: 10 }}>
          {[...SPORTS.map(item => ({ id: item.id, name: item.name })), { id: "sleep" as const, name: "Sleep & recovery" }].map(item => {
            const registered = item.id === "sleep" ? sleepOptedIn : active.some(r => r.sport === item.id);
            return <Pressable key={item.id} accessibilityRole="button" disabled={registered} accessibilityLabel={`${item.name}, ${registered ? "already registered" : "view event details"}`} onPress={() => setSport(item.id)} style={[f.chip, { opacity: registered ? 0.5 : 1 }]}><AppText role="label">{item.name}</AppText><AppText role="caption" secondary>{registered ? "Already registered" : "View event details →"}</AppText></Pressable>;
          })}
        </View>}
      </FocusSheet>
    </SafeAreaView>
    </CompetitionTimelineProvider>
  );
}

function ArenaSheet({ persistent, children, ...props }: { persistent: boolean; children: React.ReactNode; expandRequest: number; active: boolean; overview?: React.ReactNode }) {
  const f = useFocusStyles();
  return persistent ? <CompeteSheet {...props}>{children}</CompeteSheet> : <ScrollView contentContainerStyle={f.content}>{children}</ScrollView>;
}
