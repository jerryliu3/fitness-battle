import {
  SPORTS,
  type CrewBoardPin,
  type SportId,
} from "@fitness-battle/shared";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CompetitionField } from "../../src/features/competition-field";
import { CompetitionSummary } from "../../src/features/competition-summary";
import { useCrewApi } from "../../src/features/crew";
import { RoundTakeover } from "../../src/features/round-takeover";
import { SleepPanel } from "../../src/features/sleep-panel";
import { useAuth } from "../../src/lib/auth";
import { useCompeteStore } from "../../src/lib/compete-store";
import { useScoreTrackLens } from "../../src/lib/score-track-lens";
import { playCue } from "../../src/lib/haptics";
import {
  FocusButton,
  FocusSegments,
  FocusSheet,
  f,
} from "../../src/ui/focus";
import { SettingsRow } from "../../src/ui/settings-row";

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
  const crewApi = useCrewApi();
  const [track, setTrack] = useScoreTrackLens();
  const [register, setRegister] = useState(false);
  const [selection,setSelection]=useState<{account:string;sport:SportId|"sleep"}|null>(null);
  const [sport, setSport] = useState<SportId | null>(null);
  const [withCrew, setWithCrew] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState("");
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
          {hasRegistration ? (
            <FocusSegments
              label="Score track"
              value={track}
              accent
              options={[
                { value: "open", label: "Open score" },
                { value: "verified", label: "GPS verified" },
              ]}
              onChange={(next) => {
                void playCue("selection");
                setTrack(next);
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
        {state.periodResults.length ? <FocusButton label="Latest week results ↗" secondary onPress={() => router.push("/arena?results=latest")} /> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}} accessibilityLabel="Registered sports">
          {active.map(r=><Pressable key={r.sport} accessibilityRole="button" accessibilityLabel={`Show ${SPORTS.find(s=>s.id===r.sport)?.name}`} accessibilityState={{selected:selectedSport===r.sport}} style={[f.chip,selectedSport===r.sport&&f.chipActive]} onPress={()=>{setSelection({account:accountKey,sport:r.sport});void playCue("selection");}}><Text style={f.rowTitle}>{SPORTS.find(s=>s.id===r.sport)?.name}</Text></Pressable>)}
          {sleepOptedIn?<Pressable accessibilityRole="button" accessibilityLabel="Show Sleep & Recovery" accessibilityState={{selected:selectedSport==="sleep"}} style={[f.chip,selectedSport==="sleep"&&f.chipActive]} onPress={()=>setSelection({account:accountKey,sport:"sleep"})}><Text style={f.rowTitle}>Sleep & Recovery</Text></Pressable>:null}
          <FocusButton label="＋ Register" secondary onPress={openRegistration}/>
        </ScrollView>
        {selectedSport&&selectedSport!=="sleep"?<CompetitionField key={`${accountKey}:${selectedSport}:${state.units}:${track}`} sport={selectedSport} track={track}/>:selectedSport==="sleep"?<SleepPanel state={state} dispatch={dispatch}/>:<View style={f.card}><Text style={f.title}>Your next chapter starts here.</Text><Text style={f.copy}>Register for an event to open your field.</Text></View>}
        <View style={[f.card, { opacity: 0.72 }]}>
          <Text style={f.kicker}>Coming soon</Text>
          <Text style={f.h2}>1v1 Head-to-Head</Text>
          <Text style={f.copy}>
            Challenge a friend head-to-head for the week. Not open yet.
          </Text>
        </View>
        <SettingsRow
          title="Beyond this week"
          detail="All-time pace & race rankings"
          onPress={() => router.push("/benchmarks")}
        />
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
                <Text style={f.rowTitle}>{s.name}</Text>
                <Text style={f.small}>
                  {isRegistered
                    ? "Already registered"
                    : s.gps
                      ? "GPS distance & open effort"
                      : "Open effort score"}
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
