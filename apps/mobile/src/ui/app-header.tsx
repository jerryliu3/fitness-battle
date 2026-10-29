import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { UserAvatar } from "./user-avatar";
import { textStyle } from "./section";
import { useBootImage } from "./boot-readiness";
import { EffortRail } from "../features/effort-rail";

import { usePathname, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "./app-icon";
import { weeklyActivityStreak, competeNow, DEBUG_EVENT_OPTIONS, type DebugEventId } from "@fitness-battle/shared";
import { useCompeteStore } from "../lib/compete-store";
import { isAthleteSettingsPath } from "../lib/navigation";
import { SHELL_COLORS as c } from "../theme";

export function AppHeader() {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);

  const { state, debugActive, triggerDebugEvent, resetDebugState } = useCompeteStore();
  const imageSettled = useBootImage(state?.avatarUrl);
  const [debugOpen, setDebugOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const streak = useMemo(() => state ? weeklyActivityStreak(state.activities, competeNow(state)) : null, [state]);
  const onAthlete = isAthleteSettingsPath(path);

  function handleSelectDebug(eventId: DebugEventId) {
    setDebugOpen(false);
    const result = triggerDebugEvent?.(eventId);
    if (!result) return;
    if (eventId === "week-closing") router.push(result.targetRoute);
  }

  return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      <View style={s.header}>
        <View style={s.identity} testID="athlete-header-group">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open athlete settings"
            accessibilityState={{ selected: onAthlete }}
            onPress={() => router.navigate("/athlete")}
            style={[s.profile, onAthlete && s.selected]}
          >
            <UserAvatar src={state?.avatarUrl} name={state?.name ?? "Athlete"} size={36} fallback={<AppIcon name="person" size={22} color={c.muted} />} onLoadEnd={imageSettled} />
          </Pressable>
          <View style={s.effort}><EffortRail compact /></View>
          {streak && <View accessibilityLabel={`${streak.count} week activity streak${streak.active ? "" : ", inactive this week"}`} style={[s.streak, { opacity: streak.active ? 1 : .4 }]}>
            <AppIcon name="flame" size={22} color={c.actionPressed} />
            <Text style={s.debugBtnText}>{streak.count}</Text>
          </View>}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Debug event triggers"
          accessibilityState={{ expanded: debugOpen }}
          onPress={() => setDebugOpen((open) => !open)}
          style={[s.debugBtn, debugActive && s.debugBtnActive]}
        >
          <Text style={s.debugBtnText}>Debug {debugOpen ? "▴" : "▾"}</Text>
        </Pressable>
      </View>
      {debugOpen ? (
        <View style={s.debugMenu} accessibilityLabel="Trigger UI events">
          <Text style={s.debugKicker}>TEST UI EVENTS</Text>
          {DEBUG_EVENT_OPTIONS.map((item) => (
            <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => handleSelectDebug(item.id)} style={s.debugItem}>
              <Text style={s.debugItemTitle}>{item.label}</Text>
              <Text style={s.debugItemDetail}>{item.detail}</Text>
            </Pressable>
          ))}
          {debugActive ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Reset debug preview" onPress={() => { setDebugOpen(false); resetDebugState?.(); }} style={s.debugReset}>
              <Text style={s.debugResetText}>Reset debug preview</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const sThemes = createThemedStyles((themeColors) => ({
  safe: { backgroundColor: themeColors.paper, zIndex: 30 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  identity: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  effort: { flex: 1, minWidth: 0, maxWidth: 190 },
  streak: { flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 0 },
  debugBtn: { flexShrink: 0, minHeight: 44, justifyContent: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: themeColors.line, backgroundColor: themeColors.card },
  debugBtnActive: { borderColor: themeColors.tennis, backgroundColor: "#fff5d1" },
  debugBtnText: { ...textStyle("caption"), color: themeColors.ink },
  debugMenu: { marginHorizontal: 22, marginBottom: 10, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: themeColors.line, backgroundColor: themeColors.card, gap: 6 },
  debugKicker: { ...textStyle("label"), color: themeColors.muted, marginHorizontal: 4, marginBottom: 2 },
  debugItem: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: themeColors.paper, gap: 2 },
  debugItemTitle: { ...textStyle("heading"), color: themeColors.ink },
  debugItemDetail: { ...textStyle("caption"), color: themeColors.muted },
  debugReset: { paddingVertical: 8, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: themeColors.line },
  debugResetText: { ...textStyle("caption"), color: themeColors.muted },
  profile: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 22,
    backgroundColor: themeColors.card,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: themeColors.line,
  },
  selected: { borderColor: themeColors.tennis },
  photo: { width: "100%", height: "100%" },
}));
