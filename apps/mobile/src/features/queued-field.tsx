import { useFocusStyles } from "../ui/focus";
import { WaveCountdown } from "../ui/wave-countdown";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { competitionQueue, type CompeteState, type SportId } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { FocusButton } from "../ui/focus";


export function QueuedField({ state, event, now, onCancel, overlay = false }: { state: CompeteState; event: SportId | "sleep"; now: Date; onCancel: () => void; overlay?: boolean }) {
const f=useFocusStyles();

  const [expanded, setExpanded] = useState(true);
  const queue = competitionQueue(state, event, now);
  if (!queue) return null;
  if (overlay && !expanded) return <View style={{ position: "absolute", bottom: 16, left: 12, right: 12 }}><FocusButton secondary label={`Wave details · ${queue.startsLabel}`} onPress={() => setExpanded(true)} /></View>;
  return <View style={[f.card, { gap: 12 }, overlay ? { position: "absolute", bottom: 16, left: 12, right: 12, maxWidth: 400, zIndex: 20 } : {}]} accessibilityLabel={`Upcoming competition: you and ${queue.mysteryCount} mystery competitors`}>
    {overlay && <Pressable accessibilityRole="button" accessibilityLabel="Minimize wave details" onPress={() => setExpanded(false)} style={{ position: "absolute", top: 4, right: 4, padding: 12, zIndex: 1 }}><AppText role="label">−</AppText></Pressable>}
    {!queue.queued ? <AppText role="label">Your wave has started</AppText> : null}
    <AppText role="heading">{queue.queued ? "You’re on the start list" : "Revealing your field"}</AppText>
    <AppText role="body" secondary>{queue.queued
      ? "Your matched field is revealed when the wave starts."
      : "Your shared field is loading. Your activity counts from the start time below."}</AppText>
    <View style={{ gap: 8 }}><View style={{flexDirection:"row",flexWrap:"wrap",gap:8,alignItems:"center"}}><AppText role="body">Starts {queue.startsLabel}</AppText>{queue.queued && <WaveCountdown start={queue.start} now={now}/>}</View><AppText role="body">Ends {queue.endsLabel}</AppText></View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{Array.from({ length: queue.mysteryCount + 1 }, (_, i) => <View key={i} style={{ padding: 12 }}><AppText role="label">{i === 0 ? "You" : "?"}</AppText></View>)}</View>
    {queue.queued ? <FocusButton label="Cancel registration" secondary onPress={onCancel} /> : null}
  </View>;
}
