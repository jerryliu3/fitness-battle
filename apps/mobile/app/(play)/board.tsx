import {
  buildSplitBoard,
  competeNow,
  formatClock,
  formatEffort,
  HEALTH_METRICS,
  projectedElo,
  sourceFromLinks,
  sportById,
  SPORTS,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/lib/auth-context";
import { useCompete } from "../../src/lib/compete-context";
import {
  AuthPrompt,
  Card,
  Chip,
  ChipRow,
  Copy,
  Field,
  GhostButton,
  Kicker,
  LineButton,
  LoadingCopy,
  Note,
  PrimaryButton,
  ProductHeader,
  Title,
} from "../../src/ui/primitives";
import { SleepPanel } from "../../src/ui/sleep-panel";
import { ui } from "../../src/ui/styles";

export default function FieldScreen() {
  const { state, dispatch } = useCompete();
  const { user } = useAuth();
  const [sport, setSport] = useState<SportId | null>(null);
  const [showSleep, setShowSleep] = useState(false);
  const [track, setTrack] = useState<ScoreTrack>("open");
  const [username, setUsername] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState(
    "Sign in to join the weekly field or start a 1v1.",
  );

  if (!state) return <LoadingCopy label="Loading the field…" />;

  const now = competeNow(state);
  const sleepSelected =
    showSleep || (sport == null && state.focus.family === "health");
  const active = sport ?? state.primary;
  const spec = sportById(active);
  const shownTrack: ScoreTrack = spec.gps ? track : "open";
  const board = buildSplitBoard(state, active, shownTrack, now);
  const source = sourceFromLinks(state.links);
  const rating = state.ratings.find((item) => item.sport === active);
  const nextElo = rating?.optedIn
    ? projectedElo(state, active, shownTrack, now)
    : null;
  const currentElo =
    shownTrack === "verified" ? rating?.verifiedElo : rating?.openElo;
  const frozen = state.frozenPeriods.includes(board.periodStart.toISOString());

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
        <View style={{ gap: 8 }}>
          <Kicker>
            The field ·{" "}
            {formatClock({
              startsAt: board.periodStart,
              endsAt: board.periodEnd,
              kind: state.clock.kind,
            })}
          </Kicker>
          <Title line1="THE" line2="FIELD." />
          <Copy>
            {sleepSelected
              ? "Sleep ranks last night and the week’s average. It does not use the track."
              : `Lane positions use weekly ${spec.gps ? "distance" : "effort"} — lane number is not rank.`}
          </Copy>
        </View>

        <ChipRow>
          {SPORTS.map((item) => (
            <Chip
              key={item.id}
              label={item.name}
              on={!sleepSelected && item.id === active}
              onPress={() => {
                setShowSleep(false);
                setSport(item.id);
              }}
            />
          ))}
        </ChipRow>

        <ChipRow>
          {HEALTH_METRICS.map((item) => (
            <Chip
              key={item.id}
              label={item.name}
              on={sleepSelected}
              onPress={() => {
                setShowSleep(true);
                dispatch({
                  type: "set-focus",
                  focus: { family: "health", id: item.id },
                });
              }}
            />
          ))}
        </ChipRow>

        {sleepSelected ? (
          <SleepPanel
            state={state}
            now={now}
            onJoin={() =>
              requireParticipate("Sign in to join the sleep board.", () =>
                dispatch({ type: "opt-in-health", metric: "sleep" }),
              )
            }
            onSample={() =>
              requireParticipate("Sign in to record a sample night.", () =>
                dispatch({ type: "log-sleep" }),
              )
            }
            onLeave={() => {
              dispatch({ type: "opt-out-health", metric: "sleep" });
              setShowSleep(false);
            }}
          />
        ) : spec.gps ? (
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
        ) : (
          <Note>
            Strength uses open effort as the field axis. Indoor work is not
            treated as GPS distance.
          </Note>
        )}

        {!sleepSelected && !board.optedIn ? (
          <View style={ui.empty}>
            <Text style={ui.cardTitle}>You are not on this field</Text>
            <Copy>{spec.blurb}</Copy>
            <Note>
              Fields are density groups of eight. Synthetic rivals fill empty
              seats and drop when more people join.
            </Note>
            <PrimaryButton
              label={`Join ${spec.name} this week`}
              onPress={() =>
                requireParticipate(`Sign in to join ${spec.name} this week.`, () =>
                  dispatch({ type: "opt-in", sport: active }),
                )
              }
            />
          </View>
        ) : null}

        {!sleepSelected && board.optedIn ? (
          <>
            <Card>
              <Kicker>This week’s field</Kicker>
              {board.rows.map((row) => (
                <View key={row.id} style={[ui.row, row.you ? ui.youRow : null]}>
                  <Text style={ui.place}>{row.place}</Text>
                  <View style={ui.grow}>
                    <Text style={ui.strong}>{row.name}</Text>
                    <Text style={ui.small}>{formatEffort(row.effort)} effort</Text>
                  </View>
                </View>
              ))}
              <Note>
                {frozen
                  ? "This week is frozen. Rating will not move when it closes."
                  : board.you && nextElo != null && currentElo != null
                    ? `If the week ended now, ${shownTrack} rating would be ${nextElo} (${nextElo - currentElo >= 0 ? "+" : ""}${nextElo - currentElo}).`
                    : "Rating updates when the week closes."}
              </Note>
              <GhostButton
                label="Leave this field"
                onPress={() => dispatch({ type: "opt-out", sport: active })}
              />
            </Card>
          </>
        ) : null}

        <Card>
          <Text style={ui.cardTitle}>1v1 this week</Text>
          <Copy>
            One opponent, same weekly window. Auto match picks the closest
            rating.
          </Copy>
          {board.duels.map((view) => {
            const total = view.youEffort + view.rivalEffort || 1;
            return (
              <View key={view.duel.id} style={{ gap: 8 }}>
                <View style={ui.row}>
                  <View style={ui.grow}>
                    <Text style={ui.strong}>You</Text>
                    <Text style={ui.small}>
                      {formatEffort(view.youEffort)} effort
                    </Text>
                  </View>
                  <View style={[ui.grow, { alignItems: "flex-end" }]}>
                    <Text style={ui.strong}>{view.duel.rivalName}</Text>
                    <Text style={ui.small}>
                      {formatEffort(view.rivalEffort)} effort
                    </Text>
                  </View>
                </View>
                <View style={ui.barTrack}>
                  <View
                    style={[
                      ui.barFill,
                      { width: `${(view.youEffort / total) * 100}%` },
                    ]}
                  />
                </View>
                <Note>
                  {view.leading === "tie"
                    ? "Level right now."
                    : view.leading === "you"
                      ? "You are ahead."
                      : `${view.duel.rivalName} is ahead.`}
                  {view.duel.source === "invite" ? " Invited." : " Auto matched."}
                </Note>
              </View>
            );
          })}
          {board.duels.length === 0 ? (
            <>
              <PrimaryButton
                label="Auto match"
                onPress={() =>
                  requireParticipate("Sign in to start a 1v1.", () =>
                    dispatch({ type: "duel", sport: active, mode: "auto" }),
                  )
                }
              />
              <Field
                label="Username"
                value={username}
                placeholder="Maya Chen"
                onChangeText={setUsername}
              />
              <LineButton
                label="Send invite"
                onPress={() =>
                  requireParticipate("Sign in to send a 1v1 invite.", () =>
                    dispatch({
                      type: "duel",
                      sport: active,
                      mode: "invite",
                      username,
                    }),
                  )
                }
              />
            </>
          ) : null}
        </Card>
      </ScrollView>

      <AuthPrompt
        open={authOpen}
        reason={authReason}
        nextPath="/board"
        onClose={() => setAuthOpen(false)}
      />
    </SafeAreaView>
  );
}
