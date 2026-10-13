import {
  activityEffort,
  buildSplitBoard,
  competeNow,
  daysLeft,
  formatPts,
  HEALTH_METRICS,
  laneAtCheckpoint,
  lessonFor,
  sourceFromLinks,
  sportById,
  SPORTS,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/lib/auth-context";
import { useCompete } from "../../src/lib/compete-context";
import {
  AuthPrompt,
  Card,
  Chip,
  ChipRow,
  Copy,
  GhostButton,
  Kicker,
  LoadingCopy,
  Note,
  PrimaryButton,
  ProductHeader,
  Title,
} from "../../src/ui/primitives";
import { SleepPanel } from "../../src/ui/sleep-panel";
import { ui } from "../../src/ui/styles";

export default function MyTrackScreen() {
  const { state, dispatch } = useCompete();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState(
    "Create an account to join a board and keep your rating.",
  );
  const [comparison, setComparison] = useState<"self" | "field">("self");
  const [checkpoint, setCheckpoint] = useState(2);
  const [showField, setShowField] = useState(false);
  const [track, setTrack] = useState<ScoreTrack>("open");

  if (!state) return <LoadingCopy label="Loading your week…" />;

  const now = competeNow(state);
  const showingSleep =
    state.focus.family === "health" && state.focus.id === "sleep";
  const sport = state.primary;
  const spec = sportById(sport);
  const shownTrack: ScoreTrack = spec.gps ? track : "open";
  const board = buildSplitBoard(state, sport, shownTrack, now);
  const source = sourceFromLinks(state.links);
  const youLane = board.fieldLanes.find((lane) => lane.you) ?? null;
  const ghostEffort = board.ghostEffortAt(checkpoint);
  const youEffort = youLane ? laneAtCheckpoint(youLane, checkpoint) : 0;
  const lesson = lessonFor(sport, now);
  const done = state.lessonDoneOn === now.toISOString().slice(0, 10);
  const periodDaysLeft = daysLeft(
    {
      kind: state.clock.kind,
      startsAt: board.periodStart,
      endsAt: board.periodEnd,
    },
    now,
  );

  function requireParticipate(reason: string, action: () => void) {
    if (!user) {
      setAuthReason(reason);
      setAuthOpen(true);
      return;
    }
    if (!state!.onboardingCompleted) {
      router.push("/onboarding");
      return;
    }
    action();
  }

  return (
    <SafeAreaView style={ui.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={ui.scroll}>
        <ProductHeader sourceStatus={source.status} sourceLabel={source.label} />

        {state.pendingRevealIds.length > 0 ? (
          <Card>
            <Kicker>Week complete</Kicker>
            <Text style={ui.cardTitle}>Your week settled</Text>
            <Copy>
              Place and Elo snapshots are on Athlete. Dismiss to keep racing this
              wave.
            </Copy>
            <PrimaryButton
              label="Got it"
              onPress={() => dispatch({ type: "acknowledge-reveal" })}
            />
          </Card>
        ) : null}

        {!showingSleep ? (
          <View style={{ gap: 8 }}>
            <Kicker>
              {board.periodLabel} / Weekly {spec.name.toLowerCase()}
            </Kicker>
            <Title
              line1={comparison === "self" ? "CHASE YOUR" : "FIND YOUR"}
              line2={comparison === "self" ? "OWN LINE." : "CLOSE CONTEST."}
            />
            <Copy>
              {periodDaysLeft} days left. Effort points accumulate through the
              week — not a live race or pace board.
            </Copy>
          </View>
        ) : null}

        <ChipRow>
          {SPORTS.map((item) => {
            const joined = state.ratings.find((row) => row.sport === item.id)
              ?.optedIn;
            return (
              <Chip
                key={item.id}
                label={`${item.name}${joined ? "" : " · join"}`}
                on={!showingSleep && item.id === sport}
                onPress={() =>
                  requireParticipate(
                    `Sign in to compete in ${item.name} this week.`,
                    () =>
                      dispatch({
                        type: joined ? "set-primary" : "opt-in",
                        sport: item.id as SportId,
                      }),
                  )
                }
              />
            );
          })}
        </ChipRow>

        <ChipRow>
          {HEALTH_METRICS.map((item) => {
            const joined = state.healthRatings.find(
              (row) => row.metric === item.id,
            )?.optedIn;
            const on = showingSleep && item.id === "sleep";
            return (
              <Chip
                key={item.id}
                label={`${item.name}${joined ? "" : " · join"}`}
                on={on}
                onPress={() =>
                  requireParticipate(
                    `Sign in to compete on ${item.name} this week.`,
                    () =>
                      dispatch(
                        joined
                          ? {
                              type: "set-focus",
                              focus: { family: "health", id: item.id },
                            }
                          : { type: "opt-in-health", metric: item.id },
                      ),
                  )
                }
              />
            );
          })}
        </ChipRow>

        {showingSleep ? (
          <SleepPanel
            state={state}
            now={now}
            onJoin={() =>
              requireParticipate("Sign in to compete on sleep this week.", () =>
                dispatch({ type: "opt-in-health", metric: "sleep" }),
              )
            }
            onSample={() =>
              requireParticipate("Sign in to record a sample night.", () =>
                dispatch({ type: "log-sleep" }),
              )
            }
            onLeave={() => dispatch({ type: "opt-out-health", metric: "sleep" })}
          />
        ) : null}

        {!showingSleep && spec.gps ? (
          <ChipRow>
            {(
              [
                ["open", "All efforts"],
                ["verified", "Verified only"],
              ] as const
            ).map(([id, label]) => (
              <Chip
                key={id}
                label={label}
                on={shownTrack === id}
                onPress={() => setTrack(id)}
              />
            ))}
          </ChipRow>
        ) : null}

        {!showingSleep && !board.optedIn ? (
          <View style={ui.empty}>
            <Text style={ui.cardTitle}>You are not on a track yet</Text>
            <Copy>{spec.blurb}</Copy>
            <Note>
              Joining opens today’s wave. Your board counts effort until the
              Sunday UTC reset.
            </Note>
            <PrimaryButton
              label={`Join ${spec.name} this week`}
              onPress={() =>
                requireParticipate(`Sign in to join ${spec.name} this week.`, () =>
                  dispatch({ type: "opt-in", sport }),
                )
              }
            />
          </View>
        ) : null}

        {!showingSleep && board.optedIn ? (
          <Card>
            <ChipRow>
              <Chip
                label="Your previous week"
                on={comparison === "self"}
                onPress={() => {
                  setComparison("self");
                  setShowField(false);
                }}
              />
              <Chip
                label="Nearby rivals"
                on={comparison === "field"}
                onPress={() => setComparison("field")}
              />
            </ChipRow>
            <Text style={ui.cardTitle}>
              {formatPts(youEffort)} pts
              {ghostEffort > 0
                ? ` · ${youEffort - ghostEffort >= 0 ? "+" : ""}${formatPts(youEffort - ghostEffort)} vs past you`
                : ""}
            </Text>
            <Copy>
              Place {youLane?.place ?? "—"} / {board.rows.length}. Checkpoint{" "}
              {board.checkpointLabels[checkpoint] ?? checkpoint}.
            </Copy>
            <ChipRow>
              {board.checkpointLabels.map((label, index) => (
                <Chip
                  key={label}
                  label={label}
                  on={checkpoint === index}
                  onPress={() => setCheckpoint(index)}
                />
              ))}
            </ChipRow>
            {comparison === "field" ? (
              <View style={{ gap: 6 }}>
                {board.nearby.map((lane) => (
                  <View key={lane.id} style={[ui.row, lane.you ? ui.youRow : null]}>
                    <Text style={ui.place}>{lane.place ?? "—"}</Text>
                    <View style={ui.grow}>
                      <Text style={ui.strong}>{lane.name}</Text>
                      <Text style={ui.small}>{formatPts(lane.effort)} pts</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {[
                  { label: "YOUR WEEK", value: youEffort },
                  { label: "PAST YOU", value: ghostEffort },
                ].map((row) => (
                  <View key={row.label} style={{ gap: 4 }}>
                    <Text style={ui.small}>{row.label}</Text>
                    <View style={ui.barTrack}>
                      <View
                        style={[
                          ui.barFill,
                          {
                            width: `${Math.min(100, (row.value / Math.max(board.trackMax, 1)) * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
            <GhostButton
              label={showField ? "Hide full field" : "Show full field"}
              onPress={() => setShowField((v) => !v)}
            />
            {showField
              ? board.rows.map((row) => (
                  <View key={row.id} style={[ui.row, row.you ? ui.youRow : null]}>
                    <Text style={ui.place}>{row.place}</Text>
                    <View style={ui.grow}>
                      <Text style={ui.strong}>{row.name}</Text>
                      <Text style={ui.small}>{formatPts(row.effort)} pts</Text>
                    </View>
                  </View>
                ))
              : null}
            {board.weekActivities.length > 0 ? (
              <Pressable onPress={() => router.push("/splits")}>
                <Note>
                  Latest counted import · +
                  {formatPts(activityEffort(board.weekActivities.at(-1)!))} pts
                </Note>
              </Pressable>
            ) : null}
          </Card>
        ) : null}

        <Card style={ui.lesson}>
          <Kicker>Today’s lesson</Kicker>
          <Text style={ui.cardTitle}>
            {lesson.title} · {lesson.minutes} min
          </Text>
          <Copy>{lesson.detail}</Copy>
          <PrimaryButton
            label={done ? "Done for today" : "Mark done"}
            disabled={done}
            onPress={() => dispatch({ type: "complete-lesson" })}
          />
        </Card>
      </ScrollView>

      <AuthPrompt
        open={authOpen}
        reason={authReason}
        onClose={() => setAuthOpen(false)}
      />
    </SafeAreaView>
  );
}
