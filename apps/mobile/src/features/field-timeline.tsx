import { Pressable, Text, View } from "react-native";
import { textStyle } from "../ui/section";
import { SHELL_COLORS as c } from "../theme";
import { ReplayTimeline } from "./replay-timeline";
import type { FieldTimelineState } from "./use-field-timeline";

export function FieldTimeline({ timeline: t }: { timeline: FieldTimelineState }) {
  const action = (label: string, onPress: () => void, disabled = false, accessibilityLabel = label) => <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: "center", opacity: disabled ? .4 : 1 }}><Text style={{ ...textStyle("label"), color: c.ink }}>{label}</Text></Pressable>;
  return <View onTouchStart={event => event.stopPropagation()} style={{ backgroundColor: c.paper, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text style={{ ...textStyle("caption"), color: c.ink, flex: 1 }}>{t.error || (!t.ready ? "Loading timeline…" : t.label)}</Text>
      {t.error ? action("Retry timeline", t.retry) : <>{action(t.playing ? "Pause replay" : "Replay", t.toggle, !t.ready || !t.count)}{action(`${t.speed}×`, t.changeSpeed, false, `Playback speed ${t.speed} times`)}</>}{action("Latest", t.live, !t.frame)}
    </View>
    <ReplayTimeline label="Competition timeline" count={t.ready ? t.count : 0} cursor={t.cursor} caption={t.label} onSeek={t.seek} />
    {t.ready && <Text style={{ ...textStyle("caption"), color: c.muted }}>{t.count ? t.preview ? "Local preview" : "Workout timeline" : "No counted activity yet"}{t.simulated ? " · Simulated daily steps" : ""}</Text>}
  </View>;
}
