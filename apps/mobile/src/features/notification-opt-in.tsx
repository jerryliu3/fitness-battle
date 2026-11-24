import {
  WEEK_RECAP_COLORS,
  canShowNotificationOptIn,
  notificationOptInCopy,
  type NotificationPreferences,
  type NotificationPromptState,
  type NotificationPromptSurface,
} from "@fitness-battle/shared";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useAuth } from "../lib/auth";
import { playCue } from "../lib/haptics";
import {
  dismissNotificationOptIn,
  enableNativePush,
  hydrateNotificationPreferences,
  loadNotificationPromptState,
  type SyncIdentity,
} from "../lib/push-notifications";
import { useThemeColors } from "../theme";
import { AppIcon } from "../ui/app-icon";
import { AppText } from "../ui/section";

export function useNotificationOptIn(
  surface: NotificationPromptSurface,
  context?: { hasOvertake?: boolean; debug?: boolean },
) {
  const { user, accessToken } = useAuth();
  const userId = user?.mode === "supabase" ? user.id : null;
  const identity = useMemo<SyncIdentity | null>(
    () =>
      userId
        ? { userId, localOnly: false, accessToken }
        : null,
    [userId, accessToken],
  );
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [promptState, setPromptState] =
    useState<NotificationPromptState | null>(null);
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (context?.debug) return;
    let alive = true;
    void Promise.all([
      hydrateNotificationPreferences(identity),
      loadNotificationPromptState(),
    ])
      .then(([nextPrefs, nextPromptState]) => {
        if (!alive) return;
        setPrefs(nextPrefs);
        setPromptState(nextPromptState);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [identity, context?.debug]);

  const copy = notificationOptInCopy(surface, context);
  const visible = context?.debug
    ? !previewDismissed
    : Boolean(
        prefs && promptState && canShowNotificationOptIn(prefs, promptState),
      );

  async function accept() {
    if (busy) return;
    void playCue("light");
    setBusy(true);
    try {
      const result = await enableNativePush(identity, copy.category);
      setPrefs(result.prefs);
      if (context?.debug) setPreviewDismissed(true);
    } finally {
      setBusy(false);
    }
  }

  async function dismiss() {
    if (busy) return;
    void playCue("light");
    if (context?.debug) {
      setPreviewDismissed(true);
      return;
    }
    const next = await dismissNotificationOptIn();
    setPromptState(next);
  }

  return { visible, busy, copy, accept, dismiss };
}

export function NotificationOptInStrip({
  surface,
  hasOvertake,
  variant = "sheet",
  compact = false,
  debug = false,
}: {
  surface: NotificationPromptSurface;
  hasOvertake?: boolean;
  variant?: "sheet" | "recap" | "floating";
  compact?: boolean;
  debug?: boolean;
}) {
  const c = useThemeColors();
  const { visible, busy, copy, accept, dismiss } = useNotificationOptIn(
    surface,
    { hasOvertake, debug },
  );
  if (!visible) return null;

  const isRecap = variant === "recap";
  const isFloating = variant === "floating";
  const ctaBg = isRecap ? "rgba(255, 255, 255, 0.12)" : c.actionSoft;
  const ctaBorder = isRecap ? "rgba(255, 255, 255, 0.22)" : c.line;
  const ctaTextColor = isRecap ? WEEK_RECAP_COLORS.text : c.ink;
  const dismissTextColor = isRecap
    ? "rgba(249, 247, 236, 0.72)"
    : c.muted;

  if (compact) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notify me"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => void accept()}
        style={({ pressed }) => [
          styles.compactButton,
          { backgroundColor: ctaBg, borderColor: ctaBorder },
          busy && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <AppIcon name="notifications" size={14} color={ctaTextColor} />
        <AppText role="caption" style={{ color: ctaTextColor }}>
          {busy ? "Enabling…" : "Notify me"}
        </AppText>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.row,
        isFloating && [
          styles.floatingBar,
          { backgroundColor: c.card, borderColor: c.line },
        ],
        isRecap && styles.recapCard,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.ctaLabel}
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => void accept()}
        style={({ pressed }) => [
          styles.ctaButton,
          { backgroundColor: ctaBg, borderColor: ctaBorder },
          busy && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <AppIcon name="notifications" size={16} color={ctaTextColor} />
        <AppText
          role="label"
          numberOfLines={1}
          style={{ color: ctaTextColor, flexShrink: 1 }}
        >
          {busy ? "Enabling…" : copy.ctaLabel}
        </AppText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.dismissLabel}
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        hitSlop={8}
        onPress={() => void dismiss()}
        style={({ pressed }) => [
          styles.dismissButton,
          busy && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <AppText role="caption" style={{ color: dismissTextColor }}>
          {copy.dismissLabel}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 8,
  },
  floatingBar: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  compactButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 4,
  },
  recapCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderRadius: 18,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  ctaButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  dismissButton: {
    minHeight: 40,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.72,
  },
});
