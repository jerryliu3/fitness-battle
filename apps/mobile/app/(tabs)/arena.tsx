import { AppIcon } from "../../src/ui/app-icon";
import { competitionTrack, competitionTrackLabel } from "@fitness-battle/shared";
import { EventCarousel } from "../../src/features/event-carousel";
import {
  SPORTS,
  type CrewBoardPin,
  type SportId,
} from "@fitness-battle/shared";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CompetitionField } from "../../src/features/competition-field";
import { CompetitionSummary } from "../../src/features/competition-summary";
import { useCrewApi } from "../../src/features/crew";
import { RoundTakeover } from "../../src/features/round-takeover";
import { SleepPanel } from "../../src/features/sleep-panel";
import { useAuth } from "../../src/lib/auth";
import { useCompeteStore } from "../../src/lib/compete-store";

import { playCue } from "../../src/lib/haptics";
import { FocusButton, FocusSegments, FocusSheet, f } from "../../src/ui/focus";

export default function ArenaScreen() {
  const {
    state,
    accountKey,
    dispatch,
    standingsStale,
    saveError,
    retrySave,
    canWrite,
  } = useCompeteStore();
  const { user } = useAuth();
  const router = useRouter();
  const requestedEvent=useGlobalSearchParams<{event?:string}>().event;
  const crewApi = useCrewApi();
  const [register, setRegister] = useState(false);
  const [selection,setSelection]=useState<{account:string;sport:SportId|"sleep"}|null>(null);
  useEffect(()=>{if(requestedEvent&&SPORTS.some(s=>s.id===requestedEvent))setSelection({account:accountKey,sport:requestedEvent as SportId});},[requestedEvent,accountKey]);
  const [sport, setSport] = useState<SportId | null>(null);
  const [withCrew, setWithCrew] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [fieldView, setFieldView] = useState<"lanes2d" | "standings" | "3d">("lanes2d");
  useEffect(() => { setFieldView("lanes2d"); }, [selection?.sport, accountKey]);
  const joinFlight = useRef(false);
  const currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  if (!state) return null;
  const active = state.ratings.filter((rating) => rating.optedIn);
  const hasRegistration =
    active.length > 0 || state.healthRatings.some((rating) => rating.optedIn);
  const sleepOptedIn=state.healthRatings.some(r=>r.metric==="sleep"&&r.optedIn);
  const requested=selection?.account===accountKey?selection.sport:null;
  const selectedSport=requested&&(requested==="sleep"?sleepOptedIn:active.some(r=>r.sport===requested))
    ? requested : active.find(r=>r.sport===state.primary)?.sport??active[0]?.sport??(sleepOptedIn?"sleep":null);
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
      if (crewId) {
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
    <SafeAreaView style={f.safe} edges={[]}>
      <ScrollView contentContainerStyle={f.content}>
        <CompetitionSummary state={state} selectedSport={selectedSport??undefined}>
          {selectedSport && selectedSport !== "sleep" ? (
            <FocusSegments
              label="Arena view"
              value={fieldView === "3d" ? "3d" : fieldView === "standings" ? "standings" : "lanes"}
              options={[
                { value: "lanes", label: "2D map" },
                { value: "standings", label: "Standings" },
                { value: "3d", label: "3D field" },
              ]}
              onChange={(next) => {
                void playCue("selection");
                setFieldView(
                  next === "3d" ? "3d" : next === "standings" ? "standings" : "lanes2d",
                );
              }}
            />
          ) : null}
        </CompetitionSummary>
        {saveError ? (
          <View style={f.feedback}>
            <Text style={f.copy}>{saveError}</Text>
            <FocusButton label="Retry save" secondary onPress={retrySave} />
          </View>
        ) : null}
        {standingsStale ? (
          <Text style={f.copy} accessibilityLiveRegion="polite">
            Standings may be out of date until the next refresh.
          </Text>
        ) : null}
        <RoundTakeover state={state} ready={canWrite} dispatch={dispatch} />
        {hasRegistration?<EventCarousel key={accountKey} events={[...active.map(r=>({id:r.sport,label:SPORTS.find(s=>s.id===r.sport)!.name,badge:competitionTrackLabel(r.sport)})),...(sleepOptedIn?[{id:"sleep",label:"Sleep & Recovery"}]:[])]} value={selectedSport!} onChange={id=>{setSelection({account:accountKey,sport:id as SportId|"sleep"});void playCue("selection");}} onRegister={openRegistration}>
        {selectedSport&&selectedSport!=="sleep"?<CompetitionField key={`${accountKey}:${selectedSport}:${state.units}:${track}`} sport={selectedSport} track={track} arenaView={fieldView} onArenaViewChange={setFieldView} chromeInHeader/>:selectedSport==="sleep"?<SleepPanel state={state} dispatch={dispatch}/>:<View style={f.card}><Text style={f.title}>Your next chapter starts here.</Text><Text style={f.copy}>Register for an event to open your field.</Text></View>}
        </EventCarousel>:<View style={f.card}><Text style={f.title}>Your next chapter starts here.</Text><Text style={f.copy}>Register for an event to open your field.</Text><FocusButton label="Explore events" onPress={openRegistration}/></View>}
        {state.periodResults.length ? <FocusButton label="Latest week results ↗" secondary onPress={() => router.push("/arena?results=latest")} /> : null}
        <View style={[f.row, { alignItems: "stretch", flexWrap: "wrap" }]}>
          <View style={[f.card, { flex: 1.2, minWidth: 150, backgroundColor: "#eef3f1" }]}>
            <AppIcon name="compete" size={32} /><Text style={f.kicker}>Coming soon</Text><Text style={f.h2}>1v1</Text><Text style={f.copy}>A week. A friendly challenge.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Beyond this week: pace and race rankings" style={[f.card, { flex: 1, minWidth: 130, justifyContent: "space-between" }]} onPress={() => router.push("/benchmarks")}>
            <AppIcon name="external" size={32} /><Text style={f.rowTitle}>Beyond this week</Text><Text style={f.small}>Your all-time pace & race rankings</Text>
          </Pressable>
        </View>
      </ScrollView>
      <FocusSheet
        open={register}
        title="Register for this week."
        body="Choose an event to join for the week."
        onClose={() => {
          setRegister(false);
          setSport(null);
        }}
      >
        <View style={f.row}>
          <Text style={[f.rowTitle, f.grow]}>Compete with your crew</Text>
          <Switch
            accessibilityLabel="Compete with your crew"
            value={withCrew}
            disabled={joinBusy}
            onValueChange={setWithCrew}
          />
        </View>
        {withCrew && !crewApi.live ? (
          <Text style={f.copy}>
            A live account and a matching crew are required.
          </Text>
        ) : null}
        {SPORTS.map((s) => {
          const isRegistered = state.ratings.find(
            (r) => r.sport === s.id,
          )?.optedIn;
          const eligible = (crewApi.data?.crews ?? []).flatMap((r) =>
            r.crews?.sport === s.id ? [r.crews] : [],
          );
          return (
            <View key={s.id} style={{ gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                disabled={Boolean(isRegistered) || joinBusy}
                onPress={() => {
                  if (isRegistered || joinBusy) return;
                  setSport(s.id);
                  if (!withCrew) void join(s.id);
                }}
                style={[f.chip, sport === s.id && f.chipActive]}
              >
                <Text style={f.rowTitle}>{s.name} · {competitionTrackLabel(s.id)}</Text>
                <Text style={f.small}>
                  {isRegistered
                    ? "Already registered"
                    : competitionTrackLabel(s.id)}
                </Text>
              </Pressable>
              {withCrew && sport === s.id && !isRegistered ? (
                eligible.length ? (
                  eligible.map((crew) => (
                    <FocusButton
                      key={crew.id}
                      label={`Join ${s.name} with ${crew.name}`}
                      disabled={joinBusy}
                      onPress={() => void join(s.id, crew.id)}
                    />
                  ))
                ) : (
                  <Text style={f.copy}>
                    {crewApi.error ||
                      "No eligible crew for this event. Add a crew on Crew, or turn off crew competition."}
                  </Text>
                )
              ) : null}
            </View>
          );
        })}
        <FocusButton
          label={
            state.healthRatings.some((r) => r.metric === "sleep" && r.optedIn)
              ? "Sleep & Recovery · registered"
              : "Join Sleep & Recovery"
          }
          secondary
          disabled={
            joinBusy ||
            state.healthRatings.some((r) => r.metric === "sleep" && r.optedIn)
          }
          onPress={() => {
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
            setSelection({account:accountKey,sport:"sleep"});
            dispatch({ type: "opt-in-health", metric: "sleep" });
            setRegister(false);
          }}
        />
        {Boolean(joinError) && (
          <Text style={f.copy} accessibilityLiveRegion="polite">
            {joinError}
          </Text>
        )}
      </FocusSheet>
    </SafeAreaView>
  );
}
