import { textStyle } from "../src/ui/section";
import { ScreenHeader } from "../src/ui/screen-header";
import { IconButton } from "../src/ui/icon-button";
import {
  isSupabaseConfigured,
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
import { FocusButton, f } from "../src/ui/focus";
import { colors, fonts } from "../src/theme";

export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [identity, setIdentity] = useState<SyncIdentity | null>(null);
  const platform = detectionPlatform();
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setNote(null);
    void (async () => {
      let nextIdentity: SyncIdentity | null = null;
      if (isSupabaseConfigured(mobileEnv.supabaseUrl, mobileEnv.supabaseAnonKey)) {
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
    })().catch(() => {
      if (alive)
        setNote("Could not load notification settings. Please try again.");
    });
    return () => {
      alive = false;
    };
  }, [loadAttempt]);

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
    } catch (error) {
      setNote(
        error instanceof Error
          ? error.message
          : "Could not save notification settings. Please try again.",
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
    } catch (error) {
      setNote(
        error instanceof Error
          ? error.message
          : "Could not save notification settings. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setNote(null);
    try {
      const result = await deliverNativeNotification(
        {
          category: "week_summary",
          title: "Overtaek",
          body: "Your Overtaek test notification.",
          path: "/notifications",
        },
        identity,
      );
      if (!result.ok) {
        setNote(
          "Could not deliver. Turn notifications on, allow permission, and use a live Expo token on a physical device when testing remote push.",
        );
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
    } catch (error) {
      setNote(
        error instanceof Error
          ? error.message
          : "Could not send a test notification. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!prefs) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={f.content}>
          <IconButton icon="back" label="Return to previous screen"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/settings")
            }
          />
          <Text style={styles.copy}>
            {note ?? "Loading notification settings…"}
          </Text>
          {note ? (
            <FocusButton
              label="Try again"
              onPress={() => setLoadAttempt((n) => n + 1)}
            />
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title="Notifications" onBack={() => router.canGoBack() ? router.back() : router.replace("/athlete")} />
        <Text style={styles.copy}>
          Choose which updates you receive. Enabling notifications asks for
          permission on this device.{" "}
          {identity && !identity.localOnly
            ? "Your choices sync to your account."
            : "Your choices stay on this device."}
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
              accessibilityLabel="Push notifications"
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
                accessibilityLabel={category.label}
                value={prefs.categories[category.id]}
                disabled={!prefs.enabled || busy}
                onValueChange={(value) =>
                  void toggleCategory(category.id, value)
                }
                trackColor={{ false: colors.line, true: colors.ink }}
                thumbColor={
                  prefs.categories[category.id] ? colors.lime : "#f4f4f5"
                }
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
    ...textStyle("supporting"),
    color: colors.muted,
    marginBottom: 4
},
  kicker: {
    ...textStyle("caption"),
    color: colors.muted,
    textTransform: "uppercase"
},
  title: {
    ...textStyle("pageTitle"),
    color: colors.ink,
    letterSpacing: -0.5
},
  copy: {
    ...textStyle("body"),
    color: colors.muted
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
  rowTitle: { ...textStyle("itemTitle"), color: colors.ink },
  rowDetail: {
    ...textStyle("supporting"),
    color: colors.muted
},
  line: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  lineText: { ...textStyle("actionLabel"), color: colors.ink },
  disabled: { opacity: 0.45 },
});
