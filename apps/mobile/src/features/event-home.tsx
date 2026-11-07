import { useState } from "react";
import { useCompetitionCourse } from "./use-competition-course";
import { useCompeteStore } from "../lib/compete-store";
import { mobileEnv } from "../lib/env";
import { Image, Pressable, View } from "react-native";
import { buildMapboxStaticImageUrl, competePeriodWindow, buildArenaModel, competitionQueue, competitionTrack, competeNow, SPORTS, type CompeteState, type SportId } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { SHELL_COLORS as c } from "../theme";
import { useAthleteBlocks } from "../lib/athlete-blocks";

/** Read-only event previews; entering is an explicit presentation action. */
export function EventHome({ state, accountKey, onEnter, onRecovery }: { state: CompeteState; accountKey: string; onEnter(account: string, sport: SportId): void; onRecovery(): void }) {
  const { blocks } = useAthleteBlocks();
  return <View style={{ gap: 16 }}>
    {state.ratings.filter(r => r.optedIn).map(rating => {
      const sport = rating.sport;
      const queue = competitionQueue(state, sport, competeNow(state));
      const daysLeft = Math.max(0, Math.ceil((competePeriodWindow(state, competeNow(state), sport).endsAt.getTime() - competeNow(state).getTime()) / 86400000));
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
        <AppText role="caption" secondary>{queued ? "Upcoming wave" : `${daysLeft} days left`}</AppText>
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
  const { debugActive } = useCompeteStore();
  const period = competePeriodWindow(state, competeNow(state), sport);
  const { course, error } = useCompetitionCourse(sport, period.startsAt.toISOString(), period.endsAt.toISOString(), debugActive, !queued);
  const url = course ? buildMapboxStaticImageUrl({ coordinates: course.coordinates, width: 600, height: 240, mapboxToken: mobileEnv.mapboxAccessToken }) : "";
  const [failedUrl, setFailedUrl] = useState("");
  const geographic = ["running", "walking", "cycling"].includes(sport);
  return <View style={{ height: 144, borderRadius: 12, overflow: "hidden", backgroundColor: c.paper, justifyContent: "center", alignItems: "center" }}>
    {url && failedUrl !== url ? <Image accessibilityLabel={`${course?.name} course preview`} source={{ uri: url, cache: "force-cache" }} resizeMode="contain" onError={() => setFailedUrl(url)} style={{ width: "100%", height: "100%" }} /> : <AppText role="caption" secondary>{queued ? "Course assigned when your wave starts" : !geographic ? "Points event" : error || failedUrl || !mobileEnv.mapboxAccessToken ? "Course preview unavailable" : "Loading course preview…"}</AppText>}
  </View>;
}
