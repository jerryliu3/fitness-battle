import {
  buildArenaModel,
  initialsFromName,
  stableFieldLanes,
  type ArenaLane,
} from "@fitness-battle/shared";
import { Button } from "heroui-native/button";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompeteStore } from "../../src/lib/compete-store";
import { DetailSheet } from "../../src/ui/detail-sheet";
import { LaneTrack } from "../../src/ui/lane-track";
import { SHELL_COLORS, SHELL_RADIUS } from "../../src/theme";

type FieldMode = "lanes" | "pursuit";
type CameraMode = "follow" | "above" | "avatar";

type PursuitProps = {
  lanes: ArenaLane[];
  index: number;
  showGhost: boolean;
  camera: CameraMode;
  onUnavailable: () => void;
};

function LivePursuit({ sceneKey, ...props }: PursuitProps & { sceneKey: string }) {
  const [Comp, setComp] = useState<ComponentType<PursuitProps> | null>(null);
  const [failed, setFailed] = useState(false);
  const report = useRef(props.onUnavailable);
  report.current = props.onUnavailable;

  useEffect(() => {
    let alive = true;
    import("../../src/ui/pursuit")
      .then((mod) => {
        if (alive) setComp(() => mod.Pursuit);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (failed) report.current();
  }, [failed]);

  if (failed || !Comp) {
    return (
      <View style={styles.pursuitHold}>
        <Text style={styles.copy}>Preparing the track…</Text>
      </View>
    );
  }
  return <Comp key={sceneKey} {...props} />;
}

export default function ArenaScreen() {
  const { state, dispatch, returnGain, clearReturn } = useCompeteStore();
  const router = useRouter();
  const [index, setIndex] = useState(2);
  const [showGhost, setShowGhost] = useState(true);
  const [selected, setSelected] = useState<ArenaLane | null>(null);
  const [mode, setMode] = useState<FieldMode>("lanes");
  const [camera, setCamera] = useState<CameraMode>("follow");
  const [unavailable, setUnavailable] = useState(false);

  if (!state) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.copy}>Loading the track…</Text>
      </SafeAreaView>
    );
  }

  const arena = buildArenaModel(state);
  const you = arena.lanes.find((lane) => lane.you);
  const ghost = arena.lanes.find((lane) => lane.ghost);
  const youValue = you?.values[index] ?? 0;
  const ghostValue = ghost?.values[index] ?? 0;
  const gain = you && ghost ? youValue - ghostValue : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.kicker}>Arena</Text>
        <Text style={styles.total}>
          {youValue.toFixed(1)}
          <Text style={styles.unit}> {arena.unit}</Text>
        </Text>
        {gain != null ? (
          <Text style={styles.gain}>
            {gain >= 0 ? "+" : ""}
            {gain.toFixed(1)} {arena.unit} vs {ghost?.name.toLowerCase()}
          </Text>
        ) : (
          <Text style={styles.gain}>No past week to compare yet.</Text>
        )}

        {returnGain > 0 ? (
          <View style={styles.returnCard}>
            <Text style={styles.returnTitle}>
              {returnGain} new counted {returnGain === 1 ? "session" : "sessions"}
            </Text>
            <Button
              onPress={() => {
                clearReturn();
                router.navigate("/today");
              }}
            >
              Continue to Today
            </Button>
          </View>
        ) : null}

        {arena.optedIn && you ? (
          <>
            <View style={styles.replay} accessibilityRole="tablist">
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === "lanes" }}
                onPress={() => setMode("lanes")}
                style={[styles.replayTab, mode === "lanes" ? styles.replayOn : null]}
              >
                <Text style={[styles.replayText, mode === "lanes" ? styles.replayTextOn : null]}>
                  2D lanes
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === "pursuit" }}
                onPress={() => {
                  setUnavailable(false);
                  setMode("pursuit");
                }}
                style={[styles.replayTab, mode === "pursuit" ? styles.replayOn : null]}
              >
                <Text style={[styles.replayText, mode === "pursuit" ? styles.replayTextOn : null]}>
                  3D Pursuit
                </Text>
              </Pressable>
            </View>
            {mode === "pursuit" && !unavailable ? (
              <>
                <View style={styles.replay}>
                  {(["follow", "above", "avatar"] as const).map((id) => (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: camera === id }}
                      onPress={() => setCamera(id)}
                      style={[styles.replayTab, camera === id ? styles.replayOn : null]}
                    >
                      <Text style={[styles.replayText, camera === id ? styles.replayTextOn : null]}>
                        {id === "follow" ? "Follow" : id === "above" ? "Above" : "Avatar"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <LivePursuit
                  sceneKey={arena.lanes
                    .map((lane) => lane.id)
                    .sort()
                    .join("|")}
                  lanes={arena.lanes}
                  index={index}
                  showGhost={showGhost}
                  camera={camera}
                  onUnavailable={() => setUnavailable(true)}
                />
                <View style={styles.pickers}>
                  {stableFieldLanes(arena.lanes).map((lane) => {
                    const on = selected?.id === lane.id;
                    return (
                      <Pressable
                        key={lane.id}
                        accessibilityRole="button"
                        accessibilityLabel={lane.name}
                        accessibilityState={{ selected: on }}
                        onPress={() => setSelected(lane)}
                        style={[styles.picker, on ? styles.replayOn : null]}
                      >
                        <Text style={[styles.replayText, on ? styles.replayTextOn : null]}>
                          {lane.you ? "YOU" : initialsFromName(lane.name)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <LaneTrack
                lanes={arena.lanes}
                labels={arena.labels}
                unit={arena.unit}
                showGhost={showGhost}
                index={index}
                onSelect={setSelected}
              />
            )}
            {unavailable ? (
              <Text style={styles.copy}>3D is unavailable here. The 2D track stays interactive.</Text>
            ) : null}
            <View style={styles.replay} accessibilityRole="tablist">
              {arena.labels.map((label, labelIndex) => {
                const on = index === labelIndex;
                return (
                  <Pressable
                    key={label}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    onPress={() => setIndex(labelIndex)}
                    style={[styles.replayTab, on ? styles.replayOn : null]}
                  >
                    <Text style={[styles.replayText, on ? styles.replayTextOn : null]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ checked: showGhost }}
              onPress={() => setShowGhost((value) => !value)}
              style={styles.ghostToggle}
            >
              <Text style={styles.ghostText}>
                {showGhost ? "Hide past you" : "Show past you"}
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.copy}>You are not on a track yet.</Text>
            <Button
              onPress={() => dispatch({ type: "opt-in", sport: arena.sportId })}
            >
              Join {arena.sportName}
            </Button>
          </View>
        )}
      </ScrollView>
      <DetailSheet
        open={selected != null}
        title={selected?.name ?? "Athlete"}
        body={
          selected
            ? `${selected.values[index]?.toFixed(1) ?? "0"} ${arena.unit} at ${arena.labels[index]}. ${
                selected.you
                  ? "Your line uses counted activity through this cutoff."
                  : selected.ghost
                    ? "Past you is a comparison, not a place on the board."
                    : "This lane shares the week total across the same cutoffs."
              }`
            : ""
        }
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SHELL_COLORS.paper },
  scroll: { padding: 16, gap: 12, paddingBottom: 28 },
  kicker: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: SHELL_COLORS.muted,
  },
  total: {
    fontFamily: "DMSans_700Bold",
    fontSize: 42,
    color: SHELL_COLORS.ink,
    letterSpacing: -1,
  },
  unit: { fontSize: 18, color: SHELL_COLORS.muted },
  gain: {
    fontFamily: "DMSans_500Medium",
    color: SHELL_COLORS.plum,
    fontSize: 15,
  },
  returnCard: {
    backgroundColor: SHELL_COLORS.card,
    borderRadius: SHELL_RADIUS.card,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: SHELL_COLORS.line,
  },
  returnTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: SHELL_COLORS.ink,
  },
  replay: { flexDirection: "row", gap: 8 },
  replayTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: SHELL_RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SHELL_COLORS.card,
    borderWidth: 1,
    borderColor: SHELL_COLORS.line,
  },
  replayOn: { backgroundColor: SHELL_COLORS.plum, borderColor: SHELL_COLORS.plum },
  replayText: { fontFamily: "DMSans_700Bold", color: SHELL_COLORS.ink, fontSize: 13 },
  replayTextOn: { color: SHELL_COLORS.tennis },
  ghostToggle: { minHeight: 44, justifyContent: "center" },
  ghostText: { fontFamily: "DMSans_700Bold", color: SHELL_COLORS.plum },
  pursuitHold: { height: 360, alignItems: "center", justifyContent: "center" },
  pickers: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  picker: {
    minHeight: 44,
    minWidth: 52,
    paddingHorizontal: 12,
    borderRadius: SHELL_RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SHELL_COLORS.card,
    borderWidth: 1,
    borderColor: SHELL_COLORS.line,
  },
  empty: { gap: 12, paddingTop: 12 },
  copy: { fontFamily: "DMSans_400Regular", color: SHELL_COLORS.muted, fontSize: 15 },
});
