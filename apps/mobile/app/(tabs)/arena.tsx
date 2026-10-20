import type { CrewBoardPin } from "@fitness-battle/shared";
import {
  SPORTS,
  arenaBaselineStorageKey,
  awardCards,
  buildArenaModel,
  competePeriodWindow,
  fitArenaWindow,
  formatArenaOvertakeStatus,
  initialsFromName,
  readArenaBaseline,
  reconcileArenaOvertake,
  selfLaneLabel,
  serializeArenaBaseline,
  shellTabFromPath,
  sportById,
  stepArenaOvertake,
  type ArenaOvertakePlan,
  type ArenaSceneLane,
  type CompeteState,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { playCue } from "../../src/lib/haptics";
import { useScoreTrackLens } from "../../src/lib/score-track-lens";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RoundTakeover } from "../../src/features/round-takeover";
import { CompetitionSummary } from "../../src/features/competition-summary";
import { useCrewApi } from "../../src/features/crew";
import { SleepPanel } from "../../src/features/sleep-panel";
import { useAuth } from "../../src/lib/auth";
import { useCompeteStore } from "../../src/lib/compete-store";
import { AwardShelf } from "../../src/ui/award-shelf";
import {
  FocusButton,
  FocusDisclosure,
  FocusSheet,
  f,
} from "../../src/ui/focus";
import { LaneTrack } from "../../src/ui/lane-track";
import { ZoomControl } from "../../src/ui/zoom-control";
export default function ArenaScreen() {
  const {
    state,
    accountKey,
    readBaselineItem,
    writeBaselineItem,
    dispatch,
    returnGain,
    clearReturn,
    fieldNotice,
    dismissFieldNotice,
    standingsStale,
    saveError,
    retrySave,
    canWrite,
  } = useCompeteStore();
  const { user, demoMode } = useAuth();
  const crewApi = useCrewApi();
  const [withCrew, setWithCrew] = useState(false);
  const joinFlight = useRef(false);
  const currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = shellTabFromPath(pathname)?.id === "arena";
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [track, setTrack] = useScoreTrackLens();
  const [mode, setMode] = useState("Lanes");
  const [center, setCenter] = useState<number | null>(null);
  const [span, setSpan] = useState<number | null>(null);
  const [ghost, setGhost] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [register, setRegister] = useState(false);
  const [sport, setSport] = useState<SportId | null>(null);
  const [overtakePlan, setOvertakePlan] = useState<ArenaOvertakePlan | null>(
    null,
  );
  const [overtakeProgress, setOvertakeProgress] = useState(1);
  const [replayEpoch, setReplayEpoch] = useState(0);
  const lastSignatureRef = useRef<string | null>(null);

  const arena = useMemo(
    () => (state ? buildArenaModel(state, undefined, track) : null),
    [state, track],
  );
  const defaultSpan = arena?.unit === "pts" ? 20 : arena?.unit === "mi" ? 4 : 6;
  const viewSpan = span ?? defaultSpan;
  const me = arena?.lanes.find((l) => l.you);
  const total = me?.values[2] ?? 0;

  const fieldLanes = useMemo<ArenaSceneLane[]>(
    () =>
      (arena?.lanes ?? [])
        .filter((l) => !l.ghost)
        .map((l) => ({
          id: l.id,
          name: l.name,
          initials: initialsFromName(l.name),
          value: l.values[2],
          you: l.you,
          ghost: false,
        })),
    [arena?.lanes],
  );

  useEffect(() => {
    if (!isFocused) return;
    if (!state || !arena?.optedIn || fieldLanes.length === 0) {
      setOvertakePlan(null);
      setOvertakeProgress(1);
      return;
    }
    const periodStart = competePeriodWindow(
      state,
      undefined,
      arena.sportId,
    ).startsAt.toISOString();
    const key = arenaBaselineStorageKey(accountKey, arena.sportId, track);
    const scopeKey = `${key}:${periodStart}:${arena.unit}`;
    const signature = `${scopeKey}|${fieldLanes
      .map((lane) => `${lane.id}:${lane.value.toFixed(3)}`)
      .join(",")}`;
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;

    const previous = readArenaBaseline(
      readBaselineItem(key),
      periodStart,
      arena.unit,
    );
    const plan = reconcileArenaOvertake(fieldLanes, previous);
    writeBaselineItem(
      key,
      serializeArenaBaseline(periodStart, fieldLanes, arena.unit),
    );
    if (!plan) {
      setOvertakePlan(null);
      setOvertakeProgress(1);
      return;
    }
    setCenter(null);
    setOvertakePlan(plan);
    setOvertakeProgress(0);
    setReplayEpoch((n) => n + 1);
  }, [
    accountKey,
    arena?.optedIn,
    arena?.sportId,
    arena?.unit,
    fieldLanes,
    isFocused,
    readBaselineItem,
    state,
    track,
    writeBaselineItem,
  ]);

  useEffect(() => {
    if (!overtakePlan || replayEpoch === 0) return;
    let raf = 0;
    const start = Date.now();
    const duration = overtakePlan.durationMs;
    const tick = () => {
      const next = Math.min(1, (Date.now() - start) / duration);
      setOvertakeProgress(next);
      if (next < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [overtakePlan, replayEpoch]);

  const overtakeFrame = useMemo(
    () =>
      overtakePlan && overtakeProgress < 1
        ? stepArenaOvertake(overtakePlan, overtakeProgress, viewSpan)
        : null,
    [overtakePlan, overtakeProgress, viewSpan],
  );

  const overtakeStatus = useMemo(
    () =>
      overtakePlan && arena
        ? formatArenaOvertakeStatus(overtakePlan, overtakeFrame, arena.unit)
        : null,
    [arena, overtakeFrame, overtakePlan],
  );

  if (!state || !arena)
    return (
      <SafeAreaView style={f.safe}>
        <Text style={f.copy}>Loading your arena…</Text>
      </SafeAreaView>
    );

  const displayTotal = overtakeFrame ? overtakeFrame.youValue : total;
  const view = {
    center: center ?? (overtakeFrame ? overtakeFrame.viewCenter : total),
    span: viewSpan,
  };
  const selectAthlete = (id: string) => {
    const lane = arena.lanes.find((item) => item.id === id);
    if (!lane) return;
    setSelectedId(id);
    setCenter(lane.values[2]);
  };
  async function join(nextSport: SportId, crewId?: string) {
    if (!user) {
      setRegister(false);
      setSport(null);
      router.navigate("/you");
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
      setCenter(null);
      const gps = SPORTS.find((s) => s.id === nextSport)?.gps;
      setSpan(gps ? (state?.units === "metric" ? 6 : 4) : 20);
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
    <SafeAreaView style={f.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={f.content}>
        <CompetitionSummary state={state} />
        {saveError ? (
          <View style={f.feedback}>
            <Text style={f.copy}>{saveError}</Text>
            <FocusButton label="Retry save" secondary onPress={retrySave} />
          </View>
        ) : null}
        <View style={f.chipRow}>
          {state.ratings
            .filter((r) => r.optedIn)
            .map((r) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: r.sport === state.primary }}
                key={r.sport}
                onPress={() => {
                  dispatch({ type: "set-primary", sport: r.sport });
                  setCenter(null);
                  setSpan(null);
                  setSelectedId(null);
                }}
                style={[f.chip, r.sport === state.primary && f.chipActive]}
              >
                <Text style={f.rowTitle}>
                  {SPORTS.find((s) => s.id === r.sport)?.name}
                </Text>
              </Pressable>
            ))}
          {state.ratings.some((r) => r.optedIn) ||
          state.healthRatings.some((r) => r.optedIn) ? (
            <FocusButton
              label="Register ＋"
              secondary
              onPress={() => {
                setSport(null);
                setRegister(true);
              }}
            />
          ) : null}
        </View>
        {standingsStale ? (
          <Text style={f.copy} accessibilityLiveRegion="polite">
            Standings may be out of date until the next refresh.
          </Text>
        ) : null}
        {fieldNotice ? (
          <View style={f.card}>
            <Text style={f.h2}>{fieldNotice.title}</Text>
            <FocusButton
              label="Got it"
              secondary
              onPress={dismissFieldNotice}
            />
          </View>
        ) : null}
        <RoundTakeover state={state} ready={canWrite} dispatch={dispatch} />
        {returnGain > 0 && !fieldNotice ? (
          <View style={f.card}>
            <Text style={f.h2}>
              {returnGain} new counted{" "}
              {returnGain === 1 ? "session" : "sessions"}
            </Text>
            <Text style={f.copy}>
              Your effort went somewhere. Explore your updated lanes.
            </Text>
            <FocusButton
              label="Continue to Home"
              onPress={() => {
                clearReturn();
                router.navigate("/today");
              }}
            />
          </View>
        ) : null}
        {arena.optedIn && me ? (
          <View style={f.card}>
            <View style={f.row}>
              <View>
                <Text style={[f.h2, { fontSize: 28 }]}>{arena.sportName}</Text>
                <Text style={f.massive}>
                  {displayTotal.toFixed(1)}{" "}
                  <Text style={f.copy}>{arena.unit}</Text>
                </Text>
              </View>
              <Text style={f.small}>
                {track === "open" ? "Open score" : "GPS verified"}
              </Text>
            </View>
            {overtakePlan && overtakeStatus ? (
              <View style={f.row}>
                <Text style={f.rowTitle}>
                  {overtakeStatus.headline}
                  {overtakeStatus.detail ? ` · ${overtakeStatus.detail}` : ""}
                </Text>
              </View>
            ) : null}
            <View style={f.chipRow}>
              {(["open", "verified"] as const).map((t) => (
                <Pressable
                  key={t}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: track === t }}
                  style={[f.chip, { flex: 1 }, track === t && f.chipActive]}
                  onPress={() => {
                    if (t !== track) void playCue("selection");
                    setTrack(t);
                    setCenter(null);
                    setSelectedId(null);
                  }}
                >
                  <Text style={f.rowTitle}>
                    {t === "open" ? "Open score" : "GPS verified"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={f.chipRow}>
              {["Lanes", "Standings"].map((m) => (
                <Pressable
                  key={m}
                  accessibilityRole="tab"
                  accessibilityState={{
                    selected: mode === m,
                  }}
                  onPress={() => {
                    setMode(m);
                  }}
                  style={[f.chip, { flex: 1 }, mode === m && f.chipActive]}
                >
                  <Text
                    style={[
                      f.rowTitle,
                    ]}
                  >
                    {m}
                  </Text>
                </Pressable>
              ))}
            </View>
            {mode === "Standings" ? (
              <View style={{ gap: 12 }}>
                {arena.lanes
                  .filter((l) => !l.ghost)
                  .slice()
                  .sort((a, b) => b.values[2] - a.values[2])
                  .map((l, i) => (
                    <Pressable
                      key={l.id}
                      accessibilityRole="button"
                      onPress={() => selectAthlete(l.id)}
                      style={f.row}
                    >
                      <Text style={f.small}>
                        {1 +
                          arena.lanes.filter(
                            (peer) =>
                              !peer.ghost && peer.values[2] > l.values[2],
                          ).length}
                      </Text>
                      <Text style={[f.rowTitle, f.grow]}>
                        {l.you ? selfLaneLabel(l.name) : l.name}
                      </Text>
                      <Text style={f.rowTitle}>
                        {l.values[2] - total > 0 ? "+" : ""}{(l.values[2] - total).toFixed(1)} {arena.unit}
                      </Text>
                    </Pressable>
                  ))}
              </View>
            ) : (
              <LaneTrack
                selectedId={selectedId ?? me?.id}
                lanes={arena.lanes}
                unit={arena.unit}
                showGhost={ghost}
                index={2}
                onSelect={(lane) => selectAthlete(lane.id)}
                view={view}
                onPan={(v) => setCenter(Math.max(0, v))}
                overtakeFrame={overtakeFrame}
                overtakePlan={overtakePlan}
              />
            )}
            <ZoomControl
              value={view.span}
              maximum={arena.unit === "pts" ? 100 : 40}
              onChange={(span) => {
                setSpan(span);
              }}
            />

            <View style={f.chipRow}>
              <FocusButton
                label="Center me"
                secondary
                onPress={() => {
                  setCenter(null);
                  setSpan(null);
                }}
              />
              <FocusButton
                label="Fit field"
                secondary
                onPress={() => {
                  const fit = fitArenaWindow(fieldLanes);
                  setCenter(fit.center);
                  setSpan(fit.span);
                }}
              />
            </View>
            <Text style={f.small}>
              ± {(viewSpan / 2).toFixed(1)} {arena.unit} around{" "}
              {center === null ? "you" : view.center.toFixed(1)}
            </Text>
            {arena.lanes.some((l) => l.ghost) && (
              <View style={f.row}>
                <Text style={f.copy}>Show past you</Text>
                <Switch
                  value={ghost}
                  onValueChange={(next) => {
                    setGhost(next);
                    if (
                      !next &&
                      arena.lanes.some((l) => l.id === selectedId && l.ghost)
                    )
                      setSelectedId(null);
                  }}
                  accessibilityLabel="Show past you"
                />
              </View>
            )}
            <Text style={f.small}>
              Accumulated effort, not live GPS positions. Practice fields may
              contain synthetic athletes.
            </Text>
          </View>
        ) : !state.healthRatings.some((r) => r.optedIn) ? (
          <View style={f.card}>
            <Text
              style={{ fontSize: 26, textAlign: "center", marginBottom: 10 }}
            >
              🏃 🚴 🚶 🏋️
            </Text>
            <Text style={f.title}>Your next chapter starts here.</Text>
            <Text style={f.copy}>Pick an event and join for the week.</Text>
            <FocusButton
              label="Register for an event"
              onPress={() => {
                setSport(null);
                setRegister(true);
              }}
            />
          </View>
        ) : null}
        <SleepPanel state={state} dispatch={dispatch} />
        <View style={[f.card, { opacity: 0.72 }]}>
          <Text style={f.kicker}>Coming soon</Text>
          <Text style={f.title}>1v1</Text>
          <Text style={f.copy}>
            Challenge a friend head-to-head for the week. Not open yet.
          </Text>
          <FocusButton label="1v1 · Coming soon" disabled onPress={() => {}} />
        </View>
        {awardCards(state).length > 0 ? (
          <FocusDisclosure title="Past competitions & awards">
            <AwardShelf cards={awardCards(state)} />
          </FocusDisclosure>
        ) : null}
        <FocusButton
          label="Benchmarks & pace"
          secondary
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
              router.navigate("/you");
              return;
            }
            if (!state.onboardingCompleted) {
              setRegister(false);
              router.navigate("/onboarding");
              return;
            }
            dispatch({ type: "opt-in-health", metric: "sleep" });
            setRegister(false);
          }}
        />
        {joinError && (
          <Text style={f.copy} accessibilityLiveRegion="polite">
            {joinError}
          </Text>
        )}
      </FocusSheet>
    </SafeAreaView>
  );
}
