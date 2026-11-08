import { useId } from "react";
import { Platform, ScrollView, Pressable, View, useWindowDimensions } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from "react-native-svg";
import { SPORTS, type SportId, COMPETE_ART, COMPETE_ART_COLORS, COMPETE_CATEGORIES, competeHomeRank, COMPETE_ICONS, SPORT_ICON_PATHS, competeHomeResult, type CompeteEvent, type CompeteState } from "@fitness-battle/shared";
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
  const color = gold ? c.podiumGold : COMPETE_ART_COLORS[event];
  return <View pointerEvents="none" accessible={false} style={{ position: "absolute", right: 0, bottom: 0, width: feature ? 240 : "100%", height: feature ? 160 : "100%" }}>
    <Svg accessible={Platform.OS === "web" ? undefined : false} aria-hidden={Platform.OS === "web" ? true : undefined} width="100%" height="100%" viewBox="0 0 240 160" preserveAspectRatio="none">
      {COMPETE_ART[event].map((path, index) => <Path key={path} d={path} fill={index === 0 || event === "sleep" ? color : "none"} fillOpacity={index === 0 ? 0.45 : 0.25} stroke={event === "running" || event === "cycling" ? c.card : "none"} strokeWidth={index === 0 ? 0 : 3} />)}
    </Svg>
  </View>;
}

export function ExploreEvents({ onChoose }: { onChoose(event: CompeteEvent): void }) {
  const c = useThemeColors();
  const { width } = useWindowDimensions();
  const categories = COMPETE_CATEGORIES;
  return <View style={{ gap: 20 }}>
    <AppText role="heading" accessibilityRole="header">Explore events</AppText>
    {categories.map(category => <View key={category.id} style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <CompeteIcon name={category.id === "recovery" ? "recovery" : category.id} size={22} />
        <AppText role="label">{category.title}</AppText>
        <AppText role="caption" secondary style={{ marginLeft: "auto" }}>{category.events.map(event => event[0].toUpperCase() + event.slice(1)).join(", ")}</AppText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
        {category.events.map(event => <Pressable key={event} accessibilityRole="button" accessibilityLabel={`Explore ${event}`} onPress={() => onChoose(event)} style={({ pressed }) => ({ width: category.events.length === 1 ? Math.min(340, width - 48) : 158, minHeight: 104, padding: 14, gap: 8, borderWidth: 1, borderColor: c.line, borderRadius: 20, backgroundColor: c.card, overflow: "hidden", opacity: pressed ? 0.7 : 1 })}>
          <EventArt event={event} />
          <CompeteIcon name={event} size={28} />
          <AppText role="label">{event[0].toUpperCase() + event.slice(1)}</AppText>
        </Pressable>)}
      </ScrollView>
    </View>)}
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
      {[{ label: "Latest result", ...result, icon: "trophy" as const, action: "Competition history", onPress: onHistory }, { label: "Your rank", value: competeHomeRank(state), icon: "crown" as const, action: "All-time standings", onPress: onRankings }].map((item, index) => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={`${item.action}, ${item.value === "—" ? "No results yet" : item.value}`} onPress={item.onPress} style={({ pressed }) => ({ flex: stacked ? undefined : 1, borderWidth: 1, borderColor: c.line, borderRadius: 20, backgroundColor: c.card, overflow: "hidden", opacity: pressed ? 0.7 : 1 })}>
        <View style={{ padding: 14, gap: 6, minHeight: 76, flexGrow: 1, backgroundColor: index === 0 ? c.actionSoft : c.accentSecondarySoft, overflow: "hidden" }}>
          <MetallicFill silver={index === 1} />
          <EventArt event={index === 0 ? "cycling" : "sleep"} gold />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><CompeteIcon name={item.icon} gold /><View style={{ flex: 1, gap: 4 }}><AppText role="caption" secondary>{item.label}</AppText><AppText role="heading">{item.value}</AppText></View></View>
        </View>
        <View style={{ padding: 12, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8 }}><AppText role="caption" style={{ flex: 1 }}>{item.action}</AppText><AppIcon name="chevron" size={18} /></View>
      </Pressable>)}
    </View>
  </View>;
}

export function CrewEvents({ onChoose }: { onChoose(sport: SportId): void }) {
  const c = useThemeColors();
  const { width } = useWindowDimensions();
  const bannerWidth = Math.min(560, width - 48);
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={bannerWidth + 12} decelerationRate="fast" accessibilityLabel="Crew events carousel" contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
    {SPORTS.map(sport => <Pressable key={sport.id} accessibilityRole="button" accessibilityLabel={`${sport.name} with your crew`} onPress={() => onChoose(sport.id)} style={({ pressed }) => ({ width: bannerWidth, minHeight: 112, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: c.actionSoft, borderWidth: 1, borderColor: c.line, borderRadius: 20, overflow: "hidden", opacity: pressed ? 0.7 : 1 })}>
      <MetallicFill />
      <EventArt event="running" feature gold />
      <View style={{ flexShrink: 0 }}><CompeteIcon name="crew" size={42} gold /></View>
      <View style={{ flex: 1, gap: 4 }}><AppText role="caption">CREW EVENT</AppText><AppText role="label">{sport.name} challenge</AppText><AppText role="caption" secondary>Compete with your crew</AppText></View><View style={{ flexDirection: "row", alignItems: "center", minHeight: 44, gap: 6, paddingHorizontal: 16, borderRadius: 99, backgroundColor: c.card }}><AppText role="label">Join</AppText><AppIcon name="chevron" size={16} /></View>
    </Pressable>)}
  </ScrollView>;
}
