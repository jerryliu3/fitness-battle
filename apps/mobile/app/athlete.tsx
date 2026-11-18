import { useFocusStyles } from "../src/ui/focus";
import { createThemedStyles, useThemedStyles, useThemeColors } from "../src/theme";
import { Toast } from "../src/ui/toast";
import { playCue, playPattern } from "../src/lib/haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SectionHeader, SectionStack, textStyle, AppText } from "../src/ui/section";
import { AthletePreferencesFields } from "../src/features/athlete-preferences";
import { activityFromSample } from "@fitness-battle/shared";
import { ScreenHeader } from "../src/ui/screen-header";
import { AppIcon } from "../src/ui/app-icon";
import { IntegrationIcon } from "../src/ui/integration-icon";

import {
  sportById,
  primaryFreezePeriodStart,
  competeNow,
  formatMemberSince,
  clubLifetimeTotals,
  formatDistanceM,
  distanceUnitLabel,
  personalRecordHistory,
  formatClockTime,
  RECORD_DISTANCES,
  RANK_BANDS,
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
import { FitnessHistoryImport } from "../src/features/fitness-history-import";
import { DataSyncActions } from "../src/features/data-sync-actions";
import { mobileEnv, publicProfileOrigin } from "../src/lib/env";
import { useAuth } from "../src/lib/auth";
import { GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY, readGuestIntroDraft } from "../src/lib/guest-intro";
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
import { FocusButton, FocusSheet, FocusSidePanel } from "../src/ui/focus";
import { AthleteCrest } from "../src/features/athlete-crest";
import { AthleteProfileEditor } from "../src/features/athlete-edit-panel";
import { RankSymbol } from "../src/ui/rank-symbol";
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

function AthleteContent({ inlineConnections = false, trackerPreview = false }: { inlineConnections?: boolean; trackerPreview?: boolean }) {
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
    auth?: AuthMode;
    from?: string;
    invite?: string;
  }>();
  const [note, setNote] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>(params.auth === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [confirmFreeze, setConfirmFreeze] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(params.edit === "1");
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
  const [historyOffer, setHistoryOffer] = useState<ProviderId | null>(null);
  function dismissHistory() {
    setHistoryOffer(null);
    if (user) void AsyncStorage.getItem(`onboarding-connect-return:${user.id}`).then(marker => {
      if (!marker || currentUser.current !== user.id) return;
      void AsyncStorage.removeItem(`onboarding-connect-return:${user.id}`);
      if (!inlineConnections) router.replace("/onboarding");
    }).catch(() => {});
  }

  useEffect(() => {
    if (!user && (params.auth === "signup" || params.auth === "signin")) {
      setAuthMode(params.auth);
      if (params.auth !== "signup") return;
      let alive = true;
      void readGuestIntroDraft().then(guest => {
        if (alive && guest?.name) setDisplayName(current => current || guest.name);
      }).catch(() => {});
      return () => { alive = false; };
    }
  }, [params.auth, user?.id]);

  useEffect(() => {
    if (params.edit === "1") setSettingsOpen(true);
  }, [params.edit]);

  useEffect(() => {
    setNote(null);
    setConfirmFreeze(false);
    setHistoryOffer(null);
  }, [user?.id]);

  useEffect(() => {
    const tracker = typeof params.tracker === "string" ? params.tracker : null;
    const trackerProvider =
      typeof params.provider === "string" ? params.provider : "strava";
    const key = `${tracker}:${trackerProvider}`;
    if (trackerPreview || !state || !tracker || appliedTracker.current === key) return;
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
      setHistoryOffer(trackerProvider);
    } else if (tracker === "stub") {
      dispatch({ type: "link", provider: trackerProvider });
      setNote("Credentials are not set. Please try again later.");
    } else if (tracker === "already_linked") {
      setNote("This account is already linked to another Overtaek account. Contact support if this is unexpected.");
    } else if (tracker === "error") {
      setNote("That tracker did not connect. Try again from the app.");
    }
    router.setParams({ tracker: undefined, provider: undefined });
    if (tracker !== "connected" && user) void AsyncStorage.getItem(`onboarding-connect-return:${user.id}`).then(marker => {
      if (!marker) return;
      void AsyncStorage.removeItem(`onboarding-connect-return:${user.id}`);
      router.replace("/onboarding");
    }).catch(() => {});
  }, [dispatch, params.panel, params.provider, params.tracker, router, state, trackerPreview]);

  if (!state || authLoading) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: "center", justifyContent: "center" }]} edges={["bottom"]}>
        <Text style={styles.copy}>Loading account…</Text>
      </SafeAreaView>
    );
  }

  const frozen = state.frozenPeriods.includes(primaryFreezePeriodStart(state));

  const rowBusy = syncBusy || Boolean(busyProvider);
  const signedIn = Boolean(user);
  const fromOnboarding = params.from === "onboarding" && !signedIn;

  const titles = { profile: "Edit profile", connections: "Data Sync", preferences: "Preferences", scoring: "How scoring works", account: "Account" };
  const exitAthletePanel = () => {
    if (fromOnboarding && !router.canGoBack()) {
      router.replace("/welcome");
    } else if (router.canGoBack()) {
      router.back();
    } else if (panel) {
      router.replace({ pathname: "/athlete", params: { edit: "1" } });
    } else {
      router.replace("/today");
    }
  };
  const pageHeader = (
    <ScreenHeader
      localBack={Boolean(panel) || fromOnboarding}
      hidden={!panel && settingsOpen}
      nativeBar={!panel && !fromOnboarding}
      title={panel ? titles[panel] : fromOnboarding ? (authMode === "signup" ? "Create account" : "Sign in") : "Athlete"}
      onBack={exitAthletePanel}
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
        if (params.from === "onboarding") router.replace({ pathname: "/onboarding", params: { invite: params.invite } });
        return;
      }
      // Mark the intended new account before signup can trigger auth navigation.
      // Existing sign-ins never import a guest athlete profile by accident.
      const guest = await readGuestIntroDraft().catch(() => null);
      const normalizedEmail = email.trim().toLowerCase();
      let marked = false;
      if (guest?.introCompleted && guest.name.trim()) {
        try {
          await AsyncStorage.setItem(GUEST_INTRO_DRAFT_KEY, JSON.stringify({ ...guest, name: displayName.trim() || guest.name }));
          await AsyncStorage.setItem(GUEST_SIGNUP_PENDING_KEY, normalizedEmail);
          marked = true;
        } catch { /* Lack of local storage must not block account creation. */ }
      }
      const result = await signUp({
        email,
        password,
        displayName: displayName.trim() || guest?.name.trim() || email.split("@")[0] || "Athlete",
      });
      if (result.error) {
        if (marked) void AsyncStorage.removeItem(GUEST_SIGNUP_PENDING_KEY).catch(() => {});
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
      router.replace({ pathname: guest?.introCompleted ? "/onboarding" : "/welcome", params: { invite: params.invite } });
    } catch (error) {
      if (authMode === "signup") void AsyncStorage.removeItem(GUEST_SIGNUP_PENDING_KEY).catch(() => {});
      setAuthNote(error instanceof Error ? error.message : "Could not access your account.");
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
        setHistoryOffer(providerId);
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
      if (inlineConnections && (result.tracker || result.stub) && result.tracker !== "connected") {
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
        setHistoryOffer(linked);
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

  if (!signedIn && !trackerPreview) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {pageHeader}
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {!fromOnboarding && <AthleteMetrics state={state} sections="profile" signedOut={!signedIn} />}
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

  if (panel === "account" && user) {
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
          <AccountActions
            showDeleteButton={false}
            middle={
              <FocusButton
                label="Sign out"
                secondary
                onPress={() => setConfirmSignOut(true)}
              />
            }
            footer={(openDelete) => (
              <View style={{ gap: 14, paddingTop: 4 }}>
                <LegalLinks />
                <Pressable accessibilityRole="button" accessibilityLabel="Delete account" onPress={openDelete}>
                  <AppText role="label" style={{ color: appearanceColors.statusError }}>Delete account</AppText>
                </Pressable>
              </View>
            )}
          />
          <FocusSheet open={confirmSignOut} title="Sign out?" onClose={() => setConfirmSignOut(false)}><AppText role="body" secondary>You can sign in again to return to your account.</AppText><FocusButton label="Sign out" onPress={() => { setConfirmSignOut(false); void signOut(); }} /><FocusButton label="Cancel" secondary onPress={() => setConfirmSignOut(false)} /></FocusSheet>
        </SectionStack>
</ScrollView>
      </SafeAreaView>
    );
  }

  if (panel === "connections" && (signedIn || trackerPreview)) {
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
            const isDevice = isDeviceProvider(provider.id);
            const isCloud = isCloudOAuthProvider(provider.id);
            const connected = !trackerPreview && Boolean(link?.linked && link.status !== "disconnected");
            const connecting = isDevice ? syncBusy : busyProvider === provider.id;
            if (!isDevice && !isCloud) {
              return (
                <View
                  key={provider.id}
                  style={[styles.syncRow, showDivider && styles.syncRowDivider]}
                >
                  {title}
                </View>
              );
            }
            return (
              <View
                key={provider.id}
                style={[styles.syncRow, showDivider && styles.syncRowDivider]}
              >
                {title}
                {connected ? (
                  <DataSyncActions provider={provider.id} />
                ) : (
                  <View style={{ flexShrink: 0 }}>
                    <FocusButton
                      secondary
                      label={connecting ? (isDevice ? "Connecting…" : "Authorizing…") : "Connect"}
                      disabled={trackerPreview || rowBusy}
                      onPress={() => {
                        if (trackerPreview) return;
                        if (isDevice) void syncDevice(provider.id as "apple_health" | "google_health");
                        else void connectCloud(provider.id);
                      }}
                    />
                  </View>
                )}
              </View>
            );
          })}
          </View>
          <Toast message={note ?? ""} onDismiss={() => setNote(null)} />
          {!inlineConnections && <DataSyncActions />}
          {!trackerPreview && <FitnessHistoryImport offer={historyOffer} onDismiss={dismissHistory} showSettings={!inlineConnections} />}
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

  if (!user) return null;

  if (panel === "scoring") {
    return (
      <SafeAreaView style={f.safe} edges={["top"]}>
        {pageHeader}
        <ScrollView contentContainerStyle={f.content}>
<SectionStack divided={false}>
          <AppText role="body" secondary>
            Effort Score combines recent training, accumulated activity and weekly competition results. Running and cycling use distance, walking uses steps, and strength uses workout time.
          </AppText>
          <AppText role="body" secondary>
            Activities can raise your live score after today’s expected training is covered. Shortfalls appear the next day. Official scores and levels finalize weekly.
          </AppText>
          <SectionHeader title="Levels" />
          <View style={{ gap: 10 }}>
            {RANK_BANDS.map((band) => (
              <View
                key={band.id}
                style={[
                  f.row,
                  {
                    gap: 14,
                    padding: 12,
                    borderRadius: SHELL_RADIUS.card,
                    borderWidth: 1,
                    borderColor: SHELL_COLORS.line,
                    backgroundColor: SHELL_COLORS.card,
                  },
                ]}
              >
                <RankSymbol rank={band.id} size={48} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText role="label">{band.name}</AppText>
                  <AppText role="caption" secondary>
                    {band.min}+ · {band.blurb}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </SectionStack>
</ScrollView>
      </SafeAreaView>
    );
  }

  if (panel === "profile") {
    const closeProfile = exitAthletePanel;
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {pageHeader}
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={f.content}
          keyboardShouldPersistTaps="handled"
        >
          <SectionStack divided={false}>
            <AthleteProfileEditor
              state={state}
              dispatch={dispatch}
              onCancel={closeProfile}
              onSaved={(msg) => {
                setNote(msg);
                closeProfile();
              }}
            />
          </SectionStack>
        </ScrollView>
        {note ? <Toast message={note} onDismiss={() => setNote(null)} /> : null}
      </SafeAreaView>
    );
  }

  if (panel === "preferences") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {pageHeader}
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={f.content}
          keyboardShouldPersistTaps="handled"
        >
<SectionStack divided={false}>
          <AthletePreferencesFields state={state} dispatch={dispatch} />
          {false && (
            <View style={[f.row, { minHeight: 48, alignItems: "center" }]}>
              <View style={f.grow}><AppText role="label" >Freeze this week</AppText><AppText role="body" secondary >{state?.freezesLeft ?? 0} remaining</AppText></View>
              <Switch style={{ alignSelf: "center", marginVertical: 0 }} trackColor={{ false: SHELL_COLORS.line, true: SHELL_COLORS.ink }} thumbColor={frozen ? SHELL_COLORS.card : SHELL_COLORS.ink} ios_backgroundColor={SHELL_COLORS.line} accessibilityLabel="Freeze this week" value={frozen} disabled={!frozen && (state?.freezesLeft ?? 0) <= 0}
                onValueChange={enabled => enabled ? setConfirmFreeze(true) : dispatch({ type: "unfreeze" })} />
            </View>
          )}
          {false && state && (
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
          )}
        </SectionStack>
</ScrollView>
      </SafeAreaView>
    );
  }

  const now = competeNow(state);
  const memberSince = user.createdAt ? formatMemberSince(user.createdAt) : null;
  const cardModel = { ...athleteCardModel(state, now), memberSince };
  const season = clubLifetimeTotals(state);
  const unit = distanceUnitLabel(state.units);
  const records = personalRecordHistory(state, now);
  const awards = awardCards(state);
  const topRecords = records.slice(0, 3);
  const profileShareUrl = useMemo(() => {
    const origin = publicProfileOrigin(mobileEnv.apiUrl);
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

        <AthleteCrest
          key={user.id}
          model={cardModel}
          bundled
          active={!settingsOpen}
          onInteractionChange={setCardDragging}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            minHeight: 42,
            paddingLeft: 12,
            paddingRight: 5,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: SHELL_COLORS.line,
            borderRadius: SHELL_RADIUS.pill,
            backgroundColor: appearanceColors.paper,
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
              paddingVertical: 6,
              borderRadius: SHELL_RADIUS.pill,
              borderWidth: 1,
              borderColor: SHELL_COLORS.line,
              backgroundColor: SHELL_COLORS.card,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <AppText role="caption">Copy</AppText>
          </Pressable>
        </View>

        <View style={[f.row, { gap: 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={() => setPanel("profile")}
            style={({ pressed }) => [
              f.button,
              f.secondary,
              { flex: 1, paddingHorizontal: 14, gap: 6 },
              pressed && { opacity: 0.78 },
            ]}
          >
            <AppIcon name="edit" size={18} />
            <Text style={[f.buttonText, { color: appearanceColors.ink }]}>Edit profile</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => setSettingsOpen(true)}
            style={({ pressed }) => [
              f.button,
              f.secondary,
              { flex: 1, paddingHorizontal: 14, gap: 6 },
              pressed && { opacity: 0.78 },
            ]}
          >
            <AppIcon name="settings" size={18} />
            <Text style={[f.buttonText, { color: appearanceColors.ink }]}>Settings</Text>
          </Pressable>
        </View>

        <Achievements state={state} />

        {/* Awards Shelf under Athlete Crest */}
        {awards.length > 0 && (
          <View style={f.section}>
            <SectionHeader
              title="Podium & Awards"
              subtitle="Season awards and battle honors"
              action={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View all podiums and awards"
                  onPress={() => router.push("/progress-achievements")}
                  style={{ minHeight: 44, justifyContent: "center", maxWidth: "100%" }}
                >
                  <AppText role="caption" secondary>View all →</AppText>
                </Pressable>
              }
            />
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

    <FocusSidePanel
      open={settingsOpen}
      title="Settings"
      headerDivider={false}
      onClose={() => {
        setSettingsOpen(false);
        if (params.edit) {
          router.setParams({ edit: undefined });
        }
      }}
    >
      <View style={{ gap: 8 }}>
        <SettingsRow
          title="Data Sync"
          detail="Trackers & history"
          onPress={() => {
            setPanel("connections");
          }}
        />
        <SettingsRow
          title="Preferences"
          detail="Units & sports"
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


export function TrackerConnections({ preview = false }: { preview?: boolean }) { return <AthleteContent inlineConnections trackerPreview={preview} />; }
export default function AthleteScreen() { return <AthleteContent/>; }
