import { EffortRail } from "../features/effort-rail";

import { usePathname, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { DEBUG_EVENT_OPTIONS, PERSON_ICON_PATH, type DebugEventId } from "@fitness-battle/shared";
import { useCompeteStore } from "../lib/compete-store";
import { isAthleteSettingsPath } from "../lib/navigation";
import { SHELL_COLORS as c } from "../theme";

export function AppHeader() {
  const { state, debugActive, triggerDebugEvent, resetDebugState } = useCompeteStore();
  const [debugOpen, setDebugOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const onAthlete = isAthleteSettingsPath(path);

  function handleSelectDebug(eventId: DebugEventId) {
    setDebugOpen(false);
    const result = triggerDebugEvent?.(eventId);
    if (!result) return;
    if (eventId === "sync-activity") {
      if (path !== "/today" && path !== "/arena") router.navigate("/today");
      return;
    }
    router.push(result.targetRoute);
  }

  return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      <View style={s.header}>
        <View style={{ flex: 1, maxWidth: 260 }}><EffortRail compact /></View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Debug event triggers"
            accessibilityState={{ expanded: debugOpen }}
            onPress={() => setDebugOpen((open) => !open)}
            style={[s.debugBtn, debugActive && s.debugBtnActive]}
          >
            <Text style={s.debugBtnText}>Debug {debugOpen ? "▴" : "▾"}</Text>
          </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open athlete settings"
          accessibilityState={{ selected: onAthlete }}
          onPress={() => router.navigate("/athlete")}
          style={[s.profile, onAthlete && s.selected]}
        >
          {state?.avatarUrl ? (
            <Image source={{ uri: state.avatarUrl }} style={s.photo} />
          ) : (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" accessible={Platform.OS==="web"?undefined:false}>
              <Path d={PERSON_ICON_PATH}/>
            </Svg>
          )}
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

const s = StyleSheet.create({
  safe: { backgroundColor: c.paper, zIndex: 30 },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  debugBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: c.line, backgroundColor: c.card },
  debugBtnActive: { borderColor: c.tennis, backgroundColor: "#fff5d1" },
  debugBtnText: { fontFamily: "DMSans_700Bold", fontSize: 11, color: c.ink },
  debugMenu: { marginHorizontal: 22, marginBottom: 10, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, gap: 6 },
  debugKicker: { fontFamily: "DMSans_700Bold", fontSize: 9, letterSpacing: 1, color: c.muted, marginHorizontal: 4, marginBottom: 2 },
  debugItem: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: c.paper, gap: 2 },
  debugItemTitle: { fontFamily: "DMSans_700Bold", fontSize: 12, color: c.ink },
  debugItemDetail: { fontFamily: "DMSans_400Regular", fontSize: 11, color: c.muted },
  debugReset: { paddingVertical: 8, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: c.line },
  debugResetText: { fontFamily: "DMSans_500Medium", fontSize: 11, color: c.muted },
  profile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: c.line,
  },
  selected: { borderColor: c.tennis },
  photo: { width: "100%", height: "100%" },
});
