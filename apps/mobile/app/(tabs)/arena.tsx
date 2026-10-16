import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  buildArenaModel,
  SPORTS,
  initialsFromName,
  fitArenaWindow,
  type ArenaLane,
  type SportId,
  type ScoreTrack,
  type CrewBoardPin,
  type ArenaSceneMessage,
} from "@fitness-battle/shared";
import { useCompeteStore } from "../../src/lib/compete-store";
import { LaneTrack } from "../../src/ui/lane-track";
import { Arena3D } from "../../src/ui/arena-3d";
import {
  FocusButton,
  FocusDisclosure,
  FocusHeading,
  FocusSheet,
  f,
} from "../../src/ui/focus";
import { AwardShelf } from "../../src/ui/award-shelf";
import { awardCards } from "@fitness-battle/shared";
import { useCrewApi } from "../../src/features/crew";
import { useAuth } from "../../src/lib/auth";
export default function ArenaScreen() {
  const { state, dispatch, returnGain, clearReturn } = useCompeteStore();
  const { user } = useAuth();
  const router = useRouter();
  const crewApi = useCrewApi();
  const [crew, setCrew] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [track, setTrack] = useState<ScoreTrack>("open");
  const [mode, setMode] = useState("2D lanes");
  const [center, setCenter] = useState<number | null>(null);
  const [span, setSpan] = useState(6);
  const [ghost, setGhost] = useState(true);
  const [selected, setSelected] = useState<ArenaLane | null>(null);
  const [register, setRegister] = useState(false);
  const [sport, setSport] = useState<SportId>("running");
  const [failed, setFailed] = useState(false);
  if (!state)
    return (
      <SafeAreaView style={f.safe}>
        <Text style={f.copy}>Loading your arena…</Text>
      </SafeAreaView>
    );
  const arena = buildArenaModel(state, undefined, track);
  const me = arena.lanes.find((l) => l.you);
  const total = me?.values[2] ?? 0;
  const view = { center: center ?? total, span };
  const lanes = arena.lanes
    .filter((l) => ghost || !l.ghost)
    .map((l) => ({
      id: l.id,
      name: l.name,
      initials: initialsFromName(l.name),
      value: l.values[2],
      you: l.you,
      ghost: l.ghost,
    }));
  const model: ArenaSceneMessage = {
    type: "arena-view",
    lanes,
    view,
    unit: arena.unit,
    selected: selected?.id ?? me?.id ?? "",
  };
  async function join() {
    if (!user) {
      setRegister(false);
      router.navigate("/you");
      return;
    }
    setJoinBusy(true);
    setJoinError("");
    try {
      let pin: CrewBoardPin | null = null;
      if (crew) {
        const result = await crewApi.request("/field", { crewId: crew, sport });
        pin = result.pin;
        if (!pin || pin.sport !== sport)
          throw Error("Could not seat your crew field.");
      }
      dispatch({ type: "set-primary", sport });
      dispatch({ type: "opt-in", sport, crewBoard: pin });
      setCenter(null);
      setSpan(SPORTS.find((s) => s.id === sport)?.gps ? 6 : 20);
      setRegister(false);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Could not join.");
    } finally {
      setJoinBusy(false);
    }
  }

  return (
    <SafeAreaView style={f.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={f.content}>
        <FocusHeading
          kicker="Your week, your pace"
          title="A little further than before."
          body="Your effort. Your field. Your past self."
        />
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
                  setSpan(SPORTS.find((s) => s.id === r.sport)?.gps ? 6 : 20);
                  setFailed(false);
                }}
                style={[f.chip, r.sport === state.primary && f.chipActive]}
              >
                <Text style={f.rowTitle}>
                  {SPORTS.find((s) => s.id === r.sport)?.name}
                </Text>
              </Pressable>
            ))}
          <FocusButton
            label="Register ＋"
            secondary
            onPress={() => {
              setSport(state.primary);
              setRegister(true);
            }}
          />
        </View>
        {returnGain > 0 && (
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
        )}
        {arena.optedIn && me ? (
          <View style={f.card}>
            <View style={f.row}>
              <View>
                <Text style={f.kicker}>{arena.sportName} · This week</Text>
                <Text style={f.massive}>
                  {total.toFixed(1)} <Text style={f.copy}>{arena.unit}</Text>
                </Text>
              </View>
              <Text style={f.small}>
                {track === "open" ? "Open score" : "GPS verified"}
              </Text>
            </View>
            <View style={f.chipRow}>
              {(["open", "verified"] as const).map((t) => (
                <Pressable
                  key={t}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: track === t }}
                  style={[f.chip, { flex: 1 }, track === t && f.chipActive]}
                  onPress={() => {
                    setTrack(t);
                    setCenter(null);
                  }}
                >
                  <Text style={f.rowTitle}>
                    {t === "open" ? "Open score" : "GPS verified"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={f.chipRow}>
              {["2D lanes", "3D pursuit"].map((m) => (
                <Pressable
                  key={m}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === m }}
                  onPress={() => {
                    setMode(m);
                    setFailed(false);
                  }}
                  style={[f.chip, { flex: 1 }, mode === m && f.chipActive]}
                >
                  <Text style={f.rowTitle}>{m}</Text>
                </Pressable>
              ))}
            </View>
            {mode === "3D pursuit" && !failed ? (
              <Arena3D
                model={model}
                onPan={(v) => setCenter(Math.max(0, v))}
                onSelect={(id) =>
                  setSelected(arena.lanes.find((l) => l.id === id) ?? null)
                }
                onUnavailable={() => setFailed(true)}
              />
            ) : (
              <LaneTrack
                lanes={arena.lanes}
                labels={arena.labels}
                unit={arena.unit}
                showGhost={ghost}
                index={2}
                onSelect={setSelected}
                view={view}
                onPan={(v) => setCenter(Math.max(0, v))}
              />
            )}
            {failed && (
              <Text style={f.small}>
                3D needs an available web renderer. Your native 2D lanes remain
                interactive.
              </Text>
            )}
            <View style={f.chipRow}>
              {[
                {
                  label: "＋",
                  a: () => setSpan(Math.max(1, span / 1.5)),
                  name: "Zoom in",
                },
                {
                  label: "−",
                  a: () => setSpan(Math.min(5000, span * 1.5)),
                  name: "Zoom out",
                },
                {
                  label: "↓",
                  a: () => setCenter(Math.max(0, view.center - span / 3)),
                  name: "Move window backward",
                },
                {
                  label: "↑",
                  a: () => setCenter(view.center + span / 3),
                  name: "Move window forward",
                },
              ].map((b) => (
                <Pressable
                  key={b.name}
                  accessibilityRole="button"
                  accessibilityLabel={b.name}
                  style={f.chip}
                  onPress={b.a}
                >
                  <Text style={f.rowTitle}>{b.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={f.chipRow}>
              <FocusButton
                label="Center me"
                secondary
                onPress={() => {
                  setCenter(null);
                  setSpan(arena.unit === "km" ? 6 : 20);
                }}
              />
              <FocusButton
                label="Fit field"
                secondary
                onPress={() => {
                  const fit = fitArenaWindow(lanes);
                  setCenter(fit.center);
                  setSpan(fit.span);
                }}
              />
            </View>
            <Text style={f.small}>
              ± {(span / 2).toFixed(1)} {arena.unit} around{" "}
              {center === null ? "you" : view.center.toFixed(1)}
            </Text>
            {arena.lanes.some((l) => l.ghost) && (
              <View style={f.row}>
                <Text style={f.copy}>Show past you</Text>
                <Switch
                  value={ghost}
                  onValueChange={setGhost}
                  accessibilityLabel="Show past you"
                />
              </View>
            )}
            <FocusDisclosure
              title="Full standings"
              detail="Every athlete, including outside this view"
            >
              {arena.lanes
                .filter((l) => !l.ghost)
                .slice()
                .sort((a, b) => b.values[2] - a.values[2])
                .map((l, i) => (
                  <Pressable
                    accessibilityRole="button"
                    key={l.id}
                    onPress={() => setSelected(l)}
                    style={f.row}
                  >
                    <Text style={f.small}>{i + 1}</Text>
                    <Text style={[f.rowTitle, f.grow]}>
                      {l.you ? "You" : l.name}
                    </Text>
                    <Text style={f.rowTitle}>
                      {l.values[2].toFixed(1)} {arena.unit}
                    </Text>
                  </Pressable>
                ))}
            </FocusDisclosure>
            <Text style={f.small}>
              Accumulated effort, not live GPS positions. Practice fields may
              contain synthetic athletes.
            </Text>
          </View>
        ) : (
          <View style={f.card}>
            <Text style={f.title}>Your next chapter starts here.</Text>
            <Text style={f.copy}>
              Choose a sport and join your weekly field.
            </Text>
            <FocusButton
              label="Find an arena"
              onPress={() => setRegister(true)}
            />
          </View>
        )}
        {state.periodResults.some((r) => !r.acknowledgedAt) && (
          <View style={f.card}>
            <Text style={f.h2}>Your week is complete.</Text>
            <AwardShelf cards={awardCards(state)} />
            <FocusButton
              label="Continue to this week"
              onPress={() => dispatch({ type: "acknowledge-reveal" })}
            />
          </View>
        )}
        <FocusDisclosure title="Past competitions & awards">
          <AwardShelf cards={awardCards(state)} />
        </FocusDisclosure>
        <FocusButton
          label="Benchmarks & pace"
          secondary
          onPress={() => router.push("/benchmarks")}
        />
      </ScrollView>
      <FocusSheet
        open={register}
        title="Find your next arena."
        body="Choose a sport for your individual field. Private crew participation is available from Crew."
        onClose={() => setRegister(false)}
      >
        {SPORTS.map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: sport === s.id }}
            onPress={() => {
              setSport(s.id);
              setCrew("");
            }}
            style={[f.chip, sport === s.id && f.chipActive]}
          >
            <Text style={f.rowTitle}>{s.name}</Text>
            <Text style={f.small}>
              {s.gps ? "GPS distance & open effort" : "Open effort score"}
            </Text>
          </Pressable>
        ))}
        <Text style={f.kicker}>How will you join?</Text>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: !crew }}
          style={[f.chip, !crew && f.chipActive]}
          onPress={() => setCrew("")}
        >
          <Text style={f.rowTitle}>Solo · find a similar field</Text>
        </Pressable>
        {crewApi.data?.crews
          .flatMap((r) => (r.crews && r.crews.sport === sport ? [r.crews] : []))
          .map((c) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: crew === c.id }}
              key={c.id}
              style={[f.chip, crew === c.id && f.chipActive]}
              onPress={() => setCrew(c.id)}
            >
              <Text style={f.rowTitle}>With {c.name}</Text>
              <Text style={f.small}>
                Shared field · scores remain individual
              </Text>
            </Pressable>
          ))}
        {joinError && (
          <Text style={f.copy} accessibilityLiveRegion="polite">
            {joinError}
          </Text>
        )}
        <FocusButton
          label={user ? "Join this week" : "Sign in to participate"}
          disabled={joinBusy}
          onPress={() => void join()}
        />
      </FocusSheet>
      <FocusSheet
        open={!!selected}
        title={selected?.name ?? "Athlete"}
        body={
          selected
            ? `${selected.values[2].toFixed(1)} ${arena.unit}${selected.ghost ? " · past you, comparison only" : ""}`
            : ""
        }
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}
