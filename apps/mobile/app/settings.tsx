import {
  NOTIFICATION_CATEGORIES,
  permissionLabel,
  type NotificationPreferences,
} from "@fitness-battle/shared";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  deliverNativeNotification,
  detectionPlatform,
  disableNativePush,
  enableNativePush,
  hydrateNotificationPreferences,
  updateNativeCategory,
  type SyncIdentity,
} from "../src/lib/push-notifications";
import { mobileEnv } from "../src/lib/env";
import { supabase } from "../src/lib/supabase";
import { colors, fonts } from "../src/theme";

export default function SettingsScreen() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [identity, setIdentity] = useState<SyncIdentity | null>(null);
  const platform = detectionPlatform();

  useEffect(() => {
    let alive = true;
    void (async () => {
      let nextIdentity: SyncIdentity | null = null;
      if (!mobileEnv.useDemoData) {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user?.id;
        if (userId) {
          nextIdentity = {
            userId,
            localOnly: false,
            accessToken: data.session?.access_token,
          };
        }
      }
      if (!alive) return;
      setIdentity(nextIdentity);
      const next = await hydrateNotificationPreferences(nextIdentity);
      if (alive) setPrefs(next);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function toggleMaster(enabled: boolean) {
    setBusy(true);
    setNote(null);
    try {
      if (!enabled) {
        const next = await disableNativePush(identity);
        setPrefs(next);
        setNote("Push turned off on this device.");
        return;
      }
      const result = await enableNativePush(identity);
      setPrefs(result.prefs);
      if (!result.prefs.enabled) {
        setNote(result.detail ?? "Notification permission was denied.");
        return;
      }
      const synced =
        identity && !identity.localOnly
          ? " Synced to your account."
          : " Stored on this device only.";
      setNote(
        result.mode === "expo"
          ? `Live Expo push token registered for ${platform}.${synced}`
          : `${result.detail ?? "Using a stub token."}${synced}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleCategory(
    id: (typeof NOTIFICATION_CATEGORIES)[number]["id"],
    enabled: boolean,
  ) {
    setBusy(true);
    try {
      const next = await updateNativeCategory(id, enabled, identity);
      setPrefs(next);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    const result = await deliverNativeNotification(
      {
        category: "week_summary",
        title: "Overtaek",
        body: "Test push — delivery is stubbed on this device.",
        path: "/settings",
      },
      identity,
    );
    if (!result.ok) {
      setNote("Turn notifications on before testing.");
      return;
    }
    Alert.alert(result.payload.title, result.payload.body);
    if (result.mode === "expo") {
      setNote(
        result.persisted
          ? "Sent via Expo Push Service and recorded in the outbox."
          : "Sent via Expo Push Service.",
      );
      return;
    }
    setNote(
      result.message ??
        (result.persisted
          ? "Stub delivery recorded in the outbox (no live Expo token yet)."
          : "Local stub delivery — use a physical device + live auth for Expo Push."),
    );
  }

  if (!prefs) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.copy}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.kicker}>Settings</Text>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.copy}>
          Enabling asks for permission and registers an Expo push token on a
          physical {platform} device
          {identity && !identity.localOnly
            ? ", then syncs it to your account"
            : " (demo stays on-device)"}
          . Simulators fall back to a stub token. The server sends through the
          Expo Push Service (which talks to APNs/FCM).
        </Text>

        <View style={styles.card}>
          <View style={[styles.row, styles.rowFirst]}>
            <View style={styles.grow}>
              <Text style={styles.rowTitle}>Push notifications</Text>
              <Text style={styles.rowDetail}>
                {permissionLabel(prefs.permissionStatus)}
                {prefs.registration?.token
                  ? ` · ${prefs.registration.stub ? "stub" : "live"} token`
                  : ""}
              </Text>
            </View>
            <Switch
              value={prefs.enabled}
              disabled={busy}
              onValueChange={(value) => void toggleMaster(value)}
              trackColor={{ false: colors.line, true: colors.ink }}
              thumbColor={prefs.enabled ? colors.lime : "#f4f4f5"}
            />
          </View>

          {NOTIFICATION_CATEGORIES.map((category) => (
            <View key={category.id} style={styles.row}>
              <View style={styles.grow}>
                <Text style={styles.rowTitle}>{category.label}</Text>
                <Text style={styles.rowDetail}>{category.description}</Text>
              </View>
              <Switch
                value={prefs.categories[category.id]}
                disabled={!prefs.enabled || busy}
                onValueChange={(value) => void toggleCategory(category.id, value)}
                trackColor={{ false: colors.line, true: colors.ink }}
                thumbColor={prefs.categories[category.id] ? colors.lime : "#f4f4f5"}
              />
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.line, (!prefs.enabled || busy) && styles.disabled]}
          disabled={!prefs.enabled || busy}
          onPress={() => void sendTest()}
        >
          <Text style={styles.lineText}>Send test notification</Text>
        </Pressable>
        {note ? <Text style={styles.copy}>{note}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { padding: 20, gap: 12 },
  back: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 14,
    marginBottom: 4,
  },
  kicker: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 13,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  copy: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  rowFirst: { borderTopWidth: 0 },
  grow: { flex: 1, minWidth: 0, gap: 4 },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  rowDetail: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  line: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  lineText: { color: colors.ink, fontFamily: fonts.bodyBold },
  disabled: { opacity: 0.45 },
});
