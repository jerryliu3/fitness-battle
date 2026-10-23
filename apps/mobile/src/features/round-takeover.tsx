import { MotionStep } from "../ui/motion-step";
import { useAuth } from "../lib/auth";
import {
  APP_TIMEZONE,
  roundReveal,
  roundEnrollment,
  sportById,
  type Action,
  type CompeteState,
  type PeriodResult,
} from "@fitness-battle/shared";
import { usePathname, useRouter, useGlobalSearchParams } from "expo-router";
import { useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WeeklySocialActions } from "./weekly-social";
import { ResultCard } from "./result-card";
import { FocusButton, f } from "../ui/focus";
function Round({
  state,
  rows,
  onClose,
}: {
  state: CompeteState;
  rows: PeriodResult[];
  onClose: () => void;
}) {
  const [next, setNext] = useState(false);
  const router = useRouter();
  return (
    <Modal
      visible
      presentationStyle="fullScreen"
      animationType="slide"
      onRequestClose={() => { /* Complete both stages before acknowledging results. */ }}
    >
      <SafeAreaProvider>
      <SafeAreaView style={f.safe}>
        <ScrollView contentContainerStyle={f.content}>
          <MotionStep identity={next ? "next" : "results"}>
          <Text style={f.kicker}>
            Round complete · {next ? "2 / 2" : "1 / 2"}
          </Text>
          <Text style={f.title}>
            {next ? "Keep it going." : "Your week, settled."}
          </Text>
          {!next ? (
            <>
              {rows.map((result) => (
                <View key={result.id}>
                  <ResultCard result={result} units={state.units} />
                  <WeeklySocialActions result={result} units={state.units} />
                </View>
              ))}
              <FocusButton label="Next round →" onPress={() => setNext(true)} />
            </>
          ) : (
            <>
              {rows.map((result) => {
                const enrollment = roundEnrollment(state, result);
                return (
                  <Text key={result.id} style={f.copy}>
                    {sportById(result.sport).name}:{" "}
                    {enrollment.startsAt
                      ? `Your current round ${enrollment.status === "upcoming" ? "starts" : "started"} ${enrollment.startsAt.toLocaleString("en-US", { timeZone: APP_TIMEZONE, timeZoneName: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. ${enrollment.renews ? "Renews after this round." : "Stops after this round."}`
                      : "You’re not registered for another round. Update sport settings to join again."}
                  </Text>
                );
              })}
              <FocusButton
                label="Update sport settings"
                secondary
                onPress={() => {
                  onClose();
                  router.push("/athlete-settings?panel=preferences");
                }}
              />
              <FocusButton label="Done" onPress={onClose} />
            </>
          )}
          </MotionStep>
        </ScrollView>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
export function RoundTakeover({
  state,
  ready,
  dispatch,
}: {
  state: CompeteState;
  ready: boolean;
  dispatch: (action: Action) => void;
}) {
  const { user } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const replay = useGlobalSearchParams().results === "latest";
  const reveal = roundReveal(
    replay
      ? {
          ...state,
          periodResults: state.periodResults.map((row) => ({
            ...row,
            acknowledgedAt: null,
          })),
        }
      : state,
  );
  if (!ready || path !== "/arena" || !replay || !reveal) return null;
  return (
    <Round
      key={`${user?.id ?? "guest"}:${reveal.key}`}
      state={state}
      rows={reveal.results}
      onClose={() => {
        dispatch({ type: "acknowledge-reveal", revealIds: reveal.ids });
        if (replay) router.replace("/arena");
      }}
    />
  );
}
