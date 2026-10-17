import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  buildArenaModel,
  SPORTS,
  initialsFromName,
  fitArenaWindow,
  resolveArenaSelectedId,
  selfLaneLabel,
  type SportId,
  type ScoreTrack,
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
import { useAuth } from "../../src/lib/auth";
export default function ArenaScreen() {
  const { state, dispatch, returnGain, clearReturn } = useCompeteStore();
  const { user } = useAuth();
  const router = useRouter();
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [track, setTrack] = useState<ScoreTrack>("open");
  const [mode, setMode] = useState("2D lanes");
  const [center, setCenter] = useState<number | null>(null);
  const [span, setSpan] = useState<number | null>(null);
  const [ghost, setGhost] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [register, setRegister] = useState(false);
  const [sport, setSport] = useState<SportId | null>(null);
  const [failed, setFailed] = useState(false);
  if (!state)
    return (
      <SafeAreaView style={f.safe}>
        <Text style={f.copy}>Loading your arena…</Text>
      </SafeAreaView>
    );
  const arena = buildArenaModel(state, undefined, track);
  const defaultSpan =
    arena.unit === "pts" ? 20 : arena.unit === "mi" ? 4 : 6;
  const viewSpan = span ?? defaultSpan;
  const me = arena.lanes.find((l) => l.you);
  const total = me?.values[2] ?? 0;
  const view = { center: center ?? total, span: viewSpan };
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
  // Track/3D always need a concrete id (fall back to you). The detail sheet
  // must stay tied to the raw nullable selection or it cannot close.
  const trackSelectedId = resolveArenaSelectedId(
    selectedId,
    arena.lanes,
    ghost,
  );
  const selected =
    selectedId == null
      ? null
      : (arena.lanes.find(
          (l) => l.id === selectedId && (ghost || !l.ghost),
        ) ?? null);
  const model: ArenaSceneMessage = {
    type: "arena-view",
    lanes,
    view,
    unit: arena.unit,
    selected: trackSelectedId || me?.id || "",
  };
  async function join(nextSport: SportId) {
    if (!user) {
      setRegister(false);
      setSport(null);
      router.navigate("/you");
      return;
    }
    setJoinBusy(true);
    setJoinError("");
    try {
      dispatch({ type: "set-primary", sport: nextSport });
      dispatch({ type: "opt-in", sport: nextSport, crewBoard: null });
      setCenter(null);
      const gps = SPORTS.find((s) => s.id === nextSport)?.gps;
      setSpan(gps ? (state?.units === "metric" ? 6 : 4) : 20);
      setRegister(false);
      setSport(null);
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
                  setSpan(null);
                  setSelectedId(null);
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
              setSport(null);
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
                onSelect={(id) => setSelectedId(id)}
                onUnavailable={() => setFailed(true)}
              />
            ) : (
              <LaneTrack
                lanes={arena.lanes}
                unit={arena.unit}
                showGhost={ghost}
                index={2}
                onSelect={(lane) => setSelectedId(lane.id)}
                view={view}
                onPan={(v) => setCenter(Math.max(0, v))}
              />
            )}
            {failed && (
              <Text style={f.small}>
                3D needs WebGL on this device. Your 2D lanes remain interactive.
              </Text>
            )}
            <View style={f.chipRow}>
              {[
                {
                  label: "＋",
                  a: () => setSpan(Math.max(1, viewSpan / 1.5)),
                  name: "Zoom in",
                },
                {
                  label: "−",
                  a: () => setSpan(Math.min(5000, viewSpan * 1.5)),
                  name: "Zoom out",
                },
                {
                  label: "↓",
                  a: () =>
                    setCenter(Math.max(0, view.center - viewSpan / 3)),
                  name: "Move window backward",
                },
                {
                  label: "↑",
                  a: () => setCenter(view.center + viewSpan / 3),
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
                  setSpan(null);
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
                      arena.lanes.some(
                        (l) => l.id === selectedId && l.ghost,
                      )
                    )
                      setSelectedId(null);
                  }}
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
                    onPress={() => setSelectedId(l.id)}
                    style={f.row}
                  >
                    <Text style={f.small}>{i + 1}</Text>
                    <Text style={[f.rowTitle, f.grow]}>
                      {l.you ? selfLaneLabel(l.name) : l.name}
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
            <Text style={f.copy}>Pick a sport and join for the week.</Text>
            <FocusButton
              label="Find a field"
              onPress={() => {
                setSport(null);
                setRegister(true);
              }}
            />
          </View>
        )}
        <View style={[f.card, { opacity: 0.72 }]}>
          <Text style={f.kicker}>Coming soon</Text>
          <Text style={f.title}>1v1</Text>
          <Text style={f.copy}>
            Challenge a friend head-to-head for the week. Not open yet.
          </Text>
          <FocusButton label="1v1 · Coming soon" disabled onPress={() => {}} />
        </View>
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
        title="Register for this week."
        body="Tap a sport to join for the week."
        onClose={() => {
          setRegister(false);
          setSport(null);
        }}
      >
        {SPORTS.map((s) => {
          const isRegistered = state.ratings.find((r) => r.sport === s.id)
            ?.optedIn;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              disabled={Boolean(isRegistered) || joinBusy}
              onPress={() => {
                if (isRegistered || joinBusy) return;
                setSport(s.id);
                void join(s.id);
              }}
              style={[f.chip, sport === s.id && f.chipActive]}
            >
              <Text style={f.rowTitle}>{s.name}</Text>
              <Text style={f.small}>
                {isRegistered
                  ? "Registered this week"
                  : s.gps
                    ? "GPS distance & open effort"
                    : "Open effort score"}
              </Text>
            </Pressable>
          );
        })}
        {joinError && (
          <Text style={f.copy} accessibilityLiveRegion="polite">
            {joinError}
          </Text>
        )}
      </FocusSheet>
      <FocusSheet
        open={!!selected}
        title={selected?.name ?? "Athlete"}
        body={
          selected
            ? `${selected.values[2].toFixed(1)} ${arena.unit}${selected.ghost ? " · past you, comparison only" : ""}`
            : ""
        }
        onClose={() => setSelectedId(null)}
      />
    </SafeAreaView>
  );
}
