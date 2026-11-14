import { AppearanceControl } from "../src/ui/appearance-control";
import { useFocusStyles } from "../src/ui/focus";
import { createThemedStyles, useThemedStyles, useThemeColors } from "../src/theme";
import { Toast } from "../src/ui/toast";
import { playCue, playPattern } from "../src/lib/haptics";
import { HapticPreference } from "../src/ui/haptic-preference";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SectionHeader, SectionStack, textStyle, AppText } from "../src/ui/section";
import { SportIcon } from "../src/ui/sport-icon";
import { activityFromSample } from "@fitness-battle/shared";
import { GlassDismissButton, ScreenHeader } from "../src/ui/screen-header";
import { AppIcon } from "../src/ui/app-icon";
import { IntegrationIcon } from "../src/ui/integration-icon";

import { ChoicePicker } from "../src/ui/choice-picker";
import {
  SPORTS,
  primaryFreezePeriodStart,
  competeNow,
  clubLifetimeTotals,
  formatDistanceM,
  distanceUnitLabel,
  personalRecordHistory,
  formatClockTime,
  RECORD_DISTANCES,
  competitionTrack,
  effortPointProgress,
  type ProviderId,
  webProductPath,
} from "@fitness-battle/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "heroui-native/button";
import { Input } from "heroui-native/input";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountActions } from "../src/features/account-actions";
import { LegalLinks } from "../src/features/legal-links";
import { AthleteMetrics } from "../src/features/athlete-metrics";
import { SettingsRow } from "../src/ui/settings-row";
import { DataSyncActions } from "../src/features/data-sync-actions";
import { mobileEnv } from "../src/lib/env";
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
import { SHELL_RADIUS } from "../src/theme";
import { FocusButton, FocusSegments, FocusSheet, FocusSidePanel } from "../src/ui/focus";
import { ProfilePhoto } from "../src/features/profile-photo";
import { AthleteCrest } from "../src/features/athlete-crest";
import { Achievements } from "../src/features/club-achievements";
import { AwardShelf } from "../src/ui/award-shelf";
import { athleteCardModel, awardCards } from "@fitness-battle/shared";

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

function AthleteContent({ inlineConnections = false }: { inlineConnections?: boolean }) {
const appearanceColors = useThemeColors();

const SHELL_COLORS=useThemeColors();
const f=useFocusStyles();
const styles=useThemedStyles(stylesThemes);

  const { state, dispatch } = useCompeteStore();
  const {
    user,
    loading: authLoading,
    offlineMode,
    accessToken,
    signIn,
    signUp,
    signOut,
    legacyBackup,
  } = useAuth();
  const currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  const router = useRouter();
  const params = useLocalSearchParams<{
    tracker?: string;
    provider?: string;
    panel?: AthletePanel;
    edit?: string;
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
  const [editOpen, setEditOpen] = useState(params.edit === "1");
  const [cardDragging, setCardDragging] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const panel = inlineConnections ? "connections" : params.panel ?? null;
  function setPanel(next: AthletePanel | null) {
    if (next) {
      if (panel === next) return;
      router.push({ pathname: "/athlete-settings", params: { panel: next } });
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: "/athlete", params: { edit: "1" } });
    }
  }
  const appliedTracker = useRef<string | null>(null);

  useEffect(() => {
    if (params.edit === "1") setEditOpen(true);
  }, [params.edit]);

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
      setNote("Credentials are not set. Please try again later.");
    } else if (tracker === "already_linked") {
      setNote("This account is already linked to another Overtaek account. Contact support if this is unexpected.");
    } else if (tracker === "error") {
      setNote("That tracker did not connect. Try again from the app.");
    }
    router.setParams({ tracker: undefined, provider: undefined });
    if (user) void AsyncStorage.getItem(`onboarding-connect-return:${user.id}`).then(marker => {
      if (!marker) return;
      void AsyncStorage.removeItem(`onboarding-connect-return:${user.id}`);
      router.replace("/onboarding");
    }).catch(() => {});
  }, [dispatch, params.panel, params.provider, params.tracker, router, state]);

  if (!state || authLoading) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: "center", justifyContent: "center" }]} edges={["bottom"]}>
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

  const titles = { profile: "Edit profile", connections: "Data Sync", preferences: "Preferences", scoring: "How scoring works", account: "Account" };
  const exitAthletePanel = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (panel) {
      router.replace({ pathname: "/athlete", params: { edit: "1" } });
    } else {
      router.replace("/today");
    }
  };
  const pageHeader = (
    <ScreenHeader
      localBack={Boolean(panel)}
      hidden={!panel && editOpen}
      nativeBar={!panel}
      title={panel ? titles[panel] : "Athlete"}
      onBack={exitAthletePanel}
      trailing={
        panel === "connections" && !inlineConnections ? (
          <GlassDismissButton
            label="Close Data Sync"
            onPress={exitAthletePanel}
          />
        ) : undefined
      }
    />
  );

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
      router.replace("/onboarding");
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
      const localOnly = offlineMode;
      const ingestAuth = {
        localOnly,
        lastSyncAt:
          state?.activities
            .filter((a) => a.source === providerId)
            .map((a) => a.startedAt)
            .sort()
            .at(-1) ?? null,
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
          activities: (result.activities ?? []).flatMap((sample) => {
            const activity = activityFromSample(sample, "recorded");
            return activity ? [activity] : [];
          }),
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
    if (offlineMode || !accessToken) {
      dispatch({ type: "link", provider: providerId });
      setNote(
        offlineMode
          ? "Cloud trackers need a live signed-in account."
          : "Session expired. Sign out and sign in again to connect trackers.",
      );
      return;
    }
    appliedTracker.current = null;
    setBusyProvider(providerId);
    setNote(null);
    try {
      if (inlineConnections) await AsyncStorage.setItem(`onboarding-connect-return:${user.id}`, "1");
      const result = await startCloudTrackerConnect(providerId);
      if (inlineConnections && (result.tracker || result.stub)) {
        await AsyncStorage.removeItem(`onboarding-connect-return:${user.id}`);
        router.replace("/onboarding");
      } else if (inlineConnections && result.cancelled) {
        await AsyncStorage.removeItem(`onboarding-connect-return:${user.id}`);
      }
      if (currentUser.current !== user.id) return;
      const linked = result.provider ?? providerId;
      if (result.tracker === "connected") {
        playPattern("confirm");
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
      if (inlineConnections) void AsyncStorage.removeItem(`onboarding-connect-return:${user.id}`);
      setNote(
        error instanceof Error ? error.message : "Could not start connect.",
      );
    } finally {
      setBusyProvider(null);
    }
  }

  if (!signedIn) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {pageHeader}
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <AthleteMetrics state={state} sections="profile" signedOut={!signedIn} />
          <Text style={styles.kicker}>Account</Text>

          <Text style={styles.name}>Sign in to Overtaek</Text>
          <Text style={styles.copy}>
            Create an account or sign in to sync Apple Health, connect trackers,
            and join events.
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
            <Input style={textStyle("body")}
              value={displayName}
              onChangeText={setDisplayName}
              accessibilityLabel="Display name"
              placeholder="Display name"
              autoCapitalize="words"
            />
          ) : null}
          <Input style={textStyle("body")}
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="Email"
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input style={textStyle("body")}
            value={password}
            onChangeText={setPassword}
            accessibilityLabel="Password"
            placeholder={
              authMode === "signup" ? "Password (6+ characters)" : "Password"
            }
            secureTextEntry
            autoComplete={authMode === "signup" ? "new-password" : "password"}
          />
          <Button onPress={() => void submitAuth()} isDisabled={authBusy}><AppText role="label">
            {authBusy
              ? "Working…"
              : authMode === "signin"
                ? "Sign in"
                : "Create account"}
          </AppText></Button>
          {authNote ? <Text style={styles.copy}>{authNote}</Text> : null}
          <LegalLinks />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!user) return null;
  const account = user;

  if (panel === "account") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {pageHeader}
        <ScrollView
          contentContainerStyle={f.content}
          showsVerticalScrollIndicator={false}
        >
<SectionStack divided={false}>
        <SettingsRow
          title="Blocked athletes"
          detail="Manage who you have blocked"
          onPress={() => {
            router.push("/blocked-athletes");
          }}
        />
          <AccountActions showDeleteButton={false} footer={(openDelete) => (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
              <LegalLinks />
              <Pressable accessibilityRole="button" accessibilityLabel="Delete account" onPress={openDelete}>
                <AppText role="label" style={{ color: "#b42318" }}>Delete account</AppText>
              </Pressable>
            </View>
          )} />
          <FocusButton
            label="Sign out"
            secondary
            onPress={() => setConfirmSignOut(true)}
          />
          <FocusSheet open={confirmSignOut} title="Sign out?" onClose={() => setConfirmSignOut(false)}><AppText role="body" secondary>You can sign in again to return to your account.</AppText><FocusButton label="Sign out" onPress={() => { setConfirmSignOut(false); void signOut(); }} /><FocusButton label="Cancel" secondary onPress={() => setConfirmSignOut(false)} /></FocusSheet>
        </SectionStack>
</ScrollView>
      </SafeAreaView>
    );
  }

  if (panel === "connections") {
    const providers = providersForDevice();
    const content = (<SectionStack divided={false}>
          {!inlineConnections && !state.onboardingCompleted && <FocusButton label="Continue setup →" onPress={() => router.push("/onboarding")}/>}
          <View style={styles.syncList}>
          {providers.map((provider, index) => {
            const link = state.links.find(
              (row) => row.provider === provider.id,
            );
            const showDivider = index < providers.length - 1;
            const title = (
              <>
                <IntegrationIcon provider={provider.id} />
                <Text style={[styles.rowTitle, { flex: 1 }]}>{provider.name}</Text>
              </>
            );
            if (isDeviceProvider(provider.id)) {
              const deviceId = provider.id;
              return (
                <View
                  key={deviceId}
                  style={[styles.syncRow, showDivider && styles.syncRowDivider]}
                >
                  {title}
                  <FocusButton
                    label={syncBusy ? "Syncing…" : "Sync"}
                    disabled={rowBusy}
                    onPress={() => void syncDevice(deviceId)}
                  />
                </View>
              );
            }
            if (isCloudOAuthProvider(provider.id)) {
              const cloudId = provider.id;
              const connected =
                link?.linked && link.status !== "disconnected";
              return (
                <View
                  key={cloudId}
                  style={[styles.syncRow, showDivider && styles.syncRowDivider]}
                >
                  {title}
                  {connected ? (
                    <DataSyncActions provider={cloudId} />
                  ) : (
                    <FocusButton
                      label={
                        busyProvider === provider.id
                          ? "Authorizing…"
                          : "Connect"
                      }
                      disabled={rowBusy}
                      onPress={() => void connectCloud(cloudId)}
                    />
                  )}
                </View>
              );
            }
            return (
              <View
                key={provider.id}
                style={[styles.syncRow, showDivider && styles.syncRowDivider]}
              >
                {title}
              </View>
            );
          })}
          </View>
          <Toast message={note ?? ""} onDismiss={() => setNote(null)} />
          <DataSyncActions includeCalibration={!inlineConnections}/>
        </SectionStack>);
    if (inlineConnections) return content;
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {pageHeader}
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={f.content}
          keyboardShouldPersistTaps="handled"
        >
{content}
</ScrollView>
      </SafeAreaView>
    );
  }

  if (panel === "scoring") {
    return (
      <SafeAreaView style={f.safe} edges={["top"]}>
        {pageHeader}
        <ScrollView contentContainerStyle={f.content}>
<SectionStack divided={false}>
          <AppText role="body" secondary>
            Effort score is calculated differently for each sport—distance sports weigh GPS-tracked volume,
            strength uses training time and effort points, and sleep competitions use nightly sleep quality.
          </AppText>
          <AppText role="body" secondary>
            Logging activities and joining weekly fields boosts your score; showing up to events and closing
            the week in the field moves it fastest.
          </AppText>
        </SectionStack>
</ScrollView>
      </SafeAreaView>
    );
  }

  if (panel === "preferences" || panel === "profile") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {pageHeader}
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={f.content}
          keyboardShouldPersistTaps="handled"
        >
<SectionStack divided={false}>
          {panel === "preferences" && <AppearanceControl />}
          {panel === "profile" ? (
            <>
              <Input style={textStyle("body")}
                value={draftName}
                onChangeText={setName}
                accessibilityLabel="Name"
                maxLength={32}
                placeholder="Name"
              />
              <Input style={textStyle("body")}
                value={draftCity}
                onChangeText={setCity}
                accessibilityLabel="City"
                maxLength={40}
                placeholder="City"
              />
              {dirty ? (
                <FocusButton
                  label="Save profile"
                  onPress={() => {
                    const trimmed = draftName.trim();
                    if (!trimmed) {
                      setNote("Display name cannot be empty.");
                      return;
                    }
                    if (trimmed !== state.name) {
                      dispatch({ type: "rename", name: trimmed });
                    }
                    const cityTrimmed = draftCity.trim();
                    if (cityTrimmed && cityTrimmed !== state.city) {
                      dispatch({ type: "set-city", city: cityTrimmed });
                    }
                    setName(null);
                    setCity(null);
                    setNote("Profile saved.");
                  }}
                />
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
                <AppText role="body" secondary  accessibilityLiveRegion="polite">
                  {note}
                </AppText>
              ) : null}
            </>
          ) : (
            <>
              <HapticPreference />
              <View style={[f.row, { minHeight: 48, alignItems: "center", justifyContent: "space-between" }]}>
                <AppText role="label">Units</AppText>
                <View style={{ width: 170 }}>
                  <FocusSegments label="Unit system" value={state.units} options={[{ value: "us", label: "Imperial" }, { value: "metric", label: "Metric" }]}
                    onChange={units => dispatch({ type: "set-units", units })} />
                </View>
              </View>
              <View style={[f.row, { minHeight: 48, alignItems: "center", justifyContent: "space-between" }]}>
                <AppText role="label">Primary sport</AppText>
                <ChoicePicker systemMenu label="Primary sport" value={state.primary} options={SPORTS.map(s => ({ value: s.id, label: s.name }))}
                  onChange={sport => dispatch({ type: "set-primary", sport })} />
              </View>
              <View style={[f.row, { minHeight: 48, alignItems: "center" }]}>
                <View style={f.grow}><AppText role="label" >Freeze this week</AppText><AppText role="body" secondary >{state.freezesLeft} remaining</AppText></View>
                <Switch style={{ alignSelf: "center", marginVertical: 0 }} trackColor={{ false: SHELL_COLORS.line, true: SHELL_COLORS.ink }} thumbColor="#ffffff" ios_backgroundColor={SHELL_COLORS.line} accessibilityLabel="Freeze this week" value={frozen} disabled={!frozen && state.freezesLeft <= 0}
                  onValueChange={enabled => enabled ? setConfirmFreeze(true) : dispatch({ type: "unfreeze" })} />
              </View>
              <SectionHeader title="Active Sports"/><AppText role="caption" secondary>Turning off a queued sport cancels registration. Started waves finish Sunday; turning off stops renewal.</AppText>
              {SPORTS.map(sport => <View key={sport.id} style={[f.row, { minHeight: 64, alignItems: "center", borderBottomWidth: 1, borderBottomColor: SHELL_COLORS.line }]}>
                <View style={[f.row, f.grow, { justifyContent: "flex-start", gap: 10 }]}><SportIcon sport={sport.id} /><AppText role="label" >{sport.name}</AppText></View>
                <Switch style={{ alignSelf: "center", marginVertical: 0 }} trackColor={{ false: SHELL_COLORS.line, true: SHELL_COLORS.ink }} thumbColor="#ffffff" ios_backgroundColor={SHELL_COLORS.line} accessibilityLabel={`Toggle ${sport.name} active status`}
                  value={Boolean(state.ratings.find(r => r.sport === sport.id)?.optedIn) && state.enrollments.find(e => e.sport === sport.id)?.autoEnrollNext !== false}
                  onValueChange={enabled => {
                    const enrollment = state.enrollments.find(e => e.sport === sport.id);
                    const queued = enrollment && Date.parse(enrollment.waveStart) > competeNow(state).getTime();
                    dispatch(enabled ? enrollment ? { type: "resume-renewal", sport: sport.id } : { type: "opt-in", sport: sport.id, crewBoard: null } : { type: queued ? "opt-out" : "schedule-leave", sport: sport.id });
                  }} />
              </View>)}
              <FocusSheet
                open={confirmFreeze}
                title="Freeze this week?"
                body="Your weekly score adjustment is held this week. Activity milestones still count. You can undo this before the week ends."
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
        </SectionStack>
</ScrollView>
      </SafeAreaView>
    );
  }

  const now = competeNow(state);
  const season = clubLifetimeTotals(state);
  const unit = distanceUnitLabel(state.units);
  const records = personalRecordHistory(state, now);
  const awards = awardCards(state);
  const topRecords = records.slice(0, 3);
  const primaryTrack = competitionTrack(state.primary);
  const primaryRating = state.ratings.find(r => r.sport === state.primary);
  const effortModel = effortPointProgress(state, state.primary, primaryTrack);
  const effortScore = effortModel?.score ?? (primaryRating ? (primaryTrack === "verified" ? primaryRating.verifiedElo : primaryRating.openElo) : 1000);
  const profileShareUrl = useMemo(() => {
    const origin = mobileEnv.apiUrl.replace(/\/$/, "");
    const path = webProductPath("/athlete");
    const query = user?.id ? `?id=${encodeURIComponent(user.id)}` : "";
    return `${origin}${path}${query}`;
  }, [user?.id]);

  const copyProfileShareUrl = () => {
    const copy =
      Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard
        ? navigator.clipboard.writeText(profileShareUrl)
        : Promise.resolve(Clipboard.setString(profileShareUrl));
    void copy
      .then(() => {
        setNote("Link copied.");
        void playCue("success");
      })
      .catch(() => setNote("Could not copy link."));
  };

  return (
    <View style={styles.safe}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {pageHeader}
      <ScrollView
        automaticallyAdjustKeyboardInsets
        scrollEnabled={!cardDragging}
        contentContainerStyle={f.content}
        keyboardShouldPersistTaps="handled"
      >
<SectionStack divided={false}>

        <View
          style={{
            position: "relative",
            zIndex: cardDragging ? 200 : 50,
            elevation: cardDragging ? 200 : 50,
            overflow: "visible",
          }}
        >
          <AthleteCrest
            key={user?.id ?? "guest"}
            model={athleteCardModel(state, now)}
            onInteractionChange={setCardDragging}
          />
        </View>

        <View style={[f.row, { gap: 8, alignItems: "stretch" }]}>
          <View
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              minHeight: 48,
              paddingLeft: 14,
              paddingRight: 6,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: SHELL_COLORS.line,
              borderRadius: SHELL_RADIUS.pill,
              backgroundColor: SHELL_COLORS.card,
            }}
          >
            <AppText
              role="caption"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ flex: 1, minWidth: 0 }}
              accessibilityLabel={`Public profile link: ${profileShareUrl}`}
            >
              {profileShareUrl}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copy link"
              onPress={copyProfileShareUrl}
              style={({ pressed }) => ({
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: SHELL_RADIUS.pill,
                borderWidth: 1,
                borderColor: SHELL_COLORS.line,
                backgroundColor: appearanceColors.paper,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <AppText role="caption">Copy</AppText>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={() => setEditOpen(true)}
            style={({ pressed }) => [
              f.button,
              f.secondary,
              { flexShrink: 0, paddingHorizontal: 14, gap: 6 },
              pressed && { opacity: 0.78 },
            ]}
          >
            <AppIcon name="edit" size={18} />
            <Text style={[f.buttonText, { color: appearanceColors.ink }]}>Edit profile</Text>
          </Pressable>
        </View>

        {/* Achievements section under Athlete Crest */}
        <Achievements state={state} />

        {/* Awards Shelf under Athlete Crest */}
        {awards.length > 0 && (
          <View style={f.section}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <SectionHeader title="Podium & Awards" subtitle="Season awards and battle honors" />
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/progress-achievements")}
              >
                <AppText role="caption" secondary>View all →</AppText>
              </Pressable>
            </View>
            <AwardShelf cards={awards} />
          </View>
        )}

        {/* Since the first mile stats */}
        <View style={f.section}>
          <SectionHeader title="Since the first mile" subtitle="Counted training · 2026" />
          <View style={[f.row, { paddingVertical: 12, justifyContent: "space-around" }]}>
            <View style={{ alignItems: "center", gap: 4, flex: 1 }}>
              <AppText role="display">{formatDistanceM(season.meters, state.units)}</AppText>
              <AppText role="caption" secondary>{unit} total</AppText>
            </View>
            <View style={{ alignItems: "center", gap: 4, flex: 1 }}>
              <AppText role="display">{season.sessions}</AppText>
              <AppText role="caption" secondary>Sessions</AppText>
            </View>
            <View style={{ alignItems: "center", gap: 4, flex: 1 }}>
              <AppText role="display">{season.weeks}</AppText>
              <AppText role="caption" secondary>Active weeks</AppText>
            </View>
            <View style={{ alignItems: "center", gap: 4, flex: 1 }}>
              <AppText role="display">{state.lifetimeOvertakes ?? 0}</AppText>
              <AppText role="caption" secondary>Overtakes</AppText>
            </View>
          </View>
        </View>

        {/* A few proud moments */}
        <View style={f.section}>
          <SectionHeader title="A few proud moments" subtitle="Milestones earned by showing up" />
          <View style={[f.row, { gap: 12 }]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/progress-history")}
              style={[f.card, { flex: 1, padding: 14, backgroundColor: SHELL_COLORS.card, gap: 4 }]}
            >
              <AppText role="label">Four weeks strong</AppText>
              <AppText role="caption" secondary>4 active weeks in a row</AppText>
            </Pressable>
            {topRecords[0] ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/progress-achievements")}
                style={[f.card, { flex: 1, padding: 14, backgroundColor: SHELL_COLORS.card, gap: 4 }]}
              >
                <AppText role="label">A new best</AppText>
                <AppText role="caption" secondary>
                  {formatClockTime(topRecords[0].seconds)} · Fastest {RECORD_DISTANCES[topRecords[0].sport]?.find((d) => d.id === topRecords[0].distanceId)?.label ?? topRecords[0].distanceId}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>

        {!state.onboardingCompleted ? (
          <View style={f.card}>
            <SectionHeader title="Finish setup"/>
            <FocusButton
              label="Continue onboarding"
              onPress={() => router.push("/onboarding")}
            />
          </View>
        ) : null}
      </SectionStack>
    </ScrollView>
    </SafeAreaView>

    {/* Side Panel for Edit Profile & Settings (not a bottom sheet) */}
    <FocusSidePanel
      open={editOpen}
      title="Edit profile"
      headerDivider={false}
      onClose={() => {
        setEditOpen(false);
        if (params.edit) {
          router.setParams({ edit: undefined });
        }
      }}
    >
      <View style={{ gap: 16 }}>
        <ProfilePhoto state={state} editSize={168} />
        <View style={{ gap: 8 }}>
          <Input
            style={textStyle("body")}
            value={draftName}
            onChangeText={setName}
            accessibilityLabel="Name"
            maxLength={32}
            placeholder="Name"
          />
          <Input
            style={textStyle("body")}
            value={draftCity}
            onChangeText={setCity}
            accessibilityLabel="City"
            maxLength={40}
            placeholder="City"
          />
        </View>
        {dirty ? (
          <FocusButton
            label="Save profile"
            onPress={() => {
              const trimmed = draftName.trim();
              if (!trimmed) {
                setNote("Display name cannot be empty.");
                return;
              }
              if (trimmed !== state.name) {
                dispatch({ type: "rename", name: trimmed });
              }
              const cityTrimmed = draftCity.trim();
              if (cityTrimmed && cityTrimmed !== state.city) {
                dispatch({ type: "set-city", city: cityTrimmed });
              }
              setName(null);
              setCity(null);
              setNote("Profile saved.");
            }}
          />
        ) : null}
        {note ? (
          <AppText role="body" secondary accessibilityLiveRegion="polite">
            {note}
          </AppText>
        ) : null}
      </View>

      <View style={{ gap: 8, marginTop: 16 }}>
        <SectionHeader title="Settings" />
        <SettingsRow
          title="Data Sync"
          detail="Trackers & history"
          onPress={() => {
            setPanel("connections");
          }}
        />
        <SettingsRow
          title="Preferences"
          detail="Units, sports & freezes"
          onPress={() => {
            setPanel("preferences");
          }}
        />
        <SettingsRow
          title="Notifications"
          detail="Your updates, your choice"
          onPress={() => {
            router.push({ pathname: "/notifications", params: { returnTo: "edit" } });
          }}
        />
        <SettingsRow
          title="How scoring works"
          detail="Levels & eligibility"
          onPress={() => {
            setPanel("scoring");
          }}
        />

        <SettingsRow
          title="Account"
          detail="Sign out, report an issue & delete account"
          onPress={() => {
            setPanel("account");
          }}
        />
      </View>
    </FocusSidePanel>
    {note ? <Toast message={note} onDismiss={() => setNote(null)} /> : null}
    </View>
  );
}

const stylesThemes = createThemedStyles(themeColors=>{const SHELL_COLORS=themeColors;return {
  safe: { flex: 1, backgroundColor: SHELL_COLORS.paper },
  scroll: { padding: 20, gap: 28, paddingBottom: 32 },
  kicker: {
    ...textStyle("label"),
    color: SHELL_COLORS.muted
},
  name: {
    ...textStyle("display"),
    color: SHELL_COLORS.ink,
  },
  section: {
    ...textStyle("heading"),
    marginTop: 8,
    color: SHELL_COLORS.ink
},
  row: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SHELL_RADIUS.control,
    backgroundColor: SHELL_COLORS.card,
    borderWidth: 1,
    borderColor: SHELL_COLORS.line,
    gap: 12,
  },
  syncList: {
    borderRadius: SHELL_RADIUS.control,
    borderWidth: 1,
    borderColor: SHELL_COLORS.line,
    backgroundColor: SHELL_COLORS.card,
    overflow: "hidden",
  },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 56,
  },
  syncRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SHELL_COLORS.line,
  },
  rowTitle: {
    ...textStyle("label"),
    color: SHELL_COLORS.ink
},
  copy: {
    ...textStyle("body"),
    color: SHELL_COLORS.muted
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
    ...textStyle("label"),
    color: SHELL_COLORS.ink
},
};});


export function TrackerConnections() { return <AthleteContent inlineConnections/>; }
export default function AthleteScreen() { return <AthleteContent/>; }
