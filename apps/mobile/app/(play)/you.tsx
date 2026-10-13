import {
  BACKFILL_DAYS,
  buildSplitBoard,
  competeNow,
  evidenceLabel,
  formatEloDelta,
  formatPlace,
  PROVIDERS,
  RANK_BANDS,
  rankForElo,
  sourceFromLinks,
  sportById,
  SPORTS,
  STARTING_FREEZES,
  type ProviderId,
} from "@fitness-battle/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/lib/auth-context";
import { useCompete } from "../../src/lib/compete-context";
import {
  DEVICE_PROVIDERS,
  OAUTH_PROVIDERS,
  connectProvider,
  openAuthorizeUrl,
  parseRemoteSync,
  syncProviderApi,
} from "../../src/lib/fitness-api";
import { syncAppleHealth, syncHealthConnect } from "../../src/lib/device-health";
import {
  AuthGate,
  Card,
  Copy,
  Field,
  GhostButton,
  Kicker,
  LineButton,
  LoadingCopy,
  Note,
  PrimaryButton,
  ProductHeader,
} from "../../src/ui/primitives";
import { ui } from "../../src/ui/styles";

function YouContent() {
  const { user, signOut, demoMode } = useAuth();
  const { state, dispatch } = useCompete();
  const params = useLocalSearchParams<{ tracker?: string; provider?: string }>();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const appliedTracker = useRef<string | null>(null);

  if (state && !seeded) {
    setSeeded(true);
    setName(state.name);
    setCity(state.city);
  }

  useEffect(() => {
    const tracker = typeof params.tracker === "string" ? params.tracker : null;
    const trackerProvider =
      typeof params.provider === "string" ? params.provider : "strava";
    const key = `${tracker}:${trackerProvider}`;
    if (!state || !tracker || appliedTracker.current === key) return;
    appliedTracker.current = key;
    const provider = trackerProvider as ProviderId;
    if (!OAUTH_PROVIDERS.has(provider)) return;
    if (tracker === "connected") {
      dispatch({
        type: "apply-sync",
        provider,
        activities: [],
        linkStatus: "connected",
      });
      setSyncNote(`${provider} connected. Sync to pull activities.`);
    } else if (tracker === "stub") {
      dispatch({ type: "link", provider });
      setSyncNote("Credentials are not set, so this link is a demo stub.");
    } else if (tracker === "error") {
      setSyncNote("That tracker did not connect. Sign in and try the link again.");
    }
  }, [dispatch, state, params.tracker, params.provider]);

  if (!state) return <LoadingCopy label="Loading…" />;

  const now = competeNow(state);
  const board = buildSplitBoard(state, state.primary, "open", now);
  const frozen = state.frozenPeriods.includes(board.periodStart.toISOString());
  const source = sourceFromLinks(state.links);
  const spec = sportById(state.primary);
  const lastSleep = [...state.sleepNights]
    .sort((a, b) => a.day.localeCompare(b.day))
    .at(-1);

  async function syncProvider(providerId: ProviderId) {
    setSyncNote(null);
    if (DEVICE_PROVIDERS.has(providerId)) {
      try {
        const result =
          providerId === "apple_health"
            ? await syncAppleHealth()
            : await syncHealthConnect();
        setSyncNote(result.message);
        if (result.ok) {
          dispatch({
            type: "apply-sync",
            provider: providerId,
            activities: [],
            linkStatus: "connected",
          });
        }
      } catch (error) {
        setSyncNote(error instanceof Error ? error.message : "Sync failed");
      }
      return;
    }
    if (!OAUTH_PROVIDERS.has(providerId)) return;
    const link = state!.links.find((item) => item.provider === providerId);

    if (!link?.linked || link.status === "disconnected") {
      try {
        const body = await connectProvider(providerId, user?.id);
        if (body.error) {
          setSyncNote(body.error);
          return;
        }
        if (body.authorizeUrl) {
          await openAuthorizeUrl(body.authorizeUrl);
          setSyncNote("Finish authorizing in the browser, then tap Sync.");
          return;
        }
        dispatch({ type: "link", provider: providerId });
        setSyncNote(
          body.message ?? "Demo tracker linked. This is not a live connection.",
        );
      } catch {
        dispatch({ type: "link", provider: providerId });
        setSyncNote("Offline demo link only.");
      }
      return;
    }

    try {
      const body = await syncProviderApi(providerId, user?.id);
      if (body.error) {
        setSyncNote(body.error);
        return;
      }
      const parsed = parseRemoteSync(body);
      dispatch({
        type: "apply-sync",
        provider: providerId,
        activities: parsed.activities,
        readiness: parsed.readiness,
        linkStatus: parsed.linkStatus,
      });
      if (parsed.linkStatus === "stub") {
        setSyncNote(
          `Stub sync (${body.windowKind ?? "recent"}): ${parsed.activities.length} sample activities. Not a live connection.`,
        );
      } else {
        setSyncNote(
          `Synced ${parsed.activities.length} activities${parsed.readiness.length ? `, ${parsed.readiness.length} readiness marks` : ""}.`,
        );
      }
    } catch {
      dispatch({ type: "sync", provider: providerId });
      setSyncNote("Offline demo sync applied locally.");
    }
  }

  return (
    <>
      <ProductHeader sourceStatus={source.status} sourceLabel={source.label} />

      <Card>
        <Kicker>Athlete</Kicker>
        <Text style={ui.cardTitle}>{state.name}</Text>
        <Copy>
          {state.city} · {spec.name}
          {board.you
            ? ` · ${board.you.place} / ${board.rows.length}`
            : " · Not on a field"}
        </Copy>
        {board.you ? (
          <Note>
            This week {board.you.effort.toFixed(1)} effort ·{" "}
            {board.you.distanceM >= 1000
              ? `${(board.you.distanceM / 1000).toFixed(1)} km`
              : `${board.you.movingSec} s`}
          </Note>
        ) : null}
      </Card>

      {lastSleep ? (
        <Card>
          <Kicker>Last night</Kicker>
          <Text style={ui.cardTitle}>Sleep {lastSleep.score}</Text>
          <Copy>Open My track and choose Sleep for the night and the weekly board.</Copy>
          <GhostButton label="Open sleep" onPress={() => router.push("/")} />
        </Card>
      ) : null}

      <Copy>
        {user?.email}
        {demoMode ? " · demo account" : ""}.
      </Copy>

      {state.periodResults.length > 0 ? (
        <Card>
          <Kicker>Season history</Kicker>
          {state.periodResults.slice(0, 12).map((result) => (
            <View key={result.id} style={ui.row}>
              <View style={ui.grow}>
                <Text style={ui.strong}>
                  {result.sport} ·{" "}
                  {formatPlace(result.place, result.fieldSize)}
                </Text>
                <Text style={ui.small}>
                  {result.track} ·{" "}
                  {formatEloDelta(result.eloBefore, result.eloAfter)}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {demoMode ? (
        <Card>
          <Text style={ui.cardTitle}>Demo week close</Text>
          <Copy>
            Settlement normally runs when you open the app after the Sunday UTC
            wave reset. This advances the clock so you can preview the
            week-complete reveal and season history.
          </Copy>
          <LineButton
            label="Close this week now"
            onPress={() => dispatch({ type: "debug-close-week" })}
          />
          {state.demoNow ? (
            <Note>
              Demo clock pinned to{" "}
              {new Date(state.demoNow).toLocaleString("en-US", {
                timeZone: "UTC",
              })}{" "}
              UTC.
            </Note>
          ) : null}
        </Card>
      ) : null}

      {!state.onboardingCompleted ? (
        <Card>
          <Text style={ui.cardTitle}>Finish setup</Text>
          <Copy>
            Preferences and the optional {BACKFILL_DAYS}-day calibration live in
            onboarding.
          </Copy>
          <PrimaryButton
            label="Continue onboarding"
            onPress={() => router.push("/onboarding")}
          />
        </Card>
      ) : null}

      <Card>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="City" value={city} onChangeText={setCity} />
        <PrimaryButton
          label="Save"
          onPress={() => {
            if (name.trim()) dispatch({ type: "rename", name });
            if (city.trim()) dispatch({ type: "set-city", city });
          }}
        />
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Sports</Text>
        {SPORTS.map((sport) => {
          const rating = state.ratings.find((item) => item.sport === sport.id);
          const primary = state.primary === sport.id;
          return (
            <View key={sport.id} style={ui.row}>
              <View style={ui.grow}>
                <Text style={ui.strong}>
                  {sport.name}
                  {primary ? " · primary" : ""}
                </Text>
                <Text style={ui.small}>
                  Verified {rating?.verifiedElo} · Open {rating?.openElo} ·{" "}
                  {rankForElo(rating?.openElo ?? 1000).name}
                </Text>
              </View>
              <GhostButton
                label={primary ? "Primary" : "Make primary"}
                onPress={() => dispatch({ type: "set-primary", sport: sport.id })}
              />
            </View>
          );
        })}
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Week freezes</Text>
        <Copy>
          {state.freezesLeft} of {STARTING_FREEZES} left. A freeze holds Elo for
          a taper or a vacation.
        </Copy>
        <PrimaryButton
          label={frozen ? "This week is frozen" : "Freeze this week"}
          disabled={frozen || state.freezesLeft <= 0}
          onPress={() => dispatch({ type: "freeze" })}
        />
      </Card>

      <Card>
        <Text style={ui.cardTitle}>{BACKFILL_DAYS}-day calibration</Text>
        {state.calibrated ? (
          <Copy>History is locked in. This one-time calibration cannot run again.</Copy>
        ) : (
          <>
            <Copy>
              Import a sample of the last {BACKFILL_DAYS} days once to leave the
              1000 baseline.
            </Copy>
            {(["light", "steady", "heavy"] as const).map((level) => (
              <LineButton
                key={level}
                label={`Import ${level} history`}
                onPress={() => dispatch({ type: "import-history", level })}
              />
            ))}
          </>
        )}
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Connections</Text>
        <Note>
          Cloud trackers open their authorize page when API keys are set.
          Without keys the link stays a stub. Apple Health and Health Connect
          sync on this phone.
        </Note>
        {PROVIDERS.map((provider) => {
          const link = state.links.find((item) => item.provider === provider.id);
          const status = link?.status ?? "disconnected";
          const device = DEVICE_PROVIDERS.has(provider.id);
          return (
            <View key={provider.id} style={ui.row}>
              <View style={ui.grow}>
                <Text style={ui.strong}>{provider.name}</Text>
                <Text style={ui.small}>
                  {provider.blurb}
                  {link?.linked
                    ? ` · ${evidenceLabel(status === "stub" ? "stub" : status === "connected" ? "receiving_data" : "disconnected")}`
                    : ""}
                </Text>
              </View>
              <GhostButton
                label={device ? "Sync phone" : link?.linked ? "Sync" : "Link"}
                onPress={() => void syncProvider(provider.id)}
              />
            </View>
          );
        })}
        {syncNote ? <Note>{syncNote}</Note> : null}
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Levels</Text>
        {RANK_BANDS.map((band) => (
          <View key={band.name} style={ui.row}>
            <View style={ui.grow}>
              <Text style={ui.strong}>{band.name}</Text>
              <Text style={ui.small}>
                {band.min}+ · {band.blurb}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <LineButton label="Pace board" onPress={() => router.push("/pace")} />
      <LineButton label="Race rankings" onPress={() => router.push("/rankings")} />
      <LineButton label="Privacy Policy" onPress={() => router.push("/privacy")} />
      <LineButton label="Sign out" onPress={() => void signOut()} />
    </>
  );
}

export default function YouScreen() {
  return (
    <SafeAreaView style={ui.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled">
        <AuthGate reason="You is your profile, connections, and freezes. Sign in to open it.">
          <YouContent />
        </AuthGate>
      </ScrollView>
    </SafeAreaView>
  );
}
