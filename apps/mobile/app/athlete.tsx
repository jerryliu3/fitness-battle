import {
  SPORTS,
  RANK_BANDS,
  primaryFreezePeriodStart,
  rankForElo,
  type ProviderId,
} from "@fitness-battle/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "heroui-native/button";
import { Input } from "heroui-native/input";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountActions } from "../src/features/account-actions";
import { AthleteMetrics } from "../src/features/athlete-metrics";
import { SettingsRow } from "../src/ui/settings-row";
import { DataSyncActions } from "../src/features/data-sync-actions";
import { useAuth } from "../src/lib/auth";
import { useCompeteStore } from "../src/lib/compete-store";
import {
  createAppleHealthDeps,
  createHealthConnectDeps,
  syncAppleHealth,
  syncHealthConnect,
} from "../src/lib/device-health";
import { providersForDevice } from "../src/lib/platform-providers";
import {
  isCloudOAuthProvider,
  startCloudTrackerConnect,
} from "../src/lib/tracker-connect";
import { SHELL_COLORS, SHELL_RADIUS } from "../src/theme";
import {
  FocusButton,
  FocusSegments,
  FocusSheet,
  FocusTextButton,
  f,
} from "../src/ui/focus";

function isDeviceProvider(
  id: ProviderId,
): id is "apple_health" | "google_health" {
  return id === "apple_health" || id === "google_health";
}

type AuthMode = "signin" | "signup";
type AthletePanel =
  | "profile"
  | "connections"
  | "preferences"
  | "scoring"
  | "account";

export default function AthleteScreen() {
  const { state, dispatch, saveError, retrySave } = useCompeteStore();
  const {
    user,
    loading: authLoading,
    demoMode,
    accessToken,
    signIn,
    signUp,
    signOut,
  } = useAuth();
  const currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  const router = useRouter();
  const params = useLocalSearchParams<{
    tracker?: string;
    provider?: string;
    panel?: AthletePanel;
  }>();
  const [name, setName] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [confirmFreeze, setConfirmFreeze] = useState(false);
  const panel = params.panel ?? null;
  function setPanel(next: AthletePanel | null) {
    if (next)
      router.push({ pathname: "/athlete-settings", params: { panel: next } });
    else if (router.canGoBack()) router.back();
    else router.replace("/athlete");
  }
  const appliedTracker = useRef<string | null>(null);

  useEffect(() => {
    setName(null);
    setCity(null);
    setNote(null);
    setConfirmFreeze(false);
  }, [user?.id]);

  useEffect(() => {
    const tracker = typeof params.tracker === "string" ? params.tracker : null;
    const trackerProvider =
      typeof params.provider === "string" ? params.provider : "strava";
    const key = `${tracker}:${trackerProvider}`;
    if (!state || !tracker || appliedTracker.current === key) return;
    appliedTracker.current = key;
    if (!isCloudOAuthProvider(trackerProvider)) return;
    if (!params.panel) {
      router.replace({
        pathname: "/athlete-settings",
        params: { panel: "connections", tracker, provider: trackerProvider },
      });
      return;
    }
    if (tracker === "connected") {
      dispatch({
        type: "apply-sync",
        provider: trackerProvider,
        activities: [],
        linkStatus: "connected",
      });
      setNote(`${trackerProvider} connected.`);
    } else if (tracker === "stub") {
      dispatch({ type: "link", provider: trackerProvider });
      setNote("Credentials are not set, so this link is a demo stub.");
    } else if (tracker === "error") {
      setNote("That tracker did not connect. Try again from the app.");
    }
    router.setParams({ tracker: undefined, provider: undefined });
  }, [dispatch, params.panel, params.provider, params.tracker, router, state]);

  if (!state || authLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <Text style={styles.copy}>Loading account…</Text>
      </SafeAreaView>
    );
  }

  const draftName = name ?? state.name;
  const draftCity = city ?? state.city;
  const dirty = draftName !== state.name || draftCity !== state.city;
  const frozen = state.frozenPeriods.includes(primaryFreezePeriodStart(state));

  const rowBusy = syncBusy || Boolean(busyProvider);
  const signedIn = Boolean(user);

  async function submitAuth() {
    setAuthBusy(true);
    setAuthNote(null);
    try {
      if (authMode === "signin") {
        const result = await signIn(email, password);
        if (result.error) {
          setAuthNote(result.error);
          return;
        }
        setPassword("");
        setAuthNote(null);
        return;
      }
      const result = await signUp({
        email,
        password,
        displayName: displayName.trim() || email.split("@")[0] || "Athlete",
      });
      if (result.error) {
        setAuthNote(result.error);
        return;
      }
      if (result.needsEmailConfirm) {
        setAuthNote("Check your email to confirm, then sign in.");
        setAuthMode("signin");
        return;
      }
      setPassword("");
      setAuthNote(null);
    } finally {
      setAuthBusy(false);
    }
  }

  async function syncDevice(providerId: "apple_health" | "google_health") {
    if (rowBusy) return;
    if (!user) {
      setNote("Sign in above to sync workouts to your account.");
      return;
    }
    setSyncBusy(true);
    setNote(null);
    try {
      const localOnly = user.mode === "demo" || demoMode;
      const ingestAuth = {
        localOnly,
        getAccessToken: async () => ({
          token: accessToken ?? undefined,
          userId: user.id,
        }),
      };
      const result =
        providerId === "apple_health"
          ? await syncAppleHealth(createAppleHealthDeps(ingestAuth))
          : await syncHealthConnect(createHealthConnectDeps(ingestAuth));
      if (currentUser.current !== user.id) return;
      // "Connected" means device permission (or a successful upload). Upload
      // failures keep Connected when already authorized, with a clear note.
      if (result.ok || result.authorized) {
        dispatch({
          type: "apply-sync",
          provider: providerId,
          accountId: user.id,
          activities: [],
          linkStatus: "connected",
        });
      }
      if (!result.ok) {
        setNote("Sync failed");
      } else {
        setNote(null);
      }
    } catch {
      setNote("Sync failed");
    } finally {
      setSyncBusy(false);
    }
  }

  async function connectCloud(providerId: ProviderId) {
    if (!isCloudOAuthProvider(providerId) || rowBusy) return;
    if (!user) {
      setNote("Sign in above to connect cloud trackers.");
      return;
    }
    if (user.mode === "demo" || demoMode || !accessToken) {
      dispatch({ type: "link", provider: providerId });
      setNote(
        user.mode === "demo" || demoMode
          ? "Demo account — cloud trackers need a live signed-in account."
          : "Session expired. Sign out and sign in again to connect trackers.",
      );
      return;
    }
    appliedTracker.current = null;
    setBusyProvider(providerId);
    setNote(null);
    try {
      const result = await startCloudTrackerConnect(providerId);
      if (currentUser.current !== user.id) return;
      const linked = result.provider ?? providerId;
      if (result.tracker === "connected") {
        appliedTracker.current = `connected:${linked}`;
        dispatch({
          type: "apply-sync",
          provider: linked,
          activities: [],
          linkStatus: "connected",
        });
      } else if (result.stub || result.tracker === "stub") {
        appliedTracker.current = `stub:${linked}`;
        dispatch({ type: "link", provider: linked });
      }
      setNote(result.message);
    } catch (error) {
      setNote(
        error instanceof Error ? error.message : "Could not start connect.",
      );
    } finally {
      setBusyProvider(null);
    }
  }

  if (!signedIn) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <FocusTextButton
            label="← Back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/today")
            }
          />
          <AthleteMetrics state={state} sections="profile" />
          <Text style={styles.kicker}>Account</Text>

          <Text style={styles.name}>Sign in to Overtaek</Text>
          <Text style={styles.copy}>
            Create an account or sign in to sync Apple Health, connect trackers,
            and keep your battles on this device.
            {demoMode ? " Demo mode stores a local account on this phone." : ""}
          </Text>

          <View style={styles.authToggle}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAuthMode("signin");
                setAuthNote(null);
              }}
              style={[
                styles.authTab,
                authMode === "signin" ? styles.authTabOn : null,
              ]}
            >
              <Text style={styles.authTabText}>Sign in</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAuthMode("signup");
                setAuthNote(null);
              }}
              style={[
                styles.authTab,
                authMode === "signup" ? styles.authTabOn : null,
              ]}
            >
              <Text style={styles.authTabText}>Create account</Text>
            </Pressable>
          </View>

          {authMode === "signup" ? (
            <Input
              value={displayName}
              onChangeText={setDisplayName}
              accessibilityLabel="Display name"
              placeholder="Display name"
              autoCapitalize="words"
            />
          ) : null}
          <Input
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="Email"
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            value={password}
            onChangeText={setPassword}
            accessibilityLabel="Password"
            placeholder={
              authMode === "signup" ? "Password (6+ characters)" : "Password"
            }
            secureTextEntry
            autoComplete={authMode === "signup" ? "new-password" : "password"}
          />
          <Button onPress={() => void submitAuth()} isDisabled={authBusy}>
            {authBusy
              ? "Working…"
              : authMode === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>
          {authNote ? <Text style={styles.copy}>{authNote}</Text> : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!user) return null;
  const account = user;

  if (panel === "account") {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <ScrollView
          contentContainerStyle={f.content}
          showsVerticalScrollIndicator={false}
        >
          <FocusButton
            label="← Back"
            secondary
            onPress={() => setPanel(null)}
          />
          <Text style={f.kicker}>Settings</Text>
          <Text style={f.title}>Account</Text>
          <FocusButton
            label="Sign out"
            secondary
            onPress={() => void signOut()}
          />
          <AccountActions />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (panel === "connections") {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={f.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => setPanel(null)}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={f.small}>← Back</Text>
          </Pressable>
          <Text style={f.kicker}>Settings</Text>
          <Text style={f.title}>Data Sync</Text>
          {providersForDevice().map((provider) => {
            const link = state.links.find(
              (row) => row.provider === provider.id,
            );
            const status =
              link?.status === "connected"
                ? "Connected"
                : link?.status === "stub"
                  ? "Demo link"
                  : "Not connected";
            const onPhone = isDeviceProvider(provider.id);
            const cloud = isCloudOAuthProvider(provider.id);
            const hint = onPhone
              ? ` · ${syncBusy ? "Syncing…" : "Tap to sync"}`
              : cloud
                ? link?.linked
                  ? ""
                  : busyProvider === provider.id
                    ? " · authorizing…"
                    : " · tap to connect"
                : "";
            const copy = (
              <>
                <Text style={styles.rowTitle}>{provider.name}</Text>
                <Text style={styles.copy}>
                  {status}
                  {hint}
                </Text>
              </>
            );
            if (isDeviceProvider(provider.id)) {
              const deviceId = provider.id;
              return (
                <Pressable
                  key={deviceId}
                  accessibilityRole="button"
                  disabled={rowBusy}
                  onPress={() => void syncDevice(deviceId)}
                  style={styles.row}
                >
                  {copy}
                </Pressable>
              );
            }
            if (isCloudOAuthProvider(provider.id)) {
              const cloudId = provider.id;
              if (link?.linked && link.status !== "disconnected") {
                return (
                  <View key={cloudId} style={styles.row}>
                    {copy}
                    <DataSyncActions provider={cloudId} />
                  </View>
                );
              }
              return (
                <Pressable
                  key={cloudId}
                  accessibilityRole="button"
                  disabled={rowBusy}
                  onPress={() => void connectCloud(cloudId)}
                  style={styles.row}
                >
                  {copy}
                </Pressable>
              );
            }
            return (
              <View key={provider.id} style={styles.row}>
                {copy}
              </View>
            );
          })}
          {note === "Sync failed" ? (
            <Pressable
              onPress={() => setPanel("connections")}
              accessibilityRole="button"
              style={{ paddingVertical: 4 }}
            >
              <Text
                style={[
                  styles.copy,
                  { color: "#b83a38", textDecorationLine: "underline" },
                ]}
              >
                Sync failed · check Data Sync
              </Text>
            </Pressable>
          ) : note ? (
            <Text style={styles.copy}>{note}</Text>
          ) : null}
          <DataSyncActions />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (panel === "scoring") {
    return (
      <SafeAreaView style={f.safe} edges={[]}>
        <ScrollView contentContainerStyle={f.content}>
          <FocusButton
            label="← Back"
            secondary
            onPress={() => setPanel(null)}
          />
          <Text style={f.kicker}>Settings</Text>
          <Text style={f.title}>How scoring works</Text>
          <Text style={f.copy}>
            Open score includes counted sessions. GPS verified includes verified
            sessions. Sample workouts do not count toward competition.
          </Text>
          <Text style={f.copy}>
            Each event has its own effort score. Scores settle when the
            competition week closes. Stopping after this week keeps the current
            week open and turns off renewal.
          </Text>
          <Text style={f.copy}>
            A week freeze protects effort score during a rest week and can be
            undone before the week ends. A crew rest marker does not freeze
            effort score.
          </Text>
          {RANK_BANDS.map((band) => (
            <View key={band.name} style={f.card}>
              <Text style={f.h2}>
                {band.name} · {band.min}+
              </Text>
              <Text style={f.copy}>{band.blurb}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (panel === "preferences" || panel === "profile") {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={f.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => setPanel(null)}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={f.small}>← Back</Text>
          </Pressable>
          <Text style={f.kicker}>Settings</Text>
          <Text style={f.title}>
            {panel === "profile" ? "Edit profile" : "Preferences"}
          </Text>
          {panel === "profile" ? (
            <>
              <Input
                value={draftName}
                onChangeText={setName}
                accessibilityLabel="Name"
                maxLength={80}
                placeholder="Name"
              />
              <Input
                value={draftCity}
                onChangeText={setCity}
                accessibilityLabel="City"
                maxLength={40}
                placeholder="City"
              />
              {dirty ? (
                <Button
                  onPress={() => {
                    const trimmed = draftName.trim();
                    if (!trimmed) {
                      setNote("Display name cannot be empty.");
                      return;
                    }
                    dispatch({ type: "rename", name: trimmed });
                    if (draftCity.trim())
                      dispatch({ type: "set-city", city: draftCity.trim() });
                    setName(null);
                    setCity(null);
                    setNote("Profile saved.");
                  }}
                >
                  Save profile
                </Button>
              ) : null}
              {dirty ? (
                <FocusButton
                  label="Cancel profile changes"
                  secondary
                  onPress={() => {
                    setName(null);
                    setCity(null);
                  }}
                />
              ) : null}
              {note ? (
                <Text style={f.copy} accessibilityLiveRegion="polite">
                  {note}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.section}>Units</Text>
              <Text style={f.copy}>
                Distance display for Compete, Crew, and Progress. Home shows
                hours, not distance.
              </Text>
              <FocusSegments
                label="Unit system"
                value={state.units}
                options={[
                  { value: "us", label: "Imperial" },
                  { value: "metric", label: "Metric" },
                ]}
                onChange={(units) => dispatch({ type: "set-units", units })}
              />
              <Text style={f.h2}>Events</Text>
              {SPORTS.map((sport) => {
                const active =
                  state.ratings.find((r) => r.sport === sport.id)?.optedIn ??
                  false;
                const rating = state.ratings.find((r) => r.sport === sport.id);
                const score = rating?.openElo || 1000;
                return (
                  <View key={sport.id} style={f.card}>
                    <View style={f.row}>
                      <View style={f.grow}>
                        <Text style={f.rowTitle}>
                          {sport.name}
                          {state.primary === sport.id ? " · Primary" : ""}
                        </Text>
                        <Text style={f.small}>
                          Effort Score {score} · {rankForElo(score).name}
                        </Text>
                      </View>
                      <Switch
                        accessibilityLabel={`Toggle ${sport.name} active status`}
                        value={active}
                        onValueChange={(enabled) => {
                          if (!signedIn) return;
                          dispatch(
                            enabled
                              ? {
                                  type: "opt-in",
                                  sport: sport.id,
                                  crewBoard: null,
                                }
                              : { type: "opt-out", sport: sport.id },
                          );
                        }}
                      />
                    </View>
                    {state.primary !== sport.id ? (
                      <FocusTextButton
                        label="Make primary"
                        accessibilityLabel={`Make ${sport.name} primary`}
                        onPress={() => {
                          dispatch({ type: "set-primary", sport: sport.id });
                          setNote("Primary event updated.");
                        }}
                      />
                    ) : null}
                  </View>
                );
              })}
              <Text style={f.copy}>
                {state.freezesLeft} week freezes remaining. A freeze holds
                effort score during a rest week.
              </Text>
              <FocusButton
                label={frozen ? "Undo freeze" : "Freeze this week"}
                secondary
                disabled={!frozen && state.freezesLeft <= 0}
                onPress={() =>
                  frozen
                    ? dispatch({ type: "unfreeze" })
                    : setConfirmFreeze(true)
                }
              />
              {saveError ? <Text style={f.copy}>{saveError}</Text> : null}
              <FocusSheet
                open={confirmFreeze}
                title="Freeze this week?"
                body="Your effort score will be protected this week. This uses one freeze; you can undo it before the week ends."
                onClose={() => setConfirmFreeze(false)}
              >
                <FocusButton
                  label="Confirm freeze"
                  onPress={() => {
                    dispatch({ type: "freeze" });
                    setConfirmFreeze(false);
                  }}
                />
              </FocusSheet>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={f.content}
        keyboardShouldPersistTaps="handled"
      >
        <FocusTextButton
          label="← Back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/today")
          }
        />
        {saveError ? (
          <View style={f.feedback}>
            <Text style={f.copy}>{saveError}</Text>
            <FocusButton label="Retry save" secondary onPress={retrySave} />
          </View>
        ) : null}
        <AthleteMetrics
          state={state}
          sections="profile"
          email={account.email}
          demoMode={demoMode}
          onEdit={() => setPanel("profile")}
        />
        <View style={{ gap: 8 }}>
          <SettingsRow
            title="Data Sync"
            detail="Trackers & history"
            onPress={() => setPanel("connections")}
          />
          <SettingsRow
            title="Preferences"
            detail="Units, sports & freezes"
            onPress={() => setPanel("preferences")}
          />
          <SettingsRow
            title="Notifications"
            detail="Your updates, your choice"
            onPress={() => router.push("/notifications")}
          />
          <SettingsRow
            title="How scoring works"
            detail="Levels & eligibility"
            onPress={() => setPanel("scoring")}
          />
          <SettingsRow
            title="Account"
            detail="Sign out, report an issue & delete account"
            onPress={() => setPanel("account")}
          />
        </View>
        {!state.onboardingCompleted ? (
          <View style={f.card}>
            <Text style={f.h2}>Finish setup</Text>
            <FocusButton
              label="Continue onboarding"
              onPress={() => router.push("/onboarding")}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SHELL_COLORS.paper },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  kicker: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: SHELL_COLORS.muted,
  },
  name: {
    fontFamily: "DMSans_700Bold",
    fontSize: 28,
    color: SHELL_COLORS.ink,
  },
  section: {
    marginTop: 8,
    fontFamily: "DMSans_700Bold",
    color: SHELL_COLORS.ink,
    fontSize: 16,
  },
  row: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SHELL_RADIUS.control,
    backgroundColor: SHELL_COLORS.card,
    borderWidth: 1,
    borderColor: SHELL_COLORS.line,
    gap: 2,
  },
  rowTitle: {
    fontFamily: "DMSans_700Bold",
    color: SHELL_COLORS.ink,
    fontSize: 16,
  },
  copy: {
    fontFamily: "DMSans_400Regular",
    color: SHELL_COLORS.muted,
    fontSize: 14,
  },
  authToggle: { flexDirection: "row", gap: 8 },
  authTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: SHELL_RADIUS.control,
    borderWidth: 1,
    borderColor: SHELL_COLORS.line,
    backgroundColor: SHELL_COLORS.card,
  },
  authTabOn: {
    borderColor: SHELL_COLORS.ink,
    backgroundColor: SHELL_COLORS.greenSoft,
  },
  authTabText: {
    fontFamily: "DMSans_700Bold",
    color: SHELL_COLORS.ink,
    fontSize: 15,
  },
});
