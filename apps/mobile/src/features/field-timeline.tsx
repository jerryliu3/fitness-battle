import { AppIcon } from "../ui/app-icon";
import { Pressable, Text, View } from "react-native";
import { textStyle } from "../ui/section";
import { useThemeColors } from "../theme";
import { ReplayTimeline } from "./replay-timeline";
import type { FieldTimelineState } from "./use-field-timeline";

export function FieldTimeline({ timeline: t, compact = false }: { timeline: FieldTimelineState; compact?: boolean }) {
  const c = useThemeColors();
  const action = (label: string, onPress: () => void, disabled = false, accessibilityLabel = label, fixedWidth = false) => <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 44, paddingHorizontal: 10, ...(fixedWidth ? { width: 48, paddingHorizontal: 0, flexShrink: 0, alignItems: "center" as const } : {}), justifyContent: "center", opacity: disabled ? .4 : 1 }}><Text style={{ ...textStyle("label"), color: c.ink, fontVariant: ["tabular-nums"] }}>{label}</Text></Pressable>;
  if (compact) return <View onTouchStart={event => event.stopPropagation()}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t.playing ? "Pause replay" : "Play replay"} disabled={!t.ready || !t.count} onPress={t.toggle} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.ink, alignItems: "center", justifyContent: "center", opacity: t.ready && t.count ? 1 : .4 }}><AppIcon name={t.playing ? "pause" : "play"} size={20} color={c.paper} /></Pressable>
      <View style={{ flex: 1 }}><ReplayTimeline label="Competition timeline" count={t.ready ? t.count : 0} cursor={t.cursor} caption={t.label} onSeek={t.seek} /></View>
      {action(`${t.speed}×`, t.changeSpeed, false, `Playback speed ${t.speed} times`, true)}
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingLeft: 62 }}>
      <Text style={{ ...textStyle("caption"), color: c.muted, flex: 1 }}>{t.error || (!t.ready ? "Loading timeline…" : t.label)}</Text>
      {t.ready && <Text style={{ ...textStyle("caption"), color: c.muted, flexShrink: 1, textAlign: "right" }}>Now</Text>}
      {t.error && action("Retry", t.retry)}
    </View>
  </View>;
  return <View onTouchStart={event => event.stopPropagation()} style={{ backgroundColor: c.paper, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text style={{ ...textStyle("caption"), color: c.ink, flex: 1 }}>{t.error || (!t.ready ? "Loading timeline…" : t.label)}</Text>
      {t.error ? action("Retry timeline", t.retry) : <>{action(t.playing ? "Pause replay" : "Replay", t.toggle, !t.ready || !t.count)}{action(`${t.speed}×`, t.changeSpeed, false, `Playback speed ${t.speed} times`, true)}</>}{action("Latest", t.live, !t.frame)}
    </View>
    <ReplayTimeline label="Competition timeline" count={t.ready ? t.count : 0} cursor={t.cursor} caption={t.label} onSeek={t.seek} />
  </View>;
}
