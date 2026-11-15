import { useLayoutEffect, useMemo, useRef } from "react";
import Animated, { FadeInUp, LinearTransition } from "react-native-reanimated";
import { useCompetitionTimeline } from "./competition-timeline-context";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { RankAvatar } from "../ui/rank-symbol";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { Pressable, View } from "react-native";
import { competeNow, competitionActivityLog, competitionMomentFeedEntries, competitionReplayTimeMs, formatCompetitionFeedTimestampForState, type CompeteState, type CompetitionMoment, type SportId } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { useThemeColors } from "../theme";
import { AppIcon } from "../ui/app-icon";
import { useEventActivity } from "./use-event-activity";

export function RaceUpdates({ state, sport, active, moment, revealCount }: { state: CompeteState; sport: SportId; active: boolean; moment?: CompetitionMoment; revealCount?: number }) {
  const c = useThemeColors();
  const timeline = useCompetitionTimeline();
  const { blocks } = useAthleteBlocks();
  const fallback = useEventActivity(state, sport, active && !timeline);
  const completed = Math.floor(timeline?.cursor ?? 0);
  const hiddenIds = useMemo(() => blocks.map((block) => block.id), [blocks]);
  const rows = useMemo(() => {
    if (timeline?.index) return competitionActivityLog(timeline.index, hiddenIds, completed);
    if (timeline) return [];
    if (!moment) return fallback.rows;
    if (fallback.scope !== "local") {
      if (revealCount === 0 && moment.plan.hasOvertake) {
        const latestId = state.activities.filter((activity) => activity.sport === sport).at(-1)?.id;
        if (latestId) return fallback.rows.filter((row) => !row.id.endsWith(`:${latestId}`));
      }
      return fallback.rows;
    }
    const passedBy = !moment.plan.hasOvertake && Boolean(moment.plan.passedByIds?.length);
    const youIndex = passedBy ? -1 : fallback.rows.findIndex((row) => row.actorId === "you");
    const entries = competitionMomentFeedEntries(
      moment,
      state.name,
      state.avatarUrl,
      fallback.rows[youIndex]?.at ?? fallback.rows[0]?.at ?? competeNow(state).toISOString(),
      revealCount,
    ).filter((row) => !hiddenIds.includes(row.actorId));
    return youIndex >= 0
      ? fallback.rows.flatMap((row, index) => (index === youIndex ? entries : [row]))
      : [...entries, ...fallback.rows];
  }, [timeline?.index, timeline?.cursor, completed, hiddenIds, fallback.rows, fallback.scope, moment, revealCount, sport, state]);
  const loading = timeline ? !timeline.ready : fallback.loading;
  const cursor = timeline?.cursor ?? rows.length;
  const feedReferenceMs = timeline?.index
    ? cursor >= timeline.count
      ? Date.parse(timeline.index.replay.through)
      : competitionReplayTimeMs(timeline.index, cursor)
    : Date.now();
  const reduced = useReducedMotion();
  const previous = useRef<{ cursor: number; ready: boolean; ids: Set<string> } | null>(null);
  const forward = previous.current?.ready === true && cursor > previous.current.cursor;
  useLayoutEffect(() => { previous.current = { cursor, ready: timeline ? timeline.ready : !fallback.loading, ids: new Set(rows.map(row => row.id)) }; }, [rows, cursor, timeline?.ready, fallback.loading]);
  if (!active) return null;
  return <View style={{ gap: 14 }}>
    {loading ? <AppText role="caption" secondary>Loading race updates…</AppText> : <>
      {!rows.length && <AppText secondary>No activity at this point in the race.</AppText>}
      <View style={{ borderRadius: 20, backgroundColor: c.card, overflow: "hidden" }}>{rows.map((row, i) => <Animated.View key={row.id} entering={!reduced && forward && !previous.current?.ids.has(row.id) ? FadeInUp.duration(240) : undefined} layout={reduced ? undefined : LinearTransition.duration(240)} style={{ padding: 16, flexDirection: "row", gap: 12, alignItems: "flex-start", borderTopWidth: i ? 1 : 0, borderColor: c.line }}>
        {!row.movement ? <RankAvatar rank="beginner" src={row.avatarUrl} name={row.actorName} size={56} /> : <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.actionSoft }}><AppIcon name="progress" size={24} /></View>}
        <View style={{ flex: 1, flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: 4, minWidth: 0 }}><AppText role="label">{row.title}</AppText><AppText role="caption" secondary>{row.detail}</AppText></View>
          <AppText role="caption" secondary style={{ flexShrink: 0, paddingTop: 2 }}>{formatCompetitionFeedTimestampForState(state, row.at, feedReferenceMs)}</AppText>
        </View>
      </Animated.View>)}</View>
    </>}
  </View>;
}
