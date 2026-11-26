import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { UserAvatar } from "./user-avatar";
import { textStyle } from "./section";
import { useBootImage } from "./boot-readiness";
import { EffortRail } from "../features/effort-rail";

import { usePathname, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "./app-icon";
import { weeklyActivityStreak, competeNow, buildDebugSpecialEventCeremony, DEBUG_EVENT_OPTIONS, DEBUG_SPECIAL_EVENT_PREVIEWS, type DebugEventId, type DebugSpecialEventPreviewId } from "@fitness-battle/shared";
import { SpecialEventCeremony } from "../features/special-event-ceremony";
import { useCompeteStore } from "../lib/compete-store";
import { isAthleteSettingsPath } from "../lib/navigation";


export function AppHeader() {
const c=useThemeColors();
const s=useThemedStyles(sThemes);

  const { state, debugActive, triggerDebugEvent, resetDebugState } = useCompeteStore();
  const imageSettled = useBootImage(state?.avatarUrl);
  const [debugOpen, setDebugOpen] = useState(false);
  const [specialPreview, setSpecialPreview] = useState<DebugSpecialEventPreviewId | null>(null);
  const router = useRouter();
  const path = usePathname();
  const [clock, setClock] = useState(0);
  useEffect(() => { const timer = setInterval(() => setClock(value => value + 1), 60_000); return () => clearInterval(timer); }, []);
  const streak = useMemo(() => state ? weeklyActivityStreak(state.activities, competeNow(state), state.dailyHealth) : null, [state, clock]);
  const onAthlete = isAthleteSettingsPath(path);

  function handleSelectDebug(eventId: DebugEventId) {
    setDebugOpen(false);
    const result = triggerDebugEvent?.(eventId);
    if (!result) return;
    if (eventId === "week-closing" || eventId === "deregister-sport") router.push(result.targetRoute);
  }

  return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      <View style={s.header}>
        <View style={s.identity} testID="athlete-header-group">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open athlete settings"
            accessibilityState={{ selected: onAthlete }}
            hitSlop={6}
            onPress={() => router.navigate("/athlete")}
            style={({ pressed }) => [s.profile, onAthlete && s.selected, pressed && { opacity: 0.78 }]}
          >
            <UserAvatar
              src={state?.avatarUrl}
              name={state?.name ?? "Athlete"}
              size={44}
              highlight="gold"
              fallback={<AppIcon name="person" size={22} color={c.muted} />}
              onLoadEnd={imageSettled}
            />
          </Pressable>
          <View style={s.effort}>
            <EffortRail compact />
          </View>
          {streak && <View accessibilityLabel={`${streak.count} week activity streak${streak.active ? "" : ", inactive this week"}`} style={s.streak}>
            <View style={{ opacity: streak.active ? 1 : .4 }}><AppIcon name={streak.active ? "flameFilled" : "flame"} size={22} color={c.actionPressed} /></View>
            <Text style={s.debugBtnText}>{streak.count}</Text>
          </View>}
        </View>
        {__DEV__ && <Pressable
          accessibilityRole="button"
          accessibilityLabel="Debug event triggers"
          accessibilityState={{ expanded: debugOpen }}
          onPress={() => setDebugOpen((open) => !open)}
          style={[s.debugBtn, debugActive && s.debugBtnActive]}
        >
          <Text style={s.debugBtnText}>Debug {debugOpen ? "▴" : "▾"}</Text>
        </Pressable>}
      </View>
      {__DEV__ && debugOpen ? (
        <View style={s.debugMenu} accessibilityLabel="Trigger UI events">
          <Text style={s.debugKicker}>TEST UI EVENTS</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Preview onboarding" onPress={() => { setDebugOpen(false); router.push("/onboarding?preview=1"); }} style={s.debugItem}><Text style={s.debugItemTitle}>Onboarding · full setup</Text><Text style={s.debugItemDetail}>Replay every step without saving preferences</Text></Pressable>
          {DEBUG_EVENT_OPTIONS.map((item) => (
            <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => handleSelectDebug(item.id)} style={s.debugItem}>
              <Text style={s.debugItemTitle}>{item.label}</Text>
              <Text style={s.debugItemDetail}>{item.detail}</Text>
            </Pressable>
          ))}
          {DEBUG_SPECIAL_EVENT_PREVIEWS.map((item) => (
            <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => { setDebugOpen(false); setSpecialPreview(item.id); }} style={s.debugItem}>
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
      {__DEV__ && specialPreview ? (
        <SpecialEventCeremony
          ceremony={buildDebugSpecialEventCeremony(specialPreview, state?.primary ?? "running")}
          sport={state?.primary ?? "running"}
          units={state?.units ?? "us"}
          onDone={() => setSpecialPreview(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const sThemes = createThemedStyles(themeColors=>{const c=themeColors;return {
  safe: { backgroundColor: c.paper, zIndex: 30 },
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
  streak: { flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 0, marginLeft: "auto" },
  debugBtn: { flexShrink: 0, minHeight: 44, justifyContent: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: c.line, backgroundColor: c.card },
  debugBtnActive: { borderColor: c.tennis, backgroundColor: themeColors.actionSoft },
  debugBtnText: { ...textStyle("caption"), color: c.ink },
  debugMenu: { marginHorizontal: 22, marginBottom: 10, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, gap: 6 },
  debugKicker: { ...textStyle("label"), color: c.muted, marginHorizontal: 4, marginBottom: 2 },
  debugItem: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: c.paper, gap: 2 },
  debugItemTitle: { ...textStyle("heading"), color: c.ink },
  debugItemDetail: { ...textStyle("caption"), color: c.muted },
  debugReset: { paddingVertical: 8, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: c.line },
  debugResetText: { ...textStyle("caption"), color: c.muted },
  profile: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  selected: {
    opacity: 0.9,
  },
  photo: { width: "100%", height: "100%" },
};});
