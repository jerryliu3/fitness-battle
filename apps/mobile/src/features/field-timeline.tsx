import { MedalGoldFill } from "../ui/medal-gold-fill";
import { IconButton } from "../ui/icon-button";
import { MapHudBackdrop, useMapHud } from "../ui/map-hud";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialPanel } from "../ui/material-panel";
import { textStyle } from "../ui/section";
import { useThemeColors } from "../theme";
import { ReplayTimeline } from "./replay-timeline";
import type { FieldTimelineState } from "./use-field-timeline";

export function FieldTimeline({ timeline: t, compact = false, floating = false }: { timeline: FieldTimelineState; compact?: boolean; floating?: boolean }) {
  const c = useThemeColors();
  const hud = useMapHud();
  const foreground = floating ? hud.ink : c.ink;
  const action = (label: string, onPress: () => void, disabled = false, accessibilityLabel = label, fixedWidth = false, primary = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44, paddingHorizontal: 10, borderRadius: 999,
        ...(fixedWidth ? { width: 48, paddingHorizontal: 0, flexShrink: 0 } : {}),
        justifyContent: "center", alignItems: "center",
        backgroundColor: primary ? undefined : floating && !hud.light ? "#ffffff24" : c.soft,
        opacity: disabled ? .4 : pressed ? .78 : 1,
      })}
    >
      {primary && <MedalGoldFill radius={999} />}
      <Text style={{ ...textStyle("label"), color: primary ? c.textOnAction : foreground, fontVariant: ["tabular-nums"] }}>{label}</Text>
    </Pressable>
  );
  const material = floating && hud.light ? <MapHudBackdrop radius={22} /> : floating ? (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
        <MaterialPanel style={StyleSheet.absoluteFill} fallbackColor={c.surfaceInverse} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `${c.surfaceInverse}e0`, borderRadius: 22, borderColor: "#ffffff52", borderWidth: 1 }]} />
      </View>
  ) : null;
  if (compact) return <View onTouchStart={event => event.stopPropagation()} style={floating ? { borderRadius: 22, overflow: "hidden", padding: 8, ...hud.chrome } : undefined}>
    {material}
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <IconButton icon={t.playing ? "pause" : "play"} label={t.playing ? "Pause replay" : "Play replay"} disabled={!t.ready || !t.count} onPress={t.toggle} primary haptic={false} />
      <View style={{ flex: 1 }}><ReplayTimeline label="Competition timeline" count={t.ready ? t.count : 0} cursor={t.cursor} caption={t.label} onSeek={t.seek} floating={floating} /></View>
      {action(`${t.speed}×`, t.changeSpeed, false, `Playback speed ${t.speed} times`, true)}
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingLeft: 62, paddingRight: 66 }}>
      <Text style={{ ...textStyle("caption"), color: floating ? foreground : c.muted, flex: 1 }}>{t.error || (!t.ready ? "Loading timeline…" : t.label)}</Text>
      {t.ready && <View style={{ width: 0, alignItems: "center", overflow: "visible" }}><Text style={{ ...textStyle("caption"), color: floating ? foreground : c.muted, width: 44, textAlign: "center" }}>Now</Text></View>}
      {t.error && action("Retry", t.retry)}
    </View>
  </View>;
  return <View onTouchStart={event => event.stopPropagation()} style={{ backgroundColor: floating ? "transparent" : c.paper, borderRadius: floating ? 22 : 12, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 4, ...(floating ? hud.chrome : undefined) }}>
    {material}
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Text style={{ ...textStyle("caption"), color: foreground, flex: 1 }}>{t.error || (!t.ready ? "Loading timeline…" : t.label)}</Text>
      {t.error ? action("Retry timeline", t.retry) : <>{action(t.playing ? "Pause replay" : "Replay", t.toggle, !t.ready || !t.count, undefined, false, true)}{action(`${t.speed}×`, t.changeSpeed, false, `Playback speed ${t.speed} times`, true)}</>}{action("Latest", t.live, !t.frame)}
    </View>
    <ReplayTimeline label="Competition timeline" count={t.ready ? t.count : 0} cursor={t.cursor} caption={t.label} onSeek={t.seek} floating={floating} />
  </View>;
}
