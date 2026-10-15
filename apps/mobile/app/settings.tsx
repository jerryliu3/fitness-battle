import {
  NOTIFICATION_CATEGORIES,
  permissionLabel,
  setCategoryEnabled,
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
  loadNotificationPreferences,
  saveNotificationPreferences,
} from "../src/lib/push-notifications";
import { colors, fonts } from "../src/theme";

export default function SettingsScreen() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const platform = detectionPlatform();

  useEffect(() => {
    let alive = true;
    loadNotificationPreferences().then((next) => {
      if (alive) setPrefs(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function toggleMaster(enabled: boolean) {
    setBusy(true);
    setNote(null);
    try {
      const next = enabled ? await enableNativePush() : await disableNativePush();
      setPrefs(next);
      setNote(
        enabled
          ? `Stub ${platform} token registered. Live push is not wired yet.`
          : "Push turned off on this device.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleCategory(
    id: (typeof NOTIFICATION_CATEGORIES)[number]["id"],
    enabled: boolean,
  ) {
    // Read-modify-write from storage so rapid toggles don't clobber each other.
    const current = await loadNotificationPreferences();
    const next = await saveNotificationPreferences(
      setCategoryEnabled(current, id, enabled),
    );
    setPrefs(next);
  }

  async function sendTest() {
    const result = await deliverNativeNotification({
      category: "week_summary",
      title: "Overtaek",
      body: "Test push — delivery is stubbed on this device.",
      path: "/settings",
    });
    if (!result.ok) {
      setNote("Turn notifications on before testing.");
      return;
    }
    Alert.alert(result.payload.title, result.payload.body);
    setNote("Stub delivery shown as an in-app alert.");
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
          Same controls as the web app. Enabling registers a stub {platform}{" "}
          device token so the rest of the product can treat push as available.
          APNs / FCM are not connected yet.
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
                disabled={!prefs.enabled}
                onValueChange={(value) => void toggleCategory(category.id, value)}
                trackColor={{ false: colors.line, true: colors.ink }}
                thumbColor={prefs.categories[category.id] ? colors.lime : "#f4f4f5"}
              />
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.line, !prefs.enabled && styles.disabled]}
          disabled={!prefs.enabled}
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
