import { useState } from "react";
import { Pressable, View } from "react-native";
import { competitionQueue, type CompeteState, type SportId } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { FocusButton, f } from "../ui/focus";
import { SHELL_COLORS as c } from "../theme";

export function QueuedField({ state, event, now, onCancel, overlay = false }: { state: CompeteState; event: SportId | "sleep"; now: Date; onCancel: () => void; overlay?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const queue = competitionQueue(state, event, now);
  if (!queue) return null;
  if (overlay && !expanded) return <View style={{ position: "absolute", bottom: 16, left: 12, right: 12 }}><FocusButton secondary label={`Wave details · ${queue.startsLabel}`} onPress={() => setExpanded(true)} /></View>;
  return <View style={[f.card, { gap: 12 }, overlay ? { position: "absolute", bottom: 16, left: 12, right: 12, maxWidth: 400, zIndex: 20 } : {}]} accessibilityLabel={`Upcoming competition: you and ${queue.mysteryCount} mystery competitors`}>
    {overlay && <Pressable accessibilityRole="button" accessibilityLabel="Minimize wave details" onPress={() => setExpanded(false)} style={{ position: "absolute", top: 4, right: 4, padding: 12, zIndex: 1 }}><AppText role="label">−</AppText></Pressable>}
    <AppText role="label">{queue.queued ? "You're registered" : "Your wave has started"}</AppText>
    <AppText role="heading">{queue.queued ? "Finding your competitors" : "Revealing your field"}</AppText>
    <AppText role="body" secondary>{queue.queued
      ? "We're matching athletes at your level. Your competitors will be revealed when the wave starts."
      : "Your shared field is loading. Your activity counts from the start time below."}</AppText>
    <View style={{ gap: 8 }}><AppText role="body">Starts {queue.startsLabel}</AppText><AppText role="body">Ends {queue.endsLabel}</AppText></View>
    {queue.queued ? <><AppText role="caption" secondary>Everyone starts at zero. Only activity from your wave's start counts. Sync before the end time; late uploads stay in training.</AppText>
      <FocusButton label="Cancel registration" secondary onPress={onCancel} /></> : null}
  </View>;
}
