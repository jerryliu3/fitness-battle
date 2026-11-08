import { useId } from "react";
import { Platform, ScrollView, Pressable, View, useWindowDimensions } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from "react-native-svg";
import { SPORTS, type SportId, COMPETE_ART, COMPETE_CATEGORIES, COMPETE_ICONS, SPORT_ICON_PATHS, competeHomeResult, type CompeteEvent, type CompeteState } from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { AppText } from "../ui/section";
import { AppIcon } from "../ui/app-icon";

export function CompeteIcon({ name, size = 26, gold = false }: { name: keyof typeof COMPETE_ICONS | CompeteEvent; size?: number; gold?: boolean }) {
  const c = useThemeColors();
  const path = name in COMPETE_ICONS ? COMPETE_ICONS[name as keyof typeof COMPETE_ICONS] : SPORT_ICON_PATHS[name as keyof typeof SPORT_ICON_PATHS];
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gold ? c.podiumGold : c.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" accessible={Platform.OS === "web" ? undefined : false} aria-hidden={Platform.OS === "web" ? true : undefined}><Path d={path} /></Svg>;
}

function MetallicFill({ silver = false }: { silver?: boolean }) {
  const c = useThemeColors();
  const id = useId();
  const tint = silver ? c.accentSecondarySoft : c.actionSoft;
  return <Svg pointerEvents="none" accessible={Platform.OS === "web" ? undefined : false} aria-hidden={Platform.OS === "web" ? true : undefined} width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
    <Defs><LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="70%"><Stop offset="0" stopColor={tint} /><Stop offset="0.55" stopColor={c.card} /><Stop offset="1" stopColor={tint} /></LinearGradient></Defs>
    <Rect width="100%" height="100%" fill={`url(#${id})`} />
  </Svg>;
}

export function EventArt({ event, feature = false, gold = false }: { event: CompeteEvent; feature?: boolean; gold?: boolean }) {
  const c = useThemeColors();
  const stroke = feature || gold ? c.podiumGold : event === "sleep" ? c.accentSecondary : event === "strength" ? c.actionPressed : c.statusSuccess;
  return <View pointerEvents="none" accessible={false} style={{ position: "absolute", right: feature ? -15 : -30, bottom: -15, width: feature ? 220 : 160, height: feature ? 180 : 125, opacity: feature ? 0.35 : 0.2 }}>
    <Svg accessible={Platform.OS === "web" ? undefined : false} aria-hidden={Platform.OS === "web" ? true : undefined} width="100%" height="100%" viewBox="0 0 240 160" fill="none" stroke={stroke} strokeWidth={feature ? 18 : 6} strokeLinecap="round">{COMPETE_ART[event].map(path => <Path key={path} d={path} />)}</Svg>
  </View>;
}

export function ExploreEvents({ onChoose }: { onChoose(event: CompeteEvent): void }) {
  const c = useThemeColors();
  return <View style={{ gap: 20 }}>
    <AppText role="heading" accessibilityRole="header">Explore events</AppText>
    {COMPETE_CATEGORIES.map(category => {
      const backgroundColor = category.id === "distance" ? c.statusSuccessSoft : category.id === "time" ? c.actionSoft : c.accentSecondarySoft;
      return <View key={category.id} style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <CompeteIcon name={category.id === "recovery" ? "sleep" : category.id} size={22} />
          <AppText role="label">{category.title}</AppText>
          <AppText role="caption" secondary style={{ marginLeft: "auto" }}>{category.detail}</AppText>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
          {category.events.map(event => <Pressable key={event} accessibilityRole="button" accessibilityLabel={`Explore ${event}`} onPress={() => onChoose(event)} style={({ pressed }) => ({ width: 158, minHeight: 112, padding: 16, gap: 12, borderRadius: 20, backgroundColor, overflow: "hidden", opacity: pressed ? 0.7 : 1 })}>
            <EventArt event={event} />
            <CompeteIcon name={event} size={28} />
            <AppText role="label">{event[0].toUpperCase() + event.slice(1)}</AppText>
          </Pressable>)}
        </ScrollView>
      </View>;
    })}
  </View>;
}

export function CompeteResults({ state, onHistory, onRankings }: { state: CompeteState; onHistory(): void; onRankings(): void }) {
  const c = useThemeColors();
  const { width, fontScale } = useWindowDimensions();
  const result = competeHomeResult(state);
  const stacked = width < 360 || fontScale > 1.2;
  return <View style={{ gap: 14 }}>
    <AppText role="heading" accessibilityRole="header">Results & rankings</AppText>
    <View style={{ flexDirection: stacked ? "column" : "row", gap: 12 }}>
      {[{ label: "Latest result", ...result, icon: "trophy" as const, action: "Competition history", onPress: onHistory }, { label: "All time", value: "Race rankings", detail: "Personal bests & leaderboards", icon: "crown" as const, action: "All-time standings", onPress: onRankings }].map((item, index) => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.action} onPress={item.onPress} style={({ pressed }) => ({ flex: stacked ? undefined : 1, borderWidth: 1, borderColor: c.line, borderRadius: 20, backgroundColor: c.card, overflow: "hidden", opacity: pressed ? 0.7 : 1 })}>
        <View style={{ padding: 16, gap: 8, minHeight: 152, flexGrow: 1, backgroundColor: index === 0 ? c.actionSoft : c.accentSecondarySoft, overflow: "hidden" }}>
          <MetallicFill silver={index === 1} />
          <EventArt event={index === 0 ? "cycling" : "sleep"} gold />
          <CompeteIcon name={item.icon} gold />
          <AppText role="caption" secondary>{item.label}</AppText>
          <AppText role="heading">{item.value}</AppText>
          <AppText role="caption" secondary>{item.detail}</AppText>
        </View>
        <View style={{ padding: 14, minHeight: 60, flexDirection: "row", alignItems: "center", gap: 8 }}><AppText role="caption" style={{ flex: 1 }}>{item.action}</AppText><AppIcon name="chevron" size={18} /></View>
      </Pressable>)}
    </View>
  </View>;
}

export function CrewEvents({ onChoose }: { onChoose(sport: SportId): void }) {
  const c = useThemeColors();
  const { width } = useWindowDimensions();
  const bannerWidth = Math.min(560, width - 56);
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={bannerWidth + 12} decelerationRate="fast" accessibilityLabel="Crew events carousel" contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
    {SPORTS.map(sport => <Pressable key={sport.id} accessibilityRole="button" accessibilityLabel={`${sport.name} with your crew`} onPress={() => onChoose(sport.id)} style={({ pressed }) => ({ width: bannerWidth, minHeight: 184, padding: 20, paddingRight: 48, gap: 12, backgroundColor: c.actionSoft, borderRadius: 24, overflow: "hidden", opacity: pressed ? 0.7 : 1 })}>
      <MetallicFill />
      <EventArt event={sport.id} feature />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><CompeteIcon name="crew" size={18} gold /><AppText role="caption">Crew event</AppText></View>
      <AppText role="heading">{sport.name} with your crew</AppText>
      <AppText role="caption" secondary>Share the field. Set your own pace.</AppText>
      <View style={{ position: "absolute", right: 16, bottom: 20, padding: 6, borderRadius: 99, backgroundColor: c.card }}><AppIcon name="chevron" size={20} /></View>
    </Pressable>)}
  </ScrollView>;
}
