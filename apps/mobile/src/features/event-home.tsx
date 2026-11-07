import { useEffect, useState } from "react";
import { useCompetitionCourse } from "./use-competition-course";
import { GeographicCourse } from "./geographic-course";
import { useCompeteStore } from "../lib/compete-store";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { competePeriodWindow, buildArenaModel, competitionQueue, competitionTrack, competeNow, SPORTS, type CompeteState, type SportId } from "@fitness-battle/shared";
import { AppText, textStyle } from "../ui/section";
import { SHELL_COLORS as c } from "../theme";
import { useAthleteBlocks } from "../lib/athlete-blocks";

const snapshotCache = new Map<string, string>();

/** Read-only event previews; entering is an explicit presentation action. */
export function EventHome({ state, accountKey, onEnter, onRecovery }: { state: CompeteState; accountKey: string; onEnter(account: string, sport: SportId): void; onRecovery(): void }) {
  const { blocks } = useAthleteBlocks();
  return <View style={{ gap: 16 }}>
    {state.ratings.filter(r => r.optedIn).map(rating => {
      const sport = rating.sport;
      const queue = competitionQueue(state, sport, competeNow(state));

      const queued = queue?.queued || queue?.awaitingField;
      const model = buildArenaModel(state, undefined, competitionTrack(sport), sport);
      const lanes = model?.lanes.filter(lane => !lane.ghost) ?? [];
      const me = lanes.find(lane => lane.you);
      const total = me?.values[2] ?? 0;
      const place = 1 + lanes.filter(lane => lane.values[2] > total).length;
      const rival = lanes.filter(lane => !lane.you && !blocks.some(block => block.id === lane.id)).sort((a,b) => Math.abs(a.values[2] - total) - Math.abs(b.values[2] - total))[0];
      return <Pressable key={sport} accessibilityRole="button" accessibilityLabel={`Enter ${SPORTS.find(item => item.id === sport)?.name} field`} onPress={() => onEnter(accountKey, sport)} style={({ pressed }) => ({ padding: 20, gap: 14, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, opacity: pressed ? .8 : 1 })}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><AppText role="heading">{SPORTS.find(item => item.id === sport)?.name}</AppText><AppText role="caption" secondary>{queued ? "Upcoming wave" : `Place ${place} / ${lanes.length}`}</AppText></View>
        <CoursePreview state={state} sport={sport} queued={Boolean(queued)} />
        <AppText role="body">{queued ? "Your field opens when the wave starts." : `${total.toFixed(2)} ${model?.unit ?? ""}`}</AppText>
        {!queued && rival ? <AppText role="caption" secondary>{Math.abs(rival.values[2] - total).toFixed(2)} {model?.unit} {rival.values[2] > total ? "behind" : "ahead of"} {rival.name}</AppText> : null}
        <AppText role="label">Open field →</AppText>
      </Pressable>;
    })}
    {state.healthRatings.some(r => r.optedIn) ? <Pressable accessibilityRole="button" accessibilityLabel="Open Recovery" onPress={onRecovery} style={{ padding: 20, gap: 8, backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.line }}><AppText role="heading">Recovery</AppText><AppText role="body" secondary>View your recovery event →</AppText></Pressable> : null}
    {!state.ratings.some(r => r.optedIn) && !state.healthRatings.some(r => r.optedIn) ? <AppText role="body" secondary>Register for an event to open your first field.</AppText> : null}
  </View>;
}

function CoursePreview({ state, sport, queued }: { state: CompeteState; sport: SportId; queued: boolean }) {
  const period = competePeriodWindow(state, competeNow(state), sport);
  const { debugActive, accountKey } = useCompeteStore();
  const { course } = useCompetitionCourse(sport, period.startsAt.toISOString(), period.endsAt.toISOString(), debugActive, !queued);
  const model = buildArenaModel(state, undefined, competitionTrack(sport), sport);
  const me = model?.lanes.find(lane => lane.you);
  const key = `square-v3:${accountKey}:${sport}:${course?.name}:${course?.length}:${me?.values[2]}:${state.units}`;
  return <View style={{ gap: 2 }}><SnapshotPreview key={key} cacheKey={key} course={course} lane={me} unit={model?.unit ?? ""} queued={queued} />
    {!queued && course ? <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 6 }}>
      {[{ label: "© Mapbox", url: "https://www.mapbox.com/about/maps" }, { label: "© OpenStreetMap", url: "https://www.openstreetmap.org/copyright" }, { label: "ⓘ", url: "https://apps.mapbox.com/feedback/" }].map(link => <Pressable key={link.label} accessibilityRole="link" accessibilityLabel={link.label === "ⓘ" ? "Improve this map" : link.label} hitSlop={8} onPress={event => { event.stopPropagation(); void Linking.openURL(link.url); }}><Text style={{ ...textStyle("caption"), fontSize: 10, lineHeight: 14, color: c.muted }}>{link.label}</Text></Pressable>)}
    </View> : null}
  </View>;
}
function SnapshotPreview({ cacheKey, course, lane, unit, queued }: { cacheKey: string; course: ReturnType<typeof useCompetitionCourse>["course"]; lane: NonNullable<ReturnType<typeof buildArenaModel>>["lanes"][number] | undefined; unit: string; queued: boolean }) {
  const [uri, setUri] = useState(() => snapshotCache.get(cacheKey) ?? "");
  const capture = (value: string) => { if (snapshotCache.size >= 32) snapshotCache.delete(snapshotCache.keys().next().value!); snapshotCache.set(cacheKey, value); setUri(value); };
  const [expired, setExpired] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setExpired(true), 15000); return () => clearTimeout(timer); }, []);
  return <View pointerEvents="none" style={{ width: "100%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: c.paper }}>
    {uri ? <Image source={{ uri }} resizeMode="cover" accessibilityLabel="3D snapshot of your current race position" style={{ width: "100%", height: "100%" }} /> : !expired && !queued && course && lane && (unit === "mi" || unit === "km") ? <GeographicCourse course={course} lanes={[{ id: lane.id, name: "You", initials: "", you: true, value: lane.values[2] }]} unit={unit} selectedId={lane.id} focusRequest={0} onSelect={() => {}} onSnapshot={capture} optionsTop={null} /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><AppText role="caption" secondary>{queued ? "Course assigned when your wave starts" : unit === "pts" ? "Points event" : "Preview unavailable"}</AppText></View>}
  </View>;
}
