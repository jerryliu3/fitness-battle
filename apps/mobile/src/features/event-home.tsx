import { MedalGoldFill } from "../ui/medal-gold-fill";
import { nativeMedalGold } from "../ui/medal-gold";
import { WaveCountdown } from "../ui/wave-countdown";
import { pageCarouselStyles } from "../ui/carousel-styles";
import { useEffect, useRef, useState } from "react";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useCompetitionCourse } from "./use-competition-course";
import { GeographicCourse } from "./geographic-course";
import { useCompeteStore } from "../lib/compete-store";
import { type GestureResponderEvent, Image, Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { competeEventCarouselPageIndex, formatActivityAge, competitionCourseWindow, coursePreviewLanes, initialsFromName, type ArenaSceneLane, buildArenaModel, competitionQueue, competitionTrack, competeNow, isMetricCompete, ordinalPlace, SPORTS, type CompeteState, type SportId } from "@fitness-battle/shared";
import { AppText, textStyle } from "../ui/section";
import { useThemeColors } from "../theme";
import { AppIcon } from "../ui/app-icon";
import { useEventActivity } from "./use-event-activity";
import { CompeteIcon, EventArt } from "./compete-home-sections";
import { CompeteTimeSeriesChart } from "../ui/compete-time-series-chart";

const TAP_SLOP = 10;
const snapshotCache = new Map<string, string>();

/** Read-only event previews; entering is an explicit presentation action. */
export function EventHome({ state, accountKey, onEnter, onRecovery, active }: { active: boolean; state: CompeteState; accountKey: string; onEnter(account: string, sport: SportId): void; onRecovery(): void }) {
  const c = useThemeColors();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const touch = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const startTap = ({ nativeEvent: { pageX, pageY } }: GestureResponderEvent) => {
    touch.current = { x: pageX, y: pageY, moved: false };
  };
  const checkTap = ({ nativeEvent: { pageX, pageY } }: GestureResponderEvent) => {
    const start = touch.current;
    if (start && Math.hypot(pageX - start.x, pageY - start.y) > TAP_SLOP) start.moved = true;
  };
  const [availableWidth, setAvailableWidth] = useState(width - 40);
  const clearTap = () => {
    const ended = touch.current;
    requestAnimationFrame(() => { if (touch.current === ended) touch.current = null; });
  };
  const count = state.ratings.filter(r => r.optedIn).length + Number(state.healthRatings.some(r => r.optedIn));
  const cardWidth = count === 1 ? availableWidth : Math.min(360, availableWidth - 24);
  return <View onTouchStart={startTap} onTouchMove={checkTap} onTouchEnd={clearTap} onTouchCancel={clearTap} onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)} style={{ gap: 14 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><AppText role="heading" accessibilityRole="header">Your events</AppText><AppText role="caption" secondary>{count} registered</AppText></View>
    <EventCarousel count={count} cardWidth={cardWidth} onPageChange={setPage}>
    {state.ratings.filter(r => r.optedIn).map(rating => <RegisteredEventCard key={rating.sport} state={state} sport={rating.sport} active={active} cardWidth={cardWidth} onEnter={() => { if (!touch.current?.moved) onEnter(accountKey, rating.sport); }} />)}
    {state.healthRatings.some(r => r.optedIn) ? <Pressable accessibilityRole="button" accessibilityLabel="Open Recovery" onPress={() => { if (!touch.current?.moved) onRecovery(); }} style={{ width: cardWidth, padding: 20, gap: 12, backgroundColor: c.accentSecondarySoft, borderRadius: 20, borderWidth: 1, borderColor: c.line, overflow: "hidden" }}><EventArt event="sleep" feature /><CompeteIcon name="sleep" /><AppText role="heading">Recovery</AppText><AppText role="body" secondary>Sleep competition</AppText><View style={{ flex: 1, minHeight: 120 }} /><AppText role="label">View event →</AppText></Pressable> : null}
    </EventCarousel>
    {count > 1 && <View accessibilityLabel={`Event ${Math.min(page + 1, count)} of ${count}`} style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>{Array.from({ length: count }, (_, index) => <View key={index} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: index === Math.min(page, count - 1) ? c.podiumGold : c.line }} />)}</View>}
    {!count ? <AppText role="body" secondary>Explore an event below to join your first field.</AppText> : null}
  </View>;
}

function EventCarousel({ count, cardWidth, onPageChange, children }: { count: number; cardWidth: number; onPageChange(page: number): void; children: React.ReactNode }) {
  if (count <= 1) return count === 1 ? <View>{children}</View> : null;
  return <ScrollView style={pageCarouselStyles.viewport} horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardWidth + 12} decelerationRate="fast" onScroll={event => onPageChange(competeEventCarouselPageIndex(event.nativeEvent.contentOffset.x, cardWidth + 12, count))} scrollEventThrottle={100} contentContainerStyle={[pageCarouselStyles.content, { gap: 12 }]}>
    {children}
  </ScrollView>;
}

function RegisteredEventCard({ state, sport, active, cardWidth, onEnter }: { state: CompeteState; sport: SportId; active: boolean; cardWidth: number; onEnter(): void }) {
  const c = useThemeColors();

  const now = competeNow(state);
  const queue = competitionQueue(state, sport, now);

  const queued = queue?.queued || queue?.awaitingField;
  const model = buildArenaModel(state, undefined, competitionTrack(sport), sport);
  const lanes = model?.lanes.filter(lane => !lane.ghost) ?? [];
  const me = lanes.find(lane => lane.you);
  const total = me?.values[2] ?? 0;
  const place = 1 + lanes.filter(lane => lane.values[2] > total).length;

  const { rows, loading, error } = useEventActivity(state, sport, active && !queued);
  const update = formatActivityAge(rows[0]?.at, competeNow(state));
  const liveUpdateText = queued ? "Upcoming wave" : update !== "—" ? `Last update: ${update}` : !loading && !error ? "No updates yet" : null;
  const cachedUpdate = useRef<string | null>(null);
  if (liveUpdateText) cachedUpdate.current = liveUpdateText;
  const updateText = liveUpdateText ?? cachedUpdate.current;
  const showLiveIndicator = !queued && Boolean(cachedUpdate.current);
  return <View style={{ width: cardWidth, padding: 12, gap: 12, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <View style={{ padding: 9, borderRadius: 12, backgroundColor: nativeMedalGold }}><MedalGoldFill radius={12} /><CompeteIcon name={sport} color={c.textOnAction} /></View>
      <View style={{ flex: 1 }}>
        <AppText role="label">{SPORTS.find(item => item.id === sport)?.name}</AppText>
        {updateText ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {showLiveIndicator ? <LiveIndicator /> : null}
            <AppText role="support" secondary style={{ flexShrink: 1 }}>{queue?.queued ? <WaveCountdown start={queue.start} now={now} inline /> : updateText}</AppText>
          </View>
        ) : null}
      </View>
      {!queued && (
        <View style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 99,
          backgroundColor: c.soft,
          borderWidth: 1,
          borderColor: c.line,
        }}>
          <AppText role="caption" >{`${ordinalPlace(place)} place`}</AppText>
        </View>
      )}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Open race fullscreen" onPress={onEnter}><CoursePreview state={state} sport={sport} queued={Boolean(queued)} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`Enter ${SPORTS.find(item => item.id === sport)?.name} field`} onPress={onEnter} hitSlop={{ top: 6, bottom: 6 }} style={({ pressed }) => ({ minHeight: 32, marginTop: -8, marginBottom: -8, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, opacity: pressed ? 0.6 : 1 })}>
      <AppText role="label">See race</AppText><AppIcon name="chevron" size={20} />
    </Pressable>
  </View>;
}

export function CoursePreview({ state, sport, queued }: { state: CompeteState; sport: SportId; queued: boolean }) {
  const { blocks } = useAthleteBlocks();
  const c = useThemeColors();
  const period = competitionCourseWindow(state, competeNow(state), sport);
  const { debugActive, accountKey } = useCompeteStore();
  const { course } = useCompetitionCourse(sport, period.startsAt.toISOString(), period.endsAt.toISOString(), debugActive, true);
  const model = buildArenaModel(state, undefined, competitionTrack(sport), sport);
  const me = model?.lanes.find(lane => lane.you);

  if (!queued && isMetricCompete(sport)) {
    return (
      <View
        style={{
          width: "100%",
          aspectRatio: 1,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: c.paper,
          borderWidth: 1,
          borderColor: c.line,
          justifyContent: "space-between",
        }}
      >
        <CompeteTimeSeriesChart state={state} sport={sport} track={competitionTrack(sport)} compact />
      </View>
    );
  }

  const previewLanes = queued ? [{ id: me?.id ?? "you", name: me?.name ?? state.name, initials: "", you: true, value: 0 }, ...Array.from({ length: model?.lanes.filter(l => l.mystery).length ?? 0 }, (_, i) => ({ id: `mystery-${i}`, name: `Athlete #${i + 1}`, initials: "?", mystery: true, value: 0 }))] : coursePreviewLanes((model?.lanes ?? []).filter(lane => !blocks.some(block => block.id === lane.id)).map(lane => ({ id: lane.id, name: lane.name, initials: lane.mystery ? "?" : initialsFromName(lane.name), avatarUrl: lane.avatarUrl, you: lane.you, ghost: lane.ghost, mystery: lane.mystery, value: lane.values[2] })), model?.unit ?? "");
  const key = `race-card-local-v9:${JSON.stringify(previewLanes)}:${queued}:${accountKey}:${sport}:${course?.name}:${course?.length}:${me?.values[2]}:${state.units}`;
  return <View style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}><SnapshotPreview key={`${accountKey}:${sport}:${state.units}`} cacheKey={key} course={course} lanes={previewLanes} unit={model?.unit ?? ""} />
    {course ? <View style={{ position: "absolute", top: 4, right: 6, maxWidth: "95%", flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 6, backgroundColor: c.card, borderRadius: 4, paddingHorizontal: 4 }}>
      {[{ label: "© Mapbox", url: "https://www.mapbox.com/about/maps" }, { label: "© OpenStreetMap", url: "https://www.openstreetmap.org/copyright" }, { label: "ⓘ", url: "https://apps.mapbox.com/feedback/" }].map(link => <Pressable key={link.label} accessibilityRole="link" accessibilityLabel={link.label === "ⓘ" ? "Improve this map" : link.label} hitSlop={8} onPress={event => { event.stopPropagation(); void Linking.openURL(link.url); }}><Text style={{ ...textStyle("nav"), color: c.muted }}>{link.label}</Text></Pressable>)}
    </View> : null}
  </View>;
}
function SnapshotPreview({ cacheKey, course, lanes, unit }: { cacheKey: string; course: ReturnType<typeof useCompetitionCourse>["course"]; lanes: ArenaSceneLane[]; unit: string }) {
  const c = useThemeColors();
  const [shown, setShown] = useState(() => snapshotCache.get(cacheKey) ?? "");
  const cached = snapshotCache.get(cacheKey);
  const uri = cached ?? shown;
  const capturing = !cached && Boolean(course) && lanes.length > 0 && (unit === "mi" || unit === "km");
  const capture = (value: string) => { if (snapshotCache.size >= 32) snapshotCache.delete(snapshotCache.keys().next().value!); snapshotCache.set(cacheKey, value); setShown(value); };
  // The live map only renders hidden beneath the frozen image while a new snapshot is captured.
  return <View pointerEvents="none" style={{ width: "100%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: c.paper }}>
    {capturing && course ? <GeographicCourse key={cacheKey} course={course} lanes={lanes} unit={unit} selectedId={lanes.find(lane => lane.you)?.id ?? ""} focusRequest={0} onSelect={() => {}} onSnapshot={capture} optionsTop={0} /> : null}
    <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", backgroundColor: c.paper }}>
      {uri ? <Image source={{ uri }} resizeMode="cover" accessibilityLabel="3D snapshot of your current race position" style={{ width: "100%", height: "100%" }} /> : capturing ? null : <AppText role="caption" secondary>{unit === "hrs" || unit === "steps" ? "Chart preview" : "Preview unavailable"}</AppText>}
    </View>
  </View>;
}

function LiveIndicator() {
  const c = useThemeColors();
  return <View accessible={false} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.statusSuccess }} />;
}
