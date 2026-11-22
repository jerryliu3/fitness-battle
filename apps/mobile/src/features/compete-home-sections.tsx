import { pageCarouselStyles } from "../ui/carousel-styles";
import { useId } from "react";
import { Platform, ScrollView, Pressable, View, useWindowDimensions } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from "react-native-svg";
import { SPORTS, sportById, type SportId, COMPETE_ART, COMPETE_ART_COLORS, COMPETE_CATEGORIES, competeHomeRank, COMPETE_ICONS, SPORT_ICON_PATHS, APP_ICON_PATHS, competeHomeResult, sortSpecialEvents, specialEventFormatLabel, specialEventPhase, specialEventStatusBadge, type CompeteEvent, type CompeteState, type SpecialEventEdition } from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { AppText } from "../ui/section";
import { AppIcon } from "../ui/app-icon";
import { MedalGoldFill } from "../ui/medal-gold-fill";
import { WaveCountdown } from "../ui/wave-countdown";
import { CoursePreview } from "./event-home";

export function CompeteIcon({ name, size = 26, gold = false, color }: { name: keyof typeof COMPETE_ICONS | CompeteEvent; size?: number; gold?: boolean; color?: string }) {
  const c = useThemeColors();
  const path = name in COMPETE_ICONS ? COMPETE_ICONS[name as keyof typeof COMPETE_ICONS] : SPORT_ICON_PATHS[name as keyof typeof SPORT_ICON_PATHS];
  const resolved = color ?? (gold ? c.podiumGold : c.ink);
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={resolved} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" accessible={Platform.OS === "web" ? undefined : false} aria-hidden={Platform.OS === "web" ? true : undefined}><Path d={path} fill={(name in SPORT_ICON_PATHS || name in APP_ICON_PATHS) ? resolved : "none"} stroke={(name in SPORT_ICON_PATHS || name in APP_ICON_PATHS) ? "none" : undefined} /></Svg>;
}

export function CompeteSportBadge({ name, size }: { name: keyof typeof COMPETE_ICONS | CompeteEvent; size?: number }) {
  const c = useThemeColors();
  return (
    <View style={{ padding: 9, borderRadius: 12 }}>
      <MedalGoldFill radius={12} />
      <CompeteIcon name={name} size={size} color={c.textOnAction} />
    </View>
  );
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

function EventTint({ event }: { event: CompeteEvent }) {
  const id = useId();
  return <View pointerEvents="none" style={{ position: "absolute", top: -24, bottom: -24, left: -24, right: -24 }}><Svg pointerEvents="none" accessible={Platform.OS === "web" ? undefined : false} aria-hidden={Platform.OS === "web" ? true : undefined} width="100%" height="100%">
    <Defs><LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%"><Stop offset="0" stopColor={COMPETE_ART_COLORS[event]} stopOpacity={0} /><Stop offset="1" stopColor={COMPETE_ART_COLORS[event]} stopOpacity={0.15} /></LinearGradient></Defs>
    <Rect width="100%" height="100%" fill={`url(#${id})`} />
  </Svg></View>;
}

export function ExploreEvents({ onChoose, state }: { onChoose(event: CompeteEvent): void; state: CompeteState }) {
  const c = useThemeColors();
  const categories = COMPETE_CATEGORIES.map(category => ({ ...category, events: category.events.filter(event => event === "sleep" ? !state.healthRatings.some(r => r.metric === "sleep" && r.optedIn) : !state.ratings.some(r => r.sport === event && r.optedIn)) })).filter(category => category.events.length > 0);
  if (!categories.length) return null;
  return <View style={{ gap: 20 }}>
    <AppText role="heading" accessibilityRole="header">Event registration</AppText>
    {categories.map(category => <View key={category.id} style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <CompeteIcon name={category.id} size={22} />
        <AppText role="label">{category.title}</AppText>
      </View>
      <ScrollView style={pageCarouselStyles.viewport} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[pageCarouselStyles.content, { gap: 12 }]}>
        {category.events.map(event => <Pressable key={event} accessibilityRole="button" accessibilityLabel={`Explore ${event}`} onPress={() => onChoose(event)} style={({ pressed }) => ({ width: 158, minHeight: 104, padding: 14, gap: 8, borderWidth: 1, borderColor: c.line, borderRadius: 20, backgroundColor: c.card, overflow: "hidden", opacity: pressed ? 0.7 : 1 })}>
          <EventTint event={event} />
          <EventArt event={event} />
          <View style={{ alignSelf: "flex-start" }}><CompeteIcon name={event} size={28} /></View>
          <AppText role="label">{event === "sleep" ? "Sleep" : sportById(event).name}</AppText>
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

export function CrewEvents({
  state,
  editions = [],
  now = new Date(),
  onChoose,
  onSelectEdition,
}: {
  state?: CompeteState;
  editions?: SpecialEventEdition[];
  now?: Date;
  onChoose(sport: SportId): void;
  onSelectEdition?(edition: SpecialEventEdition): void;
}) {
  const c = useThemeColors();
  const { width } = useWindowDimensions();
  const bannerWidth = Math.min(560, width - 48);
  const registeredCardWidth = Math.min(340, width - 64);
  if (editions.length > 0 && onSelectEdition) {
    const ordered = sortSpecialEvents(editions);
    return (
      <ScrollView
        style={pageCarouselStyles.viewport}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        accessibilityLabel="Special events carousel"
        contentContainerStyle={[pageCarouselStyles.content, { gap: 12, alignItems: "flex-start" }]}
      >
        {ordered.map((edition) => {
          const status = specialEventStatusBadge(edition, now);
          const phase = specialEventPhase(edition, now);
          if (edition.entry && state) {
            return (
              <View
                key={edition.id}
                style={{
                  width: registeredCardWidth,
                  padding: 12,
                  gap: 12,
                  borderRadius: 20,
                  backgroundColor: c.card,
                  borderWidth: 1,
                  borderColor: c.line,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <CompeteSportBadge name={edition.sport} size={22} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText role="label" numberOfLines={1}>{edition.title}</AppText>
                    <AppText role="support" secondary numberOfLines={1}>
                      {phase === "registering" ? <WaveCountdown start={edition.startsAt} now={now} inline /> : specialEventFormatLabel(edition.config)}
                    </AppText>
                  </View>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: c.actionSoft, borderWidth: 1, borderColor: c.podiumGold }}>
                    <AppText role="caption">{status}</AppText>
                  </View>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Open ${edition.title}`} onPress={() => onSelectEdition(edition)}>
                  <CoursePreview state={state} sport={edition.sport} queued={phase !== "active"} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Enter ${edition.title}`}
                  onPress={() => onSelectEdition(edition)}
                  hitSlop={{ top: 6, bottom: 6 }}
                  style={({ pressed }) => ({ minHeight: 32, marginTop: -8, marginBottom: -8, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, opacity: pressed ? 0.6 : 1 })}
                >
                  <AppText role="label">See event</AppText>
                  <AppIcon name="chevron" size={20} />
                </Pressable>
              </View>
            );
          }
          return (
            <Pressable
              key={edition.id}
              accessibilityRole="button"
              accessibilityLabel={`${edition.title}, ${status}`}
              onPress={() => onSelectEdition(edition)}
              style={({ pressed }) => ({
                width: Math.min(320, bannerWidth),
                minHeight: 112,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                backgroundColor: c.actionSoft,
                borderWidth: 1,
                borderColor: c.line,
                borderRadius: 20,
                overflow: "hidden",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MetallicFill />
              <EventArt event={edition.sport} feature gold />
              <View style={{ flexShrink: 0 }}><CompeteIcon name={edition.sport} size={42} gold /></View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: c.actionSoft, borderWidth: 1, borderColor: c.podiumGold }}>
                  <CompeteIcon name="special" size={12} gold />
                  <AppText role="caption">{specialEventFormatLabel(edition.config)}</AppText>
                </View>
                <AppText role="label">{edition.title}</AppText>
                <AppText role="caption" secondary>{edition.subtitle || `${edition.entrantCount} registered`}</AppText>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", minHeight: 44, gap: 6, paddingHorizontal: 14, borderRadius: 99, backgroundColor: c.card }}>
                <AppText role="label">{status}</AppText>
                <AppIcon name="chevron" size={16} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }
  return <ScrollView style={pageCarouselStyles.viewport} horizontal showsHorizontalScrollIndicator={false} snapToInterval={bannerWidth + 12} decelerationRate="fast" accessibilityLabel="Crew events carousel" contentContainerStyle={[pageCarouselStyles.content, { gap: 12 }]}>
    {SPORTS.map(sport => <Pressable key={sport.id} accessibilityRole="button" accessibilityLabel={`${sport.name} with your crew`} onPress={() => onChoose(sport.id)} style={({ pressed }) => ({ width: bannerWidth, minHeight: 112, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: c.actionSoft, borderWidth: 1, borderColor: c.line, borderRadius: 20, overflow: "hidden", opacity: pressed ? 0.7 : 1 })}>
      <MetallicFill />
      <EventArt event="running" feature gold />
      <View style={{ flexShrink: 0 }}><CompeteIcon name="crew" size={42} gold /></View>
      <View style={{ flex: 1, gap: 4 }}><View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: c.actionSoft, borderWidth: 1, borderColor: c.podiumGold }}><CompeteIcon name="special" size={12} gold /><AppText role="caption">Special event</AppText></View><AppText role="label">{sport.name} challenge</AppText><AppText role="caption" secondary>Compete with your crew</AppText></View><View style={{ flexDirection: "row", alignItems: "center", minHeight: 44, gap: 6, paddingHorizontal: 16, borderRadius: 99, backgroundColor: c.card }}><AppText role="label">Join</AppText><AppIcon name="chevron" size={16} /></View>
    </Pressable>)}
  </ScrollView>;
}
