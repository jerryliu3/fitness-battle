import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { onboardingCrewGoal, onboardingCrewReplay, type GuestIntroDraft } from "@fitness-battle/shared";
import { CrewRelay } from "./crew-relay";
import { AppText } from "../ui/section";
import { IconButton } from "../ui/icon-button";
import { useThemeColors } from "../theme";
import { useReducedMotion } from "../ui/use-reduced-motion";

export function OnboardingCrew({ draft }: { draft: GuestIntroDraft }) {
  const c = useThemeColors(), reduced = useReducedMotion();
  const [progress, setProgress] = useState(0), [playing, setPlaying] = useState(true);
  const frame = useRef(progress), width = useRef(1);
  frame.current = progress;
  useEffect(() => {
    if (!playing) return;
    if (reduced) { setProgress(1); setPlaying(false); return; }
    const from = frame.current, started = Date.now();
    const timer = setInterval(() => {
      const next = Math.min(1, from + (Date.now() - started) / 3600);
      setProgress(next);
      if (next === 1) setPlaying(false);
    }, 40);
    return () => clearInterval(timer);
  }, [playing, reduced]);
  const scrub = (x: number) => { setPlaying(false); setProgress(Math.max(0, Math.min(1, x / width.current))); };
  return <View style={{ gap: 12 }}>
    <AppText role="label">{onboardingCrewGoal(draft, progress)}</AppText>
    <CrewRelay {...onboardingCrewReplay(draft, progress)} compact userId="you" units="metric" />
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      <IconButton icon={playing ? "pause" : "play"} label={playing ? "Pause crew replay" : "Play crew replay"} onPress={() => { if (!playing && progress >= 1) setProgress(0); setPlaying(!playing); }} />
      <View accessible accessibilityRole="adjustable" accessibilityLabel="Crew replay timeline" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]} onAccessibilityAction={e => { setPlaying(false); setProgress(Math.max(0, Math.min(1, progress + (e.nativeEvent.actionName === "increment" ? .1 : -.1)))); }}
        onLayout={e => { width.current = Math.max(1, e.nativeEvent.layout.width); }} onStartShouldSetResponder={() => true}
        onResponderGrant={e => scrub(e.nativeEvent.locationX)} onResponderMove={e => scrub(e.nativeEvent.locationX)} style={{ flex: 1, height: 44, justifyContent: "center" }}>
        <View pointerEvents="none" style={{ height: 6, backgroundColor: c.line, borderRadius: 8 }}><View style={{ width: `${progress * 100}%`, height: 6, borderRadius: 8, backgroundColor: c.tennis }} /></View>
        <View pointerEvents="none" style={{ position: "absolute", left: `${progress * 100}%`, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: c.ink }} />
      </View>
    </View>
  </View>;
}
