import {
  awardCards,
  initialsFromName,
  rankForElo,
  type ProviderId,
} from "@fitness-battle/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Avatar } from "heroui-native/avatar";
import { Button } from "heroui-native/button";
import { Input } from "heroui-native/input";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/lib/auth";
import { useCompeteStore } from "../../src/lib/compete-store";
import {
  createAppleHealthDeps,
  syncAppleHealth,
  syncHealthConnect,
} from "../../src/lib/device-health";
import { providersForDevice } from "../../src/lib/platform-providers";
import {
  isCloudOAuthProvider,
  startCloudTrackerConnect,
} from "../../src/lib/tracker-connect";
import { AwardShelf } from "../../src/ui/award-shelf";
import { SHELL_COLORS, SHELL_RADIUS } from "../../src/theme";

function isDeviceProvider(id: ProviderId): id is "apple_health" | "google_health" {
  return id === "apple_health" || id === "google_health";
}

type AuthMode = "signin" | "signup";

export default function YouScreen() {
  const { state, dispatch } = useCompeteStore();
  const {
    user,
    loading: authLoading,
    demoMode,
    accessToken,
    signIn,
    signUp,
    signOut,
  } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ tracker?: string; provider?: string }>();
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
  const appliedTracker = useRef<string | null>(null);

  useEffect(() => {
    const tracker = typeof params.tracker === "string" ? params.tracker : null;
    const trackerProvider =
      typeof params.provider === "string" ? params.provider : "strava";
    const key = `${tracker}:${trackerProvider}`;
    if (!state || !tracker || appliedTracker.current === key) return;
    appliedTracker.current = key;
    if (!isCloudOAuthProvider(trackerProvider)) return;
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
  }, [dispatch, params.provider, params.tracker, state]);

  useEffect(() => {
    if (!user) return;
    if (user.displayName) {
      dispatch({ type: "rename", name: user.displayName });
    }
  }, [dispatch, user?.displayName, user?.id]);

  if (!state || authLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.copy}>Loading account…</Text>
      </SafeAreaView>
    );
  }

  const draftName = name ?? state.name;
  const draftCity = city ?? state.city;
  const dirty = draftName !== state.name || draftCity !== state.city;
  const rating = state.ratings.find((row) => row.sport === state.primary);
  const rank = rankForElo(rating?.openElo ?? 1000);
  const cards = awardCards(state);
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
      const result =
        providerId === "apple_health"
          ? await syncAppleHealth(
              createAppleHealthDeps({
                localOnly,
                getAccessToken: async () => ({
                  token: accessToken ?? undefined,
                  userId: user.id,
                }),
              }),
            )
          : await syncHealthConnect();
      // "Connected" means device permission (or a successful upload). Upload
      // failures keep Connected when HealthKit already authorized, with a clear note.
      if (result.ok || result.authorized) {
        dispatch({
          type: "apply-sync",
          provider: providerId,
          activities: [],
          linkStatus: "connected",
        });
      }
      if (!result.ok && result.authorized) {
        setNote(`Connected on this phone. ${result.message}`);
      } else {
        setNote(result.message);
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Sync failed");
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
      setNote(error instanceof Error ? error.message : "Could not start connect.");
    } finally {
      setBusyProvider(null);
    }
  }

  if (!signedIn) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.kicker}>Account</Text>
          <Text style={styles.name}>Sign in to Overtaek</Text>
          <Text style={styles.copy}>
            Create an account or sign in to sync Apple Health, connect trackers, and
            keep your battles on this device.
            {demoMode ? " Demo mode stores a local account on this phone." : ""}
          </Text>

          <View style={styles.authToggle}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAuthMode("signin");
                setAuthNote(null);
              }}
              style={[styles.authTab, authMode === "signin" ? styles.authTabOn : null]}
            >
              <Text style={styles.authTabText}>Sign in</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAuthMode("signup");
                setAuthNote(null);
              }}
              style={[styles.authTab, authMode === "signup" ? styles.authTabOn : null]}
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
            placeholder={authMode === "signup" ? "Password (6+ characters)" : "Password"}
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>Signed in</Text>
        <View style={styles.portrait}>
          <Avatar color="accent" size="lg">
            <Avatar.Fallback>
              {initialsFromName(account.displayName || state.name)}
            </Avatar.Fallback>
          </Avatar>
          <View style={styles.portraitCopy}>
            <Text style={styles.name}>{account.displayName || state.name}</Text>
            <Text style={styles.copy}>{account.email}</Text>
            <Text style={styles.copy}>
              {rank.name} · {rating?.openElo ?? 1000}
              {account.mode === "demo" ? " · Demo account" : ""}
            </Text>
          </View>
        </View>

        <Text style={styles.section}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.rowTitle}>Email</Text>
          <Text style={styles.copy}>{account.email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowTitle}>Display name</Text>
          <Text style={styles.copy}>{account.displayName}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut()}
          style={styles.row}
        >
          <Text style={styles.rowTitle}>Sign out</Text>
        </Pressable>

        <Text style={styles.section}>Week awards</Text>
        <AwardShelf cards={cards} />

        <Text style={styles.section}>Profile</Text>
        <Input
          value={draftName}
          onChangeText={setName}
          accessibilityLabel="Name"
          placeholder="Name"
        />
        <Input
          value={draftCity}
          onChangeText={setCity}
          accessibilityLabel="City"
          placeholder="City"
        />
        {dirty ? (
          <Button
            onPress={() => {
              dispatch({ type: "rename", name: draftName.trim() || state.name });
              dispatch({ type: "set-city", city: draftCity.trim() || state.city });
              setName(null);
              setCity(null);
            }}
          >
            Save profile
          </Button>
        ) : null}

        <Text style={styles.section}>Trackers</Text>
        {providersForDevice().map((provider) => {
          const link = state.links.find((row) => row.provider === provider.id);
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
              ? busyProvider === provider.id
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
        {note ? <Text style={styles.copy}>{note}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/settings")}
          style={styles.row}
        >
          <Text style={styles.rowTitle}>Notification settings</Text>
        </Pressable>
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
  portrait: { flexDirection: "row", gap: 14, alignItems: "center" },
  portraitCopy: { gap: 2, flex: 1 },
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
  rowTitle: { fontFamily: "DMSans_700Bold", color: SHELL_COLORS.ink, fontSize: 16 },
  copy: { fontFamily: "DMSans_400Regular", color: SHELL_COLORS.muted, fontSize: 14 },
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
