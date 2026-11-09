import { useReducedMotion } from "../ui/use-reduced-motion";
import { useEffect, useRef, useState } from "react";
import { useCompetitionCourse } from "./use-competition-course";
import { GeographicCourse } from "./geographic-course";
import { useCompeteStore } from "../lib/compete-store";
import { Animated, Image, Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { competeEventCarouselPageIndex, formatActivityAge, competePeriodWindow, buildArenaModel, competitionQueue, competitionTrack, competeNow, SPORTS, type CompeteState, type SportId } from "@fitness-battle/shared";
import { AppText, textStyle } from "../ui/section";
import { useThemeColors } from "../theme";
import { AppIcon } from "../ui/app-icon";
import { useEventActivity } from "./use-event-activity";
import { CompeteIcon, EventArt } from "./compete-home-sections";

const snapshotCache = new Map<string, string>();

/** Read-only event previews; entering is an explicit presentation action. */
export function EventHome({ state, accountKey, onEnter, onRecovery, active }: { active: boolean; state: CompeteState; accountKey: string; onEnter(account: string, sport: SportId): void; onRecovery(): void }) {
  const c = useThemeColors();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const cardWidth = Math.min(360, width - 64);
  const count = state.ratings.filter(r => r.optedIn).length + Number(state.healthRatings.some(r => r.optedIn));
  return <View style={{ gap: 14 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><AppText role="heading" accessibilityRole="header">Your events</AppText><AppText role="caption" secondary>{count} registered</AppText></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardWidth + 12} decelerationRate="fast" onScroll={event => setPage(competeEventCarouselPageIndex(event.nativeEvent.contentOffset.x, cardWidth + 12, count))} scrollEventThrottle={100} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
    {state.ratings.filter(r => r.optedIn).map(rating => <RegisteredEventCard key={rating.sport} state={state} sport={rating.sport} active={active} cardWidth={cardWidth} onEnter={() => onEnter(accountKey, rating.sport)} />)}
    {state.healthRatings.some(r => r.optedIn) ? <Pressable accessibilityRole="button" accessibilityLabel="Open Recovery" onPress={onRecovery} style={{ width: cardWidth, padding: 20, gap: 12, backgroundColor: c.accentSecondarySoft, borderRadius: 20, borderWidth: 1, borderColor: c.line, overflow: "hidden" }}><EventArt event="sleep" feature /><CompeteIcon name="sleep" /><AppText role="heading">Recovery</AppText><AppText role="body" secondary>Sleep competition</AppText><View style={{ flex: 1, minHeight: 120 }} /><AppText role="label">View event →</AppText></Pressable> : null}
    </ScrollView>
    {count > 1 && <View accessibilityLabel={`Event ${Math.min(page + 1, count)} of ${count}`} style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>{Array.from({ length: count }, (_, index) => <View key={index} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: index === Math.min(page, count - 1) ? c.podiumGold : c.line }} />)}</View>}
    {!count ? <AppText role="body" secondary>Explore an event below to join your first field.</AppText> : null}
  </View>;
}

function RegisteredEventCard({ state, sport, active, cardWidth, onEnter }: { state: CompeteState; sport: SportId; active: boolean; cardWidth: number; onEnter(): void }) {
  const c = useThemeColors();

  const queue = competitionQueue(state, sport, competeNow(state));

  const queued = queue?.queued || queue?.awaitingField;
  const model = buildArenaModel(state, undefined, competitionTrack(sport), sport);
  const lanes = model?.lanes.filter(lane => !lane.ghost) ?? [];
  const me = lanes.find(lane => lane.you);
  const total = me?.values[2] ?? 0;
  const place = 1 + lanes.filter(lane => lane.values[2] > total).length;

  const { rows } = useEventActivity(state, sport, active && !queued);
  const update = formatActivityAge(rows[0]?.at, competeNow(state));
  return <View style={{ width: cardWidth, padding: 12, gap: 12, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <View style={{ padding: 9, borderRadius: 12, backgroundColor: c.actionSoft }}><CompeteIcon name={sport} /></View>
      <View style={{ flex: 1 }}><AppText role="label">{SPORTS.find(item => item.id === sport)?.name}</AppText><View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>{!queued && <LiveIndicator active={active} />}<AppText role="support" secondary style={{ flexShrink: 1 }}>{queued ? "Upcoming wave" : `last update: ${update === "—" ? "Unavailable" : update}`}</AppText></View></View>
      <AppText role="caption" secondary>{queued ? "" : `Place ${place} / ${lanes.length}`}</AppText>
    </View>
    <CoursePreview state={state} sport={sport} queued={Boolean(queued)} />
    <Pressable accessibilityRole="button" accessibilityLabel={`Enter ${SPORTS.find(item => item.id === sport)?.name} field`} onPress={onEnter} hitSlop={{ top: 6, bottom: 6 }} style={({ pressed }) => ({ minHeight: 32, marginTop: -8, marginBottom: -8, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, opacity: pressed ? 0.6 : 1 })}>
      <AppText role="label">See race</AppText><AppIcon name="chevron" size={20} />
    </Pressable>
  </View>;
}

export function CoursePreview({ state, sport, queued }: { state: CompeteState; sport: SportId; queued: boolean }) {
  const c = useThemeColors();
  const period = competePeriodWindow(state, competeNow(state), sport);
  const { debugActive, accountKey } = useCompeteStore();
  const { course } = useCompetitionCourse(sport, period.startsAt.toISOString(), period.endsAt.toISOString(), debugActive, true);
  const model = buildArenaModel(state, undefined, competitionTrack(sport), sport);
  const me = model?.lanes.find(lane => lane.you);
  const key = `race-card-square-v6:${queued}:${accountKey}:${sport}:${course?.name}:${course?.length}:${me?.values[2]}:${state.units}`;
  return <View style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}><SnapshotPreview key={key} cacheKey={key} course={course} lane={me} unit={model?.unit ?? ""} queued={queued} mysteryCount={model?.lanes.filter(l => l.mystery).length ?? 0} />
    {course ? <View style={{ position: "absolute", bottom: 4, right: 6, maxWidth: "95%", flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 6, backgroundColor: c.card, borderRadius: 4, paddingHorizontal: 4 }}>
      {[{ label: "© Mapbox", url: "https://www.mapbox.com/about/maps" }, { label: "© OpenStreetMap", url: "https://www.openstreetmap.org/copyright" }, { label: "ⓘ", url: "https://apps.mapbox.com/feedback/" }].map(link => <Pressable key={link.label} accessibilityRole="link" accessibilityLabel={link.label === "ⓘ" ? "Improve this map" : link.label} hitSlop={8} onPress={event => { event.stopPropagation(); void Linking.openURL(link.url); }}><Text style={{ ...textStyle("nav"), color: c.muted }}>{link.label}</Text></Pressable>)}
    </View> : null}
  </View>;
}
function SnapshotPreview({ cacheKey, course, lane, unit, queued, mysteryCount }: { cacheKey: string; course: ReturnType<typeof useCompetitionCourse>["course"]; lane: NonNullable<ReturnType<typeof buildArenaModel>>["lanes"][number] | undefined; unit: string; queued: boolean; mysteryCount: number }) {
  const c = useThemeColors();
  const [uri, setUri] = useState(() => snapshotCache.get(cacheKey) ?? "");
  const capture = (value: string) => { if (snapshotCache.size >= 32) snapshotCache.delete(snapshotCache.keys().next().value!); snapshotCache.set(cacheKey, value); setUri(value); };
  const [expired, setExpired] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setExpired(true), 15000); return () => clearTimeout(timer); }, []);
  return <View pointerEvents="none" style={{ width: "100%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: c.paper }}>
    {uri ? <Image source={{ uri }} resizeMode="cover" accessibilityLabel="3D snapshot of your current race position" style={{ width: "100%", height: "100%" }} /> : !expired && course && lane && (unit === "mi" || unit === "km") ? <GeographicCourse course={course} lanes={[{ id: lane.id, name: lane.name, initials: "", you: true, value: queued ? 0 : lane.values[2] }, ...(queued ? Array.from({ length: mysteryCount }, (_, i) => ({ id: `mystery-${i}`, name: "?", initials: "?", you: false, mystery: true, value: 0 })) : [])]} unit={unit} selectedId={lane.id} focusRequest={0} onSelect={() => {}} onSnapshot={capture} optionsTop={null} /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><AppText role="caption" secondary>{unit === "pts" ? "Points event" : "Preview unavailable"}</AppText></View>}
  </View>;
}

function LiveIndicator({ active }: { active: boolean }) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced || !active) { opacity.setValue(1); return; }
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.35, duration: 900, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [active, reduced, opacity]);
  return <Animated.View accessible={false} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.statusSuccess, opacity }} />;
}
