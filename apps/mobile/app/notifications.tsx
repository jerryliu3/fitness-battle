import { useFocusStyles } from "../src/ui/focus";
import { createThemedStyles, useThemedStyles, legacyColors, useLegacyColors, useThemeColors } from "../src/theme";
import { AppText, SectionHeader, textStyle } from "../src/ui/section";
import { ScreenHeader } from "../src/ui/screen-header";
import { IconButton } from "../src/ui/icon-button";
import {
  isSupabaseConfigured,
  NOTIFICATION_CATEGORIES,
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
import { router, useLocalSearchParams } from "expo-router";
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
import { FocusButton } from "../src/ui/focus";
import { playCue } from "../src/lib/haptics";

function NotificationInfoTip({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`About ${title}`}
      hitSlop={8}
      onPress={() => {
        void playCue("light");
        Alert.alert(title, message);
      }}
      style={({ pressed }) => ({
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.line,
        backgroundColor: c.card,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <AppText role="label" secondary style={{ marginTop: -1 }}>
        i
      </AppText>
    </Pressable>
  );
}

export default function NotificationsScreen() {
const f=useFocusStyles();
const colors=useLegacyColors();
const styles=useThemedStyles(stylesThemes);

  const params = useLocalSearchParams<{ returnTo?: string }>();
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
        return;
      }
      const result = await enableNativePush(identity);
      setPrefs(result.prefs);
      if (!result.prefs.enabled) {
        setNote(result.detail ?? "Notification permission was denied.");
        return;
      }
      setNote(null);
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
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace({ pathname: "/athlete", params: { edit: "1" } });
              }
            }}
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

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: "/athlete", params: { edit: "1" } });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenHeader nativeBar={false} title="Notifications" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowFirst]}>
            <View style={styles.rowTitleRow}>
              <Text style={styles.rowTitle}>Push notifications</Text>
              <NotificationInfoTip
                title="Push notifications"
                message="Turn this on to allow Overtaek alerts on your device. Individual notification types can be toggled below."
              />
            </View>
            <Switch
              accessibilityLabel="Push notifications"
              value={prefs.enabled}
              disabled={busy}
              onValueChange={(value) => void toggleMaster(value)}
              trackColor={{ false: colors.line, true: colors.ink }}
              thumbColor="#ffffff"
              ios_backgroundColor={colors.line}
            />
          </View>
        </View>

        <View
          style={[styles.categoryGroup, !prefs.enabled && styles.categoryGroupOff]}
          pointerEvents={prefs.enabled ? "auto" : "none"}
        >
          <SectionHeader title="Notification types" />
          <View style={styles.card}>
            {NOTIFICATION_CATEGORIES.map((category, index) => (
              <View
                key={category.id}
                style={[styles.row, index === 0 && styles.rowFirst]}
              >
                <View style={styles.rowTitleRow}>
                  <Text style={styles.rowTitle}>{category.label}</Text>
                  <NotificationInfoTip
                    title={category.label}
                    message={category.description}
                  />
                </View>
                <Switch
                  accessibilityLabel={category.label}
                  value={prefs.categories[category.id]}
                  disabled={!prefs.enabled || busy}
                  onValueChange={(value) =>
                    void toggleCategory(category.id, value)
                  }
                  trackColor={{ false: colors.line, true: colors.ink }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={colors.line}
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
        </View>
        {note ? <Text style={styles.copy}>{note}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const stylesThemes = createThemedStyles(themeColors=>{const colors=legacyColors(themeColors);return {
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  back: {
    ...textStyle("body"),
    color: colors.muted,
    marginBottom: 4
},
  kicker: {
    ...textStyle("caption"),
    color: colors.muted
},
  title: {
    ...textStyle("display"),
    color: colors.ink
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
  rowTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowTitle: { ...textStyle("label"), color: colors.ink, flexShrink: 1 },
  line: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  lineText: { ...textStyle("label"), color: colors.ink },
  disabled: { opacity: 0.45 },
  categoryGroup: { gap: 12 },
  categoryGroupOff: { opacity: 0.42 },
};});
