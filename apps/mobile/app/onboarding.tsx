import {
  BACKFILL_DAYS,
  HEALTH_METRICS,
  PROVIDERS,
  SPORTS,
  type SportId,
} from "@fitness-battle/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../src/lib/auth-context";
import { resolveSafePostLoginPath } from "../src/lib/auth-redirect";
import { useCompete } from "../src/lib/compete-context";
import {
  connectProvider,
  openAuthorizeUrl,
} from "../src/lib/fitness-api";
import {
  AuthGate,
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
} from "../src/ui/primitives";
import { ui } from "../src/ui/styles";

type Step = "prefs" | "connect" | "backfill" | "done";

function OnboardingFlow() {
  const { user } = useAuth();
  const { state, dispatch } = useCompete();
  const params = useLocalSearchParams<{ next?: string }>();
  const [step, setStep] = useState<Step>("prefs");
  const [name, setName] = useState(user?.displayName ?? "");
  const [city, setCity] = useState("Toronto");
  const [sport, setSport] = useState<SportId>("running");
  const [trackSleep, setTrackSleep] = useState(false);
  const [level, setLevel] = useState<"light" | "steady" | "heavy">("steady");
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!state) return <LoadingCopy label="Loading…" />;

  if (state.onboardingCompleted) {
    return (
      <Card>
        <Kicker>You are set</Kicker>
        <Text style={ui.title}>Onboarding already finished</Text>
        <Copy>
          Preferences and the one-time {BACKFILL_DAYS}-day calibration cannot be
          run again.
        </Copy>
        <PrimaryButton label="Back to Today" onPress={() => router.replace("/")} />
      </Card>
    );
  }

  function savePrefs() {
    if (name.trim()) dispatch({ type: "rename", name });
    if (city.trim()) dispatch({ type: "set-city", city });
    dispatch({ type: "set-primary", sport });
    if (trackSleep) dispatch({ type: "opt-in-health", metric: "sleep" });
    if (trackSleep)
      dispatch({ type: "set-focus", focus: { family: "sport", id: sport } });
    setStep("connect");
  }

  async function connectTracker() {
    setBusy(true);
    setConnectMessage(null);
    try {
      const body = await connectProvider("strava", user?.id);
      if (body.error) {
        setConnectMessage(body.error);
        return;
      }
      if (body.authorizeUrl) {
        await openAuthorizeUrl(body.authorizeUrl);
        setConnectMessage("Finish authorizing in the browser, then continue.");
        setStep("backfill");
        return;
      }
      dispatch({ type: "link", provider: "strava" });
      setConnectMessage(
        body.message ??
          "Demo tracker linked (stub). Live Strava needs API keys on the server.",
      );
      setStep("backfill");
    } catch {
      setConnectMessage("Could not reach the connect route. You can skip for now.");
    } finally {
      setBusy(false);
    }
  }

  function runBackfill() {
    dispatch({ type: "import-history", level });
    setStep("done");
  }

  function finish() {
    dispatch({ type: "complete-onboarding" });
    const next = resolveSafePostLoginPath(
      typeof params.next === "string" ? params.next : null,
    );
    router.replace(next as "/");
  }

  const stepNum =
    step === "prefs" ? "1" : step === "connect" ? "2" : step === "backfill" ? "3" : "4";

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 8 }}>
        <Kicker>Setup · step {stepNum} of 4</Kicker>
        <Text style={ui.title}>
          {step === "prefs" && "Your training profile"}
          {step === "connect" && "Link a tracker"}
          {step === "backfill" && `${BACKFILL_DAYS}-day calibration`}
          {step === "done" && "You are ready"}
        </Text>
        <Copy>
          {step === "prefs" &&
            "Name, city, and primary sport. You can change these later on You."}
          {step === "connect" &&
            "Strava is the cloud default. Without keys this step stays an honest stub. Phone health syncs from Connections."}
          {step === "backfill" &&
            `Import a sample of the last ${BACKFILL_DAYS} days once. This sets your starting level and cannot be repeated.`}
          {step === "done" &&
            "Join a board when you want. Browsing My track and Pace stays open without competing."}
        </Copy>
      </View>

      {step === "prefs" ? (
        <Card>
          <Field label="Display name" value={name} onChangeText={setName} maxLength={32} />
          <Field label="City" value={city} onChangeText={setCity} maxLength={40} />
          <ChipRow>
            {SPORTS.map((item) => (
              <Chip
                key={item.id}
                label={item.name}
                on={sport === item.id}
                onPress={() => setSport(item.id)}
              />
            ))}
          </ChipRow>
          <Note>Health metrics use last night, not distance.</Note>
          <ChipRow>
            {HEALTH_METRICS.map((item) => (
              <Chip
                key={item.id}
                label={`${item.name}${trackSleep ? "" : " · add"}`}
                on={trackSleep}
                onPress={() => setTrackSleep((on) => !on)}
              />
            ))}
          </ChipRow>
          <PrimaryButton label="Continue" onPress={savePrefs} />
        </Card>
      ) : null}

      {step === "connect" ? (
        <Card>
          {PROVIDERS.filter((p) => p.id === "strava").map((provider) => (
            <View key={provider.id} style={ui.row}>
              <View style={ui.grow}>
                <Text style={ui.strong}>{provider.name}</Text>
                <Text style={ui.small}>{provider.blurb}</Text>
              </View>
            </View>
          ))}
          {connectMessage ? <Note>{connectMessage}</Note> : null}
          <PrimaryButton
            label={busy ? "Connecting…" : "Link Strava"}
            disabled={busy}
            onPress={() => void connectTracker()}
          />
          <LineButton label="Skip for now" onPress={() => setStep("backfill")} />
        </Card>
      ) : null}

      {step === "backfill" ? (
        <Card>
          {state.calibrated ? (
            <Copy>Calibration already finished on this device.</Copy>
          ) : (
            <>
              <Copy>
                Pick a history volume that matches how you have been training.
              </Copy>
              <ChipRow>
                {(["light", "steady", "heavy"] as const).map((id) => (
                  <Chip
                    key={id}
                    label={id}
                    on={level === id}
                    onPress={() => setLevel(id)}
                  />
                ))}
              </ChipRow>
              <PrimaryButton label="Run one-time calibration" onPress={runBackfill} />
            </>
          )}
          <LineButton
            label={state.calibrated ? "Continue" : "Skip calibration"}
            onPress={() => setStep("done")}
          />
        </Card>
      ) : null}

      {step === "done" ? (
        <Card>
          <Copy>
            {state.calibrated
              ? `History imported. Levels start from your ${BACKFILL_DAYS}-day sample.`
              : `You can compete from the default baseline. You can still run the one-time ${BACKFILL_DAYS}-day calibration later from You, but only once.`}
          </Copy>
          <PrimaryButton label="Start competing" onPress={finish} />
          {!state.calibrated ? (
            <GhostButton label="Back to calibration" onPress={() => setStep("backfill")} />
          ) : null}
        </Card>
      ) : null}
    </View>
  );
}

export default function OnboardingScreen() {
  return (
    <SafeAreaView style={ui.safe}>
      <ScrollView contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled">
        <AuthGate reason="Create an account to finish setup, link a tracker, and run the one-time calibration.">
          <OnboardingFlow />
        </AuthGate>
      </ScrollView>
    </SafeAreaView>
  );
}
